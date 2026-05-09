// Shared source-app vocabulary + FS-prefix mapping for MCP retrieval tools.
//
// Originally lived twice — `search-memories.ts` had a module-level IIFE,
// `tail-session.ts` had a `buildSourceAppMap()` function — with identical
// path layouts. Drift-risk if (e.g.) the codex sessions path moved without
// updating both sites. Lifted here so `search_memories`, `tail_session`,
// and any future source_app-bearing tool share one source of truth.

import { homedir } from 'node:os';

export const SOURCE_APP_VALUES = ['cursor', 'claude_code', 'codex', 'git'] as const;
export type SourceApp = (typeof SOURCE_APP_VALUES)[number];

// Logical app names → literal FS source prefixes. Keep in sync with
// `src/capture/sources.ts` (CAPTURED_SOURCES.fs_paths) and the per-app
// extractors. `git` is path-prefix `git:` because git commits are stored
// with that scheme, not under any homedir path.
export function buildSourceAppMap(): Record<SourceApp, string> {
  const HOME = homedir();
  return {
    cursor: `fs:${HOME}/Library/Application Support/Cursor/`,
    claude_code: `fs:${HOME}/.claude/projects/`,
    codex: `fs:${HOME}/.codex/sessions/`,
    git: 'git:',
  };
}
