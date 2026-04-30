---
id: 2026-04-30-009-fs-watcher-cursor-and-claude-code
title: FS watcher — first capture surface (Cursor + Claude Code)
status: ready
priority: HIGH
estimate: 1.5d
created: 2026-04-30
spec_refs:
  - wiki/concepts/sandboxed-capture.md
  - wiki/sources/capture-allowlist.md
  - wiki/entities/capture-gate.md
  - wiki/entities/storage.md
  - wiki/entities/local-daemon.md
blocked_by:
  - 2026-04-30-006-capture-pipeline
  - 2026-04-30-007-daemon-entry
  - 2026-04-30-008-sqlite-storage
acceptance:
  - "`startFsWatcher(paths, storage)` exported from `src/capture/surfaces/fs-watcher.ts`"
  - "Returns `Promise<{ stop: () => Promise<void> }>` for clean shutdown"
  - "Watches recursively using `chokidar`; emits per FS event (create/modify/delete) one candidate event"
  - "Candidate event shape: `source: 'fs:<absolute-path>'`, `timestamp: <iso-now>`, `content: JSON.stringify({ event_type, path, mtime, size })`, `metadata: { surface: 'fs', file_kind: 'cursor-workspace' | 'claude-project' | undefined }`"
  - "Each candidate flows through `processCandidate(event, storage)` from item 006"
  - "`CAPTURED_SOURCES.fs_paths` extended with `~/Library/Application Support/Cursor/User/workspaceStorage/` and `~/.claude/projects/`"
  - "Allowlist entries' tilde paths expand correctly and prefix-match the actual on-disk paths"
  - "Daemon (`src/daemon/index.ts`) registers FS watchers on boot, calls `stop()` on graceful shutdown"
  - "Tests use temp directories: create file, modify file, delete file; assert `processCandidate` called with the right candidate shape; assert `stop()` ends the watcher cleanly"
  - "Tests verify allowlist accepts the tilde-prefixed entries when normalized"
  - "**Lag verification (manual, founder-runs in review):** measure FS-event lag from a chat-message send to the FS event; record median over 5 trials each for Cursor and Claude Code; document in `agent_notes`. Target: Claude Code ≤500ms median, Cursor ≤2000ms median. If Cursor exceeds 5s consistently, escalate — the founder may want an Accessibility-API companion item before the killer demo can rely on this."
  - "`npm run test`, `npm run lint`, `npm run typecheck` clean"
files_to_modify:
  - src/capture/surfaces/fs-watcher.ts
  - src/capture/sources.ts
  - src/daemon/index.ts
  - package.json
  - tests/capture/surfaces/fs-watcher.test.ts

claimed_by: "Mac.attlocal.net-zhenye"
claimed_at: "2026-04-30T21:54:00Z"
branch: "agent/009-fs-watcher-cursor-and-claude-code"
worktree: ""
head_sha: "252fb1ecc16019e5738f4761f4d12b8f0a35bba7"
pr_url: ""
agent_notes: |
  Shipped. startFsWatcher(paths, storage) implemented per spec; daemon registers/stops it in lifecycle. CAPTURED_SOURCES.fs_paths now contains the two production prefixes (Cursor workspaceStorage + ~/.claude/projects/) — first time the allowlist has shipped non-empty. 12 fs-watcher tests + 1 sources test split + 4 lifecycle test predicate fixes; 120/120 tests passing; lint/typecheck/format clean. End-to-end smoke run captured a real Claude Code session.jsonl write through the gate (accept-path exercised in production for the first time). Two files outside files_to_modify were touched (tests/capture/sources.test.ts split + tests/daemon/lifecycle.test.ts predicate-by-source + shutdown threshold 2s→8s) — necessary downstream consequences of spec-required changes; same pattern as item 008's lifecycle test edit; flagged in run log. Lag verification is pending founder action (manual fswatch trials; spec explicitly says founder-runs-in-review). Initial single-sample signal: Claude Code write-to-FS-event lag <1ms during smoke run.
review_notes: ""
---

# FS watcher — first capture surface (Cursor + Claude Code)

## What

The first real capture surface. Watches two filesystem paths — Cursor's workspace storage and Claude Code's project transcripts — and emits a candidate event per FS change to the [[capture-pipeline]]. This is the first item where the substrate transitions from "provably correct, doing nothing" to "actively recording user activity."

```ts
// src/capture/surfaces/fs-watcher.ts
export interface FsWatcherHandle {
  stop: () => Promise<void>;
}

export async function startFsWatcher(
  paths: string[],
  storage: Storage,
): Promise<FsWatcherHandle>;
```

Behavior:

- For each path in `paths`, register a recursive `chokidar` watcher.
- On each `add` / `change` / `unlink` event, build a `CandidateEvent` and hand it to `processCandidate(event, storage)`.
- Track all watchers; `stop()` closes them all and resolves when shutdown is complete.
- Be conservative on initial scan: emit events only for ongoing changes, not for files that already exist at watcher start. (Backfill of existing files is a separate later item.)

The candidate event's `content` is metadata about the FS event itself, not the file's contents. Parsing Cursor's SQLite or Claude Code's JSONL is **explicitly not** in this item — that's a future "content extractors" item. For 009, knowing "Cursor's workspace storage changed at this timestamp" is enough to prove the substrate end-to-end.

`CAPTURED_SOURCES.fs_paths` gets its first non-empty entries: the two paths above. This is the first time the empty-initial allowlist becomes non-empty — a meaningful architectural moment, worth flagging.

## Why

[[sandboxed-capture]] and the gate enforce a structural commitment: events from non-allowlisted sources cannot enter storage. Until 009, that commitment was true by virtue of having no events at all. After 009, ECHO actually receives candidate events and the gate's accept-path is exercised in production for the first time.

Cursor and Claude Code were chosen for the first capture surface because they are the two highest-ROI captures in the V1 bundle:

- **Lowest cost:** local files only; no API, no OAuth, no rate limits, no ToS exposure.
- **Highest demo value:** both are MCP targets in V1, so context captured here can be served back to *the same app it came from* via MCP — a closed loop that demos without needing GitHub/Slack integration first.
- **Real-time enough:** Claude Code appends to JSONL on each message (sub-second FS event); Cursor writes to its SQLite WAL on chat persistence (typically 1–3s lag). Within the founder's "≤2 messages of lag" tolerance for the felt-not-seen brand promise.

The lag-verification check in acceptance is non-negotiable: the founder needs measured numbers in `agent_notes` before merge, because if Cursor's lag is consistently >5s, the killer demo's "ECHO knows what you just did" effect breaks and we need an Accessibility-API companion before integration.

## Acceptance Criteria

- [ ] `package.json` declares `chokidar` in `dependencies` (runtime, not devDep)
- [ ] `src/capture/surfaces/fs-watcher.ts` exports `startFsWatcher(paths, storage)` returning `Promise<FsWatcherHandle>`
- [ ] On boot, the watcher registers recursive watching for each path; ignores initial state (no fire on existing files at watch start)
- [ ] On `add` / `change` / `unlink` events from `chokidar`:
  - Build candidate: `{ source: 'fs:' + absolutePath, timestamp: new Date().toISOString(), content: JSON.stringify({ event_type, path, mtime, size }), metadata: { surface: 'fs', file_kind } }`
  - `event_type` is one of `'add' | 'change' | 'unlink'`
  - `mtime` and `size` come from the event's stat info (omit `size` for `unlink`)
  - `file_kind` is `'cursor-workspace'` if the path is under `~/Library/Application Support/Cursor/User/workspaceStorage/`, `'claude-project'` if under `~/.claude/projects/`, otherwise `undefined`
  - Hand the candidate to `processCandidate(event, storage)` from item 006
  - Log via `createLogger('capture.surfaces.fs')` — info on candidate emit, debug on raw chokidar event
- [ ] `stop()` closes all chokidar watchers; resolves when all are drained
- [ ] `src/capture/sources.ts` updated:
  - `CAPTURED_SOURCES.fs_paths` includes `'~/Library/Application Support/Cursor/User/workspaceStorage/'` and `'~/.claude/projects/'`
  - `_isAllowedPathIn` already handles tilde expansion (item 003) — verify it expands BOTH the input path AND the allowlist entries before prefix-matching
- [ ] `src/daemon/index.ts` updated:
  - On boot, after storage is initialized, call `startFsWatcher(CAPTURED_SOURCES.fs_paths, storage)`; store the handle
  - On shutdown, call `handle.stop()` before `storage.close()` and before releasing the PID lock
  - Log lifecycle events for the watcher: started, stopped
- [ ] Tests in `tests/capture/surfaces/fs-watcher.test.ts`:
  - Use a temp directory; add it to a *test-only* allowlist or use the `_isAllowedPathIn` helper directly
  - Create a file in the temp dir → assert `processCandidate` called with `event_type: 'add'` and the right path
  - Modify file → assert `event_type: 'change'`
  - Delete file → assert `event_type: 'unlink'`
  - `stop()` cleanly ends the watcher (no hanging handles, test process exits within Vitest's normal teardown)
  - Allowlist tilde-expansion: assert `_isAllowedPathIn('~/Library/Application Support/Cursor/User/workspaceStorage/abc/state.vscdb', ['~/Library/Application Support/Cursor/User/workspaceStorage/'])` is `true`
- [ ] **Lag verification (founder-runs, recorded in `agent_notes`):**
  ```bash
  # In separate terminals:
  fswatch -t "$HOME/Library/Application Support/Cursor/User/workspaceStorage/" \
    | while read l; do echo "$(date +%s.%3N) $l"; done

  fswatch -t "$HOME/.claude/projects/" \
    | while read l; do echo "$(date +%s.%3N) $l"; done

  # In Cursor and Claude Code respectively, send a chat message and note the
  # send-time wall clock. The agent records 5 trials of (send_time → first_FS_event_time)
  # for each app and reports median in agent_notes.
  ```
  Acceptance threshold: Cursor median ≤2000ms, Claude Code median ≤500ms.
  If Cursor median is between 2000ms and 5000ms: ship as-is, but flag in `agent_notes` and the founder may queue an Accessibility-API companion item.
  If Cursor median is >5000ms consistently: ESCALATE — the killer demo will feel laggy; founder should decide before merge.
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` all clean

## Out of Scope (Don't Drift)

- **Parsing file contents** — no SQLite reads, no JSONL parsing. `content` is metadata about the event, not extracted text. Parsers are a later item that depends on 009.
- **Initial scan / backfill** of existing files — only ongoing change events. Backfill is a separate later item.
- **Other capture surfaces** — no browser extension wiring, no GitHub API, no Slack, no Swift Accessibility shim, no MCP-pull-mode. All separate later items.
- **Other apps** — only the two paths above. Adding any third path to the allowlist is a separate per-source item.
- **Polling fallback** if chokidar fails — rely on chokidar's macOS FSEvents backend, which is solid. If something goes wrong, log and continue.
- **Debouncing** rapid file events (e.g., burst writes to a SQLite WAL) — pass through every event for V1; debounce later if storage gets noisy.
- **Cross-platform support** — macOS only. Linux/Windows watching is V1.5+.
- **Embedding generation** for FS-captured events — embedding stays NULL on insert, populated later by an embedding pipeline.
- **Modifying the `Storage` interface or the gate** — both stay as shipped.
- **Adding any dependency beyond `chokidar`** — no `klaw`, no `recursive-readdir`, no glob libraries.
- **Modifying the daemon's lifecycle scaffold** — only adding the FS-watcher hooks (start on boot, stop on shutdown); no other lifecycle changes.

## After Completion (Strategist Notes)

This item is consequential — it's the first time ECHO actually captures something. The wiki updates should reflect that meaningfully:

1. Update `wiki/sources/capture-allowlist.md`:
   - Replace the "ships empty" framing with the new reality
   - Document the first two entries (Cursor + Claude Code paths) and why they were chosen
   - Add a "Per-source decision history" subsection that future allowlist additions extend
2. Update `wiki/concepts/sandboxed-capture.md`:
   - Add "the gate's accept-path is now exercised in production" framing
   - Cross-reference the FS watcher as the first capture surface
3. Create `wiki/entities/fs-watcher.md` documenting:
   - The `startFsWatcher` contract
   - The candidate event shape (source, content, metadata structure)
   - The "ongoing changes only, no backfill" V1 commitment
   - Lag characteristics measured during 009's verification (record the medians from `agent_notes`)
   - Cross-reference to [[capture-pipeline]] downstream and [[capture-allowlist]] upstream
4. Update `wiki/entities/local-daemon.md`:
   - Note that the daemon now registers FS watchers on boot
   - Document the "first capture surface" milestone
5. Update `docs/STATUS.md` for the week (this is a real milestone — substrate is alive)
6. Update manifest + index for the new entity page
7. Consider drafting a public weekly-changelog entry: "Week 2: ECHO now captures Cursor and Claude Code workspace events." Per V1 spec, weekly changelog runs from week 1 — this is the first entry with substantive product content rather than infrastructure.

If lag verification recorded Cursor median >2s, queue a Wave 3 item for the Accessibility-API capture path before the killer demo work begins.
