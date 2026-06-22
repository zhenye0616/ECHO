import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GRANOLA_SIGNAL_INDEX_SOURCE,
  GRANOLA_SIGNAL_SOURCE,
  loadGranolaSignalCheckpoint,
  resolveCurrentGranolaSignalRuns,
  runGranolaSignalWorkerOnce,
  startGranolaSignalWorker,
  type GranolaExtractedSignal,
  type GranolaSignalExtractor,
  type GranolaSignalExtractionInput,
} from '../../src/enrich/granola-signals.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import type { CaptureEvent, EventId } from '../../src/storage/interface.js';
import { captureStdout } from '../fixtures/stdout.js';

function tempCheckpoint(): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), 'echo-granola-signals-'));
  return { dir, path: join(dir, 'granola-signals-checkpoint.json') };
}

async function seedRawMeeting(
  store: MemoryStorage,
  opts: {
    noteId?: string;
    updatedAt?: string;
    title?: string;
    summary?: string;
    transcript?: string;
  } = {},
): Promise<void> {
  const noteId = opts.noteId ?? 'note-1';
  const updatedAt = opts.updatedAt ?? '2026-06-21T10:00:00.000Z';
  const title = opts.title ?? 'Pricing call';
  await store.append({
    source: 'api:granola',
    timestamp: updatedAt,
    content:
      opts.summary ?? 'We decided to ship pricing signals because transcript dumps are slow.',
    metadata: {
      note_id: noteId,
      title,
      updated_at: updatedAt,
      granola_atom_type: 'summary',
      dedupe_key: `granola:${noteId}:summary`,
    },
  });
  await store.append({
    source: 'api:granola',
    timestamp: updatedAt,
    content:
      opts.transcript ??
      '[10-20] Avery: We decided to ship pricing signals.\n[21-30] Blake: The rationale is that transcript dumps are too expensive.\n[31-40] Avery: Dana will draft the customer note.',
    metadata: {
      note_id: noteId,
      title,
      updated_at: updatedAt,
      granola_atom_type: 'transcript',
      dedupe_key: `granola:${noteId}:transcript`,
    },
  });
}

function fixtureSignals(): GranolaExtractedSignal[] {
  return [
    {
      signal_type: 'decision',
      text: 'We decided to ship pricing signals.',
      canonical_subject: ' Pricing Signals ',
      source_span: {
        kind: 'transcript',
        start_time: 10,
        end_time: 20,
        quote: 'We decided to ship pricing signals.',
      },
      confidence: 0.91,
      decision_status: 'decided',
    },
    {
      signal_type: 'rationale',
      text: 'Transcript dumps are too expensive.',
      canonical_subject: 'pricing signals',
      source_span: {
        kind: 'transcript',
        start_time: 21,
        end_time: 30,
        quote: 'The rationale is that transcript dumps are too expensive.',
      },
      confidence: 0.4,
      rationale_for: 'pricing signals',
    },
    {
      signal_type: 'action',
      text: 'Dana will draft the customer note.',
      canonical_subject: 'customer note',
      source_span: { kind: 'summary' },
      confidence: 0.8,
      owner: 'Dana',
    },
  ];
}

describe('Granola signal enrichment worker', () => {
  it('extracts decision/rationale/action signal atoms plus a success manifest', async () => {
    const { dir, path } = tempCheckpoint();
    try {
      const store = new MemoryStorage();
      const seenInputs: GranolaSignalExtractionInput[] = [];
      await seedRawMeeting(store);
      const extractFn: GranolaSignalExtractor = async (input) => {
        seenInputs.push(input);
        return fixtureSignals();
      };

      const result = await runGranolaSignalWorkerOnce(store, extractFn, {
        checkpointPath: path,
        settleMs: 0,
        now: () => '2026-06-22T00:00:00.000Z',
      });

      expect(result).toMatchObject({
        status: 'ok',
        notes_seen: 1,
        notes_extracted: 1,
        signal_atoms_written: 3,
        manifests_written: 1,
      });
      expect(seenInputs[0]?.transcript_items).toHaveLength(3);
      expect(seenInputs[0]?.transcript_items[0]).toMatchObject({ start_time: 10, end_time: 20 });

      const signals = await store.query({ source: GRANOLA_SIGNAL_SOURCE, order: 'asc' });
      expect(new Set(signals.map((signal) => signal.metadata?.['signal_type']))).toEqual(
        new Set(['decision', 'rationale', 'action']),
      );
      const decision = signals.find((signal) => signal.metadata?.['signal_type'] === 'decision')!;
      const rationale = signals.find((signal) => signal.metadata?.['signal_type'] === 'rationale')!;
      expect(decision.content).toBe('We decided to ship pricing signals.');
      expect(decision.metadata).toMatchObject({
        note_id: 'note-1',
        meeting_title: 'Pricing call',
        canonical_subject: 'pricing signals',
        parent_dedupe_key: 'granola:note-1:transcript',
        decision_status: 'decided',
      });
      expect(decision.metadata?.['source_span']).toEqual({
        kind: 'transcript',
        start_time: 10,
        end_time: 20,
        quote: 'We decided to ship pricing signals.',
      });
      expect(rationale.metadata?.['low_confidence']).toBe(true);
      expect(rationale.metadata?.['rationale_for']).toBe(decision.metadata?.['dedupe_key']);

      const manifests = await store.query({ source: GRANOLA_SIGNAL_INDEX_SOURCE });
      expect(manifests).toHaveLength(1);
      expect(manifests[0]!.metadata).toMatchObject({
        manifest_type: 'granola_signal_run',
        note_id: 'note-1',
        supersedes: null,
      });
      expect(new Set(manifests[0]!.metadata?.['signal_atom_ids'] as string[])).toEqual(
        new Set(signals.map((s) => s.id)),
      );
      expect(loadGranolaSignalCheckpoint(path).notes['note-1']?.last_success_at).toBe(
        '2026-06-22T00:00:00.000Z',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('re-derives append-only runs and resolves the current manifest by latest-wins', async () => {
    const { dir, path } = tempCheckpoint();
    try {
      const store = new MemoryStorage();
      await seedRawMeeting(store);
      await runGranolaSignalWorkerOnce(store, async () => fixtureSignals().slice(0, 1), {
        checkpointPath: path,
        settleMs: 0,
        extractorVersion: 'granola-signals@1',
        now: () => '2026-06-22T00:00:00.000Z',
      });
      await runGranolaSignalWorkerOnce(
        store,
        async () => [
          {
            ...fixtureSignals()[0]!,
            text: 'We decided to ship pricing signals v2.',
          },
        ],
        {
          checkpointPath: path,
          settleMs: 0,
          extractorVersion: 'granola-signals@2',
          now: () => '2026-06-22T00:05:00.000Z',
        },
      );

      const signals = await store.query({ source: GRANOLA_SIGNAL_SOURCE });
      expect(signals).toHaveLength(2);
      const manifests = await store.query({ source: GRANOLA_SIGNAL_INDEX_SOURCE });
      expect(manifests).toHaveLength(2);
      const current = resolveCurrentGranolaSignalRuns(manifests).get('note-1');
      expect(current?.extractor_version).toBe('granola-signals@2');
      expect(current?.supersedes).toBe(
        manifests.find((m) => m.metadata?.['extractor_version'] === 'granola-signals@1')
          ?.metadata?.['extraction_run_id'],
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips unsettled notes until updated_at is quiet beyond the settle window', async () => {
    const { dir, path } = tempCheckpoint();
    try {
      const store = new MemoryStorage();
      await seedRawMeeting(store, { updatedAt: '2026-06-22T00:09:00.000Z' });
      let calls = 0;
      const result = await runGranolaSignalWorkerOnce(
        store,
        async () => {
          calls += 1;
          return fixtureSignals();
        },
        {
          checkpointPath: path,
          settleMs: 600_000,
          now: () => '2026-06-22T00:10:00.000Z',
        },
      );

      expect(result).toMatchObject({ status: 'ok', notes_extracted: 0 });
      expect(calls).toBe(0);
      expect(await store.query({ source: GRANOLA_SIGNAL_INDEX_SOURCE })).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('allows only one worker run in flight', async () => {
    const { dir, path } = tempCheckpoint();
    try {
      const store = new MemoryStorage();
      await seedRawMeeting(store);
      let release: (signals: GranolaExtractedSignal[]) => void = () => {};
      const blocked = new Promise<GranolaExtractedSignal[]>((resolve) => {
        release = resolve;
      });
      const handle = await startGranolaSignalWorker(store, {
        checkpointPath: path,
        settleMs: 0,
        runOnStart: false,
        extractFn: async () => blocked,
      });
      try {
        const first = handle.run();
        const second = await handle.run();
        expect(second).toEqual({ status: 'skipped', reason: 'in_flight' });
        release(fixtureSignals());
        expect(await first).toMatchObject({ status: 'ok', notes_extracted: 1 });
      } finally {
        await handle.stop();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not advance the checkpoint when signal atoms append but manifest append fails', async () => {
    const { dir, path } = tempCheckpoint();
    try {
      class ManifestFailOnceStorage extends MemoryStorage {
        failed = false;
        override async append(event: Omit<CaptureEvent, 'id'>): Promise<EventId> {
          if (event.source === GRANOLA_SIGNAL_INDEX_SOURCE && !this.failed) {
            this.failed = true;
            throw new Error('manifest append failed');
          }
          return await super.append(event);
        }
      }
      const store = new ManifestFailOnceStorage();
      await seedRawMeeting(store);

      const first = await runGranolaSignalWorkerOnce(
        store,
        async () => fixtureSignals().slice(0, 1),
        {
          checkpointPath: path,
          settleMs: 0,
          now: () => '2026-06-22T00:00:00.000Z',
        },
      );
      expect(first).toMatchObject({ status: 'error', reason: 'append_failed' });
      expect(await store.query({ source: GRANOLA_SIGNAL_SOURCE })).toHaveLength(1);
      expect(await store.query({ source: GRANOLA_SIGNAL_INDEX_SOURCE })).toHaveLength(0);
      expect(existsSync(path)).toBe(false);

      const second = await runGranolaSignalWorkerOnce(
        store,
        async () => fixtureSignals().slice(0, 1),
        {
          checkpointPath: path,
          settleMs: 0,
          now: () => '2026-06-22T00:01:00.000Z',
        },
      );
      expect(second).toMatchObject({ status: 'ok', notes_extracted: 1, manifests_written: 1 });
      expect(await store.query({ source: GRANOLA_SIGNAL_SOURCE })).toHaveLength(2);
      const current = resolveCurrentGranolaSignalRuns(
        await store.query({ source: GRANOLA_SIGNAL_INDEX_SOURCE }),
      ).get('note-1');
      expect(current?.signal_atom_ids).toHaveLength(1);
      expect(loadGranolaSignalCheckpoint(path).notes['note-1']?.last_success_at).toBe(
        '2026-06-22T00:01:00.000Z',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes no manifest on extraction failure and suppresses retry until input changes', async () => {
    const { dir, path } = tempCheckpoint();
    try {
      const store = new MemoryStorage();
      await seedRawMeeting(store);
      let calls = 0;
      const failing: GranolaSignalExtractor = async () => {
        calls += 1;
        throw new Error('provider rate limited');
      };

      const first = await runGranolaSignalWorkerOnce(store, failing, {
        checkpointPath: path,
        settleMs: 0,
        maxRetries: 1,
        retryDelayMs: 0,
        now: () => '2026-06-22T00:00:00.000Z',
      });
      expect(first).toMatchObject({ status: 'error', reason: 'extraction_failed' });
      expect(calls).toBe(2);
      expect(await store.query({ source: GRANOLA_SIGNAL_INDEX_SOURCE })).toHaveLength(0);
      expect(loadGranolaSignalCheckpoint(path).notes['note-1']).toMatchObject({
        last_failure_reason: 'provider rate limited',
      });

      const second = await runGranolaSignalWorkerOnce(store, failing, {
        checkpointPath: path,
        settleMs: 0,
        maxRetries: 1,
        retryDelayMs: 0,
        now: () => '2026-06-22T00:05:00.000Z',
      });
      expect(second).toMatchObject({ status: 'ok', notes_extracted: 0 });
      expect(calls).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('disables visibly when provider config validation fails', async () => {
    const stdout = captureStdout();
    try {
      const handle = await startGranolaSignalWorker(new MemoryStorage(), {
        env: { ECHO_GRANOLA_SIGNAL_BRAIN: 'not-a-brain' },
        runOnStart: false,
      });
      expect(handle.enabled).toBe(false);
      expect(await handle.run()).toEqual({ status: 'skipped', reason: 'disabled' });
    } finally {
      stdout.restore();
    }
    expect(stdout.writes.join('')).toContain('disabled');
  });

  it('persists checkpoints as JSON with the expected schema', async () => {
    const { dir, path } = tempCheckpoint();
    try {
      const store = new MemoryStorage();
      await seedRawMeeting(store);
      await runGranolaSignalWorkerOnce(store, async () => fixtureSignals().slice(0, 1), {
        checkpointPath: path,
        settleMs: 0,
        now: () => '2026-06-22T00:00:00.000Z',
      });
      expect(JSON.parse(readFileSync(path, 'utf8'))).toMatchObject({
        schema_version: 1,
        notes: {
          'note-1': {
            extractor_version: 'granola-signals@1',
            last_success_at: '2026-06-22T00:00:00.000Z',
          },
        },
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
