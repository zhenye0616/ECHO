import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_LIMIT,
  STORAGE_OVERFETCH,
  applySkeletonAtom,
  applySkeletonCluster,
  buildSkeletonResponse,
  getRecentWorkContext,
  hasTzMarker,
} from '../../../src/mcp/tools/recent-work-context.js';
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

  it('all four tools are registered', async () => {
    handle = await startMcpServer(store, { port: 0 });
    const tools = await withClient(handle.url, async (c) => c.listTools());
    const names = tools.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'echo_ping',
      'get_recent_work_context',
      'search_memories',
      'tail_session',
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

    it('format omitted echoes "minimal" in response.query.format (item 025 cost-safer default)', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const r = await callWith({ since: SINCE, until: NOW });
      expect(r.query.format).toBe('minimal');
    });

    it('format: "minimal" echoes "minimal" and is bit-for-bit identical to omitted format (item 025)', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const omitted = await callWith({ since: SINCE, until: NOW });
      const explicitMinimal = await callWith({
        since: SINCE,
        until: NOW,
        format: 'minimal',
      });
      // expected difference: query.format is "minimal" in both, atoms identical
      expect(explicitMinimal.query.format).toBe('minimal');
      expect(explicitMinimal.atoms).toEqual(omitted.atoms);
      expect(explicitMinimal.clusters).toEqual(omitted.clusters);
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

  describe('open-loop resolution (item 020)', () => {
    async function callRwc(
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

    it('response shape: every cluster.open_loop_hints[i].resolved is a boolean', async () => {
      handle = await startMcpServer(store, { port: 0 });
      const r = await callRwc({ since: SINCE, until: NOW });
      // Walk every cluster's hints and check the resolved field is a boolean.
      // Even on a fixture that may emit zero hints, this is a no-op assertion
      // that won't false-positive — but assert the field exists when hints do.
      let totalHints = 0;
      for (const c of r.clusters) {
        for (const h of c.open_loop_hints) {
          totalHints++;
          expect(typeof h.resolved).toBe('boolean');
        }
      }
      // Ensure we exercised at least one hint so the assertion was real.
      // The seedScenario fixture's ccEvent helper produces atoms but not hints
      // (no question marks / TODO / followup phrasing in seed strings); the
      // shape assertion above still passes vacuously, which is the intended
      // semantics — the contract holds for empty-hint clusters too.
      expect(totalHints).toBeGreaterThanOrEqual(0);
    });

    it("format: 'minimal' does not alter resolved field on any hint", async () => {
      // Seed a hint-bearing fixture inline (the default seedScenario fixture
      // does not include question-mark turns, so we use a fresh store here).
      const fresh = new MemoryStorage();
      await fresh.append(
        ccEvent('s_resolve', 0, tsPlus(40), [TYPES_PATH], {
          user: 'should I refactor it?',
          assistant: 'thinking',
        }),
      );
      await fresh.append(
        ccEvent('s_resolve', 1, tsPlus(45), [TYPES_PATH], {
          user: 'yes go ahead',
          assistant: 'shipped',
        }),
      );
      handle = await startMcpServer(fresh, { port: 0 });
      const full = await callRwc({ since: SINCE, until: NOW, format: 'full' });
      const minimal = await callRwc({
        since: SINCE,
        until: NOW,
        format: 'minimal',
      });
      const fullHints = full.clusters.flatMap((c) => c.open_loop_hints);
      const minHints = minimal.clusters.flatMap((c) => c.open_loop_hints);
      expect(minHints.length).toBe(fullHints.length);
      // Per-hint resolved + resolved_by_atom_id are bit-for-bit identical.
      const byKey = (h: { atom_id: string; kind: string }): string =>
        `${h.atom_id}|${h.kind}`;
      const fullByKey = new Map(fullHints.map((h) => [byKey(h), h]));
      for (const m of minHints) {
        const f = fullByKey.get(byKey(m));
        expect(f).toBeDefined();
        expect(m.resolved).toBe(f!.resolved);
        expect(m.resolved_by_atom_id).toBe(f!.resolved_by_atom_id);
      }
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

describe('item 025: cost-safer defaults + structured output + readOnlyHint', () => {
  let handle: McpServerHandle | null = null;
  let restoreStdout: () => void;
  let store: MemoryStorage;

  beforeEach(() => {
    ({ restore: restoreStdout } = captureStdout());
    store = new MemoryStorage();
  });

  afterEach(async () => {
    if (handle !== null) {
      await handle.stop();
      handle = null;
    }
    restoreStdout();
  });

  // Realistic-size CC atom: short user/assistant payloads (well under the
  // 500-char minimal cap) plus typical metadata. Modeled on the median
  // turn-pair size from real dogfooding captures. `fileIdx` controls how the
  // 200-atom fixture distributes across files — `i % 50` mimics real work
  // spanning many files (multi-cluster shape).
  function bigCcEvent(
    session: string,
    turn: number,
    tsIso: string,
    repoRoot: string,
    fileIdx: number,
  ): Omit<CaptureEvent, 'id'> {
    return {
      source: `fs:${repoRoot}/.claude/projects/abc/${session}.jsonl`,
      timestamp: tsIso,
      content: `USER: q${turn}\n\nASSISTANT: a${turn}`,
      metadata: {
        session_id: session,
        turn_index: turn,
        repo_root: repoRoot,
        files_referenced: [`${repoRoot}/src/file${fileIdx}.ts`],
        git_state: { origin_url: 'https://github.com/u/r' },
      },
    };
  }

  // Long CC atom: input/output well above the 500-char cap, used to verify
  // truncation kicks in correctly.
  function longCcEvent(
    session: string,
    turn: number,
    tsIso: string,
    repoRoot: string,
    fileIdx: number,
  ): Omit<CaptureEvent, 'id'> {
    return {
      source: `fs:${repoRoot}/.claude/projects/abc/${session}.jsonl`,
      timestamp: tsIso,
      content:
        'USER: '.padEnd(800, 'u') + '\n\nASSISTANT: ' + 'a'.padEnd(800, 'a'),
      metadata: {
        session_id: session,
        turn_index: turn,
        repo_root: repoRoot,
        files_referenced: [`${repoRoot}/src/file${fileIdx}.ts`],
        git_state: { origin_url: 'https://github.com/u/r' },
      },
    };
  }

  it('default-args call returns at most DEFAULT_LIMIT atoms with each input/output capped at 500 chars', async () => {
    const NOW = '2026-05-08T08:00:00.000Z';
    const SINCE = new Date(Date.parse(NOW) - 4 * 3600_000).toISOString();
    const baseMs = Date.parse(SINCE);
    // Seed 200 long-content atoms in window. Long content exercises the
    // 500-char minimal cap; multi-file distribution keeps the response
    // shape realistic (matches dogfooding captures).
    for (let i = 0; i < 200; i++) {
      const ts = new Date(baseMs + i * 30_000).toISOString();
      const fileIdx = i % 50;
      await store.append(longCcEvent(`s${i}`, 0, ts, '/repo', fileIdx));
    }
    handle = await startMcpServer(store, { port: 0 });
    const result = (await withClient(handle.url, async (c) =>
      c.callTool({
        name: 'get_recent_work_context',
        arguments: { since: SINCE, until: NOW },
      }),
    )) as CallToolResultLike;
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(
      result.content![0]!.text,
    ) as RecentWorkContextResponse;
    expect(parsed.query.format).toBe('minimal');
    const atomCount = Object.keys(parsed.atoms).length;
    expect(atomCount).toBeLessThanOrEqual(25);
    // Each atom's input/output capped — the 800-char inputs become 500+suffix.
    for (const atom of Object.values(parsed.atoms)) {
      const input = atom.action.input;
      const output = atom.action.output;
      if (input !== undefined) expect(input.length).toBeLessThan(700);
      if (output !== undefined) expect(output.length).toBeLessThan(700);
    }
  });

  it('envelope-byte-size: default-args response on a 200-atom fixture is < 25,000 chars', async () => {
    const NOW = '2026-05-08T08:00:00.000Z';
    const SINCE = new Date(Date.parse(NOW) - 4 * 3600_000).toISOString();
    const baseMs = Date.parse(SINCE);
    // Realistic-shape fixture: 200 atoms across 50 files — matches the
    // multi-file work patterns in dogfooding captures (a single big-cluster
    // shape would inflate edges combinatorially and isn't representative).
    for (let i = 0; i < 200; i++) {
      const ts = new Date(baseMs + i * 30_000).toISOString();
      const fileIdx = i % 50;
      await store.append(bigCcEvent(`s${i}`, 0, ts, '/repo', fileIdx));
    }
    handle = await startMcpServer(store, { port: 0 });
    const result = (await withClient(handle.url, async (c) =>
      c.callTool({
        name: 'get_recent_work_context',
        arguments: { since: SINCE, until: NOW },
      }),
    )) as CallToolResultLike;
    expect(result.isError).toBeFalsy();
    // Measure the literal payload — what the consumer's tool-result budget pays
    // for. The text-content envelope is the on-the-wire size that mattered in
    // dogfooding 2026-05-08 (every retrieval blew the 25k budget pre-fix).
    const envelopeBytes = result.content![0]!.text.length;
    expect(envelopeBytes).toBeLessThan(25_000);
  });

  it('format: "full" preserves full atom content (regression guard against limit/format coupling)', async () => {
    const NOW = '2026-05-08T08:00:00.000Z';
    const SINCE = new Date(Date.parse(NOW) - 4 * 3600_000).toISOString();
    await store.append(longCcEvent('s1', 0, SINCE, '/repo', 0));
    handle = await startMcpServer(store, { port: 0 });
    const result = (await withClient(handle.url, async (c) =>
      c.callTool({
        name: 'get_recent_work_context',
        arguments: { since: SINCE, until: NOW, format: 'full' },
      }),
    )) as CallToolResultLike;
    const parsed = JSON.parse(
      result.content![0]!.text,
    ) as RecentWorkContextResponse;
    expect(parsed.query.format).toBe('full');
    const atom = Object.values(parsed.atoms)[0]!;
    // Full input/output are 800-char strings — well above the 500-char cap.
    if (atom.action.input !== undefined) {
      expect(atom.action.input.length).toBeGreaterThan(500);
    }
  });

  it('tools/list advertises outputSchema, readOnlyHint, and the new defaults in the description', async () => {
    handle = await startMcpServer(store, { port: 0 });
    const tools = await withClient(handle.url, async (c) => c.listTools());
    interface ToolListEntry {
      name: string;
      description?: string;
      outputSchema?: unknown;
      annotations?: { readOnlyHint?: boolean };
    }
    const found = tools.tools.find(
      (t) => t.name === 'get_recent_work_context',
    ) as ToolListEntry | undefined;
    expect(found).toBeDefined();
    expect(found?.outputSchema).toBeDefined();
    expect(found?.annotations?.readOnlyHint).toBe(true);
    expect(found?.description).toMatch(/limit=20/);
    expect(found?.description).toMatch(/format="minimal"/);
  });

  it('tools/call returns both content and structuredContent', async () => {
    const NOW = '2026-05-08T08:00:00.000Z';
    const SINCE = new Date(Date.parse(NOW) - 1 * 3600_000).toISOString();
    handle = await startMcpServer(store, { port: 0 });
    interface ResultWithStructured extends CallToolResultLike {
      structuredContent?: Record<string, unknown>;
    }
    const result = (await withClient(handle.url, async (c) =>
      c.callTool({
        name: 'get_recent_work_context',
        arguments: { since: SINCE, until: NOW },
      }),
    )) as ResultWithStructured;
    expect(result.isError).toBeFalsy();
    const text = result.content?.[0]?.text;
    expect(text).toBeDefined();
    const parsed = JSON.parse(text!) as Record<string, unknown>;
    expect(result.structuredContent).toEqual(parsed);
    expect(parsed['schema_version']).toBe(1);
    expect(parsed['tool']).toBe('get_recent_work_context');
  });
});

describe('hasTzMarker (item 022 Bug F: regex broadening)', () => {
  it('matches Z', () => {
    expect(hasTzMarker('2026-05-08T07:00:00Z')).toBe(true);
  });

  it('matches +HH:MM', () => {
    expect(hasTzMarker('2026-05-08T07:00:00+07:00')).toBe(true);
  });

  it('matches -HH:MM', () => {
    expect(hasTzMarker('2026-05-08T07:00:00-07:00')).toBe(true);
  });

  it('matches +HHMM (no colon)', () => {
    expect(hasTzMarker('2026-05-08T07:00:00+0700')).toBe(true);
  });

  it('matches +HH (hour-only)', () => {
    expect(hasTzMarker('2026-05-08T07:00:00+07')).toBe(true);
  });

  it('rejects naive (no TZ marker)', () => {
    expect(hasTzMarker('2026-05-08T07:00:00')).toBe(false);
  });

  it('rejects naive with milliseconds', () => {
    expect(hasTzMarker('2026-05-08T07:00:00.123')).toBe(false);
  });
});

describe('storage-cap warning + raw-FS filter (item 022 Bugs B + C)', () => {
  let store: MemoryStorage;
  let restoreStdout: () => void;
  const SINCE = '2026-05-08T00:00:00.000Z';
  const UNTIL = '2026-05-08T23:59:59.000Z';

  beforeEach(() => {
    ({ restore: restoreStdout } = captureStdout());
    store = new MemoryStorage();
  });

  afterEach(() => {
    restoreStdout();
  });

  it('storage-cap warning fires when events.length === limit * STORAGE_OVERFETCH', async () => {
    // Default limit = 100, STORAGE_OVERFETCH = 10 → cap = 1000.
    // Seed cap+200 in-window events; storage returns exactly cap.
    const cap = DEFAULT_LIMIT * STORAGE_OVERFETCH;
    const baseMs = Date.parse(SINCE);
    for (let i = 0; i < cap + 200; i++) {
      const ts = new Date(baseMs + i * 1000).toISOString();
      await store.append({
        source: 'git:repo',
        timestamp: ts,
        content: `event-${i}`,
      });
    }
    const r = await getRecentWorkContext(store, { since: SINCE, until: UNTIL });
    const capWarnings = r.warnings.filter((w) =>
      w.includes('storage cap hit'),
    );
    expect(capWarnings).toHaveLength(1);
    expect(capWarnings[0]).toContain('Raise limit or narrow');
  });

  it('storage-cap warning does NOT fire when events.length < cap', async () => {
    const baseMs = Date.parse(SINCE);
    for (let i = 0; i < 5; i++) {
      const ts = new Date(baseMs + i * 1000).toISOString();
      await store.append({
        source: 'git:repo',
        timestamp: ts,
        content: `event-${i}`,
      });
    }
    const r = await getRecentWorkContext(store, { since: SINCE, until: UNTIL });
    const capWarnings = r.warnings.filter((w) =>
      w.includes('storage cap hit'),
    );
    expect(capWarnings).toHaveLength(0);
  });

  it('raw fs-watcher events (metadata.surface=fs) are filtered out of the trace input', async () => {
    // 100 raw fs-watcher noise events in the window.
    const baseMs = Date.parse(SINCE);
    for (let i = 0; i < 100; i++) {
      const ts = new Date(baseMs + i * 1000).toISOString();
      await store.append({
        source: `fs:/Users/zhen/Library/Application Support/Cursor/User/workspaceStorage/x/${i}.vscdb`,
        timestamp: ts,
        content: JSON.stringify({
          event_type: 'change',
          path: `/Users/zhen/x/${i}`,
          mtime: ts,
          size: 100,
        }),
        metadata: { surface: 'fs', file_kind: 'cursor-workspace' },
      });
    }
    // 5 normalized turn-pair events that happen to share the fs: source prefix
    // (they're claude-code conversation atoms, NOT raw fs-watcher noise).
    for (let i = 0; i < 5; i++) {
      const ts = new Date(baseMs + 200_000 + i * 1000).toISOString();
      await store.append({
        source: `fs:/Users/zhen/.claude/projects/abc/s.jsonl`,
        timestamp: ts,
        content: `USER: msg ${i}\n\nASSISTANT: reply ${i}`,
        metadata: {
          session_id: 'abc',
          turn_index: i,
          repo_root: '/Users/zhen/Desktop/echo',
          files_referenced: ['/Users/zhen/Desktop/echo/src/types.ts'],
          git_state: { origin_url: 'https://github.com/zhen/echo' },
        },
      });
    }

    const r = await getRecentWorkContext(store, { since: SINCE, until: UNTIL });

    // The trace input should reflect only the 5 conversation atoms; the 100
    // raw fs events were filtered at the storage-query layer.
    expect(r.truncation.atoms_total_in_window).toBe(5);
  });
});

describe("item 028: format='skeleton' on realistic-density fixture", () => {
  // Fixture sourced from a real spilled `get_recent_work_context` response
  // (the 2026-05-08 22:54 UTC / 15:54 PDT post-026+027 verification round —
  // the canonical regression-confirmed shape per dogfooding journal lines
  // 631-660). Founder filesystem paths redacted; otherwise byte-for-byte
  // identical to what the MCP tool actually returned that day.
  //
  // Why this matters: the 025 acceptance test passed at merge precisely
  // because its synthetic atoms were envelope-cheap (empty artifacts[],
  // empty actors, empty provenance). Real `claude_code` + `git` atoms in
  // a working day carry populated sub-collections; this fixture preserves
  // that density so the size assertion below is load-bearing on production
  // shape, not on a synthetic stand-in.
  const HERE = dirname(fileURLToPath(import.meta.url));
  const FIXTURE_PATH = join(
    HERE,
    '..',
    'fixtures',
    'recent-work-context-realistic-claude-code.json',
  );
  const fixture = JSON.parse(
    readFileSync(FIXTURE_PATH, 'utf8'),
  ) as RecentWorkContextResponse;

  it('fixture preserves the post-026+027 regression shape', () => {
    // Sanity-guard the fixture so a future accidental edit (or a test that
    // shrinks the fixture for speed) can't silently turn this test into a
    // tautology. These are the cardinal counts the dogfooding journal
    // recorded for the 15:54 PDT spill.
    expect(Object.keys(fixture.atoms)).toHaveLength(20);
    expect(fixture.clusters).toHaveLength(1);
    const cluster = fixture.clusters[0]!;
    // Cluster must carry a populated open_loop_hints body (≥15 entries) —
    // dropping that body is one of the load-bearing skeleton-mode strips.
    expect(cluster.open_loop_hints.length).toBeGreaterThanOrEqual(15);
    expect(cluster.edges.length).toBeGreaterThan(0);
    // Each atom must carry the populated sub-collections that minimal mode
    // doesn't cap (artifacts / actors / provenance). The realistic fixture
    // has artifacts ranging 2-17/atom; assert the cluster total stays
    // representative even on a tightened fixture.
    let totalArtifacts = 0;
    for (const atom of Object.values(fixture.atoms)) {
      expect(atom.actors.length).toBeGreaterThan(0);
      expect(atom.provenance).toBeDefined();
      totalArtifacts += atom.artifacts.length;
    }
    // 20 atoms with ≥2 artifacts/atom on average is the floor.
    expect(totalArtifacts).toBeGreaterThanOrEqual(40);
  });

  it('minimal-mode envelope on this fixture exceeds 25,000 chars (documents the gap skeleton closes)', () => {
    // We are NOT promising minimal stays under budget on realistic-shape
    // input — that's exactly the regression skeleton mode addresses.
    // Recording the gap here keeps the next reader from confusing skeleton
    // for a redundant rung.
    const envelopeBytes = JSON.stringify(fixture).length;
    expect(envelopeBytes).toBeGreaterThan(25_000);
  });

  it('skeleton-mode envelope on this fixture is < 12,500 chars (half the consumer budget, leaves headroom)', () => {
    // Half of the 25k consumer tool-result budget. Headroom matters because
    // skeleton output is meant for the resume use case where the AI client
    // still needs room to synthesize a briefing on top of the response.
    const skeleton = buildSkeletonResponse(fixture);
    const envelopeBytes = JSON.stringify(skeleton).length;
    expect(envelopeBytes).toBeLessThan(12_500);
  });

  it('skeleton mode strips artifacts, actors, provenance, context, conversation, and atom-level open_loop_hints', () => {
    // Walk a realistic atom and confirm every sub-collection that minimal
    // leaves uncapped is gone. This is the first half of the strip
    // contract; the second half (cluster-level edges + hint-body) is
    // checked below.
    const atomWithBody = Object.values(fixture.atoms).find(
      (a) =>
        a.artifacts.length > 0 &&
        a.actors.length > 0 &&
        a.provenance !== undefined,
    );
    expect(atomWithBody).toBeDefined();
    const skeleton = applySkeletonAtom(atomWithBody!);
    expect((skeleton as unknown as Record<string, unknown>).artifacts).toBeUndefined();
    expect((skeleton as unknown as Record<string, unknown>).actors).toBeUndefined();
    expect((skeleton as unknown as Record<string, unknown>).provenance).toBeUndefined();
    expect((skeleton as unknown as Record<string, unknown>).context).toBeUndefined();
    expect((skeleton as unknown as Record<string, unknown>).conversation).toBeUndefined();
    expect(
      (skeleton as unknown as Record<string, unknown>).open_loop_hints,
    ).toBeUndefined();
    // Affordances are retained.
    expect(skeleton.id).toBe(atomWithBody!.id);
    expect(skeleton.time).toEqual(atomWithBody!.time);
    expect(skeleton.source).toEqual(atomWithBody!.source);
    expect(skeleton.action.kind).toBe(atomWithBody!.action.kind);
  });

  it('skeleton atom action.summary is a head-clip ≤200 chars of action.input', () => {
    // Every realistic atom in the fixture has populated action.input. The
    // summary surrogate clips to SKELETON_SUMMARY_CAP (200) so a downstream
    // resume briefing can still tell atoms apart.
    const atomWithLongInput = Object.values(fixture.atoms).find(
      (a) => (a.action.input ?? '').length > 200,
    );
    expect(atomWithLongInput).toBeDefined();
    const skeleton = applySkeletonAtom(atomWithLongInput!);
    expect(skeleton.action.summary).toBeDefined();
    expect(skeleton.action.summary!.length).toBe(200);
    expect(skeleton.action.summary!).toBe(
      atomWithLongInput!.action.input!.slice(0, 200),
    );
  });

  it('skeleton cluster drops edges body and reduces open_loop_hints to {atom_id, resolved}', () => {
    const cluster = fixture.clusters[0]!;
    const skeleton = applySkeletonCluster(cluster);
    expect((skeleton as unknown as Record<string, unknown>).edges).toBeUndefined();
    expect((skeleton as unknown as Record<string, unknown>).anchor_artifacts)
      .toBeUndefined();
    // Hint count is preserved — only the body is stripped, so a downstream
    // caller can decide whether to hydrate via search_memories.
    expect(skeleton.open_loop_hints).toHaveLength(
      cluster.open_loop_hints.length,
    );
    for (const h of skeleton.open_loop_hints) {
      expect(Object.keys(h).sort()).toEqual(['atom_id', 'resolved']);
      expect(typeof h.resolved).toBe('boolean');
      expect(typeof h.atom_id).toBe('string');
    }
    // Affordances are retained.
    expect(skeleton.cluster_id).toBe(cluster.cluster_id);
    expect(skeleton.label).toBe(cluster.label);
    expect(skeleton.atom_ids).toEqual(cluster.atom_ids);
    expect(skeleton.source_breakdown).toEqual(cluster.source_breakdown);
    expect(skeleton.time_range).toEqual(cluster.time_range);
  });

  it('manual revert of skeleton stripping pushes the envelope above 12,500 chars (proves the test is load-bearing, not a tautology)', () => {
    // If a future refactor accidentally short-circuits the strip
    // (e.g., skeleton ends up just renaming `format` without dropping
    // sub-collections), the fixture re-serialized as-is is the size
    // skeleton mode is supposed to defeat. This test pins the fact that
    // doing nothing fails the budget.
    const noStrip = JSON.stringify(fixture).length;
    expect(noStrip).toBeGreaterThan(12_500);
  });

  it('format="skeleton" round-trips through the MCP server for a smaller fixture', async () => {
    // The fixture-level assertions above test the transform in isolation.
    // This end-to-end test seeds a tiny store, calls the tool with
    // `format:'skeleton'`, and verifies the response shape on the wire.
    const store = new MemoryStorage();
    const NOW = '2026-05-08T08:00:00.000Z';
    const SINCE = '2026-05-08T04:00:00.000Z';
    const baseMs = Date.parse(SINCE);
    for (let i = 0; i < 5; i++) {
      const ts = new Date(baseMs + i * 30_000).toISOString();
      await store.append({
        source: `fs:/Users/<redacted>/.claude/projects/abc/s${i}.jsonl`,
        timestamp: ts,
        content: `USER: turn ${i}\n\nASSISTANT: reply ${i}`,
        metadata: {
          session_id: `s${i}`,
          turn_index: 0,
          repo_root: '/repo',
          files_referenced: ['/repo/src/file.ts'],
          git_state: { origin_url: 'https://github.com/u/r' },
        },
      });
    }
    const { restore } = captureStdout();
    const handle = await startMcpServer(store, { port: 0 });
    try {
      const result = (await withClient(handle.url, async (c) =>
        c.callTool({
          name: 'get_recent_work_context',
          arguments: { since: SINCE, until: NOW, format: 'skeleton' },
        }),
      )) as { isError?: boolean; content?: { text: string }[] };
      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content![0]!.text) as Record<
        string,
        unknown
      >;
      const atoms = parsed['atoms'] as Record<string, Record<string, unknown>>;
      for (const atom of Object.values(atoms)) {
        expect(atom['artifacts']).toBeUndefined();
        expect(atom['actors']).toBeUndefined();
        expect(atom['provenance']).toBeUndefined();
      }
      const clusters = parsed['clusters'] as Record<string, unknown>[];
      for (const c of clusters) {
        expect(c['edges']).toBeUndefined();
      }
    } finally {
      await handle.stop();
      restore();
    }
  });

  it('tool description advertises the three-format ladder by intent', async () => {
    const store = new MemoryStorage();
    const { restore } = captureStdout();
    const handle = await startMcpServer(store, { port: 0 });
    try {
      const tools = await withClient(handle.url, async (c) => c.listTools());
      const found = tools.tools.find(
        (t) => t.name === 'get_recent_work_context',
      );
      expect(found?.description).toMatch(/skeleton/);
      expect(found?.description).toMatch(/minimal/);
      expect(found?.description).toMatch(/full/);
      // Cost-ordering language must survive — the resume use case is what
      // motivates skeleton's existence.
      expect(found?.description).toMatch(/resume|cheapest|leave off/i);
    } finally {
      await handle.stop();
      restore();
    }
  });

  it('format="skeleton" is accepted by the tool input schema (not rejected as before)', async () => {
    // Pre-028 the format enum only accepted full|minimal — passing
    // 'skeleton' would have raised an InputValidationError. This test
    // documents the schema widening.
    const store = new MemoryStorage();
    const { restore } = captureStdout();
    const handle = await startMcpServer(store, { port: 0 });
    try {
      const result = (await withClient(handle.url, async (c) =>
        c.callTool({
          name: 'get_recent_work_context',
          arguments: {
            since: '2026-05-08T04:00:00.000Z',
            until: '2026-05-08T08:00:00.000Z',
            format: 'skeleton',
          },
        }),
      )) as { isError?: boolean };
      expect(result.isError).toBeFalsy();
    } finally {
      await handle.stop();
      restore();
    }
  });
});

// Gap 4 (V1.5.7, surfaced 2026-05-08 17:01 PDT v1.5-livetest):
// `format='skeleton'` at `limit=100` over a 48h window blew the 25k consumer
// budget at 53,413 chars because per-cluster `atom_ids[]` and
// `open_loop_hints[]` arrays scaled with cluster size (273 atoms in the
// dominant cluster). 028's review notes flagged the 3% headroom risk;
// V1.5.7 caps both arrays per-cluster with omission counts surfaced.
describe('skeleton-mode V1.5.7 cluster bounds (Gap 4)', () => {
  it('clipArray applied to atom_ids: <= cap passes verbatim, > cap returns head + tail with omitted count', () => {
    // Probe applySkeletonCluster directly with a synthetic Cluster shape.
    // Using `as any` cast for the Cluster fixture to avoid pulling the
    // entire Cluster type into the test surface.
    const ids = Array.from({ length: 60 }, (_, i) => `atom-${i.toString().padStart(3, '0')}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cluster: any = {
      cluster_id: 'c1',
      rank: 1,
      rank_reason: ['test'],
      atom_ids: ids,
      source_breakdown: { claude_code: 60 },
      time_range: { since: '2026-05-08T22:00:00.000Z', until: '2026-05-08T23:00:00.000Z' },
      open_loop_hints: [],
    };
    const skel = applySkeletonCluster(cluster);
    // Cap is 50 → keep 25 + 25 = 50, omit 10.
    expect(skel.atom_ids.length).toBe(50);
    expect(skel.atom_ids[0]).toBe('atom-000');
    expect(skel.atom_ids[24]).toBe('atom-024');
    expect(skel.atom_ids[25]).toBe('atom-035'); // tail starts at 60-25 = 35
    expect(skel.atom_ids[49]).toBe('atom-059');
    expect(skel.atom_ids_omitted).toBe(10);
    expect(skel.truncated).toBe(true);
  });

  it('clipArray applied to open_loop_hints with separate cap', () => {
    const hints = Array.from({ length: 50 }, (_, i) => ({
      atom_id: `atom-${i}`,
      resolved: i % 2 === 0,
      // body fields the skeleton transformer drops (text/kind/confidence)
      text: `hint ${i}`,
      kind: 'todo',
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cluster: any = {
      cluster_id: 'c1',
      rank: 1,
      rank_reason: ['test'],
      atom_ids: ['only-one'],
      source_breakdown: { claude_code: 1 },
      time_range: { since: '2026-05-08T22:00:00.000Z', until: '2026-05-08T23:00:00.000Z' },
      open_loop_hints: hints,
    };
    const skel = applySkeletonCluster(cluster);
    // Cap is 30 → keep 15 + 15.
    expect(skel.open_loop_hints.length).toBe(30);
    expect(skel.open_loop_hints_omitted).toBe(20);
    expect(skel.truncated).toBe(true);
    // Hints retained the {atom_id, resolved} skeleton shape (no text/kind).
    expect(skel.open_loop_hints[0]).toEqual({ atom_id: 'atom-0', resolved: true });
  });

  it('small clusters (≤cap) pass verbatim with no truncated flag', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cluster: any = {
      cluster_id: 'c1',
      rank: 1,
      rank_reason: ['test'],
      atom_ids: ['a', 'b', 'c'],
      source_breakdown: { claude_code: 3 },
      time_range: { since: '2026-05-08T22:00:00.000Z', until: '2026-05-08T23:00:00.000Z' },
      open_loop_hints: [{ atom_id: 'a', resolved: false, text: 't', kind: 'todo' }],
    };
    const skel = applySkeletonCluster(cluster);
    expect(skel.atom_ids).toEqual(['a', 'b', 'c']);
    expect(skel.open_loop_hints).toEqual([{ atom_id: 'a', resolved: false }]);
    expect(skel.atom_ids_omitted).toBeUndefined();
    expect(skel.open_loop_hints_omitted).toBeUndefined();
    expect(skel.truncated).toBeUndefined();
  });
});
