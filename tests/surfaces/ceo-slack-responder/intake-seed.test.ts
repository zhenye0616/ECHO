import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  FileIntakeDraftStore,
  intakeThreadKey,
  type IntakeDraft,
  type IntakeDraftStore,
  type RecordIntakeSeedInput,
  type RecordIntakeSeedResult,
} from '../../../src/surfaces/ceo-slack-responder/intake-draft-store.js';
import {
  renderSeedMarker,
  renderSeedMessage,
  parseSeedMarker,
  type MeetingProvenance,
} from '../../../src/surfaces/ceo-slack-responder/intake-seed.js';
import {
  extractIntakeSeed,
  respondToIntakeAction,
  respondToIntakeSeed,
  type IntakeAction,
  type ResponderConfig,
} from '../../../src/surfaces/ceo-slack-responder/responder.js';
import type { IntakeFields } from '../../../src/surfaces/ceo-slack-responder/brain.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempStore(): Promise<FileIntakeDraftStore> {
  const dir = await mkdtemp(join(tmpdir(), 'echo-intake-seed-'));
  tempDirs.push(dir);
  return new FileIntakeDraftStore(join(dir, 'drafts.json'));
}

const CANDIDATE_KEY = 'granola:signal:note-1:v1:action:a1';
const OWNER = 'UOWNER';

const PROVENANCE: MeetingProvenance = {
  noteId: 'note-1',
  meetingTitle: 'Acme roadmap',
  meetingDate: '2026-06-30',
  webUrl: 'https://granola.ai/notes/note-1',
  quote: 'We need amendment alerts.',
};

function completeFields(): IntakeFields {
  return {
    clientProject: 'Claudia',
    request: 'Add real-time amendment alerts.',
    why: 'compliance reviewers need change awareness.',
    clientOutcome: 'users see exactly what changed.',
    evidence: 'manual comparison today.',
    doneWhen: 'an alert links to the changed bill text.',
    urgency: 'high',
    clientFacing: 'yes',
  };
}

function config(overrides: Partial<ResponderConfig> = {}): ResponderConfig {
  return {
    slackAppToken: 'xapp',
    slackBotToken: 'xoxb',
    echoMcpUrl: 'http://127.0.0.1:38478/mcp',
    contextRepoPath: '/tmp/repo',
    allowedChannelIds: ['C-INTAKE'],
    eventLogPath: join(tmpdir(), 'echo-seed-events.md'),
    maxMatches: 5,
    brain: 'codex',
    brainTimeoutMs: 1000,
    cofounderIdentities: [{ id: 'owner', slack_user_id: OWNER, display_name: 'Owner' }],
    seedAcceptBotId: 'BSELF',
    seedAcceptChannelId: 'C-INTAKE',
    linearConfig: {
      apiKey: 'lin',
      teamId: 'team-id',
      inboxStateId: 'inbox',
      defaultAssigneeId: 'zhen',
      defaultProjectId: 'echo-project',
      projectMap: { claudia: 'claudia-project' },
    },
    ...overrides,
  };
}

function seedEnvelope(opts: {
  text: string;
  botId?: string;
  channel?: string;
  ts?: string;
  eventId?: string;
}): Parameters<typeof extractIntakeSeed>[0] {
  return {
    type: 'events_api',
    envelope_id: `env-${opts.eventId ?? '1'}`,
    payload: {
      event_id: opts.eventId ?? 'event-1',
      team_id: 'T1',
      event: {
        type: 'message',
        bot_id: opts.botId ?? 'BSELF',
        channel: opts.channel ?? 'C-INTAKE',
        ts: opts.ts ?? '200.1',
        text: opts.text,
      },
    },
  };
}

function seedText(fields: IntakeFields = completeFields()): string {
  return renderSeedMessage({
    fields,
    provenance: PROVENANCE,
    ownerSlackId: OWNER,
    candidateKey: CANDIDATE_KEY,
  });
}

describe('seed marker', () => {
  it('round-trips candidate key, owner, fields and provenance', () => {
    const marker = renderSeedMarker({
      candidateKey: CANDIDATE_KEY,
      ownerSlackId: OWNER,
      fields: { request: 'do it' },
      provenance: PROVENANCE,
    });
    const parsed = parseSeedMarker(`hello ${marker} world`);
    expect(parsed).not.toBeNull();
    expect(parsed?.candidateKey).toBe(CANDIDATE_KEY);
    expect(parsed?.ownerSlackId).toBe(OWNER);
    expect(parsed?.fields?.request).toBe('do it');
    expect(parsed?.provenance?.webUrl).toBe(PROVENANCE.webUrl);
  });

  it('returns null for absent, unsupported-version, and malformed markers', () => {
    expect(parseSeedMarker('no marker here')).toBeNull();
    expect(parseSeedMarker('[echo-intake-seed v9 QUJD]')).toBeNull();
    expect(parseSeedMarker('[echo-intake-seed v1 %%%notbase64%%%]')).toBeNull();
    expect(parseSeedMarker('[echo-intake-seed v1 ' + Buffer.from('{}').toString('base64url') + ']')).toBeNull();
  });
});

describe('extractIntakeSeed (AC3 gate)', () => {
  it('accepts a self-bot marker-bearing message in the intake channel', () => {
    const seed = extractIntakeSeed(seedEnvelope({ text: seedText() }), config());
    expect(seed).not.toBeNull();
    expect(seed?.candidateKey).toBe(CANDIDATE_KEY);
    expect(seed?.ownerSlackId).toBe(OWNER);
    expect(seed?.fields.request).toBe(completeFields().request);
    expect(seed?.meetingProvenance?.noteId).toBe('note-1');
  });

  it('ignores a human-authored message containing marker-like text', () => {
    const envelope = seedEnvelope({ text: seedText() });
    // Human message: no bot_id, has a user.
    delete envelope.payload!.event!.bot_id;
    envelope.payload!.event!.user = 'UHUMAN';
    expect(extractIntakeSeed(envelope, config())).toBeNull();
  });

  it('ignores a non-self bot carrying a marker', () => {
    expect(extractIntakeSeed(seedEnvelope({ text: seedText(), botId: 'BOTHER' }), config())).toBeNull();
  });

  it('ignores a marker posted outside the intake channel', () => {
    expect(
      extractIntakeSeed(seedEnvelope({ text: seedText(), channel: 'C-OTHER' }), config()),
    ).toBeNull();
  });

  it('ignores an unsupported/malformed marker', () => {
    expect(extractIntakeSeed(seedEnvelope({ text: '[echo-intake-seed v9 QUJD]' }), config())).toBeNull();
    expect(extractIntakeSeed(seedEnvelope({ text: 'plain follow-up question' }), config())).toBeNull();
  });

  it('ignores everything when the seed carve-out is not configured', () => {
    const noSeedConfig = config({ seedAcceptBotId: undefined, seedAcceptChannelId: undefined });
    expect(extractIntakeSeed(seedEnvelope({ text: seedText() }), noSeedConfig)).toBeNull();
  });
});

describe('respondToIntakeSeed', () => {
  it('creates a draft and posts a confirm card for a complete seed', async () => {
    const store = await tempStore();
    const seed = extractIntakeSeed(seedEnvelope({ text: seedText() }), config())!;
    const confirmCards: string[] = [];
    const posts: string[] = [];

    await respondToIntakeSeed(seed, config(), {
      intakeDraftStore: store,
      linearClient: { createIssue: async () => ({ id: 'x', url: 'x' }) },
      postSlackMessage: async (_t, _c, text) => {
        posts.push(text);
      },
      postIntakeConfirmCard: async (_t, _c, draft) => {
        confirmCards.push(draft.key);
      },
    });

    const key = intakeThreadKey({ teamId: 'T1', channelId: 'C-INTAKE', rootTs: '200.1' });
    expect(confirmCards).toEqual([key]);
    const draft = await store.getDraft(key);
    expect(draft?.candidate_key).toBe(CANDIDATE_KEY);
    expect(draft?.meeting_provenance?.noteId).toBe('note-1');
    expect(draft?.requester.slack_user_id).toBe(OWNER);
    // event-id handled marking lives on the same durable draft record.
    expect(draft?.slack_event_ids).toContain('event-1');
  });

  it('asks follow-up questions for an incomplete seed', async () => {
    const store = await tempStore();
    const seed = extractIntakeSeed(
      seedEnvelope({ text: seedText({ request: 'Add alerts' }) }),
      config(),
    )!;
    const posts: string[] = [];
    const confirmCards: string[] = [];

    await respondToIntakeSeed(seed, config(), {
      intakeDraftStore: store,
      linearClient: { createIssue: async () => ({ id: 'x', url: 'x' }) },
      postSlackMessage: async (_t, _c, text) => {
        posts.push(text);
      },
      postIntakeConfirmCard: async (_t, _c, draft) => {
        confirmCards.push(draft.key);
      },
    });

    expect(confirmCards).toEqual([]);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toContain('I can create this issue once I have the missing context');
  });

  it('is a no-op on a duplicate candidate key (exactly-once draft)', async () => {
    const store = await tempStore();
    const deps = () => {
      const confirmCards: string[] = [];
      return {
        confirmCards,
        deps: {
          intakeDraftStore: store,
          linearClient: { createIssue: async () => ({ id: 'x', url: 'x' }) },
          postSlackMessage: async () => undefined,
          postIntakeConfirmCard: async (_t: string, _c: string, draft: IntakeDraft) => {
            confirmCards.push(draft.key);
          },
        },
      };
    };

    const first = deps();
    await respondToIntakeSeed(
      extractIntakeSeed(seedEnvelope({ text: seedText(), eventId: 'e1', ts: '200.1' }), config())!,
      config(),
      first.deps,
    );
    const second = deps();
    // Same candidate key, different thread/event.
    await respondToIntakeSeed(
      extractIntakeSeed(seedEnvelope({ text: seedText(), eventId: 'e2', ts: '300.9' }), config())!,
      config(),
      second.deps,
    );

    expect(first.confirmCards).toHaveLength(1);
    expect(second.confirmCards).toHaveLength(0);
    const key = intakeThreadKey({ teamId: 'T1', channelId: 'C-INTAKE', rootTs: '200.1' });
    // Only one draft exists (keyed by the first seed's thread root).
    expect(await store.getDraft(key)).not.toBeNull();
    expect(
      await store.getDraft(intakeThreadKey({ teamId: 'T1', channelId: 'C-INTAKE', rootTs: '300.9' })),
    ).toBeNull();
  });

  it('writes the draft durably BEFORE acking the Slack envelope', async () => {
    const real = await tempStore();
    const order: string[] = [];
    const orderingStore: IntakeDraftStore = {
      getDraft: (k) => real.getDraft(k),
      recordMessage: (i) => real.recordMessage(i),
      runCreateOnce: (k, c, fn, at) => real.runCreateOnce(k, c, fn, at),
      dismissDraft: (k, by, at) => real.dismissDraft(k, by, at),
      recordSeed: async (input: RecordIntakeSeedInput): Promise<RecordIntakeSeedResult> => {
        const result = await real.recordSeed(input);
        order.push('write');
        return result;
      },
    };
    const seed = extractIntakeSeed(seedEnvelope({ text: seedText() }), config())!;

    await respondToIntakeSeed(
      seed,
      config(),
      {
        intakeDraftStore: orderingStore,
        linearClient: { createIssue: async () => ({ id: 'x', url: 'x' }) },
        postSlackMessage: async () => undefined,
        postIntakeConfirmCard: async () => undefined,
      },
      () => order.push('ack'),
    );

    expect(order).toEqual(['write', 'ack']);
  });

  it('records a dismissed seeded draft with its originating candidate key', async () => {
    const store = await tempStore();
    const seed = extractIntakeSeed(seedEnvelope({ text: seedText() }), config())!;
    await respondToIntakeSeed(seed, config(), {
      intakeDraftStore: store,
      linearClient: { createIssue: async () => ({ id: 'x', url: 'x' }) },
      postSlackMessage: async () => undefined,
      postIntakeConfirmCard: async () => undefined,
    });

    const key = intakeThreadKey({ teamId: 'T1', channelId: 'C-INTAKE', rootTs: '200.1' });
    const dismissals: IntakeDraft[] = [];
    const action: IntakeAction = {
      kind: 'dismiss',
      draftKey: key,
      channel: 'C-INTAKE',
      user: OWNER,
      ts: '200.1',
    };

    await respondToIntakeAction(action, config(), {
      intakeDraftStore: store,
      linearClient: { createIssue: async () => ({ id: 'x', url: 'x' }) },
      postSlackMessage: async () => undefined,
      appendIntakeSeedDismissalRecord: async (_path, draft) => {
        dismissals.push(draft);
      },
    });

    expect(dismissals).toHaveLength(1);
    expect(dismissals[0]?.candidate_key).toBe(CANDIDATE_KEY);
    expect(dismissals[0]?.status).toBe('dismissed');
  });
});
