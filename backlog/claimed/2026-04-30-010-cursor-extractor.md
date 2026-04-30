---
id: 2026-04-30-010-cursor-extractor
title: Cursor extractor (composer chat from globalStorage)
status: ready
priority: HIGH
estimate: 1d
created: 2026-04-30
spec_refs:
  - wiki/entities/capture-gate.md
  - wiki/entities/storage.md
  - raw/internal/decisions/2026-04-30-DRIFT-cursor-chat-storage-location.md
blocked_by:
  - 2026-04-30-009-fs-watcher-cursor-and-claude-code
acceptance:
  - "`extractCursorTurns(globalDbPath, lastSeenBubbleIdPerComposer): Promise<CursorTurn[]>` exported from `src/capture/extractors/cursor.ts`"
  - "Reads Cursor's `globalStorage/state.vscdb` SQLite file (NOT per-workspace state.vscdb), queries `cursorDiskKV` for `bubbleId:` and `composerData:` rows, returns ordered list of new turns per composer since the per-composer last_seen_bubble_id"
  - "`startCursorExtractor(storage)` integrates with the daemon: on FS watcher events for `globalStorage/state.vscdb`, runs the extractor, emits one `CandidateEvent` per new turn"
  - "Per-composer state tracking: in-memory map `Map<composer_id, last_seen_bubble_id>`, backfilled from storage on boot via `storage.query({source: 'fs:<global-db-path>', metadata.composer_id: <id>, limit: 1, ...})`"
  - "**Turn shape:** one composer can have many bubbles; user bubbles and assistant bubbles alternate. Pair each consecutive `(user_bubble, assistant_bubble)` into one CandidateEvent. Solo user bubbles (assistant hasn't responded yet) are NOT emitted — wait for the response."
  - "Content shape: `USER: <user message>\\n\\nASSISTANT: <full assistant response>` (no diff parsing; no last-part heuristic)"
  - "source: `fs:<absolute-path-to-global-state.vscdb>` (reuses fs allowlist; consistent with 011)"
  - "metadata: `{ composer_id, user_bubble_id, assistant_bubble_id, workspace_id, mtime }` where `workspace_id` is best-effort: populated when the in-memory composer→workspace index has seen the composer; otherwise omitted entirely (NOT null, NOT empty string — just absent)"
  - "**Allowlist update:** `CAPTURED_SOURCES.fs_paths` extended with `~/Library/Application Support/Cursor/User/globalStorage/` (NEW). Per the per-source decision pattern; this is the per-source PR for adding globalStorage to ECHO's allowlist."
  - "**Workspace inference (best-effort):** maintain an in-memory `Map<composer_id, workspace_hash>` index. On any FS event for a per-workspace `state.vscdb`, read `ItemTable.composer.composerData` from that workspace and update the map for any composer_ids found there. When emitting a turn, look up the composer in the map; populate `metadata.workspace_id` if found."
  - "Each CandidateEvent flows through `processCandidate` (item 006)"
  - "Tests cover: parsing a fixture globalStorage state.vscdb with N composers and M bubbles; resumption from per-composer last_seen_bubble_id; user-only bubble (no assistant yet) emits no event; assistant-only orphan bubble (no preceding user) is logged warn and dropped; workspace_id populated when index has the composer, omitted otherwise"
  - "Lag: extracted CandidateEvents reach storage within 2s of Cursor's chat persistence (verify in agent_notes via 5 trials)"
  - "**No chat content read into agent transcript during testing.** Test fixtures are programmatically constructed (use `better-sqlite3` to build a synthetic globalStorage DB matching the schema observed in the drift note). Do not copy the founder's real globalStorage DB into the repo."
  - "`npm run test`, `npm run lint`, `npm run typecheck` clean"
files_to_modify:
  - src/capture/extractors/cursor.ts
  - src/capture/sources.ts
  - src/daemon/index.ts
  - tests/capture/extractors/cursor.test.ts
  - tests/fixtures/cursor-globalstorage.ts

claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-04-30T22:56:35Z"
branch: "agent/cursor-extractor"
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: |
  V1 of this spec assumed Cursor stored composer chat in per-workspace
  state.vscdb. The previous claim's empirical probe (drift note dated
  2026-04-30) showed chat actually lives in globalStorage/state.vscdb
  under cursorDiskKV. Spec rewritten to match reality (Option 1):
  watch globalStorage, track per-composer, workspace_id is best-effort.
  Per-workspace state.vscdb is still in the FS allowlist (item 009)
  and provides composer→workspace inference; that's preserved here.
---

# Cursor extractor (composer chat from globalStorage)

## What

A capture surface that turns Cursor's composer chat into structured `CaptureEvent`s — one event per conversation turn (user bubble + assistant bubble pair). Triggered by the existing FS watcher (item 009) when Cursor's `globalStorage/state.vscdb` changes.

```ts
// src/capture/extractors/cursor.ts
export interface CursorTurn {
  composer_id: string;
  user_bubble_id: string;
  assistant_bubble_id: string;
  workspace_id?: string;       // best-effort; omitted if unknown
  user_message: string;
  assistant_message: string;
  mtime: number;
}

export async function extractCursorTurns(
  globalDbPath: string,
  lastSeenBubbleIdPerComposer: Map<string, string>,
): Promise<CursorTurn[]>;

export async function startCursorExtractor(
  storage: Storage,
): Promise<{ stop: () => Promise<void> }>;
```

Behavior:

- On boot, daemon calls `startCursorExtractor(storage)`. Extractor backfills `Map<composer_id, last_seen_bubble_id>` by querying storage for the most-recent event per `metadata.composer_id`. (If storage doesn't expose `metadata.composer_id` filtering, the extractor falls back to scanning recent events with `source: 'fs:<global-db-path>'` and rebuilding the map.)
- Maintains a parallel `Map<composer_id, workspace_hash>` index for best-effort workspace inference. On any FS event for a per-workspace `state.vscdb`, the extractor reads that workspace's `ItemTable.composer.composerData`, parses the composer-id list, and updates the map.
- On each `globalStorage/state.vscdb` change:
  1. Open DB read-only
  2. Query `cursorDiskKV` for new bubbles per composer (rows with key `bubbleId:<composer_id>:<bubble_id>` not yet seen)
  3. Group bubbles within each composer into user→assistant pairs in chronological order
  4. For each complete pair, emit one CandidateEvent through `processCandidate(event, storage)`
  5. Update the per-composer last_seen_bubble_id

Source string: `fs:<absolute-path-to-globalStorage-state.vscdb>` — same fs prefix convention used by 011 (Claude Code) and the existing FS watcher. Reuses the gate's existing fs handling; no new source kind needed.

Content per turn:

```
USER: <user message>

A: <full assistant response>
```

That's it. Same convention as 011. No diff parsing (git capture surface in item 012 is the diff source). No last-part heuristic. Full text in, full text stored.

## Why

This is the corrected version of the original spec. The first attempt assumed Cursor persisted composer chat into per-workspace `state.vscdb`. Empirical probe by the prior agent (see `raw/internal/decisions/2026-04-30-DRIFT-cursor-chat-storage-location.md`) showed:

- Per-workspace `state.vscdb` files have `cursorDiskKV` row count = 0 across ~20 workspaces probed
- Per-workspace `composer.composerData` only stores composer *metadata* (ids, mode, createdAt, hasUnreadMessages) — no message text
- Actual chat content lives in `globalStorage/state.vscdb` under `cursorDiskKV` keys prefixed `bubbleId:<composer_id>:<bubble_id>` and `composerData:<composer_id>`

So the right unit of state-tracking is the **composer**, not the workspace. Workspace association can be inferred best-effort from per-workspace metadata; populated when known, omitted when unknown. The audit page never relies on workspace_id structurally.

Reusing `fs:` as the source prefix (rather than introducing a `cursor-chat:` kind) keeps the gate's source-handling logic unchanged. The two paths now in `fs_paths` (workspaceStorage from 009, globalStorage from this item) capture different signals from the same app: workspace events for "what files / projects is the user touching," global events for "what conversations are happening."

## Acceptance Criteria

- [ ] `src/capture/extractors/cursor.ts` exports `extractCursorTurns(globalDbPath, lastSeenMap)` and `startCursorExtractor(storage)`
- [ ] `extractCursorTurns` opens the SQLite DB **read-only** (Cursor's data must not be written to)
- [ ] Bubble enumeration:
  - Query `cursorDiskKV` for keys matching `bubbleId:%`
  - Parse key as `bubbleId:<composer_id>:<bubble_id>`; parse value as JSON to get `role` (user/assistant), `text`, `createdAt`
  - Group by composer_id; sort by `createdAt`
  - For each composer, take only bubbles with id > `lastSeenMap.get(composer_id)` (or all if not in map)
  - Pair consecutive (user, assistant) bubbles; emit each pair as a turn
  - Solo trailing user bubble (no assistant yet) → NOT emitted; remember its bubble_id so resumption picks it up after the assistant responds
  - Solo assistant bubble with no preceding user → log warn (`capture.cursor: orphan_assistant_bubble`), drop the bubble
- [ ] Workspace inference:
  - Maintain `Map<composer_id, workspace_hash>`
  - On per-workspace `state.vscdb` FS events, read `ItemTable.composer.composerData`, extract composer-id list, update the map
  - When emitting a turn, look up `composer_id` in the map; if found, set `workspace_id`; if not, omit the field entirely (no null, no empty string)
- [ ] `startCursorExtractor`:
  - Backfill `lastSeenMap` from storage on boot
  - Hook into FS watcher events for both `globalStorage/state.vscdb` (chat) and per-workspace `state.vscdb` (workspace inference)
  - On each event, run the appropriate extraction; emit candidates via `processCandidate`
  - On `stop()`, releases DB handles
- [ ] `CandidateEvent` shape:
  - `source: 'fs:<absolute-path-to-globalStorage-state.vscdb>'`
  - `timestamp: <ISO from the assistant bubble's createdAt>`
  - `content: 'USER: <user_message>\\n\\nASSISTANT: <assistant_message>'`
  - `metadata: { composer_id, user_bubble_id, assistant_bubble_id, mtime, workspace_id? }`
- [ ] **Allowlist update:** `src/capture/sources.ts` extended:
  - `CAPTURED_SOURCES.fs_paths` now includes `~/Library/Application Support/Cursor/User/globalStorage/` (in addition to the workspaceStorage path from 009)
  - Verify `_isAllowedPathIn` correctly prefix-matches paths under the new entry
- [ ] If the schema is unrecognizable (no `cursorDiskKV` table, or no `bubbleId:` keys), log warn and emit zero events. Do NOT throw — capture surface failures are non-fatal to the daemon.
- [ ] Tests in `tests/capture/extractors/cursor.test.ts`:
  - **Programmatic fixture** in `tests/fixtures/cursor-globalstorage.ts`: builds a synthetic `cursorDiskKV` table with N composers and known bubbles per composer
  - `extractCursorTurns` with empty `lastSeenMap` returns ALL complete turns
  - With per-composer `lastSeenMap` set, returns only bubbles after each composer's checkpoint
  - User-only trailing bubble: emits zero turns; on next call after assistant bubble appended, emits one turn
  - Orphan assistant bubble (no preceding user): warn logged, no event emitted
  - Workspace inference: pre-populated map → `workspace_id` present in emitted turn; map miss → field absent
  - Schema-not-recognized fixture (no cursorDiskKV) produces zero events + warn log
  - End-to-end with `MemoryStorage`: simulate chronologically-ordered bubble appends, assert correct turn order, no duplicates
- [ ] Daemon registers + tears down the extractor in lifecycle (same pattern as item 009 + 011)
- [ ] Lag verification (founder during review): in `agent_notes`, record measured lag from "send a chat message in real Cursor" to "event in storage". Target: median ≤2s over 5 trials. If consistently >5s, escalate.
- [ ] **Privacy:** during testing, do NOT copy the founder's real globalStorage DB into the repo or read its content into the agent transcript. Use the programmatic fixture only. The drift-note's privacy-respecting probe pattern is the standard.
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` clean

## Out of Scope (Don't Drift)

- **Diff extraction** — explicitly handled by item 012 (git capture). Do not parse Cursor's tool-call history for diffs.
- **Last-part / summary heuristics** — store the full assistant message, period. (Locked by founder in earlier strategist conversation.)
- **Tool-call extraction** — bubbles can have tool_use/tool_result types in addition to user/assistant. For V1, ignore tool-typed bubbles. A future "tool extraction" item can revisit.
- **Cross-composer dedup** — each composer tracked independently
- **Embedding generation** — embedding column stays NULL on insert
- **Writing to Cursor's data** — read-only access to all `state.vscdb` files. Never open the DB writable.
- **Cursor-specific UI / settings integration** — transparent to the user
- **Other Cursor data** (extensions, debug history, terminal, inline-edit history) — only composer chat; only this turn-shape
- **Backfill of older bubbles** beyond what's currently in globalStorage — Cursor itself manages retention; we capture forward
- **Bubble content beyond `text`** — no tool inputs/outputs, no attached files, no images. Future item if useful.
- **Per-source consent toggles** — all-or-nothing per the V1 audit-page model
- **Adding new dependencies** — `better-sqlite3` already exists from item 008; no new deps

## After Completion (Strategist Notes)

Once this item lands in `backlog/complete/`, the strategist's next task is to:

1. Create `wiki/entities/cursor-extractor.md` documenting:
   - The extraction contract (per-turn `CaptureEvent` shape)
   - The composer-not-workspace tracking unit, and why
   - The workspace_id best-effort inference mechanism
   - The two FS paths involved (`workspaceStorage/` for inference, `globalStorage/` for content)
   - Lag characteristics measured during 010's verification
   - Privacy: schema-only probes during testing; no founder data in the repo
   - Cross-references to [[capture-pipeline]], [[storage]], [[capture-gate]], [[capture-allowlist]]
2. Update `wiki/sources/capture-allowlist.md`:
   - Document the second `fs_paths` entry (globalStorage) and why it's needed
   - Reference the drift note as the rationale for the layout
3. Update `wiki/concepts/sandboxed-capture.md`:
   - Cite the read-only-DB pattern as a defense-in-depth example
4. Update `docs/STATUS.md` for the week — first content extractor with non-trivial schema reverse-engineering shipped
5. Add a Spec Authoring Lesson to `backlog/README.md`: **"Probe before you spec. When the spec depends on a third-party app's storage layout, do a privacy-respecting schema probe before writing the spec — not during implementation. The agent that catches the layout mismatch during work will escalate; the strategist that wrote the wrong spec creates that escalation."**
6. Update manifest + index for the new entity page
