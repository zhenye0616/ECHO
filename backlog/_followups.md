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

  > Resolved 2026-05-08 (direct fix in this session): catch now emits `log.warn('parse_failed', { preview, message })` with the first 120 chars of the bad line and the parse-error message. JSONL shape regressions are now observable in daemon stdout.
- Bump e2e ordering test `waitFor` budget 5000→10000ms to deflake under full-suite chokidar contention (test-only follow-up). (Claude Code extractor.)
- Lag verification (founder-side, ≤500ms median over 5 trials) — pending real-Claude-Code measurement post-merge. (Claude Code extractor.)
- JSONL shape regression observability — once `parse_failed` warn lands above, this becomes observable rather than silent zero-turn behavior. (Claude Code extractor; subsumed by item 1 above.)

---

## 2026-05-01 — from merge of 014-mcp-search-memories

- Wire `limit: MAX_OVERFETCH` into `storage.query` once storage guarantees timestamp-DESC ordering. Today `searchMemories` loads the entire matching set into memory before sorting/slicing — fine for V1 dataset sizes, becomes O(N) memory at scale. (MCP search-memories tool; cross-cuts Storage interface.)

  > Re-verified 2026-05-08 post-025: `MAX_OVERFETCH = 200` is still exported at `src/mcp/tools/search-memories.ts:11` and still NOT wired into the production storage call after 025's path-aware `limit+1` overfetch refactor. The constant is now genuinely dead code — subsumed by the 025 follow-up bullet ("`MAX_OVERFETCH = 200` dead constant") which proposes the same fix shape (wire it as a defensive cap on the substring path, or delete). Track from there; don't double-count.

- Add `order` / `order_by` to `QueryFilter` once a second consumer needs DESC. Until then the in-tool sort is fine. Worth a Spec Authoring Lesson once the second use case appears. (Storage interface.)

  > Resolved (delivered after merge by 2026-05-08-021) — `QueryFilter.order?: 'asc' | 'desc'` now lives at `src/storage/interface.ts:18-22` with `'desc'` default. The 021 spec needed asc-ordered storage for cross-gap reconstruction, which was the second consumer the followup anticipated.
- **Investigate chokidar lifecycle flake** — `cursor.test.ts`, `claude-code.test.ts`, `fs-watcher.test.ts` intermittently time out at 5000ms under parallel load. Different tests fail each run (race, not deterministic regression). Surface area was reduced in chore commit `912ebab` (fs-watcher now ignores Cursor's SQLite triplet; cursor-extractor debounces) but the deeper `watcher.close()` race in chokidar teardown remains. Workaround: `--pool=forks --poolOptions.forks.singleFork=true` masks rather than fixes. (Test-infra item; high priority since the flake will block future merges.)

> Resolved (delivered after merge by 2026-05-08-023) for the `cursor.test.ts` portion only — the `describe('startCursorExtractor (lifecycle + integration)')` block is `describe.skip`-quarantined with a tracking comment. The `claude-code.test.ts` and `fs-watcher.test.ts` portions remain open per 023's Out-of-Scope.
> Resolved (delivered after merge by 2026-05-08-024) for the `fs-watcher.test.ts` portion — the `describe('startFsWatcher')` block is `describe.skip`-quarantined with a tracking comment. The `claude-code.test.ts` portion remains open.

## From merge of 2026-04-30-015-mcp-integration-test (2026-05-01)

- [ ] Authorize `tests/tools/mcp-integration-smoke.test.ts` via a small backlog item — ~30 LOC Vitest test that spawns daemon (`ECHO_STORAGE=memory` + random port) and execs the smoke script, asserts RC=0. Resolves deferred acceptance #3.
- [ ] Founder writes the week's MCP-demo milestone entry into `docs/STATUS.md`. Operating manual reserves STATUS.md for founder; agent (correctly) refused to touch it during 015.
- [ ] Strategist amends item-spec template: phrase STATUS.md updates as founder-post-merge, not as agent acceptance. Otherwise this conflict recurs every "milestone" item.
- [x] Polish `tools/mcp-integration-smoke.sh:47-55`: add `-f` to the reachability `curl` so HTTP 4xx/5xx surfaces with a clearer error than the current degraded downstream message.

  > Resolved 2026-05-08 (direct fix in this session): line 49 is now `curl -fsS --connect-timeout 2 ...` — HTTP 4xx/5xx now exits non-zero and the script's `cannot reach` log fires immediately.

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

  > Re-verified 2026-05-08 post-025: still open. `src/normalize/artifacts.ts:58-62` unchanged.

- [ ] **Simplify `ObservedState` discriminated union** in `src/normalize/types.ts:73-75`. Today: `{ snapshot; delta?: never } | { delta; snapshot?: never }` — the `?: never` flavor is awkward to construct from generic code (the git adapter test had to navigate it carefully). Drop to plain `{ snapshot: SnapshotRef } | { delta: DeltaRef }`. Behavior-preserving; cosmetic. (Normalize types.)

  > Re-verified 2026-05-08 post-025: still open. `src/normalize/types.ts:73-75` unchanged.

- [ ] **Pre-existing chokidar timing flakes** in `tests/capture/extractors/cursor.test.ts` (3 failures intermittent) and `tests/daemon/lifecycle.test.ts` (1 failure intermittent). Reproduces on `main` with no inbound branch — count varies (3-9 failures across runs depending on box load). Either bump per-test timeout on the chokidar suites or switch them from `waitFor(predicate, ms)` to deterministic synchronization via the extractor's `probeFreshness` handle. Already partially flagged in the 014-mcp-search-memories follow-up section above; this run confirms the issue is still live and now blocks the verify step's signal-to-noise on every merge. (Test infra; high priority — flakes will keep noise-pollution merge verifies until fixed.)

> Resolved (delivered after merge by 2026-05-08-023) — `describe.skip` quarantine on the `cursor.test.ts` `startCursorExtractor (lifecycle + integration)` block and on the `lifecycle.test.ts` `daemon lifecycle` block; tracking comments point at item 023; test bodies intact.

## 2026-05-07 — from merge of 018-recent-work-context-tool

- [ ] **Tighten MCP `limit` zod schema** in `src/mcp/tools/recent-work-context.ts:90`. Change `z.number().optional()` → `z.number().int().min(1).max(500).optional()` so a malformed value surfaces as a structured tool-error at the boundary rather than silently being clamped by `clampLimit`. Founder-facing validation is looser than typical MCP tools today. (MCP tool; cosmetic boundary tightening.)

  > Re-verified 2026-05-08 post-025: still open. `src/mcp/tools/recent-work-context.ts:254` is still `limit: z.number().optional()`. Note: 025 made an explicit choice for `search_memories.ts` to add `.int().min(1)` (no max) and let the handler clamp >MAX_LIMIT, so the precedent is set for this tool too.

- [ ] **Switch `computeTimeRange` to `Date.parse()`** in `src/trace/index.ts:202`. Uses string comparison on `occurred_at` today — works for Z-suffixed UTC (which storage emits) but breaks ordering for offset-bearing timestamps (e.g. `+02:00` vs equal-moment `Z`). Change before any timezone-bearing extractor lands. (Trace module; dormant correctness.)

  > Re-verified 2026-05-08 post-025: `computeTimeRange` at `src/trace/index.ts:274-285` still uses string comparison on `a.time.occurred_at`. **Status downgraded from "dormant correctness" to "structurally unreachable"** — item 022 closed Bug A by canonicalizing all stored timestamps to Z-suffixed UTC at storage append-time, so any offset-bearing input is converted before it can reach the trace layer. The lex-sort ≡ chronological invariant now holds by construction. Code unchanged but bug is no longer a live exposure. Defer until something actually wants to bypass the storage normalizer.

- [ ] **Broaden hint regexes during V1.5 dogfooding** in `src/trace/hints.ts:5-6`. `FOLLOWUP_RE` matches three exact phrases ("follow up", "come back to", "will do later"); `TODO_RE` requires `:` or whitespace after `TODO`. Per spec these are intentionally scoped — refine if dogfooding shows them too tight. (Trace module; product tuning.)

  > Re-verified 2026-05-08 post-025: regexes unchanged (`hints.ts:4-5`). No dogfooding signal yet that they're too tight; defer per spec.

- [ ] **Pick a convention for agent-run-log filenames** and document in `backlog/README.md`. Spec acceptance referenced `raw/internal/agent-runs/<spec-date>-<item-id>.md`; agent wrote `<run-date>-<item-id>.md` per the `$(date +%Y-%m-%d)` pattern in the slash command. Trivial, but the divergence will keep recurring on every cross-day item until the convention is locked. (Process meta.)

- [ ] **Track "shared-repo artifact coalesces multi-file work threads" as V1.5 dogfooding signal.** When events from different files in the same repo land within the 4h window, the repo-level artifact alone joins them into one cluster. This is correct per the spec's algorithm (any shared artifact = edge), but whether it matches the founder's intuition for "coherent work thread" boundaries is exactly what `raw/internal/decisions/2026-05-06-v15-trace-layer-design.md` "What V1.5 will teach us" expected the dogfooding loop to surface. If clusters feel too coarse, candidate refinement: weight non-repo artifacts higher, or downgrade repo-only edges to a separate `same_repo` edge kind. (Trace algorithm tuning; dogfooding-driven.)

- [ ] **Pre-existing chokidar lifecycle flake** carry-over from item 014 — still live as of 018's merge verify (3/391 flaky on default pool, 1/391 on `--pool=forks --poolOptions.forks.singleFork=true`). Same `waitFor` 5s timeout signature, different test names per run. Already flagged in the 014 and 016 follow-ups; the duplicate notice here just confirms it remains the noisiest item on the test-infra punch list. (Test infra; high priority — keeps polluting merge verifies.)

> Resolved (delivered after merge by 2026-05-08-023) for the `cursor.test.ts` + `daemon/lifecycle.test.ts` subset — both flaky `describe()` blocks are `describe.skip`-quarantined with tracking comments. The `claude-code.test.ts` and `fs-watcher.test.ts` carry-overs from 014 remain open.

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

> Resolved (delivered after merge by 2026-05-08-023) — both `describe()` blocks `describe.skip`-quarantined with tracking comments pointing at item 023; verification confirmed three consecutive clean `npm test` runs.
- [ ] **Optional: rename 019 run log.** `raw/internal/agent-runs/2026-05-07-2026-05-07-019-trace-edge-filter-and-format.md` has a doubled date prefix per the agent's run. Prevailing convention in `raw/internal/agent-runs/` is mixed (e.g., `2026-04-30-2026-04-30-001-...md`). Cosmetic; left as-is unless project standardizes the convention.

---

## 2026-05-07 — from merge of 020-open-loop-resolution-heuristics

- **Tighten R1.TODO type cast** at `src/trace/hints.ts:150`. Replace `(state as { delta?: { artifact_id: string } }).delta` with the discriminated-union narrowing `if ('delta' in state)`. Cosmetic; functionally equivalent.

  > Re-verified 2026-05-08 post-025: still open. `src/trace/hints.ts:150` unchanged. Note: companion item 016 followup ("Simplify `ObservedState`") would unblock the cleaner narrowing — best to bundle the two when either is touched.
- **Add explicit "earliest" tests** for R1.AQ and R1.TODO to mirror the existing R1.Q earliest test (currently inferred from shared loop structure).
- **One-line UTC-Z invariant comment** in `src/trace/index.ts:202-211` documenting that `compareByOccurredAt` lex-sort ≡ chronological order only under the normalizer's UTC-Z guarantee. Prevents a future change from breaking the assumption silently.
- **Strategist post-merge spec amendment:** spec line 42 prose says "matching by `context.conversation` artifact id" but the actual `NormalizedContextEvent.context` schema has only `visible/selected/ambient` strings. Agent correctly inferred conversation-typed `ArtifactRef` matching by `provider:type:id`. Update spec wording for future readers.
- **R1.TODO snapshot-resolver expansion (decision pending dogfooding):** R1.TODO matches only `state.delta.artifact_id`. Git-commit atoms use `state.snapshot.artifact_id` and won't close TODOs in the current rule. Per spec ("`state.delta.artifact_id`") this is faithful; revisit after dogfooding evidence.
- **R1.AQ user-with-empty-input edge case (validate during dogfooding):** `hasNonEmptyContent` falls back from `input` to `output` for user-role atoms. For sources where the user atom legitimately has empty `input` but non-empty `output` (rare; some cursor extractor cases), this still resolves. Verify in the founder hand-score pass.
- **Quarantine the pre-existing capture/daemon flake** as a separate item: 3 failures intermittent in `tests/capture/extractors/cursor.test.ts` (workspace_id matching, lastSeenMap backfill, stop() timeout) + 1 in `tests/daemon/lifecycle.test.ts` (waitFor timeout). Already flagged from item 019's verification; re-confirmed at 020's merge. Flake fluctuates 3–14 failures across runs.

  > Resolved (delivered after merge by 2026-05-08-023) — flake cluster `describe.skip`-quarantined in both files with tracking comments pointing at item 023.
- **Founder hand-scores the 111 rows** in `raw/internal/dogfooding/020-resolution-validation.md` as TP / FP / TN / FN. If overall precision (TP / (TP + FP)) ≥ 80%, R1 is sufficient for V1 hotkey overlay. Otherwise calibration becomes the next backlog item before the overlay UI is specced.


---

## 2026-05-08 — from merge of 021-trace-cross-gap-where-left-off

- **Quarantine the recurring fs-watcher / cursor / daemon-lifecycle flake.** Same files since item 018 (`tests/capture/extractors/cursor.test.ts`, `tests/daemon/lifecycle.test.ts`); failure count fluctuates 3–14 across runs. Fixture races on FSEvents under load. File its own backlog item — bump test timeout, fix the underlying race, or quarantine via `.skip` with a tracking comment.

  > Resolved (delivered after merge by 2026-05-08-023) for the `cursor.test.ts` + `daemon/lifecycle.test.ts` subset — both flaky `describe()` blocks `describe.skip`-quarantined. NOTE: 023's verification surfaced the same chokidar close-race intermittently flaking `tests/capture/surfaces/fs-watcher.test.ts` (~33% of full-suite runs); per 023's Out-of-Scope, that file was NOT quarantined and needs a follow-up item.
- **Spec template improvement: explicit "test fallout permitted in:" convention.** 021 hit this on `tests/capture/*` (six test files needed `order: 'asc'` after Bug A's DESC flip). Both items 020 and 021 had small test-only diffs outside `files_to_modify` that needed agent-notes call-outs. Convention would be: spec author lists test files where collateral edits are expected, removing the agent-side ambiguity.
- **`search_memories` KNN determinism investigation.** Flagged as out-of-scope inside 021's spec body but is an independent reliability issue the dogfooding journal also surfaced (same query returning different match counts on consecutive calls; e.g., "hotkey overlay" returned 1 match earlier today and 0 matches later in the same session). File its own item if it persists across V1.5+ retrieval work.
- **Strategist wiki promotion (post-021):** update `wiki/architecture/work-trace.md` with the storage `order: 'asc'|'desc'` semantic + the `window_hours` inference rule (≤4h → span; >4h → min(span, 24)); update `wiki/surfaces/mcp-recent-work-context.md` with the new input parameter, the TZ-marker recommendation, and the `response.warnings` semantic. Bundles with the still-pending 019 and 020 wiki promotions.
- **Independent C: TZ guardrail false-negative.** Current `hasTzMarker` is `/Z$|[+-]\d{2}:\d{2}$/`. ISO 8601 also permits forms like `+0700` (no colon) and the bare `+07` hour-only offset; the regex misses these. Low-priority — most consumers use Z or `+HH:MM` — but worth tightening if dogfooding ever surfaces a missed warning.

---

## 2026-05-08 — from merge of 022-v15-2-trace-retrieval-reliability

### Per-merge cleanup (small, mechanical)

- [x] **Resolve item 023 backlog-state collision.** 022's claim commit `a3d1fe2` swept in a pre-staged `git mv` of item 023, and follow-up `578b5c5` wrote 022's persona into 023's frontmatter. The 022 agent did not work 023's code. 023 is independently under review on `agent/chokidar-flake-quarantine`. Founder action: either let parallel work continue or revert 023's frontmatter. (Backlog-state, not code.)

  > Resolved 2026-05-08: item 023 landed in `backlog/complete/` with status `complete` and its own merge reconciliation; 022 and 023 both shipped successfully without further conflict. Collision is moot.

- [ ] **Add explanatory comment at `src/storage/migrate.ts:71`** documenting the `TZ_MARKER_RE` else-branch (defensive for naive rows that bypass the SQL `WHERE timestamp NOT LIKE '%Z'` filter). Logic is correct but non-obvious.

  > Re-verified 2026-05-08 post-025: 🟡 partial — `canonicalizeTimestamps` at `src/storage/migrate.ts:55-60` now carries a 6-line function-level comment explaining the Node-not-SQL choice and the idempotency guarantee, but the inline `TZ_MARKER_RE.test(...) ? ... : ... + 'Z'` ternary at line 71 still has no per-line note explaining why the defense is needed when the WHERE clause already filters. One small inline comment short of done.

- [ ] **Lift cap-hit equality to `>=` storageCap** at `src/mcp/tools/recent-work-context.ts:170` once a `count(filter)` storage method exists. V1.5.3 territory; spec already flagged in Out of Scope.

  > Re-verified 2026-05-08 post-025: still open. `src/mcp/tools/recent-work-context.ts:191` reads `if (events.length === storageCap)`. Strict equality preserved.

- [x] **`backlog/pending_review/2026-05-08-023-chokidar-flake-quarantine.review.md` got tracked** by `git add -A` in the 022 post-merge commit. Sidecars are typically untracked; will be `git rm`'d when `/merge-and-cleanup 023` runs. Cosmetic; flagging for awareness.

  > Resolved 2026-05-08: `pending_review/` is empty post-023 merge; sidecar removed as part of the cleanup pass.

### Strategist post-merge

- [ ] **Wiki promotion bundle 019+020+021+022.** Four items' worth of `wiki/architecture/work-trace.md` and `wiki/surfaces/mcp-recent-work-context.md` updates land together. New `wiki/architecture/` page on **timestamp canonicalization at capture** is wiki-worthy (single-chokepoint normalization decision is durable substrate doctrine).
- [ ] **Re-run dogfooding scenarios post-022 + daemon-restart.** Specifically the 01:03 PDT and 01:33 PDT entries from `raw/internal/dogfooding/mcp-interactions-journal.md` — expect `source_breakdown` to include git ≥1 and codex ≥1 on the same window that previously returned `{claude_code: N}` only. If still missing, 022 didn't fully close the cross-source promise and a follow-up item is needed.
- [ ] **Verify migration row-count log surfaces 152 expected rows** on first daemon-boot post-merge against the founder's local DB. The fixup logs `{converted}` via `createLogger('storage.sqlite')`. Daemon was kickstarted at this merge (PID 7319); the log line should appear in daemon stdout if any `-07:00` rows existed.

### Dogfooding-journal surfaced gaps (status verified by Codex 02:05 PDT + Claude Code 02:10 PDT post-022/023)

> **Source:** `raw/internal/dogfooding/mcp-interactions-journal.md` (16 entries through 2026-05-08 02:10 PDT, 4+ AI clients).
> **Verification convergence:** Codex's 02:05 PDT direct daemon+log inspection and Claude Code's 02:10 PDT MCP retrieval landed on the same gap classification on the same window — two reasoning processes from different starting points (one inspecting daemon stdout + SQLite directly; one calling the public MCP surface) converging is structural-correctness signal, similar to the 15:39 PDT day-1 V1-atom-design observation.
> **Status legend:** ✅ closed by 022/023 · 🟡 partial / narrowed (capture fixed; UX or ranking gap remains) · ❌ still open · 🚨 newly surfaced during verification.

- [x] ✅ **Source-prefix retrieval reliability — `git:` portion CLOSED by 022.** Three pre-022 failures (Codex 16:22, Claude 22:40, round 4 T4 at 00:30) all involved different prefix-guessing patterns. Codex 02:05 verified `search_memories(source_prefix="git:")` now returns 5 git commit rows. Bug A's lex-compare fix removed the silent timestamp-drop that was masking the underlying retrieval. The broader opacity (`claude_code` / `cc` guessing) is description-level, not retrieval-level — covered by the existing description fix at `13ec010`. (Source: dogfooding entries 16:22 PDT, 22:40 PDT, 00:30 PDT, 00:46 PDT, 02:05 PDT.)

- [x] ✅ **`search_memories` KNN non-determinism — STALE FRAMING.** Codex 02:05: *"`search_memories` is literal substring now; `hotkey overlay` returned identical top 5 results twice."* The 22:50 PDT observation predated the description fix that clarified substring-not-semantic semantics; with substring search, determinism is structural. The original framing assumed embedding/KNN scoring; the actual behavior is and was substring matching. (Source: dogfooding entries 22:50 PDT, 02:05 PDT.)

- [x] 🟡 **Cross-source representation — CAPTURE FIXED, RANKING GAP REMAINS.** Codex 02:05 + Claude Code 02:10 both verified: at `limit=100` the day window now returns 2 clusters `{claude_code: 27, git: 23}` + `{codex: 10}`. At `limit=50` Codex appears as a separate lower-rank cluster that gets dropped (warning fires correctly). Trace ranking surfaces Codex as cluster-2 because no shared artifact joins Codex turns to the dominant Project_echo cluster, AND because `has_open_loop` + `dense` boost cluster-1's rank. **The remaining work is a separate item:** trace ranking heuristic / cross-source artifact join, NOT capture or storage. Candidates: weight non-repo shared-artifacts higher, give a small rank boost when a cluster is the only representative of a source, or surface lower-rank clusters in `truncation.dropped_clusters` with their `source_breakdown`. (Source: dogfooding entries 00:30 PDT round 4 T1, 01:33 PDT, 01:39 PDT, 02:05 PDT, 02:10 PDT.)

- [ ] ❌ **Default 4h window wrong for "where did I leave off" — UNCHANGED.** Codex 02:05: *"Still open by code. Default no-arg window is still now minus 4h."* 022 didn't touch this. Founder/strategist call: change the default, or document the "active-now vs morning-orientation" framing more loudly in the tool description. (Source: dogfooding entry 22:40 PDT.)

- [x] 🟡 **Long-window cluster loss — WARNING NOW FIRES.** Codex 02:05: *"Mostly fixed. Warnings now fire, e.g. `limit dropped 3 entire cluster(s)`."* The warning surfaces; the consumer can detect and react. The deeper question — should truncation be by clusters instead of atoms? — is now an UX choice, not a silent-failure correctness bug. Move to the trace-ranking item above. (Source: dogfooding entry 16:33 PDT, 02:05 PDT.)

- [ ] ❌ **Atom envelope payload floor — UNCHANGED, NOW HIGHEST-LEVERAGE PAYLOAD MOVE.** Codex 02:05: *"Still open. Minimal responses are still large: about 242KB for day `limit=100`, 405KB for round-4 `limit=100`."* Claude Code 02:10 retrieved 105K (trace, limit 50) + 98K (search, limit 10) — both over CC's tool-result budget with `format: "minimal"` already on. Bug C reduced atom *count* but didn't shrink the per-atom envelope (~3-4KB of structural metadata). **Skeleton-only mode is now the candidate spec** — return `id`+`time`+`source`+`artifacts` + `cluster_anchor_summary`; consumer fetches full atom content via `search_memories(id=...)` on demand. Highest-leverage payload move post-022. (Source: dogfooding entry 16:16 PDT round 2, 02:05 PDT, 02:10 PDT.)

- [x] 🟡 **Daemon-restart-after-merge — STEP IN PLACE BUT FLAPPING.** The `/merge-and-cleanup` C9b kickstart step ran successfully twice this morning (post-022 PID 7319, post-023 PID 13903). However, Codex 02:05 surfaced a new failure mode underneath: *"Launchd thinks the daemon is running, but the PID file disagrees (`7319` vs `7333`) and the MCP port is unreachable."* — see the new "MCP connector + daemon health" item below. The kickstart-on-merge mechanism is in place; what's now visible is a separate health/transport reliability gap. (Source: dogfooding entry 16:15 PDT, 02:05 PDT.)

- [ ] ❌ **Founder hand-score pass on 020 R1 fixture** at `raw/internal/dogfooding/020-resolution-validation.md`. Unchanged — verdict column still empty across all 111 rows. Half-day founder task; converts inferred precision into measured precision. (Source: existing 020 follow-up, unchanged by 022/023.)

- [ ] ❌ **AI-client tool-uptake measurement — UNCHANGED.** No new evidence on whether Claude/Codex now reach for `get_recent_work_context` vs `search_memories` for source-anchored queries. Today's 02:05/02:10 verification showed both AIs *can* use trace correctly when prompted; uptake-without-prompting is a separate question. (Source: dogfooding round 4 conjecture C4-D, unchanged.)

- [ ] 🟡 **Codex source-prefix retrieval ordering — STILL OPEN by design.** Codex 02:05 + Claude Code 02:10 both verified: `search_memories(source_prefix="fs:/Users/zhenye/.codex/")` recency-only still returns raw fs-change rows first (9/10 matches in CC's call were 194-char raw rows; only 1 carried the actual 6,567-char Codex turn). Per 022's spec, `search_memories` deliberately does NOT pass `exclude_metadata_surface: ['fs']` to preserve forensic searchability — so this is correct-by-spec, not a regression. **Fix shape requires a NEW field**, not toggling Bug C's exclude filter. Candidates: (a) `kind: 'meta'|'data'` discriminator at capture-pipeline level (the P2 alternative from 022); (b) a `prefer_normalized: true` flag on `search_memories` that boosts atoms with rich extractor metadata above raw fs-change rows; (c) per-source-prefix default of "data first, meta on request." Next-spec territory. (Source: dogfooding entries 01:04 PDT, 01:24 PDT, 01:28 PDT, 02:05 PDT, 02:10 PDT.)

### Newly-surfaced gaps from 02:05/02:10 verification

- [x] ✅ **MCP connector deserialization error — CLOSED by 027.** Root-cause timeline confirmed in 027's spec/agent_notes: Codex success at 20:12 UTC → ECHO daemon restart at 20:22:11 UTC → Codex's stale `Mcp-Session-Id` hit ECHO's empty in-memory `sessions` map → custom router returned `400 Bad Request: no active session`, which RMCP surfaced as the `JsonRpcMessage` deserialize error. 027 switched ECHO to documented stateless StreamableHTTP (`sessionIdGenerator: undefined`, `enableJsonResponse: true`); a stale session header is now silently ignored and the call returns 200. Five regression tests added in `tests/mcp/server.test.ts`; live curl confirms the fix. (Verification per 027's `review_notes`: 494/494 tests pass.)

- [ ] 🟡 **Daemon health flap at port level — USER-FACING SYMPTOM CLOSED BY 027, root mechanism still open.** The practical failure mode (Codex calls failing after daemon restart) is closed: stateless transport means there's no per-process session state to lose. But 027 does not address the *underlying* launchd / PID-file race Codex flagged at 02:05 PDT (PID file `7319` vs actual `7333`, port alternating between 'Bad Request' and 'connection refused'). If that race ever produces a window where the new daemon hasn't bound the port yet, calls still fail — just transiently rather than persistently. Investigate-first item still has merit but is no longer P0; demote to V1.5+ reliability cleanup. (Source: dogfooding entry 02:05 PDT.)

- [ ] 🚨 **Trace-ranking gap surfaced as separate item.** From the verified-partial cross-source representation gap above: at `limit=50` Codex appears as a dropped lower-rank cluster even though it's the only representative of its source. Promote to its own spec because the fix is in trace ranking heuristic (`src/trace/cluster.ts` + `src/trace/index.ts`), not in storage or capture. Candidate signals: (a) source-diversity boost — small rank bonus when a cluster is the only contributor of a source not represented in higher-rank clusters; (b) cross-source artifact-join bias — increase edge weight when an artifact connects atoms across distinct source-prefixes; (c) surface dropped clusters' `source_breakdown` in `truncation.dropped_clusters` so the consumer can decide to retry with higher `limit`. Next-spec territory; the `_followups.md` 022 section's "cross-source representation balance" entry was the placeholder. (Source: dogfooding entries 02:05 PDT, 02:10 PDT.)

---

## 2026-05-08 — from merge of 023-chokidar-flake-quarantine

- [ ] **fs-watcher.test.ts Path C successor (~15 min).** The 023 carve-out: agent stayed strictly inside `files_to_modify` and did not quarantine `tests/capture/surfaces/fs-watcher.test.ts > startFsWatcher` despite ~33% solo flake rate. Apply the same Path C `describe.skip` with a `2026-05-08-023`-anchored tracking comment. ~30 LOC, same shape as the 023 changes to cursor.test.ts and lifecycle.test.ts. The 014 section's annotation already pre-lays the breadcrumb. (Test infra; small.)

  > Resolved (delivered after merge by 2026-05-08-024) — `describe.skip` applied to the `startFsWatcher` block in `tests/capture/surfaces/fs-watcher.test.ts` with a tracking comment in the 023 shape. Three consecutive clean `npm test` runs verified.

- [ ] **Chokidar real-fix item (post-V1.5; 2-3d).** Tracking comments at `tests/capture/extractors/cursor.test.ts` and `tests/daemon/lifecycle.test.ts` cite item 023; once 023 lands in `complete/` those references become tombstones unless a successor item exists. Investigate deterministic synchronization via the extractor's `probeFreshness` handle (already flagged in 016 followup) or sentinel-event subscription. The deeper `watcher.close()` race in chokidar teardown is the underlying root cause — quarantine is a holding pattern, not a fix. (Test infra; high priority post-V1.5.)

- [ ] **Optional: grep-anchored CI ship-blocker for V1 cut.** CI fails if `describe.skip` paired with the literal `2026-05-08-023` tracking-comment string is still present in the tree after a target date. Insurance against the quarantine outliving memory and shipping skipped tests in V1. (CI / V1 cut hygiene.)

---

## 2026-05-08 — from merge of 025-mcp-best-practices

### Per-merge cleanup (small, mechanical)

- [x] **`MAX_OVERFETCH = 200` dead constant** at `src/mcp/tools/search-memories.ts:11`. Exported but never applied as a cap after the path-aware `limit+1` overfetch refactor. Either wire it as a defensive cap on the substring-path candidate set (against unbounded full-window scans on huge stores) or delete the constant + rename the related test. Reviewer-flagged as misleading.

  > Resolved 2026-05-08 (direct fix in this session) via the **delete + rename** path. Wiring it as a substring-path storage limit would have re-introduced item 022's filter-before-slice bug (an upstream limit on the substring path silently drops matches outside the newest-N — exactly what 022 closed). The constant is removed; the test at `tests/mcp/tools/search-memories.test.ts:244` is renamed to `'recency-only path returns DESC top-N regardless of fixture size'` (the assertion already only verified DESC ordering, not the constant). Subsumes the older 014 followup of the same shape.

- [x] **`buildSourceAppMap()` rebuilt per call** at `src/mcp/tools/search-memories.ts:25-33,167`. Trivial allocation (`os.homedir()` + 4 string concats); hoist to module scope or memoize. Cosmetic.

  > Resolved 2026-05-08 (direct fix in this session): function replaced with module-scope `SOURCE_APP_MAP` IIFE that resolves `os.homedir()` once at import time. Single call site at line 165 now reads `SOURCE_APP_MAP[source_app]` directly.

### Code-correctness follow-up (own item)

- [x] **`discoverLastSeen` non-determinism in `src/capture/surfaces/git-watcher.ts:225-242`.** Storage's new `id DESC` tie-break (introduced by this item per the spec's pagination requirement) exposes a pre-existing bug: on same-second commits the watcher now picks the id-ASC-smallest tied SHA as "last seen", which can cause it to re-emit prior commits as duplicates after restart. The 025 agent correctly downgraded the resumption test in `tests/capture/surfaces/git-watcher.test.ts` from `expect(events).toHaveLength(5)` to assert only the core contract ("both new SHAs land in storage"). Proper fix needs `git-watcher.ts` changes + a `rowid` ordering hint or a `git rev-parse --short HEAD`-based discovery mechanism. After the fix, restore the strict `toHaveLength(5)` assertion. (Capture surface; latent reliability bug.)

  > Resolved 2026-05-08 (direct fix in this session): `discoverLastSeen` now walks `git log --format=%H` from HEAD backwards and returns the first SHA that's also present in storage. This is deterministic regardless of storage's timestamp tie-break — uuid event ids don't reflect git chronology on same-second commits, so the prior storage-only resolution was structurally fragile. Resumption test in `tests/capture/surfaces/git-watcher.test.ts:182` is restored to strict `toHaveLength(5)` + set-membership assertion (positional ordering still not asserted across same-second commits because `order: 'asc'` retrieval ties on uuid). All 13 git-watcher tests + 33 search-memories tests pass isolated.

### V1.6 territory (already specced as out-of-scope by 025)

- [ ] **`source_apps: array[]` multi-source filtering.** Today `source_app` is a single-value enum mapping to one `source_prefix`. Multi-source filtering (e.g., "search across `claude_code` and `codex`") requires widening `QueryFilter` and is V1.6 territory.
- [ ] **`format: 'skeleton'` response shape.** If post-merge dogfooding shows `format: 'minimal'` with `limit=20` is still too large on real fixtures, add a third response shape that returns `id`+`time`+`source`+`artifacts` only and lets the consumer fetch full content via `search_memories(id=...)` on demand. Already flagged as the highest-leverage payload move in the 022 follow-up section above.
- [ ] **Raise `MAX_LIMIT=50` for `search_memories`.** Cursor pagination is the right answer for now; raising the cap is V1.6 work.
- [ ] **Server-side substring search.** Already deferred per item 022 line 99.

### Strategist post-merge

- [ ] **Wiki promotion for 025.** Per the item's "After Completion (Strategist Notes)" section:
  - **NEW:** `wiki/surfaces/mcp-server.md` — promote V1 MCP surface from `planned` to `shipped`. Cover three tools, `source_app` enum, default cost model (`limit=20`, `format='minimal'`), composite-cursor pagination, `readOnlyHint` annotations, `outputSchema`+`structuredContent` wire shape. Cross-reference `[[capture-gate]]`, `[[storage]]`, `[[interface-layers]]` (L3).
  - **UPDATE:** `wiki/architecture/storage.md` — document the new `ORDER BY timestamp DESC, id DESC` deterministic ordering contract and the `before: { timestamp, id }` filter (`order:'asc'+before` rejection at the seam). Composite-key sort is now a stable property the rest of the substrate depends on.
  - **UPDATE:** `wiki/architecture/interface-layers.md` — clarify L3 (summoned) now ships with structured-output capabilities and source-app routing.
  - Manifest update + `tools/wiki_index.py` regeneration after the page lands.

### Dogfooding (founder + AI clients)

- [x] 🟡 **Bug 3 cost-safer defaults — REGRESSED IN PRODUCTION.** Claude Code 15:05 PDT post-merge verification (journal entry of same timestamp): `get_recent_work_context()` zero-args (defaults `limit=20`, `format='minimal'`, `window_hours=4`) returned **72,283 chars — ~3× over the 25k consumer budget** and spilled to a tool-results sidecar. Same Failure A shape as the 13:27 PDT and 14:43 PDT pre-025 entries; merge-time envelope-byte-size acceptance test (synthetic 200-atom fixture) did not catch it. Root cause from probe: `truncateForMinimal` caps `action.input/action.output` at 500 chars but leaves `artifacts[]` (33 entries / 8.4 kB on the top atom), `actors`, `provenance`, `context`, and the cluster's `edges`/`open_loop_hints` untouched. For real `claude_code` atoms with many file references per turn, `artifacts[]` dominates the byte-share. **Defer fix until after 026 + 027 merge** — second verification round will tell us whether further trace-side / transport-side changes shift the envelope shape, before we spec a fixture-density fix or commit to the V1.6 `format: 'skeleton'` move below.
- [x] ✅ **Bug 2 `source_app` ↔ literal-prefix parity** — verified 15:05 PDT. `search_memories(source_app='codex', limit=5)` and `search_memories(source_prefix='fs:/Users/zhenye/.codex/sessions/', limit=5)` returned identical 5 matches in identical order with identical `next_cursor`; `query_echo` faithfully records each input form distinctly.
- [x] ✅ **Bug 4 composite cursor + same-ms tie stability + malformed-cursor error envelope** — verified 15:05 PDT. Page 2's first row had the same timestamp as page 1's last row but a different id (composite `(timestamp, id) <` row-value comparison engaged correctly, no skip, no dup). Malformed cursor `'not-base64-at-all-!@#'` returned a recognizable error message at the JSON-RPC layer.
- [ ] **Capture AI-client uptake on the new affordances:** does Claude Code spontaneously use `source_app: 'claude_code'` for app-scoped queries instead of guessing FS prefixes? Does pagination via `next_cursor` get used at all, or do consumers default to wider `until` filters? Two more dogfooding entries' worth of signal needed before deciding whether the affordances are working as intended.
- [x] ✅ **Second verification round after 026 + 027 merge** — completed 15:54 PDT. Result: regression PERSISTED and got worse (84,188 chars vs 72,283 baseline, +16.5%). Gated item filed as `backlog/ready/2026-05-08-028-rwc-envelope-skeleton-format.md`. Two new bug classes surfaced (Bug A: `search_memories` per-match envelope; Bug B: `tail_session` source resolution) — see "From 028 dogfooding context" below.

### From 028 dogfooding context (2026-05-08 15:54 PDT post-026+027 round)

- [x] ✅ **Bug A1 (`search_memories` per-match content cap)** — shipped at 16:11 PDT (commit `2fecd10`, branch `agent/mcp-envelope-bugs-ab`). Live verification at 16:14 PDT confirms `content_lengths=[2023,2023,2023]` (exactly `PER_MATCH_CONTENT_CAP=2000` + marker overhead) and `bytes_elided=[4507,3900,4567]` populated. Marker `\n…[N chars elided]…\n` on the wire. **But:** see new Bug A2 below — content cap alone did not close the envelope overflow because `metadata.tool_calls` is still uncapped.
- [x] ✅ **Bug B (`tail_session` fs-watcher exclusion)** — shipped same commit. Live verification at 16:14 PDT confirms `surfaces` field is null for every returned atom (zero `metadata.surface:'fs'`); response now contains the codex extractor's actual turn atoms instead of the fs-watcher meta-stream. Source resolution lands on the right rollout file. Behavior change: `source_app=<app>` returns null + warning when only fs events exist (instead of falling back to fs noise) — matches recent-work-context.ts:171 discipline.

### From 16:14 PDT post-Bugs-A+B-merge live verification (third round)

- [x] ✅ **Bug A2 (per-match `metadata` envelope uncapped)** — closed by V1.5.6 wire-shape projector (commit `21edd69`, 16:46 PDT). Per-key cap engaged; live verified 16:49 PDT — `metadata.tool_calls` reduced from 130KB/atom to a single placeholder; small structured neighbours pass verbatim. Then improved by V1.5.6.1 (commit `264a7af`, 17:02 PDT) — `tool_calls` now projected to its workflow trajectory + histogram instead of opaque placeholder. Live verified 17:05 PDT with all four canonical calls returning inline, trajectory legible.
- [x] ✅ **Bug A1 reach gap (`tail-session.ts:68 toMatch` had no content cap)** — closed by V1.5.6 wire-shape projector. `tail_session` now routes through the same `projectMatch` as `search_memories`; both share one envelope-discipline codepath (`src/mcp/wire-shape/match.ts`). Live verified 16:49 PDT.
- [x] ✅ **Bug 3 closure post-028 merge** — confirmed in the 17:01 PDT v1.5-livetest round (`get_recent_work_context()` defaults returned in budget). NOTE: separate **Bug 3.1** surfaced in same round — `format:'skeleton'` at `limit=100` overflows at 53,413 chars due to cluster-shape `atom_ids[]` / `open_loop_hints[]` having no per-cluster bounds. Filed as V1.6 item below.

### V1.6 candidates (surfaced post-V1.5 cap-stone, 2026-05-08 17:05 PDT)

The four MCP envelope-overflow bugs from this dogfooding window are CLOSED for the surface-retrieval atom path. The 17:01 PDT v1.5-livetest round surfaced new gaps that belong to V1.6:

- [ ] **Bug 3.1 — `get_recent_work_context` skeleton-mode overflow at `limit=100`.** Skeleton was sized against the 15:54 PDT 30-atom fixture (~12k chars, 3% headroom under 12,500); at `limit=100` and 273 atoms in the dominant cluster, the per-cluster `atom_ids[]` array (~10KB at 273 ids) plus `open_loop_hints[]` (one entry per atom with hints) overflows even after the per-atom skeleton stripping. Spec needed: per-cluster bounds — cap `atom_ids[]` and `open_loop_hints[]` length, or split a single huge cluster into multiple cluster-page responses. Pre-existing 028 review note flagged the headroom risk: *"3% headroom is a future flake risk if atom shape grows"* — and "atom shape grows" turned out to also mean "atom *count* grows." Surfaced 17:01 PDT.
- [ ] **Stage-2 deep-dive primitive: `get_atom(id, fields?)`.** The missing tool that makes elision acceptable as default. V1.5.6/V1.5.6.1 surface tools tag elided/projected fields via `metadata_keys_elided` / `metadata_keys_projected`; consumers know which keys to drill into but have no way to retrieve the original. `get_atom(id)` returns the full unelided CaptureEvent for a specific atom (or specific fields). Mirrors the existing tool registration pattern. Founder-deferred from V1.5.
- [ ] **USER-aware content clip.** ECHO's content format is always `USER: <q>\n\nASSISTANT: <a>`. USER turns are typically short; ASSISTANT turns are the long ones. Today the wire-shape projector applies head+tail to the whole content string, which can lose the question on long-USER edge cases or lose the answer's middle on long-ASSISTANT turns. Improvement: parse the structure, keep USER verbatim, head+tail clip only ASSISTANT.
- [ ] **`metadata.layer:'content'|'meta'` positive-marker convention.** Bug B is mechanically closed via `exclude_metadata_surface:['fs']` in all three retrieval tools, but that's a negative-list maintenance burden. Adding `metadata.layer` at every emission point (`'meta'` for fs-watcher, `'content'` for extractors) makes the convention declarative; future capture surfaces opt in by setting `layer:'meta'` and every retrieval tool default-filters on `'content'`.
- [ ] **Generalised shape-aware projector registry.** V1.5.6.1 adds a specialised projector for `tool_calls` (name trajectory). If `files_referenced`, `actors`, or future variadic metadata fields need similar treatment, the pattern is: add a projector to `src/mcp/wire-shape/`, dispatch in `match.ts:projectMatch` before the standard cap. Alternatively: a registry-driven dispatch (`SHAPE_PROJECTORS: Record<string, Projector>`) so adding a new projection is one entry, not a new dispatch line.
- [ ] **Cursor capture stale 7 days + fs-watcher contamination.** Surfaced in 17:01 PDT v1.5-livetest round. Cursor turn extraction has been silently failing for 7 days; the cursor source-app lane in retrieval tools returns fs-watcher meta-events instead of turns. Out of scope for the V1.5 envelope work; needs a separate capture-side investigation and fix.
- [ ] **Memory MCP (echo-memory) fully broken.** Surfaced in 17:01 PDT v1.5-livetest round — 4/4 echo-memory tools fail. Out of scope for V1.5 envelope work; separate item.

### From 027 merge (2026-05-08-027-mcp-stateless-transport)

- [ ] **Confirm 027 run-log artifact exists.** Verify `raw/internal/agent-runs/2026-05-08-027-mcp-stateless-transport.md` has the root-cause timeline (Codex success at 20:12 UTC → ECHO daemon restart at 20:22:11 UTC → Codex failures from 20:22:20 UTC onward) and before/after wire examples for stale `Mcp-Session-Id`. Acceptance bullet 10 was the only one not verified by the reviewer (out of diff scope). If absent, append post-merge.
- [ ] **Live launchd-cycled smoke run.** One-time manual `./tools/mcp-integration-smoke.sh` against the daemon after a `launchctl kickstart -k gui/$(id -u)/com.echo.daemon` cycle, to close the dogfooding loop on the stale-session fix end-to-end (vitest covers the in-process path; this covers the wire path through launchd).
- [ ] **Wiki promotion (strategist).** Update `wiki/surfaces/mcp-server.md` to document V1 MCP as stateless StreamableHTTP with `enableJsonResponse: true`, `sessionIdGenerator: undefined`, GET/DELETE → 405 + `Allow: POST` + JSON-RPC error body, and "daemon restart does not require client reconnect." Per the item's "After Completion (Strategist Notes)" section.
- [ ] **Real-world Codex daemon-restart validation.** In a fresh Codex session, call `echo_ping` → restart the ECHO daemon → call `echo_ping` again from the same Codex session. Expected: both calls succeed, no `JsonRpcMessage` deserialize error. Log to `raw/internal/dogfooding/mcp-interactions-journal.md` as the canonical real-world validation that the stateless transport closes the original failure mode. Repeat one `search_memories` and one `get_recent_work_context` call after restart to confirm the fix is not ping-specific.

### Process notes

- **Test files outside `files_to_modify` (escalation pattern).** 025 agent self-flagged that three test files in `tests/capture/{extractors,surfaces}/*` were modified to absorb the spec-mandated `ORDER BY id` fallout. Reviewer judged: stand (diffs surgical, set-membership where order is no longer guaranteed, well-commented). For future runs the right move is to escalate via `agent_notes` first and let founder/strategist pre-bless test edits outside the listed file set. Same theme as the 020/021 "test fallout permitted in:" follow-up — the spec template improvement is overdue.
- **Reviewer-vs-worktree drift on artifact location.** Reviewer subagent flagged the run log absent because it inspected the worktree's branch tip; the file was already on main from the review-stage commit. Future review prompts should explicitly direct the subagent to `git log --all -- <path>` for spec-required artifact files, not just `ls` inside the worktree.

---

## 2026-05-08 — from merge of 026-tail-session-tool

### Per-merge cleanup (small, mechanical)

- [ ] **Misleading `next_cursor` comment** at `tests/mcp/tools/tail-session.test.ts:131-133`. Comment claims `next_cursor` is null but the assertion is `not.toBeNull()`. The assertion is correct (overfetch grabbed `count+1=3` rows out of 3 available, so cursor IS emitted); the comment is wrong. Fix opportunistically.

### Strategist post-merge

- [ ] **Wiki promotion for 026.** Per item's "After Completion (Strategist Notes)": add `tail_session` to `wiki/surfaces/mcp-server.md` (the four-tool roster). Cover input modes (`source` vs `source_app`), `source_resolved` echo, cost contract (`< 10k chars typical`), composite cursor shared with `search_memories`, why `tail_session` exists separately from the other two retrieval tools. No new wiki page — single addition to the existing surfaces page.

### Dogfooding (founder)

- [ ] **Re-run today's bypass scenarios (13:27, 14:00 PDT entries) using `tail_session`.** Measure: byte-count of response, number of MCP calls to recover the same Codex turn that motivated this item. Expected: 1 call, < 10k bytes, no spill — vs today's 2 calls + subagent-slice. Journal an explicit "ECHO won this round" entry for each successful re-run; this is the controlled-experiment data the operating-model retrospectives will lean on.

### Test infra (cross-cuts prior items)

- [ ] **Confirm trace/build perf flake status.** The agent's run log reported 2 pre-existing flakes during 026 development: `tests/trace/build.test.ts` performance timing + `tests/capture/surfaces/git-watcher.test.ts` backfill concurrency. The merge-verify run showed 0 failures (likely the recent chore commit `7e4d4e0` fixed git-watcher's `discoverLastSeen` flake). Confirm trace/build.test.ts perf flake status across 3+ consecutive `npm test` runs to establish whether it's also closed or remains a noise source.

### From 028 merge (2026-05-08-028-rwc-envelope-skeleton-format)

- [ ] **Tighten the skeleton-envelope threshold when a denser real spill becomes available.** 028's fixture caps at 17 artifacts on the densest atom (range 2–17); skeleton response measured 12,091 chars vs the 12,500 assertion (3% headroom). Any future atom-shape regression lands on this test, but the headroom is tight enough that a denser spill (more parallel Read/Edit/Bash per turn) would make the test stronger. Swap fixture + retighten threshold when an opportunistic dense spill lands. Source: 028 `agent_notes` + reviewer judgment.
- [ ] **Add `src/trace/types.ts` to 028's spec_refs retroactively (or note explicitly).** The 028 diff widened `ResponseFormat` enum at `src/trace/types.ts:11` to include `'skeleton'`. Mechanically required by acceptance bullet 1's "update `ResponseFormat` accordingly" wording but the file wasn't in `files_to_modify`. Reviewer flagged as non-blocking micro-drift; recording for future audit clarity. Already noted in 028's `review_notes`.
- [ ] **Strategist wiki note: skeleton mode is MCP-wire-boundary-only.** When `wiki/surfaces/mcp-recent-work-context.md` is created/updated post-shipment for 028, document explicitly that non-MCP callers of `getRecentWorkContext` (notably `tools/validate-resolution.ts`) cannot use skeleton mode — the transform lives at the MCP wire boundary inside `registerRecentWorkContext` to keep `RecentWorkContextResponse` narrow for non-MCP callers. Sound trade-off for V1; future need = one-line refactor to promote the transform.
- [ ] **028 dogfooding closure measurement.** Re-run the 15:54 PDT default-args scenario with `format:'skeleton'` against the live daemon (now running merged 028 code). Confirm envelope < 25k chars and < 12,500 chars for skeleton specifically. Confirm `format:'minimal'` default still produces useful resume briefings (i.e., not over-stripped). Log to `raw/internal/dogfooding/mcp-interactions-journal.md` as the third real-world regression-closure measurement (after 15:05, 15:14, 15:54 PDT). Strategist + founder pair on the read.

