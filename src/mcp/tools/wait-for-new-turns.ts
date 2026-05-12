// V1.6 (item 030) — `wait_for_new_turns`: stateless long-poll for group session.
//
// Per founder direction (2026-05-09): "I should be able to link multiple
// sessions together and they tail each other... user should feel the unified
// context of all the tools and agents they use are unified and communicating
// with each other." This tool is the missing primitive that lets agents stay
// synchronized passively without a manual MCP call per turn.
//
// Stateless on every dimension (per item 027):
//   - No subscriber registry. No per-client state.
//   - Each call is independent — the storage poll is the only shared resource.
//   - No module-level mutable state in this file (asserted by spec §3 test).
//
// Source semantics (deliberately different from echo_resolve_mru's MRU pick):
//   - echo_resolve_mru(sources=[<source_app>]) → MRU exact-source resolution
//     for "where did I leave off" lookups.
//   - wait_for_new_turns(sources=[<source_app>]) → PREFIX match across ALL
//     sessions of that app (catches new Cursor composers, new CC sessions,
//     etc. as they spawn — group session A wants to wake on ANY new turn).

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CaptureEvent, QueryFilter, Storage } from '../../storage/interface.js';
import { withFsExclusion } from '../util/fs-exclusion.js';
import { isoString } from '../util/iso8601.js';
import { assertAbsoluteRepoPath, normaliseRepoPath } from '../util/repo-path.js';
import { buildSourceAppMap, SOURCE_APP_VALUES, type SourceApp } from '../util/source-app.js';

const SCHEMA_VERSION = 1;

export const WAIT_MAX_SOURCES = 8;
export const WAIT_DEFAULT_TIMEOUT_SECONDS = 30;
export const WAIT_MAX_TIMEOUT_SECONDS = 60;
export const WAIT_DEFAULT_POLL_INTERVAL_MS = 1_000;
export const WAIT_PER_POLL_LIMIT_PER_SOURCE = 20;
// Final return cap — matches spec §3 "LIMIT 20" overall after merge.
export const WAIT_MAX_RETURNED_TURNS = 20;

// Recognised source_app names that resolve via PREFIX MATCH (different
// from echo_resolve_mru's MRU exact-source resolution). Sources NOT in this
// set are treated as literal source paths (exact match).
const SOURCE_APP_SET = new Set<string>(SOURCE_APP_VALUES);

export const WAIT_FOR_NEW_TURNS_DESCRIPTION =
  // discriminator one-liner per item 025
  'Use when you want to BLOCK until new captured atoms land at any of N sources — the missing primitive for group session A (synchronized human-driven multi-agent conversation). Pair with `echo_resolve_mru` / `search_memories` / `find_clusters` for the discovery side.\n\n' +
  // cost class
  'Cost: medium-blocking (server holds the request open up to `timeout` seconds, polling storage every 1s; cheap on the daemon, but the call duration is the latency cost). Stateless: no subscriber registry, no per-client state, every call is independent (per item 027).\n\n' +
  // params
  'PARAMETERS:\n' +
  '  • `sources: string[]` — required. Non-empty, ≤ ' +
  String(WAIT_MAX_SOURCES) +
  '. Mixed entry types accepted:\n' +
  '      • Literal source path (e.g. `fs:/Users/.../state.vscdb`, `git:/Users/.../repo`) → EXACT match.\n' +
  '      • Source-app name (`cursor` | `claude_code` | `codex` | `git`) → PREFIX MATCH (matches ALL sessions of that app — explicitly DIFFERENT from `echo_resolve_mru(sources=[<app>])` which resolves to the MRU exact source). Group session A wants "wake on any session of these apps."\n' +
  "  • `since: string` — required. ISO 8601 timestamp; only return turns with timestamp STRICTLY AFTER this (`> since`, not `>=`). Pass the previous call's `next_since` to chain.\n" +
  '  • `timeout?: number` — seconds; default ' +
  String(WAIT_DEFAULT_TIMEOUT_SECONDS) +
  ', max ' +
  String(WAIT_MAX_TIMEOUT_SECONDS) +
  '.\n\n' +
  // behavior — IDs-only contract (item 038 / AC4)
  "BEHAVIOR: polls echo.db every 1s. Returns immediately on any non-empty result; returns at `timeout` with empty `turn_ids[]` and `next_since` set to the server's current timestamp.\n\n" +
  'RESPONSE (item 038 / AC4 — IDs-only): the response now carries `turn_ids: string[]` instead of body-projected `turns[]`. The envelope shrinks dramatically (no body projection in the wait response); the caller composes one extra MCP call per wake (`get_atoms(turn_ids)` for cost-bounded summaries, or `get_atom(turn_ids[i])` for verbatim of one atom) to fetch bodies. No parallel-vocabulary deprecation window — the bodies-bundled shape is removed in the same release that ships the IDs-only shape.\n\n' +
  // canonical wake → fetch pattern
  'CANONICAL COMPOSITION:\n' +
  '  const w = await wait_for_new_turns({sources: [...], since: last});\n' +
  '  if (!w.timed_out) {\n' +
  '    const atoms = await get_atoms(w.turn_ids);  // summary bodies\n' +
  '    last = w.next_since;\n' +
  '  }\n\n' +
  // polling fallback
  'POLLING FALLBACK: if your MCP client has issues with long-running calls (timeout limits, no streaming), poll instead — works on any MCP client:\n' +
  '\n' +
  '  last_ts = now\n' +
  '  while monitoring:\n' +
  '      result = find_clusters(since=last_ts, format="skeleton")\n' +
  '      if result.clusters:\n' +
  '          process(result.clusters)\n' +
  '          last_ts = max_timestamp(result)\n' +
  '      sleep(2)\n' +
  '\n' +
  'Cost trade-off: polling = N calls/min (poll frequency). Long-poll = 1 call per wake event. Polling adds wake-latency (≤ poll interval) but works on any client.';

export interface WaitForNewTurnsParams {
  sources: string[];
  since: string;
  timeout?: number;
  /** Item 037 / AC5: absolute repo root path. When set, every per-source
   *  poll inherits a `metadata_match: {repo_root: normalize(repo_path)}`
   *  AND filter, so the long-poll wakes only on new turns in the named
   *  repo. For `sources` containing `'git'` or a `git:` prefix entry,
   *  matches `metadata.repo_root` only — legacy git atoms without that
   *  metadata are out of scope (callers use `source_prefix='git:<path>'`
   *  on the discovery tools or omit `repo_path` to widen). */
  repo_path?: string;
}

export interface WaitForNewTurnsResult {
  schema_version: 1;
  tool: 'wait_for_new_turns';
  /** Item 038 / AC4: IDs only. The caller composes `get_atoms(turn_ids)` or
   *  `get_atom(turn_ids[i])` for body fetch. Atomic separation: the wait
   *  envelope shrinks dramatically (no body projection), and the wake
   *  outcome is cheap to consume even when bodies are not needed. */
  turn_ids: string[];
  next_since: string;
  timed_out: boolean;
  warnings: string[];
}

interface ResolvedSources {
  exact: string[];
  prefixes: string[];
}

/** Split mixed `sources[]` into exact source paths vs source-app prefixes.
 *  Source-app names resolve to FS prefixes via `buildSourceAppMap()` —
 *  prefix match catches ALL sessions of that app (deliberately different
 *  from `echo_resolve_mru`'s MRU exact-source resolution). */
export function resolveSources(sources: readonly string[]): ResolvedSources {
  const sourceAppMap = buildSourceAppMap();
  const exact: string[] = [];
  const prefixes: string[] = [];
  for (const s of sources) {
    if (SOURCE_APP_SET.has(s)) {
      prefixes.push(sourceAppMap[s as SourceApp]);
    } else {
      exact.push(s);
    }
  }
  return { exact, prefixes };
}

/** One poll pass: fan out one storage query per (exact source) and per
 *  (prefix) entry, post-filter to STRICT-after `since` (storage uses
 *  `>=`), merge by timestamp DESC, cap at WAIT_MAX_RETURNED_TURNS. */
async function pollOnce(
  storage: Storage,
  resolved: ResolvedSources,
  since: string,
  normalisedRepoPath: string | null,
): Promise<CaptureEvent[]> {
  // Item 038 / AC5: route the fs-watcher exclusion through the shared helper
  // so a re-hardcoded inline literal is caught by the CI grep-scan.
  const filterCommon: Pick<
    QueryFilter,
    'since' | 'limit' | 'exclude_metadata_surface' | 'metadata_match'
  > = withFsExclusion({
    since,
    limit: WAIT_PER_POLL_LIMIT_PER_SOURCE,
    // Item 037 / AC5: repo-scoping. AND-joined with the source/prefix
    // filter on each per-source query below.
    ...(normalisedRepoPath !== null ? { metadata_match: { repo_root: normalisedRepoPath } } : {}),
  });
  const queries: Promise<CaptureEvent[]>[] = [];
  for (const exact of resolved.exact) {
    queries.push(storage.query({ ...filterCommon, source: exact }));
  }
  for (const prefix of resolved.prefixes) {
    queries.push(storage.query({ ...filterCommon, source_prefix: prefix }));
  }
  const results = await Promise.all(queries);

  // Strict-after post-filter: storage uses `>=` so a re-fire with
  // since=last_returned_ts would re-deliver the boundary turn on every
  // wake. Drop rows at exactly `since` here so the contract `> since`
  // holds. Spec §3 strict-after-boundary semantic (acceptance #3).
  const merged = new Map<string, CaptureEvent>();
  for (const rows of results) {
    for (const r of rows) {
      if (r.timestamp <= since) continue;
      merged.set(r.id, r);
    }
  }
  const all = [...merged.values()];
  // Sort by (timestamp DESC, id DESC) for newest-first delivery —
  // matches storage's default ordering convention.
  all.sort((a, b) => {
    if (a.timestamp < b.timestamp) return 1;
    if (a.timestamp > b.timestamp) return -1;
    if (a.id < b.id) return 1;
    if (a.id > b.id) return -1;
    return 0;
  });
  return all.slice(0, WAIT_MAX_RETURNED_TURNS);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

export interface WaitForNewTurnsOptions {
  /** Override the 1s default poll interval. Used by tests to keep them
   *  fast; production never overrides. NOT exposed via the MCP schema —
   *  tunable from in-process callers only. */
  pollIntervalMs?: number;
  /** Inject a clock so tests can drive deterministic next_since values. */
  now?: () => Date;
}

export async function waitForNewTurns(
  storage: Storage,
  params: WaitForNewTurnsParams,
  options: WaitForNewTurnsOptions = {},
): Promise<WaitForNewTurnsResult> {
  // Defense-in-depth validation — schema enforces the same at the MCP
  // boundary, but in-process callers and tests come through here.
  if (params.sources === undefined || params.sources.length === 0) {
    throw new Error('wait_for_new_turns: sources must be a non-empty array');
  }
  if (params.sources.length > WAIT_MAX_SOURCES) {
    throw new Error(`wait_for_new_turns: sources exceeds max ${WAIT_MAX_SOURCES} per call`);
  }
  if (params.since === undefined || !ISO_RE.test(params.since)) {
    throw new Error('wait_for_new_turns: since must be a valid ISO 8601 timestamp');
  }

  // Item 037 / AC5: validate + normalise repo_path before the poll loop
  // so a bad input fails immediately rather than after the first timeout.
  let normalisedRepoPath: string | null = null;
  if (params.repo_path !== undefined) {
    assertAbsoluteRepoPath('wait_for_new_turns', params.repo_path);
    normalisedRepoPath = normaliseRepoPath(params.repo_path);
  }

  let timeoutSec = params.timeout ?? WAIT_DEFAULT_TIMEOUT_SECONDS;
  if (timeoutSec > WAIT_MAX_TIMEOUT_SECONDS) timeoutSec = WAIT_MAX_TIMEOUT_SECONDS;
  if (timeoutSec < 0) timeoutSec = 0;

  const pollIntervalMs = options.pollIntervalMs ?? WAIT_DEFAULT_POLL_INTERVAL_MS;
  const now = options.now ?? (() => new Date());

  const resolved = resolveSources(params.sources);
  if (resolved.exact.length === 0 && resolved.prefixes.length === 0) {
    // sources[] was non-empty but nothing resolved — caller passed strings
    // that aren't source_apps but also pass schema (any string). Return
    // empty + a guidance warning rather than blocking forever.
    return {
      schema_version: SCHEMA_VERSION,
      tool: 'wait_for_new_turns',
      turn_ids: [],
      next_since: now().toISOString(),
      timed_out: true,
      warnings: ['wait_for_new_turns: no sources resolved to a query'],
    };
  }

  const startMs = now().getTime();
  const deadlineMs = startMs + timeoutSec * 1000;

  // Initial poll first (no wait) — common case is "content is already
  // there"; the long-poll's whole point is to NOT round-trip the wait
  // when there's nothing newer than `since`.
  let rows = await pollOnce(storage, resolved, params.since, normalisedRepoPath);
  while (rows.length === 0 && now().getTime() < deadlineMs) {
    // Sleep then re-poll. Cap the sleep at remaining-time so we don't
    // overshoot the deadline by up to one poll interval.
    const remaining = deadlineMs - now().getTime();
    if (remaining <= 0) break;
    await sleep(Math.min(pollIntervalMs, remaining));
    rows = await pollOnce(storage, resolved, params.since, normalisedRepoPath);
  }

  // next_since is the server's current clock when we return — caller
  // chains by passing it back in. We do NOT use the newest-row timestamp
  // because that would silently skip rows that landed in the gap between
  // poll-start and our return.
  const next_since = now().toISOString();
  const timed_out = rows.length === 0;

  return {
    schema_version: SCHEMA_VERSION,
    tool: 'wait_for_new_turns',
    turn_ids: rows.map((r) => r.id),
    next_since,
    timed_out,
    warnings: [],
  };
}

// Item 038 / AC4: turn_ids only on the wire — bodies are NOT bundled into
// the wake envelope. Caller composes `get_atoms(turn_ids)` for summaries or
// `get_atom(turn_ids[i])` for one verbatim atom.
const waitOutputSchema = {
  schema_version: z.literal(1),
  tool: z.literal('wait_for_new_turns'),
  turn_ids: z.array(z.string()),
  next_since: z.string(),
  timed_out: z.boolean(),
  warnings: z.array(z.string()),
};

export function registerWaitForNewTurns(server: McpServer, storage: Storage): void {
  server.registerTool(
    'wait_for_new_turns',
    {
      description: WAIT_FOR_NEW_TURNS_DESCRIPTION,
      inputSchema: {
        sources: z.array(z.string()).min(1).max(WAIT_MAX_SOURCES),
        since: isoString,
        timeout: z.number().int().min(0).max(WAIT_MAX_TIMEOUT_SECONDS).optional(),
        repo_path: z
          .string()
          .optional()
          .describe(
            'Item 037: absolute filesystem path to a repo root. When set, each per-source poll is AND-filtered by `metadata.repo_root = normalize(repo_path)`. For `sources` containing `git` or a `git:` prefix entry, matches `metadata.repo_root` only — legacy git atoms without that metadata are out of scope (omit `repo_path` to widen).',
          ),
      },
      outputSchema: waitOutputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      const params = input as WaitForNewTurnsParams;
      let result: WaitForNewTurnsResult;
      try {
        result = await waitForNewTurns(storage, params);
      } catch (err) {
        return {
          isError: true,
          content: [{ type: 'text', text: (err as Error).message }],
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    },
  );
}
