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

> **Resolved (delivered on branch `extractors-causal-metadata`):**
> - ~~Subagent-JSONL extraction gap~~ — root cause was *not* the chokidar `addDir` lifecycle hypothesized here. A unit test reproducing mid-session subdir creation passes. Real cause: `chokidar.watch(..., { ignoreInitial: true })` plus an offset-map seeded only from prior storage events meant any JSONL existing at daemon-start time AND never modified afterward was silently never processed — exactly the lifecycle of subagent files (write-then-closed by transient runs). Fixed by adding a boot-time recursive scan of `projectsPrefix` that schedules one `handleJsonlChange` per existing `.jsonl`. Offset-map prevents duplicate emission of bytes already in storage. Test: pre-create a subagent JSONL under `<project>/<session>/subagents/agent-*.jsonl`, start extractor, assert turn lands without further file modifications.
> - ~~Codex `cwd` decay across incremental passes~~ — fixed in commit `f7dc2a1` (offset-map entry extended to `{offset, turn_index, cwd?}`; `backfillOffsetMap` restores cwd from prior events; `extractCodexTurns` accepts `lastKnownCwd`).

## 2026-05-04 — surfaced during metadata-normalization branch

- [ ] **Cursor `repo_root` via workspace.json read.** The cursor extractor populates `metadata.workspace_id` (the opaque hash from `workspaceStorage/<hash>/`) but not the canonical cross-source `metadata.repo_root` field. Resolving hash → real folder path requires reading `workspaceStorage/<hash>/workspace.json`'s `folder` URI and decoding the `file://` scheme. Skipped from the metadata-normalization branch because (a) it adds new file I/O on a dirpath we don't currently read, (b) the fallback chain (workspace.json missing → URI not file:// → folder is multi-root) needs its own design pass. Without this, an LLM correlating a Cursor turn against a git commit on the same repo has to fall back to fuzzy content matching instead of exact `repo_root` join. (Cursor extractor.)

- [ ] **Codex `files_referenced` from `apply_patch` payloads.** A survey of real Codex JSONLs shows uniformly shell-driven tools (`exec_command`, `shell`, `shell_command` with `cmd`/`command` string args) and `apply_patch` payloads where `arguments` arrives as an *empty string* in the JSONL — the patch content is delivered out-of-band. There is no reliable structured source of file paths in Codex JSONL the way Claude Code's `tool_use.input` exposes them. Three options when revisiting: (1) regex shell-command parsing (brittle — `cd`, `cat`, redirects), (2) tap the out-of-band patch stream that `apply_patch` actually consumes, (3) accept Codex's gap and rely on git-side `files_referenced` to fill the picture for any file actually written. Most likely (3). (Codex extractor.)

## 2026-05-05 — surfaced during Claude Desktop disk teardown

- [ ] **Claude Desktop extractor (future phase).** Disk inspection of `/Applications/Claude.app` + `~/Library/Application Support/Claude/` shows the *primary* chat-window conversations live in the embedded claude.ai web app's IndexedDB (`https_claude.ai_0.indexeddb.leveldb/`) — opaque LevelDB blobs, not extractable from disk. The novel value Desktop adds beyond claude.ai-web is **Local Agent Mode + Cowork VM execution**, and that surface *is* fully capturable from host disk via two artifacts:
  - `~/Library/Application Support/Claude/local-agent-mode-sessions/<acct>/<org>/local_<uuid>/audit.jsonl` — append-only event log per local-agent session (direct analog of CC's session JSONL; 1.2 MB sample observed).
  - `~/Library/Application Support/Claude/claude-code-sessions/<acct>/<org>/local_<uuid>.json` — sidecar JSON for CC sessions launched from Desktop; carries `cliSessionId` that maps into `~/.claude/projects/.../<cliSessionId>.jsonl` so the existing CC extractor already catches the actual turns. Sidecar adds Desktop-only context: enabledMcpTools, remoteMcpServersConfig, model, effort, title, cwd.

  Cowork tool execution detail (artifacts, MCP grants, host_call_log, execution_log, etc.) lives in a SQLite DB *inside* the local Linux VM rootfs (drizzle migrations under `/Applications/Claude.app/Contents/Resources/drizzle/sqlite/0000…0012_*.sql` define the schema), not on host disk — out of scope for any disk-watcher extractor. Defer until V1.5+. (Cross-cutting; new extractor.)
