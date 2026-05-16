// 057b AC7 — internal emitter daemon attribution test (AC8 entry).
//
// Covers (per files_to_modify line):
//   - emitReviewerInvoked appends a coord:<subject_role> atom
//   - metadata.coord.subject_role identifies the role being tracked
//   - metadata.coord.emitter_role = "daemon" distinguishes daemon-written
//     atoms from wrapper-written ones (AC5's caller-supplied X-Echo-Role
//     gate is bypassed because the daemon IS the authenticated emitter).
//
// 057a's deadlines.ts already writes deadline_missed atoms with
// source=coord:<subject_role>; this test does NOT modify deadlines.ts
// (Out of Scope) and asserts only the new internal-emitter path.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DeadlineTracker } from '../../src/coord/deadlines.js';
import {
  DAEMON_EMITTER_ROLE,
  emitReviewerInvoked,
} from '../../src/coord/internal-emitter.js';
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

const CORR = 'c9b71286-5f67-4a6c-9a5a-ab6ed07ce4ef';

let storage: MemoryStorage;
let tracker: DeadlineTracker;

beforeEach(() => {
  storage = new MemoryStorage();
  tracker = new DeadlineTracker(storage, CFG, {
    heartbeatIntervalMs: 0,
    reconciliationIntervalMs: null,
  });
});
afterEach(async () => {
  // no timers started — nothing to stop
});

describe('057b AC7 — internal emitter daemon attribution', () => {
  it('emitReviewerInvoked appends atom with subject_role attribution', async () => {
    await tracker.reconstruct();
    const id = await emitReviewerInvoked(storage, tracker, {
      subject_role: 'codex',
      correlation_id: CORR,
      request_path: 'backlog/reviews/foo/r1/request.md',
    });
    expect(id).toBeTruthy();
    const events = await storage.query({ source_prefix: 'coord:', limit: 10 });
    expect(events).toHaveLength(1);
    const atom = events[0]!;
    expect(atom.source).toBe('coord:codex');
    const coord = atom.metadata!['coord'] as Record<string, unknown>;
    expect(coord['event_type']).toBe('reviewer_invoked');
    expect(coord['subject_role']).toBe('codex');
    expect(coord['emitter_role']).toBe(DAEMON_EMITTER_ROLE);
    expect(coord['correlation_id']).toBe(CORR);
  });

  it('emitReviewerInvoked opens the pre-spawn deadline before returning', async () => {
    await tracker.reconstruct();
    await emitReviewerInvoked(storage, tracker, {
      subject_role: 'codex',
      correlation_id: CORR,
      request_path: 'backlog/reviews/foo/r1/request.md',
    });
    const snap = await tracker.currentSnapshot();
    expect(snap.round).toHaveLength(1);
    const r = snap.round[0]!;
    expect(r.subject_role).toBe('codex');
    expect(r.event_type).toBe('reviewer_invoked');
    expect(r.expects).toBe('tick_start');
    expect(r.key).toBe(CORR);
  });

  it('emitReviewerInvoked tolerates null tracker (does not throw)', async () => {
    const id = await emitReviewerInvoked(storage, null, {
      subject_role: 'codex',
      correlation_id: CORR,
      request_path: 'backlog/reviews/foo/r1/request.md',
    });
    expect(id).toBeTruthy();
  });
});
