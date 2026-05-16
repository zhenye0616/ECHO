// 057a AC3 — deadline tracker boot reconstruction (AC8 entry).
//
// Covers (per spec line 240):
//   - daemon boot scans coord atoms + replays close-then-open
//   - overdue records fire deadline_missed at the end of reconstruction
//   - startup gate: server doesn't accept coord_emit until reconstruction
//     completes — exercised here by NOT calling ingest before reconstruct
//
// Plus (per spec line 189):
//   - restart-after-fired: pre-existing coord:deadline_missed atom +
//     restart → reconstruction's cache priming + cache-hit-also-terminal
//     branch → open record is removed on first heartbeat, no stale open
//     in coord_status(), no duplicate atom appended (r2 codex-ops F1 HIGH)
//   - out-of-order emitted_at: append-order is authoritative (r2 codex F1
//     HIGH + r2 codex-ops F6 MED)

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
      }),
    }),
  ] as const),
}) as CoordRolesConfig;

const SHA256_HEX = /^[0-9a-f]{64}$/;

function seedAtom(
  storage: MemoryStorage,
  source: string,
  ts: string,
  coordMeta: Record<string, unknown>,
): Promise<string> {
  return storage.append({
    source,
    timestamp: ts,
    content: JSON.stringify({ event_type: coordMeta['event_type'] }),
    metadata: { surface: 'coord', session_id: 'echo:coord', coord: coordMeta },
  });
}

describe('AC3 — boot reconstruction', () => {
  it('replays close-then-open over a clean ledger; non-overdue records remain open', async () => {
    const storage = new MemoryStorage();
    const t0 = '2026-05-16T10:00:00.000Z';
    const t1 = '2026-05-16T10:00:10.000Z';
    const futureExpected = '2026-05-16T11:00:00.000Z'; // not yet expired
    // reviewer_invoked at t0 (expected_by far in the future)
    await seedAtom(storage, 'coord:claude', t0, {
      event_type: 'reviewer_invoked',
      schema_version: 1,
      subject_role: 'codex',
      tier: 'round',
      correlation_id: 'round-A',
      expected_by: futureExpected,
    });
    // tick_start at t1 closes the reviewer_invoked record AND opens a
    // new one (tick_start.expects = tick_end). expected_by is in the
    // future so the post-reconstruction fire pass leaves it alone.
    await seedAtom(storage, 'coord:codex', t1, {
      event_type: 'tick_start',
      schema_version: 1,
      subject_role: 'codex',
      tier: 'round',
      correlation_id: 'round-A',
      expected_by: futureExpected,
    });

    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => new Date('2026-05-16T10:00:15.000Z'), // before futureExpected
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    await tracker.reconstruct();
    const snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(1); // reviewer_invoked closed; tick_start opened
    expect(snap.round[0]!.event_type).toBe('tick_start');
    expect(snap.round[0]!.expects).toBe('tick_end');
    expect(snap.last_replay_watermark).toBeGreaterThan(0);
  });

  it('post-reconstruction fire-pass: overdue record at boot fires deadline_missed', async () => {
    const storage = new MemoryStorage();
    // reviewer_invoked at 10:00; expected_by 10:01; now is 10:05 (overdue).
    await seedAtom(storage, 'coord:claude', '2026-05-16T10:00:00.000Z', {
      event_type: 'reviewer_invoked',
      schema_version: 1,
      subject_role: 'codex',
      tier: 'round',
      correlation_id: 'round-B',
      expected_by: '2026-05-16T10:01:00.000Z',
    });

    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => new Date('2026-05-16T10:05:00.000Z'),
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    await tracker.reconstruct();
    // The open record should have been fired during reconstruction's
    // post-replay fire pass (terminal).
    const snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(0);
    const missed = (await storage.query({ source_prefix: 'coord:' })).filter((e) => {
      const md = e.metadata as { coord?: { event_type?: string } } | undefined;
      return md?.coord?.event_type === 'deadline_missed';
    });
    expect(missed).toHaveLength(1);
    const md = missed[0]!.metadata as {
      coord: { idempotency_key: string; opened_event_type: string; expected_event_type: string };
    };
    expect(md.coord.idempotency_key).toMatch(SHA256_HEX);
    expect(md.coord.opened_event_type).toBe('reviewer_invoked');
    expect(md.coord.expected_event_type).toBe('tick_start');
  });

  it('restart-after-fired: pre-existing deadline_missed atom + tick on overdue record → cache hit removes open, no duplicate atom (r2 codex-ops F1 HIGH)', async () => {
    const storage = new MemoryStorage();
    // Seed a reviewer_invoked + a matching deadline_missed atom (from a
    // prior daemon's life) + then RESTART the tracker.
    await seedAtom(storage, 'coord:claude', '2026-05-16T10:00:00.000Z', {
      event_type: 'reviewer_invoked',
      schema_version: 1,
      subject_role: 'codex',
      tier: 'round',
      correlation_id: 'round-C',
      expected_by: '2026-05-16T10:01:00.000Z',
    });
    // Pre-existing deadline_missed atom — its idempotency_key must match
    // the one fireMissedDeadline would compute for the record above:
    //   sha256('round-C|codex|reviewer_invoked|deadline_missed')
    const { createHash } = await import('node:crypto');
    const expectedKey = createHash('sha256')
      .update('round-C|codex|reviewer_invoked|deadline_missed')
      .digest('hex');
    await seedAtom(storage, 'coord:codex', '2026-05-16T10:02:00.000Z', {
      event_type: 'deadline_missed',
      schema_version: 1,
      tier: 'round',
      subject_role: 'codex',
      correlation_id: 'round-C',
      opened_event_type: 'reviewer_invoked',
      expected_event_type: 'tick_start',
      expected_by: '2026-05-16T10:01:00.000Z',
      idempotency_key: expectedKey,
    });

    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => new Date('2026-05-16T10:05:00.000Z'),
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    await tracker.reconstruct();

    // The open record should be terminally removed by the cache-hit
    // branch (the idempotency cache was primed from the pre-existing
    // deadline_missed atom during reconstruction). No new deadline_missed
    // atom appended.
    const snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(0);
    const missed = (await storage.query({ source_prefix: 'coord:' })).filter((e) => {
      const md = e.metadata as { coord?: { event_type?: string } } | undefined;
      return md?.coord?.event_type === 'deadline_missed';
    });
    // Only the one we seeded — no duplicate.
    expect(missed).toHaveLength(1);
    expect(snap.idempotency_cache_size).toBe(1);
  });

  it('out-of-order emitted_at: append order is authoritative (r2 codex F1 HIGH + r2 codex-ops F6 MED)', async () => {
    const storage = new MemoryStorage();
    // Append tick_start FIRST in storage order but with emitted_at LATER
    // than the reviewer_invoked that opens it. If reconstruction sorted
    // by emitted_at, the tick_start would never close the
    // reviewer_invoked (out of order). Append-order semantics make this
    // work correctly.
    const futureExpected = '2026-05-16T11:00:00.000Z';
    await seedAtom(storage, 'coord:claude', '2026-05-16T10:00:00.000Z', {
      event_type: 'reviewer_invoked',
      schema_version: 1,
      subject_role: 'codex',
      tier: 'round',
      correlation_id: 'round-D',
      expected_by: futureExpected,
    });
    // emitted_at EARLIER than the prior atom — but appended LATER.
    await seedAtom(storage, 'coord:codex', '2026-05-15T23:00:00.000Z', {
      event_type: 'tick_start',
      schema_version: 1,
      subject_role: 'codex',
      tier: 'round',
      correlation_id: 'round-D',
      expected_by: futureExpected,
    });

    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => new Date('2026-05-16T10:00:15.000Z'),
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    await tracker.reconstruct();
    const snap = await tracker.currentSnapshot();
    // reviewer_invoked CLOSED by tick_start (append-order). The tick_start
    // event has expects=tick_end, so the new open record is for tick_end.
    expect(snap.round).toHaveLength(1);
    expect(snap.round[0]!.event_type).toBe('tick_start');
    expect(snap.round[0]!.expects).toBe('tick_end');
  });
});
