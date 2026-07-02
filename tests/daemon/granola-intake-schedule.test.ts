import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  GranolaIntakeConfigError,
  loadGranolaIntakeConfig,
  startGranolaIntakeBridge,
  type GranolaIntakeConfig,
} from '../../src/enrich/granola-intake-candidates.js';
import { FileGranolaIntakeSeedStore } from '../../src/enrich/granola-intake-seed-store.js';
import { MemoryStorage } from '../../src/storage/memory.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempSeedStore(): Promise<FileGranolaIntakeSeedStore> {
  const dir = await mkdtemp(join(tmpdir(), 'echo-intake-schedule-'));
  tempDirs.push(dir);
  return new FileGranolaIntakeSeedStore(join(dir, 'seeds.json'));
}

function enabledConfig(overrides: Partial<GranolaIntakeConfig> = {}): GranolaIntakeConfig {
  return {
    enabled: true,
    lookbackMs: 30 * 24 * 60 * 60 * 1000,
    internalDomains: ['echo.dev'],
    ownerMap: {},
    defaultOwner: 'UDEFAULT',
    channelId: 'C-INTAKE',
    botToken: 'xoxb',
    perNoteCap: 3,
    maxRetries: 5,
    ...overrides,
  };
}

describe('startGranolaIntakeBridge scheduling', () => {
  it('is disabled by default and never scans', async () => {
    const seedStore = await tempSeedStore();
    const handle = startGranolaIntakeBridge(new MemoryStorage(), {
      env: {},
      seedStore,
      runOnStart: false,
    });
    expect(handle.enabled).toBe(false);
    expect(await handle.run()).toEqual({ status: 'skipped', reason: 'disabled' });
    await handle.stop();
  });

  it('fails closed with a structured config error and claims zero seed records when misconfigured', async () => {
    // Direct load throws the structured error.
    expect(() => loadGranolaIntakeConfig({ ECHO_GRANOLA_INTAKE_ENABLED: 'true' })).toThrow(
      GranolaIntakeConfigError,
    );

    const seedStore = await tempSeedStore();
    const handle = startGranolaIntakeBridge(new MemoryStorage(), {
      env: { ECHO_GRANOLA_INTAKE_ENABLED: 'true' },
      seedStore,
      runOnStart: false,
    });
    expect(handle.enabled).toBe(false);
    expect(handle.configError).toBeInstanceOf(GranolaIntakeConfigError);
    expect(handle.configError?.missing).toContain('ECHO_SLACK_BOT_TOKEN');
    expect(handle.configError?.missing).toContain('ECHO_GRANOLA_INTAKE_CHANNEL_ID');
    // Zero seed records claimed.
    expect(await seedStore.list()).toHaveLength(0);
    await handle.stop();
  });

  it('runs the bridge after signal extraction (runSignalsFirst awaited first)', async () => {
    const storage = new MemoryStorage();
    await storage.append({
      source: 'api:granola',
      timestamp: '2026-06-30T10:00:00.000Z',
      content: 'summary',
      metadata: {
        note_id: 'note-1',
        title: 'Client sync',
        updated_at: '2026-06-30T10:00:00.000Z',
        granola_atom_type: 'summary',
        attendees: [{ email: 'client@acme.com' }],
      },
    });
    await storage.append({
      source: 'derived:granola-signals',
      timestamp: '2026-06-30T10:05:00.000Z',
      content: 'do the thing',
      metadata: {
        signal_type: 'action',
        note_id: 'note-1',
        dedupe_key: 'granola:signal:note-1:v1:action:s1',
        canonical_subject: 'topic',
        source_span: { kind: 'summary' },
        confidence: 0.8,
      },
    });

    const seedStore = await tempSeedStore();
    const order: string[] = [];
    const handle = startGranolaIntakeBridge(storage, {
      config: enabledConfig(),
      seedStore,
      runOnStart: false,
      runSignalsFirst: async () => {
        order.push('signals');
      },
      classify: async (input) => {
        order.push('classify');
        return input.signals.map((s) => ({ ref: s.ref, fields: { request: 'do the thing' } }));
      },
      postSeed: async () => {
        order.push('post');
        return { ts: 'ts-1' };
      },
    });

    const result = await handle.run();
    await handle.stop();

    expect(result).toMatchObject({ status: 'ok', posted: 1 });
    expect(order).toEqual(['signals', 'classify', 'post']);
  });
});
