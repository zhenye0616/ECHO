import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, describe, expect, it } from 'vitest';

import { startMcpServer, type McpServerHandle } from '../../../src/mcp/server.js';
import { createTeamDecisionStore } from '../../../src/surfaces/ceo-slack-responder/decision-store.js';
import { FileDecisionDraftStore } from '../../../src/surfaces/ceo-slack-responder/draft-store.js';
import { proposeDecision } from '../../../src/surfaces/ceo-slack-responder/propose-decision-tool.js';
import { MemoryStorage } from '../../../src/storage/memory.js';
import { captureStdout } from '../../fixtures/stdout.js';

const tempDirs: string[] = [];
let handle: McpServerHandle | null = null;
let restoreStdout: (() => void) | null = null;

afterEach(async () => {
  if (handle !== null) {
    await handle.stop();
    handle = null;
  }
  if (restoreStdout !== null) {
    restoreStdout();
    restoreStdout = null;
  }
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('propose-confirm decision flow', () => {
  it('registers propose_decision on the MCP tool surface', async () => {
    ({ restore: restoreStdout } = captureStdout());
    handle = await startMcpServer(new MemoryStorage(), { port: 0, enable_deadlines: false });

    const tools = await withClient(handle.url, async (client) => client.listTools());

    expect(tools.tools.find((tool) => tool.name === 'propose_decision')).toBeDefined();
  });

  it('returns an operator-visible error and creates no draft without a confirm target', async () => {
    const { filePath } = await tempDraftPath();
    const draftStore = new FileDecisionDraftStore(filePath);

    const result = await proposeDecision(input(), {
      draftStore,
      slackBotToken: 'xoxb-token',
      author: 'avery-machine',
      postDraftCard: async () => undefined,
    });

    expect(result).toEqual({
      ok: false,
      error:
        'propose_decision: ECHO_TEAM_DECISION_CONFIRM_TARGET must be a Slack channel or user id',
    });
    expect(existsSync(filePath)).toBe(false);
  });

  it('creates a durable draft but appends no shared decision until explicit confirm', async () => {
    const { filePath } = await tempDraftPath();
    const draftStore = new FileDecisionDraftStore(filePath);
    const decisionStore = createTeamDecisionStore(new MemoryStorage());
    const postedDraftIds: string[] = [];

    const result = await proposeDecision(input(), {
      draftStore,
      slackBotToken: 'xoxb-token',
      confirmTarget: 'CDECIDE',
      author: 'avery-machine',
      postDraftCard: async (_token, _target, draft) => {
        postedDraftIds.push(draft.draft_id);
      },
    });

    expect(result.ok).toBe(true);
    const draftId = result.ok ? result.value.draft_id : '';
    expect(postedDraftIds).toEqual([draftId]);
    expect(await draftStore.getDraft(draftId)).toMatchObject({
      status: 'pending',
      subject: 'Auth storage',
    });
    expect(await decisionStore.queryLatestDecisions()).toEqual([]);
  });
});

function input() {
  return {
    subject: 'Auth storage',
    decision: 'We moved auth sessions to Postgres.',
    rationale: 'SQLite made cross-node deploys brittle.',
    source_app: 'codex' as const,
  };
}

async function tempDraftPath(): Promise<{ dir: string; filePath: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'echo-team-decision-drafts-'));
  tempDirs.push(dir);
  return { dir, filePath: join(dir, 'drafts.json') };
}

async function withClient<T>(url: string, fn: (client: Client) => Promise<T>): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL(url));
  const client = new Client({ name: 'echo-test', version: '0.0.0' });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}
