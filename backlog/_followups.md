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

## 2026-05-07 — from merge of 016-read-time-normalizer

- [ ] **Tighten `hostOf` host-suffix matches** in `src/normalize/artifacts.ts:56-63`. Current `host.endsWith('github.com')` would also classify `github.com.evil.com` as `github`. Change to `host === 'github.com' || host.endsWith('.github.com')` (and the same for gitlab/bitbucket). Low practical risk for git remotes today; tighten before any user-controlled URL flows through this. (Normalize artifacts.)

- [ ] **Simplify `ObservedState` discriminated union** in `src/normalize/types.ts:73-75`. Today: `{ snapshot; delta?: never } | { delta; snapshot?: never }` — the `?: never` flavor is awkward to construct from generic code (the git adapter test had to navigate it carefully). Drop to plain `{ snapshot: SnapshotRef } | { delta: DeltaRef }`. Behavior-preserving; cosmetic. (Normalize types.)

- [ ] **Pre-existing chokidar timing flakes** in `tests/capture/extractors/cursor.test.ts` (3 failures intermittent) and `tests/daemon/lifecycle.test.ts` (1 failure intermittent). Reproduces on `main` with no inbound branch — count varies (3-9 failures across runs depending on box load). Either bump per-test timeout on the chokidar suites or switch them from `waitFor(predicate, ms)` to deterministic synchronization via the extractor's `probeFreshness` handle. Already partially flagged in the 014-mcp-search-memories follow-up section above; this run confirms the issue is still live and now blocks the verify step's signal-to-noise on every merge. (Test infra; high priority — flakes will keep noise-pollution merge verifies until fixed.)

## 2026-05-07 — from merge of 018-recent-work-context-tool

- [ ] **Tighten MCP `limit` zod schema** in `src/mcp/tools/recent-work-context.ts:90`. Change `z.number().optional()` → `z.number().int().min(1).max(500).optional()` so a malformed value surfaces as a structured tool-error at the boundary rather than silently being clamped by `clampLimit`. Founder-facing validation is looser than typical MCP tools today. (MCP tool; cosmetic boundary tightening.)

- [ ] **Switch `computeTimeRange` to `Date.parse()`** in `src/trace/index.ts:202`. Uses string comparison on `occurred_at` today — works for Z-suffixed UTC (which storage emits) but breaks ordering for offset-bearing timestamps (e.g. `+02:00` vs equal-moment `Z`). Change before any timezone-bearing extractor lands. (Trace module; dormant correctness.)

- [ ] **Broaden hint regexes during V1.5 dogfooding** in `src/trace/hints.ts:5-6`. `FOLLOWUP_RE` matches three exact phrases ("follow up", "come back to", "will do later"); `TODO_RE` requires `:` or whitespace after `TODO`. Per spec these are intentionally scoped — refine if dogfooding shows them too tight. (Trace module; product tuning.)

- [ ] **Pick a convention for agent-run-log filenames** and document in `backlog/README.md`. Spec acceptance referenced `raw/internal/agent-runs/<spec-date>-<item-id>.md`; agent wrote `<run-date>-<item-id>.md` per the `$(date +%Y-%m-%d)` pattern in the slash command. Trivial, but the divergence will keep recurring on every cross-day item until the convention is locked. (Process meta.)

- [ ] **Track "shared-repo artifact coalesces multi-file work threads" as V1.5 dogfooding signal.** When events from different files in the same repo land within the 4h window, the repo-level artifact alone joins them into one cluster. This is correct per the spec's algorithm (any shared artifact = edge), but whether it matches the founder's intuition for "coherent work thread" boundaries is exactly what `raw/internal/decisions/2026-05-06-v15-trace-layer-design.md` "What V1.5 will teach us" expected the dogfooding loop to surface. If clusters feel too coarse, candidate refinement: weight non-repo artifacts higher, or downgrade repo-only edges to a separate `same_repo` edge kind. (Trace algorithm tuning; dogfooding-driven.)

- [ ] **Pre-existing chokidar lifecycle flake** carry-over from item 014 — still live as of 018's merge verify (3/391 flaky on default pool, 1/391 on `--pool=forks --poolOptions.forks.singleFork=true`). Same `waitFor` 5s timeout signature, different test names per run. Already flagged in the 014 and 016 follow-ups; the duplicate notice here just confirms it remains the noisiest item on the test-infra punch list. (Test infra; high priority — keeps polluting merge verifies.)

---

## 2026-05-05 — surfaced during Claude Desktop disk teardown

- [ ] **Claude Desktop extractor (future phase).** Disk inspection of `/Applications/Claude.app` + `~/Library/Application Support/Claude/` shows the *primary* chat-window conversations live in the embedded claude.ai web app's IndexedDB (`https_claude.ai_0.indexeddb.leveldb/`) — opaque LevelDB blobs, not extractable from disk. The novel value Desktop adds beyond claude.ai-web is **Local Agent Mode + Cowork VM execution**, and that surface *is* fully capturable from host disk via two artifacts:
  - `~/Library/Application Support/Claude/local-agent-mode-sessions/<acct>/<org>/local_<uuid>/audit.jsonl` — append-only event log per local-agent session (direct analog of CC's session JSONL; 1.2 MB sample observed).
  - `~/Library/Application Support/Claude/claude-code-sessions/<acct>/<org>/local_<uuid>.json` — sidecar JSON for CC sessions launched from Desktop; carries `cliSessionId` that maps into `~/.claude/projects/.../<cliSessionId>.jsonl` so the existing CC extractor already catches the actual turns. Sidecar adds Desktop-only context: enabledMcpTools, remoteMcpServersConfig, model, effort, title, cwd.

  Cowork tool execution detail (artifacts, MCP grants, host_call_log, execution_log, etc.) lives in a SQLite DB *inside* the local Linux VM rootfs (drizzle migrations under `/Applications/Claude.app/Contents/Resources/drizzle/sqlite/0000…0012_*.sql` define the schema), not on host disk — out of scope for any disk-watcher extractor. Defer until V1.5+. (Cross-cutting; new extractor.)

## 2026-05-07 — surfaced during 019 merge

- [ ] **Strategist: promote 019 to wiki.** Update `wiki/architecture/work-trace.md` (edges[] is signal-bearing post-019; role taxonomy; `unknown: keep` generalizability default) and `wiki/surfaces/mcp-recent-work-context.md` (input schema with `format`; signal-bearing edges callout; consumer notice that `edges.length === C(N, 2)` is no longer guaranteed). Reference `raw/internal/decisions/2026-05-07-trace-edge-filter-design.md`. ~15 min.
- [ ] **Operating-model reconciliation: wiki-edit policy for builder agents.** The 019 spec listed wiki paths in `files_to_modify` per "After Completion §4" delegation; the runtime hook + `docs/AGENT_INSTRUCTIONS.md:348` denied the edit ("only the strategist edits the wiki, post-shipment"). Pick one: (a) keep strategist-owns-wiki rule; update spec-item template to stop listing wiki paths in `files_to_modify`; OR (b) update `CLAUDE.md` + `AGENT_INSTRUCTIONS.md` + the policy hook to delegate wiki edits to implementation agents for items 016+. Drift event at `raw/internal/decisions/2026-05-07-DRIFT-019-wiki-edit-conflict.md`.
- [ ] **Pre-existing test flake: capture + daemon-lifecycle.** `tests/daemon/lifecycle.test.ts` (`waitFor` predicate timeout) and `tests/capture/extractors/cursor.test.ts` (4 timeouts at 5000ms — `omits metadata.files_referenced when no bubble carried any file references`, `end-to-end: chronological appends produce ordered, non-duplicate turns`, `backfills lastSeenMap from prior storage events on boot`, `stop() resolves cleanly and prevents further events`). Independent of 019 (branch did not touch those test files). Bump `testTimeout` for capture-extractor tests or fix the underlying filesystem-watcher race.
- [ ] **Optional: rename 019 run log.** `raw/internal/agent-runs/2026-05-07-2026-05-07-019-trace-edge-filter-and-format.md` has a doubled date prefix per the agent's run. Prevailing convention in `raw/internal/agent-runs/` is mixed (e.g., `2026-04-30-2026-04-30-001-...md`). Cosmetic; left as-is unless project standardizes the convention.
