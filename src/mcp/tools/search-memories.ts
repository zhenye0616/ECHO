import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CaptureEvent, QueryFilter, Storage } from '../../storage/interface.js';

export const SEARCH_MEMORIES_DESCRIPTION =
  "Search the user's captured ECHO memories (Cursor + Claude Code conversations, git commits) by free-text query, source prefix, or time range. Returns the most recent matching events. `source_prefix` is matched literally against the stored source string, which is filesystem-path-encoded (e.g., `fs:/Users/<user>/.claude/projects/` for Claude Code, `fs:/Users/<user>/.codex/` for Codex, `git:` for commits) — logical names like `claude_code` or `cc` will not match. If a guessed prefix returns 0 results, broaden to `fs:` and inspect the `source` field on returned events to discover the right prefix.";

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;
export const MAX_OVERFETCH = 200;

// Basic ISO 8601 structural check: YYYY-MM-DDTHH:MM:SS(.sss)?(Z|±HH:MM)?
const ISO8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const isoString = z
  .string()
  .regex(ISO8601_RE, 'expected ISO 8601 timestamp like 2026-04-30T12:00:00.000Z');

export interface SearchMatch {
  id: string;
  source: string;
  timestamp: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  matches: SearchMatch[];
  total_returned: number;
  limit_applied: number;
  query_echo: {
    query: string | null;
    source_prefix: string | null;
    since: string | null;
    until: string | null;
    limit: number;
  };
}

export interface SearchMemoriesParams {
  query?: string;
  source_prefix?: string;
  since?: string;
  until?: string;
  limit?: number;
}

function clampLimit(input: number | undefined): number {
  if (input === undefined) return DEFAULT_LIMIT;
  const floored = Math.floor(input);
  return Math.min(Math.max(1, floored), MAX_LIMIT);
}

function sortDesc(events: CaptureEvent[]): CaptureEvent[] {
  return [...events].sort((a, b) => {
    if (a.timestamp < b.timestamp) return 1;
    if (a.timestamp > b.timestamp) return -1;
    return 0;
  });
}

function toMatch(e: CaptureEvent): SearchMatch {
  const m: SearchMatch = {
    id: e.id,
    source: e.source,
    timestamp: e.timestamp,
    content: e.content,
  };
  if (e.metadata !== undefined) m.metadata = e.metadata;
  return m;
}

export async function searchMemories(
  storage: Storage,
  params: SearchMemoriesParams,
): Promise<SearchResult> {
  const { query, source_prefix, since, until, limit } = params;
  const limitApplied = clampLimit(limit);

  const filter: QueryFilter = {};
  if (source_prefix !== undefined) filter.source_prefix = source_prefix;
  if (since !== undefined) filter.since = since;
  if (until !== undefined) filter.until = until;

  const all = await storage.query(filter);
  const sorted = sortDesc(all);
  const overfetch = Math.min(limitApplied * 4, MAX_OVERFETCH);
  let candidates = sorted.slice(0, overfetch);

  if (query !== undefined) {
    const q = query.toLowerCase();
    candidates = candidates.filter((e) => e.content.toLowerCase().includes(q));
  }

  const top = candidates.slice(0, limitApplied);
  return {
    matches: top.map(toMatch),
    total_returned: top.length,
    limit_applied: limitApplied,
    query_echo: {
      query: query ?? null,
      source_prefix: source_prefix ?? null,
      since: since ?? null,
      until: until ?? null,
      limit: limitApplied,
    },
  };
}

export function registerSearchMemories(server: McpServer, storage: Storage): void {
  server.registerTool(
    'search_memories',
    {
      description: SEARCH_MEMORIES_DESCRIPTION,
      inputSchema: {
        query: z.string().optional(),
        source_prefix: z.string().optional(),
        since: isoString.optional(),
        until: isoString.optional(),
        limit: z.number().optional(),
      },
    },
    async (input) => {
      const result = await searchMemories(storage, input as SearchMemoriesParams);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    },
  );
}
