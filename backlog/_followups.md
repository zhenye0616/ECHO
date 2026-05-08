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

---

## 2026-05-07 — from merge of 020-open-loop-resolution-heuristics

- **Tighten R1.TODO type cast** at `src/trace/hints.ts:150`. Replace `(state as { delta?: { artifact_id: string } }).delta` with the discriminated-union narrowing `if ('delta' in state)`. Cosmetic; functionally equivalent.
- **Add explicit "earliest" tests** for R1.AQ and R1.TODO to mirror the existing R1.Q earliest test (currently inferred from shared loop structure).
- **One-line UTC-Z invariant comment** in `src/trace/index.ts:202-211` documenting that `compareByOccurredAt` lex-sort ≡ chronological order only under the normalizer's UTC-Z guarantee. Prevents a future change from breaking the assumption silently.
- **Strategist post-merge spec amendment:** spec line 42 prose says "matching by `context.conversation` artifact id" but the actual `NormalizedContextEvent.context` schema has only `visible/selected/ambient` strings. Agent correctly inferred conversation-typed `ArtifactRef` matching by `provider:type:id`. Update spec wording for future readers.
- **R1.TODO snapshot-resolver expansion (decision pending dogfooding):** R1.TODO matches only `state.delta.artifact_id`. Git-commit atoms use `state.snapshot.artifact_id` and won't close TODOs in the current rule. Per spec ("`state.delta.artifact_id`") this is faithful; revisit after dogfooding evidence.
- **R1.AQ user-with-empty-input edge case (validate during dogfooding):** `hasNonEmptyContent` falls back from `input` to `output` for user-role atoms. For sources where the user atom legitimately has empty `input` but non-empty `output` (rare; some cursor extractor cases), this still resolves. Verify in the founder hand-score pass.
- **Quarantine the pre-existing capture/daemon flake** as a separate item: 3 failures intermittent in `tests/capture/extractors/cursor.test.ts` (workspace_id matching, lastSeenMap backfill, stop() timeout) + 1 in `tests/daemon/lifecycle.test.ts` (waitFor timeout). Already flagged from item 019's verification; re-confirmed at 020's merge. Flake fluctuates 3–14 failures across runs.
- **Founder hand-scores the 111 rows** in `raw/internal/dogfooding/2026-05-08-resolution-validation.md` as TP / FP / TN / FN. If overall precision (TP / (TP + FP)) ≥ 80%, R1 is sufficient for V1 hotkey overlay. Otherwise calibration becomes the next backlog item before the overlay UI is specced.


---

## 2026-05-08 — from merge of 021-trace-cross-gap-where-left-off

- **Quarantine the recurring fs-watcher / cursor / daemon-lifecycle flake.** Same files since item 018 (`tests/capture/extractors/cursor.test.ts`, `tests/daemon/lifecycle.test.ts`); failure count fluctuates 3–14 across runs. Fixture races on FSEvents under load. File its own backlog item — bump test timeout, fix the underlying race, or quarantine via `.skip` with a tracking comment.
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

### Dogfooding-journal surfaced gaps (need re-verification post-022)

> **Source:** `raw/internal/dogfooding/2026-05-07-trace-layer.md` (14 entries, 2026-05-07 through 2026-05-08 01:39 PDT, 4+ AI clients).
> **Re-verification required:** every gap below was observed *before* 022 landed. 022 fixes Bug A (timestamp lex-compare drops), Bug B (storage-cap silent failure), Bug C (raw-FS noise dominance), Bug D (`search_memories` filter-before-slice). Some of these gaps may be partially or fully closed by 022; re-test each before specifying as a separate backlog item.

- [ ] **Source-prefix retrieval reliability.** Three independent AI clients on the same day guessed wrong prefixes and got 0 matches even when the underlying rows existed in SQLite (Codex 16:22 PDT — `claude`/`cc`; Claude Code 22:40 PDT — `claude_code`; Codex round 4 T4 at 00:30 PDT — `git:`). The `13ec010` description fix added examples but didn't change retrieval behavior. Likely root cause: KNN scoring runs before the prefix filter, OR prefix filter is more restrictive than it looks. **Re-verify post-022:** does `search_memories(source_prefix="git:", since=...)` now return git rows? Bug A's lex-compare fix may have indirectly resolved one symptom; the broader opacity may persist. (Source: dogfooding journal entries 16:22 PDT, 22:40 PDT, round 4 T4 at 00:30 PDT, 00:46 PDT.)

- [ ] **`search_memories` KNN non-determinism.** Same query `"hotkey overlay"` returned 1 match earlier in the day, 0 matches later, against the same store (entry 22:50 PDT). Either model re-rolls embeddings per call, threshold is borderline, or index rebuild is shifting cosine-similarity ranks. Undermines AI-client trust; not a correctness bug but a UX bug. **Re-verify post-022:** Bug D's filter-before-slice fix changes the candidate set ordering; re-run the same paraphrase pair against the same store and check whether the non-determinism persists. (Source: dogfooding journal entry 22:50 PDT, also flagged at 021 follow-ups.)

- [ ] **Cross-source representation balance under event-volume disparity.** Round 4 T1 returned `source_breakdown: {claude_code: 34, git: 0}` despite 11 git commits in the same 25h window — claude_code's per-conversation event volume (multiple events per turn) consumes the storage cap, pushing single-event git commits past the cutoff. **Re-verify post-022:** Bug C filters raw FS-watcher events, which removes the largest single source of volume disparity. Re-run round 4 T1's exact query — if `git` and `codex` now appear in `source_breakdown`, this gap is closed by 022. If volume disparity *still* squeezes them out, candidate fixes: per-source quotas in storage queries, source-aware overfetch, or capture-side dedup of high-frequency surfaces. (Source: dogfooding journal round 4 T1 at 00:30 PDT, 01:33 PDT, 01:39 PDT.)

- [ ] **Default 4h window wrong for "where did I leave off" queries.** Entry 22:40 PDT — Claude Code's `get_recent_work_context()` with all defaults returned 0 atoms because the relevant turn was outside the 4h window. The overnight/after-break case is arguably the *primary* hotkey-overlay use case; default is tuned for "active right now." Candidates: change the default, or describe the tool's "active-now vs morning-orientation" framing in the description. **Re-verify post-022:** 022 doesn't change the default; this is independent. Founder/strategist call. (Source: dogfooding journal entry 22:40 PDT, conjecture C2.)

- [ ] **Long windows + `limit=100` silently lose entire clusters.** Codex's 16:33 PDT workaround was to split a day into 3 bands. Truncation strategy drops lowest-rank atoms first; no warning fires when whole clusters disappear from a multi-thread day. **Re-verify post-022:** V1.5.1's cluster-loss warning + 022's Bug B storage-cap warning together cover *some* truncation paths, but cluster-level loss on long windows may still be silent. Re-run Codex's full-day trace and verify warnings fire when bands had to be split. Candidates if still silent: truncate by clusters not atoms, or warn on `clusters_dropped > 0`. (Source: dogfooding journal entry 16:33 PDT, Round 3 themes.)

- [ ] **Atom envelope is the new payload floor.** Even with `format:'minimal'`, the response was 64K — over Claude Code's tool-result budget (entry 16:16 PDT). Edge optimization is fully effective; the per-atom envelope (~3-4KB of structural metadata: artifacts, provenance, conversation refs, source, time, actors) sets the floor. Hypothetical "atom-skeleton-only" mode (return `id`+`time`+`source`+`artifacts`, fetch full atoms via `search_memories(id=...)` on demand) would be the high-leverage move. **Re-verify post-022:** Bug C's raw-FS filter reduces atom count, so total payload drops mechanically; re-measure post-022 and decide whether the skeleton-only mode is still needed. (Source: dogfooding journal entry 16:16 PDT, Round 2 themes.)

- [ ] **Daemon-restart-after-merge not automatic.** Recurring pattern (16:15 PDT entry, post-018 + post-019 + post-021): first MCP call after a merge silently runs on stale code, looks like the patch didn't ship. Either `WatchPaths` in the launchd plist or a step in `merge-and-cleanup`. The `/merge-and-cleanup` skill *now* includes a kickstart step (added between 018 and 022); verify it stays in place and is followed every merge. (Source: dogfooding journal entry 16:15 PDT.)

- [ ] **Founder hand-score pass on 020 R1 fixture** at `raw/internal/dogfooding/2026-05-08-resolution-validation.md`. Verdict column is empty across all 111 rows; 96 are algorithm-marked resolved and 15 unresolved with per-rule breakdown (`unresolved_assistant_q` 55/58, `ends_with_question` 41/48, `contains_todo` 0/5). Without hand-score, R1 precision is inferred from journal vibes, not measured. Already flagged at 020 follow-ups; re-flagging here because the fixture is now ~24h stale and dogfooding is moving faster than the validation cadence. (Source: existing 020 follow-up + dogfooding pace.)

- [ ] **AI-client tool-uptake measurement.** Does Claude/Codex now reach for `get_recent_work_context` over `search_memories` for source-anchored queries? V1.5.1's description reframe was meant to fix this; not yet observed in the wild. No code change — just a measurement gap. (Source: dogfooding journal round 4 conjecture C4-D at 00:30 PDT.)

- [ ] **Codex source-prefix retrieval ordering.** Entries 01:04 PDT and 01:24 PDT — `search_memories` scoped to a Codex source-prefix returned raw fs-change rows BEFORE extracted turn rows, even though the codex extractor runs and 1,990 extracted Codex turn rows exist in the local DB. **Re-verify post-022:** Bug C (raw-FS exclude on trace path) + Bug D (filter-before-slice) should help; specifically — does `search_memories(source_prefix="fs:/Users/zhenye/.codex/")` now surface extracted turn rows in the top-N, or do raw fs-change rows still dominate? `search_memories` does NOT pass `exclude_metadata_surface: ['fs']` per spec (forensic searchability preserved), so raw rows still appear — but the filter-before-slice fix should let extracted turns surface even when they're outside the recency overfetch window. (Source: dogfooding journal entries 01:04 PDT, 01:24 PDT, 01:28 PDT.)

