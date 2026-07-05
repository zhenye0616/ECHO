import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  filterToCurrentSignalRuns,
  GRANOLA_SIGNAL_INDEX_SOURCE,
  GRANOLA_SIGNAL_SOURCE,
  loadGranolaSignalCheckpoint,
  resolveCurrentGranolaSignalRuns,
  runGranolaSignalWorkerOnce,
  startGranolaSignalWorker,
  type GranolaExtractedSignal,
  type GranolaSignalExtractor,
  type GranolaSignalExtractionInput,
  type GranolaSignalWorkerResult,
} from '../../src/enrich/granola-signals.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import type { CaptureEvent, EventId } from '../../src/storage/interface.js';
import { captureStdout } from '../fixtures/stdout.js';
import { normalizeSubject } from '../../src/util/subject.js';

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

describe('AC1 (item 112): shared subject normalizer', () => {
  // The two former local implementations, inlined verbatim as reference
  // oracles. `normalizeSubject` in src/util/subject.ts must produce
  // byte-identical output to BOTH across every fixture.
  const formerGranolaNormalize = (value: string): string =>
    value.toLowerCase().trim().replace(/\s+/g, ' ');
  const formerDecisionNormalize = (subject: string): string =>
    subject.trim().toLowerCase().replace(/\s+/g, ' ');

  const fixtures = [
    'auth storage',
    'Auth Storage',
    '  Auth   Storage  ',
    'AUTH\tSTORAGE',
    'pricing\n\nmodel',
    'mixed \t \n whitespace   runs',
    '',
    '   ',
    ' Café  Décision ', // NBSP edges + accented interior
    'ПРИВЕТ   Мир',
    'İstanbul Plan', // Turkish dotted-I lowercasing
    'trailing tab\t',
    '\rleading cr',
  ];

  it('produces byte-identical output to both former implementations', () => {
    for (const fixture of fixtures) {
      const shared = normalizeSubject(fixture);
      expect(shared).toBe(formerGranolaNormalize(fixture));
      expect(shared).toBe(formerDecisionNormalize(fixture));
    }
  });

  it('the duplicated local normalizers no longer exist (import-only)', () => {
    const granolaSrc = readFileSync('src/enrich/granola-signals.ts', 'utf8');
    const decisionSrc = readFileSync('src/surfaces/ceo-slack-responder/decision-store.ts', 'utf8');
    // No local re-definition of the normalizer in either module.
    expect(granolaSrc).not.toMatch(/function\s+normalizeSubject\s*\(/);
    expect(decisionSrc).not.toMatch(/function\s+normalizeDecisionSubject\s*\(/);
    // Both import the shared util instead.
    expect(granolaSrc).toContain("from '../util/subject.js'");
    expect(decisionSrc).toContain("from '../../util/subject.js'");
  });
});

// ---------------------------------------------------------------------------
// item 115 — Station-2 contract pinning
// ---------------------------------------------------------------------------

function signalEvent(id: string, extras: Partial<CaptureEvent> = {}): CaptureEvent {
  return {
    id,
    source: GRANOLA_SIGNAL_SOURCE,
    timestamp: '2026-06-22T00:00:00.000Z',
    content: `signal ${id}`,
    metadata: { signal_type: 'decision' },
    ...extras,
  };
}

function manifestEvent(opts: {
  noteId: string;
  runId: string;
  completedAt: string;
  supersedes?: string | null;
  signalAtomIds: string[];
}): CaptureEvent {
  return {
    id: `manifest-${opts.runId}`,
    source: GRANOLA_SIGNAL_INDEX_SOURCE,
    timestamp: opts.completedAt,
    content: '{}',
    metadata: {
      note_id: opts.noteId,
      extractor_version: 'granola-signals@1',
      extraction_run_id: opts.runId,
      completed_at: opts.completedAt,
      supersedes: opts.supersedes ?? null,
      signal_atom_ids: opts.signalAtomIds,
    },
  };
}

describe('item 115 AC1 — filterToCurrentSignalRuns (one-call current-run filter)', () => {
  it('passes through the current run', () => {
    const signals = [signalEvent('sig-1')];
    const manifests = [
      manifestEvent({
        noteId: 'note-1',
        runId: 'run-1',
        completedAt: '2026-06-22T00:00:00.000Z',
        signalAtomIds: ['sig-1'],
      }),
    ];
    expect(filterToCurrentSignalRuns(signals, manifests).map((e) => e.id)).toEqual(['sig-1']);
  });

  it('excludes superseded-run signals', () => {
    const signals = [signalEvent('sig-1'), signalEvent('sig-2')];
    const manifests = [
      manifestEvent({
        noteId: 'note-1',
        runId: 'run-1',
        completedAt: '2026-06-22T00:00:00.000Z',
        signalAtomIds: ['sig-1'],
      }),
      manifestEvent({
        noteId: 'note-1',
        runId: 'run-2',
        completedAt: '2026-06-22T00:05:00.000Z',
        supersedes: 'run-1',
        signalAtomIds: ['sig-2'],
      }),
    ];
    expect(filterToCurrentSignalRuns(signals, manifests).map((e) => e.id)).toEqual(['sig-2']);
  });

  it('resolves a supersedes chain of length >=2 to the newest run only', () => {
    const signals = [signalEvent('sig-1'), signalEvent('sig-2'), signalEvent('sig-3')];
    const manifests = [
      manifestEvent({
        noteId: 'note-1',
        runId: 'run-1',
        completedAt: '2026-06-22T00:00:00.000Z',
        signalAtomIds: ['sig-1'],
      }),
      manifestEvent({
        noteId: 'note-1',
        runId: 'run-2',
        completedAt: '2026-06-22T00:05:00.000Z',
        supersedes: 'run-1',
        signalAtomIds: ['sig-2'],
      }),
      manifestEvent({
        noteId: 'note-1',
        runId: 'run-3',
        completedAt: '2026-06-22T00:10:00.000Z',
        supersedes: 'run-2',
        signalAtomIds: ['sig-3'],
      }),
    ];
    expect(filterToCurrentSignalRuns(signals, manifests).map((e) => e.id)).toEqual(['sig-3']);
  });

  it('terminates on a supersedes cycle and yields no current run for the note', () => {
    const signals = [signalEvent('sig-a'), signalEvent('sig-b')];
    const manifests = [
      manifestEvent({
        noteId: 'note-1',
        runId: 'run-a',
        completedAt: '2026-06-22T00:00:00.000Z',
        supersedes: 'run-b',
        signalAtomIds: ['sig-a'],
      }),
      manifestEvent({
        noteId: 'note-1',
        runId: 'run-b',
        completedAt: '2026-06-22T00:05:00.000Z',
        supersedes: 'run-a',
        signalAtomIds: ['sig-b'],
      }),
    ];
    expect(filterToCurrentSignalRuns(signals, manifests)).toEqual([]);
  });

  it('treats a supersedes pointer to a nonexistent run id as inert', () => {
    const signals = [signalEvent('sig-1')];
    const manifests = [
      manifestEvent({
        noteId: 'note-1',
        runId: 'run-1',
        completedAt: '2026-06-22T00:00:00.000Z',
        supersedes: 'run-does-not-exist',
        signalAtomIds: ['sig-1'],
      }),
    ];
    expect(filterToCurrentSignalRuns(signals, manifests).map((e) => e.id)).toEqual(['sig-1']);
  });

  it('resolves duplicate non-superseding manifests by latest completed_at (hardcoded run-b)', () => {
    const signals = [signalEvent('sig-a'), signalEvent('sig-b')];
    const manifests = [
      manifestEvent({
        noteId: 'note-1',
        runId: 'run-a',
        completedAt: '2026-06-22T00:00:00.000Z',
        signalAtomIds: ['sig-a'],
      }),
      manifestEvent({
        noteId: 'note-1',
        runId: 'run-b',
        completedAt: '2026-06-22T00:05:00.000Z',
        signalAtomIds: ['sig-b'],
      }),
    ];
    // Latest completed_at wins; expected winning run is HARDCODED, not derived
    // from the resolver's own output.
    expect(resolveCurrentGranolaSignalRuns(manifests).get('note-1')?.extraction_run_id).toBe(
      'run-b',
    );
    expect(filterToCurrentSignalRuns(signals, manifests).map((e) => e.id)).toEqual(['sig-b']);
  });

  it('breaks a completed_at tie by lexicographically greatest run id (hardcoded run-b)', () => {
    const signals = [signalEvent('sig-a'), signalEvent('sig-b')];
    const manifests = [
      manifestEvent({
        noteId: 'note-1',
        runId: 'run-a',
        completedAt: '2026-06-22T00:00:00.000Z',
        signalAtomIds: ['sig-a'],
      }),
      manifestEvent({
        noteId: 'note-1',
        runId: 'run-b',
        completedAt: '2026-06-22T00:00:00.000Z',
        signalAtomIds: ['sig-b'],
      }),
    ];
    expect(resolveCurrentGranolaSignalRuns(manifests).get('note-1')?.extraction_run_id).toBe(
      'run-b',
    );
    expect(filterToCurrentSignalRuns(signals, manifests).map((e) => e.id)).toEqual(['sig-b']);
  });

  it('excludes orphan signals from a failed manifest append (retry-run shape)', () => {
    // run-1 appended a signal atom, then the manifest append failed (no manifest
    // for run-1). The retry run appended a fresh signal + a manifest. The run-1
    // atom is referenced by no manifest and must be excluded.
    const signals = [signalEvent('sig-run1'), signalEvent('sig-retry')];
    const manifests = [
      manifestEvent({
        noteId: 'note-1',
        runId: 'run-retry',
        completedAt: '2026-06-22T00:01:00.000Z',
        signalAtomIds: ['sig-retry'],
      }),
    ];
    expect(filterToCurrentSignalRuns(signals, manifests).map((e) => e.id)).toEqual(['sig-retry']);
  });

  it('excludes signals for a note that has no manifest at all', () => {
    const signals = [signalEvent('sig-x')];
    expect(filterToCurrentSignalRuns(signals, [])).toEqual([]);
  });

  it('keeps notes independent (note A supersede does not affect note B)', () => {
    const signals = [signalEvent('sig-a1'), signalEvent('sig-a2'), signalEvent('sig-b1')];
    const manifests = [
      manifestEvent({
        noteId: 'note-a',
        runId: 'run-a1',
        completedAt: '2026-06-22T00:00:00.000Z',
        signalAtomIds: ['sig-a1'],
      }),
      manifestEvent({
        noteId: 'note-a',
        runId: 'run-a2',
        completedAt: '2026-06-22T00:05:00.000Z',
        supersedes: 'run-a1',
        signalAtomIds: ['sig-a2'],
      }),
      manifestEvent({
        noteId: 'note-b',
        runId: 'run-b1',
        completedAt: '2026-06-22T00:00:00.000Z',
        signalAtomIds: ['sig-b1'],
      }),
    ];
    expect(filterToCurrentSignalRuns(signals, manifests).map((e) => e.id)).toEqual([
      'sig-a2',
      'sig-b1',
    ]);
  });

  it('passes non-signal events through unconditionally (mixed-window passthrough)', () => {
    const nonSignal: CaptureEvent = {
      id: 'raw-1',
      source: 'api:granola',
      timestamp: '2026-06-22T00:00:00.000Z',
      content: 'raw note',
    };
    const signals = [nonSignal, signalEvent('sig-current'), signalEvent('sig-superseded')];
    const manifests = [
      manifestEvent({
        noteId: 'note-1',
        runId: 'run-1',
        completedAt: '2026-06-22T00:00:00.000Z',
        signalAtomIds: ['sig-current'],
      }),
    ];
    expect(filterToCurrentSignalRuns(signals, manifests).map((e) => e.id)).toEqual([
      'raw-1',
      'sig-current',
    ]);
  });

  it('preserves input order across a mixed multi-note window (exact sequence)', () => {
    const signals = [
      signalEvent('sig-b1'),
      signalEvent('sig-a2'),
      signalEvent('sig-a1'),
      signalEvent('sig-c1'),
    ];
    const manifests = [
      manifestEvent({
        noteId: 'note-a',
        runId: 'run-a1',
        completedAt: '2026-06-22T00:00:00.000Z',
        signalAtomIds: ['sig-a1'],
      }),
      manifestEvent({
        noteId: 'note-a',
        runId: 'run-a2',
        completedAt: '2026-06-22T00:05:00.000Z',
        supersedes: 'run-a1',
        signalAtomIds: ['sig-a2'],
      }),
      manifestEvent({
        noteId: 'note-b',
        runId: 'run-b1',
        completedAt: '2026-06-22T00:00:00.000Z',
        signalAtomIds: ['sig-b1'],
      }),
      manifestEvent({
        noteId: 'note-c',
        runId: 'run-c1',
        completedAt: '2026-06-22T00:00:00.000Z',
        signalAtomIds: ['sig-c1'],
      }),
    ];
    expect(filterToCurrentSignalRuns(signals, manifests).map((e) => e.id)).toEqual([
      'sig-b1',
      'sig-a2',
      'sig-c1',
    ]);
  });
});

interface CapturedLogEntry {
  level: string;
  source: string;
  message: string;
  payload?: Record<string, unknown>;
}

function capturedLogs(writes: string[]): CapturedLogEntry[] {
  const out: CapturedLogEntry[] = [];
  for (const line of writes.join('').split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    try {
      const parsed = JSON.parse(trimmed) as CapturedLogEntry;
      if (parsed && typeof parsed === 'object' && typeof parsed.message === 'string') {
        out.push(parsed);
      }
    } catch {
      // non-JSON stdout line — ignore.
    }
  }
  return out;
}

async function appendGranolaRaw(
  store: MemoryStorage,
  metadata: Record<string, unknown>,
  content = 'raw body',
): Promise<void> {
  await store.append({
    source: 'api:granola',
    timestamp: '2026-06-21T10:00:00.000Z',
    content,
    metadata,
  });
}

function expectOk(
  result: GranolaSignalWorkerResult,
): Extract<GranolaSignalWorkerResult, { status: 'ok' }> {
  expect(result.status).toBe('ok');
  if (result.status !== 'ok') throw new Error(`expected ok result, got ${result.status}`);
  return result;
}

describe('item 115 AC3 — skip/settle observability', () => {
  it('counts a missing-summary note once with a structured reason log', async () => {
    const { dir, path } = tempCheckpoint();
    const stdout = captureStdout();
    try {
      const store = new MemoryStorage();
      await appendGranolaRaw(store, {
        note_id: 'note-A',
        granola_atom_type: 'transcript',
        updated_at: '2026-06-21T10:00:00.000Z',
        dedupe_key: 'granola:note-A:transcript',
      });
      const result = await runGranolaSignalWorkerOnce(store, async () => fixtureSignals(), {
        checkpointPath: path,
        settleMs: 0,
        now: () => '2026-06-22T00:00:00.000Z',
      });
      const ok = expectOk(result);
      expect(ok.observability).toEqual({
        skipped_notes: { missing_summary: 1, missing_transcript: 0, missing_dedupe_key: 0 },
        malformed_events: 0,
        unparsable_updated_at: 0,
      });
      const logs = capturedLogs(stdout.writes);
      expect(
        logs.some(
          (l) =>
            l.message === 'note_skipped' &&
            l.payload?.['reason'] === 'missing_summary' &&
            l.payload?.['note_id'] === 'note-A',
        ),
      ).toBe(true);
    } finally {
      stdout.restore();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('counts a missing-transcript note once with a structured reason log', async () => {
    const { dir, path } = tempCheckpoint();
    const stdout = captureStdout();
    try {
      const store = new MemoryStorage();
      await appendGranolaRaw(store, {
        note_id: 'note-B',
        granola_atom_type: 'summary',
        updated_at: '2026-06-21T10:00:00.000Z',
        dedupe_key: 'granola:note-B:summary',
      });
      const ok = expectOk(
        await runGranolaSignalWorkerOnce(store, async () => fixtureSignals(), {
          checkpointPath: path,
          settleMs: 0,
          now: () => '2026-06-22T00:00:00.000Z',
        }),
      );
      expect(ok.observability).toEqual({
        skipped_notes: { missing_summary: 0, missing_transcript: 1, missing_dedupe_key: 0 },
        malformed_events: 0,
        unparsable_updated_at: 0,
      });
      expect(
        capturedLogs(stdout.writes).some(
          (l) =>
            l.message === 'note_skipped' &&
            l.payload?.['reason'] === 'missing_transcript' &&
            l.payload?.['note_id'] === 'note-B',
        ),
      ).toBe(true);
    } finally {
      stdout.restore();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('counts a missing-dedupe-key note once with a structured reason log', async () => {
    const { dir, path } = tempCheckpoint();
    const stdout = captureStdout();
    try {
      const store = new MemoryStorage();
      await appendGranolaRaw(store, {
        note_id: 'note-C',
        granola_atom_type: 'summary',
        updated_at: '2026-06-21T10:00:00.000Z',
        // dedupe_key intentionally absent
      });
      await appendGranolaRaw(store, {
        note_id: 'note-C',
        granola_atom_type: 'transcript',
        updated_at: '2026-06-21T10:00:00.000Z',
        dedupe_key: 'granola:note-C:transcript',
      });
      const ok = expectOk(
        await runGranolaSignalWorkerOnce(store, async () => fixtureSignals(), {
          checkpointPath: path,
          settleMs: 0,
          now: () => '2026-06-22T00:00:00.000Z',
        }),
      );
      expect(ok.observability).toEqual({
        skipped_notes: { missing_summary: 0, missing_transcript: 0, missing_dedupe_key: 1 },
        malformed_events: 0,
        unparsable_updated_at: 0,
      });
      expect(
        capturedLogs(stdout.writes).some(
          (l) =>
            l.message === 'note_skipped' &&
            l.payload?.['reason'] === 'missing_dedupe_key' &&
            l.payload?.['note_id'] === 'note-C',
        ),
      ).toBe(true);
    } finally {
      stdout.restore();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('counts a raw event with no note_id as malformed (missing_note_id)', async () => {
    const { dir, path } = tempCheckpoint();
    const stdout = captureStdout();
    try {
      const store = new MemoryStorage();
      await appendGranolaRaw(store, {
        granola_atom_type: 'summary',
        updated_at: '2026-06-21T10:00:00.000Z',
        dedupe_key: 'granola:orphan:summary',
      });
      const ok = expectOk(
        await runGranolaSignalWorkerOnce(store, async () => fixtureSignals(), {
          checkpointPath: path,
          settleMs: 0,
          now: () => '2026-06-22T00:00:00.000Z',
        }),
      );
      expect(ok.observability).toEqual({
        skipped_notes: { missing_summary: 0, missing_transcript: 0, missing_dedupe_key: 0 },
        malformed_events: 1,
        unparsable_updated_at: 0,
      });
      expect(
        capturedLogs(stdout.writes).some(
          (l) => l.message === 'raw_event_malformed' && l.payload?.['reason'] === 'missing_note_id',
        ),
      ).toBe(true);
    } finally {
      stdout.restore();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('counts a raw event with an out-of-domain granola_atom_type as malformed', async () => {
    const { dir, path } = tempCheckpoint();
    const stdout = captureStdout();
    try {
      const store = new MemoryStorage();
      await appendGranolaRaw(store, {
        note_id: 'note-E',
        granola_atom_type: 'notes',
        updated_at: '2026-06-21T10:00:00.000Z',
      });
      const ok = expectOk(
        await runGranolaSignalWorkerOnce(store, async () => fixtureSignals(), {
          checkpointPath: path,
          settleMs: 0,
          now: () => '2026-06-22T00:00:00.000Z',
        }),
      );
      expect(ok.observability).toEqual({
        skipped_notes: { missing_summary: 0, missing_transcript: 0, missing_dedupe_key: 0 },
        malformed_events: 1,
        unparsable_updated_at: 0,
      });
      expect(
        capturedLogs(stdout.writes).some(
          (l) =>
            l.message === 'raw_event_malformed' &&
            l.payload?.['reason'] === 'invalid_granola_atom_type' &&
            l.payload?.['note_id'] === 'note-E',
        ),
      ).toBe(true);
    } finally {
      stdout.restore();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('counts an unparsable updated_at once and still extracts (settled behavior pinned)', async () => {
    const { dir, path } = tempCheckpoint();
    const stdout = captureStdout();
    try {
      const store = new MemoryStorage();
      await appendGranolaRaw(store, {
        note_id: 'note-D',
        granola_atom_type: 'summary',
        updated_at: 'not-a-date',
        dedupe_key: 'granola:note-D:summary',
      });
      await appendGranolaRaw(store, {
        note_id: 'note-D',
        granola_atom_type: 'transcript',
        updated_at: 'not-a-date',
        dedupe_key: 'granola:note-D:transcript',
      });
      const ok = expectOk(
        await runGranolaSignalWorkerOnce(store, async () => fixtureSignals(), {
          checkpointPath: path,
          settleMs: 600_000,
          now: () => '2026-06-22T00:00:00.000Z',
        }),
      );
      expect(ok.notes_extracted).toBe(1);
      expect(ok.observability).toEqual({
        skipped_notes: { missing_summary: 0, missing_transcript: 0, missing_dedupe_key: 0 },
        malformed_events: 0,
        unparsable_updated_at: 1,
      });
      expect(
        capturedLogs(stdout.writes).some(
          (l) => l.message === 'unparsable_updated_at' && l.payload?.['note_id'] === 'note-D',
        ),
      ).toBe(true);
    } finally {
      stdout.restore();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('surfaces deterministic counters for a mixed-defect note through a worker tick', async () => {
    const { dir, path } = tempCheckpoint();
    const stdout = captureStdout();
    try {
      const store = new MemoryStorage();
      // Multi-defect note-X: summary present but missing its dedupe_key, and no
      // transcript at all -> counts ONCE as missing_transcript (precedence).
      await appendGranolaRaw(store, {
        note_id: 'note-X',
        granola_atom_type: 'summary',
        updated_at: '2026-06-21T10:00:00.000Z',
        // dedupe_key intentionally absent
      });
      // One malformed raw event: no note_id.
      await appendGranolaRaw(store, {
        granola_atom_type: 'summary',
        updated_at: '2026-06-21T10:00:00.000Z',
      });
      const ok = expectOk(
        await runGranolaSignalWorkerOnce(store, async () => fixtureSignals(), {
          checkpointPath: path,
          settleMs: 0,
          now: () => '2026-06-22T00:00:00.000Z',
        }),
      );
      expect(ok.observability).toEqual({
        skipped_notes: { missing_summary: 0, missing_transcript: 1, missing_dedupe_key: 0 },
        malformed_events: 1,
        unparsable_updated_at: 0,
      });
      const logs = capturedLogs(stdout.writes);
      expect(
        logs.some(
          (l) =>
            l.message === 'note_skipped' &&
            l.payload?.['reason'] === 'missing_transcript' &&
            l.payload?.['note_id'] === 'note-X',
        ),
      ).toBe(true);
      expect(
        logs.some(
          (l) => l.message === 'raw_event_malformed' && l.payload?.['reason'] === 'missing_note_id',
        ),
      ).toBe(true);
    } finally {
      stdout.restore();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('item 115 AC4 — signal wire-contract conformance', () => {
  // Hardcoded expected field lists (112 byte-stable-fixture style). Any future
  // change to these becomes a deliberate, reviewed contract change.
  const SIGNAL_CONTRACT_FIELDS = [
    'canonical_subject',
    'signal_type',
    'text',
    'note_id',
    'meeting_title',
    'source_span',
    'extractor_version',
    'extraction_run_id',
    'dedupe_key',
    'parent_dedupe_key',
  ] as const;
  const SIGNAL_TYPE_ENUM = ['decision', 'rationale', 'action'] as const;
  const MANIFEST_CONTRACT_FIELDS = ['extraction_run_id', 'supersedes', 'note_id'] as const;
  // Full metadata key sets, hardcoded for byte-stability.
  const EXPECTED_SIGNAL_METADATA_KEYS = [
    'canonical_subject',
    'confidence',
    'dedupe_key',
    'extraction_run_id',
    'extractor_version',
    'meeting_title',
    'note_id',
    'parent_dedupe_key',
    'signal_type',
    'source_span',
  ];
  const EXPECTED_MANIFEST_METADATA_KEYS = [
    'completed_at',
    'extraction_run_id',
    'extractor_version',
    'manifest_type',
    'note_id',
    'signal_atom_ids',
    'supersedes',
  ];

  it('pins the signal-atom and manifest-atom field contracts', async () => {
    const { dir, path } = tempCheckpoint();
    try {
      const store = new MemoryStorage();
      await seedRawMeeting(store);
      const cleanDecision: GranolaExtractedSignal = {
        signal_type: 'decision',
        text: 'Contract decision.',
        canonical_subject: 'contract subject',
        source_span: {
          kind: 'transcript',
          start_time: 10,
          end_time: 20,
          quote: 'Contract decision.',
        },
        confidence: 0.9,
      };
      const ok = expectOk(
        await runGranolaSignalWorkerOnce(store, async () => [cleanDecision], {
          checkpointPath: path,
          settleMs: 0,
          now: () => '2026-06-22T00:00:00.000Z',
        }),
      );
      expect(ok.signal_atoms_written).toBe(1);

      const [signal] = await store.query({ source: GRANOLA_SIGNAL_SOURCE });
      expect(signal).toBeDefined();
      // (a) signal-atom contract, field-by-field.
      expect(signal!.content).toBe('Contract decision.'); // `text`
      const meta = signal!.metadata ?? {};
      for (const field of SIGNAL_CONTRACT_FIELDS) {
        if (field === 'text') continue; // `text` is the atom content, not metadata
        expect(Object.prototype.hasOwnProperty.call(meta, field)).toBe(true);
      }
      expect(SIGNAL_TYPE_ENUM).toContain(meta['signal_type'] as string);
      expect(Object.keys(meta).sort()).toEqual(EXPECTED_SIGNAL_METADATA_KEYS);

      // (b) manifest-atom contract, field-by-field.
      const [manifest] = await store.query({ source: GRANOLA_SIGNAL_INDEX_SOURCE });
      expect(manifest).toBeDefined();
      const manifestMeta = manifest!.metadata ?? {};
      for (const field of MANIFEST_CONTRACT_FIELDS) {
        expect(Object.prototype.hasOwnProperty.call(manifestMeta, field)).toBe(true);
      }
      expect(manifestMeta['supersedes']).toBeNull();
      expect(Object.keys(manifestMeta).sort()).toEqual(EXPECTED_MANIFEST_METADATA_KEYS);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('(c) enforces transcript-span quotes but not summary-span quotes', async () => {
    // Transcript span whose quote has been mutated away -> extraction fails.
    const bad = tempCheckpoint();
    try {
      const store = new MemoryStorage();
      await seedRawMeeting(store);
      await expect(
        runGranolaSignalWorkerOnce(
          store,
          async () => [
            {
              signal_type: 'decision',
              text: 'x',
              canonical_subject: 'y',
              source_span: { kind: 'transcript', start_time: 10, end_time: 20, quote: '' },
              confidence: 0.9,
            },
          ],
          { checkpointPath: bad.path, settleMs: 0, now: () => '2026-06-22T00:00:00.000Z' },
        ),
      ).rejects.toThrow(/transcript source_span\.quote is required/);
    } finally {
      rmSync(bad.dir, { recursive: true, force: true });
    }

    // Summary span carries no quote and is accepted (no verbatim guarantee).
    const good = tempCheckpoint();
    try {
      const store = new MemoryStorage();
      await seedRawMeeting(store);
      const ok = expectOk(
        await runGranolaSignalWorkerOnce(
          store,
          async () => [
            {
              signal_type: 'decision',
              text: 'summary-anchored decision',
              canonical_subject: 'y',
              source_span: { kind: 'summary' },
              confidence: 0.9,
            },
          ],
          { checkpointPath: good.path, settleMs: 0, now: () => '2026-06-22T00:00:00.000Z' },
        ),
      );
      expect(ok.signal_atoms_written).toBe(1);
    } finally {
      rmSync(good.dir, { recursive: true, force: true });
    }
  });
});
