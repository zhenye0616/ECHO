// HOLDOUT CONFIRMATION SUITE — item 131, RC5 (brittle brain I/O).
// Blind holdout: red-first tests asserting the CORRECT behavior per 131 AC5.
// Each test drives the REAL default brain extractor path
// (startGranolaSignalWorker with no extractFn → resolveBrainExtractorConfig →
// defaultExtractorFromBrain → buildExtractionPrompt → runBrain → parseExtractorAnswer)
// with `runBrain` mocked at the module seam so no codex child process ever runs.
// All state lands in mkdtemp dirs; ECHO home is repointed per test so the
// worker-heartbeat write never touches ~/.echo.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Partial module mock: only runBrain is replaced. preflightBrain is bypassed
// via the worker's `preflight` option seam; parseBrainName stays real.
const runBrainMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/brain/brain.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/brain/brain.js')>();
  return { ...actual, runBrain: runBrainMock };
});

import {
  DEFAULT_GRANOLA_SIGNAL_BRAIN_TIMEOUT_MS,
  startGranolaSignalWorker,
  type GranolaSignalWorkerResult,
} from '../../src/enrich/granola-signals.js';
import { setEchoHomeRoot } from '../../src/echo-home/paths.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import type { BrainResult, BrainRunOptions } from '../../src/brain/brain.js';

const NOW = '2026-07-08T00:10:00.000Z';
const UPDATED_AT = '2026-07-08T00:00:00.000Z';

const tempDirs: string[] = [];
let echoHome = '';

beforeEach(() => {
  echoHome = mkdtempSync(join(tmpdir(), 'echo-holdout-131-rc5-home-'));
  tempDirs.push(echoHome);
  setEchoHomeRoot(echoHome);
  runBrainMock.mockReset();
});

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

function tempCheckpointPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'echo-holdout-131-rc5-ckpt-'));
  tempDirs.push(dir);
  return join(dir, 'granola-signals-checkpoint.json');
}

async function seedRawMeeting(
  store: MemoryStorage,
  opts: { summary?: string; transcript?: string } = {},
): Promise<void> {
  const noteId = 'note-rc5';
  await store.append({
    source: 'api:granola',
    timestamp: UPDATED_AT,
    content: opts.summary ?? 'We decided to run the pilot with the advisor cohort.',
    metadata: {
      note_id: noteId,
      title: 'Advisor sync',
      updated_at: UPDATED_AT,
      granola_atom_type: 'summary',
      dedupe_key: `granola:${noteId}:summary`,
    },
  });
  await store.append({
    source: 'api:granola',
    timestamp: UPDATED_AT,
    content:
      opts.transcript ??
      '[10-20] Avery: We decided to run the pilot with the advisor cohort.\n[21-30] Blake: Agreed.',
    metadata: {
      note_id: noteId,
      title: 'Advisor sync',
      updated_at: UPDATED_AT,
      granola_atom_type: 'transcript',
      dedupe_key: `granola:${noteId}:transcript`,
    },
  });
}

/** A minimal answer that passes validateSignal, as raw (unfenced) JSON text. */
function validAnswerJson(): string {
  return JSON.stringify({
    signals: [
      {
        signal_type: 'decision',
        text: 'Run the pilot with the advisor cohort.',
        canonical_subject: 'advisor pilot',
        source_span: { kind: 'summary' },
        confidence: 0.9,
        decision_status: 'decided',
      },
    ],
  });
}

function okBrainResult(answer: string): BrainResult {
  return { ok: true, outcome: 'ok', durationMs: 10, answer };
}

/** Runs one worker tick through the REAL defaultExtractorFromBrain (no extractFn). */
async function runTickThroughDefaultBrainExtractor(
  store: MemoryStorage,
): Promise<GranolaSignalWorkerResult> {
  const handle = await startGranolaSignalWorker(store, {
    checkpointPath: tempCheckpointPath(),
    settleMs: 0,
    retryDelayMs: 0,
    runOnStart: false,
    workerIntervalMs: 3_600_000,
    now: () => NOW,
    env: {
      ECHO_GRANOLA_SIGNAL_BRAIN: 'codex',
      ECHO_GRANOLA_SIGNAL_CONTEXT_REPO_PATH: echoHome,
    },
    preflight: async () => {},
  });
  try {
    return await handle.run();
  } finally {
    await handle.stop();
  }
}

describe('holdout 131 RC5 — brittle brain I/O (granola-signals default brain extractor)', () => {
  // CONFIRMS: Fenced/annotated codex JSON burns 3 full brain runs then triggers
  // permanent checkpoint poison (stress-test §Infra, feeds top-5 #5) → 131 AC5.
  // Correct behavior: brain output wrapped in markdown fences parses successfully
  // (strip/salvage before JSON.parse), so the tick succeeds on the FIRST brain
  // call. Today parseExtractorAnswer (granola-signals.ts:878-887) does a raw
  // parseJson(answer.trim()) → JSON.parse throws on the fence, extractWithRetries
  // burns all 3 attempts (maxRetries default 2), and the tick errors.
  it('parses brain output wrapped in ```json fences without burning brain retries', async () => {
    const store = new MemoryStorage();
    await seedRawMeeting(store);
    runBrainMock.mockResolvedValue(
      okBrainResult('```json\n' + validAnswerJson() + '\n```'),
    );

    const result = await runTickThroughDefaultBrainExtractor(store);

    // Fence-strip salvage: the valid JSON inside the fences must extract cleanly.
    expect(result).toMatchObject({ status: 'ok', notes_extracted: 1 });
    // And on the first brain invocation — a parse-level salvage means no
    // full-brain-run retries are burned on cosmetic fencing.
    expect(runBrainMock).toHaveBeenCalledTimes(1);
  });

  // CONFIRMS: Long-transcript double-embedding — prompt contains the transcript
  // twice (stress-test §Content; granola-signals.ts:863-876) → 131 AC5.
  // Correct behavior: the extraction prompt embeds the transcript ONCE. Today
  // buildExtractionPrompt JSON.stringifies the whole GranolaSignalExtractionInput,
  // which carries BOTH transcript_text AND transcript_items[] (same content
  // re-parsed), so every transcript line appears twice in the prompt.
  it('embeds each transcript line exactly once in the extraction prompt', async () => {
    const sentinel = 'ZXQ7-TRANSCRIPT-SENTINEL-LINE';
    const store = new MemoryStorage();
    await seedRawMeeting(store, {
      transcript: `[10-20] Avery: ${sentinel} we decided the pilot scope.\n[21-30] Blake: Agreed.`,
    });
    const prompts: string[] = [];
    runBrainMock.mockImplementation(async (question: string) => {
      prompts.push(question);
      return okBrainResult(validAnswerJson());
    });

    const result = await runTickThroughDefaultBrainExtractor(store);
    expect(result).toMatchObject({ status: 'ok', notes_extracted: 1 });
    expect(prompts).toHaveLength(1);

    const occurrences = prompts[0]!.split(sentinel).length - 1;
    // One transcript representation in the prompt — not two.
    expect(occurrences).toBe(1);
  });

  // CONFIRMS: fixed 180s brain timeout regardless of transcript size — observed
  // 157s/180s at 125KB live, i.e. probabilistic timeout that then feeds the
  // permanent-poison class (stress-test §Content long-transcript finding +
  // top-5 #5) → 131 AC5. Correct behavior: the effective timeoutMs passed to
  // the brain scales with input size, so a 125KB transcript gets MORE than the
  // 180_000ms default. Today resolveBrainExtractorConfig pins timeoutMs to
  // env-or-DEFAULT once at config time (granola-signals.ts:828-846) and
  // defaultExtractorFromBrain passes that constant for every note.
  it('scales the brain timeout with input size (125KB transcript > 180s default)', async () => {
    // ~125KB transcript: 1100 lines x ~118 chars.
    const bigTranscript = Array.from(
      { length: 1100 },
      (_, i) => `[${i}-${i + 1}] Avery: ${'x'.repeat(90)} filler line ${i}`,
    ).join('\n');
    expect(bigTranscript.length).toBeGreaterThan(125_000);

    const store = new MemoryStorage();
    await seedRawMeeting(store, { transcript: bigTranscript });
    const timeouts: number[] = [];
    runBrainMock.mockImplementation(async (_question: string, options: BrainRunOptions) => {
      timeouts.push(options.timeoutMs);
      return okBrainResult(validAnswerJson());
    });

    const result = await runTickThroughDefaultBrainExtractor(store);
    expect(result).toMatchObject({ status: 'ok', notes_extracted: 1 });
    expect(timeouts).toHaveLength(1);

    // AC5: "the brain timeout scales with input size (pinned formula or config)".
    // For an input well past the size that was observed at 157s/180s live, the
    // effective timeout must exceed the fixed default.
    expect(timeouts[0]!).toBeGreaterThan(DEFAULT_GRANOLA_SIGNAL_BRAIN_TIMEOUT_MS);
  });
});
