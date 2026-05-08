import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  searchMemories,
  type SearchResult,
} from '../../../src/mcp/tools/search-memories.js';
import { startMcpServer, type McpServerHandle } from '../../../src/mcp/server.js';
import { MemoryStorage } from '../../../src/storage/memory.js';
import type { CaptureEvent } from '../../../src/storage/interface.js';
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

// 3 cursor-chat + 3 claude-code + 2 git events, with varied timestamps and content.
async function seedFixtureEvents(store: MemoryStorage): Promise<void> {
  const events: Omit<CaptureEvent, 'id'>[] = [
    {
      source: 'cursor-chat:workspace-a',
      timestamp: '2026-04-25T09:00:00.000Z',
      content: 'discussing TypeScript stack with the team',
      metadata: { workspace_id: 'a', thread_id: 't1' },
    },
    {
      source: 'cursor-chat:workspace-a',
      timestamp: '2026-04-26T10:00:00.000Z',
      content: 'reviewing PR for the new auth flow',
      metadata: { workspace_id: 'a', thread_id: 't2' },
    },
    {
      source: 'cursor-chat:workspace-b',
      timestamp: '2026-04-27T11:00:00.000Z',
      content: 'pricing experiment notes — needle in cursor only',
    },
    {
      source: 'claude-code:session-1',
      timestamp: '2026-04-25T12:00:00.000Z',
      content: 'building the MCP server skeleton',
    },
    {
      source: 'claude-code:session-1',
      timestamp: '2026-04-26T13:00:00.000Z',
      content: 'wiring up storage and capture pipeline',
    },
    {
      source: 'claude-code:session-2',
      timestamp: '2026-04-27T14:00:00.000Z',
      content: 'debug session for the git watcher',
    },
    {
      source: 'git:project-echo',
      timestamp: '2026-04-26T15:00:00.000Z',
      content: 'commit: add storage interface',
    },
    {
      source: 'git:project-echo',
      timestamp: '2026-04-28T16:00:00.000Z',
      content: 'commit: ship MCP scaffold',
    },
  ];
  for (const e of events) {
    await store.append(e);
  }
}

describe('searchMemories (pure handler)', () => {
  let store: MemoryStorage;

  beforeEach(async () => {
    store = new MemoryStorage();
    await seedFixtureEvents(store);
  });

  it('with no params, returns all 8 events ordered by timestamp DESC', async () => {
    const r = await searchMemories(store, {});
    expect(r.total_returned).toBe(8);
    expect(r.limit_applied).toBe(10);
    const ts = r.matches.map((m) => m.timestamp);
    expect(ts).toEqual([...ts].sort().reverse());
    expect(ts[0]).toBe('2026-04-28T16:00:00.000Z'); // most recent first
  });

  it('query substring filter narrows to a single matching event', async () => {
    const r = await searchMemories(store, { query: 'needle in cursor only' });
    expect(r.total_returned).toBe(1);
    expect(r.matches[0]!.content).toContain('needle in cursor only');
  });

  it('query is case-insensitive', async () => {
    const r = await searchMemories(store, { query: 'TYPESCRIPT' });
    expect(r.total_returned).toBe(1);
    expect(r.matches[0]!.content).toContain('TypeScript');
  });

  it('source_prefix "cursor-chat:" returns only the 3 cursor events', async () => {
    const r = await searchMemories(store, { source_prefix: 'cursor-chat:' });
    expect(r.total_returned).toBe(3);
    expect(r.matches.every((m) => m.source.startsWith('cursor-chat:'))).toBe(true);
  });

  it('source_prefix "git:" returns only the 2 git events', async () => {
    const r = await searchMemories(store, { source_prefix: 'git:' });
    expect(r.total_returned).toBe(2);
    expect(r.matches.every((m) => m.source.startsWith('git:'))).toBe(true);
  });

  it('source_prefix "claude-code:" returns only the 3 claude-code events', async () => {
    const r = await searchMemories(store, { source_prefix: 'claude-code:' });
    expect(r.total_returned).toBe(3);
    expect(r.matches.every((m) => m.source.startsWith('claude-code:'))).toBe(true);
  });

  it('since (inclusive) and until (exclusive) bound the window', async () => {
    const r = await searchMemories(store, {
      since: '2026-04-26T00:00:00.000Z',
      until: '2026-04-28T00:00:00.000Z',
    });
    // events on 26th and 27th: 2 cursor + 2 claude + 1 git = 5
    expect(r.total_returned).toBe(5);
    for (const m of r.matches) {
      expect(m.timestamp >= '2026-04-26T00:00:00.000Z').toBe(true);
      expect(m.timestamp < '2026-04-28T00:00:00.000Z').toBe(true);
    }
  });

  it('limit=2 returns the 2 most recent events', async () => {
    const r = await searchMemories(store, { limit: 2 });
    expect(r.total_returned).toBe(2);
    expect(r.limit_applied).toBe(2);
    expect(r.matches[0]!.timestamp).toBe('2026-04-28T16:00:00.000Z');
    expect(r.matches[1]!.timestamp).toBe('2026-04-27T14:00:00.000Z');
  });

  it('combined query + source_prefix + limit returns the correct intersection', async () => {
    const r = await searchMemories(store, {
      query: 'commit',
      source_prefix: 'git:',
      limit: 5,
    });
    expect(r.total_returned).toBe(2);
    expect(r.matches.every((m) => m.source.startsWith('git:'))).toBe(true);
    expect(r.matches.every((m) => m.content.toLowerCase().includes('commit'))).toBe(true);
    // most recent first
    expect(r.matches[0]!.timestamp).toBe('2026-04-28T16:00:00.000Z');
  });

  it('clamps limit > 50 down to 50', async () => {
    const r = await searchMemories(store, { limit: 100 });
    expect(r.limit_applied).toBe(50);
  });

  it('clamps non-positive limit up to 1', async () => {
    const r = await searchMemories(store, { limit: 0 });
    expect(r.limit_applied).toBe(1);
    expect(r.total_returned).toBe(1);
  });

  it('query_echo reflects original parameters and applied limit', async () => {
    const r = await searchMemories(store, {
      query: 'auth',
      source_prefix: 'cursor-chat:',
      since: '2026-04-26T00:00:00.000Z',
      limit: 3,
    });
    expect(r.query_echo).toEqual({
      query: 'auth',
      source_prefix: 'cursor-chat:',
      since: '2026-04-26T00:00:00.000Z',
      until: null,
      limit: 3,
    });
  });

  it('preserves metadata when present, omits when absent', async () => {
    const r = await searchMemories(store, { query: 'TypeScript' });
    expect(r.matches[0]!.metadata).toEqual({ workspace_id: 'a', thread_id: 't1' });
    const r2 = await searchMemories(store, { query: 'commit' });
    expect(r2.matches[0]!.metadata).toBeUndefined();
  });

  it('returns 0 matches when query has no hits', async () => {
    const r = await searchMemories(store, { query: 'no-such-needle-anywhere' });
    expect(r.total_returned).toBe(0);
    expect(r.matches).toHaveLength(0);
  });

  it('filter-before-slice: out-of-overfetch substring match is still returned (item 022 Bug D)', async () => {
    const fresh = new MemoryStorage();
    // Seed 30 events; the i=5 (6th oldest = 25th-newest) carries a unique
    // substring. Pre-fix: limit=5 produces overfetch=20, which slices to the
    // newest 20 BEFORE applying the content filter, so the 25th-newest match
    // is dropped. Post-fix: filter runs across all events first, then slice.
    for (let i = 0; i < 30; i++) {
      const ts = new Date(Date.UTC(2026, 0, 1, 0, i, 0)).toISOString();
      await fresh.append({
        source: 'git:bulk',
        timestamp: ts,
        content: i === 5 ? 'needle-out-of-overfetch' : `event-${i}`,
      });
    }
    const r = await searchMemories(fresh, {
      query: 'needle-out-of-overfetch',
      limit: 5,
    });
    expect(r.total_returned).toBe(1);
    expect(r.matches[0]!.content).toBe('needle-out-of-overfetch');
  });

  it('description clarifies substring (not semantic) search (item 022 Bug E)', async () => {
    // SEARCH_MEMORIES_DESCRIPTION is exported; the e2e test below also
    // verifies it via tools/list, but a unit-level assertion makes the
    // intent explicit.
    const { SEARCH_MEMORIES_DESCRIPTION } = await import(
      '../../../src/mcp/tools/search-memories.js'
    );
    expect(SEARCH_MEMORIES_DESCRIPTION).toMatch(/case-insensitive literal substring/);
    expect(SEARCH_MEMORIES_DESCRIPTION).toMatch(/NOT a semantic/);
  });

  it('overfetch caps to MAX_OVERFETCH (200) — large dataset still gives DESC top-N', async () => {
    const big = new MemoryStorage();
    // 250 events spanning 250 minutes; the most-recent 50 should win for a limit=50 query.
    for (let i = 0; i < 250; i++) {
      const ts = new Date(Date.UTC(2026, 0, 1, 0, i, 0)).toISOString();
      await big.append({
        source: 'git:bulk',
        timestamp: ts,
        content: `commit-${i}`,
      });
    }
    const r = await searchMemories(big, { limit: 50 });
    expect(r.total_returned).toBe(50);
    // most recent should be commit-249
    expect(r.matches[0]!.content).toBe('commit-249');
    expect(r.matches[49]!.content).toBe('commit-200');
  });
});

describe('search_memories (end-to-end via MCP server)', () => {
  let handle: McpServerHandle | null = null;
  let restoreStdout: () => void;
  let store: MemoryStorage;

  beforeEach(async () => {
    ({ restore: restoreStdout } = captureStdout());
    store = new MemoryStorage();
    await seedFixtureEvents(store);
  });

  afterEach(async () => {
    if (handle !== null) {
      await handle.stop();
      handle = null;
    }
    restoreStdout();
  });

  it('lists search_memories via tools/list with the documented description', async () => {
    handle = await startMcpServer(store, { port: 0 });
    const tools = await withClient(handle.url, async (c) => c.listTools());
    const found = tools.tools.find((t) => t.name === 'search_memories');
    expect(found).toBeDefined();
    expect(found?.description).toContain('Search the user\'s captured ECHO memories');
  });

  it('invokes search_memories and returns filtered, DESC-sorted results', async () => {
    handle = await startMcpServer(store, { port: 0 });
    const result = (await withClient(handle.url, async (c) =>
      c.callTool({
        name: 'search_memories',
        arguments: { source_prefix: 'cursor-chat:', limit: 2 },
      }),
    )) as CallToolResultLike;

    expect(result.isError).toBeFalsy();
    const text = result.content?.[0]?.text;
    expect(text).toBeDefined();
    const parsed = JSON.parse(text!) as SearchResult;
    expect(parsed.total_returned).toBe(2);
    expect(parsed.limit_applied).toBe(2);
    expect(parsed.matches.every((m) => m.source.startsWith('cursor-chat:'))).toBe(true);
    expect(parsed.matches[0]!.timestamp).toBe('2026-04-27T11:00:00.000Z');
    expect(parsed.matches[1]!.timestamp).toBe('2026-04-26T10:00:00.000Z');
  });

  it('returns a tool error (not a crash) on a malformed `since` timestamp', async () => {
    handle = await startMcpServer(store, { port: 0 });
    const result = (await withClient(handle.url, async (c) =>
      c.callTool({
        name: 'search_memories',
        arguments: { since: 'yesterday' },
      }),
    )) as CallToolResultLike;
    // SDK wraps zod failure into an error response — server stays up, no crash.
    expect(result.isError).toBe(true);
    // Sanity: server is still alive and responsive afterwards.
    const ok = (await withClient(handle.url, async (c) =>
      c.callTool({ name: 'search_memories', arguments: {} }),
    )) as CallToolResultLike;
    expect(ok.isError).toBeFalsy();
  });

  it('returns a tool error on a malformed `until` timestamp', async () => {
    handle = await startMcpServer(store, { port: 0 });
    const result = (await withClient(handle.url, async (c) =>
      c.callTool({
        name: 'search_memories',
        arguments: { until: 'next-week' },
      }),
    )) as CallToolResultLike;
    expect(result.isError).toBe(true);
  });

  it('combined filter end-to-end produces the spec-shaped JSON envelope', async () => {
    handle = await startMcpServer(store, { port: 0 });
    const result = (await withClient(handle.url, async (c) =>
      c.callTool({
        name: 'search_memories',
        arguments: {
          query: 'commit',
          source_prefix: 'git:',
          since: '2026-04-26T00:00:00.000Z',
          until: '2026-04-30T00:00:00.000Z',
          limit: 10,
        },
      }),
    )) as CallToolResultLike;
    const parsed = JSON.parse(result.content![0]!.text) as SearchResult;
    expect(parsed.total_returned).toBe(2);
    expect(parsed.limit_applied).toBe(10);
    expect(parsed.query_echo.query).toBe('commit');
    expect(parsed.query_echo.source_prefix).toBe('git:');
    expect(parsed.query_echo.since).toBe('2026-04-26T00:00:00.000Z');
    expect(parsed.query_echo.until).toBe('2026-04-30T00:00:00.000Z');
    expect(parsed.matches[0]!.id).toBeDefined();
    expect(parsed.matches[0]!.source).toMatch(/^git:/);
  });
});
