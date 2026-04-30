---
item_id: 2026-04-30-010-cursor-extractor
verdict: merge with founder fixups
reviewed_at: 2026-04-30T23:30:00Z
test_counts: { passed: 155, failed: 0 }
---

## Verdict

Implementation is solid: read-only DB access, sound bubble pairing, schema-not-recognized handled non-fatally, 16 new tests all passing, lint+typecheck clean, 155/155 across the suite. The one out-of-`files_to_modify` edit (`tests/capture/sources.test.ts`) is unavoidable — the test asserts an exhaustive `toEqual([...])` on `fs_paths`. Merge conflicts on `src/capture/sources.ts`, `src/daemon/index.ts`, and `tests/capture/sources.test.ts` are expected but trivial. Two small correctness items should be fixed pre-merge (event timestamp source, db handle leak window). Nothing structurally wrong.

## Pre-merge fixups

- [ ] `src/capture/extractors/cursor.ts:301` — set the emitted `CandidateEvent.timestamp` from the assistant bubble's `createdAt` (`new Date(assistant.createdAt).toISOString()`), not from `safeMtimeMs`. The spec explicitly states `timestamp: <ISO from the assistant bubble's createdAt>`; keep `mtime` only in metadata. Without this, all turns flushed in a single FS event share an identical timestamp, breaking audit-view ordering.
- [ ] `src/capture/extractors/cursor.ts:99–117` — wrap the SQLite query/parse block in `try/finally` to guarantee `db.close()` even on unexpected throws in the parse loop. Cheap insurance against handle leaks on schema-shape regressions.

## Expected merge conflicts

- `src/capture/sources.ts` — main has 2 `fs_paths` entries; branch inserts globalStorage as a third. Take branch (preserve insertion order).
- `src/daemon/index.ts` — main has 013's MCP server wiring and 012's git capture in the same lifecycle region the branch edits; branch adds `startCursorExtractor` import + start + stop. No semantic overlap; take both sides (preserve all four: gitWatcher, mcpServer, claudeCodeExtractor (if 011 lands first), cursorExtractor).
- `tests/capture/sources.test.ts` — exhaustive `toEqual([...])` on fs_paths. Take branch.

## Follow-up items (defer, do not block merge)

- Boot-time workspace-inference scan: walk `workspacePrefix` for existing `state.vscdb` files and prime the composer→workspace map at startup so the first turn after daemon restart can carry `workspace_id`.
- Coalesce rapid-fire FS events on `globalDbPath` (debounce or dirty-flag) to reduce redundant SQLite opens during a flush burst.
- Lag-measurement harness the founder can run privately, so future lag verification is reproducible without re-instrumenting the daemon.
- Bubble-shape resilience: log `unrecognized_bubble_shape` warn when `parseBubbleRow` returns null (currently silent), so a future Cursor schema change is visible in logs rather than manifesting as zero turns.
- Workspace-inference boot scan also addresses the agent's flagged item (4) in `agent_notes`.

## Open questions for founder

(none — verdict is "merge with founder fixups", not "block")

## Notes carried forward to merge

- Lag verification (acceptance criterion) is a founder-side task by design — agent could not safely run real Cursor chat through its own transcript. Implementation chain (chokidar → serialized extraction → single SELECT → emit) is structurally fast; ≤2s median is plausible. Founder records 5 trials post-merge and updates `agent_notes` or wiki page.
- Bubble JSON parse assumes `{role, text, createdAt}` per the drift note. If real Cursor uses different field names, symptom is "zero turns flow despite chat events firing"; fix is a parser tweak in a follow-up.
