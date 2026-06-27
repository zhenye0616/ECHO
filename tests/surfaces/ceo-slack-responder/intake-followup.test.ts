import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  FileIntakeDraftStore,
  intakeThreadKey,
} from '../../../src/surfaces/ceo-slack-responder/intake-draft-store.js';
import {
  respondToQuestion,
  type ResponderConfig,
  type SlackQuestion,
} from '../../../src/surfaces/ceo-slack-responder/responder.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('Slack Linear intake follow-ups', () => {
  it('asks at most two plain-language questions and creates nothing while context is missing', async () => {
    const { store } = await tempStore();
    const posts: string[] = [];
    const createIssue = async () => {
      throw new Error('create should not run while fields are missing');
    };

    await respondToQuestion(
      question('Claudia needs real-time amendment alerts.', 'env-1'),
      config(),
      {
        intakeDraftStore: store,
        linearClient: { createIssue },
        postSlackMessage: async (_token, _channel, text) => {
          posts.push(text);
        },
      },
    );

    expect(posts[0]).toBe('Looking...');
    expect(posts[1]).toContain('I can create this issue once I have the missing context');
    expect(posts[1]!.match(/^\d+\./gm) ?? []).toHaveLength(2);
    expect(posts[1]).not.toMatch(/branch|file|test plan|implementation/i);
  });

  it('accumulates top-level and threaded follow-up state under one thread key', async () => {
    const { store } = await tempStore();

    await respondToQuestion(
      question('Claudia needs real-time amendment alerts.', 'env-1'),
      config(),
      {
        intakeDraftStore: store,
        linearClient: { createIssue: async () => ({ id: 'LIN-1', url: 'url' }) },
        postSlackMessage: async () => undefined,
      },
    );
    await respondToQuestion(
      question(
        [
          'Why: compliance reviewers need to see amendments quickly.',
          'Client outcome: Claudia users can see changed bill text.',
        ].join('\n'),
        'env-2',
        { ts: '200.1', threadTs: '100.1' },
      ),
      config(),
      {
        intakeDraftStore: store,
        linearClient: { createIssue: async () => ({ id: 'LIN-1', url: 'url' }) },
        postSlackMessage: async () => undefined,
      },
    );

    const draft = await store.getDraft(
      intakeThreadKey({ teamId: 'T1', channelId: 'CENG', rootTs: '100.1' }),
    );
    expect(draft?.fields).toMatchObject({
      clientProject: 'claudia',
      why: 'compliance reviewers need to see amendments quickly.',
      clientOutcome: 'Claudia users can see changed bill text.',
    });
  });

  it('does not collide across channels with the same root timestamp', async () => {
    const { store } = await tempStore();
    const deps = {
      intakeDraftStore: store,
      linearClient: { createIssue: async () => ({ id: 'LIN-1', url: 'url' }) },
      postSlackMessage: async () => undefined,
    };

    await respondToQuestion(
      question('Claudia needs alerts.', 'env-1', { channel: 'CONE' }),
      config(),
      deps,
    );
    await respondToQuestion(
      question('Claudia needs exports.', 'env-2', { channel: 'CTWO' }),
      config(),
      deps,
    );

    expect(
      await store.getDraft(intakeThreadKey({ teamId: 'T1', channelId: 'CONE', rootTs: '100.1' })),
    ).not.toBeNull();
    expect(
      await store.getDraft(intakeThreadKey({ teamId: 'T1', channelId: 'CTWO', rootTs: '100.1' })),
    ).not.toBeNull();
  });

  it('treats an unmapped project as missing context and asks from known projects', async () => {
    const { store } = await tempStore();
    const posts: string[] = [];

    await respondToQuestion(
      question(
        [
          'Client/project: Acme',
          'Request: Add export receipts.',
          'Why: the client asks for audit proof.',
          'Client outcome: operators can show delivery proof.',
          'Evidence/example: current exports have no receipt.',
          'Done when: a receipt appears after export.',
          'Urgency: high',
          'Client-facing: yes',
        ].join('\n'),
        'env-1',
      ),
      config(),
      {
        intakeDraftStore: store,
        linearClient: { createIssue: async () => ({ id: 'LIN-1', url: 'url' }) },
        postSlackMessage: async (_token, _channel, text) => {
          posts.push(text);
        },
      },
    );

    expect(posts.join('\n')).toContain('Choose one: claudia');
    expect(posts.join('\n')).not.toContain('Confirm Linear issue');
  });
});

async function tempStore(): Promise<{ dir: string; store: FileIntakeDraftStore }> {
  const dir = await mkdtemp(join(tmpdir(), 'echo-linear-intake-'));
  tempDirs.push(dir);
  return { dir, store: new FileIntakeDraftStore(join(dir, 'drafts.json')) };
}

function config(): ResponderConfig {
  return {
    slackAppToken: 'xapp-token',
    slackBotToken: 'xoxb-token',
    echoMcpUrl: 'http://127.0.0.1:38478/mcp',
    contextRepoPath: '/Users/zhenye/justinian.ai',
    allowedChannelIds: [],
    eventLogPath: 'raw/internal/ceo-loop-events.md',
    maxMatches: 5,
    brain: 'codex',
    brainTimeoutMs: 180000,
    cofounderIdentities: [],
    linearConfig: {
      apiKey: 'lin-key',
      teamId: 'team-id',
      inboxStateId: 'inbox-state-id',
      defaultAssigneeId: 'zhen-id',
      defaultProjectId: 'echo-project',
      projectMap: { claudia: 'claudia-project' },
    },
  };
}

function question(
  text: string,
  eventId: string,
  overrides: Partial<SlackQuestion> = {},
): SlackQuestion {
  return {
    envelopeId: eventId,
    eventId,
    teamId: 'T1',
    channel: 'CENG',
    user: 'UREQ',
    text,
    ts: '100.1',
    ...overrides,
  };
}
