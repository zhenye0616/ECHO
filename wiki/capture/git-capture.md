---
status: shipped
topic: Architecture
subtopic: Capture Surfaces
aliases:
  - Git Capture
  - Git Watcher
  - git-watcher
  - git-capture
---

# Git Capture

## Definition

The git capture surface (`src/capture/surfaces/git-watcher.ts`) watches the user's allowlisted local repositories and emits one `CaptureEvent` per new commit. Content is the commit message plus the unified diff. It is the second capture surface to ship and the first non-FS-event source kind — commits enter the gate as `git:<repo>`, not `fs:<path>`. The deliberate separation from chat extractors is structural: chat says *what was discussed*; git says *what actually changed*.

## Public Contract

```ts
interface GitWatcherHandle {
  stop: () => Promise<void>;
}

interface GitWatcherOptions {
  pollIntervalMs?: number;  // default 30_000
  enableFsWatch?: boolean;  // default true
}

function startGitWatcher(
  repoPaths: ReadonlyArray<string>,
  storage: Storage,
  options?: GitWatcherOptions,
): Promise<GitWatcherHandle>;
```

`startGitWatcher` resolves once chokidar watchers are ready; the initial backfill runs in the background. `stop()` cancels the poll interval, closes all FS watchers, and awaits any in-flight `refreshRepo` via a tracked `inFlight` set — so SIGINT mid-backfill still produces a clean shutdown.

## The Hybrid Watcher

Two detection mechanisms run concurrently per repo:

1. **Real-time (chokidar).** Watchers are registered on `<repo>/.git/HEAD` and `<repo>/.git/refs/heads/`. Any `add` / `change` / `unlink` triggers a `refreshRepo` pass. The fast path catches commits within milliseconds of `git commit` returning.
2. **Polling fallback (30s default).** A `setInterval` runs `git rev-parse HEAD` per repo. If the head differs from `state.lastSeen`, the same `refreshRepo` runs. Polling is the safety net for missed FS events, edge-case filesystem semantics, or environments where chokidar can't see ref changes. The handle is `unref()`'d so the timer never pins the event loop in tests.

A per-repo `busy` flag prevents concurrent passes from racing on the same repo.

## First-Boot Backfill

A repo with no prior storage events has `lastSeen === undefined`. The first `refreshRepo` walks the most recent N commits via `git log --reverse -<N> <head>` rather than the entire history. `N` defaults to 50 and is overridable via `ECHO_GIT_BACKFILL_COMMITS`. Setting it to 0 disables backfill entirely.

On subsequent boots, `discoverLastSeen` queries storage for the prior `git:<repo>` events, picks the entry with the maximum timestamp, and uses its `metadata.sha` as the resume point. New commits are then enumerated as `<lastSeen>..<head>`.

## Per-Commit Event Shape

For each new commit, `git log` is parsed using a custom format with `0x1F` field separators and `0x1E` record separators (safe for multi-line commit bodies), then `git show --shortstat` and `git diff <parent>..<sha>` are run separately:

```ts
{
  source: `git:${repoPath}`,
  timestamp: <ISO from the commit's author date>,
  content: `COMMIT ${shortSha}: ${subject}\n\n${body}\n\n--- DIFF ---\n${diff}`,
  metadata: {
    sha: string,            // full SHA
    parent_sha?: string,    // first parent; omitted for root commits
    author: string,
    files_changed: number,
    additions: number,
    deletions: number,
  },
}
```

Commits land in chronological order (`git log --reverse`). On a per-commit gate rejection, the loop breaks and the failing SHA is *not* recorded as `lastSeen` — a re-run will retry it.

## Diff Truncation: 100 KB Cap

Diffs larger than `100 * 1024` bytes are truncated, with a marker appended:

```
[diff truncated at 102400 bytes; full diff at <sha>]
```

The full SHA is preserved in `metadata.sha`, so the original diff is always recoverable from the repo if needed. The cap exists so a single pathological commit (vendored dependency dump, generated file regen) cannot dominate storage in one event.

## The `git_repos` Allowlist Category

Git is the first non-FS source kind, which required a small extension to [[capture-allowlist]] and [[capture-gate]]:

- A new `git_repos` array on `CAPTURED_SOURCES` (initial entry: `~/Desktop/Project_echo/`).
- An `isAllowedRepo` predicate. Unlike `fs_paths` (prefix-match), repo entries are **exact-match** on the normalised absolute path — adding a repo is an explicit per-repo decision, not an "anything under this directory."
- A new `'git'` entry in the gate's source-kind dispatch table.
- A new `'unknown_repo'` rejection reason in the gate's stable rejection codes.

Per-repo additions go through their own backlog items so each repo gets a reviewed PR.

## Why "Diff Source = Git, Not Chat"

Cursor and Claude Code's chat surfaces could plausibly extract diffs from their own tool-call history. They explicitly do not. Three reasons make this a structural separation:

1. **Truth.** Assistants sometimes claim to have edited files they didn't, or partially edited. Git is the canonical record.
2. **Surface simplicity.** Chat extractors don't have to detect / parse / extract diffs. The git surface doesn't have to understand chat. Each capture surface stays small.
3. **Joining at query time.** Both surfaces produce identically-shaped envelopes; the [[mcp-search-memories]] tool joins chat and commits by timestamp on retrieval, not on capture.

This rule is recorded in `backlog/README.md`'s Spec Authoring Lessons so future capture-surface specs honour it.

## What it does NOT do

- **Does not capture working-tree state.** Uncommitted changes are invisible. Most useful work crosses a commit boundary.
- **Does not capture branch/tag operations** as standalone events. Branch state is implicit in commit metadata.
- **Does not capture remote operations.** Pushes, fetches, and pulls are not captured. The local commit is the canonical event.
- **Does not capture history before the backfill window.** Older commits stay unrecorded; the user dogfoods forward.
- **Does not dedup rebases or cherry-picks.** Different SHAs ⇒ different events, by design — append-only audit trail.
- **Does not detect squashes.** A squashed commit is just a new commit with a new SHA.
- **Does not handle submodules.** V1.5+.
- **Does not write to git.** All `git` invocations are read-only (`log`, `show`, `diff`, `rev-parse`).
- **Does not throw.** Failed git invocations are logged warn and the pass moves on.

## Related

- [[capture-pipeline]] — downstream consumer of each emitted candidate
- [[capture-gate]] — accepts `git:<repo>` against the allowlist; rejects unknown repos with `unknown_repo`
- [[capture-allowlist]] — declares the new `git_repos` category
- [[storage]] — persists commit events; queried at boot for backfill resumption
- [[fs-watcher]] — sibling surface; emits raw FS events under allowlisted file paths
- [[cursor-extractor]] — sibling content extractor for chat
- [[claude-code-extractor]] — sibling content extractor for chat
