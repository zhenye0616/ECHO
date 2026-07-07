import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildCardTrace,
  enumerateSeedStorePaths,
  runTraceCard,
  seedStorePathForChannel,
  type TraceInput,
} from '../../tools/trace-card.js';
import {
  GRANOLA_INTAKE_CARD_SOURCE,
  granolaIntakeSeedStorePath,
  type IntakeCardAtomMetadata,
} from '../../src/enrich/granola-intake-candidates.js';
import { TERMINAL_CHANNEL_SENTINEL, terminalSeedStorePath } from '../../tools/intake-terminal.js';
import { ECHO_HOME_PATHS, setEchoHomeRoot } from '../../src/echo-home/paths.js';
import { FileGranolaIntakeSeedStore } from '../../src/enrich/granola-intake-seed-store.js';
import type { ClassifierRunRecord } from '../../src/brain/brain.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import { SqliteStorage } from '../../src/storage/sqlite.js';

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'echo-trace-card-'));
  tempDirs.push(dir);
  return dir;
}

const KEY = 'granola:signal:note-1:v1:action:a1';
const OK_RUN: ClassifierRunRecord = {
  run_id: 'run-ok',
  binding: 'codex',
  started_at: 'a',
  completed_at: 'b',
  capture_status: 'ok',
  retrievals: [
    { tool: 'search_memories', input_summary: '{"query":"x"}', result_summary: 'content_items=2', at: 't1' },
  ],
};

async function appendSignal(store: MemoryStorage, key = KEY): Promise<void> {
  await store.append({
    source: 'derived:granola-signals',
    timestamp: '2026-06-30T10:05:00.000Z',
    content: 'Add amendment alerts',
    metadata: {
      signal_type: 'action',
      note_id: 'note-1',
      dedupe_key: key,
      canonical_subject: 'amendment alerts',
      parent_dedupe_key: 'granola:raw:note-1:summary',
      extraction_run_id: 'run-42',
      extractor_version: 'granola-signals@1',
      confidence: 0.9,
    },
  });
}

async function appendRaw(store: MemoryStorage): Promise<void> {
  await store.append({
    source: 'api:granola',
    timestamp: '2026-06-30T10:00:00.000Z',
    content: 'the full meeting summary text here',
    metadata: {
      note_id: 'note-1',
      title: 'Acme roadmap',
      web_url: 'https://granola.ai/notes/note-1',
      granola_atom_type: 'summary',
    },
  });
}

async function appendCard(
  store: MemoryStorage,
  run: ClassifierRunRecord,
  key = KEY,
  channelId = 'C-INTAKE',
): Promise<void> {
  const meta: IntakeCardAtomMetadata = {
    card_version: 1,
    dedupe_key: `granola:card:${key}`,
    candidate_key: key,
    note_id: 'note-1',
    channel_id: channelId,
    fields: { request: 'Add amendment alerts', clientProject: 'Acme' },
    signal_refs: [key],
    seed_status_at: '2026-06-30T10:06:00.000Z',
    slack_ts: 'ts-1',
    classifier_run: run,
  };
  await store.append({
    source: GRANOLA_INTAKE_CARD_SOURCE,
    timestamp: '2026-06-30T10:06:00.000Z',
    content: '*Meeting intake candidate*\nRequest: Add amendment alerts',
    metadata: meta as unknown as Record<string, unknown>,
  });
}

async function emptySeedStore(): Promise<FileGranolaIntakeSeedStore> {
  return new FileGranolaIntakeSeedStore(join(await tempDir(), 'seeds.json'));
}

function input(storage: MemoryStorage | null, seedStore: FileGranolaIntakeSeedStore): TraceInput {
  return { storage, seedStore, dbPathForMessages: '/nonexistent/echo.db' };
}

describe('buildCardTrace (item 123 AC3/AC5)', () => {
  it('renders the full chain card → run → signal → raw', async () => {
    const store = new MemoryStorage();
    await appendRaw(store);
    await appendSignal(store);
    await appendCard(store, OK_RUN);
    const trace = await buildCardTrace(input(store, await emptySeedStore()), { candidateKey: KEY });

    expect(trace).toContain(`card  ${KEY}`);
    expect(trace).not.toContain('PROVENANCE LOSS');
    expect(trace).toContain('capture: ok (1 retrieval)');
    expect(trace).toContain('search_memories @ t1');
    expect(trace).toContain(`signal ${KEY}: type=action`);
    expect(trace).toContain('extraction: run=run-42 extractor=granola-signals@1');
    expect(trace).toContain('raw api:granola');
    expect(trace).toContain('Acme roadmap');
  });

  it('renders the three capture states distinctly', async () => {
    const store = new MemoryStorage();
    await appendSignal(store);
    await appendCard(store, OK_RUN);
    await appendCard(store, {
      run_id: 'r0',
      binding: 'codex',
      started_at: 'a',
      completed_at: 'b',
      capture_status: 'zero_retrievals',
    }, 'key-zero');
    await appendCard(store, {
      run_id: 'rf',
      binding: 'codex',
      started_at: 'a',
      completed_at: 'b',
      capture_status: 'capture_failed',
      capture_error: 'proxy died',
    }, 'key-fail');

    const okTrace = await buildCardTrace(input(store, await emptySeedStore()), { candidateKey: KEY });
    const zeroTrace = await buildCardTrace(input(store, await emptySeedStore()), { candidateKey: 'key-zero' });
    const failTrace = await buildCardTrace(input(store, await emptySeedStore()), { candidateKey: 'key-fail' });
    expect(okTrace).toContain('capture: ok');
    expect(zeroTrace).toContain('capture: zero retrievals');
    expect(failTrace).toContain('capture: FAILED — proxy died');
  });

  it('flags a pre-123 card (no card atom) and still walks signal → raw', async () => {
    const store = new MemoryStorage();
    await appendRaw(store);
    await appendSignal(store);
    const seedStore = await emptySeedStore();
    await seedStore.claim({ candidateKey: KEY, noteId: 'note-1', channelId: 'C-INTAKE' });
    await seedStore.markPosting(KEY);
    await seedStore.markPosted(KEY, 'ts-legacy');

    const trace = await buildCardTrace(input(store, seedStore), { candidateKey: KEY });
    expect(trace).toContain('PROVENANCE LOSS: no card atom (pre-123 card, or provenance lost)');
    expect(trace).toContain(`signal ${KEY}: type=action`);
    expect(trace).toContain('raw api:granola');
    expect(trace).toContain('seed: status=posted');
  });

  it('reports a failed card_atom_status marker as provenance loss', async () => {
    const store = new MemoryStorage();
    await appendSignal(store);
    const seedStore = await emptySeedStore();
    await seedStore.claim({ candidateKey: KEY, noteId: 'note-1', channelId: 'C-INTAKE' });
    await seedStore.markPosting(KEY);
    await seedStore.markPosted(KEY, 'ts-1', { status: 'failed', error: 'disk full' });

    const trace = await buildCardTrace(input(store, seedStore), { candidateKey: KEY });
    expect(trace).toContain('PROVENANCE LOSS: card atom write FAILED at post time — disk full');
  });

  it('is fail-soft on a missing raw atom', async () => {
    const store = new MemoryStorage();
    await appendSignal(store);
    await appendCard(store, OK_RUN);
    const trace = await buildCardTrace(input(store, await emptySeedStore()), { candidateKey: KEY });
    expect(trace).toContain('raw (note note-1): (absent — no raw atom found)');
  });

  it('lists a note\'s cards in --note mode', async () => {
    const store = new MemoryStorage();
    await appendSignal(store);
    await appendCard(store, OK_RUN);
    const trace = await buildCardTrace(input(store, await emptySeedStore()), { noteId: 'note-1' });
    expect(trace).toContain('note  note-1');
    expect(trace).toContain(`card  ${KEY}`);
  });

  it('degrades gracefully when the db is absent (storage null)', async () => {
    const trace = await buildCardTrace(input(null, await emptySeedStore()), { candidateKey: KEY });
    expect(trace).toContain('PROVENANCE LOSS: no ECHO db at /nonexistent/echo.db');
  });
});

// ─── AC4: strictly read-only ─────────────────────────────────────────────────

function snapshotDir(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string): void => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else out.set(relative(dir, p), createHash('sha256').update(readFileSync(p)).digest('hex'));
    }
  };
  walk(dir);
  return out;
}

describe('trace-card strictly read-only (item 123 AC4)', () => {
  it('leaves the filesystem byte-identical and never creates a missing db', async () => {
    const scratch = await tempDir();
    const dbPath = join(scratch, 'echo.db'); // deliberately absent
    const seedPath = join(scratch, 'seeds.json'); // deliberately absent
    expect(existsSync(dbPath)).toBe(false);

    const before = snapshotDir(scratch);
    const lines: string[] = [];
    const code = await runTraceCard(
      [KEY, '--db', dbPath, '--seed-store', seedPath],
      {},
      { out: (l) => lines.push(l), err: (l) => lines.push(l) },
    );

    expect(code).toBe(0);
    // The db was NOT materialized by the existsSync-gated open.
    expect(existsSync(dbPath)).toBe(false);
    expect(existsSync(seedPath)).toBe(false);
    // And the scratch tree is byte-identical.
    expect([...snapshotDir(scratch).entries()].sort()).toEqual([...before.entries()].sort());
  });

  it('does not mutate a present db (no atoms added)', async () => {
    const scratch = await tempDir();
    const dbPath = join(scratch, 'echo.db');
    const seedPath = join(scratch, 'seeds.json');
    const seeded = new SqliteStorage(dbPath);
    await seeded.append({
      source: GRANOLA_INTAKE_CARD_SOURCE,
      timestamp: '2026-06-30T10:06:00.000Z',
      content: 'card',
      metadata: {
        card_version: 1,
        dedupe_key: `granola:card:${KEY}`,
        candidate_key: KEY,
        note_id: 'note-1',
        channel_id: 'C',
        fields: {},
        signal_refs: [KEY],
        seed_status_at: 't',
        slack_ts: 'ts',
        classifier_run: OK_RUN,
      },
    });
    const countBefore = await seeded.count();
    seeded.close();

    const code = await runTraceCard(
      [KEY, '--db', dbPath, '--seed-store', seedPath],
      {},
      { out: () => undefined, err: () => undefined },
    );
    expect(code).toBe(0);

    const reopened = new SqliteStorage(dbPath);
    expect(await reopened.count()).toBe(countBefore);
    reopened.close();
  });

  // AC5 (item 125): belt-and-braces complement to the absent-db case above —
  // a PRESENT echo.db must be byte-identical before and after a full trace.
  it('leaves a present echo.db byte-identical (SELECT-only read path)', async () => {
    const scratch = await tempDir();
    const dbPath = join(scratch, 'echo.db');
    const seedPath = join(scratch, 'seeds.json');
    const seeded = new SqliteStorage(dbPath);
    await seeded.append({
      source: GRANOLA_INTAKE_CARD_SOURCE,
      timestamp: '2026-06-30T10:06:00.000Z',
      content: 'card',
      metadata: {
        card_version: 1,
        dedupe_key: `granola:card:${KEY}`,
        candidate_key: KEY,
        note_id: 'note-1',
        channel_id: 'C',
        fields: {},
        signal_refs: [KEY],
        seed_status_at: 't',
        slack_ts: 'ts',
        classifier_run: OK_RUN,
      },
    });
    // Closing the only connection checkpoints the WAL into echo.db and removes
    // the -wal/-shm sidecars, so the main db file is fully materialized here.
    seeded.close();

    const hash = (p: string): string =>
      createHash('sha256').update(readFileSync(p)).digest('hex');
    const before = hash(dbPath);

    const code = await runTraceCard(
      [KEY, '--db', dbPath, '--seed-store', seedPath],
      {},
      { out: () => undefined, err: () => undefined },
    );
    expect(code).toBe(0);

    expect(hash(dbPath)).toBe(before);
  });
});

// ─── AC1 (item 125): channel-aware seed-store resolution ─────────────────────

describe('seed-store resolution by channel (item 125 AC1/AC4)', () => {
  it('maps the terminal sentinel to .terminal.json and other channels to default', () => {
    expect(seedStorePathForChannel(TERMINAL_CHANNEL_SENTINEL)).toBe(terminalSeedStorePath());
    expect(seedStorePathForChannel('C-REAL-SLACK')).toBe(granolaIntakeSeedStorePath());
    expect(seedStorePathForChannel(undefined)).toBe(granolaIntakeSeedStorePath());
    expect(enumerateSeedStorePaths()).toEqual([
      granolaIntakeSeedStorePath(),
      terminalSeedStorePath(),
    ]);
  });

  it('reads a terminal card\'s seed from the channel-resolved store, not the default', async () => {
    const store = new MemoryStorage();
    await appendSignal(store);
    await appendCard(store, OK_RUN, KEY, TERMINAL_CHANNEL_SENTINEL);

    const defaultStore = await emptySeedStore(); // deliberately has no record
    const terminalStore = await emptySeedStore();
    await terminalStore.claim({ candidateKey: KEY, noteId: 'note-1', channelId: TERMINAL_CHANNEL_SENTINEL });
    await terminalStore.markPosting(KEY);
    await terminalStore.markPosted(KEY, 'ts-terminal');

    const traceInput: TraceInput = {
      storage: store,
      seedStore: defaultStore,
      dbPathForMessages: '/nonexistent/echo.db',
      resolveSeedStore: (channelId) =>
        channelId === TERMINAL_CHANNEL_SENTINEL ? terminalStore : defaultStore,
      seedStores: [defaultStore, terminalStore],
    };
    const trace = await buildCardTrace(traceInput, { candidateKey: KEY });
    // Resolved from the terminal store — the default store would have rendered
    // the "(no seed record ...)" line (the live-trace bug).
    expect(trace).toContain('seed: status=posted');
    expect(trace).not.toContain('(no seed record for this candidate_key)');
  });

  it('fires the provenance-loss banner from a terminal-store failed marker', async () => {
    const store = new MemoryStorage();
    await appendSignal(store);
    await appendCard(store, OK_RUN, KEY, TERMINAL_CHANNEL_SENTINEL);

    const defaultStore = await emptySeedStore();
    const terminalStore = await emptySeedStore();
    await terminalStore.claim({ candidateKey: KEY, noteId: 'note-1', channelId: TERMINAL_CHANNEL_SENTINEL });
    await terminalStore.markPosting(KEY);
    await terminalStore.markPosted(KEY, 'ts-1', { status: 'failed', error: 'disk full' });

    const traceInput: TraceInput = {
      storage: store,
      seedStore: defaultStore,
      dbPathForMessages: '/nonexistent/echo.db',
      resolveSeedStore: (channelId) =>
        channelId === TERMINAL_CHANNEL_SENTINEL ? terminalStore : defaultStore,
      seedStores: [defaultStore, terminalStore],
    };
    const trace = await buildCardTrace(traceInput, { candidateKey: KEY });
    expect(trace).toContain('PROVENANCE LOSS: card atom write FAILED at post time — disk full');
  });

  it('runTraceCard resolves a terminal card end-to-end without --seed-store', async () => {
    const savedRoot = ECHO_HOME_PATHS.root;
    const home = await tempDir();
    try {
      setEchoHomeRoot(home);
      const dbPath = join(home, 'echo.db');
      const db = new SqliteStorage(dbPath);
      await db.append({
        source: GRANOLA_INTAKE_CARD_SOURCE,
        timestamp: '2026-06-30T10:06:00.000Z',
        content: 'terminal card',
        metadata: {
          card_version: 1,
          dedupe_key: `granola:card:${KEY}`,
          candidate_key: KEY,
          note_id: 'note-1',
          channel_id: TERMINAL_CHANNEL_SENTINEL,
          fields: {},
          signal_refs: [KEY],
          seed_status_at: 't',
          slack_ts: 'ts',
          classifier_run: OK_RUN,
        },
      });
      db.close();

      // Seed lives ONLY in the terminal store; the default store stays empty.
      const terminalStore = new FileGranolaIntakeSeedStore(terminalSeedStorePath());
      await terminalStore.claim({ candidateKey: KEY, noteId: 'note-1', channelId: TERMINAL_CHANNEL_SENTINEL });
      await terminalStore.markPosting(KEY);
      await terminalStore.markPosted(KEY, 'ts-terminal');

      const lines: string[] = [];
      const code = await runTraceCard(
        [KEY, '--db', dbPath],
        { ECHO_HOME: home },
        { out: (l) => lines.push(l), err: (l) => lines.push(l) },
      );
      expect(code).toBe(0);
      const out = lines.join('\n');
      expect(out).toContain('seed: status=posted');
      expect(out).not.toContain('(no seed record for this candidate_key)');
    } finally {
      setEchoHomeRoot(savedRoot);
    }
  });

  it('--note mode lists a terminal-only pre-123 note\'s seeds without an override', async () => {
    const store = new MemoryStorage(); // no card atoms
    const defaultStore = await emptySeedStore(); // empty
    const terminalStore = await emptySeedStore();
    await terminalStore.claim({ candidateKey: KEY, noteId: 'note-1', channelId: TERMINAL_CHANNEL_SENTINEL });

    const traceInput: TraceInput = {
      storage: store,
      seedStore: defaultStore,
      dbPathForMessages: '/nonexistent/echo.db',
      seedStores: [defaultStore, terminalStore],
    };
    const trace = await buildCardTrace(traceInput, { noteId: 'note-1' });
    expect(trace).toContain('seeds (no card atoms — from seed store):');
    expect(trace).toContain(`seed ${KEY}: status=pending`);
  });
});
