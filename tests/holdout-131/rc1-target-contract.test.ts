// ---------------------------------------------------------------------------
// HOLDOUT CONFIRMATION SUITE — item 131, RC1: "the brief trusts silently
// instead of verifying its target."
//
// These are red-first tests: each asserts the CORRECT behavior per 131 AC1,
// so it FAILS today (confirming the stress-test finding is real) and will
// pass once the fix lands. Blind holdout — the 131 builder never sees this.
//
// The prototype (raw/internal/prototypes/brief-now-prototype.mjs) has no
// importable unit, so its decision logic is reimplemented inline below as a
// faithful copy (marked PROTOTYPE-LOGIC-COPY) and THAT copy is driven against
// real seams (SqliteStorage temp db, real pollGranolaOnce, real
// runGranolaSignalWorkerOnce with a stubbed extractor).
//
// No production state touched: temp dirs for every store/checkpoint, ECHO
// home repointed at a temp root, fake Granola API client, stub extractFn,
// injected now().
// ---------------------------------------------------------------------------

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setEchoHomeRoot } from '../../src/echo-home/paths.js';
import {
  pollGranolaOnce,
  type GranolaApiClient,
  type GranolaListParams,
  type GranolaListResponse,
  type GranolaNoteDetail,
  type GranolaPollResult,
} from '../../src/capture/surfaces/granola-poller.js';
import {
  GRANOLA_SIGNAL_INDEX_SOURCE,
  GRANOLA_SIGNAL_SOURCE,
  resolveCurrentGranolaSignalRuns,
  runGranolaSignalWorkerOnce,
  type GranolaSignalExtractor,
} from '../../src/enrich/granola-signals.js';
import { SqliteStorage } from '../../src/storage/sqlite.js';
import type { CaptureEvent, Storage } from '../../src/storage/interface.js';

// Injected clock — no Date.now anywhere in fixtures or assertions.
const NOW_ISO = '2026-07-09T20:00:00.000Z';
const NOW_MS = Date.parse(NOW_ISO);
// AC1 default argv-less freshness window: 30 minutes.
const FRESHNESS_WINDOW_MS = 30 * 60_000;

// ---------------------------------------------------------------------------
// Temp-dir plumbing (mirrors tests/enrich/granola-signals.test.ts patterns).
// ---------------------------------------------------------------------------

const tempDirs: string[] = [];
function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

let storage: SqliteStorage;

beforeEach(() => {
  // Repoint ECHO_HOME so any worker-side state write lands in temp, never
  // the real ~/.echo.
  setEchoHomeRoot(tempDir('echo-holdout131-home-'));
  storage = new SqliteStorage(join(tempDir('echo-holdout131-db-'), 'test.db'));
});

afterEach(() => {
  storage.close();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Append the summary atom exactly as granolaNoteToCaptureEvents shapes it. */
async function seedSummaryAtom(
  store: Storage,
  opts: { noteId: string; updatedAt: string; title?: string },
): Promise<void> {
  await store.append({
    source: 'api:granola',
    timestamp: opts.updatedAt,
    content: `## ${opts.title ?? `Meeting ${opts.noteId}`}\n\nSummary body for ${opts.noteId}.`,
    metadata: {
      note_id: opts.noteId,
      title: opts.title ?? `Meeting ${opts.noteId}`,
      created_at: opts.updatedAt,
      updated_at: opts.updatedAt,
      attendees: [{ name: 'Zhen' }, { name: 'Advisor P.' }],
      web_url: `https://granola.ai/notes/${opts.noteId}`,
      granola_atom_type: 'summary',
      dedupe_key: `granola:${opts.noteId}:summary`,
    },
  });
}

/** Append the transcript atom (needed for the extraction worker to see the note). */
async function seedTranscriptAtom(
  store: Storage,
  opts: { noteId: string; updatedAt: string; title?: string },
): Promise<void> {
  await store.append({
    source: 'api:granola',
    timestamp: opts.updatedAt,
    content:
      '[10-20] Zhen: We decided to move the pilot to Slack-only.\n[21-30] Advisor P.: Parth will call Clara about the intro.',
    metadata: {
      note_id: opts.noteId,
      title: opts.title ?? `Meeting ${opts.noteId}`,
      created_at: opts.updatedAt,
      updated_at: opts.updatedAt,
      granola_atom_type: 'transcript',
      dedupe_key: `granola:${opts.noteId}:transcript`,
    },
  });
}

type ListStep = GranolaListResponse | Error;

class FakeGranolaClient implements GranolaApiClient {
  constructor(
    private readonly listQueue: ListStep[],
    private readonly details: Map<string, GranolaNoteDetail> = new Map(),
  ) {}

  async listNotes(_params: GranolaListParams): Promise<GranolaListResponse> {
    const next = this.listQueue.shift();
    if (next === undefined) throw new Error('unexpected listNotes call');
    if (next instanceof Error) throw next;
    return next;
  }

  async getNote(noteId: string): Promise<GranolaNoteDetail> {
    const detail = this.details.get(noteId);
    if (detail === undefined) throw new Error(`unexpected getNote call: ${noteId}`);
    return detail;
  }
}

// ---------------------------------------------------------------------------
// PROTOTYPE-LOGIC-COPY — brief-now-prototype.mjs, reimplemented faithfully.
// This IS the logic under test (there is no importable unit).
// ---------------------------------------------------------------------------

/**
 * PROTOTYPE-LOGIC-COPY (brief-now-prototype.mjs step 3, lines 32-38):
 * argv-less target resolution = newest summary atom by timestamp string sort.
 * NO freshness check, NO comparison against "now" — verbatim decision logic.
 */
async function prototypeSelectTarget(
  store: Storage,
  argvNoteId?: string,
): Promise<{ noteId: string | undefined; note: CaptureEvent | undefined; summaries: CaptureEvent[] }> {
  const summaries = (await store.query({ source: 'api:granola' }))
    .filter((e) => e.metadata?.['granola_atom_type'] === 'summary')
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const noteId = argvNoteId ?? (summaries[0]?.metadata?.['note_id'] as string | undefined);
  const note = summaries.find((e) => e.metadata?.['note_id'] === noteId);
  return { noteId, note, summaries };
}

/**
 * PROTOTYPE-LOGIC-COPY (brief-now-prototype.mjs steps 1-3, lines 17-38):
 * the poll result is console.error'd and NEVER gated (line 20) — neither
 * poll.status nor notes_ingested influences control flow; the ONLY abort in
 * the whole script is "note not found" (line 38, exit 1). Returns the process
 * exit code the prototype flow would produce.
 */
async function prototypeFlowExitCode(
  store: Storage,
  poll: GranolaPollResult,
  argvNoteId?: string,
): Promise<{ exitCode: number; noteId: string | undefined }> {
  // step 1: `console.error(`[poll] ...`)` — logged, not gated. (faithful: ignore `poll`)
  void poll;
  // step 2 (extraction) not exercised here; step 3:
  const { noteId, note } = await prototypeSelectTarget(store, argvNoteId);
  if (!note) return { exitCode: 1, noteId };
  return { exitCode: 0, noteId };
}

/**
 * PROTOTYPE-LOGIC-COPY (brief-now-prototype.mjs steps 2 + 4-6, lines 22-89):
 * extraction.status is console.error'd (line 29) and never checked; signals
 * are read across ALL runs and deduped by dedupe_key; the markdown render
 * emits `**Decided:**` / `**Actions:**` headers unconditionally — an
 * extraction failure with zero signal atoms yields a confident empty brief
 * indistinguishable from a genuine zero-decision meeting.
 */
async function prototypeCompileAndRender(
  store: Storage,
  extractionStatus: string,
  note: CaptureEvent,
): Promise<{ refused: boolean; markdown: string }> {
  // faithful: extraction status only logged, never gated
  void extractionStatus;
  const md5 = note.metadata as Record<string, unknown>;
  const noteId = md5['note_id'] as string;
  const signals = (await store.query({ source: GRANOLA_SIGNAL_SOURCE })).filter(
    (e) => e.metadata?.['note_id'] === noteId,
  );
  const seen = new Set<string>();
  const rows: Array<{ type: unknown; text: string }> = [];
  for (const s of signals) {
    const k = (s.metadata?.['dedupe_key'] as string | undefined) ?? s.id;
    if (seen.has(k)) continue;
    seen.add(k);
    rows.push({ type: s.metadata?.['signal_type'], text: s.content.trim() });
  }
  const owner =
    ((md5['owner'] as Record<string, unknown> | undefined)?.['name'] as string | undefined) ??
    ((md5['owner'] as Record<string, unknown> | undefined)?.['email'] as string | undefined) ??
    'unknown';
  const decided = rows.filter((r) => r.type === 'decision');
  const actions = rows.filter((r) => r.type === 'action');
  const d = new Date(md5['created_at'] as string);
  const markdown = [
    `**Recap — ${md5['title'] as string}** (${d.toISOString().slice(0, 10)})`,
    '',
    '**Decided:**',
    ...decided.map((x) => `- ${x.text}`),
    '',
    `**Actions (${owner}):**`,
    ...actions.map((x, i) => `${i + 1}. ${x.text}`),
    '',
    `_source: ${(md5['web_url'] as string | undefined) ?? noteId}_`,
  ].join('\n');
  // faithful: the prototype has no refusal path past "note not found".
  return { refused: false, markdown };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RC1 — brief target contract (131 AC1) [holdout confirmation]', () => {
  // CONFIRMS: Wrong-meeting targeting — argv-less brief-now silently briefs
  // the PREVIOUS meeting (stress-test §Targeting, top-5 #1) → 131 AC1
  it('argv-less fallback must reject a stale note (>30 min old) instead of silently selecting the previous meeting', async () => {
    // Two meetings in storage, BOTH stale relative to the injected now — the
    // live incident shape: today's meeting not yet published by Granola, so
    // "newest" is yesterday's advisor meeting.
    await seedSummaryAtom(storage, {
      noteId: 'note-two-days-ago',
      updatedAt: '2026-07-07T17:00:00.000Z',
      title: 'Advisor sync (two days ago)',
    });
    await seedSummaryAtom(storage, {
      noteId: 'note-previous-meeting',
      updatedAt: '2026-07-09T17:00:00.000Z', // 3h before NOW — outside the window
      title: 'Advisor sync (previous meeting)',
    });

    const { noteId, note } = await prototypeSelectTarget(storage);

    // Sanity on the fixture: the copy picks the newest stored summary.
    expect(noteId).toBe('note-previous-meeting');

    // AC1 contract: argv-less selection is valid ONLY if the selected note's
    // updated_at is within the freshness window (default 30 min) of now.
    // A selection of a 3h-old note must not happen — the flow must refuse.
    const selectedUpdatedAt = note?.metadata?.['updated_at'] as string | undefined;
    const satisfiesFreshnessContract =
      noteId === undefined ||
      (selectedUpdatedAt !== undefined &&
        NOW_MS - Date.parse(selectedUpdatedAt) <= FRESHNESS_WINDOW_MS);
    expect(
      satisfiesFreshnessContract,
      `argv-less targeting selected stale note "${noteId}" (updated_at=${selectedUpdatedAt}, ` +
        `age=${(NOW_MS - Date.parse(selectedUpdatedAt ?? NOW_ISO)) / 60_000}min) with no freshness gate — ` +
        'AC1 requires refusing any note older than the 30-min window in argv-less mode',
    ).toBe(true);
  });

  // CONFIRMS: Wrong-meeting targeting — poll.status/notes_ingested never
  // gated, retrying reinforces the wrong brief (stress-test §Targeting,
  // top-5 #1) → 131 AC1
  it('a poll that errors must abort the flow with a nonzero exit, even when a fresh note exists', async () => {
    // Fresh note already in storage (within the 30-min window) so the ONLY
    // AC1 gate violated here is the poll-status gate.
    await seedSummaryAtom(storage, {
      noteId: 'note-fresh',
      updatedAt: '2026-07-09T19:50:00.000Z',
    });

    const checkpointDir = tempDir('echo-holdout131-poll-cp-');
    const client = new FakeGranolaClient([new Error('Granola API request failed with HTTP 500')]);
    const poll = await pollGranolaOnce(storage, client, {
      checkpointPath: join(checkpointDir, 'granola-checkpoint.json'),
      retryDelayMs: 0,
      now: () => NOW_ISO,
    });

    // Precondition: the real poller genuinely reports an error result.
    expect(poll.status).toBe('error');

    const { exitCode } = await prototypeFlowExitCode(storage, poll);

    // AC1 contract: hard-fail (nonzero exit, stated reason) when the poll
    // errors. The prototype logs the error result and proceeds to brief
    // whatever note happens to be newest — possibly the wrong meeting.
    expect(
      exitCode,
      'flow proceeded to target selection (exit 0) despite poll.status="error" — ' +
        'AC1 requires nonzero exit when the poll errors',
    ).not.toBe(0);
  });

  // CONFIRMS: Wrong-meeting targeting — poll ok / notes_ingested 0 not
  // surfaced; the premature post-meeting run briefs yesterday's meeting
  // (stress-test §Targeting, top-5 #1; live incident bd6993b4) → 131 AC1
  it('poll ok with zero ingested notes and no fresh note in storage must abort, not brief the previous meeting', async () => {
    // Only a stale note exists — the "ran 2 min post-meeting, before Granola
    // published" flow. The poll succeeds but ingests nothing new.
    await seedSummaryAtom(storage, {
      noteId: 'note-previous-meeting',
      updatedAt: '2026-07-09T17:00:00.000Z',
    });

    const checkpointDir = tempDir('echo-holdout131-poll-cp-');
    const client = new FakeGranolaClient([{ notes: [], hasMore: false, cursor: null }]);
    const poll = await pollGranolaOnce(storage, client, {
      checkpointPath: join(checkpointDir, 'granola-checkpoint.json'),
      retryDelayMs: 0,
      now: () => NOW_ISO,
    });

    // Precondition: genuine ok/zero-ingest poll result from the real poller.
    if (poll.status !== 'ok') throw new Error(`fixture broke: poll.status=${poll.status}`);
    expect(poll.notes_ingested).toBe(0);

    const { exitCode, noteId } = await prototypeFlowExitCode(storage, poll);

    // AC1 contract: argv-less mode may proceed only with a fresh target.
    // Nothing fresh was ingested and the newest stored note is 3h old, so
    // the flow must exit nonzero instead of confidently briefing it.
    expect(
      exitCode,
      `flow exited 0 and targeted stale note "${noteId}" after a zero-ingest poll — ` +
        'AC1 requires hard-fail when no note satisfies the freshness window',
    ).not.toBe(0);
  });

  // CONFIRMS: Confident empty brief when extraction failed, was skipped, or
  // never reached the target note (stress-test top-5 #2) → 131 AC1
  it('a failed extraction with no current-run manifest must refuse to render, not emit a confident empty brief', async () => {
    const noteId = 'note-fresh-meeting';
    const updatedAt = '2026-07-09T19:50:00.000Z'; // fresh — freshness gate passes
    await seedSummaryAtom(storage, { noteId, updatedAt, title: 'Advisor sync (just ended)' });
    await seedTranscriptAtom(storage, { noteId, updatedAt, title: 'Advisor sync (just ended)' });

    // Real extraction worker run with a stub brain that fails — the f19d/
    // brain-blip class. Zero signal atoms, zero manifests for the note.
    const failingExtract: GranolaSignalExtractor = async () => {
      throw new Error('codex brain unavailable (stubbed failure)');
    };
    const checkpointDir = tempDir('echo-holdout131-sig-cp-');
    const extraction = await runGranolaSignalWorkerOnce(storage, failingExtract, {
      checkpointPath: join(checkpointDir, 'granola-signals-checkpoint.json'),
      settleMs: 0,
      maxRetries: 0,
      retryDelayMs: 0,
      now: () => NOW_ISO,
    });

    // Preconditions: extraction genuinely failed; no signals, no current-run
    // manifest exists for the target note.
    expect(extraction.status).toBe('error');
    const signalAtoms = (await storage.query({ source: GRANOLA_SIGNAL_SOURCE })).filter(
      (e) => e.metadata?.['note_id'] === noteId,
    );
    expect(signalAtoms).toHaveLength(0);
    const manifestEvents = await storage.query({ source: GRANOLA_SIGNAL_INDEX_SOURCE });
    expect(resolveCurrentGranolaSignalRuns(manifestEvents).has(noteId)).toBe(false);

    const { note } = await prototypeSelectTarget(storage);
    if (!note) throw new Error('fixture broke: target summary atom missing');

    const outcome = await prototypeCompileAndRender(storage, extraction.status, note);

    // Document the hazard shape (these pass — they ARE the bug): the render
    // is a confident brief with empty Decided/Actions sections.
    if (!outcome.refused) {
      expect(outcome.markdown).toContain('**Decided:**');
      expect(outcome.markdown).toContain('**Actions (');
      expect(outcome.markdown).not.toMatch(/^- /m); // no decided bullets
      expect(outcome.markdown).not.toMatch(/^1\. /m); // no action lines
    }

    // AC1 contract: hard-fail unless extraction completed 'ok' for the target
    // AND a current-run manifest exists for it; "No decisions recorded" may
    // render only from a SUCCESSFUL extraction that found zero signals.
    expect(
      outcome.refused,
      'brief rendered with empty Decided/Actions sections despite extraction.status="error" ' +
        'and no current-run manifest for the target note — AC1 requires refusing to render',
    ).toBe(true);
  });
});
