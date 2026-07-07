// 129 — deadlines anchor on emitted_at, not tracker-now.
//
// The 2026-07-07 time-bomb audit found the coord deadline system's SLA-miss
// detector structurally defeated in production: the only production emitter
// (coord-emit.sh) never sends `expected_by`, and `resolveExpectedBy`
// recomputed the deadline off tracker-now on every reconstruct(). A daemon
// that restarts within the window (routine) silently re-baselined every open
// deadline, so `deadline_missed` could never fire. Every prior test seeds
// `expected_by` explicitly, so the field-omitted path — the only path
// production takes — was untested. These tests exercise it.
//
// Covers:
//   AC2 — restart-invariance: an atom WITHOUT expected_by, ingested live,
//         keeps the SAME deadline after a fresh tracker reconstruct()s with
//         an advanced clock; the miss still fires after the ORIGINAL window.
//   AC3 — skew: a late-appended atom whose emitted_at is already older than
//         its window resolves to a past deadline and the miss fires promptly.
//   AC4 — fallback: an atom with a garbage emitted_at (no expected_by)
//         resolves its deadline from tracker-now — no throw, no NaN.

import { describe, expect, it } from 'vitest';
import { DeadlineTracker } from '../../src/coord/deadlines.js';
import type { CoordRolesConfig } from '../../src/coord/roles.js';
import type { ValidatedCoordEmitInput } from '../../src/coord/validate.js';
import { MemoryStorage } from '../../src/storage/memory.js';

// reviewer_invoked opens a round-tier deadline (expects tick_start) with a
// 90s default window — the exact shape the production reviewer path takes.
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

/** Seed a coord atom directly into storage (durable ledger row that
 *  reconstruct() replays). Mirrors deadlines-reconstruction.test.ts. */
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

function missedAtoms(storage: MemoryStorage) {
  return storage.query({ source_prefix: 'coord:' }).then((rows) =>
    rows.filter((e) => {
      const md = e.metadata as { coord?: { event_type?: string } } | undefined;
      return md?.coord?.event_type === 'deadline_missed';
    }),
  );
}

describe('129 — deadlines anchor on emitted_at', () => {
  it('AC2 — restart-invariance: no-expected_by deadline survives a mid-window restart and the miss fires after the ORIGINAL window', async () => {
    const storage = new MemoryStorage();
    const EMIT = '2026-05-16T10:00:00.000Z'; // emit time
    const emitMs = Date.parse(EMIT);
    // reviewer_invoked default window = 90s → deadline = EMIT + 90s.
    const expectedDeadline = new Date(emitMs + 90_000).toISOString();

    // Durable row (no expected_by — the production shape).
    await seedAtom(storage, 'coord:claude', EMIT, {
      event_type: 'reviewer_invoked',
      schema_version: 1,
      subject_role: 'codex',
      tier: 'round',
      correlation_id: 'round-restart',
    });

    // First daemon life: ingest live at emit time, capture the deadline.
    const live = new DeadlineTracker(storage, CFG, {
      now: () => new Date(EMIT),
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    const liveEvent: ValidatedCoordEmitInput = {
      tier: 'round',
      event_type: 'reviewer_invoked',
      schema_version: 1,
      subject_role: 'codex',
      correlation_id: 'round-restart',
      emitted_at: EMIT,
    };
    await live.ingest(liveEvent);
    const liveSnap = await live.currentSnapshot();
    expect(liveSnap.round).toHaveLength(1);
    const liveDeadline = liveSnap.round[0]!.expected_by;
    expect(liveDeadline).toBe(expectedDeadline);

    // Second daemon life: fresh tracker, clock advanced 45s into the window
    // (a "restart" mid-window). reconstruct() from the durable ledger.
    let restartNow = new Date(emitMs + 45_000); // 10:00:45 — still before deadline
    const restarted = new DeadlineTracker(storage, CFG, {
      now: () => restartNow,
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    await restarted.reconstruct();
    const reSnap = await restarted.currentSnapshot();
    expect(reSnap.round).toHaveLength(1);
    // The load-bearing assertion: SAME deadline as first ingest — NOT
    // restart-now + default (which would be 10:00:45 + 90s = 10:02:15).
    expect(reSnap.round[0]!.expected_by).toBe(liveDeadline);
    expect(reSnap.round[0]!.expected_by).not.toBe(
      new Date(restartNow.getTime() + 90_000).toISOString(),
    );

    // Advance past the ORIGINAL window and tick: the miss fires even though a
    // restart happened mid-window (the bug this item fixes).
    restartNow = new Date(emitMs + 91_000); // 10:01:31 — just past EMIT + 90s
    await restarted.tick();
    const afterSnap = await restarted.currentSnapshot();
    expect(afterSnap.round).toHaveLength(0);
    const missed = await missedAtoms(storage);
    expect(missed).toHaveLength(1);
    expect(
      (missed[0]!.metadata as { coord: { expected_by: string } }).coord.expected_by,
    ).toBe(expectedDeadline);
  });

  it('AC3 — skew: a late-appended atom with an old emitted_at resolves to a past deadline and the miss fires promptly at reconstruct', async () => {
    const storage = new MemoryStorage();
    // emitted_at is a full hour older than "now"; the 90s window is long
    // gone by the time this atom is replayed.
    const OLD_EMIT = '2026-05-16T09:00:00.000Z';
    const expiredDeadline = new Date(Date.parse(OLD_EMIT) + 90_000).toISOString(); // 09:01:30
    await seedAtom(storage, 'coord:claude', OLD_EMIT, {
      event_type: 'reviewer_invoked',
      schema_version: 1,
      subject_role: 'codex',
      tier: 'round',
      correlation_id: 'round-skew',
    });

    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => new Date('2026-05-16T10:00:00.000Z'), // 1h after emit
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    await tracker.reconstruct();

    // The deadline resolved to the past (emitted_at + window), so the
    // post-replay fire pass fires it promptly — no fresh restart-now window.
    const snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(0);
    const missed = await missedAtoms(storage);
    expect(missed).toHaveLength(1);
    expect(
      (missed[0]!.metadata as { coord: { expected_by: string } }).coord.expected_by,
    ).toBe(expiredDeadline);
  });

  it('AC4 — fallback: a garbage emitted_at resolves the deadline from tracker-now (no throw, no NaN into Math.min)', async () => {
    const storage = new MemoryStorage();
    const NOW = '2026-05-16T10:00:00.000Z';
    const nowMs = Date.parse(NOW);
    // A corrupt ledger row: emitted_at is not a parseable instant, and no
    // expected_by is present.
    await seedAtom(storage, 'coord:claude', 'not-a-timestamp', {
      event_type: 'reviewer_invoked',
      schema_version: 1,
      subject_role: 'codex',
      tier: 'round',
      correlation_id: 'round-garbage',
    });

    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => new Date(NOW),
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    // Must not throw despite the unparseable emitted_at.
    await expect(tracker.reconstruct()).resolves.toBeUndefined();

    const snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(1);
    const deadline = snap.round[0]!.expected_by;
    // Fallback to tracker-now + default (90s) — a valid ISO string, never NaN.
    expect(deadline).toBe(new Date(nowMs + 90_000).toISOString());
    expect(Number.isNaN(Date.parse(deadline))).toBe(false);
  });
});
