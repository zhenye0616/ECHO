# Backlog Follow-ups

Deferred fixups and follow-up items surfaced during `/merge-and-cleanup`. Founder converts these into proper backlog items in their next strategist conversation.

---

## 2026-04-30 — from merge of 010-cursor-extractor

- Boot-time workspace-inference scan: walk `workspacePrefix` for existing `state.vscdb` files at startup and prime the composer→workspace map, so the first turn after fresh daemon boot can carry `workspace_id`. (Cursor extractor; addresses agent_notes item 4.)
- Reproducible lag-measurement harness: a privacy-respecting tool the founder can run to count events under `fs:<globalDbPath>` with timestamp deltas, so future lag verification doesn't require re-instrumenting the daemon. (Cross-cutting; touches Cursor + Claude Code extractors.)
- Lag verification (founder-side, ≤2s median over 5 trials) — pending real-Cursor measurement post-merge. (Cursor extractor.)

> **Resolved (delivered after merge):**
> - ~~Coalesce rapid-fire FS events on `globalDbPath`~~ — landed in chore commit `912ebab` (300ms debounce on `state.vscdb` triplet).
> - ~~`unrecognized_bubble_shape` warn when `parseBubbleRow` returns null~~ — landed in fix commit `95b7b12`.
> - ~~Bubble JSON shape resilience (parser assumed `{role, text, createdAt}`)~~ — landed in fix commit `95b7b12`. Cursor's real shape is `{type:1|2, text, bubbleId}` with composer-derived ordering.

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
- **Investigate chokidar lifecycle flake** — `cursor.test.ts`, `claude-code.test.ts`, `fs-watcher.test.ts` intermittently time out at 5000ms under parallel load. Different tests fail each run (race, not deterministic regression). Surface area was reduced in chore commit `912ebab` (fs-watcher now ignores Cursor's SQLite triplet; cursor-extractor debounces) but the deeper `watcher.close()` race in chokidar teardown remains. Workaround: `--pool=forks --poolOptions.forks.singleFork=true` masks rather than fixes. (Test-infra item; high priority since the flake will block future merges.)

## From merge of 2026-04-30-015-mcp-integration-test (2026-05-01)

- [ ] Authorize `tests/tools/mcp-integration-smoke.test.ts` via a small backlog item — ~30 LOC Vitest test that spawns daemon (`ECHO_STORAGE=memory` + random port) and execs the smoke script, asserts RC=0. Resolves deferred acceptance #3.
- [ ] Founder writes the week's MCP-demo milestone entry into `docs/STATUS.md`. Operating manual reserves STATUS.md for founder; agent (correctly) refused to touch it during 015.
- [ ] Strategist amends item-spec template: phrase STATUS.md updates as founder-post-merge, not as agent acceptance. Otherwise this conflict recurs every "milestone" item.
- [ ] Polish `tools/mcp-integration-smoke.sh:47-55`: add `-f` to the reachability `curl` so HTTP 4xx/5xx surfaces with a clearer error than the current degraded downstream message.

---

## 2026-05-02 — surfaced while writing `wiki/capture/per-app/claude-code-collected-data.md`

- [ ] **Investigate subagent-JSONL extraction gap.** Live `echo.db` shows 0 parsed turns from 69 distinct `<session>/subagents/agent-<id>.jsonl` files, despite 1,587 raw FS-watcher events on the same files. Hand-probe of a real subagent JSONL (`agent-a2809ba1d7e1d66c0.jsonl` under the wave-3 review session) confirms 23 user + 42 assistant lines with valid `message.role` + `message.content` (string-or-array, with text-bearing assistant blocks). The claude-code extractor's path filter (`src/capture/extractors/claude-code.ts:229-231`: `path.startsWith(projectsPrefix) && path.endsWith('.jsonl')`) matches subagent paths, so the gap is empirical not architectural.
  - **Likely cause:** chokidar lifecycle / `addDir` interaction — subagent directories are created mid-session, so the file `add` event may fire before the recursive watch attaches to the new subdirectory. The extractor then never sees subsequent `change` events on the file.
  - **Verification step:** add `log.info('handleJsonlChange_called', { path })` at `src/capture/extractors/claude-code.ts:233` and run a Claude Code session that spawns a subagent. If the log fires for subagent paths but the subsequent `extractClaudeCodeTurns` returns 0 turns, the bug is in the parser. If it never fires for subagent paths, the bug is in chokidar wiring.
  - **Impact:** subagent runs (Explore agents, code-reviewer agents, etc.) carry significant retrieval value — they're often the highest-quality summarized context in a session. Capturing zero of them is a meaningful gap, not just cosmetic.
  - (Claude Code extractor.)

- [ ] **Fix Codex extractor `cwd` decay across incremental passes.** Live `echo.db` shows 2 of 4 captured Codex turns missing `metadata.cwd` — including a turn from session `019dea27-…` at 19:40:35Z, where the *earlier* turn from the *same session* at 19:31:34Z did capture cwd. Same JSONL, same session_id, second turn drops the field.
  - **Root cause (verified in source):** `extractCodexTurns` declares `let cwd: string | undefined` at `src/capture/extractors/codex.ts:165` and only sets it when a `session_meta` line is parsed (`codex.ts:199-200`). `session_meta` is the first line of the JSONL. The offset map persists `{offset, turn_index}` across calls but **not `cwd`** — so on the second call, `lastByteOffset` is already past the `session_meta` line, the local `cwd` stays `undefined`, and every emitted turn from that pass forward goes out without `metadata.cwd`. Fresh daemon boots that backfill from storage suffer the same flaw because `backfillOffsetMap` (`codex.ts:255-275`) doesn't restore cwd either.
  - **Symptom shape:** turn 0 of every session has `cwd`; turn 1+ is missing it whenever extraction spans a daemon-tick boundary or daemon restart. Long sessions silently degrade in metadata quality.
  - **Fix sketch:** extend the offset-map entry from `{offset, turn_index}` to `{offset, turn_index, cwd?}`; persist cwd back into the map at the end of `handleJsonlChange` (`codex.ts:299-327`); restore cwd in `backfillOffsetMap` by reading it from the most-recent emitted turn's metadata. Alternative: always re-read the file from offset 0 on each pass to re-encounter `session_meta` (wasteful — Codex JSONLs grow large).
  - **Test it:** unit test that calls `extractCodexTurns(path, 0)` then `extractCodexTurns(path, returnedOffset)` after appending more turns, asserts every turn's `cwd` is set. Today the second call's turns will have `cwd: undefined`.
  - (Codex extractor.)
