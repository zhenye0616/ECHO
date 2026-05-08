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

> Resolved (delivered after merge by 2026-05-08-023) for the `cursor.test.ts` portion only — the `describe('startCursorExtractor (lifecycle + integration)')` block is `describe.skip`-quarantined with a tracking comment. The `claude-code.test.ts` and `fs-watcher.test.ts` portions remain open per 023's Out-of-Scope.
> Resolved (delivered after merge by 2026-05-08-024) for the `fs-watcher.test.ts` portion — the `describe('startFsWatcher')` block is `describe.skip`-quarantined with a tracking comment. The `claude-code.test.ts` portion remains open.

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

> Resolved (delivered after merge by 2026-05-08-023) — `describe.skip` quarantine on the `cursor.test.ts` `startCursorExtractor (lifecycle + integration)` block and on the `lifecycle.test.ts` `daemon lifecycle` block; tracking comments point at item 023; test bodies intact.

## 2026-05-07 — from merge of 018-recent-work-context-tool

- [ ] **Tighten MCP `limit` zod schema** in `src/mcp/tools/recent-work-context.ts:90`. Change `z.number().optional()` → `z.number().int().min(1).max(500).optional()` so a malformed value surfaces as a structured tool-error at the boundary rather than silently being clamped by `clampLimit`. Founder-facing validation is looser than typical MCP tools today. (MCP tool; cosmetic boundary tightening.)

- [ ] **Switch `computeTimeRange` to `Date.parse()`** in `src/trace/index.ts:202`. Uses string comparison on `occurred_at` today — works for Z-suffixed UTC (which storage emits) but breaks ordering for offset-bearing timestamps (e.g. `+02:00` vs equal-moment `Z`). Change before any timezone-bearing extractor lands. (Trace module; dormant correctness.)

- [ ] **Broaden hint regexes during V1.5 dogfooding** in `src/trace/hints.ts:5-6`. `FOLLOWUP_RE` matches three exact phrases ("follow up", "come back to", "will do later"); `TODO_RE` requires `:` or whitespace after `TODO`. Per spec these are intentionally scoped — refine if dogfooding shows them too tight. (Trace module; product tuning.)

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
- **Add explicit "earliest" tests** for R1.AQ and R1.TODO to mirror the existing R1.Q earliest test (currently inferred from shared loop structure).
- **One-line UTC-Z invariant comment** in `src/trace/index.ts:202-211` documenting that `compareByOccurredAt` lex-sort ≡ chronological order only under the normalizer's UTC-Z guarantee. Prevents a future change from breaking the assumption silently.
- **Strategist post-merge spec amendment:** spec line 42 prose says "matching by `context.conversation` artifact id" but the actual `NormalizedContextEvent.context` schema has only `visible/selected/ambient` strings. Agent correctly inferred conversation-typed `ArtifactRef` matching by `provider:type:id`. Update spec wording for future readers.
- **R1.TODO snapshot-resolver expansion (decision pending dogfooding):** R1.TODO matches only `state.delta.artifact_id`. Git-commit atoms use `state.snapshot.artifact_id` and won't close TODOs in the current rule. Per spec ("`state.delta.artifact_id`") this is faithful; revisit after dogfooding evidence.
- **R1.AQ user-with-empty-input edge case (validate during dogfooding):** `hasNonEmptyContent` falls back from `input` to `output` for user-role atoms. For sources where the user atom legitimately has empty `input` but non-empty `output` (rare; some cursor extractor cases), this still resolves. Verify in the founder hand-score pass.
- **Quarantine the pre-existing capture/daemon flake** as a separate item: 3 failures intermittent in `tests/capture/extractors/cursor.test.ts` (workspace_id matching, lastSeenMap backfill, stop() timeout) + 1 in `tests/daemon/lifecycle.test.ts` (waitFor timeout). Already flagged from item 019's verification; re-confirmed at 020's merge. Flake fluctuates 3–14 failures across runs.

  > Resolved (delivered after merge by 2026-05-08-023) — flake cluster `describe.skip`-quarantined in both files with tracking comments pointing at item 023.
- **Founder hand-scores the 111 rows** in `raw/internal/dogfooding/2026-05-08-resolution-validation.md` as TP / FP / TN / FN. If overall precision (TP / (TP + FP)) ≥ 80%, R1 is sufficient for V1 hotkey overlay. Otherwise calibration becomes the next backlog item before the overlay UI is specced.


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

- [ ] **Resolve item 023 backlog-state collision.** 022's claim commit `a3d1fe2` swept in a pre-staged `git mv` of item 023, and follow-up `578b5c5` wrote 022's persona into 023's frontmatter. The 022 agent did not work 023's code. 023 is independently under review on `agent/chokidar-flake-quarantine`. Founder action: either let parallel work continue or revert 023's frontmatter. (Backlog-state, not code.)
- [ ] **Add explanatory comment at `src/storage/migrate.ts:71`** documenting the `TZ_MARKER_RE` else-branch (defensive for naive rows that bypass the SQL `WHERE timestamp NOT LIKE '%Z'` filter). Logic is correct but non-obvious.
- [ ] **Lift cap-hit equality to `>=` storageCap** at `src/mcp/tools/recent-work-context.ts:170` once a `count(filter)` storage method exists. V1.5.3 territory; spec already flagged in Out of Scope.
- [ ] **`backlog/pending_review/2026-05-08-023-chokidar-flake-quarantine.review.md` got tracked** by `git add -A` in the 022 post-merge commit. Sidecars are typically untracked; will be `git rm`'d when `/merge-and-cleanup 023` runs. Cosmetic; flagging for awareness.

### Strategist post-merge

- [ ] **Wiki promotion bundle 019+020+021+022.** Four items' worth of `wiki/architecture/work-trace.md` and `wiki/surfaces/mcp-recent-work-context.md` updates land together. New `wiki/architecture/` page on **timestamp canonicalization at capture** is wiki-worthy (single-chokepoint normalization decision is durable substrate doctrine).
- [ ] **Re-run dogfooding scenarios post-022 + daemon-restart.** Specifically the 01:03 PDT and 01:33 PDT entries from `raw/internal/dogfooding/2026-05-07-trace-layer.md` — expect `source_breakdown` to include git ≥1 and codex ≥1 on the same window that previously returned `{claude_code: N}` only. If still missing, 022 didn't fully close the cross-source promise and a follow-up item is needed.
- [ ] **Verify migration row-count log surfaces 152 expected rows** on first daemon-boot post-merge against the founder's local DB. The fixup logs `{converted}` via `createLogger('storage.sqlite')`. Daemon was kickstarted at this merge (PID 7319); the log line should appear in daemon stdout if any `-07:00` rows existed.

### Dogfooding-journal surfaced gaps (status verified by Codex 02:05 PDT + Claude Code 02:10 PDT post-022/023)

> **Source:** `raw/internal/dogfooding/2026-05-07-trace-layer.md` (16 entries through 2026-05-08 02:10 PDT, 4+ AI clients).
> **Verification convergence:** Codex's 02:05 PDT direct daemon+log inspection and Claude Code's 02:10 PDT MCP retrieval landed on the same gap classification on the same window — two reasoning processes from different starting points (one inspecting daemon stdout + SQLite directly; one calling the public MCP surface) converging is structural-correctness signal, similar to the 15:39 PDT day-1 V1-atom-design observation.
> **Status legend:** ✅ closed by 022/023 · 🟡 partial / narrowed (capture fixed; UX or ranking gap remains) · ❌ still open · 🚨 newly surfaced during verification.

- [x] ✅ **Source-prefix retrieval reliability — `git:` portion CLOSED by 022.** Three pre-022 failures (Codex 16:22, Claude 22:40, round 4 T4 at 00:30) all involved different prefix-guessing patterns. Codex 02:05 verified `search_memories(source_prefix="git:")` now returns 5 git commit rows. Bug A's lex-compare fix removed the silent timestamp-drop that was masking the underlying retrieval. The broader opacity (`claude_code` / `cc` guessing) is description-level, not retrieval-level — covered by the existing description fix at `13ec010`. (Source: dogfooding entries 16:22 PDT, 22:40 PDT, 00:30 PDT, 00:46 PDT, 02:05 PDT.)

- [x] ✅ **`search_memories` KNN non-determinism — STALE FRAMING.** Codex 02:05: *"`search_memories` is literal substring now; `hotkey overlay` returned identical top 5 results twice."* The 22:50 PDT observation predated the description fix that clarified substring-not-semantic semantics; with substring search, determinism is structural. The original framing assumed embedding/KNN scoring; the actual behavior is and was substring matching. (Source: dogfooding entries 22:50 PDT, 02:05 PDT.)

- [x] 🟡 **Cross-source representation — CAPTURE FIXED, RANKING GAP REMAINS.** Codex 02:05 + Claude Code 02:10 both verified: at `limit=100` the day window now returns 2 clusters `{claude_code: 27, git: 23}` + `{codex: 10}`. At `limit=50` Codex appears as a separate lower-rank cluster that gets dropped (warning fires correctly). Trace ranking surfaces Codex as cluster-2 because no shared artifact joins Codex turns to the dominant Project_echo cluster, AND because `has_open_loop` + `dense` boost cluster-1's rank. **The remaining work is a separate item:** trace ranking heuristic / cross-source artifact join, NOT capture or storage. Candidates: weight non-repo shared-artifacts higher, give a small rank boost when a cluster is the only representative of a source, or surface lower-rank clusters in `truncation.dropped_clusters` with their `source_breakdown`. (Source: dogfooding entries 00:30 PDT round 4 T1, 01:33 PDT, 01:39 PDT, 02:05 PDT, 02:10 PDT.)

- [ ] ❌ **Default 4h window wrong for "where did I leave off" — UNCHANGED.** Codex 02:05: *"Still open by code. Default no-arg window is still now minus 4h."* 022 didn't touch this. Founder/strategist call: change the default, or document the "active-now vs morning-orientation" framing more loudly in the tool description. (Source: dogfooding entry 22:40 PDT.)

- [x] 🟡 **Long-window cluster loss — WARNING NOW FIRES.** Codex 02:05: *"Mostly fixed. Warnings now fire, e.g. `limit dropped 3 entire cluster(s)`."* The warning surfaces; the consumer can detect and react. The deeper question — should truncation be by clusters instead of atoms? — is now an UX choice, not a silent-failure correctness bug. Move to the trace-ranking item above. (Source: dogfooding entry 16:33 PDT, 02:05 PDT.)

- [ ] ❌ **Atom envelope payload floor — UNCHANGED, NOW HIGHEST-LEVERAGE PAYLOAD MOVE.** Codex 02:05: *"Still open. Minimal responses are still large: about 242KB for day `limit=100`, 405KB for round-4 `limit=100`."* Claude Code 02:10 retrieved 105K (trace, limit 50) + 98K (search, limit 10) — both over CC's tool-result budget with `format: "minimal"` already on. Bug C reduced atom *count* but didn't shrink the per-atom envelope (~3-4KB of structural metadata). **Skeleton-only mode is now the candidate spec** — return `id`+`time`+`source`+`artifacts` + `cluster_anchor_summary`; consumer fetches full atom content via `search_memories(id=...)` on demand. Highest-leverage payload move post-022. (Source: dogfooding entry 16:16 PDT round 2, 02:05 PDT, 02:10 PDT.)

- [x] 🟡 **Daemon-restart-after-merge — STEP IN PLACE BUT FLAPPING.** The `/merge-and-cleanup` C9b kickstart step ran successfully twice this morning (post-022 PID 7319, post-023 PID 13903). However, Codex 02:05 surfaced a new failure mode underneath: *"Launchd thinks the daemon is running, but the PID file disagrees (`7319` vs `7333`) and the MCP port is unreachable."* — see the new "MCP connector + daemon health" item below. The kickstart-on-merge mechanism is in place; what's now visible is a separate health/transport reliability gap. (Source: dogfooding entry 16:15 PDT, 02:05 PDT.)

- [ ] ❌ **Founder hand-score pass on 020 R1 fixture** at `raw/internal/dogfooding/2026-05-08-resolution-validation.md`. Unchanged — verdict column still empty across all 111 rows. Half-day founder task; converts inferred precision into measured precision. (Source: existing 020 follow-up, unchanged by 022/023.)

- [ ] ❌ **AI-client tool-uptake measurement — UNCHANGED.** No new evidence on whether Claude/Codex now reach for `get_recent_work_context` vs `search_memories` for source-anchored queries. Today's 02:05/02:10 verification showed both AIs *can* use trace correctly when prompted; uptake-without-prompting is a separate question. (Source: dogfooding round 4 conjecture C4-D, unchanged.)

- [ ] 🟡 **Codex source-prefix retrieval ordering — STILL OPEN by design.** Codex 02:05 + Claude Code 02:10 both verified: `search_memories(source_prefix="fs:/Users/zhenye/.codex/")` recency-only still returns raw fs-change rows first (9/10 matches in CC's call were 194-char raw rows; only 1 carried the actual 6,567-char Codex turn). Per 022's spec, `search_memories` deliberately does NOT pass `exclude_metadata_surface: ['fs']` to preserve forensic searchability — so this is correct-by-spec, not a regression. **Fix shape requires a NEW field**, not toggling Bug C's exclude filter. Candidates: (a) `kind: 'meta'|'data'` discriminator at capture-pipeline level (the P2 alternative from 022); (b) a `prefer_normalized: true` flag on `search_memories` that boosts atoms with rich extractor metadata above raw fs-change rows; (c) per-source-prefix default of "data first, meta on request." Next-spec territory. (Source: dogfooding entries 01:04 PDT, 01:24 PDT, 01:28 PDT, 02:05 PDT, 02:10 PDT.)

### Newly-surfaced gaps from 02:05/02:10 verification

- [ ] 🚨 **MCP connector deserialization error.** Codex 02:05 verbatim: *"`mcp__echo__.echo_ping` fails with a JSON-RPC deserialize error even after launchd kickstart. Direct HTTP MCP works outside the sandbox after kickstart, so this looks like connector/transport compatibility, not pure daemon death."* Error message: `Deserialize error: data did not match any variant of untagged enum JsonRpcMessage`. New gap class — was not visible before because pre-022 retrieval failures masked it. Requires investigation: (a) compare connector vs direct-HTTP request shape, (b) verify the daemon's response shape against the JSON-RPC envelope schema, (c) determine if the issue is environment-specific (sandbox vs host) or transport-version mismatch (MCP SDK version drift). (Source: dogfooding entry 02:05 PDT.)

- [ ] 🚨 **Daemon health flap at port level.** Codex 02:05 verbatim: *"The daemon is flapping at the port level: launchd says running, logs are active, but actual connects to `127.0.0.1:38478` alternate between 'Bad Request' and 'connection refused.'"* PID file disagreement (`7319` vs `7333`) suggests a respawn race or the wrong process owning the lock. Reliability gap; one notch deeper than the C9b kickstart fix. Could be: (a) daemon child-process model where the parent owns launchd's PID but a child owns the port, (b) launchd KeepAlive races on SIGTERM/restart, (c) chokidar handles surviving the parent shutdown and blocking the new daemon's port acquisition. Investigate-first item. (Source: dogfooding entry 02:05 PDT.)

- [ ] 🚨 **Trace-ranking gap surfaced as separate item.** From the verified-partial cross-source representation gap above: at `limit=50` Codex appears as a dropped lower-rank cluster even though it's the only representative of its source. Promote to its own spec because the fix is in trace ranking heuristic (`src/trace/cluster.ts` + `src/trace/index.ts`), not in storage or capture. Candidate signals: (a) source-diversity boost — small rank bonus when a cluster is the only contributor of a source not represented in higher-rank clusters; (b) cross-source artifact-join bias — increase edge weight when an artifact connects atoms across distinct source-prefixes; (c) surface dropped clusters' `source_breakdown` in `truncation.dropped_clusters` so the consumer can decide to retry with higher `limit`. Next-spec territory; the `_followups.md` 022 section's "cross-source representation balance" entry was the placeholder. (Source: dogfooding entries 02:05 PDT, 02:10 PDT.)

---

## 2026-05-08 — from merge of 023-chokidar-flake-quarantine

- [ ] **fs-watcher.test.ts Path C successor (~15 min).** The 023 carve-out: agent stayed strictly inside `files_to_modify` and did not quarantine `tests/capture/surfaces/fs-watcher.test.ts > startFsWatcher` despite ~33% solo flake rate. Apply the same Path C `describe.skip` with a `2026-05-08-023`-anchored tracking comment. ~30 LOC, same shape as the 023 changes to cursor.test.ts and lifecycle.test.ts. The 014 section's annotation already pre-lays the breadcrumb. (Test infra; small.)

  > Resolved (delivered after merge by 2026-05-08-024) — `describe.skip` applied to the `startFsWatcher` block in `tests/capture/surfaces/fs-watcher.test.ts` with a tracking comment in the 023 shape. Three consecutive clean `npm test` runs verified.

- [ ] **Chokidar real-fix item (post-V1.5; 2-3d).** Tracking comments at `tests/capture/extractors/cursor.test.ts` and `tests/daemon/lifecycle.test.ts` cite item 023; once 023 lands in `complete/` those references become tombstones unless a successor item exists. Investigate deterministic synchronization via the extractor's `probeFreshness` handle (already flagged in 016 followup) or sentinel-event subscription. The deeper `watcher.close()` race in chokidar teardown is the underlying root cause — quarantine is a holding pattern, not a fix. (Test infra; high priority post-V1.5.)

- [ ] **Optional: grep-anchored CI ship-blocker for V1 cut.** CI fails if `describe.skip` paired with the literal `2026-05-08-023` tracking-comment string is still present in the tree after a target date. Insurance against the quarantine outliving memory and shipping skipped tests in V1. (CI / V1 cut hygiene.)

