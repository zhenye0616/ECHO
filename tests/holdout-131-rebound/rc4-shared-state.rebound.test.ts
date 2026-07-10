// REBOUND holdout — item 131 RC4 (shared-state coordination, AC4), RMW leg.
// The original rc4 "interleaved checkpoint RMW" test drives the RAW
// loadGranolaCheckpoint/writeGranolaCheckpoint pair with no coordination — that
// contract legitimately MOVED under AC4: coordination is now the checkpoint
// LOCK at the call site (pollGranolaOnce holds withGranolaCheckpointLock across
// its load-modify-write; granola-poller.ts:870-967). This probe drives that
// REAL locked call-site pattern under genuine concurrency and asserts the AC4
// invariant: a manual run concurrent with a daemon tick loses no checkpoint
// entries and does not regress the high-water-mark.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setEchoHomeRoot } from '../../src/echo-home/paths.js';
import {
  GRANOLA_CHECKPOINT_SCHEMA_VERSION,
  loadGranolaCheckpoint,
  withGranolaCheckpointLock,
  writeCheckpointJsonWithLock,
  writeGranolaCheckpoint,
  type GranolaCheckpoint,
} from '../../src/capture/surfaces/granola-poller.js';

const tempDirs: string[] = [];
function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}
beforeEach(() => {
  setEchoHomeRoot(tempDir('echo-holdout-131-rebound-rc4-home-'));
});
afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

// One full locked read-modify-write, exactly as pollGranolaOnce does it: acquire
// the lock, load the checkpoint FRESH inside the critical section, merge in the
// newly-ingested note + advance the high-water-mark, commit through the
// owner-fenced locked write.
async function lockedIngest(
  checkpointPath: string,
  noteId: string,
  noteUpdatedAt: string,
): Promise<void> {
  await withGranolaCheckpointLock(checkpointPath, { timeoutMs: 10_000 }, async (lock) => {
    const current = loadGranolaCheckpoint(checkpointPath);
    const ingested = new Set(current.ingested_note_ids);
    ingested.add(noteId);
    const hwm =
      current.high_water_mark !== null &&
      current.high_water_mark >= noteUpdatedAt
        ? current.high_water_mark
        : noteUpdatedAt;
    const next: GranolaCheckpoint = {
      schema_version: GRANOLA_CHECKPOINT_SCHEMA_VERSION,
      high_water_mark: hwm,
      ingested_note_ids: [...ingested].sort(),
      last_synced_at: noteUpdatedAt,
    };
    await writeCheckpointJsonWithLock(lock, `${JSON.stringify(next, null, 2)}\n`);
  });
}

describe('holdout-131 RC4 [rebound] — locked checkpoint RMW loses no entries (AC4)', () => {
  it('a manual run concurrent with a daemon tick loses neither ingested ids nor hwm advancement', async () => {
    const checkpointPath = join(tempDir('echo-holdout-131-rebound-rc4-cp-'), 'granola.json');

    // Pre-existing checkpoint (both processes start from the same state).
    writeGranolaCheckpoint(
      {
        schema_version: GRANOLA_CHECKPOINT_SCHEMA_VERSION,
        high_water_mark: '2026-07-09T09:00:00.000Z',
        ingested_note_ids: ['note-0'],
        last_synced_at: '2026-07-09T09:00:00.000Z',
      },
      checkpointPath,
    );

    // Daemon tick (note-a @10:00) and manual brief run (note-b @10:30) race for
    // the same checkpoint. The lock serializes their load-modify-write cycles.
    await Promise.all([
      lockedIngest(checkpointPath, 'note-a', '2026-07-09T10:00:00.000Z'),
      lockedIngest(checkpointPath, 'note-b', '2026-07-09T10:30:00.000Z'),
    ]);

    const final = loadGranolaCheckpoint(checkpointPath);
    // AC4: no entry lost.
    expect(final.ingested_note_ids).toContain('note-0');
    expect(final.ingested_note_ids).toContain('note-a');
    expect(final.ingested_note_ids).toContain('note-b');
    // AC4: hwm advanced to the latest and never regressed by a stale writer.
    expect(final.high_water_mark).toBe('2026-07-09T10:30:00.000Z');
  });
});
