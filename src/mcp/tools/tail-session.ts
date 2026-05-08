import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { homedir } from 'node:os';
import { z } from 'zod';
import type { CaptureEvent, QueryFilter, Storage } from '../../storage/interface.js';
import {
  CursorDecodeError,
  decodeCursor,
  encodeCursor,
  type DecodedCursor,
} from './_cursor.js';
import { searchMatchSchema } from './search-memories.js';

export const TAIL_SESSION_DESCRIPTION =
  'Tail the N most-recent captured atoms for a single named source — the cheap counterpart to search_memories (substring) and get_recent_work_context (clustered). Pass `source` for an exact path-precise tail, or `source_app` (one of cursor/claude_code/codex/git) to auto-resolve the most-recently-active session for that app. Default count=5, max 20; typical response < 10k chars. Use this for "where did <app> leave off" lookups instead of substring search.';

export const DEFAULT_COUNT = 5;
export const MAX_COUNT = 20;

const SOURCE_APP_VALUES = ['cursor', 'claude_code', 'codex', 'git'] as const;
export type SourceApp = (typeof SOURCE_APP_VALUES)[number];

// Logical app names → literal FS source prefixes. Same mapping as
// search-memories.ts; rebuilt at registration time so test environments and
// production resolve correctly via os.homedir().
function buildSourceAppMap(): Record<SourceApp, string> {
  const HOME = homedir();
  return {
    cursor: `fs:${HOME}/Library/Application Support/Cursor/`,
    claude_code: `fs:${HOME}/.claude/projects/`,
    codex: `fs:${HOME}/.codex/sessions/`,
    git: 'git:',
  };
}

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
  warnings: string[];
}

export interface TailMatch {
  id: string;
  source: string;
  timestamp: string;
  content: string;
  metadata?: Record<string, unknown>;
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

function toMatch(e: CaptureEvent): TailMatch {
  const m: TailMatch = {
    id: e.id,
    source: e.source,
    timestamp: e.timestamp,
    content: e.content,
  };
  if (e.metadata !== undefined) m.metadata = e.metadata;
  return m;
}

function emitCursor(rows: CaptureEvent[], countApplied: number): {
  kept: CaptureEvent[];
  next_cursor: string | null;
} {
  if (rows.length > countApplied) {
    const kept = rows.slice(0, countApplied);
    const last = kept[kept.length - 1]!;
    return { kept, next_cursor: encodeCursor({ timestamp: last.timestamp, id: last.id }) };
  }
  return { kept: rows, next_cursor: null };
}

// Step 1 of `source_app` resolution: find the most-recently-active session
// under the app's prefix. Returns the source string of the newest row, or
// null if no atoms match the prefix at all.
async function resolveNewestSourceForApp(
  storage: Storage,
  prefix: string,
): Promise<string | null> {
  const rows = await storage.query({ source_prefix: prefix, limit: 1 });
  if (rows.length === 0) return null;
  return rows[0]!.source;
}

export async function tailSession(
  storage: Storage,
  params: TailSessionParams,
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

  // exact-source branch (mutually-exclusive with source_app, enforced at
  // schema validation; reaching this point with both undefined is a bug).
  if (source === undefined) {
    // Defense-in-depth: input schema rejects this case before the handler
    // runs, but if a future caller bypasses the schema layer, fail loud.
    throw new Error(
      'tail_session: must pass exactly one of `source` or `source_app` (input schema enforces this; reaching the handler with neither is a bug)',
    );
  }
  return tailExactSource(storage, source, countApplied, before);
}

async function tailExactSource(
  storage: Storage,
  exactSource: string,
  countApplied: number,
  before: DecodedCursor | undefined,
): Promise<TailSessionResult> {
  // Overfetch one extra row so we can emit a cursor when there are more rows
  // beyond `countApplied` — same pattern as search-memories' emitCursor.
  const filter: QueryFilter = {
    source: exactSource,
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
  warnings: z.array(z.string()),
};

// Schema-level rejection of (both / neither) `source` and `source_app`.
// Wrapped via .refine so SDK validation surfaces a structured error rather
// than letting the handler throw at runtime.
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
    (v) => (v.source === undefined) !== (v.source_app === undefined),
    {
      message:
        'tail_session requires exactly one of `source` or `source_app` (passing both, or neither, is rejected)',
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
