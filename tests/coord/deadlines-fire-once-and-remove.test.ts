// 057a AC3 — fireMissedDeadline single-fire + open-record removal (r1
// codex-ops F5 HIGH).
//
// Heartbeat fires a deadline_missed atom for an overdue record; subsequent
// heartbeats over the same record find no record in the open map and
// append NO further atoms. coord_status() (via snapshot) does NOT show
// the fired record as still open.

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

function makeTrackerWithFixedNow(storage: MemoryStorage, nowMs: number) {
  return new DeadlineTracker(storage, CFG, {
    now: () => new Date(nowMs),
    heartbeatIntervalMs: 0, // never auto-tick
    reconciliationIntervalMs: null,
  });
}

describe('AC3 — fireMissedDeadline single-fire + terminal removal', () => {
  it('repeated heartbeats over an overdue record fire exactly one deadline_missed atom', async () => {
    const storage = new MemoryStorage();
    let nowMs = Date.parse('2026-05-16T10:00:00.000Z');
    const tracker = makeTrackerWithFixedNow(storage, nowMs);

    await tracker.reconstruct(); // empty ledger; no-op

    // Open a record with expected_by 30s in the future.
    await tracker.ingest({
      tier: 'round',
      event_type: 'reviewer_invoked',
      schema_version: 1,
      subject_role: 'codex',
      correlation_id: 'round-001',
      emitted_at: new Date(nowMs).toISOString(),
      expected_by: new Date(nowMs + 30 * 1000).toISOString(),
    });

    let snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(1);

    // Advance time past the deadline and tick the heartbeat.
    nowMs += 60 * 1000;
    (tracker as unknown as { now: () => Date }).now = () => new Date(nowMs);
    await tracker.tick();

    // One deadline_missed atom appended.
    const missed = (await storage.query({ source_prefix: 'coord:' })).filter((e) => {
      const md = e.metadata as { coord?: { event_type?: string } } | undefined;
      return md?.coord?.event_type === 'deadline_missed';
    });
    expect(missed).toHaveLength(1);

    // Open-record entry removed (terminal).
    snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(0);

    // Subsequent heartbeats append NO further atoms.
    await tracker.tick();
    await tracker.tick();
    await tracker.tick();
    const missedAfter = (await storage.query({ source_prefix: 'coord:' })).filter((e) => {
      const md = e.metadata as { coord?: { event_type?: string } } | undefined;
      return md?.coord?.event_type === 'deadline_missed';
    });
    expect(missedAfter).toHaveLength(1);

    // coord_status snapshot still doesn't show the fired record as open.
    snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(0);
  });

  it('non-overdue records are NOT fired', async () => {
    const storage = new MemoryStorage();
    const nowMs = Date.parse('2026-05-16T10:00:00.000Z');
    const tracker = makeTrackerWithFixedNow(storage, nowMs);
    await tracker.reconstruct();

    // Open a record with deadline 1 hour out.
    await tracker.ingest({
      tier: 'round',
      event_type: 'reviewer_invoked',
      schema_version: 1,
      subject_role: 'codex',
      correlation_id: 'round-002',
      emitted_at: new Date(nowMs).toISOString(),
      expected_by: new Date(nowMs + 3600 * 1000).toISOString(),
    });

    await tracker.tick();
    const snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(1); // still open
    const missed = (await storage.query({ source_prefix: 'coord:' })).filter((e) => {
      const md = e.metadata as { coord?: { event_type?: string } } | undefined;
      return md?.coord?.event_type === 'deadline_missed';
    });
    expect(missed).toHaveLength(0);
  });

  it('close-then-open: a successful close arriving before the deadline removes the open record', async () => {
    const storage = new MemoryStorage();
    let nowMs = Date.parse('2026-05-16T10:00:00.000Z');
    const tracker = makeTrackerWithFixedNow(storage, nowMs);
    await tracker.reconstruct();

    // reviewer_invoked opens a deadline for tick_start.
    await tracker.ingest({
      tier: 'round',
      event_type: 'reviewer_invoked',
      schema_version: 1,
      subject_role: 'codex',
      correlation_id: 'round-003',
      emitted_at: new Date(nowMs).toISOString(),
      expected_by: new Date(nowMs + 60 * 1000).toISOString(),
    });
    let snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(1);
    expect(snap.round[0]!.expects).toBe('tick_start');

    // tick_start arrives — closes the reviewer_invoked record AND opens
    // a new one (tick_start.expects = tick_end).
    nowMs += 10 * 1000;
    (tracker as unknown as { now: () => Date }).now = () => new Date(nowMs);
    await tracker.ingest({
      tier: 'round',
      event_type: 'tick_start',
      schema_version: 1,
      subject_role: 'codex',
      correlation_id: 'round-003',
      emitted_at: new Date(nowMs).toISOString(),
    });

    snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(1); // reviewer_invoked closed; tick_start opened
    expect(snap.round[0]!.event_type).toBe('tick_start');
    expect(snap.round[0]!.expects).toBe('tick_end');
  });
});
