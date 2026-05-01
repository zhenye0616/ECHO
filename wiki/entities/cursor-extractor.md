---
topic: Architecture
subtopic: Capture Surfaces
aliases:
  - Cursor Extractor
  - cursor-extractor
  - Cursor Composer Extractor
---

# Cursor Extractor

## Definition

The Cursor extractor (`src/capture/extractors/cursor.ts`) turns Cursor's composer chat into structured per-turn `CaptureEvent`s. Where the generic [[fs-watcher]] emits raw FS-event signals, this extractor opens Cursor's SQLite databases read-only and produces one event per `(user bubble, assistant bubble)` pair. It is the first capture surface to ship with non-trivial schema reverse-engineering — the storage layout was probed empirically before the spec was written.

## Public Contract

```ts
interface CursorExtractorHandle {
  stop: () => Promise<void>;
}

function startCursorExtractor(
  storage: Storage,
  options?: { globalDbPath?: string; workspacePrefix?: string },
): Promise<CursorExtractorHandle>;
```

The daemon calls `startCursorExtractor(storage)` on boot. The handle's `stop()` cancels any pending debounce, closes the chokidar watcher, and waits for the in-flight processing chain to drain.

## The Two Watched Paths

The extractor watches two paths under `~/Library/Application Support/Cursor/User/`:

| Path | Role |
|---|---|
| `globalStorage/state.vscdb` (and `-wal`, `-shm`) | **Content.** Composer bubbles live in `cursorDiskKV` rows keyed `bubbleId:<composer_id>:<bubble_id>`. |
| `workspaceStorage/<hash>/state.vscdb` | **Workspace inference.** Per-workspace `ItemTable.composer.composerData` lists which composer IDs belong to that workspace. |

This split is empirical, not designed. An earlier spec assumed chat lived in per-workspace `state.vscdb`; a privacy-respecting probe (logged in `raw/internal/decisions/2026-04-30-DRIFT-cursor-chat-storage-location.md`) showed the per-workspace `cursorDiskKV` row count was zero across ~20 workspaces — actual chat content sits in `globalStorage`. The spec was rewritten to match.

## Composer, Not Workspace

The stable identity for state tracking is the **composer ID**, not the workspace. Cursor composer chat is composer-scoped: one composer can outlive workspace switches; one workspace can host many composers. The extractor maintains a `Map<composer_id, last_seen_bubble_id>` (backfilled on boot from prior storage events) and resumes per-composer.

`workspace_id` is therefore best-effort metadata. A separate in-memory `Map<composer_id, workspace_hash>` is populated as workspace `state.vscdb` files change: on each event, the extractor reads `ItemTable.composer.composerData` from the touched workspace, parses the `allComposers` list, and records the composer→workspace mapping. When a turn is emitted, the extractor looks up the composer; if found, `metadata.workspace_id` is set; if not, the field is **omitted entirely** (not null, not empty string).

## The 300ms Debounce on Global-DB-Family Events

SQLite WAL writes touch `state.vscdb-wal` first, then `-shm`, then the bare `state.vscdb` — three FS events per logical chat persistence. To coalesce this churn, FS events on any of `state.vscdb`, `state.vscdb-wal`, `state.vscdb-shm` are funneled through a 300ms debounce timer. Only one extraction pass runs per debounce window. `stop()` clears any pending timer to avoid leaking timeouts after shutdown. (Added in chore commit `912ebab`; the original implementation watched only the bare DB file and missed events.)

Workspace-DB events are not debounced — they only update the inference map, which is cheap.

## The Candidate Event Shape

```ts
{
  source: `fs:${globalDbPath}`,
  timestamp: <ISO from the assistant bubble's createdAt>,
  content: `USER: ${user_message}\n\nASSISTANT: ${assistant_message}`,
  metadata: {
    composer_id: string,
    user_bubble_id: string,
    assistant_bubble_id: string,
    mtime: number,
    workspace_id?: string,  // best-effort
  },
}
```

The `fs:` source prefix is reused (rather than introducing a `cursor:` kind) so [[capture-gate]]'s source-handling logic stays unchanged. The two paths in `CAPTURED_SOURCES.fs_paths` (workspaceStorage from item 009, globalStorage from item 010) capture different signals from the same app. Each accepted turn updates `lastSeenMap` so the next pass resumes correctly.

Pairing is strict: a trailing user bubble with no assistant response yet emits no event. An orphan assistant bubble (no preceding user) is logged warn and dropped.

## Read-Only Database Access

The SQLite handle is opened with `{ readonly: true, fileMustExist: true }`. Cursor's data files are never written by ECHO. This is defense-in-depth — a compromised process running this code still cannot corrupt the user's editor state.

## What it does NOT do

- **Does not extract diffs.** Code change capture is [[git-capture]]'s job. The split is structural: chat is "what was discussed," git is "what actually changed."
- **Does not extract tool calls.** Bubbles with `tool_use` / `tool_result` types are ignored; only `role: 'user'` and `role: 'assistant'` text becomes content. A future tool-extraction item may revisit.
- **Does not summarise.** The full assistant message is stored verbatim. No last-part heuristic, no truncation.
- **Does not backfill old bubbles** beyond what is currently in `globalStorage`. Cursor manages its own retention; ECHO captures forward.
- **Does not write to Cursor's data.** All DB handles are read-only.
- **Does not throw on schema mismatch.** Missing `cursorDiskKV` table or unparseable rows produce zero events plus a warn log; the daemon stays alive.
- **Does not prime the workspace map at boot.** The first turn after a fresh boot may ship without `workspace_id` until any per-workspace `state.vscdb` is touched (deferred follow-up).

## Related

- [[claude-code-extractor]] — sibling extractor that converges on the same `USER: ... ASSISTANT: ...` turn shape
- [[fs-watcher]] — generic surface that ignores Cursor's SQLite triplet so this extractor owns it
- [[capture-pipeline]] — downstream consumer of each emitted candidate
- [[capture-gate]] — accepts `fs:<globalDbPath>` against the allowlist
- [[capture-allowlist]] — declares both Cursor paths under `fs_paths`
- [[storage]] — the persistence layer accepted turns flow into
