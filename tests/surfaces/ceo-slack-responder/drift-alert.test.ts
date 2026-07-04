import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  extractDriftAction,
  respondToDriftAction,
  formatDriftDismissalRecord,
  type DriftAction,
  type ResponderConfig,
} from '../../../src/surfaces/ceo-slack-responder/responder.js';
import type { CofounderIdentity } from '../../../src/surfaces/ceo-slack-responder/identity.js';
import {
  cofounderIdToSlackUserId,
  postDriftAlertCard,
  type DriftAlertPayload,
} from '../../../src/enrich/decision-drift.js';

const tempDirs: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) await rm(dir, { recursive: true, force: true });
  }
});

const IDENTITIES: CofounderIdentity[] = [
  { id: 'alice', slack_user_id: 'U-ALICE' },
  { id: 'bob', slack_user_id: 'U-BOB', display_name: 'Bob' },
];

function config(overrides: Partial<ResponderConfig> = {}): ResponderConfig {
  return {
    slackAppToken: 'xapp-token',
    slackBotToken: 'xoxb-token',
    echoMcpUrl: 'http://127.0.0.1:38478/mcp',
    contextRepoPath: '/Users/zhenye/echo',
    allowedChannelIds: [],
    eventLogPath: 'raw/internal/ceo-loop-events.md',
    maxMatches: 5,
    brain: 'codex',
    brainTimeoutMs: 180000,
    cofounderIdentities: IDENTITIES,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AC5 — reverse lookup
// ---------------------------------------------------------------------------

describe('cofounderIdToSlackUserId', () => {
  it('resolves a cofounder id to its slack user id', () => {
    expect(cofounderIdToSlackUserId(IDENTITIES, 'alice')).toBe('U-ALICE');
    expect(cofounderIdToSlackUserId(IDENTITIES, 'bob')).toBe('U-BOB');
  });
  it('returns null for a blank or unknown id', () => {
    expect(cofounderIdToSlackUserId(IDENTITIES, '')).toBeNull();
    expect(cofounderIdToSlackUserId(IDENTITIES, 'mallory')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC5 — button envelope extraction
// ---------------------------------------------------------------------------

describe('extractDriftAction', () => {
  function envelope(actionId: string, value: string): unknown {
    return {
      type: 'interactive',
      payload: {
        user: { id: 'U-ALICE' },
        channel: { id: 'D-ALICE' },
        message: { ts: '17.1', thread_ts: '17.0' },
        actions: [{ action_id: actionId, value }],
      },
    };
  }

  it('parses an acknowledge action carrying the pair key', () => {
    const action = extractDriftAction(envelope('echo_drift_acknowledge', 'pk-1') as never);
    expect(action).not.toBeNull();
    expect(action?.kind).toBe('acknowledge');
    expect(action?.pairKey).toBe('pk-1');
  });

  it('parses a dismiss action', () => {
    const action = extractDriftAction(envelope('echo_drift_dismiss', 'pk-2') as never);
    expect(action?.kind).toBe('dismiss');
    expect(action?.pairKey).toBe('pk-2');
  });

  it('ignores non-drift action ids', () => {
    expect(extractDriftAction(envelope('echo_decision_confirm', 'pk') as never)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC5 — respondToDriftAction
// ---------------------------------------------------------------------------

describe('respondToDriftAction', () => {
  async function tempEventLog(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'echo-drift-events-'));
    tempDirs.push(dir);
    return join(dir, 'ceo-loop-events.md');
  }

  it('dismiss appends a noise-signal record to the event log and replies', async () => {
    const eventLogPath = await tempEventLog();
    const posts: string[] = [];
    const action: DriftAction = {
      kind: 'dismiss',
      pairKey: 'team-decision:ci::granola:signal:s1::drift-judge@1',
      channel: 'D-ALICE',
      user: 'U-ALICE',
      ts: '17.1',
    };
    await respondToDriftAction(action, config({ eventLogPath }), {
      postSlackMessage: async (_token, _channel, text) => {
        posts.push(text);
      },
    });
    const log = await readFile(eventLogPath, 'utf8');
    expect(log).toContain('drift-alert-dismissed');
    expect(log).toContain('pair_key=team-decision:ci::granola:signal:s1::drift-judge@1');
    expect(log).toContain('dismissed_by=alice'); // slack id → cofounder id attribution
    expect(posts[0]).toBe('Dismissed drift alert.');
  });

  it('acknowledge replies without writing a dismissal record', async () => {
    const eventLogPath = await tempEventLog();
    const posts: string[] = [];
    let appended = false;
    await respondToDriftAction(
      { kind: 'acknowledge', pairKey: 'pk', channel: 'D-ALICE', user: 'U-ALICE' },
      config({ eventLogPath }),
      {
        postSlackMessage: async (_t, _c, text) => {
          posts.push(text);
        },
        appendDriftDismissalRecord: async () => {
          appended = true;
        },
      },
    );
    expect(posts[0]).toBe('Acknowledged drift alert.');
    expect(appended).toBe(false);
  });
});

describe('formatDriftDismissalRecord', () => {
  it('is a single delimited line with pair key and dismisser', () => {
    const line = formatDriftDismissalRecord('pk-1', 'alice', new Date('2026-07-04T00:00:00.000Z'));
    expect(line).toBe(
      '2026-07-04T00:00:00.000Z · drift-alert-dismissed · pair_key=pk-1 · dismissed_by=alice',
    );
  });
});

// ---------------------------------------------------------------------------
// AC5 — daemon-side Block Kit card shape
// ---------------------------------------------------------------------------

describe('postDriftAlertCard', () => {
  const payload: DriftAlertPayload = {
    pair_key: 'team-decision:deploy::granola:signal:s9::drift-judge@1',
    decision_dedupe_key: 'team-decision:deploy',
    statement_dedupe_key: 'granola:signal:s9',
    judge_version: 'drift-judge@1',
    owner_cofounder_id: 'alice',
    owner_slack_user_id: 'U-ALICE',
    decision_subject: 'Deploy target',
    decision_text: 'Deploy on Fly',
    confirmed_at: '2026-07-01T00:00:00.000Z',
    confirmed_by: 'alice',
    quote: 'move everything to Vercel',
    reason: 'reverses the deploy decision',
    meeting_title: 'Infra sync',
    note_id: 'note-9',
    meeting_url: 'https://granola.example/note-9',
  };

  it('DMs the owner with Acknowledge/Dismiss buttons carrying the pair key', async () => {
    let captured: { url: string; body: Record<string, unknown> } | undefined;
    const fetchMock = vi.fn(async (url: string, init: { body: string }) => {
      captured = { url, body: JSON.parse(init.body) as Record<string, unknown> };
      return { ok: true, json: async () => ({ ok: true, ts: '1.1' }) } as unknown as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    await postDriftAlertCard('xoxb-token', payload);

    expect(captured?.url).toBe('https://slack.com/api/chat.postMessage');
    expect(captured?.body.channel).toBe('U-ALICE'); // DM the owner
    const blocks = captured?.body.blocks as Array<Record<string, unknown>>;
    const actions = blocks.find((b) => b.type === 'actions');
    const elements = actions?.elements as Array<Record<string, unknown>>;
    expect(elements.map((e) => e.action_id)).toEqual([
      'echo_drift_acknowledge',
      'echo_drift_dismiss',
    ]);
    expect(elements.every((e) => e.value === payload.pair_key)).toBe(true);
    const section = JSON.stringify(blocks.find((b) => b.type === 'section'));
    expect(section).toContain('Deploy on Fly');
    expect(section).toContain('move everything to Vercel');
    expect(section).toContain('Infra sync');
  });

  it('throws when Slack reports a failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: false, error: 'channel_not_found' }) }) as unknown as Response),
    );
    await expect(postDriftAlertCard('xoxb-token', payload)).rejects.toThrow('channel_not_found');
  });
});
