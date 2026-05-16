// 057a AC6 + AC8 — coord volume perf fixture (r5 codex-ops F2 MED + r6 + r7
// convergent codex/codex-ops F1 MED).
//
// V1's operational contract: at ~3k coord atoms/day under 057b emission,
// the ledger reaches ~100k after ~34 days. Reconstruction at boot and
// one coord_status() call must complete in operational budgets.
//
// Synthesizes 100k coord atoms via MemoryStorage (interleaves successful
// + deadline_missed atoms so the reconstruction pass exercises both
// applyReplayAtom branches + cache priming) and asserts:
//   - DeadlineTracker.reconstruct() completes in <1500ms
//   - buildCoordStatus() completes in <300ms
//
// MemoryStorage is the synthetic backend — it's a fair proxy for the
// algorithm cost without fsync noise. The SqliteStorage path adds fsync
// + journaling cost, but the reconstruction algorithm is the same
// (single page-iter + replay loop) and the storage seam tests already
// cover sqlite parity for the iterator + watermark. A separate SQLite
// perf assertion is V1.5+ work.
//
// NO startup-warning mechanism is asserted in V1 (per r6 convergent —
// the r5 warning patch was rejected at r6: it used the rowid as a
// coord-row count which it isn't, and emitted a scheduler_health atom
// no wrapper would close).

import { describe, expect, it } from 'vitest';
import { DeadlineTracker } from '../../src/coord/deadlines.js';
import { buildCoordStatus } from '../../src/mcp/tools/coord-status.js';
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
    Object.freeze({
      name: 'codex-ops',
      headless: true,
      invoke_command: ['codex'] as const,
      events: Object.freeze({
        tick_start: Object.freeze({
          default_deadline_sec: 600,
          max_deadline_sec: 1200,
          expects: 'tick_end',
        }),
      }),
    }),
  ] as const),
}) as CoordRolesConfig;

const COUNT = 100_000;
const RECONSTRUCT_BUDGET_MS = 1500;
const STATUS_BUDGET_MS = 300;

describe('AC6+AC8 — coord volume perf fixture (100k atoms)', () => {
  it(`reconstruct <${RECONSTRUCT_BUDGET_MS}ms + coord_status <${STATUS_BUDGET_MS}ms at ${COUNT} atoms`, async () => {
    const storage = new MemoryStorage();
    // Synthesize COUNT coord atoms. Pattern: groups of 5 atoms repeat
    // (reviewer_invoked → tick_start → tick_end → reviewer_invoked → deadline_missed),
    // covering both the regular replay path AND the idempotency-cache
    // priming path. Each group uses a unique correlation_id so the
    // open-records maps churn rather than just spawning one entry.
    const baseTime = Date.parse('2026-05-01T00:00:00.000Z');
    let i = 0;
    while (i < COUNT) {
      const corr = `round-${i}`;
      const t0 = new Date(baseTime + i * 1000).toISOString();
      // reviewer_invoked (opener)
      await storage.append({
        source: 'coord:claude',
        timestamp: t0,
        content: '{"event_type":"reviewer_invoked"}',
        metadata: {
          surface: 'coord',
          session_id: 'echo:coord',
          coord: {
            event_type: 'reviewer_invoked',
            schema_version: 1,
            tier: 'round',
            subject_role: 'codex',
            correlation_id: corr,
          },
        },
      });
      i++;
      if (i >= COUNT) break;
      // tick_start (closes reviewer_invoked + opens tick_end deadline)
      await storage.append({
        source: 'coord:codex',
        timestamp: t0,
        content: '{"event_type":"tick_start"}',
        metadata: {
          surface: 'coord',
          session_id: 'echo:coord',
          coord: {
            event_type: 'tick_start',
            schema_version: 1,
            tier: 'round',
            subject_role: 'codex',
            correlation_id: corr,
          },
        },
      });
      i++;
      if (i >= COUNT) break;
      // tick_end (closes tick_start)
      await storage.append({
        source: 'coord:codex',
        timestamp: t0,
        content: '{"event_type":"tick_end"}',
        metadata: {
          surface: 'coord',
          session_id: 'echo:coord',
          coord: {
            event_type: 'tick_end',
            schema_version: 1,
            tier: 'round',
            subject_role: 'codex',
            correlation_id: corr,
          },
        },
      });
      i++;
      if (i >= COUNT) break;
      // a parallel reviewer_invoked + matching deadline_missed (so the
      // reconstruction primes the cache from durable atoms)
      const parallelCorr = `round-miss-${i}`;
      await storage.append({
        source: 'coord:claude',
        timestamp: t0,
        content: '{"event_type":"reviewer_invoked"}',
        metadata: {
          surface: 'coord',
          session_id: 'echo:coord',
          coord: {
            event_type: 'reviewer_invoked',
            schema_version: 1,
            tier: 'round',
            subject_role: 'codex-ops',
            correlation_id: parallelCorr,
          },
        },
      });
      i++;
      if (i >= COUNT) break;
      const idKey = createHash('sha256')
        .update(`${parallelCorr}|codex-ops|reviewer_invoked|deadline_missed`)
        .digest('hex');
      await storage.append({
        source: 'coord:codex-ops',
        timestamp: t0,
        content: '{"event_type":"deadline_missed"}',
        metadata: {
          surface: 'coord',
          session_id: 'echo:coord',
          coord: {
            event_type: 'deadline_missed',
            schema_version: 1,
            tier: 'round',
            subject_role: 'codex-ops',
            correlation_id: parallelCorr,
            opened_event_type: 'reviewer_invoked',
            expected_event_type: 'tick_start',
            idempotency_key: idKey,
          },
        },
      });
      i++;
    }

    expect(await storage.getCurrentCoordSequence()).toBe(COUNT);

    // Reconstruct budget.
    const tracker = new DeadlineTracker(storage, CFG, {
      now: () => new Date('2026-06-01T00:00:00.000Z'),
      heartbeatIntervalMs: 0,
      reconciliationIntervalMs: null,
    });
    const tReconStart = Date.now();
    await tracker.reconstruct();
    const reconMs = Date.now() - tReconStart;
    expect(reconMs).toBeLessThan(RECONSTRUCT_BUDGET_MS);

    // coord_status budget.
    const tStatusStart = Date.now();
    await buildCoordStatus({
      storage,
      coordRoles: CFG,
      deadlines: tracker,
      serverStartedAt: new Date('2026-05-31T23:59:00.000Z'),
      now: () => new Date('2026-06-01T00:00:00.000Z'),
    });
    const statusMs = Date.now() - tStatusStart;
    expect(statusMs).toBeLessThan(STATUS_BUDGET_MS);
  }, 30_000); // 30s timeout for the seed loop
});
