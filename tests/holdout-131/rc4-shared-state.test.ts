/**
 * HOLDOUT CONFIRMATION SUITE — item 131, RC4: shared mutable state without
 * coordination or expiry (spec AC4).
 *
 * Red-first tests: each test asserts the CORRECT behavior per
 * backlog/proposed/2026-07-10-131-post-meeting-brief-generator-v0.md AC4, so
 * every test is expected to FAIL against today's code (confirming the finding
 * from raw/internal/decisions/2026-07-10-brief-path-stress-test.md) and to
 * pass once the AC4 fix lands.
 *
 * No production state is touched: ECHO home is repointed at a temp dir,
 * checkpoints live under mkdtemp dirs, storage is a temp-file SqliteStorage,
 * extractors are stubs, time is injected.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setEchoHomeRoot } from '../../src/echo-home/paths.js';
import {
  GRANOLA_CHECKPOINT_SCHEMA_VERSION,
  loadGranolaCheckpoint,
  writeGranolaCheckpoint,
} from '../../src/capture/surfaces/granola-poller.js';
import {
  GRANOLA_SIGNAL_INDEX_SOURCE,
  loadGranolaSignalCheckpoint,
  runGranolaSignalWorkerOnce,
  type GranolaExtractedSignal,
  type GranolaSignalExtractor,
} from '../../src/enrich/granola-signals.js';
import { SqliteStorage } from '../../src/storage/sqlite.js';
import type { Storage } from '../../src/storage/interface.js';

// Repoint ECHO_HOME at a fresh temp dir so no default-path fallback (worker
// heartbeat, checkpoint defaults) can ever land in the real ~/.echo/state.
const tempDirs: string[] = [];
function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}
beforeEach(() => {
  setEchoHomeRoot(tempDir('echo-holdout-131-home-'));
});
afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

const NOTE_ID = 'note-rc4';
const NOTE_UPDATED_AT = '2026-07-09T10:00:00.000Z';

async function seedRawMeeting(store: Storage, noteId = NOTE_ID): Promise<void> {
  await store.append({
    source: 'api:granola',
    timestamp: NOTE_UPDATED_AT,
    content: 'We decided to run the pilot with Slack plus Granola only.',
    metadata: {
      note_id: noteId,
      title: 'Advisor sync',
      updated_at: NOTE_UPDATED_AT,
      granola_atom_type: 'summary',
      dedupe_key: `granola:${noteId}:summary`,
    },
  });
  await store.append({
    source: 'api:granola',
    timestamp: NOTE_UPDATED_AT,
    content:
      '[10-20] Zhen: We decided to run the pilot with Slack plus Granola only.\n[21-30] Parth: Parth will call Clara about the rollout.',
    metadata: {
      note_id: noteId,
      title: 'Advisor sync',
      updated_at: NOTE_UPDATED_AT,
      granola_atom_type: 'transcript',
      dedupe_key: `granola:${noteId}:transcript`,
    },
  });
}

function fixtureSignals(): GranolaExtractedSignal[] {
  return [
    {
      signal_type: 'decision',
      text: 'Run the pilot with Slack plus Granola only.',
      canonical_subject: 'pilot scope',
      source_span: { kind: 'summary' },
      confidence: 0.9,
      decision_status: 'decided',
    },
  ];
}

const succeedingExtractor: GranolaSignalExtractor = () => Promise.resolve(fixtureSignals());
const failingExtractor: GranolaSignalExtractor = () =>
  Promise.reject(new Error('simulated transient brain blip'));

describe('holdout-131 RC4: shared mutable state without coordination or expiry', () => {
  // CONFIRMS: Poller checkpoint read-modify-write race — brief-now vs 60s daemon
  // poll, double-ingest + high-water-mark regression (stress-test §Concurrency)
  // → 131 AC4
  //
  // Mirrors the exact RMW pollGranolaOnce performs (load at :590, write at
  // :656/:668) by driving the real loadGranolaCheckpoint /
  // writeGranolaCheckpoint against one shared checkpoint path:
  //   process A (daemon tick) loads;
  //   process B (manual brief-now poll) loads, ingests note-b, writes;
  //   process A ingests note-a and writes from its STALE snapshot.
  // AC4: "a manual run concurrent with a daemon tick loses no checkpoint
  // entries (test: interleaved RMW fixture)". So B's ingested id and B's
  // advanced high-water-mark must survive A's write.
  it('interleaved checkpoint RMW loses neither ingested ids nor high-water-mark advancement', () => {
    const checkpointPath = join(tempDir('echo-holdout-131-poller-cp-'), 'granola.json');

    // Seed a pre-existing checkpoint (both processes start from the same state).
    writeGranolaCheckpoint(
      {
        schema_version: GRANOLA_CHECKPOINT_SCHEMA_VERSION,
        high_water_mark: '2026-07-09T09:00:00.000Z',
        ingested_note_ids: ['note-0'],
        last_synced_at: '2026-07-09T09:00:00.000Z',
      },
      checkpointPath,
    );

    // Process A (daemon tick) loads its snapshot first.
    const snapshotA = loadGranolaCheckpoint(checkpointPath);
    const ingestedA = new Set(snapshotA.ingested_note_ids);

    // Process B (manual run) loads, ingests note-b, and writes — advancing the
    // high-water-mark to note-b's updated_at.
    const snapshotB = loadGranolaCheckpoint(checkpointPath);
    const ingestedB = new Set(snapshotB.ingested_note_ids);
    ingestedB.add('note-b');
    writeGranolaCheckpoint(
      {
        schema_version: GRANOLA_CHECKPOINT_SCHEMA_VERSION,
        high_water_mark: '2026-07-09T10:30:00.000Z',
        ingested_note_ids: [...ingestedB].sort(),
        last_synced_at: '2026-07-09T10:31:00.000Z',
      },
      checkpointPath,
    );

    // Process A now finishes its own poll: it ingested note-a, and writes from
    // the snapshot it loaded BEFORE B's write (the poller keeps no fresher view).
    ingestedA.add('note-a');
    writeGranolaCheckpoint(
      {
        schema_version: GRANOLA_CHECKPOINT_SCHEMA_VERSION,
        high_water_mark: snapshotA.high_water_mark, // stale: 09:00
        ingested_note_ids: [...ingestedA].sort(),
        last_synced_at: '2026-07-09T10:32:00.000Z',
      },
      checkpointPath,
    );

    const final = loadGranolaCheckpoint(checkpointPath);
    // Correct behavior (AC4): no entry lost — both notes recorded ingested.
    expect(final.ingested_note_ids).toContain('note-b');
    expect(final.ingested_note_ids).toContain('note-a');
    // And B's high-water-mark advancement is not regressed (regression means
    // note-b's window is re-listed and re-ingested with no dedupe on append).
    expect(final.high_water_mark).toBe('2026-07-09T10:30:00.000Z');
  });

  // CONFIRMS: One transient failure poisons a note permanently — no retry-after,
  // no TTL (stress-test top-5 #5) → 131 AC4
  //
  // A note that fails extraction at maxRetries gets last_failure_at written
  // into the checkpoint; shouldExtractNote (granola-signals.ts:427-433) then
  // returns false forever for the same fingerprint + extractor version. AC4:
  // "Extraction failure entries carry a retry-after (default 1h, capped
  // attempts) instead of permanent blocks." So a worker run 2 HOURS after the
  // failure must retry the note.
  it('a failed note is retried after the retry-after window (2h > default 1h) instead of being blocked forever', async () => {
    const checkpointPath = join(tempDir('echo-holdout-131-signals-cp-'), 'signals.json');
    const storage = new SqliteStorage(join(tempDir('echo-holdout-131-db-'), 'test.db'));
    try {
      await seedRawMeeting(storage);

      // Run 1 at T+1h after the note's updated_at (settled): extractor throws
      // through all retries → failure recorded at maxRetries.
      const run1 = await runGranolaSignalWorkerOnce(storage, failingExtractor, {
        checkpointPath,
        now: () => '2026-07-09T11:00:00.000Z',
        maxRetries: 2,
        retryDelayMs: 0,
      });
      expect(run1.status).toBe('error');
      if (run1.status === 'error') expect(run1.reason).toBe('extraction_failed');
      const afterFailure = loadGranolaSignalCheckpoint(checkpointPath);
      expect(afterFailure.notes[NOTE_ID]?.last_failure_at).toBe('2026-07-09T11:00:00.000Z');

      // Run 2 with injected now() advanced 2 HOURS past the failure. The brain
      // is healthy again. Correct behavior (AC4): the backoff window (default
      // 1h) has elapsed, so the note is retried and extracts successfully.
      const run2 = await runGranolaSignalWorkerOnce(storage, succeedingExtractor, {
        checkpointPath,
        now: () => '2026-07-09T13:00:00.000Z',
        maxRetries: 2,
        retryDelayMs: 0,
      });
      expect(run2.status).toBe('ok');
      if (run2.status === 'ok') {
        // Today this is 0: shouldExtractNote blocks permanently on
        // last_failure_at with no TTL — the note never extracts again.
        expect(run2.notes_extracted).toBe(1);
      }
      const afterRetry = loadGranolaSignalCheckpoint(checkpointPath);
      expect(afterRetry.notes[NOTE_ID]?.last_success_at).toBe('2026-07-09T13:00:00.000Z');
    } finally {
      storage.close();
    }
  });

  // CONFIRMS: Same-note double extraction across processes — per-process
  // checkpoints blind each other; existing current-run manifest not treated as
  // sufficient skip (stress-test §Concurrency, "Signals checkpoint mutual
  // clobber" / "Double extraction window") → 131 AC4
  //
  // Two runGranolaSignalWorkerOnce calls with SEPARATE checkpoint paths
  // (brief-now's manual run vs the daemon worker) over one shared storage and
  // one unchanged note. The first run succeeds and appends a current-run
  // manifest. The second process cannot see the first's checkpoint entry, but
  // it CAN see the current-run manifest in shared storage for the identical
  // input fingerprint — correct behavior per AC4 (guard: "treat existing
  // current-run manifest as sufficient skip") is to skip, not burn a second
  // multi-minute brain run and append a duplicate run.
  it('a second process skips a note whose unchanged content already has a current-run manifest', async () => {
    const checkpointA = join(tempDir('echo-holdout-131-cp-a-'), 'signals-a.json');
    const checkpointB = join(tempDir('echo-holdout-131-cp-b-'), 'signals-b.json');
    const storage = new SqliteStorage(join(tempDir('echo-holdout-131-db2-'), 'test.db'));
    try {
      await seedRawMeeting(storage);

      // Process A (daemon) extracts successfully.
      const runA = await runGranolaSignalWorkerOnce(storage, succeedingExtractor, {
        checkpointPath: checkpointA,
        now: () => '2026-07-09T11:00:00.000Z',
        retryDelayMs: 0,
      });
      expect(runA.status).toBe('ok');
      if (runA.status === 'ok') expect(runA.notes_extracted).toBe(1);

      // Process B (brief-now path) runs with its own empty checkpoint. The
      // note content is byte-identical (same input fingerprint) and a current
      // run manifest exists in shared storage.
      const runB = await runGranolaSignalWorkerOnce(storage, succeedingExtractor, {
        checkpointPath: checkpointB,
        now: () => '2026-07-09T11:05:00.000Z',
        retryDelayMs: 0,
      });
      expect(runB.status).toBe('ok');
      if (runB.status === 'ok') {
        // Today this is 1: shouldExtractNote's final branch returns true for a
        // missing checkpoint entry even when a current-run manifest with the
        // same fingerprint exists → full re-extraction (second brain run).
        expect(runB.notes_extracted).toBe(0);
      }

      // And the shared store holds exactly ONE extraction-run manifest for the
      // note — no duplicate run for byte-identical input.
      const manifests = (await storage.query({ source: GRANOLA_SIGNAL_INDEX_SOURCE })).filter(
        (event) => event.metadata?.['note_id'] === NOTE_ID,
      );
      expect(manifests).toHaveLength(1);
    } finally {
      storage.close();
    }
  });
});
