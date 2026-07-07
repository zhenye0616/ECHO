import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  GRANOLA_INTAKE_CARD_SOURCE,
  runGranolaIntakeBridgeOnce,
  type ClassifiedIntakeResult,
  type GranolaIntakeClassificationInput,
  type GranolaIntakeConfig,
  type IntakeCardAtomMetadata,
} from '../../src/enrich/granola-intake-candidates.js';
import { FileGranolaIntakeSeedStore } from '../../src/enrich/granola-intake-seed-store.js';
import type { ClassifierRunRecord } from '../../src/brain/brain.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import type { CaptureEvent, EventId } from '../../src/storage/interface.js';

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempSeedStore(): Promise<FileGranolaIntakeSeedStore> {
  const dir = await mkdtemp(join(tmpdir(), 'echo-card-atom-'));
  tempDirs.push(dir);
  return new FileGranolaIntakeSeedStore(join(dir, 'seeds.json'));
}

function baseConfig(): GranolaIntakeConfig {
  return {
    enabled: true,
    lookbackMs: 30 * 24 * 60 * 60 * 1000,
    internalDomains: ['echo.dev'],
    ownerMap: { 'me@echo.dev': 'UOWNER' },
    defaultOwner: 'UDEFAULT',
    channelId: 'C-INTAKE',
    botToken: 'xoxb-token',
    perNoteCap: 3,
    maxRetries: 5,
  };
}

const CANDIDATE_KEY = 'granola:signal:note-1:v1:action:a1';

async function seedNoteAndSignal(store: MemoryStorage): Promise<void> {
  await store.append({
    source: 'api:granola',
    timestamp: '2026-06-30T10:00:00.000Z',
    content: 'summary text',
    metadata: {
      note_id: 'note-1',
      title: 'Acme roadmap',
      updated_at: '2026-06-30T10:00:00.000Z',
      granola_atom_type: 'summary',
      web_url: 'https://granola.ai/notes/note-1',
      attendees: [{ email: 'client@acme.com' }, { email: 'me@echo.dev' }],
    },
  });
  await store.append({
    source: 'derived:granola-signals',
    timestamp: '2026-06-30T10:05:00.000Z',
    content: 'Add amendment alerts',
    metadata: {
      signal_type: 'action',
      note_id: 'note-1',
      dedupe_key: CANDIDATE_KEY,
      canonical_subject: 'amendment alerts',
      parent_dedupe_key: 'granola:raw:note-1:summary',
      extraction_run_id: 'run-42',
      extractor_version: 'granola-signals@1',
      source_span: { kind: 'transcript', start_time: 1, end_time: 2, quote: 'We need amendment alerts.' },
      confidence: 0.9,
    },
  });
}

function classifierReturning(run: ClassifierRunRecord) {
  return async (input: GranolaIntakeClassificationInput): Promise<ClassifiedIntakeResult> => ({
    candidates: input.signals.map((s) => ({
      ref: s.ref,
      fields: { request: 'Add amendment alerts', clientProject: 'Acme' },
    })),
    run,
  });
}

const OK_RUN: ClassifierRunRecord = {
  run_id: 'run-ok',
  binding: 'codex',
  started_at: '2026-06-30T10:04:00.000Z',
  completed_at: '2026-06-30T10:04:30.000Z',
  capture_status: 'ok',
  retrievals: [
    { tool: 'search_memories', input_summary: '{"query":"amendment"}', result_summary: 'content_items=2', at: '2026-06-30T10:04:10.000Z' },
  ],
};

describe('card provenance atom (item 123 AC1)', () => {
  it('appends a card atom carrying fields, refs, and the classifier run', async () => {
    const store = new MemoryStorage();
    await seedNoteAndSignal(store);
    const seedStore = await tempSeedStore();

    const result = await runGranolaIntakeBridgeOnce(store, seedStore, baseConfig(), {
      classify: classifierReturning(OK_RUN),
      postSeed: async () => ({ ts: 'ts-1' }),
    });

    expect(result).toMatchObject({ status: 'ok', posted: 1 });
    const cards = await store.query({ source: GRANOLA_INTAKE_CARD_SOURCE });
    expect(cards).toHaveLength(1);
    const card = cards[0]!;
    expect(card.content).toContain('*Meeting intake candidate*');
    expect(card.content).toContain('[echo-intake-seed v1 ');
    const meta = card.metadata as unknown as IntakeCardAtomMetadata;
    expect(meta.candidate_key).toBe(CANDIDATE_KEY);
    expect(meta.dedupe_key).toBe(`granola:card:${CANDIDATE_KEY}`);
    expect(meta.note_id).toBe('note-1');
    expect(meta.channel_id).toBe('C-INTAKE');
    expect(meta.signal_refs).toEqual([CANDIDATE_KEY]);
    expect(meta.slack_ts).toBe('ts-1');
    expect(meta.fields).toMatchObject({ request: 'Add amendment alerts', clientProject: 'Acme' });
    expect(meta.classifier_run).toMatchObject({ run_id: 'run-ok', capture_status: 'ok' });
    expect(meta.classifier_run.retrievals).toHaveLength(1);

    const record = await seedStore.get(CANDIDATE_KEY);
    expect(record?.card_atom_status).toBe('written');
  });

  it('is idempotent under a re-post (no second card atom)', async () => {
    const store = new MemoryStorage();
    await seedNoteAndSignal(store);
    const seedStore = await tempSeedStore();
    const deps = {
      classify: classifierReturning(OK_RUN),
      postSeed: async () => ({ ts: 'ts-1' }),
    };

    await runGranolaIntakeBridgeOnce(store, seedStore, baseConfig(), deps);
    const second = await runGranolaIntakeBridgeOnce(store, seedStore, baseConfig(), deps);

    expect(second).toMatchObject({ posted: 0, skipped: 1 });
    const cards = await store.query({ source: GRANOLA_INTAKE_CARD_SOURCE });
    expect(cards).toHaveLength(1);
  });

  it('persists each of the three capture states distinctly', async () => {
    const runs: ClassifierRunRecord[] = [
      OK_RUN,
      { run_id: 'run-zero', binding: 'codex', started_at: 'a', completed_at: 'b', capture_status: 'zero_retrievals' },
      {
        run_id: 'run-fail',
        binding: 'codex',
        started_at: 'a',
        completed_at: 'b',
        capture_status: 'capture_failed',
        capture_error: 'proxy died',
      },
    ];
    for (const run of runs) {
      const store = new MemoryStorage();
      await seedNoteAndSignal(store);
      const seedStore = await tempSeedStore();
      await runGranolaIntakeBridgeOnce(store, seedStore, baseConfig(), {
        classify: classifierReturning(run),
        postSeed: async () => ({ ts: 'ts' }),
      });
      const cards = await store.query({ source: GRANOLA_INTAKE_CARD_SOURCE });
      const cr = (cards[0]!.metadata as unknown as IntakeCardAtomMetadata).classifier_run;
      expect(cr.capture_status).toBe(run.capture_status);
      if (run.capture_status === 'capture_failed') expect(cr.capture_error).toBe('proxy died');
    }
  });

  it('does not silently mask a card-atom write failure', async () => {
    // A storage whose card-atom append throws, but reads (raw/signal) still work.
    class FailingCardStorage extends MemoryStorage {
      override async append(event: Omit<CaptureEvent, 'id'>): Promise<EventId> {
        if (event.source === GRANOLA_INTAKE_CARD_SOURCE) throw new Error('disk full');
        return super.append(event);
      }
    }
    const store = new FailingCardStorage();
    await seedNoteAndSignal(store);
    const seedStore = await tempSeedStore();
    const deps = {
      classify: classifierReturning(OK_RUN),
      postSeed: async () => ({ ts: 'ts-1' }),
    };

    // Post still succeeds despite the atom write failing (observability never
    // blocks the pipeline).
    const result = await runGranolaIntakeBridgeOnce(store, seedStore, baseConfig(), deps);
    expect(result).toMatchObject({ status: 'ok', posted: 1 });
    expect(await store.query({ source: GRANOLA_INTAKE_CARD_SOURCE })).toHaveLength(0);

    // The failure is durably marked, not silent.
    const record = await seedStore.get(CANDIDATE_KEY);
    expect(record?.status).toBe('posted');
    expect(record?.card_atom_status).toBe('failed');
    expect(record?.card_atom_error).toContain('disk full');

    // A duplicate-suppressed rerun must NOT clear the failed marker.
    const second = await runGranolaIntakeBridgeOnce(store, seedStore, baseConfig(), deps);
    expect(second).toMatchObject({ posted: 0, skipped: 1 });
    const after = await seedStore.get(CANDIDATE_KEY);
    expect(after?.card_atom_status).toBe('failed');
    expect(after?.card_atom_error).toContain('disk full');
  });

  // AC3 (item 125): the sequential markPosted-throw retry edge. A pass that
  // appends the card atom, then throws at markPosted (seed stays retryable), is
  // retried on the next tick — without the dedupe guard the retry appends a
  // SECOND atom for the same card. The guard must keep it at exactly one.
  it('does not double-append a card atom across a sequential markPosted-throw retry', async () => {
    class FlakyMarkPostedStore extends FileGranolaIntakeSeedStore {
      public markPostedCalls = 0;
      override async markPosted(
        candidateKey: string,
        slackTs: string,
        cardAtom?: Parameters<FileGranolaIntakeSeedStore['markPosted']>[2],
      ): Promise<Awaited<ReturnType<FileGranolaIntakeSeedStore['markPosted']>>> {
        this.markPostedCalls += 1;
        if (this.markPostedCalls === 1) throw new Error('seed store write failed');
        return super.markPosted(candidateKey, slackTs, cardAtom);
      }
    }

    const store = new MemoryStorage();
    await seedNoteAndSignal(store);
    const dir = await mkdtemp(join(tmpdir(), 'echo-card-atom-'));
    tempDirs.push(dir);
    const seedStore = new FlakyMarkPostedStore(join(dir, 'seeds.json'));
    const deps = {
      classify: classifierReturning(OK_RUN),
      postSeed: async () => ({ ts: 'ts-1' }),
    };

    // Tick 1: post succeeds, atom appended, markPosted throws → markFailure
    // returns the seed to `pending` (retryable).
    await runGranolaIntakeBridgeOnce(store, seedStore, baseConfig(), deps);
    const afterFirst = await seedStore.get(CANDIDATE_KEY);
    expect(afterFirst?.status).toBe('pending');
    expect(await store.query({ source: GRANOLA_INTAKE_CARD_SOURCE })).toHaveLength(1);

    // Tick 2: the retry re-posts and reaches the emit path again; the guard sees
    // the existing atom and skips the append, and markPosted now succeeds.
    const second = await runGranolaIntakeBridgeOnce(store, seedStore, baseConfig(), deps);
    expect(second).toMatchObject({ posted: 1 });
    expect(seedStore.markPostedCalls).toBe(2);

    const cards = await store.query({ source: GRANOLA_INTAKE_CARD_SOURCE });
    expect(cards).toHaveLength(1);
    const record = await seedStore.get(CANDIDATE_KEY);
    expect(record?.status).toBe('posted');
  });
});
