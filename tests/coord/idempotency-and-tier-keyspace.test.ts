// 057a AC3 — idempotency-per-role + scheduler-vs-round tier keyspace
// (AC8 entries lines 244-245 + 243).
//
//   - idempotency-per-role: two roles same correlation_id, both miss
//     produce 2 distinct deadline_missed atoms (per-role-per-event-type
//     key) (r1 codex F5 + codex-ops F3 MED)
//   - scheduler-vs-round tier keyspace: concurrent open records in both
//     tiers for one wrapper don't collide; close-then-open in one tier
//     doesn't affect the other (r3 codex-ops F2 MED)
//   - subject-role-multi-under-one-correlation: two subject_roles under
//     one correlation open + close independently (r1 codex F1 HIGH)

import { describe, expect, it } from 'vitest';
import { DeadlineTracker } from '../../src/coord/deadlines.js';
import type { CoordRolesConfig } from '../../src/coord/roles.js';
import { MemoryStorage } from '../../src/storage/memory.js';

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
        scheduler_health: Object.freeze({
          default_deadline_sec: 120,
          max_deadline_sec: 300,
          expects: 'scheduler_health_done',
        }),
      }),
    }),
    Object.freeze({
      name: 'codex-ops',
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

describe('AC3 — idempotency per-role + tier keyspace', () => {
  it('two roles share one correlation_id, both miss → 2 distinct deadline_missed atoms', async () => {
    const storage = new MemoryStorage();
    let nowMs = Date.parse('2026-05-16T10:00:00.000Z');
    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => new Date(nowMs),
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    await tracker.reconstruct();

    // Open reviewer_invoked for codex AND codex-ops under the same correlation_id.
    await tracker.ingest({
      tier: 'round',
      event_type: 'reviewer_invoked',
      schema_version: 1,
      subject_role: 'codex',
      correlation_id: 'round-shared',
      emitted_at: new Date(nowMs).toISOString(),
      expected_by: new Date(nowMs + 30 * 1000).toISOString(),
    });
    await tracker.ingest({
      tier: 'round',
      event_type: 'reviewer_invoked',
      schema_version: 1,
      subject_role: 'codex-ops',
      correlation_id: 'round-shared',
      emitted_at: new Date(nowMs).toISOString(),
      expected_by: new Date(nowMs + 30 * 1000).toISOString(),
    });

    let snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(2);

    // Advance past deadline, tick.
    nowMs += 60 * 1000;
    (tracker as unknown as { now: () => Date }).now = () => new Date(nowMs);
    await tracker.tick();

    const missed = (await storage.query({ source_prefix: 'coord:' })).filter((e) => {
      const md = e.metadata as { coord?: { event_type?: string } } | undefined;
      return md?.coord?.event_type === 'deadline_missed';
    });
    expect(missed).toHaveLength(2);
    // Distinct idempotency keys (per-role).
    const keys = new Set(
      missed.map((m) => {
        const md = m.metadata as { coord: { idempotency_key: string } };
        return md.coord.idempotency_key;
      }),
    );
    expect(keys.size).toBe(2);

    snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(0);
  });

  it('subject-role-multi-under-one-correlation: closing one role does NOT close the other (r1 codex F1 HIGH)', async () => {
    const storage = new MemoryStorage();
    const nowMs = Date.parse('2026-05-16T10:00:00.000Z');
    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => new Date(nowMs),
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    await tracker.reconstruct();

    // Open tick_start for both roles under correlation 'round-multi'.
    await tracker.ingest({
      tier: 'round',
      event_type: 'tick_start',
      schema_version: 1,
      subject_role: 'codex',
      correlation_id: 'round-multi',
      emitted_at: new Date(nowMs).toISOString(),
      expected_by: new Date(nowMs + 600 * 1000).toISOString(),
    });
    await tracker.ingest({
      tier: 'round',
      event_type: 'tick_start',
      schema_version: 1,
      subject_role: 'codex-ops',
      correlation_id: 'round-multi',
      emitted_at: new Date(nowMs).toISOString(),
      expected_by: new Date(nowMs + 600 * 1000).toISOString(),
    });
    let snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(2);

    // codex emits tick_end — should close ONLY codex's tick_start record.
    await tracker.ingest({
      tier: 'round',
      event_type: 'tick_end',
      schema_version: 1,
      subject_role: 'codex',
      correlation_id: 'round-multi',
      emitted_at: new Date(nowMs).toISOString(),
    });
    snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(1);
    expect(snap.round[0]!.subject_role).toBe('codex-ops');
    expect(snap.round[0]!.event_type).toBe('tick_start');
  });

  it('scheduler-vs-round tier keyspace: same wrapper opens both tiers; close in one tier does not affect the other (r3 codex-ops F2 MED)', async () => {
    const storage = new MemoryStorage();
    const nowMs = Date.parse('2026-05-16T10:00:00.000Z');
    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => new Date(nowMs),
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    await tracker.reconstruct();

    // Round-tier: codex tick_start under correlation 'r1'.
    await tracker.ingest({
      tier: 'round',
      event_type: 'tick_start',
      schema_version: 1,
      subject_role: 'codex',
      correlation_id: 'r1',
      emitted_at: new Date(nowMs).toISOString(),
      expected_by: new Date(nowMs + 600 * 1000).toISOString(),
    });
    // Scheduler-tier: codex scheduler_health under tick_run_id 't1'.
    await tracker.ingest({
      tier: 'scheduler',
      event_type: 'scheduler_health',
      schema_version: 1,
      subject_role: 'codex',
      tick_run_id: 't1',
      emitted_at: new Date(nowMs).toISOString(),
      expected_by: new Date(nowMs + 120 * 1000).toISOString(),
    });
    let snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(1);
    expect(snap.scheduler).toHaveLength(1);

    // tick_end on round-tier closes the round tick_start but DOES NOT
    // touch the scheduler open record.
    await tracker.ingest({
      tier: 'round',
      event_type: 'tick_end',
      schema_version: 1,
      subject_role: 'codex',
      correlation_id: 'r1',
      emitted_at: new Date(nowMs).toISOString(),
    });
    snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(0);
    expect(snap.scheduler).toHaveLength(1); // untouched
    expect(snap.scheduler[0]!.event_type).toBe('scheduler_health');
  });

  it('reconcile() is idempotent: running it twice in a row produces the same state', async () => {
    const storage = new MemoryStorage();
    const nowMs = Date.parse('2026-05-16T10:00:00.000Z');
    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => new Date(nowMs),
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    await tracker.reconstruct();
    await tracker.ingest({
      tier: 'round',
      event_type: 'reviewer_invoked',
      schema_version: 1,
      subject_role: 'codex',
      correlation_id: 'round-recon',
      emitted_at: new Date(nowMs).toISOString(),
      expected_by: new Date(nowMs + 3600 * 1000).toISOString(),
    });

    const snap1 = await tracker.currentSnapshot();
    await tracker.reconcile();
    await tracker.reconcile();
    const snap2 = await tracker.currentSnapshot();
    expect(snap2.round.length).toBe(snap1.round.length);
    expect(snap2.last_replay_watermark).toBeGreaterThanOrEqual(snap1.last_replay_watermark);
  });
});
