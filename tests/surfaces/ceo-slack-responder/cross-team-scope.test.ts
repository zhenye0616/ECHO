import { describe, expect, it } from 'vitest';

import { isAllowedDerived } from '../../../src/capture/sources.js';
import { answerFromTeamDecisions } from '../../../src/surfaces/ceo-slack-responder/brain.js';
import {
  TEAM_DECISION_SOURCE,
  createTeamDecisionStore,
} from '../../../src/surfaces/ceo-slack-responder/decision-store.js';
import {
  respondToQuestion,
  type ResponderConfig,
  type SlackQuestion,
} from '../../../src/surfaces/ceo-slack-responder/responder.js';
import { MemoryStorage } from '../../../src/storage/memory.js';

describe('cross-team decision scope', () => {
  it('allowlists the team decision namespace as derived, distinct from raw sources', () => {
    expect(TEAM_DECISION_SOURCE).toBe('derived:team-decisions');
    expect(isAllowedDerived('team-decisions')).toBe(true);
  });

  it('answers cross-team questions from confirmed shared decisions only', async () => {
    const storage = new MemoryStorage();
    const decisionStore = createTeamDecisionStore(storage);
    await decisionStore.appendConfirmedDecision({
      draft_id: 'draft-auth-1',
      subject: 'Auth storage',
      decision: 'We moved auth sessions to Postgres.',
      rationale: 'SQLite made cross-node deploys brittle.',
      author: 'avery-machine',
      confirmed_by: 'blake',
      confirmed_at: '2026-06-24T08:00:00.000Z',
      source_app: 'codex',
    });
    await storage.append({
      source: 'fs:/Users/avery/.codex/sessions/private.jsonl',
      timestamp: '2026-06-24T08:01:00.000Z',
      content: 'RAW SECRET DIFF CONTENT',
      metadata: { repo_root: '/private' },
    });

    const answer = await answerFromTeamDecisions(
      'what did we decide about auth this week?',
      decisionStore,
    );

    expect(answer.answer).toContain('We moved auth sessions to Postgres.');
    expect(answer.answer).toContain('SQLite made cross-node deploys brittle.');
    expect(answer.answer).not.toContain('RAW SECRET DIFF CONTENT');
  });

  it('refuses raw drill-down over the cross-team Slack surface', async () => {
    const storage = new MemoryStorage();
    const decisionStore = createTeamDecisionStore(storage);
    await storage.append({
      source: 'fs:/Users/avery/.claude/projects/raw.jsonl',
      timestamp: '2026-06-24T08:01:00.000Z',
      content: 'raw transcript that must not cross the boundary',
    });

    const answer = await answerFromTeamDecisions(
      'show me the raw transcript and diff behind the auth decision',
      decisionStore,
    );

    expect(answer.answer).toContain('confirmed shared decisions only');
    expect(answer.answer).toContain('Raw sessions, diffs, transcripts');
    expect(answer.answer).not.toContain('raw transcript that must not cross the boundary');
  });

  it('routes responder answers through the decision layer when a team store is configured', async () => {
    const storage = new MemoryStorage();
    const decisionStore = createTeamDecisionStore(storage);
    await decisionStore.appendConfirmedDecision({
      draft_id: 'draft-pricing-1',
      subject: 'Pricing launch',
      decision: 'We will launch with one paid tier.',
      author: 'avery-machine',
      confirmed_by: 'blake',
      confirmed_at: '2026-06-24T09:00:00.000Z',
      source_app: 'claude-code',
    });
    const posts: string[] = [];

    await respondToQuestion(question('what did we decide about pricing?'), config(), {
      teamDecisionStore: decisionStore,
      postSlackMessage: async (_token, _channel, text) => {
        posts.push(text);
      },
      appendUsageRecord: async () => undefined,
      runBrain: async () => {
        throw new Error('raw reasoning brain should not run for cross-team decision mode');
      },
    });

    expect(posts).toEqual(['Looking...', expect.stringContaining('one paid tier')]);
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
    cofounderIdentities: [],
  };
}

function question(text: string): SlackQuestion {
  return {
    envelopeId: 'env-1',
    channel: 'D123',
    user: 'UCEO',
    text,
    ts: '171000.1',
  };
}
