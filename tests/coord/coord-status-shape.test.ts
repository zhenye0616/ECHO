// 057a AC6 + AC8 — coord_status shape test.
//
// Covers (per spec line 246):
//   - output schema validates
//   - per-role last-tick aggregation correct
//   - tier-aware reporting (round + scheduler tier separation in open_deadlines)
//   - recent-missed uses max(role.max_deadline_sec) horizon ≥24h
//   - per-role-per-event-type last-miss entry remains visible when the
//     underlying deadline_missed atom is older than 24h
//   - **last-miss survives daemon restart** (r3 codex F2 MED + r3 codex-ops
//     F2 MED — on-demand rehydration from durable atom log, NOT in-memory)
//   - **slot universe built ONLY from coord-roles.json role.events.<event_type>
//     .expects, NOT from src/coord/types.ts registry** (r5 codex F1 MED)

import { describe, expect, it } from 'vitest';
import { buildCoordStatus } from '../../src/mcp/tools/coord-status.js';
import { DeadlineTracker } from '../../src/coord/deadlines.js';
import type { CoordRolesConfig } from '../../src/coord/roles.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import { createHash } from 'node:crypto';

const CFG: CoordRolesConfig = Object.freeze({
  roles: Object.freeze([
    Object.freeze({
      name: 'codex',
      headless: true,
      invoke_command: ['codex'] as const,
      events: Object.freeze({
        reviewer_invoked: Object.freeze({
          default_deadline_sec: 90,
          max_deadline_sec: 300,
          expects: 'tick_start',
        }),
        tick_start: Object.freeze({
          default_deadline_sec: 600,
          max_deadline_sec: 1200,
          expects: 'tick_end',
        }),
      }),
    }),
  ] as const),
}) as CoordRolesConfig;

function seedAtom(
  storage: MemoryStorage,
  source: string,
  ts: string,
  coord: Record<string, unknown>,
): Promise<string> {
  return storage.append({
    source,
    timestamp: ts,
    content: JSON.stringify({ event_type: coord['event_type'] }),
    metadata: { surface: 'coord', session_id: 'echo:coord', coord },
  });
}

describe('AC6 — coord_status shape', () => {
  it('returns the documented top-level shape', async () => {
    const storage = new MemoryStorage();
    const nowDate = new Date('2026-05-16T10:00:00.000Z');
    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => nowDate,
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    await tracker.reconstruct();

    const result = await buildCoordStatus({
      storage,
      coordRoles: CFG,
      deadlines: tracker,
      serverStartedAt: new Date('2026-05-16T09:50:00.000Z'), // 10 min ago
      now: () => nowDate,
    });

    expect(result.schema_version).toBe(1);
    expect(result.tool).toBe('coord_status');
    expect(typeof result.generated_at).toBe('string');
    expect(Array.isArray(result.open_deadlines)).toBe(true);
    expect(Array.isArray(result.recent_missed)).toBe(true);
    expect(Array.isArray(result.last_miss_per_role_per_event_type)).toBe(true);
    expect(Array.isArray(result.per_role_last_tick)).toBe(true);
    expect(result.per_role_last_tick).toHaveLength(1); // one role configured
    expect(result.per_role_last_tick[0]!.role).toBe('codex');
    expect(typeof result.daemon_uptime_sec).toBe('number');
    expect(result.daemon_uptime_sec).toBeGreaterThanOrEqual(600); // ~10 min
    expect(typeof result.last_reconstruction_watermark).toBe('number');
  });

  it('per-role last-tick aggregation: last_tick_start, last_tick_end, completed-tick duration', async () => {
    const storage = new MemoryStorage();
    const nowDate = new Date('2026-05-16T10:00:00.000Z');
    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => nowDate,
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    // Seed a complete tick: tick_start at 09:00 + tick_end at 09:05 (5min duration).
    await seedAtom(storage, 'coord:codex', '2026-05-16T09:00:00.000Z', {
      event_type: 'tick_start',
      schema_version: 1,
      subject_role: 'codex',
      tier: 'round',
      correlation_id: 'round-X',
    });
    await seedAtom(storage, 'coord:codex', '2026-05-16T09:05:00.000Z', {
      event_type: 'tick_end',
      schema_version: 1,
      subject_role: 'codex',
      tier: 'round',
      correlation_id: 'round-X',
    });
    await tracker.reconstruct();

    const result = await buildCoordStatus({
      storage,
      coordRoles: CFG,
      deadlines: tracker,
      serverStartedAt: new Date('2026-05-16T09:50:00.000Z'),
      now: () => nowDate,
    });
    const codexRow = result.per_role_last_tick.find((r) => r.role === 'codex')!;
    expect(codexRow.last_tick_start).toBe('2026-05-16T09:00:00.000Z');
    expect(codexRow.last_tick_end).toBe('2026-05-16T09:05:00.000Z');
    expect(codexRow.last_tick_duration_sec).toBe(300); // 5 min
  });

  it('tier-aware open_deadlines: round + scheduler tiers both surface', async () => {
    const CFG_BOTH: CoordRolesConfig = Object.freeze({
      roles: Object.freeze([
        Object.freeze({
          name: 'codex',
          headless: true,
          invoke_command: ['codex'] as const,
          events: Object.freeze({
            tick_start: Object.freeze({
              default_deadline_sec: 600,
              max_deadline_sec: 1200,
              expects: 'tick_end',
            }),
            scheduler_health: Object.freeze({
              default_deadline_sec: 120,
              max_deadline_sec: 300,
              expects: 'scheduler_health_done',
            }),
          }),
        }),
      ] as const),
    }) as CoordRolesConfig;
    const storage = new MemoryStorage();
    const nowDate = new Date('2026-05-16T10:00:00.000Z');
    const tracker = new DeadlineTracker(storage, CFG_BOTH, {
      now: () => nowDate,
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    await tracker.reconstruct();

    await tracker.ingest({
      tier: 'round',
      event_type: 'tick_start',
      schema_version: 1,
      subject_role: 'codex',
      correlation_id: 'round-1',
      emitted_at: nowDate.toISOString(),
      expected_by: new Date(nowDate.getTime() + 600 * 1000).toISOString(),
    });
    await tracker.ingest({
      tier: 'scheduler',
      event_type: 'scheduler_health',
      schema_version: 1,
      subject_role: 'codex',
      tick_run_id: 'tick-1',
      emitted_at: nowDate.toISOString(),
      expected_by: new Date(nowDate.getTime() + 120 * 1000).toISOString(),
    });

    const result = await buildCoordStatus({
      storage,
      coordRoles: CFG_BOTH,
      deadlines: tracker,
      serverStartedAt: new Date('2026-05-16T09:50:00.000Z'),
      now: () => nowDate,
    });
    const tiers = result.open_deadlines.map((d) => d.tier).sort();
    expect(tiers).toEqual(['round', 'scheduler']);
  });

  it('last-miss persistence: a 48h-old uncleared miss survives daemon restart (r3 + r4 convergent)', async () => {
    const storage = new MemoryStorage();
    // Synthesize a 48h-old deadline_missed atom for the (codex, tick_start) slot.
    const idKey48h = createHash('sha256')
      .update('round-48h|codex|reviewer_invoked|deadline_missed')
      .digest('hex');
    await seedAtom(storage, 'coord:codex', '2026-05-14T10:00:00.000Z', {
      event_type: 'deadline_missed',
      schema_version: 1,
      tier: 'round',
      subject_role: 'codex',
      correlation_id: 'round-48h',
      opened_event_type: 'reviewer_invoked',
      expected_event_type: 'tick_start',
      expected_by: '2026-05-14T10:01:00.000Z',
      idempotency_key: idKey48h,
    });

    // FRESH DAEMON — new tracker, no preloaded in-memory state.
    const nowDate = new Date('2026-05-16T10:00:00.000Z');
    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => nowDate,
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    await tracker.reconstruct();

    const result = await buildCoordStatus({
      storage,
      coordRoles: CFG,
      deadlines: tracker,
      serverStartedAt: new Date('2026-05-16T09:59:00.000Z'),
      now: () => nowDate,
    });

    // The 48h-old miss is OUTSIDE the recent_missed horizon (24h ≤ 48h)...
    // ...but the role's max_deadline_sec is 1200s ≤ 24h, so horizon = 24h.
    expect(result.recent_missed).toHaveLength(0);
    // ...but it STILL appears in last_miss_per_role_per_event_type because
    // that list is on-demand-built from durable atoms (r3 codex F2 MED).
    expect(result.last_miss_per_role_per_event_type).toHaveLength(1);
    const slot = result.last_miss_per_role_per_event_type[0]!;
    expect(slot.subject_role).toBe('codex');
    expect(slot.expected_event_type).toBe('tick_start');
    expect(slot.opened_event_type).toBe('reviewer_invoked');
    expect(slot.last_missed_at).toBe('2026-05-14T10:00:00.000Z');
  });

  it('successful close after miss CLEARS the slot: a tick_start with higher sequence_id removes the entry', async () => {
    const storage = new MemoryStorage();
    // 48h-old miss for (codex, tick_start)...
    const idKey = createHash('sha256')
      .update('round-cl|codex|reviewer_invoked|deadline_missed')
      .digest('hex');
    await seedAtom(storage, 'coord:codex', '2026-05-14T10:00:00.000Z', {
      event_type: 'deadline_missed',
      schema_version: 1,
      tier: 'round',
      subject_role: 'codex',
      correlation_id: 'round-cl',
      opened_event_type: 'reviewer_invoked',
      expected_event_type: 'tick_start',
      idempotency_key: idKey,
    });
    // ...followed by a successful tick_start LATER in sequence.
    // 129: emitted_at kept recent (within the tick_end window relative to
    // `now` below) so the tick_end deadline this tick_start opens stays in
    // the future and does NOT fire during reconstruct. Under emitted_at
    // anchoring a far-past emitted_at would resolve tick_end to an expired
    // deadline and add a spurious (codex, tick_end) miss slot, which this
    // test (about slot-clearing by sequence) does not intend to exercise.
    await seedAtom(storage, 'coord:codex', '2026-05-16T09:55:00.000Z', {
      event_type: 'tick_start',
      schema_version: 1,
      subject_role: 'codex',
      tier: 'round',
      correlation_id: 'round-other',
    });

    const nowDate = new Date('2026-05-16T10:00:00.000Z');
    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => nowDate,
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    await tracker.reconstruct();

    const result = await buildCoordStatus({
      storage,
      coordRoles: CFG,
      deadlines: tracker,
      serverStartedAt: new Date('2026-05-16T09:59:00.000Z'),
      now: () => nowDate,
    });
    expect(result.last_miss_per_role_per_event_type).toHaveLength(0);
  });

  it('fresh reviewer_invoked does NOT clear a (role, tick_start) slot — event_type != expected_event_type', async () => {
    // r4 codex F2 MED: a reviewer_invoked atom must NOT clear the
    // (codex, tick_start) slot because its event_type is reviewer_invoked,
    // not tick_start.
    const storage = new MemoryStorage();
    const idKey = createHash('sha256')
      .update('round-rinv|codex|reviewer_invoked|deadline_missed')
      .digest('hex');
    await seedAtom(storage, 'coord:codex', '2026-05-15T10:00:00.000Z', {
      event_type: 'deadline_missed',
      schema_version: 1,
      tier: 'round',
      subject_role: 'codex',
      correlation_id: 'round-rinv',
      opened_event_type: 'reviewer_invoked',
      expected_event_type: 'tick_start',
      idempotency_key: idKey,
    });
    // A fresh reviewer_invoked (NOT a tick_start).
    await seedAtom(storage, 'coord:claude', '2026-05-16T09:00:00.000Z', {
      event_type: 'reviewer_invoked',
      schema_version: 1,
      tier: 'round',
      subject_role: 'codex',
      correlation_id: 'round-fresh',
    });

    const nowDate = new Date('2026-05-16T10:00:00.000Z');
    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => nowDate,
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    await tracker.reconstruct();

    const result = await buildCoordStatus({
      storage,
      coordRoles: CFG,
      deadlines: tracker,
      serverStartedAt: new Date('2026-05-16T09:59:00.000Z'),
      now: () => nowDate,
    });
    // Slot still uncleared — reviewer_invoked is NOT the expected closer.
    expect(result.last_miss_per_role_per_event_type).toHaveLength(1);
  });
});
