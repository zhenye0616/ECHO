// Holdout confirmation tests for item 131 — RC3: readers consume ALL
// extraction runs instead of the current run.
//
// Blind-holdout suite (131 builder must never see this file). Each test
// asserts the CORRECT behavior per 131 AC3, so it FAILS today (red =
// finding confirmed) and passes once the fix lands.
//
// The unit under test is the brief compiler's signal-read step. Today that
// logic lives only in raw/internal/prototypes/brief-now-prototype.mjs step 4
// (lines 43-52) with no importable unit, so it is reimplemented below as a
// faithful prototype-logic-copy and THAT is tested. AC3 requires the brief
// compiler to consume signals exclusively through filterToCurrentSignalRuns()
// (item 115 AC1, already exported from src/enrich/granola-signals.ts).
//
// Fixtures mirror the real atom/manifest shapes written by
// src/enrich/granola-signals.ts (prepareSignals :485-499 for signal atoms,
// the manifest append :760-776 for run manifests), stored in a real
// SqliteStorage on a temp db. No production state is touched.

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
import { SqliteStorage } from '../../src/storage/sqlite.js';
import type { EventId, Storage } from '../../src/storage/interface.js';

// ---------------------------------------------------------------------------
// prototype-logic-copy
// ---------------------------------------------------------------------------
// Faithful copy of brief-now-prototype.mjs step 4 (the "signals for the note"
// read the brief is compiled from): query ALL derived:granola-signals rows,
// filter to note_id, dedupe by dedupe_key across every extraction run.
// dedupe_key embeds hash(content) (granola-signals.ts:482), so revised or
// contradictory text from older/orphaned runs survives dedupe and leaks into
// the brief. This is the exact decision logic 131 AC3 replaces with
// filterToCurrentSignalRuns().
interface BriefSignalRow {
  type: unknown;
  text: string;
  subject: unknown;
}

async function prototypeSignalRowsForNote(
  storage: Storage,
  noteId: string,
): Promise<BriefSignalRow[]> {
  const signals = (await storage.query({ source: 'derived:granola-signals' })).filter(
    (e) => e.metadata?.['note_id'] === noteId,
  );
  const seen = new Set<string>();
  const rows: BriefSignalRow[] = [];
  for (const s of signals) {
    const k = (s.metadata?.['dedupe_key'] as string | undefined) ?? s.id;
    if (seen.has(k)) continue;
    seen.add(k);
    rows.push({
      type: s.metadata?.['signal_type'],
      text: s.content.trim(),
      subject: s.metadata?.['canonical_subject'] ?? null,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Fixture builders — real shapes from granola-signals.ts
// ---------------------------------------------------------------------------

// Copy of the private stableHash (granola-signals.ts:438) so fixture
// dedupe_keys are byte-identical in format to production rows.
function stableHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

interface FixtureSignal {
  signalType: 'decision' | 'action' | 'rationale';
  text: string;
  subject: string;
}

// Mirrors prepareSignals + the signal-atom append (granola-signals.ts:485-499,
// :750-757): one derived:granola-signals atom per signal, stamped with the
// extraction_run_id and the content-hash dedupe_key.
async function appendSignalAtom(
  storage: Storage,
  opts: {
    noteId: string;
    runId: string;
    completedAt: string;
    signal: FixtureSignal;
    meetingTitle?: string;
  },
): Promise<EventId> {
  const content = opts.signal.text.trim();
  return await storage.append({
    source: GRANOLA_SIGNAL_SOURCE,
    timestamp: opts.completedAt,
    content,
    metadata: {
      signal_type: opts.signal.signalType,
      note_id: opts.noteId,
      meeting_title: opts.meetingTitle ?? 'Advisor sync',
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

// Mirrors the manifest append (granola-signals.ts:760-776).
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
    metadata: {
      manifest_type: 'granola_signal_run',
      ...manifest,
    },
  });
}

// Appends a full extraction run (signal atoms, then the run manifest — the
// same non-atomic ordering the worker uses) and returns the atom ids.
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

function sortedRows(rows: BriefSignalRow[]): BriefSignalRow[] {
  return [...rows].sort((a, b) =>
    `${String(a.type)}|${a.text}`.localeCompare(`${String(b.type)}|${b.text}`),
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('holdout 131 / RC3 — brief reads must be current-run-only (AC3)', () => {
  let dir: string;
  let storage: SqliteStorage;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'echo-holdout-131-rc3-'));
    storage = new SqliteStorage(join(dir, 'test.db'));
  });

  afterEach(() => {
    storage.close();
    rmSync(dir, { recursive: true, force: true });
  });

  // CONFIRMS: All-runs signal merge — dedupe_key embeds hash(content), so any
  // second run puts duplicate/contradictory decisions in the brief
  // (stress-test §Targeting) → 131 AC3
  it('a superseded older run must contribute nothing: brief rows are exactly the current run', async () => {
    const noteId = 'note-pricing';

    // Older run (run-1): the mid-meeting/frozen extraction with signal text X.
    await appendExtractionRun(storage, {
      noteId,
      runId: 'run-1',
      completedAt: '2026-07-09T17:00:00.000Z',
      supersedes: null,
      signals: [
        {
          signalType: 'decision',
          text: 'We decided to price the pilot at $20/mo.',
          subject: 'pilot pricing',
        },
        {
          signalType: 'action',
          text: 'Dana will draft the pricing page.',
          subject: 'pricing page',
        },
      ],
    });

    // Current run (run-2, supersedes run-1): revised text X' — the decision
    // was corrected late in the meeting; the action gained a deadline.
    await appendExtractionRun(storage, {
      noteId,
      runId: 'run-2',
      completedAt: '2026-07-09T17:05:00.000Z',
      supersedes: 'run-1',
      signals: [
        {
          signalType: 'decision',
          text: 'We decided to price the pilot at $25/mo.',
          subject: 'pilot pricing',
        },
        {
          signalType: 'action',
          text: 'Dana will draft the pricing page by Friday.',
          subject: 'pricing page',
        },
      ],
    });

    const rows = await prototypeSignalRowsForNote(storage, noteId);

    // AC3-correct behavior: ONLY the current (run-2) signals reach the brief.
    // Today the prototype-logic-copy merges both runs (4 rows, including the
    // contradictory $20 decision), because every distinct text has a distinct
    // content-hash dedupe_key → RED.
    expect(sortedRows(rows)).toEqual(
      sortedRows([
        {
          type: 'decision',
          text: 'We decided to price the pilot at $25/mo.',
          subject: 'pilot pricing',
        },
        {
          type: 'action',
          text: 'Dana will draft the pricing page by Friday.',
          subject: 'pricing page',
        },
      ]),
    );
  });

  // CONFIRMS: Interrupt/append-failure orphan signals (atoms appended before
  // manifest, non-atomic :750-776) visible forever to brief-now's raw query
  // (stress-test §Concurrency) → 131 AC3
  it('orphan signal atoms with NO manifest (crash before manifest write) must be excluded', async () => {
    const noteId = 'note-orphan';

    // Simulate the crash window: the worker appended signal atoms, then died
    // before the GRANOLA_SIGNAL_INDEX_SOURCE manifest append. No manifest
    // exists for this note at all.
    await appendSignalAtom(storage, {
      noteId,
      runId: 'run-orphan',
      completedAt: '2026-07-09T18:00:00.000Z',
      signal: {
        signalType: 'decision',
        text: 'Half-extracted decision from an interrupted run.',
        subject: 'interrupted run',
      },
    });
    await appendSignalAtom(storage, {
      noteId,
      runId: 'run-orphan',
      completedAt: '2026-07-09T18:00:00.000Z',
      signal: {
        signalType: 'action',
        text: 'Half-extracted action from an interrupted run.',
        subject: 'interrupted run',
      },
    });

    const rows = await prototypeSignalRowsForNote(storage, noteId);

    // AC3-correct behavior (filterToCurrentSignalRuns contract: "signals for
    // notes with no manifest at all are excluded"): a compliant reader yields
    // ZERO rows — the extraction never completed, so the brief path must
    // hard-fail / render nothing rather than compile orphan fragments.
    // Today the prototype-logic-copy returns both orphan atoms → RED.
    expect(rows).toEqual([]);
  });

  // CONFIRMS: Double extraction window / interrupted retry leaves orphan atoms
  // next to a completed run; canonical resolver self-heals but brief-now's
  // all-runs read does not (stress-test §Concurrency) → 131 AC3
  it('orphan atoms from an interrupted second run must not leak into a note that has a completed current run', async () => {
    const noteId = 'note-mixed';

    // Completed current run with a manifest.
    await appendExtractionRun(storage, {
      noteId,
      runId: 'run-good',
      completedAt: '2026-07-09T19:00:00.000Z',
      supersedes: null,
      signals: [
        {
          signalType: 'decision',
          text: 'We decided to run the pilot with two advisors.',
          subject: 'pilot scope',
        },
      ],
    });

    // A concurrent/retry run appended one atom, then crashed before its
    // manifest write — orphan atom, referenced by no manifest.
    await appendSignalAtom(storage, {
      noteId,
      runId: 'run-interrupted',
      completedAt: '2026-07-09T19:00:30.000Z',
      signal: {
        signalType: 'decision',
        text: 'We decided to run the pilot with three advisors.',
        subject: 'pilot scope',
      },
    });

    const rows = await prototypeSignalRowsForNote(storage, noteId);

    // AC3-correct behavior: only the manifest-referenced (run-good) signal
    // reaches the brief. Today the prototype-logic-copy also returns the
    // contradictory orphan ("three advisors") because its content-hash
    // dedupe_key differs → RED.
    expect(sortedRows(rows)).toEqual([
      {
        type: 'decision',
        text: 'We decided to run the pilot with two advisors.',
        subject: 'pilot scope',
      },
    ]);
  });
});
