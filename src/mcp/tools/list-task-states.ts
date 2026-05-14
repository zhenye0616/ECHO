// Item 046 / AC4 — `list_task_states` MCP tool.
//
// Discovery surface: walks `backlog/task-state/` at a pinned commit SHA,
// returns one entry per task directory with the set of pointer files
// present, the parsed canonical_anchors, and (when `stage` filter is set)
// the cross-referenced backlog stage. The whole call uses a single
// resolved commit SHA so the directory walk, every pointer read, and the
// stage cross-reference all see the same tree (defends against the
// HEAD-race / multi-snapshot failure modes — AC4 R2 codex-ops F5).

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { isParseFailure, parseAnchors, type ParsedAnchors } from '../parse-anchors.js';
import {
  commitTimeForPathAtRef,
  GitError,
  listTreeAtRef,
  pathExistsAtRef,
  readBlobAtRef,
  resolveRefOnce,
} from '../util/role-state-git.js';
import { ROLE_VALUES, type Role } from './get-role-state.js';

export const STAGE_VALUES = ['ready', 'claimed', 'pending_review', 'complete'] as const;
export type Stage = (typeof STAGE_VALUES)[number];

export interface TaskStateEntry {
  task_id: string;
  stage: Stage | null;
  roles_present: Role[];
  task_state_ref_path: string;
  last_updated: string;
  canonical_anchors: ParsedAnchors | { spec?: string; _parse_error: string };
}

export interface ListTaskStatesResult {
  task_states: TaskStateEntry[];
  ref: string;
}

const anchorsShape = z.object({
  spec: z.string().optional(),
  reviews: z.string().optional(),
  _parse_error: z.string().optional(),
});

const entryShape = z.object({
  task_id: z.string(),
  stage: z.enum(STAGE_VALUES).nullable(),
  roles_present: z.array(z.enum(ROLE_VALUES)),
  task_state_ref_path: z.string(),
  last_updated: z.string(),
  canonical_anchors: anchorsShape,
});

const listTaskStatesOutputSchema = {
  task_states: z.array(entryShape),
  ref: z.string(),
};

function resolveStageAtRef(repoRoot: string, sha: string, taskId: string): Stage | null {
  for (const stage of STAGE_VALUES) {
    if (pathExistsAtRef(repoRoot, sha, `backlog/${stage}/${taskId}.md`)) {
      return stage;
    }
  }
  return null;
}

function buildEntry(
  repoRoot: string,
  sha: string,
  taskId: string,
  rolesPresent: Role[],
): TaskStateEntry {
  const dirPath = `backlog/task-state/${taskId}/`;
  const stage = resolveStageAtRef(repoRoot, sha, taskId);
  // Prefer the strategist pointer's commit time when available; fall back
  // to whatever pointer exists.
  const anchorSourceRole: Role = rolesPresent.includes('strategist')
    ? 'strategist'
    : rolesPresent[0]!;
  const anchorSourcePath = `backlog/task-state/${taskId}/${anchorSourceRole}.md`;
  const lastUpdated = commitTimeForPathAtRef(repoRoot, sha, anchorSourcePath);
  const body = readBlobAtRef(repoRoot, sha, anchorSourcePath);
  const parsed = parseAnchors(body);
  const anchors: ParsedAnchors | { spec?: string; _parse_error: string } = isParseFailure(parsed)
    ? parsed
    : parsed;
  return {
    task_id: taskId,
    stage,
    roles_present: rolesPresent,
    task_state_ref_path: dirPath,
    last_updated: lastUpdated,
    canonical_anchors: anchors,
  };
}

export interface ListTaskStatesParams {
  role?: Role;
  binding?: string; // V1: reserved, no-op
  stage?: Stage;
  ref?: string;
}

export function listTaskStates(
  repoRoot: string,
  params: ListTaskStatesParams,
): ListTaskStatesResult {
  const sha = resolveRefOnce(repoRoot, params.ref);
  const paths = listTreeAtRef(repoRoot, sha, 'backlog/task-state');
  // Bucket file paths by task_id.
  const byTaskId = new Map<string, Role[]>();
  for (const p of paths) {
    // expected shape: backlog/task-state/<task-id>/<role>.md
    const m = /^backlog\/task-state\/([^/]+)\/(strategist|builder|round-state)\.md$/.exec(p);
    if (m === null) continue;
    const taskId = m[1];
    const role = m[2] as Role;
    const bucket = byTaskId.get(taskId) ?? [];
    bucket.push(role);
    byTaskId.set(taskId, bucket);
  }
  const entries: TaskStateEntry[] = [];
  for (const [taskId, rolesUnordered] of byTaskId) {
    // canonical role order in output: strategist, builder, round-state
    const rolesPresent: Role[] = ROLE_VALUES.filter((r) => rolesUnordered.includes(r));
    if (params.role !== undefined && !rolesPresent.includes(params.role)) {
      continue;
    }
    const entry = buildEntry(repoRoot, sha, taskId, rolesPresent);
    if (params.stage !== undefined && entry.stage !== params.stage) {
      continue;
    }
    entries.push(entry);
  }
  // Sort by task_id for deterministic output.
  entries.sort((a, b) => (a.task_id < b.task_id ? -1 : a.task_id > b.task_id ? 1 : 0));
  return { task_states: entries, ref: sha };
}

export function registerListTaskStates(server: McpServer, repoRoot: string): void {
  server.registerTool(
    'list_task_states',
    {
      description:
        'List role-typed task-state pointers under backlog/task-state/ at a pinned commit SHA. Optional filters: `role` (narrows roles_present), `binding` (V1: reserved, no-op), `stage` (cross-references backlog/<stage>/<id>.md at the same SHA). `ref` accepts any git-resolvable ref; when omitted, resolves to HEAD at call entry and echoes the resolved SHA in the response. Empty `task_states: []` is valid (not isError). Malformed canonical_anchors degrades to `{ spec?: <best-effort>, _parse_error }` — the listing still succeeds so MCP-only cold-start consumers can discover.',
      inputSchema: {
        role: z.enum(ROLE_VALUES).optional(),
        binding: z.string().optional(),
        stage: z.enum(STAGE_VALUES).optional(),
        ref: z.string().optional(),
      },
      outputSchema: listTaskStatesOutputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      const params = input as ListTaskStatesParams;
      try {
        const result = listTaskStates(repoRoot, params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (err) {
        const msg = err instanceof GitError ? err.message : (err as Error).message;
        return { isError: true, content: [{ type: 'text', text: `list_task_states: ${msg}` }] };
      }
    },
  );
}
