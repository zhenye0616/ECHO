// Item 046 / AC4 — `get_role_state` MCP tool.
//
// Returns the raw byte content of a single role-typed task-state pointer
// file at a pinned commit SHA. Read-only, no working-tree access. The
// `ref` parameter accepts any git-resolvable ref (SHA, branch, tag); the
// tool resolves it to a concrete commit SHA ONCE at call entry and uses
// that SHA for ALL subsequent reads, then echoes the resolved SHA in the
// response — so callers chaining follow-up reads can pin to the byte-
// identical state regardless of what HEAD / main move to in the interim.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  commitTimeForPathAtRef,
  GitError,
  pathExistsAtRef,
  readBlobAtRef,
  resolveRefOnce,
} from '../util/role-state-git.js';

export const ROLE_VALUES = ['strategist', 'builder', 'round-state'] as const;
export type Role = (typeof ROLE_VALUES)[number];

export interface GetRoleStateResult {
  content: string;
  last_updated: string;
  source_path: string;
  line_count: number;
  ref: string;
}

const getRoleStateOutputSchema = {
  content: z.string(),
  last_updated: z.string(),
  source_path: z.string(),
  line_count: z.number().int().nonnegative(),
  ref: z.string(),
};

export function buildSourcePath(taskId: string, role: Role): string {
  return `backlog/task-state/${taskId}/${role}.md`;
}

export function getRoleState(
  repoRoot: string,
  taskId: string,
  role: Role,
  inputRef?: string,
): GetRoleStateResult {
  const sha = resolveRefOnce(repoRoot, inputRef);
  const sourcePath = buildSourcePath(taskId, role);
  if (!pathExistsAtRef(repoRoot, sha, sourcePath)) {
    throw new GitError(
      `get_role_state: no file at ${sourcePath} at ref ${sha}`,
      'path not found in tree',
    );
  }
  const content = readBlobAtRef(repoRoot, sha, sourcePath);
  const lastUpdated = commitTimeForPathAtRef(repoRoot, sha, sourcePath);
  // line_count is the number of newline-terminated lines in content; a
  // file ending in a newline is counted as N lines (the trailing \n
  // terminates line N, it does not introduce an N+1th empty line).
  const trimmed = content.endsWith('\n') ? content.slice(0, -1) : content;
  const line_count = trimmed === '' ? (content === '\n' ? 1 : 0) : trimmed.split('\n').length;
  return {
    content,
    last_updated: lastUpdated,
    source_path: sourcePath,
    line_count,
    ref: sha,
  };
}

export function registerGetRoleState(server: McpServer, repoRoot: string): void {
  server.registerTool(
    'get_role_state',
    {
      description:
        'Read a role-typed task-state pointer file at a pinned commit SHA. `role` ∈ {strategist, builder, round-state}. `ref` accepts any git-resolvable ref (SHA, branch, tag); when omitted, resolves to HEAD at call entry. The response echoes the resolved commit SHA in `ref` so callers can pin follow-up reads to byte-identical content. Working-tree state is NOT readable — V1 contract is committed blobs only.',
      inputSchema: {
        task_id: z.string().min(1),
        role: z.enum(ROLE_VALUES),
        ref: z.string().optional(),
      },
      outputSchema: getRoleStateOutputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      const params = input as { task_id: string; role: Role; ref?: string };
      try {
        const result = getRoleState(repoRoot, params.task_id, params.role, params.ref);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (err) {
        const msg = err instanceof GitError ? err.message : (err as Error).message;
        return { isError: true, content: [{ type: 'text', text: `get_role_state: ${msg}` }] };
      }
    },
  );
}
