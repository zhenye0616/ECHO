import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { QueryFilter, Storage } from '../../storage/interface.js';
import { buildSourceAppMap, SOURCE_APP_VALUES, type SourceApp } from '../util/source-app.js';
import { projectMatch } from '../wire-shape/match.js';
import {
  CursorDecodeError,
  decodeCursor,
  emitCursor,
  type DecodedCursor,
} from './_cursor.js';
import { searchMatchSchema } from './search-memories.js';

export type { SourceApp };

export const TAIL_SESSION_DESCRIPTION =
  'Tail the N most-recent captured atoms for a single named source — the cheap counterpart to search_memories (substring) and get_recent_work_context (clustered). Pass `source` for an exact path-precise tail, or `source_app` (one of cursor/claude_code/codex/git) to auto-resolve the most-recently-active session for that app. Calling with neither `source` nor `source_app` auto-resolves to the most-recently-active source_app across all apps (last 24h) — the ergonomic shape for "where did I leave off" resume calls without picking an app upfront. Default count=5, max 20; typical response < 10k chars. Use this for "where did <app> leave off" lookups instead of substring search.';

// V1.5.7 polish (2026-05-09): no-args fallback look-back window. When the
// caller passes neither `source` nor `source_app`, we scan the four known
// app prefixes for the freshest non-fs atom inside this window and tail
// that app's most-recent session. 24h matches the
// `get_recent_work_context` auto-expand cap so the two retrieval surfaces
// share the same "recent enough to count as a resume signal" semantic.
export const NO_ARGS_FALLBACK_LOOKBACK_HOURS = 24;

export const DEFAULT_COUNT = 5;
export const MAX_COUNT = 20;

export interface TailSessionParams {
  source?: string;
  source_app?: SourceApp;
  count?: number;
  cursor?: string;
}

export interface TailSessionResult {
  turns: TailMatch[];
  next_cursor: string | null;
  source_resolved: string | null;
  /** V1.5.7 polish (2026-05-09): set when neither `source` nor
   *  `source_app` was passed and the no-args fallback resolved one. Lets
   *  the caller see which app the implicit resume picked. */
  source_app_resolved?: SourceApp;
  warnings: string[];
}

export interface TailMatch {
  id: string;
  source: string;
  timestamp: string;
  /** Capped by `WIRE_SHAPE_CAPS.match_content` via the wire-shape
   *  projector. Format when clipped: head + elision marker + tail. */
  content: string;
  /** Set only when `content` was clipped (V1.5.6 wire-shape projector). */
  bytes_elided?: number;
  /** Per-KEY clipped metadata: small structured neighbours (git_state,
   *  session_id) pass through verbatim. Large variadic values get one of:
   *  (a) shape-aware projection — `tool_calls` becomes a string
   *  trajectory `["git_status","Read","Edit",…]` (V1.5.6.1) plus a
   *  sibling `tool_calls_by_name` count map; (b) standard cap — replaced
   *  by `{__elided: true, original_size: N}`. */
  metadata?: Record<string, unknown>;
  /** Sum of bytes dropped across elision + projection. */
  metadata_bytes_elided?: number;
  /** Keys whose value got the `{__elided:true}` placeholder. */
  metadata_keys_elided?: string[];
  /** V1.5.6.1: keys reshaped to a smaller useful representation
   *  (e.g. `tool_calls` → name trajectory). Read at face value. */
  metadata_keys_projected?: string[];
}

function clampCount(input: number | undefined): number {
  if (input === undefined) return DEFAULT_COUNT;
  // The schema rejects count <= 0 at validation time. Here we only clamp the
  // upper end: a consumer accidentally passing 100 gets MAX_COUNT (20), not
  // an error — matches the cheap-tool intent. This intentional asymmetry
  // (lower bound is a hard schema reject, upper bound is a silent clamp) is
  // documented in the acceptance criteria of item 026.
  const floored = Math.floor(input);
  return Math.min(floored, MAX_COUNT);
}

// V1.5.6 (2026-05-08): single wire-shape projection point lives in
// `src/mcp/wire-shape/match.ts`. `tail_session` and `search_memories` go
// through the same `projectMatch` so per-match content + per-key metadata
// caps stay synchronized. Closes the Bug A1 reach-gap (this file's
// pre-V1.5.6 toMatch had no content cap at all) and Bug A2 (metadata
// uncapped on both tools).
const toMatch = projectMatch;

// Bug B (surfaced 2026-05-08 15:54 PDT): both source resolution and the
// per-source tail must EXCLUDE fs-watcher meta-events
// (`metadata.surface === 'fs'`). Pre-fix, `tail_session(source_app='codex')`
// resolved to the rollout file (correct) but then returned 5 fs-watcher
// change events (`{event_type:"change", path, mtime, size}`) instead of the
// codex extractor's turn atoms. Mirrors `recent-work-context.ts:171` —
// `tail_session` is the cheap "where did <app> leave off" tool, and
// fs-watcher events are an implementation detail of capture, not user-facing
// content.
const EXCLUDED_SURFACES_FOR_TAIL = ['fs'] as const;

// Step 1 of `source_app` resolution: find the most-recently-active session
// under the app's prefix, IGNORING fs-watcher meta-events. Returns the source
// string of the newest non-fs row, or null if no eligible atoms exist under
// the prefix.
async function resolveNewestSourceForApp(
  storage: Storage,
  prefix: string,
): Promise<string | null> {
  const rows = await storage.query({
    source_prefix: prefix,
    exclude_metadata_surface: [...EXCLUDED_SURFACES_FOR_TAIL],
    limit: 1,
  });
  if (rows.length === 0) return null;
  return rows[0]!.source;
}

// Same shape as `resolveNewestSourceForApp` but also returns the timestamp
// of the freshest row, so the no-args fallback can rank apps by recency.
// Returns null when no eligible atoms exist under the prefix.
async function resolveNewestRowForApp(
  storage: Storage,
  prefix: string,
): Promise<{ source: string; timestamp: string } | null> {
  const rows = await storage.query({
    source_prefix: prefix,
    exclude_metadata_surface: [...EXCLUDED_SURFACES_FOR_TAIL],
    limit: 1,
  });
  if (rows.length === 0) return null;
  const row = rows[0]!;
  return { source: row.source, timestamp: row.timestamp };
}

// No-args fallback (V1.5.7 polish 2026-05-09): scan the four known app
// prefixes for the freshest non-fs atom inside `NO_ARGS_FALLBACK_LOOKBACK_HOURS`
// and return the corresponding `source_app` + resolved source string. Returns
// null when no app has any qualifying activity in the window.
async function resolveNewestSourceAppGlobal(
  storage: Storage,
  now: Date,
): Promise<{ source_app: SourceApp; source: string } | null> {
  const cutoffMs = now.getTime() - NO_ARGS_FALLBACK_LOOKBACK_HOURS * 60 * 60 * 1000;
  const prefixes = buildSourceAppMap();
  // Probe all four apps in parallel — each query is `limit=1` newest-first,
  // bounded by storage's own ordering, so the cost is at most four point-
  // lookups rather than one fan-in scan.
  const probes = await Promise.all(
    SOURCE_APP_VALUES.map(async (app) => {
      const row = await resolveNewestRowForApp(storage, prefixes[app]);
      if (row === null) return null;
      const tsMs = Date.parse(row.timestamp);
      if (!Number.isFinite(tsMs) || tsMs < cutoffMs) return null;
      return { source_app: app, source: row.source, tsMs };
    }),
  );
  let best: { source_app: SourceApp; source: string; tsMs: number } | null = null;
  for (const probe of probes) {
    if (probe === null) continue;
    if (best === null || probe.tsMs > best.tsMs) best = probe;
  }
  if (best === null) return null;
  return { source_app: best.source_app, source: best.source };
}

export async function tailSession(
  storage: Storage,
  params: TailSessionParams,
  now: Date = new Date(),
): Promise<TailSessionResult> {
  const { source, source_app, count, cursor } = params;
  const countApplied = clampCount(count);

  let before: DecodedCursor | undefined;
  if (cursor !== undefined) {
    before = decodeCursor(cursor);
  }

  // source_app branch: resolve the newest session for that app, then tail it.
  if (source_app !== undefined) {
    const prefix = buildSourceAppMap()[source_app];
    const resolved = await resolveNewestSourceForApp(storage, prefix);
    if (resolved === null) {
      return {
        turns: [],
        next_cursor: null,
        source_resolved: null,
        warnings: [`no captured sessions found for source_app=${source_app}`],
      };
    }
    return tailExactSource(storage, resolved, countApplied, before);
  }

  // exact-source branch.
  if (source !== undefined) {
    return tailExactSource(storage, source, countApplied, before);
  }

  // No-args fallback (V1.5.7 polish 2026-05-09): the morning's resume call
  // tripped on `tail_session()` rejecting the no-args shape. The most-common
  // shape for "where did I leave off" is "any recent activity, pick the
  // freshest app" — solve that without forcing the caller to pre-pick.
  // Cursor-pagination is invalid here (the fallback resolves a fresh source
  // every call); reject up-front rather than silently mixing the two.
  if (cursor !== undefined) {
    throw new Error(
      'tail_session: `cursor` requires an explicit `source` or `source_app` — the no-args fallback resolves a fresh source per call, which would invalidate any prior cursor',
    );
  }
  const resolved = await resolveNewestSourceAppGlobal(storage, now);
  if (resolved === null) {
    return {
      turns: [],
      next_cursor: null,
      source_resolved: null,
      warnings: [
        `no captured sessions found across any source_app in the last ${NO_ARGS_FALLBACK_LOOKBACK_HOURS}h; pass an explicit \`source\` or \`source_app\` to widen the search`,
      ],
    };
  }
  const tail = await tailExactSource(
    storage,
    resolved.source,
    countApplied,
    before,
  );
  // Surface the implicit pick on the response so the caller can see which
  // app the resume landed on without inspecting `source_resolved`'s prefix.
  return { ...tail, source_app_resolved: resolved.source_app };
}

async function tailExactSource(
  storage: Storage,
  exactSource: string,
  countApplied: number,
  before: DecodedCursor | undefined,
): Promise<TailSessionResult> {
  // Overfetch one extra row so we can emit a cursor when there are more rows
  // beyond `countApplied` — same pattern as search-memories' emitCursor.
  // `exclude_metadata_surface` matches the `recent-work-context.ts:171`
  // discipline: fs-watcher meta-events are capture-implementation detail,
  // not user-facing tail content (Bug B, 2026-05-08 15:54 PDT).
  const filter: QueryFilter = {
    source: exactSource,
    exclude_metadata_surface: [...EXCLUDED_SURFACES_FOR_TAIL],
    limit: countApplied + 1,
  };
  if (before !== undefined) filter.before = before;

  const rows = await storage.query(filter);
  // Storage already orders by (timestamp DESC, id DESC); emitCursor relies
  // on that, so no in-handler sort is needed.
  const { kept, next_cursor } = emitCursor(rows, countApplied);

  const warnings: string[] = [];
  if (kept.length === 0 && before === undefined) {
    warnings.push('no captured atoms for this source');
  }

  return {
    turns: kept.map(toMatch),
    next_cursor,
    source_resolved: exactSource,
    warnings,
  };
}

// outputSchema for `tools/list` advertisement and structured-content
// validation by the SDK. `turns` reuses search_memories' single
// source-of-truth `searchMatchSchema`.
const tailSessionOutputSchema = {
  turns: z.array(searchMatchSchema),
  next_cursor: z.string().nullable(),
  source_resolved: z.string().nullable(),
  source_app_resolved: z.enum(SOURCE_APP_VALUES).optional(),
  warnings: z.array(z.string()),
};

// Schema-level rejection of (both) `source` and `source_app`. `neither` is
// permitted post-V1.5.7-polish — it triggers the no-args fallback in the
// handler, which auto-resolves the freshest `source_app` across all apps
// in the last 24h.
//
// `count`: int >= 1 at the schema layer; the upper bound (MAX_COUNT) is
// applied as a silent clamp inside the handler — see clampCount comment.
const tailSessionInputZodObject = z
  .object({
    source: z.string().optional(),
    source_app: z.enum(SOURCE_APP_VALUES).optional(),
    count: z.number().int().min(1).optional(),
    cursor: z.string().optional(),
  })
  .refine(
    (v) => !(v.source !== undefined && v.source_app !== undefined),
    {
      message:
        'tail_session: pass at most one of `source` or `source_app` (passing both is rejected; neither triggers a no-args fallback that auto-resolves the freshest source_app across all apps in the last 24h)',
      path: ['source'],
    },
  );

export function registerTailSession(server: McpServer, storage: Storage): void {
  server.registerTool(
    'tail_session',
    {
      description: TAIL_SESSION_DESCRIPTION,
      // The MCP SDK's registerTool inputSchema is a Zod ZodRawShape (object
      // shape literal). The XOR refinement on `source`/`source_app` lives on
      // the wrapped schema below — we still pass the raw shape here so the
      // SDK's tools/list advertisement keeps the per-field shape, then run
      // the refinement inside the handler before delegating to
      // `tailSession`. This matches the SDK's documented pattern for input
      // validation that needs cross-field invariants.
      inputSchema: {
        source: z.string().optional(),
        source_app: z.enum(SOURCE_APP_VALUES).optional(),
        count: z.number().int().min(1).optional(),
        cursor: z.string().optional(),
      },
      outputSchema: tailSessionOutputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      // Apply the cross-field XOR check here (the inputSchema field above
      // can't express it; SDK validates each field independently).
      const xorResult = tailSessionInputZodObject.safeParse(input ?? {});
      if (!xorResult.success) {
        const message =
          xorResult.error.issues[0]?.message ??
          'tail_session input failed validation';
        return {
          isError: true,
          content: [{ type: 'text', text: message }],
        };
      }

      let result: TailSessionResult;
      try {
        result = await tailSession(storage, xorResult.data as TailSessionParams);
      } catch (err) {
        if (err instanceof CursorDecodeError) {
          // MCP semantics: tool errors are signalled by isError:true on the
          // result envelope — NOT by a JSON-RPC validation rejection. We
          // deliberately omit `structuredContent` because the success
          // outputSchema's nullable strings cannot represent the error
          // variant (matches search-memories' contract).
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
