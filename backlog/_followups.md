# Backlog Follow-ups

Deferred fixups and follow-up items surfaced during `/merge-and-cleanup`. Founder converts these into proper backlog items in their next strategist conversation.

---

## 2026-04-30 — from merge of 010-cursor-extractor

- Boot-time workspace-inference scan: walk `workspacePrefix` for existing `state.vscdb` files at startup and prime the composer→workspace map, so the first turn after fresh daemon boot can carry `workspace_id`. (Cursor extractor; addresses agent_notes item 4.)
- Coalesce rapid-fire FS events on `globalDbPath` (debounce or dirty-flag) to reduce redundant SQLite opens during a flush burst. (Cursor extractor.)
- Reproducible lag-measurement harness: a privacy-respecting tool the founder can run to count events under `fs:<globalDbPath>` with timestamp deltas, so future lag verification doesn't require re-instrumenting the daemon. (Cross-cutting; touches Cursor + Claude Code extractors.)
- Log warn `unrecognized_bubble_shape` when `parseBubbleRow` returns null in `src/capture/extractors/cursor.ts:53–77` (currently silent). Makes a future Cursor schema change observable in logs rather than manifesting as zero turns flowing. (Cursor extractor.)
- Lag verification (founder-side, ≤2s median over 5 trials) — pending real-Cursor measurement post-merge. (Cursor extractor.)
- Bubble JSON shape resilience: parser assumes `{role, text, createdAt}` per the drift note. If real Cursor uses different field names, symptom is "zero turns flow despite chat events firing"; fix is a parser tweak. Combine with `unrecognized_bubble_shape` warn above. (Cursor extractor.)

---

## 2026-04-30 — from merge of 011-claude-code-extractor

- `log.warn("parse_failed", ...)` in `parseLine`'s JSON catch (`src/capture/extractors/claude-code.ts:64`) for diagnosability. Currently silent on parse failures; makes JSONL shape regressions observable. (Claude Code extractor.)
- Bump e2e ordering test `waitFor` budget 5000→10000ms to deflake under full-suite chokidar contention (test-only follow-up). (Claude Code extractor.)
- Lag verification (founder-side, ≤500ms median over 5 trials) — pending real-Claude-Code measurement post-merge. (Claude Code extractor.)
- JSONL shape regression observability — once `parse_failed` warn lands above, this becomes observable rather than silent zero-turn behavior. (Claude Code extractor; subsumed by item 1 above.)

---

## 2026-05-01 — from merge of 014-mcp-search-memories

- Wire `limit: MAX_OVERFETCH` into `storage.query` once storage guarantees timestamp-DESC ordering. Today `searchMemories` loads the entire matching set into memory before sorting/slicing — fine for V1 dataset sizes, becomes O(N) memory at scale. (MCP search-memories tool; cross-cuts Storage interface.)
- Add `order` / `order_by` to `QueryFilter` once a second consumer needs DESC. Until then the in-tool sort is fine. Worth a Spec Authoring Lesson once the second use case appears. (Storage interface.)
- **Investigate chokidar lifecycle flake** — `cursor.test.ts`, `claude-code.test.ts`, `fs-watcher.test.ts` intermittently time out at 5000ms. Different tests fail each run (race, not deterministic regression). Surfaced by ~10% additional CPU pressure from 014's 20 new tests. Stop-gap: bump global `testTimeout` to 15s in `vitest.config.ts`. Real fix: investigate `watcher.close()` race in chokidar teardown. Workaround `--pool=forks --poolOptions.forks.singleFork=true` masks rather than fixes. (Test-infra item; high priority since the flake will block future merges.)

## From merge of 2026-04-30-015-mcp-integration-test (2026-05-01)

- [ ] Authorize `tests/tools/mcp-integration-smoke.test.ts` via a small backlog item — ~30 LOC Vitest test that spawns daemon (`ECHO_STORAGE=memory` + random port) and execs the smoke script, asserts RC=0. Resolves deferred acceptance #3.
- [ ] Founder writes the week's MCP-demo milestone entry into `docs/STATUS.md`. Operating manual reserves STATUS.md for founder; agent (correctly) refused to touch it during 015.
- [ ] Strategist amends item-spec template: phrase STATUS.md updates as founder-post-merge, not as agent acceptance. Otherwise this conflict recurs every "milestone" item.
- [ ] Polish `tools/mcp-integration-smoke.sh:47-55`: add `-f` to the reachability `curl` so HTTP 4xx/5xx surfaces with a clearer error than the current degraded downstream message.
- [ ] Land the chokidar lifecycle stability work currently in founder WIP (fs-watcher `ignored` rules + cursor-extractor debounce + corresponding test updates). Pre-existing race causing 4-6 test flakes under parallel load; observed across 014, 015 reviews and the 015 merge verify step.
