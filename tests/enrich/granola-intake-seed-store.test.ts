import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  FileGranolaIntakeSeedStore,
  type GranolaIntakeSeedRecord,
} from '../../src/enrich/granola-intake-seed-store.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempStore(): Promise<{ path: string; store: FileGranolaIntakeSeedStore }> {
  const dir = await mkdtemp(join(tmpdir(), 'echo-intake-seed-store-'));
  tempDirs.push(dir);
  const path = join(dir, 'seeds.json');
  return { path, store: new FileGranolaIntakeSeedStore(path) };
}

const CLAIM = { candidateKey: 'granola:signal:note-1:v1:action:abcd', noteId: 'note-1', channelId: 'C-INTAKE' };

describe('FileGranolaIntakeSeedStore', () => {
  it('claims a pending record and returns the existing one on re-claim', async () => {
    const { store } = await tempStore();
    const first = await store.claim(CLAIM);
    expect(first.created).toBe(true);
    expect(first.record.status).toBe('pending');
    expect(first.record.retry_count).toBe(0);

    const second = await store.claim(CLAIM);
    expect(second.created).toBe(false);
    expect(second.record.status).toBe('pending');
  });

  it('drives pending → posting → posted with a persisted slack_ts', async () => {
    const { store } = await tempStore();
    await store.claim(CLAIM);
    const posting = await store.markPosting(CLAIM.candidateKey);
    expect(posting.status).toBe('posting');
    const posted = await store.markPosted(CLAIM.candidateKey, '1700.5');
    expect(posted.status).toBe('posted');
    expect(posted.slack_ts).toBe('1700.5');
  });

  it('retries below the cap (posting → pending) and is terminal at the cap (failed, operator-visible)', async () => {
    const { store } = await tempStore();
    await store.claim(CLAIM);
    await store.markPosting(CLAIM.candidateKey);
    const first = await store.markFailure(CLAIM.candidateKey, 'network down', 3);
    expect(first.status).toBe('pending');
    expect(first.retry_count).toBe(1);
    expect(first.last_error).toBe('network down');

    await store.markFailure(CLAIM.candidateKey, 'still down', 3);
    const terminal = await store.markFailure(CLAIM.candidateKey, 'gave up', 3);
    expect(terminal.status).toBe('failed');
    expect(terminal.retry_count).toBe(3);
    expect(terminal.last_error).toBe('gave up');
  });

  it('recovers a crashed posting record as retryable from a fresh store instance', async () => {
    const { path, store } = await tempStore();
    await store.claim(CLAIM);
    await store.markPosting(CLAIM.candidateKey);
    // Simulate a crash mid-post: a new instance reads the durable file.
    const recovered = new FileGranolaIntakeSeedStore(path);
    const record = await recovered.get(CLAIM.candidateKey);
    expect(record?.status).toBe('posting');
    // Retryable — not posted, not failed.
    expect(record?.status).not.toBe('posted');
    expect(record?.status).not.toBe('failed');
  });

  it('converges two concurrent claims for the same candidate to one durable record', async () => {
    const { store } = await tempStore();
    const [a, b] = await Promise.all([store.claim(CLAIM), store.claim(CLAIM)]);
    const createdCount = [a, b].filter((r) => r.created).length;
    expect(createdCount).toBe(1);
    const all = await store.list();
    expect(all).toHaveLength(1);
    expect(all[0]?.candidate_key).toBe(CLAIM.candidateKey);
  });

  it('writes a valid JSON file that round-trips', async () => {
    const { path, store } = await tempStore();
    await store.claim(CLAIM);
    await store.markPosting(CLAIM.candidateKey);
    await store.markPosted(CLAIM.candidateKey, '1701.1');
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as {
      schema_version: number;
      seeds: Record<string, GranolaIntakeSeedRecord>;
    };
    expect(parsed.schema_version).toBe(1);
    expect(parsed.seeds[CLAIM.candidateKey]?.status).toBe('posted');
  });
});
