---
status: shipped
topic: Architecture
subtopic: Capture Surfaces
aliases:
  - FS Watcher
  - Filesystem Watcher
  - fs-watcher
---

# FS Watcher

## Definition

The FS watcher (`src/capture/surfaces/fs-watcher.ts`) is the **first capture surface** to ship — a generic chokidar-backed watcher that emits one candidate event per file-system event under any allowlisted path. It is deliberately content-agnostic: it produces raw FS-event signals (`add` / `change` / `unlink`) and lets downstream extractors do the parsing. This is the substrate's transition from "provably correct, doing nothing" to actively recording user activity.

## Public Contract

```ts
interface FsWatcherHandle {
  stop: () => Promise<void>;
}

function startFsWatcher(
  paths: ReadonlyArray<string>,
  storage: Storage,
): Promise<FsWatcherHandle>;
```

`startFsWatcher` resolves once chokidar's `ready` event has fired. The returned handle's `stop()` closes the watcher and resolves when shutdown is complete. The daemon registers it on boot and tears it down before releasing the PID lock.

## The Candidate Event Shape

Every FS event produces one candidate with this shape:

```ts
{
  source: `fs:${absolutePath}`,
  timestamp: <ISO 8601 UTC, now>,
  content: JSON.stringify({
    event_type: 'add' | 'change' | 'unlink',
    path: absolutePath,
    mtime?: <ISO 8601, from stat>,
    size?: <bytes, from stat>,
  }),
  metadata: {
    surface: 'fs',
    file_kind?: 'cursor-workspace' | 'claude-project',
  },
}
```

Three properties of this envelope matter:

- **`content` is metadata about the FS event, not the file's contents.** This watcher does not open files. SQLite parsing, JSONL tailing, and similar live in [[cursor-extractor]], [[claude-code-extractor]], and other surfaces that may share the same paths.
- **`source` uses the absolute path.** The [[capture-gate]] prefix-matches against [[capture-allowlist]] entries; tilde-expanded allowlist entries match the on-disk paths.
- **`file_kind`** is a heuristic added when the path falls under a recognised prefix (Cursor workspace storage, `~/.claude/projects/`). When the path matches neither, the field is omitted entirely (not null).

Each candidate is handed to `processCandidate(event, storage)` from the [[capture-pipeline]]; the watcher does not itself decide accept/reject.

## Ongoing Changes Only (No Backfill)

Chokidar is constructed with `ignoreInitial: true`. Files that already exist when the watcher starts are silent — only events from real subsequent activity emit candidates. This is a deliberate V1 commitment:

- The first capture surface should not retroactively snapshot a user's disk.
- Backfill semantics differ per source (git captures the last 50 commits; the Claude Code extractor recovers offsets from prior storage events). They belong in the source-specific layer, not in the generic FS watcher.
- Storage growth on first boot stays bounded.

The chokidar watcher also runs with `alwaysStat: true` (so every event carries stat info without a second syscall) and `awaitWriteFinish: false` (we want to see partial writes; downstream extractors handle partial-line robustness).

## The `ignored` Predicate

The watcher rejects four classes of paths before they ever produce candidates:

1. **Cursor's SQLite triplet** — `state.vscdb`, `state.vscdb-wal`, `state.vscdb-shm`, `state.vscdb-journal`. These belong to [[cursor-extractor]], which subscribes to the same paths through its own watcher and parses content directly. Letting both surfaces emit on the same files would double-capture and create gate-rejection noise.
2. **Generic SQLite journals** — any path ending `-journal`.
3. **Editor temp files** — any path ending `.tmp`.
4. **macOS metadata** — `.DS_Store`.

This predicate (added in chore commit `912ebab`) is the line that keeps the FS watcher and the content extractors from stepping on each other.

## What it does NOT do

- **Does not parse file contents.** No SQLite reads, no JSON parsing, no diff extraction. Those live in extractors and the git surface.
- **Does not backfill.** Existing files at watcher start are invisible.
- **Does not debounce.** Every chokidar event becomes a candidate; coalescing rapid bursts (e.g., SQLite WAL churn) is the consumer's job — see [[cursor-extractor]]'s 300ms debounce.
- **Does not poll.** Pure FS-event driven. No safety-net polling (the [[git-capture]] surface adds polling for its own reasons).
- **Does not throw.** Watcher errors are logged via `createLogger('capture.surfaces.fs')` and the watcher continues.
- **Does not own the allowlist.** `paths` are passed in from `CAPTURED_SOURCES.fs_paths`; the watcher trusts the caller.
- **Does not run on Linux or Windows.** macOS FSEvents only for V1.

## Related

- [[capture-pipeline]] — downstream consumer of every candidate
- [[capture-allowlist]] — upstream source of the watched paths
- [[capture-gate]] — the chokepoint that accepts or rejects each candidate
- [[cursor-extractor]] — sibling surface that watches the same Cursor paths and parses SQLite content
- [[claude-code-extractor]] — sibling surface that tails the same `~/.claude/projects/` JSONL files
- [[storage]] — the persistence layer accepted candidates flow into
- [[local-daemon]] — host process that owns the watcher's lifecycle
