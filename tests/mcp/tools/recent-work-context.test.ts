import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startMcpServer, type McpServerHandle } from '../../../src/mcp/server.js';
import { MemoryStorage } from '../../../src/storage/memory.js';
import type { CaptureEvent } from '../../../src/storage/interface.js';
import type { RecentWorkContextResponse } from '../../../src/trace/types.js';
import { captureStdout } from '../../fixtures/stdout.js';

interface ToolContent {
  type: string;
  text: string;
}

interface CallToolResultLike {
  content?: ToolContent[];
  isError?: boolean;
}

async function withClient<T>(
  url: string,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL(url));
  const client = new Client({ name: 'echo-test', version: '0.0.0' });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

const REPO_ROOT = '/Users/zhen/Desktop/echo';
const REPO_REMOTE = 'https://github.com/zhen/echo';
const TYPES_PATH = `${REPO_ROOT}/src/types.ts`;
const SQLITE_PATH = `${REPO_ROOT}/src/storage/sqlite.ts`;
const NOW = '2026-05-06T09:00:00.000Z';
const SINCE = '2026-05-06T05:00:00.000Z';

function tsPlus(minutes: number): string {
  return new Date(Date.parse(SINCE) + minutes * 60 * 1000).toISOString();
}

function ccEvent(
  session: string,
  turn: number,
  ts: string,
  files: string[],
  io: { user: string; assistant: string },
): Omit<CaptureEvent, 'id'> {
  return {
    source: `fs:/Users/zhen/.claude/projects/abc/${session}.jsonl`,
    timestamp: ts,
    content: `USER: ${io.user}\n\nASSISTANT: ${io.assistant}`,
    metadata: {
      session_id: session,
      turn_index: turn,
      repo_root: REPO_ROOT,
      files_referenced: files,
      git_state: { origin_url: REPO_REMOTE },
    },
  };
}

async function seedScenario(store: MemoryStorage): Promise<void> {
  const events: Omit<CaptureEvent, 'id'>[] = [
    ccEvent('s1', 0, tsPlus(30), [TYPES_PATH], {
      user: 'help with types',
      assistant: 'sure',
    }),
    ccEvent('s1', 1, tsPlus(45), [TYPES_PATH], {
      user: 'refactor it',
      assistant: 'ok',
    }),
    ccEvent('s1', 2, tsPlus(60), [TYPES_PATH], {
      user: 'looks good',
      assistant: 'shipped',
    }),
    ccEvent('s2', 0, tsPlus(15), [SQLITE_PATH], {
      user: 'sqlite migration',
      assistant: 'doing it',
    }),
    ccEvent('s2', 1, tsPlus(20), [SQLITE_PATH], {
      user: 'one more thing',
      assistant: 'done',
    }),
  ];
  for (const e of events) await store.append(e);
}

describe('get_recent_work_context (end-to-end via MCP server)', () => {
  let handle: McpServerHandle | null = null;
  let restoreStdout: () => void;
  let store: MemoryStorage;

  beforeEach(async () => {
    ({ restore: restoreStdout } = captureStdout());
    store = new MemoryStorage();
    await seedScenario(store);
  });

  afterEach(async () => {
    if (handle !== null) {
      await handle.stop();
      handle = null;
    }
    restoreStdout();
  });

  it('lists get_recent_work_context via tools/list with the documented description', async () => {
    handle = await startMcpServer(store, { port: 0 });
    const tools = await withClient(handle.url, async (c) => c.listTools());
    const found = tools.tools.find((t) => t.name === 'get_recent_work_context');
    expect(found).toBeDefined();
    expect(found?.description).toContain('Retrieve clusters of related events');
  });

  it('all three tools are registered', async () => {
    handle = await startMcpServer(store, { port: 0 });
    const tools = await withClient(handle.url, async (c) => c.listTools());
    const names = tools.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'echo_ping',
      'get_recent_work_context',
      'search_memories',
    ]);
  });

  it('returns clustered atoms with the expected response shape', async () => {
    handle = await startMcpServer(store, { port: 0 });
    const result = (await withClient(handle.url, async (c) =>
      c.callTool({
        name: 'get_recent_work_context',
        arguments: { since: SINCE, until: NOW },
      }),
    )) as CallToolResultLike;
    expect(result.isError).toBeFalsy();
    const text = result.content?.[0]?.text;
    expect(text).toBeDefined();
    const parsed = JSON.parse(text!) as RecentWorkContextResponse;

    expect(parsed.schema_version).toBe(1);
    expect(parsed.tool).toBe('get_recent_work_context');
    expect(parsed.query.since).toBe(SINCE);
    expect(parsed.query.until).toBe(NOW);

    // All seeded events share the same repo artifact, so they correctly cluster
    // together. Verify there is at least one cluster covering all atoms, that
    // it has a rank assigned, and that atoms are returned inline keyed by id.
    expect(parsed.clusters.length).toBeGreaterThanOrEqual(1);
    expect(parsed.clusters[0]!.rank).toBe(1);
    expect(parsed.truncation.atoms_total_in_window).toBe(5);
    for (const c of parsed.clusters) {
      for (const id of c.atom_ids) {
        expect(parsed.atoms[id]).toBeDefined();
      }
    }
  });

  it('artifact_hint focuses to one cluster', async () => {
    handle = await startMcpServer(store, { port: 0 });
    const result = (await withClient(handle.url, async (c) =>
      c.callTool({
        name: 'get_recent_work_context',
        arguments: {
          since: SINCE,
          until: NOW,
          artifact_hint: {
            provider: 'local_fs',
            type: 'file',
            id: `https://github.com/zhen/echo::src/types.ts`,
          },
        },
      }),
    )) as CallToolResultLike;
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content![0]!.text) as RecentWorkContextResponse;
    expect(parsed.clusters).toHaveLength(1);
    expect(parsed.clusters[0]!.rank_reason).toContain('matches_artifact_hint');
  });

  it('returns a tool error on a malformed since timestamp', async () => {
    handle = await startMcpServer(store, { port: 0 });
    const result = (await withClient(handle.url, async (c) =>
      c.callTool({
        name: 'get_recent_work_context',
        arguments: { since: 'yesterday' },
      }),
    )) as CallToolResultLike;
    expect(result.isError).toBe(true);
  });
});
