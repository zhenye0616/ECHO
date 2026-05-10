import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { homedir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startMcpServer, type McpServerHandle } from '../../../src/mcp/server.js';
import { MemoryStorage } from '../../../src/storage/memory.js';
import {
  tailSession,
  type TailSessionResult,
} from '../../../src/mcp/tools/tail-session.js';
import { encodeCursor } from '../../../src/mcp/tools/_cursor.js';
import type { CaptureEvent } from '../../../src/storage/interface.js';
import { captureStdout } from '../../fixtures/stdout.js';

interface ToolContent {
  type: string;
  text: string;
}

interface CallToolResultLike {
  content?: ToolContent[];
  structuredContent?: unknown;
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

async function callTailSession(
  url: string,
  args: Record<string, unknown>,
): Promise<CallToolResultLike> {
  return withClient(url, async (client) =>
    (await client.callTool({
      name: 'tail_session',
      arguments: args,
    })) as CallToolResultLike,
  );
}

function parseStructured(res: CallToolResultLike): TailSessionResult {
  const text = res.content?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error(`tool result has no text content: ${JSON.stringify(res)}`);
  }
  return JSON.parse(text) as TailSessionResult;
}

describe('tailSession (handler-level)', () => {
  it('exact-source happy path: returns the N newest events for that source, next_cursor non-null when more exist', async () => {
    const store = new MemoryStorage();
    // 10 events under source A, 5 under source B, with strictly-monotonic ts.
    const eventsA: Omit<CaptureEvent, 'id'>[] = [];
    for (let i = 0; i < 10; i++) {
      eventsA.push({
        source: 'fs:A',
        timestamp: `2026-04-25T10:00:${i.toString().padStart(2, '0')}.000Z`,
        content: `A turn ${i}`,
      });
    }
    const eventsB: Omit<CaptureEvent, 'id'>[] = [];
    for (let i = 0; i < 5; i++) {
      eventsB.push({
        source: 'fs:B',
        timestamp: `2026-04-25T11:00:${i.toString().padStart(2, '0')}.000Z`,
        content: `B turn ${i}`,
      });
    }
    for (const e of [...eventsA, ...eventsB]) await store.append(e);

    const result = await tailSession(store, { source: 'fs:A', count: 3 });

    expect(result.turns).toHaveLength(3);
    expect(result.turns.every((t) => t.source === 'fs:A')).toBe(true);
    // Newest-first: indices 9, 8, 7
    expect(result.turns.map((t) => t.content)).toEqual([
      'A turn 9',
      'A turn 8',
      'A turn 7',
    ]);
    expect(result.next_cursor).not.toBeNull();
    expect(result.source_resolved).toBe('fs:A');
    expect(result.warnings).toEqual([]);
  });

  it('source_app happy path: resolves to the most-recently-active session under the app prefix', async () => {
    const store = new MemoryStorage();
    const HOME = homedir();
    const codexPrefix = `fs:${HOME}/.codex/sessions/`;
    // Three rollouts, each with 3 turns. Session-Z is the newest by ts.
    const sessions = [
      { src: `${codexPrefix}rollout-X.jsonl`, baseHour: 10 },
      { src: `${codexPrefix}rollout-Y.jsonl`, baseHour: 11 },
      { src: `${codexPrefix}rollout-Z.jsonl`, baseHour: 12 },
    ];
    for (const s of sessions) {
      for (let i = 0; i < 3; i++) {
        await store.append({
          source: s.src,
          timestamp: `2026-04-25T${s.baseHour.toString().padStart(2, '0')}:00:${i
            .toString()
            .padStart(2, '0')}.000Z`,
          content: `${s.src} turn ${i}`,
        });
      }
    }

    const result = await tailSession(store, { source_app: 'codex', count: 2 });

    expect(result.source_resolved).toBe(`${codexPrefix}rollout-Z.jsonl`);
    expect(result.turns).toHaveLength(2);
    expect(result.turns.every((t) => t.source === `${codexPrefix}rollout-Z.jsonl`)).toBe(
      true,
    );
    // Newest-first within Z: indices 2, 1
    expect(result.turns.map((t) => t.content)).toEqual([
      `${codexPrefix}rollout-Z.jsonl turn 2`,
      `${codexPrefix}rollout-Z.jsonl turn 1`,
    ]);
    // 3 turns - 2 returned = 1 remaining → next_cursor is null (overfetch
    // grabbed only 3, kept 2, no extra to anchor a cursor on).
    expect(result.next_cursor).not.toBeNull();
    expect(result.warnings).toEqual([]);
  });

  it('source-not-found: returns empty turns + warning, NOT an error, source_resolved echoes the input', async () => {
    const store = new MemoryStorage();
    await store.append({
      source: 'fs:A',
      timestamp: '2026-04-25T10:00:00.000Z',
      content: 'A 0',
    });

    const result = await tailSession(store, {
      source: 'fs:nonexistent.jsonl',
      count: 5,
    });

    expect(result.turns).toEqual([]);
    expect(result.next_cursor).toBeNull();
    expect(result.source_resolved).toBe('fs:nonexistent.jsonl');
    expect(result.warnings).toEqual(['no captured atoms for this source']);
  });

  it('source_app empty store: source_resolved is null with the codex-specific warning', async () => {
    const store = new MemoryStorage();

    const result = await tailSession(store, { source_app: 'codex' });

    expect(result.turns).toEqual([]);
    expect(result.next_cursor).toBeNull();
    expect(result.source_resolved).toBeNull();
    expect(result.warnings).toEqual([
      'no captured sessions found for source_app=codex',
    ]);
  });

  it('count clamping: count: 100 is silently clamped to 20 (not rejected)', async () => {
    const store = new MemoryStorage();
    for (let i = 0; i < 30; i++) {
      await store.append({
        source: 'fs:A',
        timestamp: `2026-04-25T10:00:${i.toString().padStart(2, '0')}.000Z`,
        content: `A turn ${i}`,
      });
    }

    const result = await tailSession(store, { source: 'fs:A', count: 100 });

    expect(result.turns).toHaveLength(20);
    // Newest-first, so indices 29..10
    expect(result.turns[0]!.content).toBe('A turn 29');
    expect(result.turns[19]!.content).toBe('A turn 10');
    expect(result.next_cursor).not.toBeNull();
  });

  it('default count is 5', async () => {
    const store = new MemoryStorage();
    for (let i = 0; i < 8; i++) {
      await store.append({
        source: 'fs:A',
        timestamp: `2026-04-25T10:00:${i.toString().padStart(2, '0')}.000Z`,
        content: `A turn ${i}`,
      });
    }
    const result = await tailSession(store, { source: 'fs:A' });
    expect(result.turns).toHaveLength(5);
  });
});

// Bug B — `tail_session(source_app=<app>)` must not return fs-watcher
// meta-events.
//
// Surfaced by the 2026-05-08 15:54 PDT post-026+027 dogfooding round:
// `tail_session(source_app='codex')` and `tail_session(source_app='claude_code')`
// both returned atoms whose content was a fs-watcher event payload
// (`{event_type:"change", path:"...", mtime:"...", size:N}`,
// `metadata.surface:"fs"`) — i.e., the file-modification meta-stream
// targeting the app's session file, NOT the app's extracted turn atoms.
//
// Contract (mirrors `recent-work-context.ts:171` `exclude_metadata_surface`):
// when resolving and tailing for `source_app=<app>` AND when tailing an
// explicit `source=` path, fs-watcher meta-events
// (`metadata.surface === 'fs'`) MUST be excluded. The cheap-tool intent of
// tail_session is "show me the last N things this app actually did," not
// "show me the file-modification stream."
describe('tailSession Bug B — fs-watcher meta-events must be excluded', () => {
  it('source_app: returns extractor turn atoms, not fs-watcher events under the same source', async () => {
    const store = new MemoryStorage();
    const HOME = homedir();
    const codexPrefix = `fs:${HOME}/.codex/sessions/`;
    const rolloutSrc = `${codexPrefix}rollout-2026-05-08.jsonl`;

    // Seed five fs-watcher events on the rollout file (the noisy meta-stream
    // — every file mtime tick) AND three extractor turn atoms (the actual
    // captured codex content). All share the same `source` string. Only the
    // surface metadata distinguishes them.
    for (let i = 0; i < 5; i++) {
      await store.append({
        source: rolloutSrc,
        timestamp: `2026-05-08T22:00:${i.toString().padStart(2, '0')}.000Z`,
        content: JSON.stringify({
          event_type: 'change',
          path: rolloutSrc,
          mtime: `2026-05-08T22:00:${i}.000Z`,
          size: 1234 + i,
        }),
        metadata: { surface: 'fs', file_kind: 'codex-rollout' },
      });
    }
    for (let i = 0; i < 3; i++) {
      await store.append({
        source: rolloutSrc,
        timestamp: `2026-05-08T22:10:${i.toString().padStart(2, '0')}.000Z`,
        content: `EXTRACTOR_TURN_${i}: codex assistant said something interesting here`,
        metadata: { surface: 'codex', turn_index: i },
      });
    }

    const result = await tailSession(store, { source_app: 'codex', count: 5 });

    expect(result.source_resolved).toBe(rolloutSrc);
    // We get the 3 extractor turns back, NEVER any fs-watcher events.
    expect(result.turns).toHaveLength(3);
    expect(result.turns.every((t) => t.content.startsWith('EXTRACTOR_TURN_'))).toBe(true);
    expect(
      result.turns.every((t) => (t.metadata as { surface?: string }).surface !== 'fs'),
    ).toBe(true);
  });

  it('source_app: when ONLY fs-watcher events exist under the prefix, source resolution returns empty + warning (does not fall back to fs noise)', async () => {
    const store = new MemoryStorage();
    const HOME = homedir();
    const codexPrefix = `fs:${HOME}/.codex/sessions/`;

    for (let i = 0; i < 5; i++) {
      await store.append({
        source: `${codexPrefix}rollout-X.jsonl`,
        timestamp: `2026-05-08T22:00:${i.toString().padStart(2, '0')}.000Z`,
        content: JSON.stringify({ event_type: 'change', size: i }),
        metadata: { surface: 'fs' },
      });
    }

    const result = await tailSession(store, { source_app: 'codex' });

    // Pre-fix: would have resolved to the rollout file and returned 5
    // fs-watcher events. Post-fix: resolution finds no eligible
    // (non-fs-surface) atom under the prefix → empty + warning, same shape
    // as a truly empty store.
    expect(result.source_resolved).toBeNull();
    expect(result.turns).toEqual([]);
    expect(result.warnings).toEqual([
      'no captured sessions found for source_app=codex',
    ]);
  });

  it('exact source: same exclusion applies — explicit `source=` path returns extractor atoms, not fs noise', async () => {
    const store = new MemoryStorage();
    const exactSrc = 'fs:/tmp/some-rollout.jsonl';

    for (let i = 0; i < 4; i++) {
      await store.append({
        source: exactSrc,
        timestamp: `2026-05-08T22:00:${i.toString().padStart(2, '0')}.000Z`,
        content: JSON.stringify({ event_type: 'change', size: i }),
        metadata: { surface: 'fs' },
      });
    }
    for (let i = 0; i < 2; i++) {
      await store.append({
        source: exactSrc,
        timestamp: `2026-05-08T22:10:${i.toString().padStart(2, '0')}.000Z`,
        content: `EXTRACTED_${i}`,
        metadata: { surface: 'codex' },
      });
    }

    const result = await tailSession(store, { source: exactSrc, count: 5 });

    expect(result.source_resolved).toBe(exactSrc);
    expect(result.turns).toHaveLength(2);
    expect(result.turns.map((t) => t.content)).toEqual(['EXTRACTED_1', 'EXTRACTED_0']);
  });
});

// V1.5.6 wire-shape projector — closes Bug A2 (per-key metadata cap on
// tail_session) AND the Bug A1 reach gap (tail_session previously had no
// content cap). Both tools (search_memories + tail_session) now go through
// `src/mcp/wire-shape/match.ts:projectMatch` so envelope discipline is one
// codepath.
describe('tailSession V1.5.6 — wire-shape projector envelope budget', () => {
  it('5 turns × ~95KB tool_calls metadata stays under 25k bytes (the 16:14 PDT failure mode)', async () => {
    // Mirrors tail_session(source_app='claude_code') at 16:14 PDT: 5 turns
    // returned, 2 of them carrying 50-65KB metadata.tool_calls each. Pre-fix
    // the response was 128k chars; per-key metadata cap brings it under
    // budget. Test fails on a manual revert of the metadata cap.
    const store = new MemoryStorage();
    const exactSrc = 'fs:/tmp/heavy-session.jsonl';
    for (let i = 0; i < 5; i++) {
      await store.append({
        source: exactSrc,
        timestamp: `2026-05-08T22:00:${i.toString().padStart(2, '0')}.000Z`,
        content: `USER: q${i}\n\nASSISTANT: short answer ${i}`,
        metadata: {
          session_id: 'sess-x',
          turn_index: i,
          git_state: { branch: 'main' },
          tool_calls: Array.from({ length: 30 }, (_, j) => ({
            name: 'Bash',
            args: 'a'.repeat(2_000),
            output: 'b'.repeat(1_000),
            call_id: `c_${j}`,
          })),
        },
      });
    }

    const r = await tailSession(store, { source: exactSrc, count: 5 });

    expect(r.turns).toHaveLength(5);
    const envelopeBytes = JSON.stringify(r).length;
    expect(envelopeBytes).toBeLessThan(25_000);
    // V1.5.6.1: tool_calls is now PROJECTED to a name trajectory (workflow
    // shape), not opaqued out.
    expect(
      r.turns.every((t) => t.metadata_keys_projected?.includes('tool_calls')),
    ).toBe(true);
    expect(
      r.turns.every(
        (t) =>
          Array.isArray(t.metadata?.['tool_calls']) &&
          (t.metadata!['tool_calls'] as string[]).every((n) => n === 'Bash'),
      ),
    ).toBe(true);
    expect(r.turns.every((t) => t.metadata?.['tool_calls_by_name'] !== undefined)).toBe(
      true,
    );
    // Per-KEY semantics: small structured neighbours pass verbatim.
    expect(r.turns.every((t) => t.metadata?.['session_id'] === 'sess-x')).toBe(true);
    expect(r.turns.every((t) => t.metadata?.['git_state'] !== undefined)).toBe(true);
  });

  it('long content (Bug A1 reach gap) is now clipped via the projector — 100KB content turn returns under 5KB content', async () => {
    // tail-session.ts pre-V1.5.6 had its own toMatch with NO content cap.
    // Today this is masked because real tail content is small, but a
    // long-content extractor atom (e.g., Cursor session with very long
    // assistant turns) would have surfaced the same Bug A1 failure mode.
    // V1.5.6 unifies via projectMatch; this test asserts the cap is engaged.
    const store = new MemoryStorage();
    const exactSrc = 'fs:/tmp/long-content.jsonl';
    await store.append({
      source: exactSrc,
      timestamp: '2026-05-08T22:00:00.000Z',
      content: 'HEAD_SENTINEL_' + 'x'.repeat(100_000) + '_TAIL_SENTINEL',
    });

    const r = await tailSession(store, { source: exactSrc });

    expect(r.turns).toHaveLength(1);
    const t = r.turns[0]!;
    expect(t.content.length).toBeLessThan(5_000);
    expect(t.content.startsWith('HEAD_SENTINEL_')).toBe(true);
    expect(t.content.endsWith('_TAIL_SENTINEL')).toBe(true);
    expect(t.bytes_elided).toBeGreaterThan(0);
    // V1.6 (item 030): content cap fired → truncations contains "content".
    expect(t.truncations).toContain('content');
  });

  it('V1.6 (item 030) — truncations is always present (empty when nothing clipped)', async () => {
    const store = new MemoryStorage();
    const exactSrc = 'fs:/tmp/clean.jsonl';
    await store.append({
      source: exactSrc,
      timestamp: '2026-05-08T22:00:00.000Z',
      content: 'small turn that fits',
      metadata: { session_id: 'abc' },
    });
    const r = await tailSession(store, { source: exactSrc });
    expect(r.turns).toHaveLength(1);
    expect(r.turns[0]!.truncations).toEqual([]);
  });
});

describe('tailSession (pagination + same-ms ties)', () => {
  it('25 events, count 10 → 10 + cursor → 10 + cursor → 5 + null cursor (no skips, no duplicates)', async () => {
    const store = new MemoryStorage();
    for (let i = 0; i < 25; i++) {
      await store.append({
        source: 'fs:A',
        timestamp: `2026-04-25T10:${i.toString().padStart(2, '0')}:00.000Z`,
        content: `A turn ${i}`,
      });
    }

    const seen = new Set<string>();
    let cursor: string | undefined;
    let pageCount = 0;
    let totalReturned = 0;
    const expectedSizes = [10, 10, 5];

    while (true) {
      const args: Record<string, unknown> = { source: 'fs:A', count: 10 };
      if (cursor !== undefined) args['cursor'] = cursor;
      const r = await tailSession(store, args);
      expect(r.turns).toHaveLength(expectedSizes[pageCount]!);
      for (const t of r.turns) {
        expect(seen.has(t.id)).toBe(false);
        seen.add(t.id);
        totalReturned++;
      }
      pageCount++;
      if (r.next_cursor === null) break;
      cursor = r.next_cursor;
    }

    expect(pageCount).toBe(3);
    expect(totalReturned).toBe(25);
    expect(seen.size).toBe(25);
  });

  it('5 events sharing one timestamp paginate fully (composite cursor breaks ties on id DESC)', async () => {
    const store = new MemoryStorage();
    // 5 events at the same wall-clock millisecond — id DESC is the only
    // discriminator. Composite cursor must page through them without
    // skips / duplicates.
    const sharedTs = '2026-04-25T10:00:00.000Z';
    for (let i = 0; i < 5; i++) {
      await store.append({
        source: 'fs:A',
        timestamp: sharedTs,
        content: `same-ms ${i}`,
      });
    }

    const seen = new Set<string>();
    let cursor: string | undefined;
    let pageCount = 0;

    while (true) {
      const args: Record<string, unknown> = { source: 'fs:A', count: 2 };
      if (cursor !== undefined) args['cursor'] = cursor;
      const r = await tailSession(store, args);
      for (const t of r.turns) {
        expect(seen.has(t.id)).toBe(false);
        seen.add(t.id);
      }
      pageCount++;
      if (r.next_cursor === null) break;
      cursor = r.next_cursor;
    }

    expect(seen.size).toBe(5);
    // 5/2 = 3 pages (2, 2, 1)
    expect(pageCount).toBe(3);
  });
});

// V1.5.7 polish (2026-05-09): no-args fallback. Pre-fix, calling
// `tail_session()` with neither `source` nor `source_app` returned a
// schema rejection envelope — the morning's resume call hit this and
// had to retry. Post-fix, the handler scans the four known app prefixes
// for the freshest non-fs atom inside a 24h window and tails that app's
// most-recent session, mirroring the ergonomic shape `source_app=` already
// has for a single app.
describe('tailSession no-args fallback (V1.5.7 polish 2026-05-09)', () => {
  const HOME = homedir();

  it('picks the freshest source_app across all four prefixes', async () => {
    const storage = new MemoryStorage();
    // codex 04:00, claude_code 06:00 (freshest), cursor 02:00 — claude_code wins.
    await storage.append({
      source: `fs:${HOME}/.codex/sessions/abc.jsonl`,
      timestamp: '2026-05-09T04:00:00.000Z',
      content: 'codex turn',
    });
    await storage.append({
      source: `fs:${HOME}/.claude/projects/proj-x/sess-1.jsonl`,
      timestamp: '2026-05-09T06:00:00.000Z',
      content: 'cc turn',
    });
    await storage.append({
      source: `fs:${HOME}/Library/Application Support/Cursor/User/workspaceStorage/abc/state.vscdb`,
      timestamp: '2026-05-09T02:00:00.000Z',
      content: 'cursor turn',
    });

    const r = await tailSession(storage, {}, new Date('2026-05-09T07:00:00.000Z'));
    expect(r.source_app_resolved).toBe('claude_code');
    expect(r.source_resolved).toContain('.claude/projects/');
    expect(r.turns).toHaveLength(1);
    expect(r.turns[0]!.content).toBe('cc turn');
    expect(r.warnings).toHaveLength(0);
  });

  it('skips apps whose freshest atom is older than the 24h fallback window', async () => {
    const storage = new MemoryStorage();
    // codex is fresh (1h ago), claude_code is stale (48h ago) — codex wins
    // even though claude_code is alphabetically/order-wise different.
    await storage.append({
      source: `fs:${HOME}/.codex/sessions/recent.jsonl`,
      timestamp: '2026-05-09T06:00:00.000Z',
      content: 'fresh codex',
    });
    await storage.append({
      source: `fs:${HOME}/.claude/projects/proj-y/old.jsonl`,
      timestamp: '2026-05-07T07:00:00.000Z',
      content: 'stale cc',
    });

    const r = await tailSession(storage, {}, new Date('2026-05-09T07:00:00.000Z'));
    expect(r.source_app_resolved).toBe('codex');
    expect(r.turns[0]!.content).toBe('fresh codex');
  });

  it('returns empty + advisory warning when no app has activity in the last 24h', async () => {
    const storage = new MemoryStorage();
    // Single stale row outside the window.
    await storage.append({
      source: `fs:${HOME}/.codex/sessions/old.jsonl`,
      timestamp: '2026-05-05T00:00:00.000Z',
      content: 'old codex',
    });

    const r = await tailSession(storage, {}, new Date('2026-05-09T07:00:00.000Z'));
    expect(r.source_resolved).toBeNull();
    expect(r.source_app_resolved).toBeUndefined();
    expect(r.turns).toHaveLength(0);
    expect(r.warnings.some((w) => /no captured sessions.*last 24h/i.test(w))).toBe(true);
  });

  it('rejects no-args + cursor combination (cursor invalidates after fresh resolve)', async () => {
    const storage = new MemoryStorage();
    await storage.append({
      source: `fs:${HOME}/.codex/sessions/x.jsonl`,
      timestamp: '2026-05-09T06:00:00.000Z',
      content: 'codex',
    });
    const cursor = encodeCursor({
      timestamp: '2026-05-09T05:00:00.000Z',
      id: 'fake',
    });
    await expect(
      tailSession(storage, { cursor }, new Date('2026-05-09T07:00:00.000Z')),
    ).rejects.toThrow(/cursor.*requires.*source/i);
  });

  it('excludes fs-watcher meta-events from the resolution scan', async () => {
    const storage = new MemoryStorage();
    // fs-watcher noise IS the freshest under cursor's prefix, but it has
    // metadata.surface=fs and must be ignored. The codex turn (older but
    // non-fs) wins.
    await storage.append({
      source: `fs:${HOME}/Library/Application Support/Cursor/User/workspaceStorage/x/state.vscdb`,
      timestamp: '2026-05-09T06:30:00.000Z',
      content: '{"event_type":"change"}',
      metadata: { surface: 'fs' },
    });
    await storage.append({
      source: `fs:${HOME}/.codex/sessions/x.jsonl`,
      timestamp: '2026-05-09T05:00:00.000Z',
      content: 'codex turn',
    });

    const r = await tailSession(storage, {}, new Date('2026-05-09T07:00:00.000Z'));
    expect(r.source_app_resolved).toBe('codex');
  });
});

describe('tail_session (MCP wire — registered tool, schema validation, isError envelopes)', () => {
  let handle: McpServerHandle | null = null;
  let restoreStdout: () => void;

  beforeEach(() => {
    ({ restore: restoreStdout } = captureStdout());
  });

  afterEach(async () => {
    if (handle !== null) {
      await handle.stop();
      handle = null;
    }
    restoreStdout();
  });

  it('tools/list advertises tail_session with outputSchema + readOnlyHint', async () => {
    const storage = new MemoryStorage();
    handle = await startMcpServer(storage, { port: 0 });

    const tools = await withClient(handle.url, async (client) => client.listTools());
    const tail = tools.tools.find((t) => t.name === 'tail_session');
    expect(tail).toBeDefined();
    expect(tail?.annotations?.readOnlyHint).toBe(true);
    expect(tail?.outputSchema).toBeDefined();
    // Sanity-check the output shape names appear in the advertised schema.
    const schemaJson = JSON.stringify(tail?.outputSchema);
    expect(schemaJson).toContain('turns');
    expect(schemaJson).toContain('next_cursor');
    expect(schemaJson).toContain('source_resolved');
    expect(schemaJson).toContain('warnings');
  });

  it('end-to-end: source: fs:A returns the seeded turn through the wire', async () => {
    const storage = new MemoryStorage();
    await storage.append({
      source: 'fs:A',
      timestamp: '2026-04-25T10:00:00.000Z',
      content: 'wire turn',
    });
    handle = await startMcpServer(storage, { port: 0 });

    const res = await callTailSession(handle.url, { source: 'fs:A', count: 5 });
    expect(res.isError).not.toBe(true);
    const body = parseStructured(res);
    expect(body.turns).toHaveLength(1);
    expect(body.turns[0]!.content).toBe('wire turn');
    expect(body.source_resolved).toBe('fs:A');
  });

  it('rejects passing both source AND source_app via isError envelope', async () => {
    const storage = new MemoryStorage();
    handle = await startMcpServer(storage, { port: 0 });

    const res = await callTailSession(handle.url, {
      source: 'fs:A',
      source_app: 'codex',
    });
    expect(res.isError).toBe(true);
    expect(res.structuredContent).toBeUndefined();
    const text = res.content?.[0]?.text ?? '';
    expect(text).toMatch(/at most one of.*source.*source_app/i);
  });

  // V1.5.7 polish (2026-05-09): the "neither" case used to be rejected.
  // It now triggers the no-args fallback that auto-resolves the freshest
  // source_app across all apps in the last 24h. With an empty store the
  // fallback returns a successful empty envelope plus a "no sessions in
  // last 24h" warning — NOT an error, because the no-args shape is
  // a valid resume call.
  it('no-args (neither source nor source_app) falls back rather than rejecting', async () => {
    const storage = new MemoryStorage();
    handle = await startMcpServer(storage, { port: 0 });

    const res = await callTailSession(handle.url, {});
    expect(res.isError).not.toBe(true);
    const body = parseStructured(res);
    expect(body.turns).toHaveLength(0);
    expect(body.source_resolved).toBeNull();
    expect(body.source_app_resolved).toBeUndefined();
    expect(body.warnings.some((w) => /no captured sessions.*last 24h/i.test(w))).toBe(true);
  });

  it('rejects count: 0 via schema validation (NOT a clamp — hard reject)', async () => {
    const storage = new MemoryStorage();
    handle = await startMcpServer(storage, { port: 0 });

    let threwOrIsError = false;
    try {
      const res = await callTailSession(handle.url, { source: 'fs:A', count: 0 });
      if (res.isError === true) threwOrIsError = true;
    } catch {
      // The SDK may surface input-schema rejections as a thrown error from
      // callTool; either form (thrown OR isError envelope) counts as a
      // reject, since both are observable to the consumer.
      threwOrIsError = true;
    }
    expect(threwOrIsError).toBe(true);
  });

  it('count: 100 is clamped to 20 over the wire (not rejected)', async () => {
    const storage = new MemoryStorage();
    for (let i = 0; i < 25; i++) {
      await storage.append({
        source: 'fs:A',
        timestamp: `2026-04-25T10:00:${i.toString().padStart(2, '0')}.000Z`,
        content: `A turn ${i}`,
      });
    }
    handle = await startMcpServer(storage, { port: 0 });

    const res = await callTailSession(handle.url, { source: 'fs:A', count: 100 });
    expect(res.isError).not.toBe(true);
    const body = parseStructured(res);
    expect(body.turns).toHaveLength(20);
  });

  it('malformed cursor: not valid base64 → isError, no structuredContent', async () => {
    const storage = new MemoryStorage();
    await storage.append({
      source: 'fs:A',
      timestamp: '2026-04-25T10:00:00.000Z',
      content: 'A 0',
    });
    handle = await startMcpServer(storage, { port: 0 });

    const res = await callTailSession(handle.url, {
      source: 'fs:A',
      cursor: '!!!not-base64!!!',
    });
    expect(res.isError).toBe(true);
    expect(res.structuredContent).toBeUndefined();
    expect(res.content?.[0]?.text).toMatch(/malformed cursor/);
  });

  it('malformed cursor: valid base64 but empty → isError, no structuredContent', async () => {
    const storage = new MemoryStorage();
    await storage.append({
      source: 'fs:A',
      timestamp: '2026-04-25T10:00:00.000Z',
      content: 'A 0',
    });
    handle = await startMcpServer(storage, { port: 0 });

    const res = await callTailSession(handle.url, {
      source: 'fs:A',
      // Buffer.from('').toString('base64') === '' is filtered out by the
      // SDK as missing; instead use a base64 that decodes to empty JSON.
      cursor: Buffer.from('""').toString('base64'),
    });
    expect(res.isError).toBe(true);
    expect(res.structuredContent).toBeUndefined();
    expect(res.content?.[0]?.text).toMatch(/malformed cursor/);
  });

  it('malformed cursor: missing id field → isError, no structuredContent', async () => {
    const storage = new MemoryStorage();
    await storage.append({
      source: 'fs:A',
      timestamp: '2026-04-25T10:00:00.000Z',
      content: 'A 0',
    });
    handle = await startMcpServer(storage, { port: 0 });

    const partial = Buffer.from(
      JSON.stringify({ timestamp: '2026-04-25T10:00:00.000Z' }),
    ).toString('base64');
    const res = await callTailSession(handle.url, {
      source: 'fs:A',
      cursor: partial,
    });
    expect(res.isError).toBe(true);
    expect(res.structuredContent).toBeUndefined();
    expect(res.content?.[0]?.text).toMatch(/missing or non-string `id`/);
  });

  it('cursor reuse across tools: a search_memories cursor shape is decodable by tail_session (composite cursor is shared)', async () => {
    // Item 026 acceptance: cursor handling reuses spec 025 helpers, NOT a
    // duplicate. The shared {timestamp, id} composite cursor format is the
    // canonical contract — verify by constructing a cursor from a known
    // boundary and confirming tail_session pages from it correctly.
    const storage = new MemoryStorage();
    for (let i = 0; i < 10; i++) {
      await storage.append({
        source: 'fs:A',
        timestamp: `2026-04-25T10:00:${i.toString().padStart(2, '0')}.000Z`,
        content: `A turn ${i}`,
      });
    }
    handle = await startMcpServer(storage, { port: 0 });

    // First page (newest 3): 9, 8, 7
    const page1 = parseStructured(
      await callTailSession(handle.url, { source: 'fs:A', count: 3 }),
    );
    expect(page1.turns.map((t) => t.content)).toEqual([
      'A turn 9',
      'A turn 8',
      'A turn 7',
    ]);
    expect(page1.next_cursor).not.toBeNull();

    // Second page using a freshly-constructed composite cursor over the
    // same shared encode — proves the format is stable across both tools.
    const constructed = encodeCursor({
      timestamp: page1.turns[2]!.timestamp,
      id: page1.turns[2]!.id,
    });
    const page2 = parseStructured(
      await callTailSession(handle.url, {
        source: 'fs:A',
        count: 3,
        cursor: constructed,
      }),
    );
    expect(page2.turns.map((t) => t.content)).toEqual([
      'A turn 6',
      'A turn 5',
      'A turn 4',
    ]);
  });
});
