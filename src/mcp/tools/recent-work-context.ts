import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { normalizeEvent } from '../../normalize/index.js';
import type { Storage } from '../../storage/interface.js';
import type { NormalizedContextEvent } from '../../normalize/types.js';
import { buildRecentWorkContext } from '../../trace/index.js';
import type {
  ArtifactHint,
  Query,
  RecentWorkContextResponse,
  ResponseFormat,
} from '../../trace/types.js';

export const RECENT_WORK_CONTEXT_DESCRIPTION =
  "Retrieve clusters of related events from the user's captured ECHO memories — " +
  'joined by shared artifacts (files, repos, conversations) within a recent time window. ' +
  'Use when the user asks open-ended questions about recent work across their tools — ' +
  'their own activity, or another agent/app on the same machine ("what is Codex/Claude ' +
  "Code working on?\" — answered via `cluster.source_breakdown`, which counts atoms per " +
  'app inside each cluster). Also: where they left off, or to bring prior context ' +
  '(Cursor + Claude Code + Codex + git) into the current conversation. Returns one ' +
  "cluster per coherent work thread; the AI client decides which to attend to. `cluster.edges[]` is signal-bearing — pairs joined " +
  "only by scope (repo/workspace) or session (conversation/thread) artifacts are " +
  "omitted, so `edges.length` is no longer guaranteed to equal C(N, 2); use " +
  '`cluster.atom_ids[]` for membership. `cluster.open_loop_hints[].resolved` ' +
  'indicates whether the hint has a downstream closure signal in the same window ' +
  '(heuristic — treat as a hint, not a guarantee). Pass `format: "minimal"` to ' +
  "cap each atom's `action.input`/`action.output` to 500 chars (default " +
  '`"full"` keeps everything). Pass `window_hours` to control the maximum temporal ' +
  'gap between atoms in a single cluster; when omitted it is inferred from the ' +
  '(since, until) span (equal to span when ≤ 4h, otherwise min(span, 24h)) — for ' +
  '"where did I leave off after a break" queries, span-equal inference lets a single ' +
  'cluster bridge an overnight gap. `since` and `until` should always carry an explicit ' +
  'timezone (`Z` for UTC or `+HH:MM` offset); naive ISO strings are parsed as local ' +
  'server time, which is rarely what an AI client intends.';

export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 500;
export const DEFAULT_WINDOW_HOURS = 4;
export const STORAGE_OVERFETCH = 10;
export const MINIMAL_CONTENT_CAP = 500;

const ISO8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const isoString = z
  .string()
  .regex(ISO8601_RE, 'expected ISO 8601 timestamp like 2026-04-30T12:00:00.000Z');

const artifactHintSchema = z.object({
  provider: z.string(),
  type: z.string(),
  id: z.string(),
});

const formatSchema = z.enum(['full', 'minimal']);

export interface RecentWorkContextParams {
  since?: string;
  until?: string;
  artifact_hint?: ArtifactHint;
  limit?: number;
  window_hours?: number;
  format?: ResponseFormat;
}

export function truncateForMinimal(s: string | undefined): string | undefined {
  if (s === undefined) return undefined;
  if (s.length <= MINIMAL_CONTENT_CAP) return s;
  const dropped = s.length - MINIMAL_CONTENT_CAP;
  return (
    s.slice(0, MINIMAL_CONTENT_CAP) +
    `… [truncated; ${dropped} chars omitted; fetch full atom via search_memories]`
  );
}

function applyMinimal(
  atom: NormalizedContextEvent,
): NormalizedContextEvent {
  const input = truncateForMinimal(atom.action.input);
  const output = truncateForMinimal(atom.action.output);
  if (input === atom.action.input && output === atom.action.output) {
    return atom;
  }
  const nextAction: NormalizedContextEvent['action'] = { ...atom.action };
  if (input === undefined) delete nextAction.input;
  else nextAction.input = input;
  if (output === undefined) delete nextAction.output;
  else nextAction.output = output;
  return { ...atom, action: nextAction };
}

function clampLimit(input: number | undefined): number {
  if (input === undefined) return DEFAULT_LIMIT;
  const floored = Math.floor(input);
  return Math.min(Math.max(1, floored), MAX_LIMIT);
}

// Accepts all four legal ISO 8601 TZ forms: Z, ±HH:MM, ±HHMM, ±HH.
const TZ_MARKER_RE = /Z$|[+-]\d{2}(?::?\d{2})?$/;

export function hasTzMarker(s: string): boolean {
  return TZ_MARKER_RE.test(s);
}

// Span-driven default for window_hours. When the caller passes an explicit
// value, that wins. Otherwise: short spans (≤4h) reuse the span exactly so a
// 1h "what did I just do" query produces a tight 1h cluster cap; longer spans
// cap at 24h to prevent week-long mega-clusters but still let overnight gaps
// resolve into a single cluster.
export function inferWindowHours(
  sinceMs: number,
  untilMs: number,
  explicit: number | undefined,
): number {
  if (explicit !== undefined) return explicit;
  const spanHours = (untilMs - sinceMs) / 3_600_000;
  // Degenerate input (NaN dates, since >= until, zero span) falls back to the
  // 4h baseline rather than 0, so a malformed query still produces a usable
  // (if narrow) cluster cap instead of suppressing all edges.
  if (!Number.isFinite(spanHours) || spanHours <= 0) return DEFAULT_WINDOW_HOURS;
  if (spanHours <= 4) return spanHours;
  return Math.min(spanHours, 24);
}

export async function getRecentWorkContext(
  storage: Storage,
  params: RecentWorkContextParams,
  now: Date = new Date(),
): Promise<RecentWorkContextResponse> {
  const limit = clampLimit(params.limit);
  const windowMs = DEFAULT_WINDOW_HOURS * 60 * 60 * 1000;
  const until = params.until ?? now.toISOString();
  const since = params.since ?? new Date(Date.parse(until) - windowMs).toISOString();
  const format: ResponseFormat = params.format ?? 'full';

  const sinceMs = Date.parse(since);
  const untilMs = Date.parse(until);
  const windowHours = inferWindowHours(sinceMs, untilMs, params.window_hours);

  const storageCap = limit * STORAGE_OVERFETCH;
  const events = await storage.query({
    since,
    until,
    limit: storageCap,
    // Raw fs-watcher change events (`metadata.surface === 'fs'`) normalize to
    // null and thus consume the storage cap without contributing to the trace
    // input. Filtering them at the storage-query layer (P1) keeps the cap budget
    // available for real conversation/git atoms. The conversation atoms riding
    // the same `fs:/Users/...` source prefix carry richer per-extractor metadata
    // (no `surface: 'fs'`), so they are unaffected.
    exclude_metadata_surface: ['fs'],
  });

  const query: Query = {
    since,
    until,
    limit,
    window_hours: windowHours,
    format,
  };
  if (params.artifact_hint !== undefined) {
    query.artifact_hint = params.artifact_hint;
  }

  const response = buildRecentWorkContext(events, query, normalizeEvent);

  // Storage-cap silent-truncation guard. When the storage query returned
  // exactly `limit * STORAGE_OVERFETCH` rows, additional in-window atoms may
  // have been silently dropped at the storage layer; surface a single warning
  // so the consumer can raise `limit` or narrow `(since, until)`.
  if (events.length === storageCap) {
    response.warnings.push(
      'storage cap hit (events.length === limit * STORAGE_OVERFETCH); ' +
        'atoms in window may be silently truncated. ' +
        'Raise limit or narrow (since, until) to retain them.',
    );
  }

  // Surface a single warning when the caller passed naive (TZ-less) timestamps.
  // Naive strings are accepted by the schema regex but Date.parse interprets
  // them as local server time, which is rarely intended by an AI client.
  // Idempotent — one warning per request even if both inputs are naive.
  if (
    (params.since !== undefined && !hasTzMarker(params.since)) ||
    (params.until !== undefined && !hasTzMarker(params.until))
  ) {
    response.warnings.push(
      'input.since or input.until lacks a TZ specifier and was parsed as ' +
        'local time; pass an explicit Z or +HH:MM to avoid ambiguity',
    );
  }

  if (format === 'minimal') {
    const minimalAtoms: Record<string, NormalizedContextEvent> = {};
    for (const [id, atom] of Object.entries(response.atoms)) {
      minimalAtoms[id] = applyMinimal(atom);
    }
    return { ...response, atoms: minimalAtoms };
  }

  return response;
}

export function registerRecentWorkContext(
  server: McpServer,
  storage: Storage,
): void {
  server.registerTool(
    'get_recent_work_context',
    {
      description: RECENT_WORK_CONTEXT_DESCRIPTION,
      inputSchema: {
        since: isoString.optional(),
        until: isoString.optional(),
        artifact_hint: artifactHintSchema.optional(),
        limit: z.number().optional(),
        window_hours: z.number().min(0.1).max(168).optional(),
        format: formatSchema.optional(),
      },
    },
    async (input) => {
      const result = await getRecentWorkContext(
        storage,
        input as RecentWorkContextParams,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    },
  );
}
