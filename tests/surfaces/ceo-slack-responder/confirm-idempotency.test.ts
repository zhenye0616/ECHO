import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  TEAM_DECISION_SOURCE,
  createTeamDecisionStore,
} from '../../../src/surfaces/ceo-slack-responder/decision-store.js';
import { FileDecisionDraftStore } from '../../../src/surfaces/ceo-slack-responder/draft-store.js';
import {
  respondToDecisionAction,
  type DecisionAction,
  type ResponderConfig,
} from '../../../src/surfaces/ceo-slack-responder/responder.js';
import { MemoryStorage } from '../../../src/storage/memory.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('decision confirm idempotency', () => {
  it('consumes a Slack retry/double-click once and appends no duplicate shared atoms', async () => {
    const { filePath } = await tempDraftPath();
    const draftStore = new FileDecisionDraftStore(filePath);
    const storage = new MemoryStorage();
    const decisionStore = createTeamDecisionStore(storage);
    const draft = await draftStore.createDraft({
      subject: 'Auth storage',
      decision: 'We moved auth sessions to Postgres.',
      author: 'avery-machine',
      source_app: 'codex',
    });
    const posts: string[] = [];
    const action = confirmAction(draft.draft_id);

    await Promise.all([
      respondToDecisionAction(action, config(), {
        decisionDraftStore: draftStore,
        teamDecisionStore: decisionStore,
        postSlackMessage: async (_token, _channel, text) => {
          posts.push(text);
        },
      }),
      respondToDecisionAction(action, config(), {
        decisionDraftStore: draftStore,
        teamDecisionStore: decisionStore,
        postSlackMessage: async (_token, _channel, text) => {
          posts.push(text);
        },
      }),
    ]);

    const atoms = await storage.query({ source: TEAM_DECISION_SOURCE });
    expect(atoms).toHaveLength(1);
    expect(await draftStore.getDraft(draft.draft_id)).toMatchObject({
      status: 'confirmed',
      confirmed_by: 'blake',
      decision_atom_id: atoms[0]!.id,
    });
    expect(posts).toHaveLength(2);
    expect(posts.every((post) => post.includes('Confirmed shared decision'))).toBe(true);
  });

  it('replays a crash after decision append by returning the existing draft atom', async () => {
    const { filePath } = await tempDraftPath();
    const draftStore = new FileDecisionDraftStore(filePath);
    const storage = new MemoryStorage();
    const decisionStore = createTeamDecisionStore(storage);
    const draft = await draftStore.createDraft({
      subject: 'Pricing launch',
      decision: 'We will launch with one paid tier.',
      author: 'avery-machine',
      source_app: 'claude-code',
    });

    await expect(
      draftStore.confirmDraft(draft.draft_id, 'blake', async (input) => {
        await decisionStore.appendConfirmedDecision(input);
        throw new Error('simulated crash before draft persistence');
      }),
    ).rejects.toThrow(/simulated crash/);

    const afterCrash = await storage.query({ source: TEAM_DECISION_SOURCE });
    expect(afterCrash).toHaveLength(1);
    expect(await draftStore.getDraft(draft.draft_id)).toMatchObject({ status: 'pending' });

    const confirmed = await draftStore.confirmDraft(draft.draft_id, 'blake', (input) =>
      decisionStore.appendConfirmedDecision(input),
    );

    const afterReplay = await storage.query({ source: TEAM_DECISION_SOURCE });
    expect(afterReplay).toHaveLength(1);
    expect(confirmed).toMatchObject({
      status: 'confirmed',
      decision_atom_id: afterCrash[0]!.id,
    });
  });
});

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
    cofounderIdentities: [{ id: 'blake', slack_user_id: 'UBL' }],
  };
}

function confirmAction(draftId: string): DecisionAction {
  return {
    kind: 'confirm',
    draftId,
    channel: 'CDECIDE',
    user: 'UBL',
    ts: '171000.1',
  };
}

async function tempDraftPath(): Promise<{ dir: string; filePath: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'echo-team-decision-drafts-'));
  tempDirs.push(dir);
  return { dir, filePath: join(dir, 'drafts.json') };
}
