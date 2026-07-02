import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  collectAttendeeEmails,
  loadGranolaIntakeConfig,
  runGranolaIntakeBridgeOnce,
  GranolaIntakeConfigError,
  type ClassifiedIntakeCandidate,
  type GranolaIntakeClassificationInput,
  type GranolaIntakeConfig,
} from '../../src/enrich/granola-intake-candidates.js';
import { FileGranolaIntakeSeedStore } from '../../src/enrich/granola-intake-seed-store.js';
import { MemoryStorage } from '../../src/storage/memory.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempSeedStore(): Promise<FileGranolaIntakeSeedStore> {
  const dir = await mkdtemp(join(tmpdir(), 'echo-intake-candidates-'));
  tempDirs.push(dir);
  return new FileGranolaIntakeSeedStore(join(dir, 'seeds.json'));
}

function baseConfig(overrides: Partial<GranolaIntakeConfig> = {}): GranolaIntakeConfig {
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
    ...overrides,
  };
}

async function seedRawNote(
  store: MemoryStorage,
  opts: {
    noteId: string;
    title?: string;
    webUrl?: string;
    attendees?: unknown;
    updatedAt?: string;
  },
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
    signalType: 'action' | 'decision' | 'rationale';
    text: string;
    dedupeKey: string;
    quote?: string;
    timestamp?: string;
  },
): Promise<void> {
  await store.append({
    source: 'derived:granola-signals',
    timestamp: opts.timestamp ?? '2026-06-30T10:05:00.000Z',
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

describe('collectAttendeeEmails', () => {
  it('extracts emails from arrays of objects and strings', () => {
    expect(
      collectAttendeeEmails([{ email: 'A@Acme.com' }, 'someone@echo.dev']).sort(),
    ).toEqual(['a@acme.com', 'someone@echo.dev']);
  });
});

describe('loadGranolaIntakeConfig', () => {
  it('is disabled by default', () => {
    expect(loadGranolaIntakeConfig({}).enabled).toBe(false);
  });

  it('fails closed when enabled but token/channel missing', () => {
    expect(() => loadGranolaIntakeConfig({ ECHO_GRANOLA_INTAKE_ENABLED: 'true' })).toThrow(
      GranolaIntakeConfigError,
    );
  });

  it('loads a valid enabled config', () => {
    const config = loadGranolaIntakeConfig({
      ECHO_GRANOLA_INTAKE_ENABLED: 'true',
      ECHO_SLACK_BOT_TOKEN: 'xoxb',
      ECHO_GRANOLA_INTAKE_CHANNEL_ID: 'C1',
      ECHO_GRANOLA_INTAKE_INTERNAL_DOMAINS: 'echo.dev, acme-internal.com',
      ECHO_GRANOLA_INTAKE_OWNER_MAP: '{"me@echo.dev":"UME"}',
      ECHO_GRANOLA_INTAKE_DEFAULT_OWNER: 'UDEF',
      ECHO_GRANOLA_INTAKE_PER_NOTE_CAP: '2',
    });
    expect(config).toMatchObject({
      enabled: true,
      channelId: 'C1',
      botToken: 'xoxb',
      internalDomains: ['echo.dev', 'acme-internal.com'],
      ownerMap: { 'me@echo.dev': 'UME' },
      defaultOwner: 'UDEF',
      perNoteCap: 2,
    });
  });
});

describe('runGranolaIntakeBridgeOnce', () => {
  it('classifies only action/decision signals for an external-attendee note and seeds them with provenance', async () => {
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
      dedupeKey: 'granola:signal:note-1:v1:action:a1',
      quote: 'We need amendment alerts.',
    });
    await seedSignal(store, {
      noteId: 'note-1',
      signalType: 'rationale',
      text: 'because compliance',
      dedupeKey: 'granola:signal:note-1:v1:rationale:r1',
    });

    const seedStore = await tempSeedStore();
    const posts: Array<{ channel: string; text: string }> = [];
    let classifyInput: GranolaIntakeClassificationInput | undefined;
    const atomsBefore = await store.count();

    const result = await runGranolaIntakeBridgeOnce(store, seedStore, baseConfig(), {
      classify: async (input) => {
        classifyInput = input;
        return input.signals.map(
          (signal): ClassifiedIntakeCandidate => ({
            ref: signal.ref,
            fields: { request: 'Add amendment alerts', clientProject: 'Acme' },
          }),
        );
      },
      postSeed: async (channel, text) => {
        posts.push({ channel, text });
        return { ts: `ts-${posts.length}` };
      },
    });

    expect(result.status).toBe('ok');
    // Only the action signal reached the classifier — rationale is filtered out.
    expect(classifyInput?.signals.map((s) => s.signal_type)).toEqual(['action']);
    expect(posts).toHaveLength(1);
    expect(posts[0]?.channel).toBe('C-INTAKE');
    expect(posts[0]?.text).toContain('<@UOWNER>');
    expect(posts[0]?.text).toContain('Acme roadmap');
    expect(posts[0]?.text).toContain('https://granola.ai/notes/note-1');
    expect(posts[0]?.text).toContain('We need amendment alerts.');
    expect(posts[0]?.text).toContain('[echo-intake-seed v1 ');

    const record = await seedStore.get('granola:signal:note-1:v1:action:a1');
    expect(record?.status).toBe('posted');
    expect(record?.slack_ts).toBe('ts-1');

    // Append-only: the worker only reads atoms, never mutates or adds.
    expect(await store.count()).toBe(atomsBefore);
  });

  it('produces zero candidates for an internal-only meeting', async () => {
    const store = new MemoryStorage();
    await seedRawNote(store, {
      noteId: 'note-int',
      attendees: [{ email: 'me@echo.dev' }, { email: 'peer@echo.dev' }],
    });
    await seedSignal(store, {
      noteId: 'note-int',
      signalType: 'action',
      text: 'internal cleanup',
      dedupeKey: 'granola:signal:note-int:v1:action:z1',
    });
    const seedStore = await tempSeedStore();
    let classifyCalls = 0;

    const result = await runGranolaIntakeBridgeOnce(store, seedStore, baseConfig(), {
      classify: async (input) => {
        classifyCalls += 1;
        return input.signals.map((s) => ({ ref: s.ref, fields: {} }));
      },
      postSeed: async () => ({ ts: 'nope' }),
    });

    expect(classifyCalls).toBe(0);
    expect(result).toMatchObject({ status: 'ok', notes_seen: 0, candidates: 0, posted: 0 });
  });

  it('caps candidates per note', async () => {
    const store = new MemoryStorage();
    await seedRawNote(store, { noteId: 'note-2', attendees: [{ email: 'client@acme.com' }] });
    for (const n of [1, 2, 3]) {
      await seedSignal(store, {
        noteId: 'note-2',
        signalType: 'action',
        text: `action ${n}`,
        dedupeKey: `granola:signal:note-2:v1:action:a${n}`,
      });
    }
    const seedStore = await tempSeedStore();
    const posts: string[] = [];

    const result = await runGranolaIntakeBridgeOnce(
      store,
      seedStore,
      baseConfig({ perNoteCap: 2 }),
      {
        classify: async (input) => input.signals.map((s) => ({ ref: s.ref, fields: {} })),
        postSeed: async (_channel, text) => {
          posts.push(text);
          return { ts: `ts-${posts.length}` };
        },
      },
    );

    expect(result).toMatchObject({ status: 'ok', posted: 2 });
    expect(posts).toHaveLength(2);
  });

  it('skips already-posted candidates on a re-run (no duplicate post)', async () => {
    const store = new MemoryStorage();
    await seedRawNote(store, { noteId: 'note-3', attendees: [{ email: 'client@acme.com' }] });
    await seedSignal(store, {
      noteId: 'note-3',
      signalType: 'decision',
      text: 'decide',
      dedupeKey: 'granola:signal:note-3:v1:decision:d1',
    });
    const seedStore = await tempSeedStore();
    const posts: string[] = [];
    const deps = {
      classify: async (input: GranolaIntakeClassificationInput) =>
        input.signals.map((s) => ({ ref: s.ref, fields: {} })),
      postSeed: async (_channel: string, text: string) => {
        posts.push(text);
        return { ts: `ts-${posts.length}` };
      },
    };

    await runGranolaIntakeBridgeOnce(store, seedStore, baseConfig(), deps);
    const second = await runGranolaIntakeBridgeOnce(store, seedStore, baseConfig(), deps);

    expect(posts).toHaveLength(1);
    expect(second).toMatchObject({ posted: 0, skipped: 1 });
  });

  it('respects the lookback bound', async () => {
    const store = new MemoryStorage();
    await seedRawNote(store, { noteId: 'note-old', attendees: [{ email: 'client@acme.com' }] });
    await seedSignal(store, {
      noteId: 'note-old',
      signalType: 'action',
      text: 'stale',
      dedupeKey: 'granola:signal:note-old:v1:action:old',
      timestamp: '2020-01-01T00:00:00.000Z',
    });
    const seedStore = await tempSeedStore();
    let classifyCalls = 0;

    const result = await runGranolaIntakeBridgeOnce(
      store,
      seedStore,
      baseConfig({ lookbackMs: 24 * 60 * 60 * 1000 }),
      {
        classify: async (input) => {
          classifyCalls += 1;
          return input.signals.map((s) => ({ ref: s.ref, fields: {} }));
        },
        postSeed: async () => ({ ts: 'x' }),
      },
    );

    expect(classifyCalls).toBe(0);
    expect(result).toMatchObject({ status: 'ok', notes_seen: 0 });
  });

  it('records a failed post and reports it', async () => {
    const store = new MemoryStorage();
    await seedRawNote(store, { noteId: 'note-4', attendees: [{ email: 'client@acme.com' }] });
    await seedSignal(store, {
      noteId: 'note-4',
      signalType: 'action',
      text: 'fail me',
      dedupeKey: 'granola:signal:note-4:v1:action:f1',
    });
    const seedStore = await tempSeedStore();

    const result = await runGranolaIntakeBridgeOnce(
      store,
      seedStore,
      baseConfig({ maxRetries: 1 }),
      {
        classify: async (input) => input.signals.map((s) => ({ ref: s.ref, fields: {} })),
        postSeed: async () => {
          throw new Error('slack 500');
        },
      },
    );

    expect(result).toMatchObject({ status: 'ok', failed: 1, posted: 0 });
    const record = await seedStore.get('granola:signal:note-4:v1:action:f1');
    expect(record?.status).toBe('failed');
    expect(record?.last_error).toContain('slack 500');
  });
});
