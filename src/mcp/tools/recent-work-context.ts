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
  'Use when the user asks open-ended questions about what they were doing, where they ' +
  'left off, or to bring prior context (Cursor + Claude Code + Codex + git) into the ' +
  'current conversation. Returns one cluster per coherent work thread; the AI client ' +
  "decides which to attend to. `cluster.edges[]` is signal-bearing — pairs joined " +
  "only by scope (repo/workspace) or session (conversation/thread) artifacts are " +
  "omitted, so `edges.length` is no longer guaranteed to equal C(N, 2); use " +
  '`cluster.atom_ids[]` for membership. Pass `format: "minimal"` to cap each atom\'s ' +
  '`action.input`/`action.output` to 500 chars (default `"full"` keeps everything).';

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

  const events = await storage.query({
    since,
    until,
    limit: limit * STORAGE_OVERFETCH,
  });

  const query: Query = {
    since,
    until,
    limit,
    window_hours: DEFAULT_WINDOW_HOURS,
    format,
  };
  if (params.artifact_hint !== undefined) {
    query.artifact_hint = params.artifact_hint;
  }

  const response = buildRecentWorkContext(events, query, normalizeEvent);

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
