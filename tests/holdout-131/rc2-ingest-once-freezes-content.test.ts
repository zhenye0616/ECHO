/**
 * HOLDOUT CONFIRMATION SUITE — item 131, RC2 (ingest-once freezes content).
 *
 * Red-first tests: each asserts the CORRECT behavior per spec item 131 AC2
 * (backlog/proposed/2026-07-10-131-post-meeting-brief-generator-v0.md), so it
 * FAILS against today's code — confirming the stress-test finding is real —
 * and passes once the AC2 fix lands.
 *
 * Finding under confirmation (raw/internal/decisions/2026-07-10-brief-path-stress-test.md):
 *   "#3 — Content freeze at first ingest: partial mid-meeting note locked in
 *   forever." granola-poller.ts:632 never re-fetches an already-ingested id,
 *   and the extraction fingerprint (granola-signals.ts:391-395) hashes only
 *   frozen inputs (note_id / updated_at / dedupe keys — no content), so late
 *   decisions and post-send corrections can never enter ECHO.
 */
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
} from '../../src/capture/surfaces/granola-poller.js';
import {
  runGranolaSignalWorkerOnce,
  type GranolaExtractedSignal,
  type GranolaSignalExtractionInput,
} from '../../src/enrich/granola-signals.js';
import { SqliteStorage } from '../../src/storage/sqlite.js';

// ---------------------------------------------------------------------------
// Fixtures (patterned on tests/capture/granola-poller.test.ts and
// tests/enrich/granola-signals.test.ts — fake API client, temp dirs, injected
// now(), temp SqliteStorage; no production state is touched anywhere).
// ---------------------------------------------------------------------------

class FakeGranolaClient implements GranolaApiClient {
  readonly listCalls: GranolaListParams[] = [];
  readonly detailCalls: string[] = [];

  constructor(
    private readonly list: GranolaListResponse,
    private readonly details: Map<string, GranolaNoteDetail>,
  ) {}

  async listNotes(params: GranolaListParams): Promise<GranolaListResponse> {
    this.listCalls.push(params);
    return this.list;
  }

  async getNote(noteId: string): Promise<GranolaNoteDetail> {
    this.detailCalls.push(noteId);
    const detail = this.details.get(noteId);
    if (detail === undefined) throw new Error(`unexpected getNote call: ${noteId}`);
    return detail;
  }
}

function noteDetail(opts: {
  id: string;
  updatedAt: string;
  summary: string;
  transcriptText: string;
}): GranolaNoteDetail {
  return {
    id: opts.id,
    title: `Advisor sync ${opts.id}`,
    created_at: '2026-07-09T10:00:00.000Z',
    updated_at: opts.updatedAt,
    summary_markdown: opts.summary,
    summary_text: opts.summary,
    transcript: [
      { speaker: { name: 'Avery' }, start_time: 0, end_time: 4, text: opts.transcriptText },
    ],
    attendees: [{ name: 'Avery' }],
    web_url: `https://granola.ai/notes/${opts.id}`,
  };
}

function listResponseFor(id: string, updatedAt: string): GranolaListResponse {
  return {
    notes: [
      {
        id,
        title: `Advisor sync ${id}`,
        created_at: '2026-07-09T10:00:00.000Z',
        updated_at: updatedAt,
      },
    ],
    hasMore: false,
    cursor: null,
  };
}

let tempDirs: string[] = [];

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

beforeEach(() => {
  // Repoint ECHO_HOME at a fresh temp so no default-path write (heartbeats,
  // checkpoints) can ever land in the real ~/.echo/state.
  setEchoHomeRoot(tempDir('echo-holdout-131-home-'));
});

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('holdout 131 / RC2 — ingest-once freezes content', () => {
  // CONFIRMS: Content freeze at first ingest: partial mid-meeting note locked
  // in forever (stress-test §Top-5 #3 / §Targeting — poller leg,
  // granola-poller.ts:632 skips already-ingested ids) → 131 AC2
  it('poller re-ingests a superseding atom when the API reports a newer updated_at with revised content', async () => {
    const dir = tempDir('echo-holdout-131-poller-');
    const checkpointPath = join(dir, 'granola-checkpoint.json');
    const storage = new SqliteStorage(join(dir, 'test.db'));

    const noteId = 'note-frozen';
    const v1UpdatedAt = '2026-07-09T10:05:00.000Z'; // mid-meeting partial snapshot
    const v2UpdatedAt = '2026-07-09T10:45:00.000Z'; // Granola's post-meeting revision

    // Poll 1: ingest the partial mid-meeting note (the settleMs:0 / early-run
    // scenario — note captured at maximum incompleteness).
    const v1Client = new FakeGranolaClient(
      listResponseFor(noteId, v1UpdatedAt),
      new Map([
        [
          noteId,
          noteDetail({
            id: noteId,
            updatedAt: v1UpdatedAt,
            summary: 'PARTIAL: discussion in progress, no decisions yet.',
            transcriptText: 'We are still discussing the pilot scope.',
          }),
        ],
      ]),
    );
    const first = await pollGranolaOnce(storage, v1Client, {
      checkpointPath,
      retryDelayMs: 0,
      now: () => '2026-07-09T10:06:00.000Z',
    });
    expect(first).toMatchObject({ status: 'ok', notes_ingested: 1 });

    // Poll 2: the API now reports the SAME note id with a newer updated_at and
    // revised content (the late decision that landed after the first snapshot).
    const v2Client = new FakeGranolaClient(
      listResponseFor(noteId, v2UpdatedAt),
      new Map([
        [
          noteId,
          noteDetail({
            id: noteId,
            updatedAt: v2UpdatedAt,
            summary: 'REVISED: we decided to ship the recap pilot to CEO P. this week.',
            transcriptText: 'Decision: ship the recap pilot to CEO P. this week.',
          }),
        ],
      ]),
    );
    const second = await pollGranolaOnce(storage, v2Client, {
      checkpointPath,
      retryDelayMs: 0,
      now: () => '2026-07-09T10:46:00.000Z',
    });
    expect(second.status).toBe('ok');

    const atoms = await storage.query({ source: 'api:granola', order: 'asc' });
    const summaries = atoms.filter(
      (a) => a.metadata?.['note_id'] === noteId && a.metadata?.['granola_atom_type'] === 'summary',
    );

    // Append-only: the original v1 snapshot must still exist untouched…
    expect(summaries.some((a) => a.content.includes('PARTIAL: discussion in progress'))).toBe(true);

    // …and AC2 requires a SUPERSEDING atom carrying the revised content once
    // the API's live updated_at is newer than the stored atom's. Today the
    // poller's ingested_note_ids skip (granola-poller.ts:632) freezes the note
    // at first sight, so no revised atom is ever written → this fails (red).
    expect(
      summaries.some((a) => a.content.includes('REVISED: we decided to ship the recap pilot')),
      'expected a superseding summary atom with the revised content after re-poll (131 AC2)',
    ).toBe(true);
  });

  // CONFIRMS: Content freeze at first ingest — extraction-fingerprint leg:
  // fingerprint hashes only frozen inputs (note_id/updated_at/dedupe keys, no
  // content hash; granola-signals.ts:391-395), so revised content with the
  // same updated_at can never re-extract (stress-test §Top-5 #3) → 131 AC2
  it('extraction fingerprint incorporates a content hash: same updated_at, revised content must re-extract', async () => {
    const dir = tempDir('echo-holdout-131-signals-');
    const checkpointPath = join(dir, 'granola-signals-checkpoint.json');
    const storage = new SqliteStorage(join(dir, 'test.db'));

    const noteId = 'note-revised';
    const updatedAt = '2026-07-09T10:05:00.000Z'; // deliberately identical across v1 and v2

    async function appendRawPair(summary: string, transcript: string): Promise<void> {
      await storage.append({
        source: 'api:granola',
        timestamp: updatedAt,
        content: summary,
        metadata: {
          note_id: noteId,
          title: 'Advisor sync',
          updated_at: updatedAt,
          granola_atom_type: 'summary',
          dedupe_key: `granola:${noteId}:summary`,
        },
      });
      await storage.append({
        source: 'api:granola',
        timestamp: updatedAt,
        content: transcript,
        metadata: {
          note_id: noteId,
          title: 'Advisor sync',
          updated_at: updatedAt,
          granola_atom_type: 'transcript',
          dedupe_key: `granola:${noteId}:transcript`,
        },
      });
    }

    const extractionInputs: GranolaSignalExtractionInput[] = [];
    const extractFn = async (
      input: GranolaSignalExtractionInput,
    ): Promise<GranolaExtractedSignal[]> => {
      extractionInputs.push(input);
      return [
        {
          signal_type: 'decision',
          text: `Decision extracted from: ${input.summary_text.slice(0, 40)}`,
          canonical_subject: 'recap pilot',
          source_span: { kind: 'summary' },
          confidence: 0.9,
          decision_status: 'decided',
        },
      ];
    };

    // Run 1: extract the v1 (partial) content.
    await appendRawPair(
      'PARTIAL: discussion in progress, no decisions yet.',
      '[0-4] Avery: We are still discussing the pilot scope.',
    );
    const first = await runGranolaSignalWorkerOnce(storage, extractFn, {
      checkpointPath,
      settleMs: 0,
      retryDelayMs: 0,
      now: () => '2026-07-09T11:00:00.000Z',
    });
    expect(first).toMatchObject({ status: 'ok', notes_extracted: 1 });
    expect(extractionInputs).toHaveLength(1);

    // Simulate a future re-ingest: append superseding raw atoms for the SAME
    // note with the SAME updated_at but REVISED content (this is exactly the
    // frozen-partial → later-revised scenario AC2's test is required to drive;
    // it isolates the fingerprint claim from the poller fix above — nothing
    // that only re-extracts on a changed updated_at may pass).
    await appendRawPair(
      'REVISED: we decided to ship the recap pilot to CEO P. this week.',
      '[0-4] Avery: Decision: ship the recap pilot to CEO P. this week.',
    );
    const second = await runGranolaSignalWorkerOnce(storage, extractFn, {
      checkpointPath,
      settleMs: 0,
      retryDelayMs: 0,
      now: () => '2026-07-09T12:00:00.000Z',
    });
    expect(second.status).toBe('ok');

    // AC2: "the extraction fingerprint incorporates a content hash so revised
    // content re-extracts." Today inputFingerprint() hashes only
    // note_id + updated_at + dedupe keys — all unchanged here — so
    // shouldExtractNote() skips the note and notes_extracted stays 0 → red.
    expect(
      second,
      'expected the revised content (same updated_at) to re-extract (131 AC2 content-hash fingerprint)',
    ).toMatchObject({ status: 'ok', notes_extracted: 1 });
    expect(
      extractionInputs.length,
      'expected a second extraction call carrying the revised content',
    ).toBe(2);
    expect(extractionInputs[1]?.summary_text).toContain('REVISED');
  });
});
