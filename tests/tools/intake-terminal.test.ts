import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildTerminalIntakeConfig,
  runIntakeTerminalOnce,
  signalTypeFromCandidateKey,
  startIntakeTerminalWatch,
} from '../../tools/intake-terminal.js';
import type {
  ClassifiedIntakeCandidate,
  GranolaIntakeClassificationInput,
} from '../../src/enrich/granola-intake-candidates.js';
import { FileGranolaIntakeSeedStore } from '../../src/enrich/granola-intake-seed-store.js';
import { MemoryStorage } from '../../src/storage/memory.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'echo-intake-terminal-'));
  tempDirs.push(dir);
  return dir;
}

const EMPTY_ENV: NodeJS.ProcessEnv = {};

async function seedRawNote(
  store: MemoryStorage,
  opts: { noteId: string; title?: string; webUrl?: string; attendees?: unknown; updatedAt?: string },
): Promise<void> {
  await store.append({
    source: 'api:granola',
    timestamp: opts.updatedAt ?? '2026-06-30T10:00:00.000Z',
    content: 'summary',
    metadata: {
      note_id: opts.noteId,
      title: opts.title ?? 'Client sync',
      updated_at: opts.updatedAt ?? '2026-06-30T10:00:00.000Z',
      granola_atom_type: 'summary',
      web_url: opts.webUrl,
      attendees: opts.attendees,
    },
  });
}

async function seedSignal(
  store: MemoryStorage,
  opts: {
    noteId: string;
    signalType: 'action' | 'decision';
    text: string;
    dedupeKey: string;
    quote?: string;
  },
): Promise<void> {
  await store.append({
    source: 'derived:granola-signals',
    timestamp: '2026-06-30T10:05:00.000Z',
    content: opts.text,
    metadata: {
      signal_type: opts.signalType,
      note_id: opts.noteId,
      dedupe_key: opts.dedupeKey,
      canonical_subject: 'topic',
      source_span:
        opts.quote === undefined
          ? { kind: 'summary' }
          : { kind: 'transcript', start_time: 1, end_time: 2, quote: opts.quote },
      confidence: 0.9,
    },
  });
}

/** Storage with one external-attendee note carrying one action signal. */
async function qualifyingStorage(dedupeKey: string): Promise<MemoryStorage> {
  const store = new MemoryStorage();
  await seedRawNote(store, {
    noteId: 'note-1',
    title: 'Acme roadmap',
    webUrl: 'https://granola.ai/notes/note-1',
    attendees: [{ email: 'client@acme.com' }, { email: 'me@echo.dev' }],
  });
  await seedSignal(store, {
    noteId: 'note-1',
    signalType: 'action',
    text: 'Add amendment alerts',
    dedupeKey,
    quote: 'We need amendment alerts.',
  });
  return store;
}

function collector(): { out: (line: string) => void; lines: string[] } {
  const lines: string[] = [];
  return { out: (line: string) => lines.push(line), lines };
}

function cardCount(lines: string[]): number {
  return lines.filter((line) => line.includes('INTAKE CANDIDATE')).length;
}

const stubClassify =
  (fields: ClassifiedIntakeCandidate['fields']) =>
  async (input: GranolaIntakeClassificationInput): Promise<ClassifiedIntakeCandidate[]> =>
    input.signals.map((signal) => ({ ref: signal.ref, fields }));

describe('renderIntakeCard / signalTypeFromCandidateKey', () => {
  it('derives the signal type from a granola dedupe key', () => {
    expect(signalTypeFromCandidateKey('granola:signal:note-1:v1:action:a1')).toBe('action');
    expect(signalTypeFromCandidateKey('granola:signal:note-1:v1:decision:d1')).toBe('decision');
    expect(signalTypeFromCandidateKey('nonsense')).toBe('unknown');
  });
});

describe('buildTerminalIntakeConfig', () => {
  it('needs no Slack env: enabled, sentinel channel, unused token, terminal owner fallback', () => {
    const config = buildTerminalIntakeConfig(EMPTY_ENV);
    expect(config.enabled).toBe(true);
    expect(config.channelId).toBe('terminal');
    expect(config.botToken).not.toBe('');
    expect(config.defaultOwner).toBe('terminal');
    expect(config.internalDomains).toEqual([]);
  });
});

describe('runIntakeTerminalOnce (AC6)', () => {
  it('AC6.1 — a qualifying signal produces exactly one card and one posted seed record', async () => {
    const dedupeKey = 'granola:signal:note-1:v1:action:a1';
    const store = await qualifyingStorage(dedupeKey);
    const seedStore = new FileGranolaIntakeSeedStore(join(await tempDir(), 'seeds.json'));
    const { out, lines } = collector();

    const code = await runIntakeTerminalOnce({
      storage: store,
      seedStorePath: 'unused-because-store-injected',
      seedStore,
      classify: stubClassify({ request: 'Add amendment alerts', clientProject: 'Acme' }),
      env: EMPTY_ENV,
      out,
      now: () => '2026-06-30T10:06:00.000Z',
    });

    expect(code).toBe(0);
    expect(cardCount(lines)).toBe(1);
    const joined = lines.join('\n');
    expect(joined).toContain('Acme roadmap');
    expect(joined).toContain('note-1');
    expect(joined).toContain('We need amendment alerts.');
    expect(joined).toContain(dedupeKey);
    expect(joined).toContain('action');

    const record = await seedStore.get(dedupeKey);
    expect(record?.status).toBe('posted');
    expect(record?.slack_ts).toBe('terminal-2026-06-30T10:06:00.000Z');
    expect(await seedStore.list()).toHaveLength(1);
  });

  it('AC6.2 — a re-run produces zero duplicate cards (state machine exercised)', async () => {
    const dedupeKey = 'granola:signal:note-1:v1:action:a1';
    const store = await qualifyingStorage(dedupeKey);
    const seedStore = new FileGranolaIntakeSeedStore(join(await tempDir(), 'seeds.json'));
    const classify = stubClassify({ request: 'Add amendment alerts' });

    const first = collector();
    const code1 = await runIntakeTerminalOnce({
      storage: store,
      seedStorePath: 'x',
      seedStore,
      classify,
      env: EMPTY_ENV,
      out: first.out,
      now: () => '2026-06-30T10:06:00.000Z',
    });
    expect(code1).toBe(0);
    expect(cardCount(first.lines)).toBe(1);

    const second = collector();
    const code2 = await runIntakeTerminalOnce({
      storage: store,
      seedStorePath: 'x',
      seedStore,
      classify,
      env: EMPTY_ENV,
      out: second.out,
      now: () => '2026-06-30T10:06:00.000Z',
    });
    expect(code2).toBe(0);
    expect(cardCount(second.lines)).toBe(0);
    expect(second.lines.join('\n')).toContain('1 skipped');
    expect(await seedStore.list()).toHaveLength(1);
  });

  it('AC6.3a — a classifier that throws is surfaced in the status line, no card, no crash', async () => {
    const store = await qualifyingStorage('granola:signal:note-1:v1:action:a1');
    const seedStore = new FileGranolaIntakeSeedStore(join(await tempDir(), 'seeds.json'));
    const { out, lines } = collector();

    const code = await runIntakeTerminalOnce({
      storage: store,
      seedStorePath: 'x',
      seedStore,
      classify: async () => {
        throw new Error('brain returned garbage');
      },
      env: EMPTY_ENV,
      out,
      now: () => '2026-06-30T10:06:00.000Z',
    });

    expect(code).toBe(0);
    expect(cardCount(lines)).toBe(0);
    expect(lines.join('\n')).toContain('1 classifier errors');
  });

  it('AC6.3b — a post/render failure follows the retry/failed path, visible in the status line', async () => {
    const dedupeKey = 'granola:signal:note-1:v1:action:a1';
    const store = await qualifyingStorage(dedupeKey);
    const seedStore = new FileGranolaIntakeSeedStore(join(await tempDir(), 'seeds.json'));
    const lines: string[] = [];
    // Fail only when rendering a card; still capture the status line.
    const out = (line: string): void => {
      if (line.includes('INTAKE CANDIDATE')) throw new Error('tty write failed');
      lines.push(line);
    };

    const code = await runIntakeTerminalOnce({
      storage: store,
      seedStorePath: 'x',
      seedStore,
      classify: stubClassify({ request: 'Add amendment alerts' }),
      env: EMPTY_ENV,
      out,
      now: () => '2026-06-30T10:06:00.000Z',
    });

    expect(code).toBe(0);
    expect(cardCount(lines)).toBe(0);
    expect(lines.join('\n')).toContain('1 failed');
    // markFailure ran: the seed is back to pending (retry_count 1 < maxRetries).
    const record = await seedStore.get(dedupeKey);
    expect(record?.retry_count).toBe(1);
    expect(record?.status).toBe('pending');
  });

  it('AC6.4 — an unwritable resolved seed-store path fails fast, nonzero exit, no card', async () => {
    const dir = await tempDir();
    const notADir = join(dir, 'a-file');
    await writeFile(notADir, 'x');
    const badPath = join(notADir, 'seeds.json'); // parent is a regular file
    const { out, lines } = collector();

    const code = await runIntakeTerminalOnce({
      storage: new MemoryStorage(),
      seedStorePath: badPath,
      // no seedStore injected → path validation runs
      classify: stubClassify({ request: 'x' }),
      env: EMPTY_ENV,
      out,
    });

    expect(code).toBe(1);
    expect(cardCount(lines)).toBe(0);
    expect(lines.join('\n').toLowerCase()).toMatch(/not (creatable|writable)/);
  });
});

describe('startIntakeTerminalWatch (AC6.5)', () => {
  it('prints a per-tick brain-unavailable skip line and never crashes', async () => {
    const store = await qualifyingStorage('granola:signal:note-1:v1:action:a1');
    const seedStore = new FileGranolaIntakeSeedStore(join(await tempDir(), 'seeds.json'));
    const { out, lines } = collector();

    const watch = await startIntakeTerminalWatch({
      storage: store,
      seedStorePath: 'x',
      seedStore,
      // Injected classifier would post a card if reached — it must be gated off.
      classify: stubClassify({ request: 'Add amendment alerts' }),
      preflight: async () => {
        throw new Error('codex --version not found');
      },
      env: EMPTY_ENV,
      out,
      runOnStart: false,
    });

    // Drive one deterministic tick.
    const result = await watch.handle.run();
    await watch.stop();

    expect(result.status).toBe('ok');
    expect(cardCount(lines)).toBe(0);
    expect(lines.join('\n')).toContain('brain unavailable');
  });
});
