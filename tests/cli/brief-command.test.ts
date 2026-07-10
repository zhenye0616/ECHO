import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../../src/cli/index.js';
import { runBrief } from '../../src/cli/commands/brief.js';
import type {
  GranolaApiClient,
  GranolaListParams,
  GranolaListResponse,
  GranolaNoteDetail,
} from '../../src/capture/surfaces/granola-poller.js';
import type { GranolaExtractedSignal } from '../../src/enrich/granola-signals.js';
import { MemoryStorage } from '../../src/storage/memory.js';

class MockGranolaClient implements GranolaApiClient {
  readonly listCalls: GranolaListParams[] = [];

  constructor(
    private readonly listResponse: GranolaListResponse,
    private readonly details = new Map<string, GranolaNoteDetail>(),
  ) {}

  async listNotes(params: GranolaListParams): Promise<GranolaListResponse> {
    this.listCalls.push(params);
    return this.listResponse;
  }

  async getNote(noteId: string): Promise<GranolaNoteDetail> {
    const detail = this.details.get(noteId);
    if (detail === undefined) throw new Error(`unexpected detail: ${noteId}`);
    return detail;
  }
}

const dirs: string[] = [];

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  while (dirs.length > 0) rmSync(dirs.pop()!, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function noteDetail(id: string, updatedAt: string): GranolaNoteDetail {
  return {
    id,
    title: 'Advisor sync',
    created_at: '2026-07-09T22:00:00.000Z',
    updated_at: updatedAt,
    summary_markdown: 'We decided to ship the brief.',
    summary_text: 'We decided to ship the brief.',
    transcript: [
      { speaker: { name: 'Avery' }, start_time: 0, end_time: 1, text: 'Dana will send it.' },
    ],
    attendees: [{ name: 'Avery' }, { name: 'Dana' }],
    web_url: `https://granola.ai/notes/${id}`,
  };
}

function listOne(id: string, updatedAt: string): GranolaListResponse {
  return {
    notes: [
      { id, title: 'Advisor sync', created_at: '2026-07-09T22:00:00.000Z', updated_at: updatedAt },
    ],
    hasMore: false,
    cursor: null,
  };
}

async function seedRaw(store: MemoryStorage, id: string, updatedAt: string): Promise<void> {
  const detail = noteDetail(id, updatedAt);
  await store.append({
    source: 'api:granola',
    timestamp: updatedAt,
    content: detail.summary_markdown!,
    metadata: {
      note_id: id,
      title: detail.title,
      created_at: detail.created_at,
      updated_at: updatedAt,
      attendees: detail.attendees,
      web_url: detail.web_url,
      granola_atom_type: 'summary',
      dedupe_key: `granola:${id}:summary`,
    },
  });
  await store.append({
    source: 'api:granola',
    timestamp: updatedAt,
    content: 'Avery: Dana will send it.',
    metadata: {
      note_id: id,
      title: detail.title,
      created_at: detail.created_at,
      updated_at: updatedAt,
      attendees: detail.attendees,
      web_url: detail.web_url,
      granola_atom_type: 'transcript',
      dedupe_key: `granola:${id}:transcript`,
    },
  });
}

function extractedSignals(): GranolaExtractedSignal[] {
  return [
    {
      signal_type: 'decision',
      text: 'Ship the brief.',
      canonical_subject: 'brief',
      source_span: { kind: 'summary' },
      confidence: 0.9,
      decision_status: 'decided',
    },
    {
      signal_type: 'action',
      text: 'Dana will send it.',
      canonical_subject: 'brief',
      source_span: { kind: 'summary' },
      confidence: 0.9,
      owner: 'Dana',
    },
  ];
}

describe('echoctl brief', () => {
  it('polls, extracts, writes canonical JSON plus markdown, and prints review banner', async () => {
    const outDir = tempDir('echo-brief-out-');
    const cpDir = tempDir('echo-brief-cp-');
    const store = new MemoryStorage();
    const client = new MockGranolaClient(
      listOne('note-1', '2026-07-09T22:05:00.000Z'),
      new Map([['note-1', noteDetail('note-1', '2026-07-09T22:05:00.000Z')]]),
    );
    let stdout = '';
    let stderr = '';

    const code = await runBrief({
      argv: ['--note', 'note-1', '--out-dir', outDir],
      storage: store,
      client,
      extractFn: async () => extractedSignals(),
      pollCheckpointPath: join(cpDir, 'granola.json'),
      signalCheckpointPath: join(cpDir, 'signals.json'),
      now: () => new Date('2026-07-09T22:06:00.000Z'),
      stdout: { write: (chunk) => ((stdout += String(chunk)), true) },
      stderr: { write: (chunk) => ((stderr += String(chunk)), true) },
    });

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('**REVIEW BEFORE SENDING**');
    expect(existsSync(join(outDir, 'brief-note-1.json'))).toBe(true);
    expect(existsSync(join(outDir, 'brief-note-1.md'))).toBe(true);
    const json = JSON.parse(readFileSync(join(outDir, 'brief-note-1.json'), 'utf8')) as {
      meeting: { source: { note_id: string } };
      actions: Array<{ owner: string }>;
      carryover: unknown[];
    };
    expect(json.meeting.source.note_id).toBe('note-1');
    expect(json.actions[0]?.owner).toBe('Dana');
    expect(json.carryover).toEqual([]);
  });

  it('fails argv-less mode when newest stored note is outside the freshness window', async () => {
    const cpDir = tempDir('echo-brief-stale-');
    const store = new MemoryStorage();
    await seedRaw(store, 'old-note', '2026-07-09T20:00:00.000Z');
    let stderr = '';

    const code = await runBrief({
      argv: [],
      storage: store,
      client: new MockGranolaClient({ notes: [], hasMore: false, cursor: null }),
      pollCheckpointPath: join(cpDir, 'granola.json'),
      signalCheckpointPath: join(cpDir, 'signals.json'),
      now: () => new Date('2026-07-09T22:00:00.000Z'),
      stderr: { write: (chunk) => ((stderr += String(chunk)), true) },
      stdout: { write: () => true },
    });

    expect(code).toBe(1);
    expect(stderr).toContain('outside freshness window');
  });

  it('--force clears a target note failure entry before extraction', async () => {
    const outDir = tempDir('echo-brief-force-out-');
    const cpDir = tempDir('echo-brief-force-cp-');
    const signalCheckpointPath = join(cpDir, 'signals.json');
    const store = new MemoryStorage();
    await seedRaw(store, 'note-force', '2026-07-09T22:05:00.000Z');
    writeFileSync(
      signalCheckpointPath,
      `${JSON.stringify(
        {
          schema_version: 1,
          notes: {
            'note-force': {
              input_fingerprint: 'stale',
              extractor_version: 'granola-signals@1',
              last_attempted_at: '2026-07-09T22:00:00.000Z',
              last_failure_at: '2026-07-09T22:00:00.000Z',
              retry_after_at: '2026-07-10T22:00:00.000Z',
              failure_attempts: 1,
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    const code = await runBrief({
      argv: ['--note', 'note-force', '--force', '--out-dir', outDir],
      storage: store,
      client: new MockGranolaClient({ notes: [], hasMore: false, cursor: null }),
      extractFn: async () => extractedSignals(),
      pollCheckpointPath: join(cpDir, 'granola.json'),
      signalCheckpointPath,
      now: () => new Date('2026-07-09T22:06:00.000Z'),
      stdout: { write: () => true },
      stderr: { write: () => true },
    });

    expect(code).toBe(0);
    expect(readFileSync(join(outDir, 'brief-note-force.md'), 'utf8')).toContain(
      'Dana will send it',
    );
  });

  it('registers brief help in the top-level CLI', async () => {
    let stdout = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      stdout += String(chunk);
      return true;
    });

    const code = await main(['brief', '--help']);

    expect(code).toBe(0);
    expect(stdout).toContain('Usage: echoctl brief');
  });
});
