import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  runGranolaIntakeBridgeOnce,
  type ClassifiedIntakeCandidate,
  type GranolaIntakeConfig,
} from '../../src/enrich/granola-intake-candidates.js';
import { FileGranolaIntakeSeedStore } from '../../src/enrich/granola-intake-seed-store.js';
import { MemoryStorage } from '../../src/storage/memory.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempSeedStore(): Promise<FileGranolaIntakeSeedStore> {
  const dir = await mkdtemp(join(tmpdir(), 'echo-intake-cutoff-clock-'));
  tempDirs.push(dir);
  return new FileGranolaIntakeSeedStore(join(dir, 'seeds.json'));
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function config(): GranolaIntakeConfig {
  return {
    enabled: true,
    lookbackMs: SEVEN_DAYS_MS,
    internalDomains: ['echo.dev'],
    ownerMap: { 'me@echo.dev': 'UOWNER' },
    defaultOwner: 'UDEFAULT',
    channelId: 'C-INTAKE',
    botToken: 'xoxb-token',
    perNoteCap: 3,
    maxRetries: 5,
  };
}

// Regression pin for the 2026-07-07 time-bomb (item 128): the lookback cutoff
// must derive from the injected `deps.now`, not a second `Date.now()` read.
// The fixture is dated 2020-01-07 — inside the injected 7-day lookback
// (now = 2020-01-08) but far older than any real wall-clock cutoff. Under the
// reverted `Date.now()` form the cutoff sits in the present, the 2020 signal
// falls outside it, and the candidate is dropped, so this assertion fails.
describe('runGranolaIntakeBridgeOnce lookback cutoff follows the injected clock', () => {
  it('sees a candidate dated inside the injected-now lookback even when it predates the wall clock', async () => {
    const injectedNow = '2020-01-08T00:00:00.000Z';
    const fixtureDate = '2020-01-07T00:00:00.000Z';

    const store = new MemoryStorage();
    await store.append({
      source: 'api:granola',
      timestamp: fixtureDate,
      content: 'summary',
      metadata: {
        note_id: 'note-1',
        title: 'Acme roadmap',
        updated_at: fixtureDate,
        granola_atom_type: 'summary',
        web_url: 'https://granola.ai/notes/note-1',
        attendees: [{ email: 'client@acme.com' }, { email: 'me@echo.dev' }],
      },
    });
    await store.append({
      source: 'derived:granola-signals',
      timestamp: fixtureDate,
      content: 'Add amendment alerts',
      metadata: {
        signal_type: 'action',
        note_id: 'note-1',
        dedupe_key: 'granola:signal:note-1:v1:action:a1',
        canonical_subject: 'topic',
        source_span: { kind: 'transcript', start_time: 1, end_time: 2, quote: 'We need amendment alerts.' },
        confidence: 0.9,
      },
    });

    const seedStore = await tempSeedStore();

    const result = await runGranolaIntakeBridgeOnce(store, seedStore, config(), {
      classify: async (input) =>
        input.signals.map(
          (signal): ClassifiedIntakeCandidate => ({
            ref: signal.ref,
            fields: { request: 'Add amendment alerts', clientProject: 'Acme' },
          }),
        ),
      postSeed: async () => ({ ts: 'ts-1' }),
      now: () => injectedNow,
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.candidates).toBe(1);
    expect(result.posted).toBe(1);
  });
});
