import { describe, expect, it } from 'vitest';

import {
  answerQuestion,
  buildSlackAnswer,
  deriveFallbackQuery,
  extractQuestion,
  formatUsageRecord,
  loadResponderConfig,
  normalizeSlackQuestionText,
  type EchoToolClient,
} from '../../src/surfaces/ceo-slack-responder/responder.js';

describe('ceo-slack-responder', () => {
  it('loads the required Slack and scoped ECHO config from env', () => {
    const config = loadResponderConfig({
      ECHO_SLACK_APP_TOKEN: 'xapp-token',
      ECHO_SLACK_BOT_TOKEN: 'xoxb-token',
      ECHO_CEO_CONTEXT_REPO_PATH: '/Users/zhenye/justinian.ai',
      ECHO_CEO_SLACK_CHANNEL_IDS: 'C123, D456 ',
      ECHO_CEO_MAX_MATCHES: '3',
    });

    expect(config).toMatchObject({
      slackAppToken: 'xapp-token',
      slackBotToken: 'xoxb-token',
      echoMcpUrl: 'http://127.0.0.1:38478/mcp',
      contextRepoPath: '/Users/zhenye/justinian.ai',
      allowedChannelIds: ['C123', 'D456'],
      maxMatches: 3,
    });
  });

  it('requires an absolute scoped repo path', () => {
    expect(() =>
      loadResponderConfig({
        ECHO_SLACK_APP_TOKEN: 'xapp-token',
        ECHO_SLACK_BOT_TOKEN: 'xoxb-token',
        ECHO_CEO_CONTEXT_REPO_PATH: 'relative/path',
      }),
    ).toThrow(/absolute path/);
  });

  it('extracts direct-message and designated-channel questions while ignoring bot echoes', () => {
    const direct = extractQuestion(
      {
        type: 'events_api',
        envelope_id: 'env-1',
        payload: {
          event: {
            type: 'message',
            channel_type: 'im',
            channel: 'D123',
            user: 'UCEO',
            text: '<@UBOT> why observability?',
            ts: '171000.1',
          },
        },
      },
      [],
    );

    expect(direct).toMatchObject({
      envelopeId: 'env-1',
      channel: 'D123',
      user: 'UCEO',
      text: 'why observability?',
    });

    const channel = extractQuestion(
      {
        type: 'events_api',
        envelope_id: 'env-2',
        payload: {
          event: {
            type: 'message',
            channel_type: 'channel',
            channel: 'COK',
            user: 'UCEO',
            text: 'why JUS-17?',
          },
        },
      },
      ['COK'],
    );
    expect(channel?.text).toBe('why JUS-17?');

    const ignoredBot = extractQuestion(
      {
        type: 'events_api',
        envelope_id: 'env-3',
        payload: {
          event: {
            type: 'message',
            bot_id: 'B123',
            channel: 'COK',
            user: 'UBOT',
            text: 'loop',
          },
        },
      },
      ['COK'],
    );
    expect(ignoredBot).toBeNull();
  });

  it('does not answer ordinary public-channel messages outside the designated channels', () => {
    const question = extractQuestion(
      {
        type: 'events_api',
        envelope_id: 'env-4',
        payload: {
          event: {
            type: 'message',
            channel_type: 'channel',
            channel: 'CRANDOM',
            user: 'UCEO',
            text: 'why did we decide this?',
          },
        },
      },
      ['COK'],
    );

    expect(question).toBeNull();
  });

  it('normalizes Slack mentions and whitespace', () => {
    expect(normalizeSlackQuestionText(' <@U123>   why   observability? \n')).toBe(
      'why observability?',
    );
  });

  it('derives a literal-search fallback token from a natural-language why question', () => {
    expect(deriveFallbackQuery('why did we build the observability layer?')).toBe('observability');
  });

  it('queries search_memories with the scoped repo path and formats a compact answer', async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const callTool: EchoToolClient['callTool'] = async <T>(
      name: string,
      args: Record<string, unknown>,
    ) => {
      calls.push({ name, args });
      return {
        matches: [
          {
            id: 'm1',
            source: 'fs:/example/session.jsonl',
            timestamp: '2026-06-19T18:00:00.000Z',
            content: 'WHY: observability makes the funnel visible so drops are debuggable.',
          },
        ],
      } as T;
    };

    const answer = await answerQuestion(
      {
        envelopeId: 'env-1',
        channel: 'D123',
        user: 'UCEO',
        text: 'why observability?',
      },
      { callTool },
      { contextRepoPath: '/Users/zhenye/justinian.ai', maxMatches: 4 },
    );

    expect(calls).toEqual([
      {
        name: 'search_memories',
        args: {
          query: 'why observability?',
          repo_path: '/Users/zhenye/justinian.ai',
          limit: 4,
        },
      },
    ]);
    expect(answer).toContain('Scoped ECHO context: /Users/zhenye/justinian.ai');
    expect(answer).toContain('WHY: observability makes the funnel visible');
    expect(answer).toContain('fs:/example/session.jsonl @ 2026-06-19T18:00:00.000Z');
  });

  it('falls back to one scoped keyword search when the literal question has no matches', async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const callTool: EchoToolClient['callTool'] = async <T>(
      name: string,
      args: Record<string, unknown>,
    ) => {
      calls.push({ name, args });
      return {
        matches:
          args.query === 'observability'
            ? [
                {
                  id: 'm1',
                  source: 'fs:/example/session.jsonl',
                  timestamp: '2026-06-19T18:00:00.000Z',
                  content: 'WHY: observability makes drops visible.',
                },
              ]
            : [],
      } as T;
    };

    const answer = await answerQuestion(
      {
        envelopeId: 'env-1',
        channel: 'D123',
        user: 'UCEO',
        text: 'why did we build observability?',
      },
      { callTool },
      { contextRepoPath: '/Users/zhenye/justinian.ai', maxMatches: 4 },
    );

    expect(calls).toEqual([
      {
        name: 'search_memories',
        args: {
          query: 'why did we build observability?',
          repo_path: '/Users/zhenye/justinian.ai',
          limit: 4,
        },
      },
      {
        name: 'search_memories',
        args: {
          query: 'observability',
          repo_path: '/Users/zhenye/justinian.ai',
          limit: 4,
        },
      },
    ]);
    expect(answer).toContain('WHY: observability makes drops visible.');
  });

  it('formats no-match answers without widening scope', () => {
    expect(buildSlackAnswer('why x?', [], '/repo')).toBe(
      'Scoped ECHO context: /repo\n\nI did not find scoped context for: "why x?".',
    );
  });

  it('formats the minimal AC4 usage record without session or intent schema', () => {
    const record = formatUsageRecord(
      {
        envelopeId: 'env-1',
        channel: 'D123',
        user: 'UCEO',
        text: 'why "observability"?',
      },
      new Date('2026-06-19T19:00:00Z'),
    );

    expect(record).toBe(
      '2026-06-19T19:00:00.000Z · unprompted?=unknown · satisfied-or-DMed-anyway=unknown · channel=D123 · user=UCEO · question="why \\"observability\\"?"\n',
    );
    expect(record).not.toContain('session_id');
    expect(record).not.toContain('intent_category');
  });
});
