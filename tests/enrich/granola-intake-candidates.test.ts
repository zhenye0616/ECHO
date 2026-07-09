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
import {
  FileChangesetDraftStore,
  type ChangesetDraft,
} from '../../src/surfaces/ceo-slack-responder/draft-store.js';
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

async function tempChangesetStore(): Promise<FileChangesetDraftStore> {
  const dir = await mkdtemp(join(tmpdir(), 'echo-intake-changesets-'));
  tempDirs.push(dir);
  return new FileChangesetDraftStore(join(dir, 'changesets.json'));
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
      // Item 128: pin the clock so the fixed 2026-06-30 fixtures stay inside the
      // 30d lookback forever (defuses the 2026-07-30 fuse; wall clock would age
      // them out). Fixtures untouched.
      now: () => '2026-06-30T10:06:00.000Z',
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

    // Item 123 AC1: a successful post now appends exactly one card provenance
    // atom (a legacy array-returning classifier reports no run → capture_failed).
    expect(await store.count()).toBe(atomsBefore + 1);
    const cardAtoms = await store.query({ source: 'derived:intake-cards' });
    expect(cardAtoms).toHaveLength(1);
    const cardMeta = cardAtoms[0]?.metadata as Record<string, unknown>;
    expect(cardMeta['candidate_key']).toBe('granola:signal:note-1:v1:action:a1');
    expect(cardMeta['dedupe_key']).toBe('granola:card:granola:signal:note-1:v1:action:a1');
    expect(cardMeta['note_id']).toBe('note-1');
    expect(cardMeta['signal_refs']).toEqual(['granola:signal:note-1:v1:action:a1']);
    expect((cardMeta['classifier_run'] as Record<string, unknown>)['capture_status']).toBe(
      'capture_failed',
    );
    expect(record?.card_atom_status).toBe('written');
  });

  it('routes classified meeting decision cards through one changeset draft and suppresses per-decision seeds', async () => {
    const store = new MemoryStorage();
    await seedRawNote(store, {
      noteId: 'note-decisions',
      title: 'EchoBrain Legal',
      webUrl: 'https://granola.ai/notes/note-decisions',
      attendees: [{ email: 'client@acme.com' }, { email: 'me@echo.dev' }],
    });
    await seedSignal(store, {
      noteId: 'note-decisions',
      signalType: 'decision',
      text: 'Create the legal intake changeset.',
      dedupeKey: 'granola:signal:note-decisions:v1:decision:d1',
      quote: 'We should create the legal intake changeset.',
    });
    await seedSignal(store, {
      noteId: 'note-decisions',
      signalType: 'decision',
      text: 'Stop the old manual intake issue.',
      dedupeKey: 'granola:signal:note-decisions:v1:decision:d2',
      quote: 'Stop the old manual intake issue.',
    });

    const seedStore = await tempSeedStore();
    const changesetStore = await tempChangesetStore();
    const postedChangesets: Array<{ channel: string; draft: ChangesetDraft }> = [];

    const result = await runGranolaIntakeBridgeOnce(store, seedStore, baseConfig(), {
      classify: async (input) =>
        input.signals.map((signal): ClassifiedIntakeCandidate => ({
          ref: signal.ref,
          fields: {
            clientProject: 'EchoBrain Legal',
            request: signal.text,
            why: signal.quote,
          },
          quote: signal.quote,
          decision_type: signal.text.startsWith('Stop') ? 'negative' : 'executable',
        })),
      postSeed: async () => {
        throw new Error('per-decision seed path should not run for changeset batches');
      },
      changesetDraftStore: changesetStore,
      postChangesetDraftCard: async (channel, draft) => {
        postedChangesets.push({ channel, draft });
        return '171.42';
      },
      now: () => '2026-06-30T10:06:00.000Z',
    });

    expect(result).toMatchObject({ status: 'ok', candidates: 2, posted: 1, failed: 0 });
    expect(postedChangesets).toHaveLength(1);
    expect(postedChangesets[0]?.channel).toBe('C-INTAKE');

    const draft = await changesetStore.findChangesetDraftByNoteId('note-decisions');
    expect(draft).toMatchObject({
      note_id: 'note-decisions',
      channel_id: 'C-INTAKE',
      message_ts: '171.42',
      status: 'pending',
    });
    expect(draft?.lines).toHaveLength(2);
    const linesByDecision = new Map(draft?.lines.map((line) => [line.decision, line]));
    expect(linesByDecision.get('Create the legal intake changeset.')?.decision_type).toBe(
      'executable',
    );
    expect(linesByDecision.get('Create the legal intake changeset.')?.mutation.kind).toBe(
      'create',
    );
    expect(linesByDecision.get('Stop the old manual intake issue.')?.decision_type).toBe(
      'negative',
    );
    expect(linesByDecision.get('Stop the old manual intake issue.')?.mutation.kind).toBe('close');
    expect(await seedStore.get('granola:signal:note-decisions:v1:decision:d1')).toBeNull();
    expect(await store.query({ source: 'derived:intake-cards' })).toHaveLength(0);
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
        now: () => '2026-06-30T10:06:00.000Z', // Item 128: pin clock so fixtures stay in-lookback (see first test).
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
      now: () => '2026-06-30T10:06:00.000Z', // Item 128: pin clock so fixtures stay in-lookback (see first test).
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
        now: () => '2026-06-30T10:06:00.000Z', // Item 128: pin clock so fixtures stay in-lookback (see first test).
      },
    );

    expect(result).toMatchObject({ status: 'ok', failed: 1, posted: 0 });
    const record = await seedStore.get('granola:signal:note-4:v1:action:f1');
    expect(record?.status).toBe('failed');
    expect(record?.last_error).toContain('slack 500');
  });
});
