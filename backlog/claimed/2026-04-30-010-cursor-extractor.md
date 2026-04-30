---
id: 2026-04-30-010-cursor-extractor
title: Cursor extractor (chat turns, full text)
status: ready
priority: HIGH
estimate: 0.75d
created: 2026-04-30
spec_refs:
  - wiki/entities/capture-gate.md
  - wiki/entities/storage.md
blocked_by:
  - 2026-04-30-009-fs-watcher-cursor-and-claude-code
acceptance:
  - "`extractCursorTurns(dbPath, lastSeenTurnId): Promise<CursorTurn[]>` exported from `src/capture/extractors/cursor.ts`"
  - "Reads Cursor's `state.vscdb` SQLite file, queries the chat history table(s), returns ordered list of new turns since `lastSeenTurnId`"
  - "`startCursorExtractor(storage)` integrates with the daemon: on FS watcher events for any Cursor `state.vscdb`, runs the extractor, emits one `CandidateEvent` per new turn"
  - "Per-workspace state tracking: in-memory map `Map<workspace_id, last_seen_turn_id>`, backfilled from storage on boot via `storage.query({source: 'cursor-chat:<ws>', limit: 1, ...})`"
  - "Content shape: `USER: <user message>\\n\\nASSISTANT: <full assistant response>` (no diff parsing, no last-part heuristic)"
  - "source: `cursor-chat:<workspace_id>`"
  - "metadata: `{ workspace_id, thread_id, turn_id, mtime }`"
  - "Each CandidateEvent flows through `processCandidate` (item 006)"
  - "`CAPTURED_SOURCES.fs_paths` already includes Cursor's workspaceStorage (item 009); no allowlist change in this item — but verify `cursor-chat:` source strings pass the gate. Since `cursor-chat:` is a NEW source kind, the gate's parser will not recognize it. Either: (a) add a per-extractor source-prefix-to-fs-path mapping that the gate honors, OR (b) use `fs:<absolute-path-to-state.vscdb>` as the source so the existing fs allowlist permits it."
  - "Tests cover: parsing a fixture state.vscdb with N turns; backfill from empty state; resumption from a saved last_seen_turn_id; no duplicate emissions"
  - "Lag: extracted CandidateEvents reach storage within 2s of Cursor's chat persistence (verify in agent_notes via timestamps)"
  - "`npm run test`, `npm run lint`, `npm run typecheck` clean"
files_to_modify:
  - src/capture/extractors/cursor.ts
  - src/capture/sources.ts
  - src/daemon/index.ts
  - tests/capture/extractors/cursor.test.ts
  - tests/fixtures/cursor-state.vscdb (or generated programmatically)

claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Cursor extractor (chat turns, full text)

## What

A capture surface that turns Cursor's local SQLite chat persistence into structured `CaptureEvent`s — one event per conversation turn (user + assistant pair). Triggered by the existing FS watcher (item 009) when Cursor's `state.vscdb` files change.

```ts
// src/capture/extractors/cursor.ts
export interface CursorTurn {
  workspace_id: string;
  thread_id: string;
  turn_id: string;
  user_message: string;
  assistant_message: string;
  mtime: number;
}

export async function extractCursorTurns(
  dbPath: string,
  lastSeenTurnId: string | undefined,
): Promise<CursorTurn[]>;

export async function startCursorExtractor(
  storage: Storage,
): Promise<{ stop: () => Promise<void> }>;
```

Behavior:

- On boot, daemon calls `startCursorExtractor(storage)`. Extractor backfills the in-memory `Map<workspace_id, last_seen_turn_id>` by querying storage for the most-recent event per `source: 'cursor-chat:<ws>'`.
- The FS watcher (item 009) emits FS events for changes under `~/Library/Application Support/Cursor/User/workspaceStorage/`. For each `state.vscdb` change event, the extractor reads the DB, calls `extractCursorTurns(dbPath, last_seen)`, emits one `CandidateEvent` per new turn through `processCandidate(event, storage)`.
- After successful emission, updates the in-memory last-seen-turn-id for that workspace.

Content format per turn:

```
USER: <user message>

ASSISTANT: <full assistant response>
```

That's it. No diff extraction (git capture surface in item 012 handles that). No "last part" heuristic. Full text in, full text stored. The user already locked this design.

## Why

The first real *content* capture surface — Wave 2's FS watcher only stored file-event metadata. With this item, ECHO starts recording the actual conversations the user has with Cursor's AI. This is what makes the killer-demo retrieval ("ECHO surfaces my prior architectural conversation about X") possible.

Cursor's chat history lives in SQLite. The DB schema isn't officially documented, but its structure is stable enough to reverse-engineer from a live `state.vscdb`. The agent should probe the DB on first run, identify the chat-related tables, and key the extraction off whatever stable identifier (likely a turn-id or row-rowid) Cursor uses.

Triggering off FS events (rather than polling) keeps the extractor reactive: Cursor writes a chat turn → FS watcher fires within ~1–3s → extractor runs → event in storage. Within the founder's "≤2 message lag" tolerance for the felt-not-seen brand promise.

## Acceptance Criteria

- [ ] `src/capture/extractors/cursor.ts` exports `extractCursorTurns(dbPath, lastSeenTurnId)` and `startCursorExtractor(storage)`
- [ ] `extractCursorTurns` opens the SQLite DB read-only (do NOT write to Cursor's data), queries the chat tables, returns turns in ascending order
- [ ] If `lastSeenTurnId` is `undefined`, returns ALL turns; otherwise returns only those AFTER it
- [ ] Cursor's chat schema is probed in code (not hard-coded): the agent should write a small DB-introspection helper that locates the relevant table by checking sqlite_master for tables containing chat-shaped columns
- [ ] If the schema is unrecognizable, the extractor logs a `warn` and emits zero events (does NOT throw — capture surface failures are non-fatal to the daemon)
- [ ] `startCursorExtractor`:
  - On boot, queries storage for the last-seen turn per workspace; populates the in-memory map
  - Hooks into the FS watcher's emission stream (the FS watcher should expose a way for downstream extractors to subscribe — or the daemon wires both)
  - For each `state.vscdb` change: reads, extracts, emits via `processCandidate`
  - Updates in-memory map after successful emission
  - On `stop()`, releases DB handles
- [ ] `CandidateEvent` shape:
  - `source: 'cursor-chat:<workspace_id>'` (where `<workspace_id>` is the workspaceStorage hash directory name)
  - `timestamp: <ISO from turn's mtime>`
  - `content: 'USER: <user_message>\\n\\nASSISTANT: <assistant_message>'`
  - `metadata: { workspace_id, thread_id, turn_id, mtime }`
- [ ] Source kind allowlist: since `cursor-chat:` is a NEW source kind, decide one of:
  - **(A)** Use `fs:<path-to-state.vscdb>` as the source instead — reuses existing allowlist; metadata captures workspace/thread/turn ids. Recommended for V1.
  - **(B)** Extend the gate / allowlist to recognize `cursor-chat:` and add a per-prefix predicate. More work.
  - The agent should pick (A) unless it discovers (B) is necessary; document the choice in `agent_notes`.
- [ ] Tests in `tests/capture/extractors/cursor.test.ts`:
  - Generate a fixture `state.vscdb` programmatically (use `better-sqlite3` to build one matching Cursor's schema based on what the agent observes); seed it with N known turns
  - `extractCursorTurns(fixturePath, undefined)` returns all N
  - `extractCursorTurns(fixturePath, turn[N-2].id)` returns just the last turn
  - Schema-not-recognized fixture produces zero events + a warn log (assert via stdout fixture)
  - End-to-end test: spawn extractor with a `MemoryStorage`, simulate FS event, assert storage receives the right number of events with the right shapes
- [ ] Daemon (`src/daemon/index.ts`) starts the extractor on boot, stops it on shutdown
- [ ] Lag verification (founder during review): in `agent_notes`, record measured lag from "send a chat message in Cursor" to "event in storage". Target: median ≤2s over 5 trials. If consistently >5s, flag for the founder.
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` clean

## Out of Scope (Don't Drift)

- **Diff extraction** — explicitly handled by item 012 (git capture). Do not parse Cursor's tool-call history for diffs.
- **Last-part / summary heuristics** — store the full assistant message, period
- **Embedding generation** — embedding column stays NULL on insert
- **Writing to Cursor's data** — read-only access to `state.vscdb`. NEVER open the DB in writable mode.
- **Cursor-specific UI / settings integration** — the user manually configures nothing in this item; everything is transparent
- **Other Cursor data** (extensions, debug history, terminal history) — only chat, only this turn
- **Backfill of older turns** beyond what's currently in `state.vscdb` — Cursor itself purges history; we capture forward
- **Cross-workspace dedup** — each workspace tracked independently
- **Adding new dependencies** — `better-sqlite3` already exists from item 008; no new deps

## After Completion (Strategist Notes)

Once this item lands in `backlog/complete/`, the strategist's next task is to:

1. Create `wiki/entities/cursor-extractor.md` documenting:
   - The extraction contract (per-turn `CaptureEvent` shape)
   - The schema-probing approach (rationale for runtime introspection vs. hard-coded)
   - Lag characteristics measured during 010's verification (record the median from `agent_notes`)
   - Cross-references to [[capture-pipeline]], [[storage]], [[capture-gate]]
2. Update `wiki/sources/capture-allowlist.md` if source-string conventions changed (e.g., we settled on `fs:<path>` vs `cursor-chat:`)
3. Update `wiki/concepts/sandboxed-capture.md` to reference Cursor as the first content-bearing capture surface
4. Update `docs/STATUS.md` for the week — content capture is a real milestone
5. Update manifest + index for the new entity page
