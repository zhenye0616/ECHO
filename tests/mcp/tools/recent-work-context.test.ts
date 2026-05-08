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

  describe('format parameter (item 019)', () => {
    const LONG_INPUT = 'A'.repeat(800);
    const LONG_OUTPUT = 'B'.repeat(1200);
    const SHORT_INPUT = 'short user message';
    const SHORT_OUTPUT = 'short assistant reply';

    async function seedLong(s: MemoryStorage): Promise<void> {
      // Two events sharing a file so they cluster together; the first has a
      // long input/output to exercise truncation, the second is short to
      // verify ≤500-char fields are unmodified.
      await s.append(
        ccEvent('s_long', 0, tsPlus(60), [TYPES_PATH], {
          user: LONG_INPUT,
          assistant: LONG_OUTPUT,
        }),
      );
      await s.append(
        ccEvent('s_long', 1, tsPlus(75), [TYPES_PATH], {
          user: SHORT_INPUT,
          assistant: SHORT_OUTPUT,
        }),
      );
    }

    async function callWith(
      args: Record<string, unknown>,
    ): Promise<RecentWorkContextResponse> {
      const result = (await withClient(handle!.url, async (c) =>
        c.callTool({
          name: 'get_recent_work_context',
          arguments: args,
        }),
      )) as CallToolResultLike;
      expect(result.isError).toBeFalsy();
      return JSON.parse(
        result.content![0]!.text,
      ) as RecentWorkContextResponse;
    }

    it('format omitted echoes "full" in response.query.format', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const r = await callWith({ since: SINCE, until: NOW });
      expect(r.query.format).toBe('full');
    });

    it('format: "full" echoes "full" and is bit-for-bit identical to omitted format', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const omitted = await callWith({ since: SINCE, until: NOW });
      const explicitFull = await callWith({
        since: SINCE,
        until: NOW,
        format: 'full',
      });
      // expected difference: query.format is "full" in both, atoms identical
      expect(explicitFull.query.format).toBe('full');
      expect(explicitFull.atoms).toEqual(omitted.atoms);
      expect(explicitFull.clusters).toEqual(omitted.clusters);
    });

    it('format: "minimal" caps action.input/output to 500 chars + exact suffix', async () => {
      const fresh = new MemoryStorage();
      await seedLong(fresh);
      handle = await startMcpServer(fresh, { port: 0 });
      const r = await callWith({ since: SINCE, until: NOW, format: 'minimal' });
      expect(r.query.format).toBe('minimal');

      // The long atom should be truncated.
      const longAtom = Object.values(r.atoms).find(
        (a) => a.action.input?.startsWith('A'),
      );
      expect(longAtom).toBeDefined();
      const droppedIn = LONG_INPUT.length - 500;
      const droppedOut = LONG_OUTPUT.length - 500;
      expect(longAtom!.action.input).toBe(
        'A'.repeat(500) +
          `… [truncated; ${droppedIn} chars omitted; fetch full atom via search_memories]`,
      );
      expect(longAtom!.action.output).toBe(
        'B'.repeat(500) +
          `… [truncated; ${droppedOut} chars omitted; fetch full atom via search_memories]`,
      );
    });

    it('format: "minimal" leaves atoms whose action.input/output are ≤500 chars unmodified', async () => {
      const fresh = new MemoryStorage();
      await seedLong(fresh);
      handle = await startMcpServer(fresh, { port: 0 });
      const r = await callWith({ since: SINCE, until: NOW, format: 'minimal' });

      // The short atom contains the SHORT_INPUT marker and should be untouched.
      const shortAtom = Object.values(r.atoms).find(
        (a) => a.action.input === SHORT_INPUT,
      );
      expect(shortAtom).toBeDefined();
      expect(shortAtom!.action.input).toBe(SHORT_INPUT);
      expect(shortAtom!.action.output).toBe(SHORT_OUTPUT);
      // No spurious suffix.
      expect(shortAtom!.action.input).not.toContain('truncated;');
      expect(shortAtom!.action.output).not.toContain('truncated;');
    });

    it('format: "minimal" leaves all non-action fields bit-for-bit identical to "full"', async () => {
      const fresh = new MemoryStorage();
      await seedLong(fresh);
      handle = await startMcpServer(fresh, { port: 0 });
      const full = await callWith({ since: SINCE, until: NOW, format: 'full' });
      const minimal = await callWith({
        since: SINCE,
        until: NOW,
        format: 'minimal',
      });

      const fullIds = Object.keys(full.atoms).sort();
      const minIds = Object.keys(minimal.atoms).sort();
      expect(minIds).toEqual(fullIds);

      for (const id of fullIds) {
        const f = full.atoms[id]!;
        const m = minimal.atoms[id]!;
        // Non-action fields must be unchanged.
        expect(m.id).toBe(f.id);
        expect(m.time).toEqual(f.time);
        expect(m.source).toEqual(f.source);
        expect(m.actors).toEqual(f.actors);
        expect(m.artifacts).toEqual(f.artifacts);
        expect(m.context).toEqual(f.context);
        expect(m.conversation).toEqual(f.conversation);
        expect(m.provenance).toEqual(f.provenance);
        expect(m.open_loop_hints).toEqual(f.open_loop_hints);
        // Within action: kind/verb/status untouched; only input/output may shrink.
        expect(m.action.kind).toBe(f.action.kind);
        expect(m.action.verb).toBe(f.action.verb);
        expect(m.action.status).toBe(f.action.status);
      }
      // Cluster shape (atom_ids, edges, rank, label, etc.) is identical
      expect(minimal.clusters).toEqual(full.clusters);
    });

    it('rejects an invalid format value with a tool error', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const result = (await withClient(handle.url, async (c) =>
        c.callTool({
          name: 'get_recent_work_context',
          arguments: { since: SINCE, until: NOW, format: 'summary' },
        }),
      )) as CallToolResultLike;
      expect(result.isError).toBe(true);
    });

    it('tool description mentions the format parameter and signal-bearing edges', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const tools = await withClient(handle.url, async (c) => c.listTools());
      const found = tools.tools.find((t) => t.name === 'get_recent_work_context');
      expect(found?.description).toMatch(/format/);
      expect(found?.description).toMatch(/signal-bearing|atom_ids/);
    });
  });

  describe('cross-gap window + naive-timestamp guardrail (item 021)', () => {
    async function callWith(
      args: Record<string, unknown>,
    ): Promise<RecentWorkContextResponse> {
      const result = (await withClient(handle!.url, async (c) =>
        c.callTool({
          name: 'get_recent_work_context',
          arguments: args,
        }),
      )) as CallToolResultLike;
      expect(result.isError).toBeFalsy();
      return JSON.parse(
        result.content![0]!.text,
      ) as RecentWorkContextResponse;
    }

    it('default behavior on a 24h since/until span uses inferred window_hours = 24, not 4', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const r = await callWith({
        since: '2026-05-06T00:00:00.000Z',
        until: '2026-05-07T00:00:00.000Z',
      });
      expect(r.query.window_hours).toBe(24);
    });

    it('a 1h span infers window_hours = 1 (≤4h branch)', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const r = await callWith({
        since: '2026-05-06T05:00:00.000Z',
        until: '2026-05-06T06:00:00.000Z',
      });
      expect(r.query.window_hours).toBe(1);
    });

    it('a span > 24h still caps inferred window_hours at 24', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const r = await callWith({
        since: '2026-05-01T00:00:00.000Z',
        until: '2026-05-07T00:00:00.000Z', // 144h span
      });
      expect(r.query.window_hours).toBe(24);
    });

    it('explicit window_hours wins over inference', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const r = await callWith({
        since: '2026-05-06T00:00:00.000Z',
        until: '2026-05-07T00:00:00.000Z',
        window_hours: 6,
      });
      expect(r.query.window_hours).toBe(6);
    });

    it('naive ISO timestamps produce a one-line warning in response.warnings', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const r = await callWith({
        since: '2026-05-06T05:00:00',
        until: '2026-05-06T09:00:00',
      });
      const tzWarnings = r.warnings.filter((w) => w.includes('TZ specifier'));
      expect(tzWarnings).toHaveLength(1);
    });

    it('a single naive input (since only or until only) still triggers the warning', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const r = await callWith({
        since: '2026-05-06T05:00:00',
        until: '2026-05-06T09:00:00.000Z',
      });
      const tzWarnings = r.warnings.filter((w) => w.includes('TZ specifier'));
      expect(tzWarnings).toHaveLength(1);
    });

    it('Z-suffixed ISO timestamps produce no warning', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const r = await callWith({
        since: '2026-05-06T05:00:00.000Z',
        until: '2026-05-06T09:00:00.000Z',
      });
      const tzWarnings = r.warnings.filter((w) => w.includes('TZ specifier'));
      expect(tzWarnings).toHaveLength(0);
    });

    it('+HH:MM offset ISO timestamps produce no warning', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const r = await callWith({
        since: '2026-05-06T05:00:00-07:00',
        until: '2026-05-06T09:00:00-07:00',
      });
      const tzWarnings = r.warnings.filter((w) => w.includes('TZ specifier'));
      expect(tzWarnings).toHaveLength(0);
    });

    it('window_hours is exposed in the tool input schema (introspectable)', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const tools = await withClient(handle.url, async (c) => c.listTools());
      const found = tools.tools.find((t) => t.name === 'get_recent_work_context');
      expect(found).toBeDefined();
      const schemaProps = (
        (found!.inputSchema as { properties?: Record<string, unknown> })
          .properties ?? {}
      );
      expect(schemaProps['window_hours']).toBeDefined();
    });

    it('tool description mentions window_hours and the TZ guardrail', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const tools = await withClient(handle.url, async (c) => c.listTools());
      const found = tools.tools.find((t) => t.name === 'get_recent_work_context');
      expect(found?.description).toMatch(/window_hours/);
      expect(found?.description).toMatch(/timezone|TZ|UTC/);
    });
  });
});
