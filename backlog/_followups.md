# Backlog Follow-ups

Deferred fixups and follow-up items surfaced during `/merge-and-cleanup`. Founder converts these into proper backlog items in their next strategist conversation.

---

## ⚠️ Known V1 degraded surfaces

### Cursor capture — `agentKv:` migration (gated, not scheduled)

**⚠️ DIAGNOSIS CORRECTED 2026-05-09 — see `raw/internal/decisions/2026-05-09-cursor-capture-diagnosis-correction.md`.** Empirical SQLite + echo.db probes refuted all three load-bearing claims below: bubbleId/composerData are NOT frozen (1387/1413 composers post-2025-05-01; today's composer has 78 actively-growing bubble entries); agentKv:blob: is content-addressed deduped message-body storage NOT a schema replacement; ECHO IS capturing today's Cursor traffic (657 events today, 932 yesterday). The actual remaining bug is narrower: `cluster.source_breakdown` doesn't reflect cursor activity even when capture is healthy. Item 029 (`backlog/ready/2026-05-09-029-cursor-source-breakdown-falsification.md`) corrects this with a 3-way falsification AC (capture / clustering / truncation). The reactivation gate "founder's stack changes such that they personally use Cursor as a primary AI-coding tool" was triggered 2026-05-09 (founder upgraded to Cursor Pro). The original V1.5.7 framing below is preserved for historical fidelity; do not edit it. Treat the diagnosis as superseded.

**Status:** known-degraded surface in V1, intentionally not scheduled for V1.6 rewrite. Effective 2026-05-01 — Cursor migrated chat storage from `bubbleId:` / `composerData:` (which ECHO's `src/capture/extractors/cursor.ts` reads) to `agentKv:blob:` / `messageRequestContext:`. New conversations after that date are silently invisible to ECHO; legacy bubble rows remain readable but frozen. V1.5.7 (commit `4c6915f`) quieted the `orphan_assistant_bubble` warning spam this caused but did NOT restore live capture.

**Why not scheduled for V1.6:**

1. **Founder's personal stack is Claude Code + Codex, no Cursor.** Cursor capture-quality regressions on a non-dogfooded surface go undetected — this one went 8 days before the V1.5.7 round caught it through infrastructure dogfooding rather than missing-data signal. Shipping the rewrite without a daily-Cursor user in the validation loop just guarantees the next silent break.
2. **Cursor remains in the V1 bundle commitment.** The cohort (indie AI builders) skews Cursor-heavy, so removing Cursor from `wiki/product/v1-spec.md` is a strategic retreat unjustified by founder usage alone. Demoting capture to "known degraded" preserves the bundle while being honest about the gap.
3. **Reversible by design.** Keep ~787 LOC of cursor extractor + 116 LOC adapter + ~933 LOC tests + 345 LOC wiki pages in place; flip back to scheduled priority when a Cursor-using cohort member enters the validation loop.

**Reactivation criteria:** any one of the following gates the `agentKv:` rewrite back into V1.6 priority:
- A Cursor-using cohort member (indie AI builder) commits to ≥2 weeks of daily Cursor + ECHO dogfooding with journal entries on the `mcp-interactions-journal.md` cadence
- The founder's stack changes such that they personally use Cursor as a primary AI-coding tool
- A paying-customer signal: ≥1 prospective $25/mo customer flags Cursor capture as their reason to wait

**What stays untouched until reactivation:**
- All Cursor source code (`src/capture/extractors/cursor.ts`, `src/normalize/adapters/cursor.ts`)
- All Cursor tests + fixtures
- All Cursor wiki pages (now carrying `capture_status: degraded` frontmatter + a top-of-page warning callout)
- Cursor in `SOURCE_APP_VALUES` + the source-app→prefix map
- The `bundle-decision.md`, `target-cohort-indie-ai-builders.md`, `narrowest-v1-scope.md` strategic commitments

**What changed in this designation pass (2026-05-09):**
- `wiki/capture/cursor-extractor.md` + `wiki/capture/per-app/cursor-collected-data.md` — added `capture_status: degraded` frontmatter + top-of-page warning callout
- `wiki/product/v1-spec.md` — added "Known V1 Limitations" subsection naming this gap
- `backlog/_followups.md` (this file) — this section + de-prioritized the rewrite from the V1.6 priority list in the item 017 kill note below

### Multi-agent dev template + product thesis — held pending 030 live test

**Status:** Held 2026-05-10 ~01:30 PDT. Today's cross-tool spec review of item 030 organically demonstrated a **4-role multi-agent development pattern** (strategist + 2 peer reviewers + implementer + founder-as-principal). Founder recognized the pattern is (a) extractable as a reusable template for their other projects AND (b) a credible product seed in its own right. Full conversation archive + extraction shape options + product-angle framing + trigger conditions live at `raw/internal/decisions/2026-05-10-multi-agent-dev-template-and-product-thesis.md` — read that note before reopening this entry.

**Why held now:** Same reasoning as the coordination-layer hold (sister decision, same evening). 030 is the load-bearing V1.6 ship; splitting attention to template/product work would dilute it. The 4-role pattern was demonstrated on ONE spec cycle today — one data point isn't enough to extract a template; the next spec cycle (post-030) will reveal what's load-bearing vs convenience-of-the-day. Product angle requires market validation that doesn't exist yet.

**Reopening criteria (any one fires):**
1. Founder applies the pattern to a second project and finds themselves manually copying files (friction = trigger to extract).
2. A third party asks "how do you set up a project to work this way?" (market-pull signal).
3. The 4-role pattern fires on a second spec cycle with clear differential value (two confirmation cycles = enough to extract).
4. Cohort feedback (post-V1 ship) validates the multi-agent dev workflow as differentiated.
5. A paying-customer signal: ≥1 prospect flags the orchestration pattern as their reason to buy.
6. Competitive landscape shifts (a competitor ships explicit multi-agent orchestration → defensive trigger).
7. Brand-promise upgrade ("agents work as a team") tests well in launch artifacts.

### Coordination layer — held pending 030 live test

**Status:** Held 2026-05-10 ~01:00 PDT. The general multi-agent coordination layer (artifact-state determinism, mutation log + watermarks, lease primitives) was brainstormed in detail today (strategist conversation, Claude Code session `71b36548-...`); founder narrowed scope twice and ultimately deferred. Full conversation archive + decision rationale + trigger conditions live at `raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md` — read that note before reopening this entry.

**Why held now:** Item 030 (`backlog/ready/2026-05-09-030-mcp-toolkit-reshape-and-group-session.md`) is the load-bearing V1.6 ship — group session A primitive (`wait_for_new_turns`) + atomic toolkit decomposition. Splitting attention to coordination work would dilute it. Founder's deferral rule: revisit only when (a) 030 is shipped + ~1–2 weeks live-tested AND (b) the founder is ready to step out of the loop most of the time, OR a concrete trigger fires earlier (see decision note for the 5 trigger conditions).

**Adjacent observation (today's data):** the journal-write race condition fired **5 times today** during the 030 review iteration (3 silent overwrites or near-misses, 2 mtime-guard rejections — see decision note Phase 5 for full mechanics). The asymmetric Edit-vs-Write failure mode means silent data loss is possible on any shared file the moment two agents touch it concurrently. The journal is the highest-contention surface (multi-writer by design per CLAUDE.md), but the same pattern can hit `_followups.md`, `docs/BACKLOG.md`, or any shared wiki page. Strategists should chain `verify → pandoc → git add → commit → push` as a single shell command (not separate steps) to minimize the race window — the practice that recovered today's lost journal entry. **Not adding a narrow journal-only fix yet; founder explicitly held the narrow fix too pending 030 dogfooding evidence.**

**Reopening criteria (any one fires):**
1. Semantic loss from journal race (an entry is silently lost AND not recoverable from agent's session memory).
2. Race spreads beyond the journal to another shared file, silently.
3. 030 ships and founder reaches the "out of loop most of the time" state.
4. Cohort dogfooding reveals collision in the bundle.
5. The narrow journal-shards fix turns out to be non-trivial (semantic conflicts, ordering, dedup).

---

## ✅ Resolved (V1.6 wave — items 030 + 032 + 033)

### MCP retrieval — long-turn elision + envelope caps (RESOLVED end-to-end by 030 + 032 + 033)

**Status:** RESOLVED 2026-05-10 via three shipped items.

- **Trust-bug part — closed by item 030** (merge SHAs `6011d62` / `a6352a4`, 2026-05-10): `truncations: string[]` field now lands on every atom-bearing response (`search_memories`, `tail_session`, `get_atoms`, `wait_for_new_turns`). `[]` ⟺ everything verbatim; `["content"]` ⟺ content was clipped to wire-shape cap; `["metadata.<key>"]` ⟺ per-key cap fired; `["metadata.<key>:projected"]` ⟺ projector reshaped (REFORMATTED not clipped). Consumers can KNOW their response was clipped instead of silently treating it as authoritative. See [[mcp-find-clusters]] / [[mcp-get-atoms]] in the wiki for the contract.
- **First-call reliability part — closed by item 032** (same merge wave): no-args `find_clusters()` auto-expands from 4h to 24h on either empty OR single-source-recent triggers; strict-partition demotion makes `clusters[0]` STRUCTURALLY prior multi-source work, not calling-session noise; `get_atoms(prefer='newest_first')` guarantees the newest atom of the picked cluster lands in the response even when prefix-drop fires.
- **Recovery half — closed by item 033** (merged 2026-05-10 PDT, ~19:48 PDT / 2026-05-11T02:48Z, head `a713cac`): new `get_atom(id)` MCP tool returns content verbatim through MCP — no shell, no JSONL fallback, no composer-id context. Contract: content verbatim + metadata projected (via reused `projectMatch` — `tool_calls` reshape + per-key caps still apply) + embedding excluded. Three exit shapes: success / `atom_too_large_for_wire` (with `source` populated for JSONL fallback) / `atom_not_found` (distinct error class). R2 Finding 1 load-bearing fix: `"content"` is filtered out of `truncations` after the verbatim override, so the trust signal that 030 added doesn't lie on the very tool meant to recover from it. The full elision-recovery loop now closes in-MCP; JSONL fallback is last-resort instead of routine.

**Originating surface evidence:** 2026-05-09 Claude Code strategist thread `71b36548-cf1d-4fe5-9370-b0317f9c4ac0` — `tail_session` returned a load-bearing assistant turn with thousands of middle chars replaced by `bytes_elided` marker, recoverable only from source JSONL on disk. Closes the entry the founder kept open pending 030 verification.

**What still bites (non-blocking):** the per-cluster sourcing concern (legacy concern in this entry) is independent of the trust-bug and recovery surfaces; it's tracked separately under the item 029 source_breakdown fix.

---

## ❌ Killed (won't ship)

### Item 017 — "Wire normalizer into MCP `search_memories` response shape"

**Status:** killed 2026-05-09. Never specced into `backlog/ready/`. Originally deferred from item 016 ("MCP wiring is the next item"); re-deferred by item 018 ("V1.6, informed by trace-layer learnings"); kept Out of Scope by item 022.

**Original 016 proposal:** add `format: 'raw' | 'normalized' | 'both'` to `search_memories`, returning `match.normalized: NormalizedContextEvent` alongside `match.content`.

**Why killed:**

1. **The need has been unbundled.** When 016 wrote the proposal, `search_memories` was the only retrieval tool. V1.5 added `get_recent_work_context` (clustered + normalized atoms in `atoms[id]`) and `tail_session` (sequential, same wire shape). A consumer who hits `search_memories` and wants the normalized shape can chain `tail_session(source=match.source)` — one extra call, but the three retrieval tools stay separable: substring vs. clustered vs. exact-tail.
2. **Reintroduces V1.5 envelope risk.** Normalized atoms add `actors`, `artifacts[]`, `provenance`, `context`, `open_loop_hints[]` per match. The V1.5.6 wire-shape projector (`src/mcp/wire-shape/match.ts`) caps `content` and per-key metadata; it has no slots for the normalized sub-fields. Adding format dispatch either expands the projector (more cap surface to maintain) or lets the budget creep back, undoing V1.5.5/V1.5.6/V1.5.7's three rounds of envelope-overflow closures.
3. **No surfaced consumer demand.** The V1.5 dogfooding journal entries (16:22 / 22:40 / 00:30 / 02:05 PDT through 17:01 PDT) flag substring-tool pain as envelope overflow, fs-watcher noise, TZ-naive parsing, and substring-vs-semantic confusion — all closed. None ask for normalized-from-substring. The 016-era promise predates the trace layer; the substrate it was solving for now exists.

**Reopen criteria:** a concrete consumer (not an abstract API improvement) asks for substring + normalized in one call AND the chained `search_memories` → `tail_session` path is observably insufficient for that use case. Reopen as a narrow `format: 'normalized'` opt-in (no `'both'` — that's the schema-bifurcation trap), single non-default mode, projector-capped, default stays `'raw'`. ~0.5d. Until that surfaces, save the spec slot for the V1.6 priority the journals actually flagged: `get_atom(id, fields?)` deep-dive primitive (the wire-shape elision pattern is implicitly waiting for it). The cursor `agentKv:` extractor rewrite was previously also in this V1.6 list but has been demoted to a gated known-degraded surface — see "Cursor capture — `agentKv:` migration" above.

**Stale references** (historical, do not edit):
- `backlog/complete/2026-05-06-016-read-time-normalizer.md:30, 116, 421, 444` — original deferral
- `backlog/complete/2026-05-06-018-recent-work-context-tool.md:429, 452` — V1.6 punt
- `backlog/complete/2026-05-08-022-v15-2-trace-retrieval-reliability.md:297` — out-of-scope confirmation
- `raw/internal/decisions/2026-05-06-v15-trace-layer-design.md:153` — design-doc note

`wiki/architecture/work-trace.md:258` updated in this kill commit to remove the forward-pointing reference.

---

## 2026-04-30 — from merge of 010-cursor-extractor

- Boot-time workspace-inference scan: walk `workspacePrefix` for existing `state.vscdb` files at startup and prime the composer→workspace map, so the first turn after fresh daemon boot can carry `workspace_id`. (Cursor extractor; addresses agent_notes item 4.)
- Reproducible lag-measurement harness: a privacy-respecting tool the founder can run to count events under `fs:<globalDbPath>` with timestamp deltas, so future lag verification doesn't require re-instrumenting the daemon. (Cross-cutting; touches Cursor + Claude Code extractors.)
- Lag verification (founder-side, ≤2s median over 5 trials) — pending real-Cursor measurement post-merge. (Cursor extractor.)

---

## 2026-04-30 — from merge of 011-claude-code-extractor

- `log.warn("parse_failed", ...)` in `parseLine`'s JSON catch (`src/capture/extractors/claude-code.ts:64`) for diagnosability. Currently silent on parse failures; makes JSONL shape regressions observable. (Claude Code extractor.)

- Bump e2e ordering test `waitFor` budget 5000→10000ms to deflake under full-suite chokidar contention (test-only follow-up). (Claude Code extractor.)
- Lag verification (founder-side, ≤500ms median over 5 trials) — pending real-Claude-Code measurement post-merge. (Claude Code extractor.)
- JSONL shape regression observability — once `parse_failed` warn lands above, this becomes observable rather than silent zero-turn behavior. (Claude Code extractor; subsumed by item 1 above.)

---

## 2026-05-01 — from merge of 014-mcp-search-memories

- Wire `limit: MAX_OVERFETCH` into `storage.query` once storage guarantees timestamp-DESC ordering. Today `searchMemories` loads the entire matching set into memory before sorting/slicing — fine for V1 dataset sizes, becomes O(N) memory at scale. (MCP search-memories tool; cross-cuts Storage interface.)

  > Re-verified 2026-05-08 post-025: `MAX_OVERFETCH = 200` is still exported at `src/mcp/tools/search-memories.ts:11` and still NOT wired into the production storage call after 025's path-aware `limit+1` overfetch refactor. The constant is now genuinely dead code — subsumed by the 025 follow-up bullet ("`MAX_OVERFETCH = 200` dead constant") which proposes the same fix shape (wire it as a defensive cap on the substring path, or delete). Track from there; don't double-count.

- Add `order` / `order_by` to `QueryFilter` once a second consumer needs DESC. Until then the in-tool sort is fine. Worth a Spec Authoring Lesson once the second use case appears. (Storage interface.)

- **Investigate chokidar lifecycle flake** — `cursor.test.ts`, `claude-code.test.ts`, `fs-watcher.test.ts` intermittently time out at 5000ms under parallel load. Different tests fail each run (race, not deterministic regression). Surface area was reduced in chore commit `912ebab` (fs-watcher now ignores Cursor's SQLite triplet; cursor-extractor debounces) but the deeper `watcher.close()` race in chokidar teardown remains. Workaround: `--pool=forks --poolOptions.forks.singleFork=true` masks rather than fixes. (Test-infra item; high priority since the flake will block future merges.)

## From merge of 2026-04-30-015-mcp-integration-test (2026-05-01)

- [ ] Authorize `tests/tools/mcp-integration-smoke.test.ts` via a small backlog item — ~30 LOC Vitest test that spawns daemon (`ECHO_STORAGE=memory` + random port) and execs the smoke script, asserts RC=0. Resolves deferred acceptance #3.
- [ ] Founder writes the week's MCP-demo milestone entry into `docs/STATUS.md`. Operating manual reserves STATUS.md for founder; agent (correctly) refused to touch it during 015.
- [ ] Strategist amends item-spec template: phrase STATUS.md updates as founder-post-merge, not as agent acceptance. Otherwise this conflict recurs every "milestone" item.

---

## 2026-05-02 — surfaced while writing `wiki/capture/per-app/claude-code-collected-data.md`

## 2026-05-04 — surfaced during metadata-normalization branch

- [ ] **Cursor `repo_root` via workspace.json read.** The cursor extractor populates `metadata.workspace_id` (the opaque hash from `workspaceStorage/<hash>/`) but not the canonical cross-source `metadata.repo_root` field. Resolving hash → real folder path requires reading `workspaceStorage/<hash>/workspace.json`'s `folder` URI and decoding the `file://` scheme. Skipped from the metadata-normalization branch because (a) it adds new file I/O on a dirpath we don't currently read, (b) the fallback chain (workspace.json missing → URI not file:// → folder is multi-root) needs its own design pass. Without this, an LLM correlating a Cursor turn against a git commit on the same repo has to fall back to fuzzy content matching instead of exact `repo_root` join. (Cursor extractor.)

- [ ] **Codex `files_referenced` from `apply_patch` payloads.** A survey of real Codex JSONLs shows uniformly shell-driven tools (`exec_command`, `shell`, `shell_command` with `cmd`/`command` string args) and `apply_patch` payloads where `arguments` arrives as an *empty string* in the JSONL — the patch content is delivered out-of-band. There is no reliable structured source of file paths in Codex JSONL the way Claude Code's `tool_use.input` exposes them. Three options when revisiting: (1) regex shell-command parsing (brittle — `cd`, `cat`, redirects), (2) tap the out-of-band patch stream that `apply_patch` actually consumes, (3) accept Codex's gap and rely on git-side `files_referenced` to fill the picture for any file actually written. Most likely (3). (Codex extractor.)

## 2026-05-07 — from merge of 016-read-time-normalizer

- [ ] **Tighten `hostOf` host-suffix matches** in `src/normalize/artifacts.ts:56-63`. Current `host.endsWith('github.com')` would also classify `github.com.evil.com` as `github`. Change to `host === 'github.com' || host.endsWith('.github.com')` (and the same for gitlab/bitbucket). Low practical risk for git remotes today; tighten before any user-controlled URL flows through this. (Normalize artifacts.)

  > Re-verified 2026-05-08 post-025: still open. `src/normalize/artifacts.ts:58-62` unchanged.

- [ ] **Simplify `ObservedState` discriminated union** in `src/normalize/types.ts:73-75`. Today: `{ snapshot; delta?: never } | { delta; snapshot?: never }` — the `?: never` flavor is awkward to construct from generic code (the git adapter test had to navigate it carefully). Drop to plain `{ snapshot: SnapshotRef } | { delta: DeltaRef }`. Behavior-preserving; cosmetic. (Normalize types.)

  > Re-verified 2026-05-08 post-025: still open. `src/normalize/types.ts:73-75` unchanged.

- [ ] **Pre-existing chokidar timing flakes** in `tests/capture/extractors/cursor.test.ts` (3 failures intermittent) and `tests/daemon/lifecycle.test.ts` (1 failure intermittent). Reproduces on `main` with no inbound branch — count varies (3-9 failures across runs depending on box load). Either bump per-test timeout on the chokidar suites or switch them from `waitFor(predicate, ms)` to deterministic synchronization via the extractor's `probeFreshness` handle. Already partially flagged in the 014-mcp-search-memories follow-up section above; this run confirms the issue is still live and now blocks the verify step's signal-to-noise on every merge. (Test infra; high priority — flakes will keep noise-pollution merge verifies until fixed.)

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

  > Re-verified 2026-05-08 post-025: still open. `src/trace/hints.ts:150` unchanged. Note: companion item 016 followup ("Simplify `ObservedState`") would unblock the cleaner narrowing — best to bundle the two when either is touched.
- **Add explicit "earliest" tests** for R1.AQ and R1.TODO to mirror the existing R1.Q earliest test (currently inferred from shared loop structure).
- **One-line UTC-Z invariant comment** in `src/trace/index.ts:202-211` documenting that `compareByOccurredAt` lex-sort ≡ chronological order only under the normalizer's UTC-Z guarantee. Prevents a future change from breaking the assumption silently.
- **Strategist post-merge spec amendment:** spec line 42 prose says "matching by `context.conversation` artifact id" but the actual `NormalizedContextEvent.context` schema has only `visible/selected/ambient` strings. Agent correctly inferred conversation-typed `ArtifactRef` matching by `provider:type:id`. Update spec wording for future readers.
- **R1.TODO snapshot-resolver expansion (decision pending dogfooding):** R1.TODO matches only `state.delta.artifact_id`. Git-commit atoms use `state.snapshot.artifact_id` and won't close TODOs in the current rule. Per spec ("`state.delta.artifact_id`") this is faithful; revisit after dogfooding evidence.
- **R1.AQ user-with-empty-input edge case (validate during dogfooding):** `hasNonEmptyContent` falls back from `input` to `output` for user-role atoms. For sources where the user atom legitimately has empty `input` but non-empty `output` (rare; some cursor extractor cases), this still resolves. Verify in the founder hand-score pass.
- **Quarantine the pre-existing capture/daemon flake** as a separate item: 3 failures intermittent in `tests/capture/extractors/cursor.test.ts` (workspace_id matching, lastSeenMap backfill, stop() timeout) + 1 in `tests/daemon/lifecycle.test.ts` (waitFor timeout). Already flagged from item 019's verification; re-confirmed at 020's merge. Flake fluctuates 3–14 failures across runs.

- **Founder hand-scores the 111 rows** in `raw/internal/dogfooding/020-resolution-validation.md` as TP / FP / TN / FN. If overall precision (TP / (TP + FP)) ≥ 80%, R1 is sufficient for V1 hotkey overlay. Otherwise calibration becomes the next backlog item before the overlay UI is specced.


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


- [ ] **Add explanatory comment at `src/storage/migrate.ts:71`** documenting the `TZ_MARKER_RE` else-branch (defensive for naive rows that bypass the SQL `WHERE timestamp NOT LIKE '%Z'` filter). Logic is correct but non-obvious.

  > Re-verified 2026-05-08 post-025: 🟡 partial — `canonicalizeTimestamps` at `src/storage/migrate.ts:55-60` now carries a 6-line function-level comment explaining the Node-not-SQL choice and the idempotency guarantee, but the inline `TZ_MARKER_RE.test(...) ? ... : ... + 'Z'` ternary at line 71 still has no per-line note explaining why the defense is needed when the WHERE clause already filters. One small inline comment short of done.

- [ ] **Lift cap-hit equality to `>=` storageCap** at `src/mcp/tools/recent-work-context.ts:170` once a `count(filter)` storage method exists. V1.5.3 territory; spec already flagged in Out of Scope.

  > Re-verified 2026-05-08 post-025: still open. `src/mcp/tools/recent-work-context.ts:191` reads `if (events.length === storageCap)`. Strict equality preserved.


### Strategist post-merge

- [ ] **Wiki promotion bundle 019+020+021+022.** Four items' worth of `wiki/architecture/work-trace.md` and `wiki/surfaces/mcp-recent-work-context.md` updates land together. New `wiki/architecture/` page on **timestamp canonicalization at capture** is wiki-worthy (single-chokepoint normalization decision is durable substrate doctrine).
- [ ] **Re-run dogfooding scenarios post-022 + daemon-restart.** Specifically the 01:03 PDT and 01:33 PDT entries from `raw/internal/dogfooding/mcp-interactions-journal.md` — expect `source_breakdown` to include git ≥1 and codex ≥1 on the same window that previously returned `{claude_code: N}` only. If still missing, 022 didn't fully close the cross-source promise and a follow-up item is needed.
- [ ] **Verify migration row-count log surfaces 152 expected rows** on first daemon-boot post-merge against the founder's local DB. The fixup logs `{converted}` via `createLogger('storage.sqlite')`. Daemon was kickstarted at this merge (PID 7319); the log line should appear in daemon stdout if any `-07:00` rows existed.

### Dogfooding-journal surfaced gaps (status verified by Codex 02:05 PDT + Claude Code 02:10 PDT post-022/023)

> **Source:** `raw/internal/dogfooding/mcp-interactions-journal.md` (16 entries through 2026-05-08 02:10 PDT, 4+ AI clients).
> **Verification convergence:** Codex's 02:05 PDT direct daemon+log inspection and Claude Code's 02:10 PDT MCP retrieval landed on the same gap classification on the same window — two reasoning processes from different starting points (one inspecting daemon stdout + SQLite directly; one calling the public MCP surface) converging is structural-correctness signal, similar to the 15:39 PDT day-1 V1-atom-design observation.
> **Status legend:** ✅ closed by 022/023 · 🟡 partial / narrowed (capture fixed; UX or ranking gap remains) · ❌ still open · 🚨 newly surfaced during verification.




- [ ] ❌ **Default 4h window wrong for "where did I leave off" — UNCHANGED.** Codex 02:05: *"Still open by code. Default no-arg window is still now minus 4h."* 022 didn't touch this. Founder/strategist call: change the default, or document the "active-now vs morning-orientation" framing more loudly in the tool description. (Source: dogfooding entry 22:40 PDT.)


- [ ] ❌ **Atom envelope payload floor — UNCHANGED, NOW HIGHEST-LEVERAGE PAYLOAD MOVE.** Codex 02:05: *"Still open. Minimal responses are still large: about 242KB for day `limit=100`, 405KB for round-4 `limit=100`."* Claude Code 02:10 retrieved 105K (trace, limit 50) + 98K (search, limit 10) — both over CC's tool-result budget with `format: "minimal"` already on. Bug C reduced atom *count* but didn't shrink the per-atom envelope (~3-4KB of structural metadata). **Skeleton-only mode is now the candidate spec** — return `id`+`time`+`source`+`artifacts` + `cluster_anchor_summary`; consumer fetches full atom content via `search_memories(id=...)` on demand. Highest-leverage payload move post-022. (Source: dogfooding entry 16:16 PDT round 2, 02:05 PDT, 02:10 PDT.)


- [ ] ❌ **Founder hand-score pass on 020 R1 fixture** at `raw/internal/dogfooding/020-resolution-validation.md`. Unchanged — verdict column still empty across all 111 rows. Half-day founder task; converts inferred precision into measured precision. (Source: existing 020 follow-up, unchanged by 022/023.)

- [ ] ❌ **AI-client tool-uptake measurement — UNCHANGED.** No new evidence on whether Claude/Codex now reach for `get_recent_work_context` vs `search_memories` for source-anchored queries. Today's 02:05/02:10 verification showed both AIs *can* use trace correctly when prompted; uptake-without-prompting is a separate question. (Source: dogfooding round 4 conjecture C4-D, unchanged.)

- [ ] 🟡 **Codex source-prefix retrieval ordering — STILL OPEN by design.** Codex 02:05 + Claude Code 02:10 both verified: `search_memories(source_prefix="fs:/Users/zhenye/.codex/")` recency-only still returns raw fs-change rows first (9/10 matches in CC's call were 194-char raw rows; only 1 carried the actual 6,567-char Codex turn). Per 022's spec, `search_memories` deliberately does NOT pass `exclude_metadata_surface: ['fs']` to preserve forensic searchability — so this is correct-by-spec, not a regression. **Fix shape requires a NEW field**, not toggling Bug C's exclude filter. Candidates: (a) `kind: 'meta'|'data'` discriminator at capture-pipeline level (the P2 alternative from 022); (b) a `prefer_normalized: true` flag on `search_memories` that boosts atoms with rich extractor metadata above raw fs-change rows; (c) per-source-prefix default of "data first, meta on request." Next-spec territory. (Source: dogfooding entries 01:04 PDT, 01:24 PDT, 01:28 PDT, 02:05 PDT, 02:10 PDT.)

### Newly-surfaced gaps from 02:05/02:10 verification


- [ ] 🟡 **Daemon health flap at port level — USER-FACING SYMPTOM CLOSED BY 027, root mechanism still open.** The practical failure mode (Codex calls failing after daemon restart) is closed: stateless transport means there's no per-process session state to lose. But 027 does not address the *underlying* launchd / PID-file race Codex flagged at 02:05 PDT (PID file `7319` vs actual `7333`, port alternating between 'Bad Request' and 'connection refused'). If that race ever produces a window where the new daemon hasn't bound the port yet, calls still fail — just transiently rather than persistently. Investigate-first item still has merit but is no longer P0; demote to V1.5+ reliability cleanup. (Source: dogfooding entry 02:05 PDT.)

- [ ] 🚨 **Trace-ranking gap surfaced as separate item.** From the verified-partial cross-source representation gap above: at `limit=50` Codex appears as a dropped lower-rank cluster even though it's the only representative of its source. Promote to its own spec because the fix is in trace ranking heuristic (`src/trace/cluster.ts` + `src/trace/index.ts`), not in storage or capture. Candidate signals: (a) source-diversity boost — small rank bonus when a cluster is the only contributor of a source not represented in higher-rank clusters; (b) cross-source artifact-join bias — increase edge weight when an artifact connects atoms across distinct source-prefixes; (c) surface dropped clusters' `source_breakdown` in `truncation.dropped_clusters` so the consumer can decide to retry with higher `limit`. Next-spec territory; the `_followups.md` 022 section's "cross-source representation balance" entry was the placeholder. (Source: dogfooding entries 02:05 PDT, 02:10 PDT.)

---

## 2026-05-08 — from merge of 023-chokidar-flake-quarantine

- [ ] **fs-watcher.test.ts Path C successor (~15 min).** The 023 carve-out: agent stayed strictly inside `files_to_modify` and did not quarantine `tests/capture/surfaces/fs-watcher.test.ts > startFsWatcher` despite ~33% solo flake rate. Apply the same Path C `describe.skip` with a `2026-05-08-023`-anchored tracking comment. ~30 LOC, same shape as the 023 changes to cursor.test.ts and lifecycle.test.ts. The 014 section's annotation already pre-lays the breadcrumb. (Test infra; small.)

- [ ] **Chokidar real-fix item (post-V1.5; 2-3d).** Tracking comments at `tests/capture/extractors/cursor.test.ts` and `tests/daemon/lifecycle.test.ts` cite item 023; once 023 lands in `complete/` those references become tombstones unless a successor item exists. Investigate deterministic synchronization via the extractor's `probeFreshness` handle (already flagged in 016 followup) or sentinel-event subscription. The deeper `watcher.close()` race in chokidar teardown is the underlying root cause — quarantine is a holding pattern, not a fix. (Test infra; high priority post-V1.5.)

- [ ] **Optional: grep-anchored CI ship-blocker for V1 cut.** CI fails if `describe.skip` paired with the literal `2026-05-08-023` tracking-comment string is still present in the tree after a target date. Insurance against the quarantine outliving memory and shipping skipped tests in V1. (CI / V1 cut hygiene.)

---

## 2026-05-08 — from merge of 025-mcp-best-practices

### Per-merge cleanup (small, mechanical)



### Code-correctness follow-up (own item)


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

- [ ] **Capture AI-client uptake on the new affordances:** does Claude Code spontaneously use `source_app: 'claude_code'` for app-scoped queries instead of guessing FS prefixes? Does pagination via `next_cursor` get used at all, or do consumers default to wider `until` filters? Two more dogfooding entries' worth of signal needed before deciding whether the affordances are working as intended.

### From 028 dogfooding context (2026-05-08 15:54 PDT post-026+027 round)


### From 16:14 PDT post-Bugs-A+B-merge live verification (third round)


### V1.6 candidates (surfaced post-V1.5 cap-stone, 2026-05-08 17:05 PDT)

The four MCP envelope-overflow bugs from this dogfooding window are CLOSED for the surface-retrieval atom path. The 17:01 PDT v1.5-livetest round surfaced new gaps that belong to V1.6:

- [ ] **Bug 3.1 — `get_recent_work_context` skeleton-mode overflow at `limit=100`.** Skeleton was sized against the 15:54 PDT 30-atom fixture (~12k chars, 3% headroom under 12,500); at `limit=100` and 273 atoms in the dominant cluster, the per-cluster `atom_ids[]` array (~10KB at 273 ids) plus `open_loop_hints[]` (one entry per atom with hints) overflows even after the per-atom skeleton stripping. Spec needed: per-cluster bounds — cap `atom_ids[]` and `open_loop_hints[]` length, or split a single huge cluster into multiple cluster-page responses. Pre-existing 028 review note flagged the headroom risk: *"3% headroom is a future flake risk if atom shape grows"* — and "atom shape grows" turned out to also mean "atom *count* grows." Surfaced 17:01 PDT.
- [ ] **Stage-2 deep-dive primitive: `get_atom(id, fields?)`.** The missing tool that makes elision acceptable as default. V1.5.6/V1.5.6.1 surface tools tag elided/projected fields via `metadata_keys_elided` / `metadata_keys_projected`; consumers know which keys to drill into but have no way to retrieve the original. `get_atom(id)` returns the full unelided CaptureEvent for a specific atom (or specific fields). Mirrors the existing tool registration pattern. Founder-deferred from V1.5.
- [ ] **USER-aware content clip.** ECHO's content format is always `USER: <q>\n\nASSISTANT: <a>`. USER turns are typically short; ASSISTANT turns are the long ones. Today the wire-shape projector applies head+tail to the whole content string, which can lose the question on long-USER edge cases or lose the answer's middle on long-ASSISTANT turns. Improvement: parse the structure, keep USER verbatim, head+tail clip only ASSISTANT.
- [ ] **`metadata.layer:'content'|'meta'` positive-marker convention.** Bug B is mechanically closed via `exclude_metadata_surface:['fs']` in all three retrieval tools, but that's a negative-list maintenance burden. Adding `metadata.layer` at every emission point (`'meta'` for fs-watcher, `'content'` for extractors) makes the convention declarative; future capture surfaces opt in by setting `layer:'meta'` and every retrieval tool default-filters on `'content'`.
- [ ] **Generalised shape-aware projector registry.** V1.5.6.1 adds a specialised projector for `tool_calls` (name trajectory). If `files_referenced`, `actors`, or future variadic metadata fields need similar treatment, the pattern is: add a projector to `src/mcp/wire-shape/`, dispatch in `match.ts:projectMatch` before the standard cap. Alternatively: a registry-driven dispatch (`SHAPE_PROJECTORS: Record<string, Projector>`) so adding a new projection is one entry, not a new dispatch line.
- [ ] **Gap 2 Layer 1 — Cursor migrated to `agentKv:blob:` schema on 2026-05-01.** Bubble layer is FROZEN since May 1. Today's Cursor activity goes to `agentKv:blob:` (256 entries, JSON `{content, providerOptions, role}`) + `messageRequestContext:` (96 entries, per-bubble request metadata). ECHO's existing `cursor.ts` extractor is fundamentally obsolete for new conversations. V1.6+ scope: full extractor rewrite against the new schema. Diagnosis live-probed and documented in mcp-interactions-journal.md 2026-05-08 20:55 PDT entry.
- [ ] **Wiki page: `wiki/operating-model/legacy-echo-memory-cleanup.md`.** Document the EchoChat → Project_echo MCP migration, the dual-registration finding from item 025 + Gap 1, and the un-registration procedure. Prevents the same finding from being re-discovered in a third dogfooding round.

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

### From 029 merge (2026-05-09-029-cursor-source-breakdown-falsification)

- [ ] **Cursor adapter narrow-emission enrichment.** Cursor atoms emit only `conversation:cursor:<composer_id>` — no file/repo artifact — so they're structurally always-sibling-clustered against claude_code/git/codex even in a shared workspace. This is the architectural reason 029's bug bucket was (c) truncation and not (b) clustering. Item to enrich the cursor adapter with `workspace_id`-derived repo artifact (or workspace.json read per the 2026-05-04 entry below) so cursor can join the rank-1 cluster when the user is editing files in that workspace. Source: 029 reviewer judgment, run log lines 226–227.
- [ ] **Cursor capture-cadence gap (NOT item 030).** 029 Phase 1 measurement on the test composer (an agent-mode composer with both messageRequestContext: rows AND composerData/bubbleId rows) showed legacy bubbleId capture is active but cadence-limited: 12 atoms captured at composer creation in a 110ms initial burst, but ~52 subsequent bubble pairs over 80 minutes did NOT produce additional events. This points at extractor debounce / WAL-poll cadence, NOT an `agentKv:` schema gap. Item 030 (agentKv: extraction) explicitly remains deferred — this is its own item if dogfooding signal accumulates. Source: 029 run log lines 215–221, agent_notes 030-deferral observation.
- [ ] **Real-`echo.db` skeleton test for `truncation.source_breakdown`.** 029's regression test used a synthetic 3-cluster fixture (correct call given bug class is truncation arithmetic, not envelope-byte-density). To catch any future shape-density-shaped regressions in this code path, mirror item 028's pattern with a real-DB fixture asserting the new field's shape. Non-blocking — the synthetic test already gates the arithmetic bug. Source: 029 reviewer judgment 3 caveat.
- [ ] **AI-client docs update for `truncation.source_breakdown`.** Wiki MCP-tool-response-shape page (`wiki/surfaces/mcp-recent-work-context.md` if it exists post-028, or wherever the response contract is documented) should call out `truncation.source_breakdown` as the authoritative "what sources were active in this window" field, with `cluster.source_breakdown` documented as cluster-scoped. Real semantic shift from 029: consumers must now read both fields. Strategist task alongside the wiki demotion-reversal already in 029's "After Completion" notes.
- [ ] **Phase 3 live verification for 029 (post-merge action).** Founder runs Cursor for ≥30 min of normal activity (any mode — Ask, Agent, Composer). Then any client calls `mcp__echo__get_recent_work_context()` (no args, default 4h window) and confirms `response.truncation.source_breakdown.cursor ≥ 1`. Daemon was kickstarted at merge time so vite-node has loaded the patched code. Log result to `raw/internal/dogfooding/mcp-interactions-journal.md` per the 6-field template — "ECHO sees Cursor again at the response level" is the closure entry. This satisfies acceptance bullet 3 of item 029, deferred from the agent run because the builder was Claude Code not Cursor's Claude.

### From 030 merge (2026-05-09-030-mcp-toolkit-reshape-and-group-session)

- [ ] **Profile `get_atoms` deterministic-drop loop O(n²) `JSON.stringify(tentative)` cost on a 50-id large-body fixture.** Loop at `src/mcp/tools/get-atoms.ts:188-241` rebuilds the full tentative envelope per accepted atom; bounded but obviously O(n²) on the cumulative byte count. Bound is small (cap=50, ~25k stringify per iter) and run log line 144-146 acknowledges the trade-off. If profiling shows it dominates wall time on real call traces, switch to a running-sum byte approximation. Source: 030 round-2 reviewer judgment.
- [ ] **File item 031 (remove `get_recent_work_context`) after ≥1 week of dogfooding.** Spec'd in 030's "After Completion" §5. Conditional gate: the new toolkit must cover all real founder resume patterns AND consumers must be observed exercising the judgment-between-calls step (not blind `clusters[0]`). The judgment-step gate is added per the AC10c synthesized-entry conjecture in `raw/internal/dogfooding/mcp-interactions-journal.md` — if the judgment step is skipped in practice, the decomposition's load-bearing claim degrades to "compound but with worse ergonomics" and item 031 should not land yet. Estimate: 0.5d.
- [x] **Strategist wiki promotion for 030 (post-merge action).** ✅ DONE 2026-05-10 ~16:40 PDT (consolidated with 032 promotion in one pass). Four new pages landed: `wiki/surfaces/mcp-find-clusters.md`, `wiki/surfaces/mcp-get-atoms.md`, `wiki/surfaces/mcp-wait-for-new-turns.md`, `wiki/architecture/group-session.md`. Updated: `wiki/surfaces/mcp-server.md` (7-tool table, V1.6 atomic toolkit framing), `wiki/surfaces/mcp-recent-work-context.md` (top-of-page deprecation banner + migration recipe), `wiki/architecture/system-architecture.md` (ASCII tool list + V1.5→V1.6 toolkit shift paragraph). Moved "MCP retrieval — long-turn elision + envelope caps" from "Known V1 degraded surfaces" to the "✅ Resolved" subsection above.
- [x] **Promote `wiki/operating-model/cross-tool-spec-review.md` from candidate to definite-after-030-ships.** ✅ DONE 2026-05-10 ~15:55 PDT — page landed at `wiki/operating-model/cross-tool-spec-review.md` covering the pattern + 4-role allocation + findings classes + strategist self-review checklist + verdict-convergence signal + cost/value + evidence base (~10 cycles across items 030 and 032). Trigger evidence expanded by end of day to SIX independent confirmation cycles (R1 spec review 030 ×3, R1 code review 030, R1 spec review 032, R2 spec review 032, R3 spec review 032). Manifest + wiki/index.md regenerated.
- [ ] **Operating-model note for future builders: pre-list wrapper-Storage adapters in `files_to_modify` when the spec adds a `Storage` interface method.** Item 030 added `Storage.getByIds` (in scope per spec) but the three wrapper-Storage adapters (`tools/render-trace.ts`, `tools/serve-trace.ts`, `tools/stream-watch.ts`) and the smoke-script tool-count assertion (`tools/mcp-integration-smoke.sh`) needed mechanical updates that weren't in `files_to_modify` — the agent had to flag them in `agent_notes` as drift-rule edge cases for founder review. Drift-rule fix: when a spec adds an interface method, the claiming agent runs `grep -lr "implements Storage" tools/` (or equivalent for the affected interface) and adds those files to `files_to_modify` at claim time. Either patch `docs/AGENT_INSTRUCTIONS.md` with this rule or document it in the standard claim-time checklist. Source: 030 round-1 reviewer judgment.
- [ ] **Real-call before/after dogfooding entry for 030 (post-merge action).** AC10c was closed during `/merge-and-cleanup` with a `[SYNTHESIZED]` journal entry (run log lines 274-294 reformatted into the 6-field template, clearly tagged as fixture data not real call). Per "lossy in-the-moment honesty" discipline, a real before/after entry should land in `raw/internal/dogfooding/mcp-interactions-journal.md` the next time founder runs the new toolkit on a real morning resume. The synthesized entry is design proof; the real entry will be field evidence. Founder action when next dogfooding session lands.

### From 032 merge (2026-05-10-032-m2-first-call-reliability)

- [ ] **Dogfooding verification for 032 (post-merge action, After Completion §1).** Founder or strategist reruns the 2026-05-10 13:06 PDT chain — no-args `find_clusters()` after a multi-hour gap — and logs to `raw/internal/dogfooding/mcp-interactions-journal.md` whether: (a) `[AUTO_EXPAND] single-source-recent` warning fires, (b) `clusters[0]` is prior multi-source work (not the calling session's noise), (c) `get_atoms(picked.atom_ids, prefer='newest_first')` returns the newest atom of the prior work session (not dropped). Daemon was kickstarted at merge time so vite-node loaded the patched code. This closes the empirical loop on the M2-1 + M2-2 friction that motivated the item.
- [ ] **Stricter contract on `rank.ts` `demote=true` + `nowMs=undefined`** — currently silently no-ops at `src/trace/rank.ts:139-140`. The only in-tree caller (`recent-work-context.ts:502`) always passes `nowMs`, but the silent degeneration is a latent footgun for future callers that flip the flag without reading the doc. Consider `throw` for stricter contract. Non-blocker. Source: 032 round-1 reviewer judgment.
- [x] **Strategist wiki promotion for 032 (After Completion §2-§5).** ✅ DONE 2026-05-10 ~16:40 PDT (folded into 030 promotion pass, single pass per the predecessor-dependency note below). New `wiki/surfaces/mcp-find-clusters.md` includes the "Auto-expand triggers" + "Strict-Partition Demotion" sections covering 032's M2-1/M2-2 friction fixes. New `wiki/surfaces/mcp-get-atoms.md` includes the "Resume-Call Usage" section covering `prefer='newest_first'` + missing-ID position + duplicate-collapse asymmetry. New `wiki/architecture/group-session.md` includes a "First-Call Reliability Gate (item 032)" section noting the gate is now closed for resume-after-gap. The M2-1/M2-2 friction entries were folded into the "✅ Resolved" subsection above as part of the long-turn-elision Resolved block; the friction's empirical closure entry will land in `mcp-interactions-journal.md` when founder runs the post-merge dogfooding verification (still owed — see entry above).
- [ ] **Re-evaluate item 031 (`get_recent_work_context` removal) readiness after ≥1 week of post-merge dogfooding entries.** Both gates now have shipped fixes: 030's judgment-step gate AND 032's first-call-reliability gate. The 031 strategist conversation should evaluate both gates together against the dogfooding log.
- [ ] **Extend `wiki/operating-model/cross-tool-spec-review.md` with an "AC3 ⇒ multi-tool implementation review required" rule.** The page already landed today (see the `[x]` entry above), but currently covers the spec-review pattern. The 032 round-1 → Codex round-2 sequence is the **second** implementation-review cycle where Codex caught AC-class issues single-tool Claude reviewer missed (first was 030 round-1 + envelope-ceiling bugs). Add a section codifying: when an item's acceptance criteria include AC3-class user-facing documentation requirements (description strings, tools/list metadata, migration recipes), require a multi-tool implementation review before merge. 7th confirmation cycle of the broader pattern; 2nd at the implementation-review level.
- [ ] **Optional Cursor third pass on 032 implementation.** Codex caught the 2 AC3 description-drift issues. The Cursor angle remains untested at the implementation level. Specific questions: (a) does the strict-partition primary key in `rank.ts:139-156` interact correctly with the existing `cluster_id` tiebreaker when both partitions have identical 5-key signals; (b) does the `as_requested` early-return in `get-atoms.ts:170-172` actually preserve dup-returns-dup semantics when input has duplicates straddling missing IDs; (c) any AC1/AC2 implementation drift Codex didn't probe. Defer until founder has Cursor session time; non-blocker.

### From 033 merge (2026-05-10-033-full-atom-recovery)

- [x] **Strategist wiki promotion for 033 (After Completion §1-§5).** ✅ DONE 2026-05-10 ~19:55 PDT. New `wiki/surfaces/mcp-get-atom.md` landed covering content-verbatim + metadata-projected + embedding-excluded contract, three exit shapes (success / `atom_too_large_for_wire` / `atom_not_found`), R2 truncations-correctness fix, canonical recovery pattern. `wiki/surfaces/mcp-server.md` 7→8 tools (new row + framing paragraph updated). `wiki/architecture/system-architecture.md` ASCII tool list + V1.6→V1.6.1 paragraph updated. `wiki/operating-model/cross-tool-spec-review.md` "Findings classes" gained a "Recovery primitive for elided reviewer responses" sub-block referencing `get_atom`; "Cost / value" gained a "Cost reduction from V1.6.1 recovery primitive" paragraph; "Evidence base" gained 033 R1 + R2 entries (divergent-verdict + Gate 4 self-failure findings). M1-3 already in "Resolved" subsection from merge — confirmed in place.
- [ ] **Dogfooding verification for 033 (post-merge action, After Completion §1).** Next time a Codex (or other long-turn) MCP response comes back with `truncations: ["content"]`, the strategist (or any AI client) should call `get_atom({id: <elided-atom-id>})` instead of `jq` against the JSONL. Log to `raw/internal/dogfooding/mcp-interactions-journal.md` documenting whether the response returned verbatim or hit `atom_too_large_for_wire` — both outcomes are useful data.
- [ ] **Re-evaluate item 031 (`get_recent_work_context` deprecation) readiness.** 033 closes the M1-3 dependency that implicitly blocked comfortable deprecation. After 033 ships and ≥1 dogfooding verification entry lands, the strategist 031 conversation should re-evaluate the deprecation gate alongside 030's judgment-step gate + 032's first-call-reliability gate.
- [ ] **Dead-code manual `id` validation at `src/mcp/tools/get-atom.ts:103-107`** (redundant with zod `min(1)`). Could be removed if direct (non-MCP) callers of `getAtom` rely on the caller for validation. Non-blocker; defer pending decision on direct-caller contract. Source: 033 code-reviewer.
- [ ] **Incidental Prettier reformatting in shared test files.** 033 merge included whitespace-only reformatting of `tests/mcp/tools/recent-work-context.test.ts` and `src/mcp/server.ts:36-38` — harmless, no semantic impact, but bloats historical diff. Consider enabling pre-commit Prettier across repo so this isn't a recurring side-effect of touching shared files. Source: 033 code-reviewer.
- [ ] **Adopt the proposed Gate-4 strengthening from spec Review Round 2** (mandatory re-grep after every contract-revision patch). The 033 R1→R2 cycle was the 8th confirmation cycle of the dependent-section-drift pattern, and the first where the strategist self-review checklist's Gate 4 was claimed ✅ on a post-patch state without re-running. Strategist proposed adding to `wiki/operating-model/cross-tool-spec-review.md` "Strategist self-review checklist": when a patch changes contract vocabulary, grep the whole spec for the OLD contract's load-bearing terms and record the grep command in the commit message. Pending founder approval.

### From 034 merge (2026-05-10-034-cursor-capture-coverage)

- [ ] **AC4 dogfooding (post-merge founder/strategist).** Run two Cursor agent-mode review sessions; apply the AC4 capture-rate formula; log to `raw/internal/dogfooding/mcp-interactions-journal.md`. If real-world `toolFormerData` shapes from agent-mode sessions do not match the inferred precedence in `tryExtractToolFormerText` (`text → result → rawArgs → stringified params`), file a narrow follow-up item to re-tune. Daemon was kickstarted at merge time so vite-node loaded the patched extractor; the periodic re-poll is now live on every Cursor session.
- [ ] **AC5 strategist wiki promotion for 034 (After Completion §1-§3).** Update `wiki/capture/cursor-extractor.md` with cadence (periodic re-poll, WAL-family mtime guard) + bubble-shape (tool-call fallback chain) subsections. Update `wiki/capture/per-app/cursor-collected-data.md` to add a `bubble_text_sources` field row + `metadata.bubble_text_sources` capture-layer documentation. Flip the "Cursor capture-cadence gap" entry in `_followups.md` (originally from 029) to resolved with this merge SHA. Mention the WAL-family mtime guard as a reproducible pattern for any future SQLite-watched surface.
- [ ] **Re-evaluate item 029 (`cursor-source-breakdown-falsification`) closure.** 029 surfaced the capture-cadence gap as a follow-up; 034 closes it structurally. After AC4 dogfooding lands ≥1 capture-rate measurement, the 029 follow-up "Cursor capture-cadence gap" can be marked resolved with empirical evidence.
- [ ] **`triggerRepoll` race self-coalescing (optional, non-blocking).** Two concurrent ticks could pass the `maxGlobalDbFamilyMtime` guard with the same `current` value and both enqueue; correctness already holds via `lastSeenMap` idempotence (the second scan finds no new bubbles), but a minimal `inFlight: boolean` guard would dedupe the wasted DB scan. Microsecond-scale cost in practice. Source: 034 code-reviewer.
- [ ] **Cosmetic log-field-name divergence.** Implementation uses `reason` on the `handleGlobalChange` entry log; R1 finding's text said `tick_reason`. Spec body was generic. If any downstream log-grep parses this field, rename; otherwise leave. Source: 034 code-reviewer.
- [ ] **`safeMtimeMs` vs `maxGlobalDbFamilyMtime` stat-failure asymmetry** (`src/capture/extractors/cursor.ts:480` vs `:491-503`). Legacy `safeMtimeMs` returns `Date.now()` on stat failure; the new `maxGlobalDbFamilyMtime` returns 0. Both behaviors are correct as scoped, but the divergence is worth noting if a future refactor unifies them. Non-blocking. Source: 034 code-reviewer.
- [ ] **Re-evaluate `agentKv:` migration follow-up gating.** The "Cursor capture — `agentKv:` migration (gated, not scheduled)" entry at the top of this file (under "Known V1 degraded surfaces") was originally diagnosed pre-2026-05-09 (later corrected). 034 ships the capture-cadence + bubble-shape fixes for the EXISTING `bubbleId:` / `composerData:` schema; it does NOT address the future `agentKv:` migration. Reactivation gate (founder upgraded to Cursor Pro 2026-05-09) is still triggered; 034's AC4 dogfooding evidence may help re-prioritize the `agentKv:` work for V1.6.2+.

- [ ] **🔴 KNOWN GAP — Cursor multi-cluster agent runs: follow-on bubbles silently dropped (item 036 candidate; surfaced by 034 AC4 dogfooding, 2026-05-10 23:17 PDT).** **Discovered during the AC4 dogfooding run on fresh composer `4f02b335-4b1d-4bd1-a9fa-2e0d76ae5e56`.** The composer had 1 user message + 26 consecutive assistant bubbles (a typical Cursor agent-mode run with ~10 tool calls). 034's periodic re-poll fired at 15s and captured the first 11 bubbles as ONE atom (40,601 chars). Cursor continued writing 15 more assistant bubbles (still answering the same user question). The next cadence tick found `lastSeenMap[4f02b335] = 70975526` (an assistant bubble); the V1.5.7 streaming-continuation fast-forward at `cursor.ts` `extractCursorTurns` lines 402-409 (explicitly preserved in 034's Out-of-Scope) silently skipped all 15 follow-on assistant bubbles as "streaming continuations." Lost content from this single test conversation: Cursor's analysis paragraph ("There are two overlapping threads..."), action narration ("I'm appending a short dogfooding journal entry..."), and the **verdict turn** ("ECHO says the latest real state is: `034` landed and was merged as `7362d88`...").

  **Why it happens:** Cursor's agent-mode runs typically take 20-60s to write all bubbles for one user question. 034's cadence is 15s. So agent-mode runs basically always cross at least one tick boundary, and the second-half bubbles arrive after a checkpoint that lands on an assistant. V1.5.7's fast-forward then drops them as orphans. The bug isn't 034's two fixes (those work correctly for the first cluster); it's that V1.5.7's silent-skip is being asked to handle a class of cases it wasn't designed for (legitimately-new content arriving after a partial-cluster capture).

  **Reproduction:** any Cursor agent-mode conversation longer than ~15s end-to-end exhibits this. Single-turn agent runs split into "first N bubbles captured, rest dropped." Multi-turn agent runs (user + agent + user + agent) capture each turn's first cluster but drop follow-ons.

  **Empirical scope:** the AC4 capture rate on this composer was 10/21 = 47.6% (P1 territory per the formula). But the math is misleading — the 10/11 hit rate on the **first cluster** is structurally correct; the missing bubbles all come from V1.5.7's silent-skip, which is a separate gap. For *non-agent-mode* Cursor (regular chat, one assistant bubble per user message), 034 alone hits ≥90% cleanly.

  **Why not fixed in 034:** 034's Out-of-Scope explicitly preserved V1.5.7's streaming-continuation fast-forward ("Do NOT reduce `orphan_assistant_bubble` warning frequency further... That fix stays"). The intent was to avoid scope creep. Empirically, the V1.5.7 logic is now actively defeating 034's intent on the most common Cursor usage pattern (agent mode).

  **Item 036 candidate spec shape — three options for the strategist conversation:**
  - **Option A — Continuation atom emission.** When the post-checkpoint walk finds consecutive assistants without an intervening user, emit a follow-on atom (with `metadata.continuation_of: <prior_atom_id>` or similar). Append-only-friendly; multiple atoms per logical turn require consumer-side join logic.
  - **Option B — Hold-the-pairing-open.** Don't emit the atom on first tick; wait for the next user bubble OR a configurable timeout. One merged atom per logical turn. Latency cost: ECHO doesn't see the turn until Cursor is done streaming OR the timeout fires.
  - **Option C — Update-in-place re-emission.** Re-emit the same atom with the growing `assistant_bubble_ids[]` list. Cleanest semantics but **breaks ECHO's append-only substrate model** — not viable without a major architectural change.

  **Strategist lean: Option A.** Append-only compatible, low latency, and the join key (`composer_id + overlapping assistant_bubble_ids[]`) is already present in metadata. Confirm during the 036 strategist conversation.

  **References:**
  - `raw/internal/dogfooding/mcp-interactions-journal.md` 2026-05-10 23:30 PDT entry — empirical walkthrough with bubble-by-bubble breakdown of composer `4f02b335`.
  - `src/capture/extractors/cursor.ts` `extractCursorTurns` lines 402-409 (V1.5.7 streaming-continuation fast-forward) — the function to revise.
  - `backlog/complete/2026-05-10-034-cursor-capture-coverage.md` Out-of-Scope section — the explicit preservation that this gap surfaces.

  **Workaround until 036 ships:** for AC4-style dogfooding verification, use a non-agent-mode Cursor composer (simple chat without tool calls — single assistant bubble per user message). Single-cluster turns avoid the V1.5.7 path entirely; 034's two fixes work cleanly there. For real cross-tool spec review (which is agent-mode by nature), the SQLite-probe recovery chain (R1+R2 of 034+035) remains the workaround.

  **Strategic priority:** HIGH — without 036, the M1-1 capture-coverage demo bar (≥90% on agent-mode composers) is structurally unreachable, which means the V1.6.x "ECHO captures Cursor review content" narrative is incomplete. Spec next, parallel with item 031 deprecation conversation, or as the immediate-next-item after the 034+035 wiki promotion lands.


---

## From 036 merge (2026-05-11)

- **AC4 dogfooding (founder / strategist)** — schedule within 60 s of next Cursor agent-mode session: ≥ 3 tool calls in a single turn, then `mcp__echo__search_memories(query=<verdict-phrase>, source_app='cursor')` should return ≥ 1 match. Target ≥ 90 % capture rate per 034's formula. Log to `raw/internal/dogfooding/mcp-interactions-journal.md`.
- **031 deprecation gate (strategist)** — after 036 merge + ≥ 1 week of post-merge agent-mode dogfooding evidence, trigger the 031 deprecation conversation per the gating rule in this file's 031 entry. ETA ~2026-05-18.
- **Wiki promotion (strategist)** — promote 036's "After Completion" notes to `wiki/capture/cursor-extractor.md` (Multi-cluster continuation atoms subsection) and `wiki/capture/per-app/cursor-collected-data.md` (two new metadata rows: `is_continuation`, `continuation_of_assistant_bubble_id`).

---

## From 037 merge (2026-05-11)

- **Inline comment in `src/mcp/util/repo-path.ts`** near `assertAbsoluteRepoPath` documenting that the `<toolName>: ` error-prefix convention is load-bearing — `find-clusters.ts:317-321` and similar isError envelope wrappers depend on it for validation-error → MCP-isError conversion. Coupling-by-string-prefix is fragile; the comment makes it discoverable.
- **(Optional) `findGitAncestor` deep-path latency observability** — instrument with a max-depth counter in dev mode so a future regression on deeply-nested file paths is observable. Today's Stage 2 file-walk uses up to N synchronous `statSync` calls per turn before the cache populates; acceptable today, deserves a hook.
- **AC7 dogfooding (founder)** — owed post-merge per spec section §AC7. Run all six retrieval calls with `repo_path=/Users/zhenye/Desktop/Project_echo` from a fresh Cursor agent-mode turn (no workspace binding); confirm `composer_resolved` is ABSENT on the Cursor `tail_session` call (its presence indicates AC1's repo_root write didn't land for fresh composers — regression). Repeat with `repo_path=/Users/zhenye/Desktop/Projects/isr-demo-mohsen` to confirm zero cross-project bleed-through. Log to dogfooding journal. Second-day run on a different day closes M1-2-A.
- **Wiki promotion (strategist, post-dogfooding)** — promote 037's "After Completion" §1 notes:
  - Update `wiki/surfaces/mcp-tail-session.md` — `repo_path` is no longer Cursor-only; document the uniform parameter across all source_apps.
  - Create `wiki/surfaces/mcp-search-memories.md` (currently absent — `tools/list` is today's only authoritative shape source). Document `repo_path` from the start.
  - Update `wiki/architecture/storage.md` — `METADATA_MATCH_KEY_WHITELIST` now includes `repo_root`; document the work-artifact-as-first-class-retrieval-predicate rationale.
  - Draft new principle page `wiki/principles/work-artifact-first-class.md`.
- **Item 038 (RC2: MCP toolkit atomicity refactor)** is already in flight on `backlog/ready/` (see `2026-05-11-038-mcp-toolkit-atomicity-refactor.md` — the 5-6-primitive reform shape from the 3-way root-cause investigation). 037 was the prerequisite RC1 closure.
- **TZ-naive rejection (RC3)** stays in this file as a 30-LOC follow-up; rolls into 038 if convenient (same retrieval-tool surface), otherwise standalone.

---

## From 038 merge (2026-05-12)

- **Strategist files `2026-05-17-XXX-recent-work-context-final-removal.md`** per 038 AC3 After-Completion #6. The 2026-05-17 calendar gate fires; the item covers:
  - Delete the re-export shim at `src/mcp/tools/recent-work-context.ts`.
  - Remove `registerRecentWorkContext` import + call in `src/mcp/server.ts`.
  - **Critical — re-home `SKELETON_CLUSTER_OPEN_LOOP_HINTS_CAP`** before deleting the shim. Today `src/mcp/tools/find-clusters.ts:35` imports it from the shim file. Move to `src/mcp/internal/cluster-engine.ts` (canonical home) OR a new `src/mcp/util/cluster-caps.ts`. Without this, deleting the shim breaks `find_clusters` at compile time.
  - Update `tools/mcp-integration-smoke.sh`: drop the `get_recent_work_context` references; update tool count from 8 to 7; add an "tools/list MUST NOT include recent_work_context" assertion (post-removal invariant, mirroring the 038-shape for tail_session).
  - Update `docs/mcp-integration.md`: drop the `get_recent_work_context` line; update "All eight" → "All seven".
  - **Founder-consent receipt section** (Cursor R1 refinement #3 format): cite original 031 gate criterion (≥1 week post-030 dogfooding from 2026-05-08 = 2026-05-15 calendar gate; conservative 2026-05-17 = ≥1 week post-034+035 from 2026-05-10), empirical signal at draft time (`grep -c "get_recent_work_context\|getRecentWorkContext" raw/internal/dogfooding/mcp-interactions-journal.md` — expected zero since 2026-05-09), and the decision date.

- **AC6 dogfooding (founder, post-merge)** — restart ECHO daemon (today's kickstart returned non-running per `launchctl list` — may need manual `npm run daemon` start), then run a real daily workflow citing post-038 tool names: `echo_resolve_mru({sources: ['cursor'], repo_path: X})` → `search_memories({source: desc.source, ...desc.filter})` for tail; `wait_for_new_turns({sources: [...], since: now})` → `get_atoms(turn_ids)` for live watch. Demo bar per spec §AC6: ≤2 MCP calls per logical workflow step on the post-038 toolkit. Instinctive `tail_session(...)` muscle-memory hitting missing-tool error is the empirical migration-cost signal — log to journal.

- **ECHO daemon launchd status check (founder, immediate)** — `launchctl kickstart -k gui/$(id -u)/com.echo.daemon` returned exit 0 at 038 merge time but `launchctl list | grep echo` showed `-	1	com.echo.daemon` (loaded, last exit 1, not running). Either the launchd plist needs fixing OR daemon should be restarted manually (`npm run daemon` from `~/Desktop/Project_echo`). Until restarted, the next dogfooding call will run against pre-038 code (still advertising `tail_session`).

- **Cursor R4 LOW V2+ hardening note** — `src/mcp/tools/echo-resolve-mru.ts:117-119` Cursor Phase 2 picks the global newest cursor source (no composer-id scoping in the query), then attaches `metadata_match.composer_id` to the descriptor. This is a faithful port of pre-existing `main:src/mcp/tools/tail-session.ts:351-358` behavior — single-Cursor-install assumption holds for V1 indie-AI-builder cohort. Track for V2+ multi-Cursor-install hardening; not a 038 drift.

- **Wiki promotion (strategist, post-dogfooding)** — promote 038's "After Completion" notes:
  - Update `wiki/surfaces/mcp-server.md` — toolkit shape after 038 is 8 tools; after the 2026-05-17 follow-up it becomes 7. Document `echo_resolve_mru` as the canonical MRU resolver returning search-ready descriptors. Document the IDs-only contract on `wait_for_new_turns`. Document the descriptor-spread compose pattern (`echo_resolve_mru → search_memories(source=desc.source, ...desc.filter)`).
  - DELETE `wiki/surfaces/mcp-tail-session.md` if it exists post-035 promotion.
  - Draft new principle page `wiki/principles/atomic-primitives-compose.md` — the principle that surfaces from RC2, contrasted with the deferred e2e tools.

- **Spec-template enhancement candidate** — AC2's grep-scan invariant scope (`rg "tail[_-]session" src/mcp/`) missed references in `tools/` + `docs/` that Codex R4 caught post-build. Future spec-templates with "kill a tool" semantics should consider scoping grep-scan invariants to project root OR explicit-enumerated dirs (tools/, docs/, .github/) so CI scripts + documentation drift get caught at spec-time, not post-build.

- **Cross-tool review pattern observation** (Cursor R3 commentary in 038 review history): structural reforms (037, 038) consistently need 3 review rounds (R1 catches load-bearing drift, R2 catches second-order implications, R3 cleans sweep incompleteness). Narrow features (032, 033, 035) settle in 1-2. Two data points so far; one more confirming case would lock the pattern as a heuristic for `backlog/README.md` or `docs/AGENT_INSTRUCTIONS.md`.

## From 039 merge (2026-05-12, RC5 at cd02160 + reconciliation 94b6fc5)

- **Watcher-state executable test (V1.6+)** — convert the prose-level (b)-branch assertion in `.claude/commands/review-queue-watch.md:50-73` into an integration test that drives the slash-command body (or extracted helper) and asserts `r{N+1}/request.md` exists + `next_round: <N+1>` in the prior round's `combined.md`. Today the (a)/(b)/(c) fixtures in `combine.test.ts:288-342` cover what `combine.py` outputs, but the load-bearing watcher-state transition (Codex R3 M1's load-bearing case) is verified only by reading the slash-command prose, not by an executable assertion. **Closes Codex R4 LOW #1 with full falsifiability.**

- **e2e.test.ts fresh-tmp comment (polish)** — `tests/review-queue/e2e.test.ts:139-147` explicitly leaves the fresh `cursor.md.*.tmp` in `r1Dir` and only asserts `r2Dir` cleanliness. The behavior is consistent with combine.py's "cleanup-only-stale" rule, but the test deserves an explicit in-test comment naming the convention so future readers don't read it as an AC6a coverage gap. **Closes Codex implementation-monitor finding #3 (partial-confirm).** Polish-only; not load-bearing.

- **AC6b post-merge dogfooding (founder, immediate)** — per spec §After Completion §5, the next qualifying spec to enter the queue is the first end-to-end zero-dispatch-message test of the new file-backed protocol. **This is the documented "loop-close gate":** the founder interacts only with the strategist; reviewer dispatch is automatic. Bootstrap moment was 039 itself (last manual cycle). 040+ is the queue's steady state. If the next spec requires *any* manual reviewer-dispatch message from founder, that is an AC6b empirical failure and should bounce back to the queue (priority HIGH).

- **Wiki promotion (strategist, post-039)** — promote 039's "After Completion" notes:
  - New page `wiki/surfaces/review-queue.md` — file-backed protocol overview, the three slash-commands (`review-queue-codex.md` / `review-queue-cursor.md` / `review-queue-watch.md`), AC3.5 (a)/(b)/(c) state machine, the JOURNAL-AS-QUEUE PROHIBITION invariant, the reviewer-harness-agnostic property.
  - New principle page `wiki/principles/journal-is-observation-only.md` — promoted from 039 R1 live-observed cross-reviewer journal-edit race; reinforces 039's §Out of Scope #2.
  - Update `wiki/operating-model/` — document the bootstrap-vs-steady-state distinction (039 was the last manual cycle; 040+ uses the queue).

- **Cross-tool review cycle decay-curve heuristic candidate** — 039's 4-round cycle (R1: 18 findings → R2: 14 → R3: 8 → R4: 2 LOW; zero residual HIGH/MED at convergence) is the third structural-reform data point (after 037 and 038). The earlier observation that structural reforms need 3 rounds while narrow features settle in 1-2 holds; 039's 4-round bump came from being its own bootstrap dogfooding subject. Two more confirming cases (040, 041) would lock the heuristic into `backlog/README.md` or `docs/AGENT_INSTRUCTIONS.md`.

- **🔴 AC0 Codex recipe fails verification on macOS — `--sandbox workspace-write` blocks `.git/FETCH_HEAD` writes (surfaced 2026-05-12 ~02:16 PDT during 040 live test).** The verified Codex recipe in `docs/review-queue-setup.md` invokes `codex exec ... --sandbox workspace-write --ask-for-approval never -`. On macOS (founder's machine, Darwin 25.4.0), the sandbox denies writes to `.git/FETCH_HEAD` even though `.git/` is inside the workspace — Step 1's mandatory `git pull --rebase origin main` exits 1 with `error: cannot open '.git/FETCH_HEAD': Operation not permitted`. The reviewer cannot proceed past Step 1, so `r1/codex.md` is never written. Empirical workaround: `--sandbox danger-full-access` instead of `--sandbox workspace-write` — acceptable on founder's own dev machine but defeats AC0's stated sandbox-scoped guarantee. **Why this matters:** AC0 success criteria are blocking for AC6b per the 039 spec; the 040 live test surfaced this on the very first reviewer tick. **Spec-level fix candidates:** (a) widen the Codex recipe sandbox to `danger-full-access` in `docs/review-queue-setup.md` and remove the `workspace-write` claim (cost: lose sandbox-scoped guarantee for Codex reviewers); (b) investigate whether `--sandbox workspace-write` should permit `.git/` writes by default (file upstream issue with Codex CLI); (c) restructure the reviewer prompt to do `git fetch` + manual rebase without writing `.git/FETCH_HEAD` (works around the sandbox quirk without losing scope). **Priority:** HIGH — gates AC6b. **Not inline-expanding 039.** File its own item (suggested ID: `2026-05-1X-XXX-codex-reviewer-sandbox-recipe-fix`) once a fix shape is chosen.

- **AC6b live-test verdict (in flight, 040 R1) — Codex reviewer blocked at Step 1.** As of 2026-05-12 02:16 PDT, the 040 live test scoreboard is: spec draft (no dispatch msg), R1 dispatch (no dispatch msg), watcher cron fired by strategist (no dispatch msg), R1 reviewer-tick attempt = Codex blocked by sandbox (above), Cursor not yet observed. **AC6b status:** the AC0 sandbox issue is a session-bootstrap defect, NOT a per-round founder-to-reviewer dispatch message — under the 039 reading ("session bootstrap is out of scope for the dispatch-message count"), AC6b is still passing. Re-evaluate after Codex re-fires under the workaround sandbox and `r1/codex.md` lands.

- **🔴 AC3 reviewer-emission validation gap — Cursor R1 cursor.md had unparseable YAML; combine.py crashed; strategist inline-patched (surfaced 2026-05-12 ~02:33 PDT during 040 R1).** Cursor wrote a LOW finding whose `finding:` value began with `""` (intended as a literal embedded double-quote for citing the spec's wording). YAML parsed that as an empty scalar + trailing unquoted text, raising `yaml.parser.ParserError` at line 16 col 16. `combine.py` raised, the watcher tick exited with traceback, and the queue was stuck until manual intervention. **Strategist intervention:** inline-patched cursor.md (outer `"..."` → outer `'...'` around the offending value; embedded `"` preserved literally; reviewer's semantics unchanged). Logged to `raw/internal/queue-errors.md`. **Why this is an AC3 gap, not a Cursor bug:** the reviewer prompt (`.claude/commands/review-queue-cursor.md`) has no validate-on-emission gate — it tells the reviewer to write `cursor.md` atomically + push, but does not require `python3 -c "yaml.safe_load(open(path).read().split('---')[1])"` (or equivalent jsonschema) to succeed before the commit. Per the queue contract, the strategist watcher should NOT be editing reviewer responses to recover; the reviewer should produce parseable output or fail loudly at emission time. **Spec-level fix candidates:** (a) Add a yaml.safe_load pre-commit gate to both reviewer prompts (`review-queue-cursor.md` Step 5 + `review-queue-codex.md` Step 5) before the `git add + commit + push-with-retry.sh` block; on parse failure, reviewer regenerates response without committing. (b) Add a hardening step in `combine.py` that catches `ParserError`, writes a malformed-response stub to `combined.md` with `escalated_to_founder: true` and reason `malformed_reviewer_response`, and pushes — keeps the queue self-driving without strategist intervention. (c) Both. **Priority:** HIGH — this exact failure mode will recur the moment any reviewer cites text containing literal quote characters. **Not inline-expanding 039.** File its own item (suggested ID: `2026-05-1X-XXX-reviewer-emission-yaml-validation`). The AC3 fixture (b) in 040 itself is good evidence that schema-validation-after-write should be a queue-wide property.

- **AC6b reading on the inline-patch intervention.** Strict reading: the strategist editing a reviewer's pushed response is a queue-contract violation — combine.py's deterministic-one-round-per-tick property assumes immutable reviewer artifacts. Lenient reading: it was a one-character fix that preserved semantics, the act was logged to queue-errors.md (the exact failure-path the 039 spec carved out for emergencies), and no founder-to-reviewer dispatch message was needed. **Calling it: AC6b still passing for round 1, with an explicit caveat.** The AC3 emission-validation fix above must land before this pattern can be claimed reliable; until then, the queue is "self-driving with strategist hand-patches on YAML defects" — better than pre-039, not yet the fully-automated steady state 039 promised.

- **AC6b final verdict (3-round 040 cycle, 2026-05-12 ~03:00 PDT) — PASSING on the strict reading.** R3 converged with both reviewers `proceed` / zero findings at spec_commit_sha `784698f`. Across all 3 rounds, the founder issued zero dispatch messages between strategist and reviewers; all queue mechanics ran autonomously (strategist watcher cron + reviewer ticks + autonomous combine + disposition + spec patches + r{N+1} dispatch). The two friction cases that surfaced (Codex sandbox + Cursor YAML emission) are both AC0/AC3-class session-bootstrap / emission-validation gaps, both filed above. **The 039 loop-close gate fired clean as designed.**

- **🔴 NEXT GAP — Reviewer background execution: founder still has to activate Codex + prompt Cursor each round (surfaced 2026-05-12 ~03:05 PDT post-040 convergence).** AC6b is satisfied on its literal reading (no per-round dispatch messages between strategist and reviewers via the file-backed queue), but the founder still has to *physically activate* each reviewer at session-bootstrap time: typing the corrected `codex exec ...` command in a terminal, pasting the Cursor self-loop prompt into the Cursor IDE, and pasting again as the manual-paste fallback when Cursor's self-loop fails to tick. Across 040's 3-round cycle this happened ~5 times (initial bootstrap + cursor-restart between R1/R2/R3 + codex re-fire after sandbox fix). **This is the next operational gap to close.** Per-reviewer fix shape:

  - **Codex CLI** — straightforward. After the AC0-codex-sandbox-recipe-fix item lands (above), the corrected one-line invocation (`--sandbox danger-full-access`, no `--ask-for-approval` flag, `<` redirection not `cat |`) goes into a `*/10 * * * *` cron entry or a launchd plist. One-time setup; never touched again. The cron form in `docs/review-queue-setup.md` already has the wrong flags — fix it as part of the same item.
  - **Cursor IDE** — hard. Cursor has no headless mode comparable to `codex exec`. The paste-once-self-loop pattern ticks unreliably in practice (Cursor's harness can't "sleep 10 min in chat" — confirmed by Cursor's own R1 report). 039 §AC0 explicitly rejected macOS keyboard-automation (push-based GUI pinging). Real options for the 041 strategist conversation: (a) **replace Cursor as a reviewer** with a second headless tool — lose its distinct review voice but gain background execution; the 039 reviewer-harness-agnostic property already permits this. Candidates: a second Codex instance with a different prompt, a Claude API call from a Python cron job, or a headless Cursor agent if/when Cursor ships one. (b) **Accept missing-Cursor degradation gracefully** — the watcher already escalates on `single_reviewer_timeout` after `MISSING_REVIEWER_TIMEOUT_HOURS` (default 2); document that "Cursor only reviews when the founder has the IDE open" as a known steady-state property and let the queue carry on with single-reviewer rounds when Cursor is absent. (c) **Wait for Cursor's roadmap** to ship a headless reviewer mode. Bet against this for V1.6 timeline.

  **Priority:** HIGH. This is the operational difference between "AC6b passes on the strict reading" and "founder genuinely never touches reviewer agents." Suggested ID: `2026-05-XX-041-reviewer-background-execution`. Subsumes the AC0-codex-sandbox-recipe-fix item above (Codex sub-fix is half of 041's deliverable). 041 should also clean up `docs/review-queue-setup.md` end-to-end since today's recipe has multiple known bugs across the Codex + Cursor sections.

  **Founder framing (2026-05-12 post-040):** *"so the issue is I still have to activate codex and prompt cursor. that I will the next issue to solve. so I truly dont have to touch cursor and codex or any reviewer agent I might choose to use in the future."* The "or any reviewer agent I might choose to use in the future" clause is the load-bearing one — 041 should solve the activation pattern, not just patch Codex+Cursor specifically. Future reviewers (e.g., a third or fourth perspective added in V2) should plug into the same background-execution mechanism without spec changes.

## From 040 merge (2026-05-12)

- **🟡 MED — `tests/review-queue/concurrency.test.ts:133` orphan-cleanup test has a clock-frame mismatch with its own `--now` argument (RECLASSIFIED 2026-05-12 14:00 PDT after Codex local investigation + strategist empirical verification).**

  **Original Claude/strategist classification (now superseded):** "HIGH — combine.py orphan-cleanup is a real production bug; cleanup path isn't actually firing." Wrong.

  **Codex investigation (journal entry 2026-05-12 13:39 PDT) + strategist empirical verification (2026-05-12 14:00 PDT, post-merge):** the test sets the orphan file's `mtime` to `real_wall_clock_now() - 31 min` using `touch -t $(date -r ${Math.floor(past)})`, but passes `--now=2026-05-12T11:00:00Z` (a fixed past timestamp) to `combine.py`. Since real wall-clock is many hours after the fake `--now`, the file's mtime ends up **in the future** relative to combine.py's notion of "now"; cleanup correctly identifies it as "not 30 min old yet" and skips. Production `combine.py cleanup_orphans()` at `tools/review-queue/combine.py:109-126` is correct: a controlled fixture with `touch -t 202605120329.00` (= 10:29 UTC, exactly 31 min before fake-now in UTC frame) **does** delete the orphan as expected. Verified by strategist 2026-05-12 14:00 PDT against current main HEAD.

  **What to actually fix (test, not production):**
  - Option A (preferred — simpler): drop the `--now=2026-05-12T11:00:00Z` override; let combine.py use real wall-clock `_dt.datetime.now(_dt.timezone.utc)`; the existing `touch -t $(date -r real_now-31min)` then aligns correctly.
  - Option B: compute the `touch -t` argument relative to the fake `--now` (e.g., convert `2026-05-12T11:00:00Z` to local time, subtract 31 min, format).
  - Option A is cleaner because it removes the fake-clock from this test entirely (other concurrency tests in the file don't need it; this one drifted in by copy-paste).

  **Why this matters less than originally framed:** no production bug. The "silently red since 039 merged" framing is accurate (the test has been red since 039) but the consequence is "1 test file in CI shows red," not "queue's orphan-cleanup is broken in steady-state." File a small follow-up to fix the test (suggested ID: `2026-05-XX-NNN-concurrency-test-clock-frame-fix`). MED, not HIGH.

  **Process note:** the strategist's original synthesis classified this as a production bug based on the sidecar reviewer's word ("real bug in `tools/review-queue/combine.py`'s orphan-cleanup path"). Codex's independent local investigation (running `combine.py` directly on controlled fixtures) caught the misclassification within ~30 min of seeing the strategist synthesis. **Two-tool cross-check on diagnostic claims is operationally valuable** — the same convergent-on-direction divergent-on-prescription pattern that holds in cross-tool spec review also surfaces classification errors in post-merge gap synthesis. Worth recording as evidence for the cross-tool-spec-review wiki page.

- **MED — Watcher slash-command body integration test (V1.6+).** 040 ships executable test coverage of the `dispatch-next-round.py` helper's (a)/(b)/(c) terminal transitions, closing 039 R4 LOW #1. But the `.claude/commands/review-queue-watch.md` Step 3 prose that *invokes* the helper is still human-audited — there's no executable test that the slash-command body correctly translates strategist disposition into the right helper invocation. Consider a higher-level integration test that exercises the slash-command body end-to-end for V1.6+. Not load-bearing — the helper itself is tested; only the prose-to-invocation translation is unverified. (Sidecar reviewer flagged this as Follow-up #3.)

- **✅ Cross-out: 039 R4 LOW #1 closed by 040.** The 039 followup line 505 ("Watcher-state executable test") is now resolved by 040's merge. Test fixture at `tests/review-queue/watcher-state.test.ts` constructs a real r1 dir, runs the real `combine.py`, then runs the real `dispatch-next-round.py` (spawning the real `request.py` as a subprocess, NOT mocked), and asserts the load-bearing AC3.5 (b) post-conditions executably. Strategist promoting 039 to wiki should reference this as the canonical evidence the (b)-branch transition is no longer prose-only.

- **✅ Cross-out: AC6b loop-close gate empirically closed by 040.** The 039 followup "AC6b post-merge dogfooding" entry is now resolved. 040 was the FIRST qualifying spec to traverse the new file-backed queue end-to-end with **zero founder→reviewer dispatch messages**. Three rounds of cross-tool review converged in 53 min wall-clock; full ready→pending_review in ~4 hours. Two friction cases surfaced (Codex sandbox + Cursor YAML emission) but both are session-bootstrap / emission-validation defects, not per-round dispatch messages. The strategist (Claude Code) interacted with the founder exactly twice in this entire cycle: (a) the post-039 reconciliation push acknowledgement, and (b) when the founder invoked `/review-pending`. AC6b empirical criterion met. The next operational gap (`reviewer-background-execution`) is filed as 041 candidate above — that's the difference between "AC6b passes on the strict reading" and "founder never touches reviewer agents."

## From 041 merge (2026-05-12)

- **✅ AC3 founder smoke verification CLOSED 2026-05-12 ~23:05 PDT.** Founder ran `tools/review-queue/install-codex-reviewer-launchd.sh --smoke` which executed both: (1) `launchctl kickstart -k` → wrapper-fired tick against production repo (rc=0, 46s, "no codex reviews to write"); (2) `smoke-test-codex-runner.sh` against isolated tmpdir + local bare origin → **`smoke OK: codex.md produced, validated, committed; hard isolation assertions all passed`**.

  Took **3 post-merge fixups** to get clean (all operational test/helper bugs surfaced by AC5; none changed production semantics):
  1. `50c2e81` — drop `HOME=$SMOKE_HOME` override in smoke (was preventing `codex` from finding `~/.codex/auth.json` → 401);
  2. `aec75fd` — make `cd` in 3 queue slash-commands respect `ECHO_REVIEW_QUEUE_REPO_ROOT` (was hardcoded `~/Desktop/Project_echo`; smoke ran against PROD not tmpdir);
  3. `c63dad9` — `PYTHONDONTWRITEBYTECODE=1` in `commit-reviewer-response.sh` + smoke copies `.gitignore` + removes `__pycache__/` (was tracking .pyc files; validate.py regenerated them mid-pipeline → push-with-retry's `git pull --rebase` failed with "unstaged changes"; Codex's LLM judgment recovered the first time; the fix removes the need for recovery).

  **The launchd job is now installed, verified, and ticking every 10 min unattended.** Founder-side Codex activations: 0 going forward.

  Operational observation: `launchctl list | grep com.echo.review-queue-codex` shows last exit `126` from an earlier failed install attempt; subsequent kickstart-fired ticks succeed (rc=0). The `126` appears stale — launchctl seems to preserve the worst-recent exit even after subsequent successes. Not a runtime issue; the wrapper's own log (`~/Library/Logs/echo-review-queue-codex.log`) is authoritative for tick state.

- **AC7 wiki residue (strategist, post-merge wiki promotion)** — `wiki/operating-model/cross-tool-spec-review.md:140` has `get_atom(<elided_atom_id>)` placeholder. Builder honored AGENT_INSTRUCTIONS rule 6 (no wiki edits from builders); fix at strategist's next wiki promotion pass. Search-replace `<elided_atom_id>` → `<id>` or restructure the example to match the `get_atom({id: ...})` schema.

- **AC8 empirical measurement (strategist, next qualifying spec)** — count founder activations during the next post-041 spec's review cycle. Pre-041 baseline measured: ~5 per 3-round cycle during 040 (initial Codex terminal command + Codex re-fires after sandbox correction + Cursor chat pastes). Target post-041: 0–1. Record measurement in the next item's `review_notes` at merge time. If count >1, file 042 with the specific friction observed.

- **combine.py reviewer-finding-enumeration audit** — empirically observed twice during 041's review rounds:
  - R1: combine.py folded Codex M4 + Cursor M2 into one "convergent" row even though they were different findings at the same anchor (variable-name normativity vs synthetic item_id whitelist).
  - R2: combine.py dropped Cursor L1 (AC2 Label vs kickstart target) entirely from both tables, AND double-listed Cursor L2 (AC1 invalid env var) across convergent + divergent.
  Strategist's manual read of `<reviewer>.md` files was the safety net both times. Needs a backlog item to fix the finding-enumeration logic (suggested: stricter convergence match-key + a "missing findings" audit pass that compares input findings to output rows). Priority: MED (queue still works correctly; this is friction on the hands-off pattern that 041+ depends on).

- **✅ Cross-out: 040 follow-up "🔴 NEXT GAP — Reviewer background execution" closed by 041 merge.** Strict-reading AC6b kept passing; the activation-friction half is now structurally addressed (pending AC8 empirical confirmation).

- **✅ Cross-out: AC0 Codex recipe failure on macOS** — 041 AC3 pins the corrected invocation (`--sandbox danger-full-access`, no `--ask-for-approval`, `<` redirection) in the wrapper script.

- **✅ Cross-out: AC3 reviewer-emission validation gap** — 041 AC4 ships `tools/review-queue/commit-reviewer-response.sh` with mechanical validate-before-commit + invalid-file MV-aside on failure; both reviewer slash-commands rewired.

## From 042 dogfooding cycle (2026-05-12)

**Context:** First post-041 AC8 measurement vehicle. Founder-authorized off-protocol overrides for speed (strategist drove single-reviewer disposition; `MISSING_REVIEWER_TIMEOUT_HOURS=0` flag used 3×). Spec `2026-05-12-042-reviewer-emission-yaml-validation` converged in ~50 min wall-time across 3 rounds (R1: 3 findings → R2: 2 → R3: 1 LOW → terminal). **AC8 = 0 founder activations.** Five structural findings surfaced during the cycle; collectively, they're the speed-and-resilience seed for 043.

### 🔴 #1 — launchd kickstart silently fails before log redirect (HIGH)

**Observed:** Strategist issued `launchctl kickstart -k gui/$(id -u)/com.echo.review-queue-codex` at 23:28:12Z. `launchctl print` showed `runs` incremented (4→5), but `~/Library/Logs/echo-review-queue-codex.log` was unchanged — no `tick start` line. The 041 wrapper script (`run-codex-reviewer.sh`) writes errors in lines 14-43 to stderr BEFORE the `{...} >> "$LOG_FILE" 2>&1` redirect on line 50; stderr is mapped to `/dev/null` per the plist's `StandardErrorPath`. Any pre-redirect failure (cd, git rev-parse, mkdir, rotation) is therefore invisible.

**Cost:** First launchd-fired tick after install also exhibited this; the 041 followup hinted at it. Workaround used 4× this cycle: invoke `tools/review-queue/run-codex-reviewer.sh` directly via Bash with `2>&1`. Strategist-direct invocation works perfectly; only launchd-fired invocations fail silently.

**Fix candidates:** (a) move the pre-redirect work inside the `{...}` block; (b) plist `StandardErrorPath` → log file path instead of `/dev/null`; (c) emit a `[bootstrap]` marker line at the very top of `{...}` so silent failures are detectable downstream.

### 🔴 #2 — `git pull --rebase origin main` wedges on dirty tree in every prompt's Step 1 (HIGH)

**Observed:** Both `review-queue-watch.md` and `review-queue-codex.md` (and presumably `review-queue-cursor.md`) start Step 1 with bare `git pull --rebase origin main`. If the worktree is dirty, the rebase aborts non-zero and the tick exits without doing anything. This fired 4+ times during 042: once at the first watcher tick (workaround: manual stash/pop), and once at Codex r2's first attempt (Codex correctly aborted to avoid reviewing stale artifacts, leaving r2/codex.md never written; resolved only after strategist stashed the dirty tree).

**Cost:** Roughly half the strategist intervention time this cycle. The dirty state is unavoidable in steady state — Codex's own post-review journal write always leaves the tree dirty for several seconds; concurrent agents add to it; the strategist's WIP wiki edits sit dirty across sessions.

**Fix:** One-line change to all three slash-commands' Step 1:

```bash
# Before:
git pull --rebase origin main
# After:
git -c rebase.autoStash=true pull --rebase origin main
```

Codex itself adopted this pattern organically in one of the 042 r1 ticks; this should be the documented convention.

### 🔴 #3 — `MISSING_REVIEWER_TIMEOUT_HOURS=2` is too slow for iterative work (HIGH)

**Observed:** With Cursor closed (the accept-degradation case from 041), combine.py refuses to write `combined.md` until 2h elapse from `requested_at`. For 042 that meant a per-round wait of ~2h just to start dispositioning. Strategist worked around by invoking `combine.py --timeout-hours=0` three times across the cycle.

**Cost:** 042 cycle would have taken 6+ hours under default 2h timeout. With `--timeout-hours=0`, the cycle took ~50 min.

**Fix:** Drop the default to a small value (5-15 min) OR — better — replace the timeout-based "accept-degradation" with a config-driven optional reviewer list. If Cursor is in `optional_reviewers` for the current session, combine.py treats absent-Cursor as a clean single-reviewer round, no waiting. Per the 041 followup's "replace Cursor as a reviewer" candidate (line 531), this also opens the door to a second headless reviewer (second Codex with different prompt, or Claude API cron) that doesn't have the "is the IDE open?" question.

### 🟠 #4 — Watcher's `single_reviewer_timeout → escalate_to_founder` default contradicts AC8 goal (MEDIUM)

**Observed:** When combine.py writes `combined_verdict: single_reviewer_timeout`, it sets `escalated_to_founder: true`. The watcher slash-command's Step 3 then says "Append a journal entry; **exit**. The founder will see and act on next session." That's exactly the founder-activation 041/AC8 is trying to eliminate. Strategist overrode this 3× during 042 by ignoring the escalation flag and dispositioning the single-reviewer (Codex-only) findings as if it were a normal `proceed_after_patches` round.

**Cost:** None this cycle (off-protocol override was clean), but the default behavior is the wrong default — every non-Cursor session would hit it.

**Fix:** Watcher Step 3 should treat `single_reviewer_timeout` differently from `divergent`/`no_responses`: when one named reviewer (codex) succeeded and only the accept-degradation reviewer (cursor) is absent, the strategist disposition path fires normally with `escalated_to_founder: false` (or a new `escalated: false, mode: single_reviewer_strategist_drive` flag). Divergent + no_responses still escalate.

### 🟡 #5 — Reviewer schema accepts unquoted-YAML timestamps; reviewers emit them ~half the time (MEDIUM)

**Observed:** `reviewer.schema.json` declares `completed_at: { type: string }`. YAML parses `2026-05-12T23:56:42Z` (unquoted) as `datetime.datetime`, not `str`. jsonschema then rejects: `is not of type 'string'`. 042 r1/r2 happened to emit single-quoted strings (passing); r3 first-attempt emitted unquoted (failing → 041 AC4 quarantine fired). The variance is non-deterministic across Codex ticks.

**Cost:** One extra ~3-min round-trip in r3 to regenerate. AC4 absorbed it without founder activation, but the wasted compute is real.

**Fix candidates:**
- **(a)** Tighten reviewer prompts (`review-queue-codex.md` + `review-queue-cursor.md`) to specify `completed_at: '2026-05-XXTHH:MM:SSZ'` (quoted) verbatim, with example.
- **(b)** Relax `reviewer.schema.json` to accept `completed_at: { oneOf: [{ type: string, format: date-time }, ...] }` — though YAML's auto-coercion to datetime is a python-yaml quirk; jsonschema's `format: date-time` only checks strings.
- **(c)** Pre-normalize in validate.py: if `completed_at` value is `datetime.datetime`, coerce to ISO 8601 string before validation.

Option (a) is the lowest-friction fix; (c) is the most resilient.

### 🟡 #6 — Watcher cron is session-only; cross-session autonomy gap (MEDIUM)

**Observed:** `/loop 10m /review-queue-watch` registers a CronCreate job in this Claude Code session's in-memory store. Job dies when the session closes. The launchd Codex job survives session closures (independent process), but with no watcher running, nothing combines or dispositions; queue stalls until the founder re-opens a strategist session and re-loops.

**Cost:** None today (session stayed open). Real cost in production: any spec dispatched at end-of-day sits idle overnight; founder finds it un-converged next morning despite Codex having reviewed hours ago.

**Fix:** Launchd-ify the watcher too. Similar plist + wrapper shape as 041's Codex one. Trade-off: watcher's slash-command body does require a Claude session to invoke (it's not just a shell script). Real fix is the slash-command body extracted into a standalone Python/bash helper that doesn't need Claude, or a Claude Code headless invocation similar to `codex exec`.

### Summary recommendation

**File 043 as a single spec** named `2026-05-XX-043-reviewer-loop-speed-and-resilience` covering #1-#6. Estimated 1-2d. Order of leverage (per cost-saved-this-cycle):

1. #2 — `git -c rebase.autoStash=true`, 4× wedge hits avoided
2. #3 — drop timeout default OR config-driven optional-reviewer list, ~10× speed boost
3. #4 — watcher single-reviewer-strategist-drive path, 3× off-protocol overrides avoided
4. #1 — launchd kickstart logging fix, debugging gain
5. #5 — reviewer prompt quoted-timestamp + validate.py coercion, ~50% emission-fail avoidance
6. #6 — watcher on launchd, cross-session autonomy

043 itself becomes the next AC8 measurement vehicle, this time also measuring round-trip latency (target: ≤30 min for 3-round convergence end-to-end, no overrides needed).

## From 042 merge (2026-05-13)

- **Pre-existing orphan-cleanup test failure** (`tests/review-queue/concurrency.test.ts:133`) — fails on main HEAD; also failed before 042's changes. Out of scope per 042 spec §Out of Scope. Root cause was investigated post-040 (see _followups.md "From 041 merge" → the `--now=` fixed-timestamp vs real-mtime mismatch under `touch -t $(date -r ...)`). Two prescribed Option-A/Option-B fixes were named there but never landed. Suggested ID: `2026-05-XX-044-orphan-cleanup-test-fix`. Tiny scope (5-10 lines in the test).
- **Cosmetic re-parse in `combine.py:200-201`** — `build_malformed_combined` re-opens `request.md` even though `build_combined` already parsed it. Harmless (one extra small file read on the escalation path, which is rare anyway). Thread the parsed dict through the helper signature. Defer to next builder touching combine.py.
- **Path-resolution caveat in `combine.py:207`** — `Path.resolve().relative_to(repo_root.resolve())` assumes `repo_root` is realpath-resolved by the caller. Tests pre-resolve with `realpathSync` for macOS `/private/var/folders/...`. Not a current bug; document for next builder. Could add an internal-style `_resolve_repo_root(path)` helper that always realpath-resolves.

## From 043 merge (2026-05-13)

- **2026-05-XX-044-add-3rd-reviewer-end-to-end-falsification** (LARGE, HIGH) — AC6h N=3 end-to-end test through `request.py` → `validate.py reviewer` → `commit-reviewer-response.sh` → `combine.py` → `validate.py combined` with a synthetic `codex-arch` reviewer added across all 4 schemas. Bundles: AC6h (load-bearing falsification for R2 HIGH #1), AC6i (3-reviewer convergent comma-list output), AC6j (3-reviewer one-diverges roll-up), AC6l (transitive cross_ref chain — A→B + C→A union-find correctness), AC6m (same-reviewer duplicate-anchor list-shape preservation — R5 MED #2 falsification), AC6n (cross_refs_match uses finding_index — R6 MED #2 falsification), AC6o (extend-not-update bucket collapse — R6 MED #3 falsification), AC6p N≥3 extension, AC6q (offending_response array shape at N=3). Also bundles **spec R8 HIGH #1 TOOL_DIR/TARGET_REPO split** in `commit-reviewer-response.sh` + `push-with-retry.sh` (deferred at 043 merge; see `raw/internal/decisions/2026-05-13-043-r8-deferred.md`). Without 044, the "adding a 3rd reviewer works end-to-end" claim from R2 HIGH #1 remains a hypothesis. Founder may want to actually deploy a `codex-arch` reviewer (different prompt, e.g., architectural perspective) so 044 closes by virtue of being real.

- **AC1a — cursor exits no-op when not in requested_reviewers** — needs a shell-extractable harness for the reviewer-prompt Step 2 gate. The behavior is correct (verified in code review); test coverage is the gap.

- **AC1e — optional cursor missing, codex present (non-blocking)** — unreachable in default deploy where `cursor.required=true`. Defer until founder flips cursor to optional (likely as part of a speed-decision item).

- **AC2a missing invalid-config fixtures (5 of 7 specced)** — `_reviewers.py` validation tested for `invalid mode` + `duplicate slug`; missing fixtures: missing required field, extra field, invalid slug pattern (uppercase/leading-digit/special-char), non-bool `required`.

- **AC2b cache-identity assertion** — explicit `isinstance(result, tuple) AND result is load_reviewers()` check.

- **AC2c explicit config_path bypasses cache** — explicit it() block.

- **AC2d missing mode×timeout fixtures (4 of 6)** — tested: `mode=headless+timeout=null`, `mode=ide+timeout=positive`. Missing: `mode=ide+timeout=null`, `mode=ide+timeout=0`, `mode=ide+timeout="string"`, `mode=ide+timeout=bool`.

- **combine.py:569-580 dead-branch cleanup** — `if not now` is unreachable since `main()` always sets `now=`. Cosmetic.

- **`_lib.REVIEWS_DIR` / `_lib.ERROR_LOG` import-time computation fragility** — mid-test env-var mutation won't re-evaluate. Suite passes today because no test does this; document or move to lazy properties.

- **`_run_reviewer.sh:17` baked-in default** — `$HOME/Desktop/Project_echo` portability concern; carried over from main.

- **`_reviewer_gate.py` standalone script** — beneficial deviation from spec (more robust stderr survival than inline heredoc). Strategist should promote as spec addendum to 043's `wiki/operating-model/cross-tool-spec-review.md` post-promotion pass.

- **Structural-reform spec round count signal** — 043 took 8 rounds (vs 042's 3, 040's 3, 039's 4 baseline). The decay curve was real but slower than expected; the spec also grew from ~700 to ~1200 lines mid-cycle. Worth comparing 044's round count to validate whether "structural-reform" specs of this size benefit from sub-spec decomposition vs single large items. File as observation in next strategist conversation's review of the 039 cross-tool review wiki page.

## From 044 dogfooding cycle (2026-05-13)

- **`_install_reviewer_launchd.sh --smoke` fails-open when smoke runner is absent** (r2 codex-ops MED #2). **→ ABSORBED into `2026-05-13-045-queue-reliability-friction-cluster` as AC2.** Original observation preserved here: `tools/review-queue/_install_reviewer_launchd.sh:97-103` prints a warning and exits 0 when `--smoke` is passed but `smoke-test-<reviewer>-runner.sh` doesn't exist. AC2 of 045 fixes this fail-closed.

- **Reviewer prompts' Step 1 pull also lacks autostash** (r2 codex-ops HIGH adjacent observation). The watcher transaction's pulls were AC1-extended in 044. The reviewer prompts (`review-queue-codex.md`, `review-queue-cursor.md`, `review-queue-codex-ops.md`) also run `git pull --rebase origin main` at Step 1. Per 044's AC1 out-of-scope defense these stay unchanged (reviewer ticks should observe a clean tree at start-of-tick because the previous tick committed everything). If empirically this is wrong in some cycle (reviewer hits dirty tree at start-of-tick), extend autostash to those prompts too. Filed as observation; no action unless surfaced empirically.

## From 044 merge (2026-05-13)

- **Cosmetic prose mismatch in watcher slash command** (code-reviewer subagent finding, non-blocking). `.claude/commands/review-queue-watch.md:38` documents the AC4 missing-reviewer divergent-row example as `where: "—"`, but the actual emitter at `tools/review-queue/combine.py:684` writes `where: "did not respond; per 044 AC4 single-reviewer auto-disposition"`. Pure prose-vs-emitter literal divergence, no behavior change. Pick one canonical form and align both. Trivial scope. Could bundle into 045 or stand alone.

- **/review-pending → /merge-and-cleanup sidecar handoff has a tracked-file gap.** `/review-pending` writes `backlog/pending_review/<id>.review.md` but explicitly does not `git add` or commit (Step E: "Do not run git operations beyond `git diff` and `git fetch`"). `/merge-and-cleanup`'s pre-flight aborts on any dirty tree, AND its C7 runs `git rm` on the sidecar (which requires the sidecar to be tracked). The two skills don't compose cleanly — the strategist driving them must commit the sidecar manually between skills. Hit during 044 merge; resolved by adding a `review: <id>` commit before invoking /merge-and-cleanup. Either skill could close the gap: /review-pending stages or commits, OR /merge-and-cleanup tolerates an untracked sidecar at the named path. Strategist preference: have /review-pending commit the sidecar (matches the rest of the queue's "writes are committed atomically" pattern). Filed as skill-edit candidate; not a backlog item per the friction-first directive (skill edits aren't specs).

## From 045 merge (2026-05-13)

- **`/merge-and-cleanup` C5 verify should include `tools/sync-skills.sh --check`** (045 code-reviewer subagent meta-finding). The C5 verify currently runs `npm install / npm test / npm run lint / npm run typecheck` but not the sync identity check. After the skills relocation at `6d29f51`, drift between `skills/` (canonical) and `.claude/commands/` (derived) can occur whenever a builder edits the adapter without re-running the sync. Adding `tools/sync-skills.sh --check` to C5 would catch this mechanically at merge time. Bundles with the pre-commit hook follow-up named in `raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md` "Next steps". Tiny scope (one line in merge-and-cleanup skill prose, plus maybe a pre-commit hook script).

- **Code-style nit: `tools/review-queue/validate_response_yaml.py:91`** uses `__import__("os").environ` instead of a top-level `import os` + `os.environ`. Functionally fine; stylistic only. Non-blocking; trivial 2-line edit.

## From 046 merge (2026-05-14)

- Spec body vs implementation path divergence: spec body in `backlog/complete/2026-05-13-046-...md` AC1 step 6 still names `tools/review-queue/push-round-state.sh`; builder placed at `tools/task-state/push-round-state.sh`. Skill doc + tests + helper itself use the implemented path. Cosmetic reconciliation at wiki-promotion time.
- Per-event `raw/internal/queue-errors/<ts>-<writer>-<task>.md` aggregation view: if humans want a single rendered queue-errors.md, a separate index-generator script can emit it lazily. Out of 046 scope per the R5 disposition.
- F1 option-b consideration: R5 disposition allowed either option-a (precondition gate, applied at merge) or option-b (targeted restore via `git checkout origin/main -- <path>` + `git reset HEAD~1 --mixed`). If post-merge dogfooding shows the watcher's typical run-state has its own staged-but-uncommitted `combined.md`, option-a will block unnecessarily and option-b becomes preferable. Observational follow-up.
- AC8 post-merge dogfooding (After Completion #4): within 1 week of merge, run a `/clear` session-resume on a strategist task that has a populated `task-state/<id>/strategist.md`. Measure cold-start MCP calls + atom bytes vs the 2026-05-13 16:30 PDT baseline journal entry. Target: ≥50% reduction in MCP call count; ≥70% reduction in atom-body bytes. Result lands as a journal entry + informs whether to file `047-upsert-role-state`.
- AC8 cap-thrash monitoring (Risk R1, After Completion #5): for 1 week post-merge, audit pointer-file diffs in `backlog/task-state/`. If files routinely overflow 80+ lines (warn threshold) or 120-line hard cap, file successor item.

## From 047 merge (2026-05-14)

- **Tighten `~/.echo/agent-id` to mode 0600.** Currently umask-dependent in `tools/backlog/run-codex-builder.sh:41-46`. Spec didn't require it; flag for a future "binding hardening" sweep. Trivial 1-line edit (`chmod 600 "$AGENT_ID_FILE"` after `uuidgen`, or `umask 077` at function entry).
- **Cross-machine wrapper-lock semantics IF Out-of-Scope #3 of 047 reopens.** Current per-machine lock-dir is correct for single-machine; multi-machine codex-builder coordination would need a shared lease (Redis lock, DynamoDB lock, etc.). Don't pre-build; flag only.
- **AC5 §3/§5 strategist post-merge fills.** `raw/internal/dogfooding/role-typed-state-comparison-047.{md,html}` §3 needs codex-side reviewer-tick token counts pulled from `~/Library/Logs/echo-review-queue-codex.log` for R1/R2/R3 of 047, compared against 046's R1-R5 spread; §3-cursor qualitative subsection needs founder's subjective signal on "did re-reading 047's growing spec feel heavier than 046's at comparable rounds?"; §5 final activations count (preliminary = 0 in sidecar). Strategist + founder TODO; regenerate HTML twin in same commit.
- **Wiki promotion (047 After Completion).** Promote `codex-builder-binding` to `wiki/surfaces/` (or `wiki/capture/per-app/` — vendor binding feels like a surface integration). Update `wiki/operating-model/` to reflect that builder role now has 2 vendors. Regenerate `wiki/index.md` via `tools/wiki_index.py`. Update `.manifest.json`.
- **`/review-pending` sidecar-already-exists branch.** Skill doesn't document how to handle re-invocation when a sidecar is already committed on `main` from a prior `/review-pending` run. My instance handled by deferring to the existing artifact + corroborating with a fresh subagent; second subagent missed a real fixup the first reviewer caught. Skill should be explicit: re-run = additive corroboration (don't overwrite) OR re-run = replace (with a recorded "re-reviewed" note in YAML). Either is defensible; pick one.
- **`/process-backlog` should refresh `builder.md` at end-of-cycle.** → SPECCED as `backlog/ready/2026-05-14-048-process-backlog-builder-state-handoff-refresh.md`. Original observation: the 047 builder.md was caught by /review-pending as stale (still pointing at `backlog/claimed/` after the item moved to `pending_review/`). Per `role-typed-task-state.md` writer-responsibilities table, the builder is supposed to update on "completion (move to `pending_review`)" — but the agent didn't. Either the skill enforces a final `builder.md` refresh step before the atomic move to pending_review, OR the lint catches it. Friction-first candidate; small.
- **Reviewer-independence: same-vendor review-pending subagent missed a real fixup.** Builder = Claude Code. /review-pending dispatched a Claude code-reviewer subagent that re-ran tests + verified head_sha + checked drift, but MISSED the builder.md staleness. The prior committed sidecar (from a different reviewer instance, also Claude — possibly Cursor's Claude) caught it. Same-vendor blind spot empirically demonstrated on a small artifact. Worth tracking but the structural fix is already on the table (north star (e2): cross-vendor at every role).

## From 049 cycle — the first FAIL-TO-CONVERGE cycle in ECHO history (2026-05-14)

049 ran 8 rounds of cross-vendor (codex + codex-ops) review-queue; verdicts converged to `proceed_after_patches` from both reviewers at R6/R7/R8 but reviewers (especially codex-ops's runtime/ops lens) kept surfacing new operational-safety concerns each round — never reached zero-HIGH. Founder's explicit decision at R8: ship with R8 patches inline + claim-ready despite open HIGH; framing — "this is a very good signal a responsible because the cross vendor multi reviewer has the discipline to reject convergence when the scope is too ambitious." Load-bearing property demonstrated: cross-vendor multi-reviewer pipeline DOES refuse convergence on overly-ambitious specs.

- **NEW SPEC CANDIDATE — `050-codex-fan-out-orchestrator`** (V1.5+): implements the codex review-pending fan-out per 049 AC2's prescription. Concrete deliverables: per-child `codex exec --output-last-message "$RUN_DIR/<item-id>.review.md" --sandbox workspace-write -C <item-worktree>`; `set +e; echo $? > rc; wait || true` shell wrapping; per-run `RUN_DIR=$(mktemp -d)`; orchestrator parser extracting the 8 required sections from `<item-id>.review.md`; parse-failure path preserves `{review.md, stdout, stderr}` triple to `raw/internal/queue-errors/<ISO-ts>-review-pending-<item-id>/` BEFORE RUN_DIR cleanup; concurrency cap N≤4. Ships the executable parse-failure-evidence test that 049 had to defer (R7→R8 self-inflicted test-vs-OoS contradiction).
- **OPERATING-MODEL FOLLOWUP — cycle-length-budget enforcement** (strategist discipline): 049 demonstrated that "each disposition introduces new surface" is a real anti-pattern. Strategist should detect at R3-R4 and SIMPLIFY rather than continue. 049's R5 contingency plan ("if R5 produces HIGH on install, drop --copy") was empirically tripped but strategist didn't act. Need a decision-tree: IF HIGH-count NOT decreasing round-over-round AND new HIGHs originate from prior round's strategist patches (not the original spec), THEN reduce scope BEFORE round N+1 — don't keep iterating. Bake into `skills/review-queue-watch.md` watcher-tick prose as an explicit gate after combine.py reads the table.
- **WIKI PROMOTION (post-049-merge)** — document 049 in `wiki/operating-model/` as the first empirical fail-to-converge case + the load-bearing property: "cross-vendor multi-reviewer pipeline has the discipline to refuse convergence on overly-ambitious specs." This is positive signal of the protocol working as designed, NOT a failure of the system. Page topic name candidate: `fail-to-converge-as-designed-property` or `reviewer-convergence-discipline`.
- **DOGFOODING SIGNAL — cycle-length distribution** post-049: 042/043/044/045/046/047/048 averaged 3-4 rounds; 049 hit 8. Track future cycles' round counts; if median creeps up, infrastructure friction-fix needed. If 049 stays an outlier, the system is properly self-regulating via fail-to-converge.

- 048 follow-up (non-blocking): Tighten E2.5 `HAS_TASK_STATE_REF` awk detection in skills/process-backlog.md to filter empty-string `task_state_ref:` values (spec wording says "non-empty"). Currently any key presence triggers the helper; the missing-pointer no-op covers it benignly. Cosmetic.
- 048 follow-up (non-blocking): The 048 agent_notes claim that builder.md is staged in branch tip f8869ed is off — dogfood pointer first appeared in c0ea432 (main's review move). Cosmetic / historical only.
- 048 process-debt: Merge lock at .git/echo-merge-in-progress is Claude-Code-only; codex-side and cursor-side reviewer queues bypass it. First 048 merge attempt was hijacked because of this (bad commit preserved on backup/codex-ops-r6-bad-local-merge). File a backlog item to extend the lock convention to all vendor queues.

- 049 follow-up (non-blocking, cosmetic): `tools/install-codex-adapters.sh:201` — `age_ok=${age_ok}` diagnostic is always 1 by the time it's printed (early-return on the ≤600s branch).
- 049 follow-up (non-blocking, cosmetic): `tools/install-codex-adapters.sh:342` — `cp -R "$adapter/." "$stage/"` runs after writing the sentinel; safe per V1 scope (adapters only contain SKILL.md) but worth a comment.
- 049 follow-up (docs): Document in `tools/sync-skills.sh` header that `--check` reads `$HOME/.codex/skills/*/` for stale-`--copy` warnings, so CI environments aren't surprised.
- 049 strategist queue (After-Completion): extend vendor-neutralization to `merge-and-cleanup`, `review-queue-*`, `process-backlog-batch`; generate `agents/openai.yaml` for each codex adapter; pre-commit hook for `sync-skills.sh --check`; verify codex auto-discovery honors symlinks (R2 mitigation).
- 049 follow-up: re-file deferred `parse-failure-evidence-preservation` test against a future codex-fan-out-orchestrator spec.
- 049 owed: human smoke test — run `tools/install-codex-adapters.sh` in a real codex CLI session and verify `/review-pending` discovers in codex's slash-command surface.
- **CROSS-CUT (post-merge adapter drift)**: when an item's fork-point precedes a canonical change in main, materialized adapters end up stale at merge time and git can't surface it textually. Caught here by `tools/sync-skills.sh --check` + the 048 byte-identity test. Mitigations to consider: (a) `/merge-and-cleanup` runs `tools/sync-skills.sh` automatically as part of C5 verify (so it always lands in the merge commit), OR (b) a pre-push hook that runs `--check`. File as a backlog item.
- **CROSS-CUT (merge-lock cross-vendor gap, SECOND occurrence today)**: `.git/echo-merge-in-progress` is Claude-Code-only; `tools/review-queue/push-with-retry.sh` runs `git pull --rebase` without `--rebase-merges`, flattening in-flight merge commits. The 048-morning collision and the 049-evening collision are the same root cause. Spec 050 (`worktree-isolation-for-multi-step-main-writers`, already in-flight) is the long-term fix. Until then: (a) reviewer-queue scripts should honor the lock, (b) `push-with-retry.sh` should use `--rebase-merges`. Priority: HIGH — recurring class.

## From 051 R4 — deferred findings (out of scope; outside the 1-day friction-fix budget)

Surfaced during 051's R4 review cycle 2026-05-15 00:37 PDT. Both are real operational concerns but expand 051's scope beyond the original 2-prong friction-fix charter (lock check + `--rebase=merges` flag). Filed here per the friction-first directive instead of inflating 051's AC text. Reviewable when the queue-reliability cluster gets a deeper second pass post-050.

- **051-followup-A (R4 codex-ops F1, MED) — `push-with-retry.sh` rebase-failure recovery.** AC1 only proves the happy retry path. Under content-conflict or autostash re-apply conflict, the first failed pull can leave `.git/rebase-merge` and conflicted index state behind; the second attempt then runs inside that half-rebased checkout, and the terminal `PUSH-RACE-FALLBACK` queue-errors append does not restore "local commit stays unpushed, clean tree" state. Next launchd tick or founder merge starts from a wedged live `main` checkout. **Fix:** require `push-with-retry.sh` to `git rebase --abort` any in-progress rebase before retrying AND before terminal logging; add a conflicting-rebase/autostash-failure test case that asserts no rebase state remains and the operator still gets the queue-errors row. Estimate ~0.5d. Cross-cut: 050 worktree-isolation eliminates the shared live-checkout race surface entirely, so the practical exposure window for this is "between 051 ship and 050 ship" — modest priority.
- **051-followup-B (R4 codex-ops F2, LOW) — lock-release race in AC2 lock-present holder read.** The lock-present branch logs the lock holder via `holder=$(cat "$LOCK_PATH")` (or equivalent), but `merge-and-cleanup.md`'s trap can remove `.git/echo-merge-in-progress` between the wrapper's existence check (`[ -f "$LOCK_PATH" ]`) and the holder-read. Under `_run_reviewer.sh`'s `set -euo pipefail`, a naive `cat` of a vanished file turns a benign merge-completed boundary into a non-zero launchd failure. **Fix:** make the holder read tolerant (recheck-then-log-as-released if the lock vanished; OR use a single `holder=$(cat "$LOCK_PATH" 2>/dev/null || echo "<released-before-read>")` with explicit fallback string). Estimate ~5 LOC. Edge case; defer until empirically observed in a real launchd tick.
