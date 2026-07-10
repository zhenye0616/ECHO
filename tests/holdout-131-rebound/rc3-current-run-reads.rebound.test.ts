// REBOUND holdout — item 131 RC3 (current-run reads, AC3).
// Same scenarios/assertion-semantics as tests/holdout-131/rc3-current-run-reads.test.ts,
// but bound to the SHIPPED brief compiler (compilePostMeetingBrief), which per
// AC3 consumes signals exclusively through filterToCurrentSignalRuns(), instead
// of the all-runs prototype-logic-copy.

import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  GRANOLA_SIGNAL_EXTRACTOR_VERSION,
  GRANOLA_SIGNAL_INDEX_SOURCE,
  GRANOLA_SIGNAL_SOURCE,
} from '../../src/enrich/granola-signals.js';
import {
  compilePostMeetingBrief,
  PostMeetingBriefError,
} from '../../src/enrich/post-meeting-brief.js';
import { SqliteStorage } from '../../src/storage/sqlite.js';
import type { EventId, Storage } from '../../src/storage/interface.js';

function stableHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

interface FixtureSignal {
  signalType: 'decision' | 'action' | 'rationale';
  text: string;
  subject: string;
}

async function seedRawNote(storage: Storage, noteId: string): Promise<void> {
  const updatedAt = '2026-07-09T17:00:00.000Z';
  await storage.append({
    source: 'api:granola',
    timestamp: updatedAt,
    content: `## Advisor sync\n\nSummary for ${noteId}.`,
    metadata: {
      note_id: noteId,
      title: 'Advisor sync',
      created_at: updatedAt,
      updated_at: updatedAt,
      attendees: [{ name: 'Zhen' }],
      web_url: `https://granola.ai/notes/${noteId}`,
      granola_atom_type: 'summary',
      dedupe_key: `granola:${noteId}:summary`,
    },
  });
  await storage.append({
    source: 'api:granola',
    timestamp: updatedAt,
    content: '[10-20] Zhen: discussion.',
    metadata: {
      note_id: noteId,
      title: 'Advisor sync',
      created_at: updatedAt,
      updated_at: updatedAt,
      granola_atom_type: 'transcript',
      dedupe_key: `granola:${noteId}:transcript`,
    },
  });
}

async function appendSignalAtom(
  storage: Storage,
  opts: { noteId: string; runId: string; completedAt: string; signal: FixtureSignal },
): Promise<EventId> {
  const content = opts.signal.text.trim();
  return await storage.append({
    source: GRANOLA_SIGNAL_SOURCE,
    timestamp: opts.completedAt,
    content,
    metadata: {
      signal_type: opts.signal.signalType,
      note_id: opts.noteId,
      meeting_title: 'Advisor sync',
      canonical_subject: opts.signal.subject,
      parent_dedupe_key: `granola:${opts.noteId}:transcript`,
      source_span: { kind: 'summary' },
      confidence: 0.9,
      extractor_version: GRANOLA_SIGNAL_EXTRACTOR_VERSION,
      extraction_run_id: opts.runId,
      dedupe_key: `granola:signal:${opts.noteId}:${GRANOLA_SIGNAL_EXTRACTOR_VERSION}:${opts.signal.signalType}:${stableHash(content)}`,
    },
  });
}

async function appendRunManifest(
  storage: Storage,
  opts: {
    noteId: string;
    runId: string;
    completedAt: string;
    supersedes: string | null;
    signalAtomIds: EventId[];
  },
): Promise<void> {
  const manifest = {
    note_id: opts.noteId,
    extractor_version: GRANOLA_SIGNAL_EXTRACTOR_VERSION,
    extraction_run_id: opts.runId,
    completed_at: opts.completedAt,
    supersedes: opts.supersedes,
    signal_atom_ids: opts.signalAtomIds,
  };
  await storage.append({
    source: GRANOLA_SIGNAL_INDEX_SOURCE,
    timestamp: opts.completedAt,
    content: JSON.stringify(manifest),
    metadata: { manifest_type: 'granola_signal_run', ...manifest },
  });
}

async function appendExtractionRun(
  storage: Storage,
  opts: {
    noteId: string;
    runId: string;
    completedAt: string;
    supersedes: string | null;
    signals: FixtureSignal[];
  },
): Promise<EventId[]> {
  const ids: EventId[] = [];
  for (const signal of opts.signals) {
    ids.push(
      await appendSignalAtom(storage, {
        noteId: opts.noteId,
        runId: opts.runId,
        completedAt: opts.completedAt,
        signal,
      }),
    );
  }
  await appendRunManifest(storage, {
    noteId: opts.noteId,
    runId: opts.runId,
    completedAt: opts.completedAt,
    supersedes: opts.supersedes,
    signalAtomIds: ids,
  });
  return ids;
}

describe('holdout-131 RC3 [rebound] — brief reads must be current-run-only (AC3)', () => {
  let dir: string;
  let storage: SqliteStorage;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'echo-holdout-131-rc3-rebound-'));
    storage = new SqliteStorage(join(dir, 'test.db'));
  });

  afterEach(() => {
    storage.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('a superseded older run must contribute nothing: brief rows are exactly the current run', async () => {
    const noteId = 'note-pricing';
    await seedRawNote(storage, noteId);

    await appendExtractionRun(storage, {
      noteId,
      runId: 'run-1',
      completedAt: '2026-07-09T17:00:00.000Z',
      supersedes: null,
      signals: [
        { signalType: 'decision', text: 'We decided to price the pilot at $20/mo.', subject: 'pilot pricing' },
        { signalType: 'action', text: 'Dana will draft the pricing page.', subject: 'pricing page' },
      ],
    });
    await appendExtractionRun(storage, {
      noteId,
      runId: 'run-2',
      completedAt: '2026-07-09T17:05:00.000Z',
      supersedes: 'run-1',
      signals: [
        { signalType: 'decision', text: 'We decided to price the pilot at $25/mo.', subject: 'pilot pricing' },
        { signalType: 'action', text: 'Dana will draft the pricing page by Friday.', subject: 'pricing page' },
      ],
    });

    const brief = await compilePostMeetingBrief(storage, { noteId });

    // AC3: only the current (run-2) signals reach the brief.
    expect(brief.decided.map((d) => d.text).sort()).toEqual([
      'We decided to price the pilot at $25/mo.',
    ]);
    expect(brief.actions.map((a) => a.text).sort()).toEqual([
      'Dana will draft the pricing page by Friday.',
    ]);
    // The superseded run's contradictory text must be absent.
    const allText = JSON.stringify(brief);
    expect(allText).not.toContain('$20/mo');
    expect(allText).not.toContain('pricing page.');
  });

  it('orphan signal atoms with NO manifest (crash before manifest write) must be excluded', async () => {
    const noteId = 'note-orphan';
    await seedRawNote(storage, noteId);

    await appendSignalAtom(storage, {
      noteId,
      runId: 'run-orphan',
      completedAt: '2026-07-09T18:00:00.000Z',
      signal: { signalType: 'decision', text: 'Half-extracted decision from an interrupted run.', subject: 'interrupted run' },
    });
    await appendSignalAtom(storage, {
      noteId,
      runId: 'run-orphan',
      completedAt: '2026-07-09T18:00:00.000Z',
      signal: { signalType: 'action', text: 'Half-extracted action from an interrupted run.', subject: 'interrupted run' },
    });

    // AC3+AC1: a note whose signals belong to no completed manifest run must
    // NOT compile orphan fragments — the compiler hard-fails (no current run).
    await expect(compilePostMeetingBrief(storage, { noteId })).rejects.toBeInstanceOf(
      PostMeetingBriefError,
    );
  });

  it('orphan atoms from an interrupted second run must not leak into a note that has a completed current run', async () => {
    const noteId = 'note-mixed';
    await seedRawNote(storage, noteId);

    await appendExtractionRun(storage, {
      noteId,
      runId: 'run-good',
      completedAt: '2026-07-09T19:00:00.000Z',
      supersedes: null,
      signals: [
        { signalType: 'decision', text: 'We decided to run the pilot with two advisors.', subject: 'pilot scope' },
      ],
    });
    await appendSignalAtom(storage, {
      noteId,
      runId: 'run-interrupted',
      completedAt: '2026-07-09T19:00:30.000Z',
      signal: { signalType: 'decision', text: 'We decided to run the pilot with three advisors.', subject: 'pilot scope' },
    });

    const brief = await compilePostMeetingBrief(storage, { noteId });

    // AC3: only the manifest-referenced (run-good) signal reaches the brief.
    expect(brief.decided.map((d) => d.text)).toEqual([
      'We decided to run the pilot with two advisors.',
    ]);
    expect(JSON.stringify(brief)).not.toContain('three advisors');
  });
});
