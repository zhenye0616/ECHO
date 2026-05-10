import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CaptureEvent, QueryFilter, Storage } from '../../storage/interface.js';
import { hasTzMarker, isoString, TZ_NAIVE_WARNING } from '../util/iso8601.js';
import { buildSourceAppMap, SOURCE_APP_VALUES, type SourceApp } from '../util/source-app.js';
import { projectMatch } from '../wire-shape/match.js';
import { CursorDecodeError, decodeCursor, emitCursor } from './_cursor.js';
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

// V1.5.6 (2026-05-08): per-match content + per-key metadata caps live in
// the shared `src/mcp/wire-shape/` projector. `projectMatch` enforces both
// in a single call site; `search_memories` and `tail_session` go through
// the same projector so a future cap tightening only touches one file.
// Bugs A1, A2, and the tail-session content-cap reach-gap close together.

// Resolved once at module load via os.homedir(); same map as tail_session.
const SOURCE_APP_MAP = buildSourceAppMap();

export interface SearchMatch {
  id: string;
  source: string;
  timestamp: string;
  /** Capped by `WIRE_SHAPE_CAPS.match_content`. When clipped, format is
   *  head + elision marker + tail. Missing-chars invariant for consumers:
   *  retained-byte-count + bytes_elided + marker-overhead = original. */
  content: string;
  /** Present only when `content` was clipped by the wire-shape projector. */
  bytes_elided?: number;
  /** Per-KEY clipped: any single value whose JSON-stringified form exceeds
   *  `WIRE_SHAPE_CAPS.metadata_value` is replaced by
   *  `{__elided: true, original_size: N}`. Other keys pass through verbatim. */
  metadata?: Record<string, unknown>;
  /** Sum of bytes dropped across (a) per-key elision placeholders and
   *  (b) shape-aware projections (e.g. tool_calls → name trajectory). */
  metadata_bytes_elided?: number;
  /** Keys whose value was REPLACED by `{__elided: true, original_size: N}`.
   *  Original shape is opaque on the wire; consumers wanting depth must
   *  hydrate via a follow-up call (deferred V1.6 deep-dive primitive). */
  metadata_keys_elided?: string[];
  /** V1.5.6.1: keys whose value was RESHAPED to a smaller useful
   *  representation (NOT opaqued). Today: `["tool_calls"]` when the
   *  original ToolCall[] was projected to its name trajectory. The
   *  consumer can read the projected value at face value — it carries
   *  legitimate signal (workflow shape), not just a size hint. */
  metadata_keys_projected?: string[];
  /** V1.6 (item 030): additive trust signal — ALWAYS present (possibly
   *  empty). See `ProjectedMatch.truncations` for the vocabulary. */
  truncations: string[];
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
  /** V1.5.7 (Gap 6): non-blocking advisories. Mirrors
   *  `RecentWorkContextResponse.warnings`. Today emits the TZ-naive
   *  warning; future small advisories live here too. Always present
   *  (possibly empty) so consumers can do `r.warnings.length > 0` without
   *  optional-chaining. */
  warnings: string[];
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

  // Gap 3 (V1.5.7, surfaced 2026-05-08 17:01 PDT v1.5-livetest): the V1.5.6
  // Bug B fs-watcher exclusion landed in tail-session.ts and
  // recent-work-context.ts but NOT here. The cursor lane was the visible
  // failure (extractor stale + fs-watcher noise dominating), but the same
  // contract violation applies to every source_app — search_memories returns
  // user-facing content, not the fs-watcher meta-stream. Mirror the
  // recent-work-context.ts:171 / tail-session.ts:94-99 discipline.
  const filter: QueryFilter = {
    exclude_metadata_surface: ['fs'],
  };
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

  // V1.5.7 (Gap 6): same TZ-naive warning as get_recent_work_context. The
  // schema regex ISO8601_RE is intentionally permissive (accepts naive
  // strings); the warning surfaces the parse-as-local-time foot-gun on
  // non-UTC machines without breaking callers that pass naive strings on
  // purpose.
  const warnings: string[] = [];
  if (
    (since !== undefined && !hasTzMarker(since)) ||
    (until !== undefined && !hasTzMarker(until))
  ) {
    warnings.push(TZ_NAIVE_WARNING);
  }

  return {
    matches: kept.map(projectMatch),
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
    warnings,
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
  // Optional — set by the wire-shape projector when content was clipped.
  bytes_elided: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  // Optional — set by the wire-shape projector when one or more metadata
  // values exceeded the per-key cap and were replaced by elision placeholders.
  metadata_bytes_elided: z.number().int().nonnegative().optional(),
  metadata_keys_elided: z.array(z.string()).optional(),
  // V1.5.6.1 — optional, set when one or more metadata values were
  // RESHAPED to a smaller useful representation (e.g. tool_calls → name
  // trajectory). Distinct semantics from metadata_keys_elided.
  metadata_keys_projected: z.array(z.string()).optional(),
  // V1.6 (item 030) — additive trust signal that unifies BOTH per-field
  // caps AND projector reshapes in one place. ALWAYS present (possibly
  // []). Vocabulary: "content" (content cap fired), "metadata.<k>" (per-
  // key cap fired — value opaqued), "metadata.<k>:projected" (projector
  // reshaped — value reformatted, not clipped).
  truncations: z.array(z.string()),
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
  // V1.5.7 (Gap 6): non-blocking advisories. Always present (possibly empty).
  warnings: z.array(z.string()),
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
