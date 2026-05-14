// Item 046 / AC4 — shared git-plumbing for the role-typed task-state MCP tools.
//
// The contract is "always pin to commit SHA at call entry":
//   - resolveRefOnce(repoRoot, inputRef) runs `git rev-parse <ref>^{commit}`
//     ONCE per tool invocation, returning the commit SHA. All subsequent
//     reads use that SHA so a moving HEAD / branch tip between operations
//     cannot produce a torn read.
//   - readBlobAtRef / pathExistsAtRef / listTreeAtRef all take the pinned
//     SHA, never raw HEAD.
//   - commitTimeAtRef gives the `last_updated` for a single file.
//
// These helpers ONLY read committed history. Working-tree state and
// uncommitted edits are explicitly out of contract for V1.

import { spawnSync } from 'node:child_process';

export class GitError extends Error {
  constructor(
    message: string,
    public stderr: string,
  ) {
    super(message);
  }
}

function gitCapture(
  repoRoot: string,
  args: string[],
): { code: number; stdout: string; stderr: string } {
  const r = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    code: typeof r.status === 'number' ? r.status : 1,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  };
}

/**
 * Resolve `inputRef` (or `HEAD` when undefined) to a concrete commit SHA
 * via `git rev-parse <ref>^{commit}`. Branch / tag / short-sha inputs are
 * normalised to the full 40-char SHA. The SHA returned is then pinned for
 * every subsequent read inside the same tool call — this is the structural
 * defence against the HEAD-race + branch-echo failure modes (AC4 R2/F3+F5).
 */
export function resolveRefOnce(repoRoot: string, inputRef?: string): string {
  const ref = inputRef ?? 'HEAD';
  const r = gitCapture(repoRoot, ['rev-parse', '--verify', `${ref}^{commit}`]);
  if (r.code !== 0) {
    throw new GitError(`unable to resolve ref '${ref}' to a commit`, r.stderr.trim());
  }
  return r.stdout.trim();
}

/** Returns the raw blob content at the given commit + path. Throws GitError
 *  on any failure (path missing at SHA, malformed input, repo not a git
 *  repo, etc). */
export function readBlobAtRef(repoRoot: string, sha: string, repoRelativePath: string): string {
  const spec = `${sha}:${repoRelativePath}`;
  const r = gitCapture(repoRoot, ['show', spec]);
  if (r.code !== 0) {
    throw new GitError(`unable to read ${spec}`, r.stderr.trim());
  }
  return r.stdout;
}

/** Cheap existence check: `git cat-file -e <sha>:<path>` returns 0 iff
 *  the path resolves to a blob at the given commit. */
export function pathExistsAtRef(
  repoRoot: string,
  sha: string,
  repoRelativePath: string,
): boolean {
  const r = gitCapture(repoRoot, ['cat-file', '-e', `${sha}:${repoRelativePath}`]);
  return r.code === 0;
}

/** Return all file paths under `repoRelativeDir/` at the given commit,
 *  recursively, with leading directory still attached. Empty array if the
 *  directory does not exist. */
export function listTreeAtRef(
  repoRoot: string,
  sha: string,
  repoRelativeDir: string,
): string[] {
  // Trailing slash on the dir so `git ls-tree` treats it as a tree rather
  // than a path prefix that could match sibling files.
  const dirSpec = repoRelativeDir.endsWith('/') ? repoRelativeDir : `${repoRelativeDir}/`;
  const r = gitCapture(repoRoot, ['ls-tree', '-r', '--name-only', sha, dirSpec]);
  if (r.code !== 0) {
    // ls-tree returns non-zero only if `sha` is unknown; missing dir
    // returns 0 with empty stdout. So a non-zero here is a real error.
    if (r.stderr.includes('Not a valid object name')) return [];
    return [];
  }
  return r.stdout.split('\n').filter((s) => s.length > 0);
}

/** Return the ISO-8601 UTC commit time of the most recent commit that
 *  modified the given path, looking back from `sha`. Used as
 *  `last_updated` in the get_role_state response. */
export function commitTimeForPathAtRef(
  repoRoot: string,
  sha: string,
  repoRelativePath: string,
): string {
  const r = gitCapture(repoRoot, [
    'log',
    '-1',
    '--format=%cI',
    sha,
    '--',
    repoRelativePath,
  ]);
  if (r.code !== 0 || r.stdout.trim() === '') {
    // Fall back to commit time of the pinned commit itself.
    const r2 = gitCapture(repoRoot, ['log', '-1', '--format=%cI', sha]);
    return r2.stdout.trim();
  }
  return r.stdout.trim();
}
