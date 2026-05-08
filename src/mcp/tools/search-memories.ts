import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { homedir } from 'node:os';
import { z } from 'zod';
import type { CaptureEvent, QueryFilter, Storage } from '../../storage/interface.js';
import { CursorDecodeError, decodeCursor, encodeCursor } from './_cursor.js';
// Re-export for any pre-existing callers / tests that imported the cursor
// helpers from search-memories. New callers should import from `_cursor.ts`.
export {
  CursorDecodeError,
  decodeCursor,
  encodeCursor,
  type DecodedCursor,
} from './_cursor.js';

export const SEARCH_MEMORIES_DESCRIPTION =
  "Search the user's captured ECHO memories (Cursor + Claude Code + Codex conversations, git commits) by free-text query, app, source prefix, or time range. Returns the most recent matching events. Prefer `source_app` (`cursor` | `claude_code` | `codex` | `git`) for app-scoped queries; falls through to the FS-encoded `source_prefix` if you need a path-precise filter (e.g. a single Codex rollout JSONL). When both `source_app` and `source_prefix` are passed, `source_prefix` wins (explicit-over-implicit). Free-text query is matched as a case-insensitive literal substring against the event content; this is NOT a semantic / KNN search. Use exact tokens (file paths, SHAs, error codes) rather than paraphrased questions. For result sets exceeding `limit`, the response carries an opaque `next_cursor` string — pass it back verbatim as `cursor` on the next call to page through; do not construct one client-side. `next_cursor` is `null` when there are no more rows.";

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

// Per-match content envelope cap (Bug A, surfaced 2026-05-08 15:54 PDT
// post-026+027 dogfooding round). A real Codex turn JSONL atom is ~100KB;
// without this cap, three matches can blow the 25k consumer tool-result
// budget by 12.7×. Each match's `content` is clipped to head + elision
// marker + tail at PER_MATCH_CONTENT_CAP total chars; `bytes_elided` carries
// the dropped char count so the consumer can size the missing remainder.
//
// Cap chosen so 10 matches × cap × ~1.05 marker overhead < 25k budget,
// leaving room for envelope/metadata.
export const PER_MATCH_CONTENT_CAP = 2_000;
const PER_MATCH_HEAD_CHARS = 1_000;
const PER_MATCH_TAIL_CHARS = PER_MATCH_CONTENT_CAP - PER_MATCH_HEAD_CHARS;

// Basic ISO 8601 structural check: YYYY-MM-DDTHH:MM:SS(.sss)?(Z|±HH:MM)?
const ISO8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const isoString = z
  .string()
  .regex(ISO8601_RE, 'expected ISO 8601 timestamp like 2026-04-30T12:00:00.000Z');

// Logical app names → literal FS source prefixes. Keep in sync with
// src/capture/sources.ts (CAPTURED_SOURCES.fs_paths) and the per-app extractors.
// `git` is path-prefix `git:` because git commits are stored with that scheme,
// not under any homedir path. Resolved once at module load using os.homedir().
const SOURCE_APP_MAP: Record<'cursor' | 'claude_code' | 'codex' | 'git', string> = (() => {
  const HOME = homedir();
  return {
    cursor: `fs:${HOME}/Library/Application Support/Cursor/`,
    claude_code: `fs:${HOME}/.claude/projects/`,
    codex: `fs:${HOME}/.codex/sessions/`,
    git: 'git:',
  };
})();

const SOURCE_APP_VALUES = ['cursor', 'claude_code', 'codex', 'git'] as const;
type SourceApp = (typeof SOURCE_APP_VALUES)[number];

export interface SearchMatch {
  id: string;
  source: string;
  timestamp: string;
  content: string;
  // Present only when `content` was clipped by PER_MATCH_CONTENT_CAP. The
  // original content length is `content.length - markerOverhead + bytes_elided`,
  // but the simpler invariant for consumers is: missing chars = bytes_elided.
  bytes_elided?: number;
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  matches: SearchMatch[];
  total_returned: number;
  limit_applied: number;
  next_cursor: string | null;
  query_echo: {
    query: string | null;
    source_app: SourceApp | null;
    source_prefix: string | null;
    since: string | null;
    until: string | null;
    cursor: string | null;
    limit: number;
  };
}

export interface SearchMemoriesParams {
  query?: string;
  source_app?: SourceApp;
  source_prefix?: string;
  since?: string;
  until?: string;
  cursor?: string;
  limit?: number;
}

function clampLimit(input: number | undefined): number {
  if (input === undefined) return DEFAULT_LIMIT;
  const floored = Math.floor(input);
  return Math.min(Math.max(1, floored), MAX_LIMIT);
}

function sortDesc(events: CaptureEvent[]): CaptureEvent[] {
  // Mirror the storage `ORDER BY timestamp DESC, id DESC` contract: ties on
  // millisecond-equal timestamps break on id lex DESC for deterministic
  // pagination. Same direction as timestamp — never mix asc/desc.
  return [...events].sort((a, b) => {
    if (a.timestamp < b.timestamp) return 1;
    if (a.timestamp > b.timestamp) return -1;
    if (a.id < b.id) return 1;
    if (a.id > b.id) return -1;
    return 0;
  });
}

function clipContent(content: string): { content: string; bytes_elided?: number } {
  if (content.length <= PER_MATCH_CONTENT_CAP) return { content };
  const head = content.slice(0, PER_MATCH_HEAD_CHARS);
  const tail = content.slice(content.length - PER_MATCH_TAIL_CHARS);
  const bytes_elided = content.length - PER_MATCH_HEAD_CHARS - PER_MATCH_TAIL_CHARS;
  // Marker is recognisable for both human + programmatic readers; the
  // `bytes_elided` field on the match is the canonical machine reading.
  const marker = `\n…[${bytes_elided} chars elided]…\n`;
  return { content: head + marker + tail, bytes_elided };
}

function toMatch(e: CaptureEvent): SearchMatch {
  const clipped = clipContent(e.content);
  const m: SearchMatch = {
    id: e.id,
    source: e.source,
    timestamp: e.timestamp,
    content: clipped.content,
  };
  if (clipped.bytes_elided !== undefined) m.bytes_elided = clipped.bytes_elided;
  if (e.metadata !== undefined) m.metadata = e.metadata;
  return m;
}

function emitCursor(rows: CaptureEvent[], limitApplied: number): {
  kept: CaptureEvent[];
  next_cursor: string | null;
} {
  if (rows.length > limitApplied) {
    const kept = rows.slice(0, limitApplied);
    const last = kept[kept.length - 1]!;
    return { kept, next_cursor: encodeCursor({ timestamp: last.timestamp, id: last.id }) };
  }
  return { kept: rows, next_cursor: null };
}

export async function searchMemories(
  storage: Storage,
  params: SearchMemoriesParams,
): Promise<SearchResult> {
  const { query, source_app, source_prefix, since, until, cursor, limit } = params;
  const limitApplied = clampLimit(limit);

  // source_prefix wins on conflict (explicit-over-implicit escape hatch). Both
  // are echoed in query_echo so callers can see which one ended up applied.
  let effectivePrefix: string | undefined = source_prefix;
  if (effectivePrefix === undefined && source_app !== undefined) {
    effectivePrefix = SOURCE_APP_MAP[source_app];
  }

  let before: { timestamp: string; id: string } | undefined;
  if (cursor !== undefined) {
    before = decodeCursor(cursor);
  }

  const filter: QueryFilter = {};
  if (effectivePrefix !== undefined) filter.source_prefix = effectivePrefix;
  if (since !== undefined) filter.since = since;
  if (until !== undefined) filter.until = until;
  if (before !== undefined) filter.before = before;

  // Two paths through the result list, two overfetch sites — keep them legible
  // so the next reader doesn't collapse them into one and re-introduce item
  // 022's filter-before-slice bug:
  //   (A) recency-only path (`query === undefined`): pass `limit + 1` to
  //       storage. Storage returns rows already ordered DESC; we drop the
  //       extra and emit a cursor if it was present.
  //   (B) substring-query path (`query !== undefined`): do NOT pass any limit
  //       to storage — the substring filter runs in JS over the FULL window,
  //       so an upstream limit would silently drop matches outside the
  //       newest-N. Slice to `limit + 1` AFTER the substring filter and emit
  //       cursor from the last kept row.
  if (query === undefined) filter.limit = limitApplied + 1;

  const all = await storage.query(filter);
  const sorted = sortDesc(all);
  let candidates = sorted;

  if (query !== undefined) {
    const q = query.toLowerCase();
    candidates = candidates.filter((e) => e.content.toLowerCase().includes(q));
  }

  // Path-aware overfetch slicing. Both paths converge here once their
  // candidate list is in DESC order: keep up to `limit + 1`, drop the extra,
  // emit cursor from the last kept row.
  const overfetched = candidates.slice(0, limitApplied + 1);
  const { kept, next_cursor } = emitCursor(overfetched, limitApplied);

  return {
    matches: kept.map(toMatch),
    total_returned: kept.length,
    limit_applied: limitApplied,
    next_cursor,
    query_echo: {
      query: query ?? null,
      source_app: source_app ?? null,
      source_prefix: source_prefix ?? null,
      since: since ?? null,
      until: until ?? null,
      cursor: cursor ?? null,
      limit: limitApplied,
    },
  };
}

// Single source-of-truth Zod shape for a captured atom in MCP tool responses.
// Exported so `tail_session` (item 026) and any future retrieval tool reuse
// the exact same type — keeps consumers stable when ECHO adds a tool.
export const searchMatchSchema = z.object({
  id: z.string(),
  source: z.string(),
  timestamp: z.string(),
  content: z.string(),
  // Optional — present only when content was clipped by PER_MATCH_CONTENT_CAP.
  bytes_elided: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// outputSchema for `tools/list` advertisement and structured-content
// validation by the SDK. Mirrors SearchResult; matches use `z.unknown()` for
// the optional metadata bag (its shape varies per source).
const searchMemoriesOutputSchema = {
  matches: z.array(searchMatchSchema),
  total_returned: z.number(),
  limit_applied: z.number(),
  next_cursor: z.string().nullable(),
  query_echo: z.object({
    query: z.string().nullable(),
    source_app: z.enum(SOURCE_APP_VALUES).nullable(),
    source_prefix: z.string().nullable(),
    since: z.string().nullable(),
    until: z.string().nullable(),
    cursor: z.string().nullable(),
    limit: z.number(),
  }),
};

export function registerSearchMemories(server: McpServer, storage: Storage): void {
  server.registerTool(
    'search_memories',
    {
      description: SEARCH_MEMORIES_DESCRIPTION,
      inputSchema: {
        query: z.string().optional(),
        source_app: z.enum(SOURCE_APP_VALUES).optional(),
        source_prefix: z.string().optional(),
        since: isoString.optional(),
        until: isoString.optional(),
        cursor: z.string().optional(),
        limit: z.number().optional(),
      },
      outputSchema: searchMemoriesOutputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      let result: SearchResult;
      try {
        result = await searchMemories(storage, input as SearchMemoriesParams);
      } catch (err) {
        if (err instanceof CursorDecodeError) {
          // MCP semantics: tool errors are signalled by isError:true on the
          // result envelope — NOT by a JSON-RPC validation rejection. We
          // deliberately omit `structuredContent` because the success
          // outputSchema's `next_cursor: nullable string` cannot represent
          // the error variant.
          return {
            isError: true,
            content: [{ type: 'text', text: err.message }],
          };
        }
        throw err;
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    },
  );
}
