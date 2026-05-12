import { isAbsolute } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CaptureEvent, QueryFilter, Storage } from '../../storage/interface.js';
import {
  resolveCursorComposerForRepoPath,
  type CursorComposerResolution,
} from '../cursor-workspace-resolver.js';
import { normaliseRepoPath } from '../util/repo-path.js';
import { buildSourceAppMap, SOURCE_APP_VALUES, type SourceApp } from '../util/source-app.js';
import { projectMatch } from '../wire-shape/match.js';
import { CursorDecodeError, decodeCursor, emitCursor, type DecodedCursor } from './_cursor.js';
import { searchMatchSchema } from './search-memories.js';

export type { SourceApp };

export const TAIL_SESSION_DESCRIPTION =
  'Tail the N most-recent captured atoms for a single named source — the cheap counterpart to search_memories (substring) and get_recent_work_context (clustered). Pass `source` for an exact path-precise tail, or `source_app` (one of cursor/claude_code/codex/git) to auto-resolve the most-recently-active session for that app. Calling with neither `source` nor `source_app` auto-resolves to the most-recently-active source_app across all apps (last 24h) — the ergonomic shape for "where did I leave off" resume calls without picking an app upfront. Pass `repo_path=<absolute repo root>` (item 037) to scope the tail to that repo across ALL source_apps (cursor/claude_code/codex/git). For source_app=cursor + repo_path, the resolver uses a two-phase fallback: phase 1 matches `metadata.repo_root` directly (post-AC1 atoms incl. fresh composers); phase 2 falls back to the legacy composer↔workspace resolver only if phase 1 returns 0 atoms (`composer_resolved` is set when phase 2 fires). For source_app=git + repo_path, two-path OR: either `metadata.repo_root` matches OR the source encodes `git:<repo_path>` — recovers legacy git atoms by path even when they pre-date the repo_root metadata write. Default count=5, max 20; typical response < 10k chars. Use this for "where did <app> leave off" lookups instead of substring search.';

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
  /** V1.6 (item 035): absolute repo root path. Honored only when
   *  `source_app === 'cursor'`; for other apps the parameter is ignored
   *  with a warning (their source paths already encode the project). */
  repo_path?: string;
}

export interface TailSessionResult {
  turns: TailMatch[];
  next_cursor: string | null;
  source_resolved: string | null;
  /** V1.5.7 polish (2026-05-09): set when neither `source` nor
   *  `source_app` was passed and the no-args fallback resolved one. Lets
   *  the caller see which app the implicit resume picked. */
  source_app_resolved?: SourceApp;
  /** V1.6 (item 035): set when `source_app='cursor'` + `repo_path` are
   *  both passed and the workspace + composer resolver succeeded. Lets
   *  the caller verify the correct composer was picked. */
  composer_resolved?: string;
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
  /** V1.6 (item 030): additive trust signal — ALWAYS present (possibly
   *  empty). See `ProjectedMatch.truncations` for the vocabulary. */
  truncations: string[];
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
async function resolveNewestSourceForApp(storage: Storage, prefix: string): Promise<string | null> {
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

export interface TailSessionInjections {
  /** Injection seam for the Cursor workspace + composer resolver. Tests
   *  override this to point at mock-fs fixtures; production callers pass
   *  the live `resolveCursorComposerForRepoPath` (the default). */
  resolveCursorComposer?: (repoPath: string) => CursorComposerResolution | null;
}

export async function tailSession(
  storage: Storage,
  params: TailSessionParams,
  now: Date = new Date(),
  injections: TailSessionInjections = {},
): Promise<TailSessionResult> {
  const { source, source_app, count, cursor, repo_path } = params;
  const countApplied = clampCount(count);

  // Parameter-validation gates for `repo_path`. Item 035 introduced
  // the parameter as Cursor-only; item 037 generalises it across all
  // four source_apps. Combining `repo_path` with an exact `source` still
  // has no coherent meaning (the exact path already pins down a single
  // session) — keep that reject.
  let normalisedRepoPath: string | undefined;
  if (repo_path !== undefined) {
    if (source !== undefined) {
      throw new Error(
        'tail_session: repo_path is incompatible with exact source; pass `source_app` (cursor|claude_code|codex|git) + repo_path, or omit repo_path',
      );
    }
    if (source_app === undefined) {
      throw new Error(
        'tail_session: repo_path requires source_app (cursor|claude_code|codex|git)',
      );
    }
    if (!isAbsolute(repo_path)) {
      throw new Error('tail_session: repo_path must be absolute');
    }
    // Item 037 / AC6 #2: normalise BEFORE any metadata_match issuance —
    // captured `metadata.repo_root` is stored no-trailing-slash, so
    // `/path/` would silently miss `/path` without this.
    normalisedRepoPath = normaliseRepoPath(repo_path);
  }

  let before: DecodedCursor | undefined;
  if (cursor !== undefined) {
    before = decodeCursor(cursor);
  }

  // source_app branch: resolve the newest session for that app, then tail it.
  if (source_app !== undefined) {
    // Item 037 / AC6: `repo_path` is now first-class across all four
    // source_apps. The shape varies per app:
    //   - cursor:        two-phase (repo_root metadata first; composer
    //                    fallback only when phase 1 returns 0 atoms)
    //   - claude_code, codex: simple metadata_match on repo_root
    //   - git:           two-path OR (metadata.repo_root OR exact
    //                    `git:<repo_path>` source encoding) — tail_session-
    //                    specific because the MRU resolver depends on it
    //                    to surface legacy git atoms (per AC6 Note 2).
    if (normalisedRepoPath !== undefined) {
      if (source_app === 'cursor') {
        return tailCursorRepoScoped(
          storage,
          normalisedRepoPath,
          repo_path!,
          countApplied,
          before,
          injections,
        );
      }
      if (source_app === 'git') {
        return tailGitRepoScopedTwoPath(storage, normalisedRepoPath, countApplied, before);
      }
      // claude_code / codex: simple metadata_match flow. The MRU resolver
      // for the newest source under the app's prefix runs WITH the
      // repo_root filter, so the picked session is the most-recent one in
      // the named repo (not globally newest across all repos).
      return tailAppRepoScoped(
        storage,
        source_app,
        normalisedRepoPath,
        countApplied,
        before,
      );
    }
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
  const tail = await tailExactSource(storage, resolved.source, countApplied, before);
  // Surface the implicit pick on the response so the caller can see which
  // app the resume landed on without inspecting `source_resolved`'s prefix.
  return { ...tail, source_app_resolved: resolved.source_app };
}

// Item 037 / AC6 — `source_app='cursor'` + `repo_path` two-phase fallback.
// Phase 1 (PRIMARY) issues a metadata_match query on the new `repo_root`
// field. Phase 2 (LEGACY FALLBACK) fires only if Phase 1 returned 0 atoms,
// reaching through the composer↔workspace resolver from item 035.
// Predicates are NEVER ANDed across phases — each phase uses ONLY its own
// filter — so legacy atoms without `repo_root` are recovered cleanly and
// post-AC1 atoms (including fresh composers) are recovered without
// touching the resolver.
async function tailCursorRepoScoped(
  storage: Storage,
  normalisedRepoPath: string,
  rawRepoPath: string,
  countApplied: number,
  before: DecodedCursor | undefined,
  injections: TailSessionInjections,
): Promise<TailSessionResult> {
  const prefix = buildSourceAppMap()['cursor'];
  // Phase 1: repo_root metadata match.
  const phase1Source = await resolveNewestSourceForRepoRoot(
    storage,
    prefix,
    normalisedRepoPath,
  );
  if (phase1Source !== null) {
    return tailExactSource(storage, phase1Source, countApplied, before, {
      repo_root: normalisedRepoPath,
    });
  }
  // Phase 2: legacy composer fallback. Predicates are NEVER ANDed across
  // phases — Phase 2 uses ONLY composer_id, no repo_root.
  const resolver = injections.resolveCursorComposer ?? resolveCursorComposerForRepoPath;
  const resolved = resolver(rawRepoPath);
  if (resolved === null) {
    return {
      turns: [],
      next_cursor: null,
      source_resolved: null,
      warnings: [
        `tail_session: no Cursor composer or repo_root atoms match repo_path=${rawRepoPath}; verify the project is open in Cursor and the workspace has at least one composer`,
      ],
    };
  }
  const resolvedSource = await resolveNewestSourceForApp(storage, prefix);
  if (resolvedSource === null) {
    return {
      turns: [],
      next_cursor: null,
      source_resolved: null,
      warnings: ['no captured sessions found for source_app=cursor'],
    };
  }
  const tail = await tailExactSource(storage, resolvedSource, countApplied, before, {
    composer_id: resolved.composer_id,
  });
  // composer_resolved is set ONLY when Phase 2 fired — its presence is a
  // legacy-fallback marker for the AC7 dogfooding check (its absence on a
  // fresh-composer call means AC1's repo_root write landed correctly).
  return { ...tail, composer_resolved: resolved.composer_id };
}

// Item 037 / AC6 — claude_code / codex + repo_path: simple metadata_match
// flow. The MRU resolver runs with the repo_root filter so we pick the
// newest source for that app **within the named repo**.
async function tailAppRepoScoped(
  storage: Storage,
  source_app: 'claude_code' | 'codex',
  normalisedRepoPath: string,
  countApplied: number,
  before: DecodedCursor | undefined,
): Promise<TailSessionResult> {
  const prefix = buildSourceAppMap()[source_app];
  const resolvedSource = await resolveNewestSourceForRepoRoot(
    storage,
    prefix,
    normalisedRepoPath,
  );
  if (resolvedSource === null) {
    return {
      turns: [],
      next_cursor: null,
      source_resolved: null,
      warnings: [
        `no captured sessions found for source_app=${source_app} in repo=${normalisedRepoPath}`,
      ],
    };
  }
  return tailExactSource(storage, resolvedSource, countApplied, before, {
    repo_root: normalisedRepoPath,
  });
}

// Item 037 / AC6 Note 2 — git + repo_path two-path OR. A row matches if
// EITHER `metadata.repo_root === repo_path` (post-AC1 atoms) OR
// `source === git:<repo_path>` (legacy git atoms captured before the
// repo_root metadata write). Implemented as a two-query UNION at the tool
// layer (cheaper than adding OR to QueryFilter); dedup by atom id.
async function tailGitRepoScopedTwoPath(
  storage: Storage,
  normalisedRepoPath: string,
  countApplied: number,
  before: DecodedCursor | undefined,
): Promise<TailSessionResult> {
  const sourceEncoding = `git:${normalisedRepoPath}`;
  // Path 1: metadata_match (newest source under the git prefix that has
  // repo_root metadata for our repo). For path 1's source-resolution we
  // can rely on metadata_match alone since the git source prefix is
  // `git:`.
  // Path 2: exact-source `git:<repo_path>`.
  // We overfetch each by countApplied+1 to drive the cursor emission.
  const filter1: QueryFilter = {
    source_prefix: 'git:',
    metadata_match: { repo_root: normalisedRepoPath },
    exclude_metadata_surface: [...EXCLUDED_SURFACES_FOR_TAIL],
    limit: countApplied + 1,
  };
  const filter2: QueryFilter = {
    source: sourceEncoding,
    exclude_metadata_surface: [...EXCLUDED_SURFACES_FOR_TAIL],
    limit: countApplied + 1,
  };
  if (before !== undefined) {
    filter1.before = before;
    filter2.before = before;
  }
  const [rows1, rows2] = await Promise.all([storage.query(filter1), storage.query(filter2)]);
  // Dedup by id; storage returns (timestamp DESC, id DESC), so re-sorting
  // the merged set preserves that ordering.
  const seen = new Set<string>();
  const merged: CaptureEvent[] = [];
  for (const r of [...rows1, ...rows2]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    merged.push(r);
  }
  merged.sort((a, b) => {
    if (a.timestamp < b.timestamp) return 1;
    if (a.timestamp > b.timestamp) return -1;
    if (a.id < b.id) return 1;
    if (a.id > b.id) return -1;
    return 0;
  });
  const { kept, next_cursor } = emitCursor(merged, countApplied);
  const warnings: string[] = [];
  if (kept.length === 0 && before === undefined) {
    warnings.push(
      `no captured git atoms found for repo=${normalisedRepoPath} (checked both metadata.repo_root and source=git:<path>)`,
    );
  }
  // source_resolved is the encoded git source — meaningful since the
  // two-path OR returns rows from BOTH the legacy encoding and post-AC1
  // metadata; pinning the resolution to the canonical `git:<path>` form
  // gives the caller a stable handle for follow-up tail calls.
  return {
    turns: kept.map(toMatch),
    next_cursor,
    source_resolved: sourceEncoding,
    warnings,
  };
}

// Item 037 / AC6 — like `resolveNewestSourceForApp` but also AND-filters on
// `metadata.repo_root === repoRoot`, so the MRU pick is the newest source
// under the app's prefix that has a captured atom in the named repo.
async function resolveNewestSourceForRepoRoot(
  storage: Storage,
  prefix: string,
  repoRoot: string,
): Promise<string | null> {
  const rows = await storage.query({
    source_prefix: prefix,
    metadata_match: { repo_root: repoRoot },
    exclude_metadata_surface: [...EXCLUDED_SURFACES_FOR_TAIL],
    limit: 1,
  });
  if (rows.length === 0) return null;
  return rows[0]!.source;
}

async function tailExactSource(
  storage: Storage,
  exactSource: string,
  countApplied: number,
  before: DecodedCursor | undefined,
  metadataMatch?: Record<string, string>,
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
  if (metadataMatch !== undefined) filter.metadata_match = metadataMatch;

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
  composer_resolved: z
    .string()
    .optional()
    .describe(
      'Cursor composerId picked by the repo_path resolver. Populated only when source_app=cursor + repo_path were both passed and the workspace was found.',
    ),
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
    repo_path: z.string().optional(),
  })
  .refine((v) => !(v.source !== undefined && v.source_app !== undefined), {
    message:
      'tail_session: pass at most one of `source` or `source_app` (passing both is rejected; neither triggers a no-args fallback that auto-resolves the freshest source_app across all apps in the last 24h)',
    path: ['source'],
  });

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
        repo_path: z
          .string()
          .optional()
          .describe(
            'Absolute filesystem path to a repo root. Generalised across all four source_apps (item 037; item 035 introduced this Cursor-only). source_app=cursor uses a two-phase fallback (repo_root metadata first, composer↔workspace resolver only if phase 1 returns 0 atoms). source_app=git uses a two-path OR (metadata.repo_root OR source=`git:<path>`) so legacy git atoms by path are recoverable. source_app=claude_code|codex match metadata.repo_root directly. Rejected when combined with `source`, when no `source_app` is supplied, or when the path is not absolute.',
          ),
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
          xorResult.error.issues[0]?.message ?? 'tail_session input failed validation';
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
        // Item 035: repo_path parameter-validation errors thrown from
        // `tailSession` (incompatible-with-source, requires-source_app,
        // must-be-absolute) surface through the same `isError` envelope
        // as the cursor-decode case so callers see a clear message
        // instead of a JSON-RPC fault.
        if (err instanceof Error && err.message.startsWith('tail_session: ')) {
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
