import { describe, expect, it } from 'vitest';

import {
  answerQuestion,
  extractQuestion,
  formatUsageRecord,
  loadResponderConfig,
  normalizeSlackQuestionText,
  respondToQuestion,
  type ResponderConfig,
  type SlackQuestion,
} from '../../src/surfaces/ceo-slack-responder/responder.js';
import type { BrainResult } from '../../src/surfaces/ceo-slack-responder/brain.js';

describe('ceo-slack-responder', () => {
  it('loads Slack, scoped ECHO, and brain config from env', () => {
    const config = loadResponderConfig({
      ECHO_SLACK_APP_TOKEN: 'xapp-token',
      ECHO_SLACK_BOT_TOKEN: 'xoxb-token',
      ECHO_CEO_CONTEXT_REPO_PATH: '/Users/zhenye/justinian.ai',
      ECHO_CEO_SLACK_CHANNEL_IDS: 'C123, D456 ',
      ECHO_CEO_MAX_MATCHES: '3',
      ECHO_CEO_BRAIN: 'claude',
      ECHO_CEO_BRAIN_TIMEOUT_MS: '90000',
      ECHO_SLACK_RESPONDER_INTAKE_ONLY: 'yes',
      ECHO_INTAKE_AGENT_PROVIDER: 'claude-agent-sdk',
      ECHO_INTAKE_AGENT_MODEL: 'claude-sonnet-4-6',
      ECHO_INTAKE_AGENT_MAX_TURNS: '7',
    });

    expect(config).toMatchObject({
      slackAppToken: 'xapp-token',
      slackBotToken: 'xoxb-token',
      echoMcpUrl: 'http://127.0.0.1:38478/mcp',
      contextRepoPath: '/Users/zhenye/justinian.ai',
      allowedChannelIds: ['C123', 'D456'],
      maxMatches: 3,
      brain: 'claude',
      brainTimeoutMs: 90000,
      intakeOnly: true,
      intakeAgentProvider: 'claude',
      intakeAgentModel: 'claude-sonnet-4-6',
      intakeAgentMaxTurns: 7,
    });
  });

  it('defaults to the codex brain and 180s timeout', () => {
    const config = loadResponderConfig({
      ECHO_SLACK_APP_TOKEN: 'xapp-token',
      ECHO_SLACK_BOT_TOKEN: 'xoxb-token',
      ECHO_CEO_CONTEXT_REPO_PATH: '/Users/zhenye/justinian.ai',
    });

    expect(config.brain).toBe('codex');
    expect(config.brainTimeoutMs).toBe(180000);
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

  it('rejects unknown brain selections', () => {
    expect(() =>
      loadResponderConfig({
        ECHO_SLACK_APP_TOKEN: 'xapp-token',
        ECHO_SLACK_BOT_TOKEN: 'xoxb-token',
        ECHO_CEO_CONTEXT_REPO_PATH: '/Users/zhenye/justinian.ai',
        ECHO_CEO_BRAIN: 'linear',
      }),
    ).toThrow(/codex or claude/);
  });

  it('rejects unknown intake agent providers', () => {
    expect(() =>
      loadResponderConfig({
        ECHO_SLACK_APP_TOKEN: 'xapp-token',
        ECHO_SLACK_BOT_TOKEN: 'xoxb-token',
        ECHO_CEO_CONTEXT_REPO_PATH: '/Users/zhenye/justinian.ai',
        ECHO_INTAKE_AGENT_PROVIDER: 'raw-llm',
      }),
    ).toThrow(/deterministic, claude, or codex/);
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

  it('invokes the selected brain with the scoped repo and timeout', async () => {
    const calls: Array<{
      question: string;
      brain: string;
      repo: string;
      timeoutMs: number;
      echoMcpUrl: string | undefined;
    }> = [];
    const result: BrainResult = {
      ok: true,
      outcome: 'ok',
      durationMs: 42,
      answer: 'Observability was built so the funnel is debuggable.',
    };

    const answer = await answerQuestion(
      question(),
      {
        brain: 'codex',
        brainTimeoutMs: 1234,
        contextRepoPath: '/Users/zhenye/justinian.ai',
        echoMcpUrl: 'http://127.0.0.1:38478/mcp',
      },
      async (asked, opts) => {
        calls.push({
          question: asked,
          brain: opts.brain,
          repo: opts.contextRepoPath,
          timeoutMs: opts.timeoutMs,
          echoMcpUrl: opts.env?.ECHO_MCP_URL,
        });
        return result;
      },
    );

    expect(answer).toBe(result);
    expect(calls).toEqual([
      {
        question: 'why did we build the observability layer?',
        brain: 'codex',
        repo: '/Users/zhenye/justinian.ai',
        timeoutMs: 1234,
        echoMcpUrl: 'http://127.0.0.1:38478/mcp',
      },
    ]);
  });

  it('posts the threaded ack before the brain resolves, then posts the synthesized answer', async () => {
    const pending = deferred<BrainResult>();
    const posts: Array<{ text: string; threadTs?: string }> = [];
    const records: BrainResult[] = [];

    const done = respondToQuestion(question(), config(), {
      runBrain: async () => pending.promise,
      postSlackMessage: async (_token, _channel, text, threadTs) => {
        posts.push({ text, threadTs });
      },
      appendUsageRecord: async (_path, _question, _brain, result) => {
        records.push(result);
      },
    });

    await Promise.resolve();
    expect(posts).toEqual([{ text: 'Looking...', threadTs: '171000.1' }]);

    pending.resolve({
      ok: true,
      outcome: 'ok',
      durationMs: 55,
      answer: 'We built observability to spot and debug funnel drops quickly.',
    });
    await done;

    expect(posts).toEqual([
      { text: 'Looking...', threadTs: '171000.1' },
      {
        text: 'We built observability to spot and debug funnel drops quickly.',
        threadTs: '171000.1',
      },
    ]);
    expect(records).toHaveLength(1);
    expect(records[0]?.outcome).toBe('ok');
  });

  it('posts a bounded failure follow-up when the brain fails', async () => {
    const posts: string[] = [];

    await respondToQuestion(question(), config(), {
      runBrain: async () => ({
        ok: false,
        outcome: 'timeout',
        durationMs: 180000,
        reason: 'timed out after 180000ms',
      }),
      postSlackMessage: async (_token, _channel, text) => {
        posts.push(text);
      },
      appendUsageRecord: async () => undefined,
    });

    expect(posts).toEqual([
      'Looking...',
      'Could not synthesize an answer - timed out after 180000ms',
    ]);
  });

  it('formats the extended brain usage record', () => {
    const record = formatUsageRecord(
      {
        envelopeId: 'env-1',
        channel: 'D123',
        user: 'UCEO',
        text: 'why "observability"?',
        ts: '171000.1',
      },
      'codex',
      {
        ok: false,
        outcome: 'error',
        durationMs: 12.4,
        reason: 'stderr line '.repeat(30),
      },
      new Date('2026-06-19T19:00:00Z'),
    );

    expect(record).toContain('2026-06-19T19:00:00.000Z');
    expect(record).toContain('thread=171000.1');
    expect(record).toContain('brain=codex');
    expect(record).toContain('outcome=error');
    expect(record).toContain('duration_ms=12');
    expect(record).toContain('reason="');
    expect(record).toContain('question="why \\"observability\\"?"');
    expect(record).not.toContain('session_id');
    expect(record).not.toContain('intent_category');
    const reason = record.match(/reason="([^"]*)"/)?.[1] ?? '';
    expect(reason.length).toBeLessThanOrEqual(200);
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
  };
}

function question(): SlackQuestion {
  return {
    envelopeId: 'env-1',
    channel: 'D123',
    user: 'UCEO',
    text: 'why did we build the observability layer?',
    ts: '171000.1',
  };
}

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolveFn: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    resolveFn = resolve;
  });
  return { promise, resolve: resolveFn };
}
