import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { CAPTURED_SOURCES } from '../../../src/capture/sources.js';
import {
  FileIntakeDraftStore,
  intakeThreadKey,
} from '../../../src/surfaces/ceo-slack-responder/intake-draft-store.js';
import type { LinearIssueCreateInput } from '../../../src/surfaces/ceo-slack-responder/linear-client.js';
import {
  extractQuestion,
  respondToIntakeAction,
  respondToQuestion,
  type IntakeAction,
  type ResponderConfig,
  type SlackQuestion,
} from '../../../src/surfaces/ceo-slack-responder/responder.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('Slack Linear intake gate', () => {
  it('turns a complete plain-English request into a requester-confirmed Linear Inbox issue', async () => {
    const { store } = await tempStore();
    const calls: LinearIssueCreateInput[] = [];
    const posts: string[] = [];
    const confirmCards: string[] = [];

    await respondToQuestion(completeQuestion(), config(), {
      intakeDraftStore: store,
      linearClient: {
        createIssue: async (input) => {
          calls.push(input);
          return { id: 'LIN-1', url: 'https://linear.app/echo/issue/LIN-1' };
        },
      },
      postSlackMessage: async (_token, _channel, text) => {
        posts.push(text);
      },
      postIntakeConfirmCard: async (_token, _channel, draft) => {
        confirmCards.push(draft.key);
      },
    });

    const key = intakeThreadKey({ teamId: 'T1', channelId: 'CENG', rootTs: '100.1' });
    expect(posts).toEqual(['Looking...']);
    expect(confirmCards).toEqual([key]);
    expect(calls).toHaveLength(0);

    await respondToIntakeAction(confirmAction(key), config(), {
      intakeDraftStore: store,
      linearClient: {
        createIssue: async (input) => {
          calls.push(input);
          return { id: 'LIN-1', url: 'https://linear.app/echo/issue/LIN-1' };
        },
      },
      postSlackMessage: async (_token, _channel, text) => {
        posts.push(text);
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      teamId: 'team-id',
      projectId: 'claudia-project',
      stateId: 'inbox-state-id',
      assigneeId: 'zhen-id',
      title: 'Add real-time amendment alerts.',
    });
    expect(calls[0]?.body).toContain('Requester: Taylor');
    expect(calls[0]?.body).toContain('Slack thread: https://slack.com/archives/CENG/p1001');
    expect(posts.at(-1)).toContain(
      'Created https://linear.app/echo/issue/LIN-1 in claudia, status Inbox.',
    );
    expect(posts.at(-1)).toContain('- done-when');
  });

  it('preserves complete labeled intake fields when entered through the production Slack envelope path', async () => {
    const { store } = await tempStore();
    const posts: string[] = [];
    const confirmCards: string[] = [];
    const question = extractQuestion(
      {
        type: 'events_api',
        envelope_id: 'env-1',
        payload: {
          event_id: 'event-1',
          team_id: 'T1',
          event: {
            type: 'app_mention',
            channel: 'CENG',
            user: 'UREQ',
            ts: '100.1',
            text: `<@UECHO> ${completeQuestion().text}`,
          },
        },
      },
      [],
    );

    expect(question).not.toBeNull();
    await respondToQuestion(question!, config(), {
      intakeDraftStore: store,
      linearClient: {
        createIssue: async () => {
          throw new Error('create should wait for requester confirm');
        },
      },
      postSlackMessage: async (_token, _channel, text) => {
        posts.push(text);
      },
      postIntakeConfirmCard: async (_token, _channel, draft) => {
        confirmCards.push(draft.key);
      },
    });

    expect(posts).toEqual(['Looking...']);
    expect(confirmCards).toEqual([
      intakeThreadKey({ teamId: 'T1', channelId: 'CENG', rootTs: '100.1' }),
    ]);
  });

  it('does not add Slack to the capture source allowlist', () => {
    expect(CAPTURED_SOURCES.apis).not.toContain('slack');
    expect(CAPTURED_SOURCES.domains).not.toHaveProperty('slack.com');
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
    cofounderIdentities: [{ id: 'taylor', slack_user_id: 'UREQ', display_name: 'Taylor' }],
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

function completeQuestion(): SlackQuestion {
  return {
    envelopeId: 'env-1',
    eventId: 'event-1',
    teamId: 'T1',
    channel: 'CENG',
    user: 'UREQ',
    ts: '100.1',
    text: [
      'Client/project: Claudia',
      'Request: Add real-time amendment alerts.',
      'Why: compliance reviewers need to know when a bill changes.',
      'Client outcome: users can see exactly what changed in the bill text.',
      'Evidence/example: California bill amendments currently require manual comparison.',
      'Done when: an alert links to the changed bill text.',
      'Urgency: high',
      'Client-facing: yes',
    ].join('\n'),
  };
}

function confirmAction(draftKey: string): IntakeAction {
  return {
    kind: 'confirm',
    draftKey,
    channel: 'CENG',
    user: 'UREQ',
    ts: '100.1',
  };
}
