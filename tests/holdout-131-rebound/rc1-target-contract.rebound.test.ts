// REBOUND holdout — item 131 RC1 (target contract, AC1).
// Same scenarios/assertion-semantics as tests/holdout-131/rc1-target-contract.test.ts,
// but bound to the SHIPPED units: resolvePostMeetingBriefTarget (freshness gate)
// and runBrief (the real CLI flow — poll gate, extraction gate, refusal),
// instead of the prototype-logic-copy.

import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setEchoHomeRoot } from '../../src/echo-home/paths.js';
import type {
  GranolaApiClient,
  GranolaListParams,
  GranolaListResponse,
  GranolaNoteDetail,
} from '../../src/capture/surfaces/granola-poller.js';
import {
  PostMeetingBriefError,
  resolvePostMeetingBriefTarget,
} from '../../src/enrich/post-meeting-brief.js';
import { runBrief } from '../../src/cli/commands/brief.js';
import type { GranolaSignalExtractor } from '../../src/enrich/granola-signals.js';
import { SqliteStorage } from '../../src/storage/sqlite.js';
import type { Storage } from '../../src/storage/interface.js';

const NOW_ISO = '2026-07-09T20:00:00.000Z';
const FRESHNESS_MS = 30 * 60_000;

const tempDirs: string[] = [];
function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

let storage: SqliteStorage;

beforeEach(() => {
  setEchoHomeRoot(tempDir('echo-holdout131-rebound-home-'));
  storage = new SqliteStorage(join(tempDir('echo-holdout131-rebound-db-'), 'test.db'));
});

afterEach(() => {
  storage.close();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

async function seedSummaryAtom(
  store: Storage,
  opts: { noteId: string; updatedAt: string; title?: string },
): Promise<void> {
  await store.append({
    source: 'api:granola',
    timestamp: opts.updatedAt,
    content: `## ${opts.title ?? `Meeting ${opts.noteId}`}\n\nSummary body.`,
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

async function seedTranscriptAtom(
  store: Storage,
  opts: { noteId: string; updatedAt: string; title?: string },
): Promise<void> {
  await store.append({
    source: 'api:granola',
    timestamp: opts.updatedAt,
    content: '[10-20] Zhen: We decided to move the pilot to Slack-only.',
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

function sink(): { write: (s: string) => boolean } {
  return { write: () => true };
}

interface RunHarness {
  client: GranolaApiClient;
  extractFn?: GranolaSignalExtractor;
  outDir: string;
}

async function runBriefFlow(h: RunHarness): Promise<number> {
  const cpDir = tempDir('echo-holdout131-rebound-cp-');
  return runBrief({
    argv: [],
    quiet: true,
    stdout: sink(),
    stderr: sink(),
    env: {},
    now: () => new Date(NOW_ISO),
    storage,
    client: h.client,
    extractFn: h.extractFn,
    outDir: h.outDir,
    pollCheckpointPath: join(cpDir, 'granola-checkpoint.json'),
    signalCheckpointPath: join(cpDir, 'granola-signals-checkpoint.json'),
  });
}

describe('holdout-131 RC1 [rebound] — brief target contract (AC1)', () => {
  it('argv-less fallback rejects a stale note (>30 min old) instead of silently selecting the previous meeting', async () => {
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

    // AC1: argv-less selection is valid only within the freshness window.
    await expect(
      resolvePostMeetingBriefTarget(storage, {
        now: new Date(NOW_ISO),
        freshnessMs: FRESHNESS_MS,
      }),
    ).rejects.toBeInstanceOf(PostMeetingBriefError);
  });

  it('a poll that errors aborts the flow with a nonzero exit, even when a fresh note exists', async () => {
    await seedSummaryAtom(storage, {
      noteId: 'note-fresh',
      updatedAt: '2026-07-09T19:50:00.000Z',
    });
    const exit = await runBriefFlow({
      client: new FakeGranolaClient([new Error('Granola API request failed with HTTP 500')]),
      outDir: tempDir('echo-holdout131-rebound-out-'),
    });
    // AC1: hard-fail (nonzero exit) when the poll errors.
    expect(exit).not.toBe(0);
  });

  it('poll ok with zero ingested notes and no fresh note in storage aborts, not brief the previous meeting', async () => {
    await seedSummaryAtom(storage, {
      noteId: 'note-previous-meeting',
      updatedAt: '2026-07-09T17:00:00.000Z', // 3h stale
    });
    const exit = await runBriefFlow({
      client: new FakeGranolaClient([{ notes: [], hasMore: false, cursor: null }]),
      outDir: tempDir('echo-holdout131-rebound-out-'),
    });
    // AC1: argv-less mode may proceed only with a fresh target.
    expect(exit).not.toBe(0);
  });

  it('a failed extraction with no current-run manifest refuses to render, not emit a confident empty brief', async () => {
    const noteId = 'note-fresh-meeting';
    const updatedAt = '2026-07-09T19:50:00.000Z'; // fresh — freshness gate passes
    await seedSummaryAtom(storage, { noteId, updatedAt, title: 'Advisor sync (just ended)' });
    await seedTranscriptAtom(storage, { noteId, updatedAt, title: 'Advisor sync (just ended)' });

    const outDir = tempDir('echo-holdout131-rebound-out-');
    const failingExtract: GranolaSignalExtractor = async () => {
      throw new Error('codex brain unavailable (stubbed failure)');
    };
    const exit = await runBriefFlow({
      client: new FakeGranolaClient([{ notes: [], hasMore: false, cursor: null }]),
      extractFn: failingExtract,
      outDir,
    });

    // AC1: hard-fail unless extraction completed 'ok' AND a current-run manifest
    // exists; no confident empty brief is written.
    expect(exit).not.toBe(0);
    expect(existsSync(join(outDir, `brief-${noteId}.json`))).toBe(false);
    expect(existsSync(join(outDir, `brief-${noteId}.md`))).toBe(false);
  });
});
