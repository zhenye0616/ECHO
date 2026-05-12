---
status: shipped
capture_status: degraded
topic: Architecture
subtopic: Capture Surfaces
aliases:
  - Cursor Extractor
  - cursor-extractor
  - Cursor Composer Extractor
---

# Cursor Extractor

> ⚠️ **Capture degraded since 2026-05-01.** Cursor migrated chat storage from `bubbleId:` / `composerData:` (which this extractor reads) to `agentKv:blob:` / `messageRequestContext:` (not yet implemented). New conversations after 2026-05-01 are silently invisible to ECHO; legacy bubble rows remain readable but frozen. The V1.5.7 patch quieted the `orphan_assistant_bubble` spam, but did NOT restore live capture. Path B rewrite (`agentKv:` extractor) is **not** a current V1.6 priority — gated on a Cursor-using dogfooder entering the validation loop. Founder's personal stack is Claude Code + Codex; without daily Cursor use, capture-quality regressions can't be caught quickly enough to commit to the surface. See `backlog/_followups.md` "Cursor capture — known V1 degraded surface" for the full rationale.

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
| `globalStorage/state.vscdb` (and `-wal`, `-shm`) | **Content.** Composer bubbles + composer metadata live in `cursorDiskKV` rows. |
| `workspaceStorage/<hash>/state.vscdb` | **Workspace inference.** Per-workspace `ItemTable.composer.composerData` lists which composer IDs belong to that workspace. |

This split is empirical, not designed. An earlier spec assumed chat lived in per-workspace `state.vscdb`; a privacy-respecting probe (logged in `raw/internal/decisions/2026-04-30-DRIFT-cursor-chat-storage-location.md`) showed the per-workspace `cursorDiskKV` row count was zero across ~20 workspaces — actual chat content sits in `globalStorage`. The spec was rewritten to match.

## Cursor's `cursorDiskKV` row shape

Two row kinds matter; both were probed empirically against a live Cursor install:

```
key                                            value (top-level keys, abbreviated)
─────────────────────────────────────────      ──────────────────────────────────────────
composerData:<composer-uuid>                   { composerId, createdAt: <ms>,
                                                 fullConversationHeadersOnly: [
                                                   { bubbleId, type },  // ordered
                                                   …
                                                 ],
                                                 conversation, status, … }
bubbleId:<composer-uuid>:<bubble-uuid>         { _v, type, text, bubbleId, … many fields }
```

Two facts are load-bearing for the parser:

- **Role is encoded as `type` (number), not `role` (string).** `type: 1` is user, `type: 2` is assistant. There is no `role` field.
- **Bubbles have no per-row timestamp.** The canonical chronological order comes from the parent `composerData:<id>.fullConversationHeadersOnly` array. The extractor synthesizes a per-bubble `createdAt` as `composer.createdAt + position-in-headers` for stable ordering and checkpointing.

Any bubble row whose value JSON doesn't match these expectations is dropped with `log.warn('unrecognized_bubble_shape', { reason, key })`, where `reason` is one of `json_parse`, `not_object`, `unknown_type`, `missing_text`, `no_composer_row`, `not_in_composer_headers`. This is the observability hook that surfaces a future Cursor schema drift in seconds rather than as silent zero-turn output.

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
  timestamp: <ISO from the synthesized assistant_created_at>,
  content: `USER: ${user_message}\n\nASSISTANT: ${assistant_message}`,
  metadata: {
    composer_id: string,                  // Cursor's composer UUID — the chat thread ID
    user_bubble_id: string,
    assistant_bubble_id: string,          // last bubble in the cluster — checkpoint anchor
    assistant_bubble_ids: string[],       // every assistant bubble that followed the user
    mtime: number,
    workspace_id?: string,                // best-effort
    repo_root?: string,                   // item 037 — Stage 1: workspace.json folder URI;
                                          //   Stage 2 fallback: file-walk via files_referenced.
                                          //   Omitted when neither resolution succeeds.
    is_continuation?: true,                                  // item 036 — present only on continuation atoms
    continuation_of_assistant_bubble_id?: string,            // item 036 — set iff is_continuation === true
  },
}
```

## Multi-cluster continuation atoms (item 036)

Cursor sometimes emits post-checkpoint assistant bubbles BEFORE the next user bubble — the pattern is "user → assistant cluster → checkpoint → more assistant bubbles → user." Pre-036, the second cluster was silently dropped (47.6% capture rate on a measured composer; 15 of 26 assistant bubbles invisible). Post-036, the extractor emits **continuation atoms** for these post-checkpoint bubbles:

- **When continuation atoms fire:** after a user bubble + its initial assistant cluster has been processed, if Cursor writes additional `type=2` bubbles before the next `type=1` user bubble, those new bubbles emit as a continuation atom.
- **Identity:** continuation atoms carry `metadata.is_continuation: true` and `metadata.continuation_of_assistant_bubble_id` pointing at the last bubble of the original cluster (the join key).
- **Consumer join pattern:** group atoms by `metadata.user_bubble_id` for a deduplicated logical-turn view. Continuation atoms share the same `user_bubble_id` as the original cluster they extend; downstream consumers can re-stitch the logical turn by walking `assistant_bubble_ids[]` ∪ continuation atom contents.
- **Why a separate atom, not in-place mutation:** the substrate is append-only ([[storage]] contract). Re-emitting the original cluster with extra bubbles would violate that; continuation atoms preserve append-only semantics while restoring capture coverage.

## Work-artifact (repo) attribution (item 037)

Each emitted atom carries `metadata.repo_root` when the extractor can resolve it. Two-stage resolution:

1. **Stage 1 (preferred):** parse Cursor's per-workspace `workspace.json` `folder` field (e.g., `file:///Users/zhenye/Desktop/Project_echo`), `fileURLToPath` + percent-decode → absolute path. This is the canonical signal Cursor itself uses for workspace binding.
2. **Stage 2 (fallback):** when `workspace.json` isn't available (fresh composer, no workspace binding yet), file-walk via `files_referenced` in the bubble's `context` field. Walk to the nearest `.git` ancestor; if it's unambiguous (single `.git` parent across all `files_referenced` entries), use that path as `repo_root`. If ambiguous (multiple `.git` ancestors), omit.

`metadata.repo_root` is the substrate-side half of [[work-artifact-first-class]]. Retrieval consumers (`search_memories`, `find_clusters`, `wait_for_new_turns`, `echo_resolve_mru`) AND-filter by this field when callers pass `repo_path` — cross-project bleed is structurally impossible for atoms post-037. Pre-037 atoms (legacy composers) lack this field; [[mcp-echo-resolve-mru|`echo_resolve_mru`]]'s Phase 2 legacy fallback recovers them via the workspace-hash → composer-id chain.

The `fs:` source prefix is reused (rather than introducing a `cursor:` kind) so [[capture-gate]]'s source-handling logic stays unchanged. The two paths in `CAPTURED_SOURCES.fs_paths` (workspaceStorage from item 009, globalStorage from item 010) capture different signals from the same app. Each accepted turn updates `lastSeenMap` so the next pass resumes correctly.

## Pairing rule: user → cluster of consecutive assistant bubbles

Cursor splits a single logical assistant response into multiple `type=2` bubbles in many flows (thinking-block bubble + answer bubble + tool-result bubbles, etc.). The empirical ratio in a real Cursor install is roughly **10× more assistant bubbles than user bubbles**. The pairing rule honors this:

- After a user bubble, the extractor walks forward and collects **every consecutive assistant bubble** until it hits the next user bubble (or end-of-array).
- The cluster's text is concatenated with `\n\n` joins into a single `assistant_message`.
- `assistant_bubble_ids` records every bubble in the cluster; `assistant_bubble_id` is the last one (used as the resume checkpoint, so the next pass starts after the entire cluster).
- A trailing user bubble with no assistant response yet emits no event — the cluster is incomplete and gets picked up on the next pass once Cursor finishes writing.
- An orphan assistant bubble (no preceding user; happens for some Cursor system / synthesized bubbles) is logged warn and dropped.

## Read-Only Database Access

The SQLite handle is opened with `{ readonly: true, fileMustExist: true }`. Cursor's data files are never written by ECHO. This is defense-in-depth — a compromised process running this code still cannot corrupt the user's editor state.

## What it does NOT do

- **Does not extract diffs.** Code change capture is [[git-capture]]'s job. The split is structural: chat is "what was discussed," git is "what actually changed."
- **Does not extract tool calls.** Only bubbles with `type: 1` (user) or `type: 2` (assistant) become content. Rows with any other `type` value are dropped with `unrecognized_bubble_shape: unknown_type`. A future tool-extraction item may revisit.
- **Does not summarise.** The full assistant message is stored verbatim. No last-part heuristic, no truncation.
- **Does not backfill old bubbles** beyond what is currently in `globalStorage`. Cursor manages its own retention; ECHO captures forward.
- **Does not write to Cursor's data.** All DB handles are read-only.
- **Does not throw on schema mismatch.** Missing `cursorDiskKV` table or unparseable rows produce zero events plus a warn log; the daemon stays alive.
- **Does not prime the workspace map at boot.** The first turn after a fresh boot may ship without `workspace_id` until any per-workspace `state.vscdb` is touched (deferred follow-up).

## Related

- [[cursor-collected-data]] — field-by-field reference of what data ECHO actually reads from Cursor (the *what*; this page is the *how*)
- [[claude-code-extractor]] — sibling extractor that converges on the same `USER: ... ASSISTANT: ...` turn shape
- [[fs-watcher]] — generic surface that ignores Cursor's SQLite triplet so this extractor owns it
- [[capture-pipeline]] — downstream consumer of each emitted candidate
- [[capture-gate]] — accepts `fs:<globalDbPath>` against the allowlist
- [[capture-allowlist]] — declares both Cursor paths under `fs_paths`
- [[storage]] — the persistence layer accepted turns flow into
- [[normalization]] — the read-time layer that converts this extractor's raw `CaptureEvent` into a `NormalizedContextEvent`; the cursor adapter handles the `metadata.context` → `artifacts[]` + `context.visible[]` mapping
