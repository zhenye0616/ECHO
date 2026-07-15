# Backlog Follow-ups — organized by root cause

This file was reorganized **2026-06-06** from a chronological per-merge log into a **root-cause taxonomy**, validated across five cross-vendor consults (Claude strategist + Codex, rounds 1–5): the ~358 follow-up incidents accumulated through item 094 are not independent problems — they reduce to **six broken or invisible boundary contracts**, each showing up in many surface forms. Every gap below is a **test case** for its root: fixing the root should **resolve, obsolete, or force explicit reclassification of** the test case. (Round 4 = a Codex label-hygiene audit: R5 retitled to include "and gates", R6 split into frozen sublabels, 27 cross-cutting `(also Rx)` labels added. Round 5 = a code-grounded **liveness** audit: 26 bullets that referenced removed code or had already shipped were archived — **coverage ≠ liveness**.)

> **The verbose original** (full per-merge prose, postmortem evidence tables with session IDs + commit SHAs + file:line anchors) is preserved in git history at pre-rewrite commit **`1cee7ecd`**. This file condenses; it does not delete. An independent Codex coverage ledger asserted 0 open items *unaccounted for* — and the round-5 liveness audit then archived 26 that referenced removed code (Raycast, item 081) or had already merged. Round 6 (2026-07-07): a 7-region agent liveness sweep re-verified all ~300 bullets at HEAD — 40+ archived as shipped/obsolete (see Archive), stale annotations corrected in place (billing, parse_failed, first-unanswered mechanism), counts per root recorded in the round-6 archive header.

## The six roots

1. **R1 — Canonical work-artifact identity is not first-class.** *(dominant context-layer root; upstream of R2 and R4)*
2. **R2 — Retrieval is raw-scan/storage-shaped, not a real query substrate.**
3. **R3 — Surface lifecycle is not registry-coupled** (registered ≠ documented ≠ produced ≠ dogfooded).
4. **R4 — Control-plane meaning exists only on instrumented paths.**
5. **R5 — Validation coverage and gates do not match the promised bundle/platform.**
6. **R6 — Multi-agent harness/process invariants are not enforced as code-owned contracts.** *(co-equal with R1 for the "founder out of the loop" gate)*

**Fix ordering:** R1 first for the context layer (it is the join-key prerequisite for everything downstream) — **do not start with embeddings**. R6 is at least as important as R1 for getting the founder out of the loop, because harness bugs are exactly what force the founder back in. R2/R3/R4/R5 are largely downstream or parallel.

**Bullet shape:** `incident — one-line failure / why it tests this root — \`open|partial\` — fix: action` with `(also Rx)` tags on cross-cutting items. Done/superseded incidents live in **Archive**; pure cosmetic nits live in **Opportunistic Cleanup** — neither is re-listed as open root evidence.

---

## Root 1 — Canonical work-artifact identity is not first-class

**Broken contract:** The same real-world object — a repo checkout, a workspace, a file, a conversation — is represented with different identifiers across capture adapters, so the read-time artifact graph cannot join atoms that belong together. Retrieval collapses to "recent repo/session blob" when join keys are weak, absent, or adapter-local.

**Test cases:**

### Cross-adapter identity fragmentation
- **Cross-adapter repo identity split** — ✅ **shipped (095 / `2d4238fc`)**: claude_code + git now capture the canonical normalized remote URL at capture time (matching codex's reference behavior); derived `file`/`branch`/`commit` ids converge too; regression-guarded by `tests/trace/repo-identity-cross-adapter.test.ts` on main. See Archive. **096 (`6f4f8bd9`) superseded the same-machine join-key model** — the same-machine scope/join artifact is now `local:workspace:<canonical-root>` (path-based, git-optional), and the 095 remote URL is demoted to the non-join `context.ambient.git_alias`. See Archive. **Residual (still open) — `partial`:** (a) **same-machine split CLOSED by 096** — remote-less + non-git folders now join same-machine on the workspace key, and the `git init` mid-project transition no longer splits; **cross-machine non-git remains open** (accepted boundary — cross-machine identity assumes git, carried by `git_alias`); (b) historical pre-fix atoms not migrated — **founder decision 2026-06-07: NOT pursued (neither storage backfill nor read-time derivation).** Verified live (post-096 daemon, `find_clusters` on the 16:12 PDT deploy boundary): pre-096 atoms still fragment (claude+git `local:<root>` vs codex `github:<url>`), post-096 fresh atoms join on `local:workspace:<canonical-root>`. The historical fragmentation is **deliberately kept as the A/B baseline** for measuring post-096 (R1) and future R2 retrieval gains — spending code to erase the control group is the wrong trade. Read-time derivation from the already-stored `repo_root` was scoped (cheap, no migration, heals the common claude-launched-at-root case; misses subdir-launch + symlinked repos) and **declined**; (c) the new git-watcher origin cache skips mtime-invalidation on linked-worktree `.git`-file checkouts — `resolveOriginUrl` stats `<repo>/.git/config` (null for worktrees) so a cached origin can survive the full 5s TTL there (`git -C` handles the mis-stamp hazard; bound is 5s); (d) **URL-normalization alias holes (cross-vendor confirm, 2026-06-06):** `src/normalize/artifacts.ts:16-17` strips `.git$` *before* trailing slashes, so `https://host/o/r.git/` keeps `.git` and won't converge with `…/o/r` (SSH branch L12-13 does it in the correct order; only the non-scp path is affected); and `ssh://git@host/o/r` protocol URLs fall through `GIT_SSH_RE` (scp-style only) and keep their `ssh://`+`git@` userinfo, so they won't equal the `https://` canonical form; (e) **Codex `repository_url` unscrubbed (cross-vendor confirm, 2026-06-06):** `src/capture/extractors/codex.ts:172-173` assigns `origin_url` with no credential scrub, unlike the claude/git capture paths (`git-state.ts` + `git-watcher.ts`) — latent userinfo-leak inconsistency if Codex ever emits a credential-embedded remote. *fix:* hash `.git` HEAD/packed-refs for worktrees (c); fix the `.git`/trailing-slash strip order + handle `ssh://` scheme in `normalizeRemoteUrl` (d); share the credential scrubber across the Codex capture path (e); spec read-time aliasing only if legacy data matters.
- **No `joined_by`/`membership_artifacts` debug field** — cluster cohesion is opaque; join-key bugs are invisible because you cannot see which artifact produced a cluster edge. `open` (also R2) — *fix:* expose membership artifacts in cluster response output.

### Cursor workspace identity
- **Cursor repo/workspace title artifact** (063 cont) — Cursor now writes `repo_root` (037), but clusters still lack a canonical human-readable repo/workspace **title** artifact for labels (extractor doesn't resolve the workspace folder name). `open` — *fix:* write `workspace_name`/title artifact at Cursor capture time.
- **Cursor narrow artifact emission** (029) — Cursor atoms emit only `conversation:cursor:<composer_id>`, no file or repo artifact; structurally always sibling-clustered, never joins the rank-1 repo cluster even when the user edits files in that workspace. `open` — *fix:* enrich cursor adapter with workspace-derived repo artifact.

### Codex / startup / host identity
- **Codex `files_referenced` from `apply_patch` payloads** (metadata-normalization branch) — `apply_patch` arguments arrive as an empty string in Codex JSONL; no reliable structured file-path source exists. `partial` — *fix:* accept Codex gap; rely on git-side `files_referenced` fill.
- **010 boot-time workspace-inference scan** — first post-boot turn has no `workspace_id` because the composer→workspace map is primed lazily, not at startup. `open` — *fix:* walk `workspacePrefix` for existing `state.vscdb` at daemon boot.
- **Loose `hostOf` suffix match** (016) — `host.endsWith('github.com')` also matches `github.com.evil.com`; tighten before any user-controlled URL flows through. `open` — *fix:* `host === 'github.com' || host.endsWith('.github.com')`. `src/normalize/artifacts.ts:56-63`

### Granularity & attribution
- **Shared-scope artifact coalesces multi-file work** (018) — the scope artifact alone joins everything in-window; whether this matches "coherent work thread" intuition is dogfooding-driven signal not yet resolved. **095 widened the blast radius** (all three beta-bundle sources resolve the same id), and **096 changed the artifact from `repo` → `workspace`** (`local:workspace:<canonical-root>`): same unresolved calibration, now keyed on the canonical root rather than the remote URL, and now also coalescing non-git folders. `open` (also R2) — *fix:* weight non-workspace artifacts higher, or downgrade workspace-only edges to a `same_workspace` edge kind.
- **Cursor Phase-2 multi-install hardening** (038) — Cursor MRU resolver picks the global-newest source with no composer-id scoping; single-install assumption holds for V1 but breaks under multiple Cursor installs. `open` — *fix:* scope Cursor source lookup to composer-id at V2 multi-install.
- **`cluster.source_breakdown` doesn't reflect Cursor even when capture is healthy** (022) — the remaining 029 bug: Cursor is present in storage but absent from source-attribution, making cross-source attribution wrong at the response surface. `open` (also R2 — identity feeds attribution, ranking is R2) — *fix:* correct `cluster.source_breakdown` Cursor attribution at cluster-build time.

**Fix direction:** Build a canonical artifact-identity layer — a shared repo-identity model (alias rules mapping local paths to remote URLs and back) that every capture adapter writes to before an atom is stored. Cursor's title artifact and Codex's git-side file fill are the two immediate implementations. Only once join keys are reliable do ranking fixes (R2) and inference features (R4) have a stable graph to operate on. This is the first context-layer fix — not an embeddings or ranking problem.

---

## Root 2 — Retrieval is raw-scan/storage-shaped, not a real query substrate

**Broken contract:** `search_memories` is an O(n) in-memory substring scan with no FTS or vector path, pagination runs without a composite `(timestamp,id)` index despite sorting on it, time predicates are accepted syntactically but not normalized, and heuristic ranking degrades on older/conceptual recall with no diagnostic surface for what was dropped.

**Test cases:**

### Query semantics
- **TZ-naive rejection (RC3)** — non-Z timestamps accepted in retrieval tools. `partial` — the **boundary-corruption half is fixed** by `24a57fae`: naive strings are now canonicalized-as-local before compare (no longer silently drop/expand the window), and the existing `[TZ]` warn-not-reject contract was deliberately preserved (rejecting valid offset input would be wrong; reject-vs-warn is a separate API-policy call, intentionally out of the minimal R2 fix). *residual:* decide whether to harden naive from warn → reject.
- **UTC-Z invariant comment absent** — `src/trace/index.ts:202-211` lex-sort ≡ chronological only under UTC-Z; assumption is silent. `open` — *fix:* add one-line invariant comment at sort site.
- **`search_memories` paraphrase returns 0 matches** — literal substring brittle; 4+ data points; eval harness specced as 082. `partial` — *fix:* FTS5 or normalized token match.
- **cap-hit equality strict `===` instead of `>=`** — `recent-work-context.ts:191`; undercounts once `count(filter)` exists. `open` — *fix:* lift to `>=` after `count(filter)` lands.

### Indexing & performance
- **Dead `embedding` column + no FTS + no composite `(timestamp,id)` index** — schema/round-trip code exist but no producer; `search_memories` is an O(n) in-memory scan; pagination sorts without a composite index. `open` — *fix:* add FTS5 + composite index; defer vector to after artifact identity.
- **Server-side substring search** — current scan is pure in-process. `open` — *fix:* push substring predicate into SQL WHERE.
- **Raise `search_memories` MAX_LIMIT=50** — cap too low for broad recall. `open` — *fix:* raise cap; keep cursor pagination.
- **`source_apps: array[]` multi-source filtering** — single-value `source_app` blocks cross-source queries. `open` — *fix:* widen `QueryFilter` to array.
- **`recent_work_context` `limit` zod schema too loose** — `z.number().optional()` silently clamps. `open` — *fix:* tighten to `.int().min(1).max(500)`.
- **`get_atoms` deterministic-drop loop O(n²) `JSON.stringify`** — `get-atoms.ts:188-241` rebuilds full envelope per accepted atom (cap=50). `open` — *fix:* profile; switch to running-sum byte approximation if dominant.

### Ranking & retrieval quality
- **Codex source-prefix retrieval ordering** — raw fs-change rows rank above real turns; no `kind:'meta'|'data'` discriminator. `open` — *fix:* add capture-pipeline `kind` field; boost data-layer atoms.
- **Trace-ranking source-diversity boost absent** — single-source cluster dropped at limit=50 even when it is the only representative of that source. `open` — *fix:* small rank bonus for sole-source clusters.
- **Codex cluster under-ranking in `find_clusters`** — Codex silently absent from rank-1 cluster despite heaviest reasoning. `open` — *fix:* check Codex indexing/rank parity in cluster engine.
- **`rank.ts` `demote=true` + `nowMs=undefined` silent no-op** — `rank.ts:139-140`; latent footgun for future callers. `open` — *fix:* throw on misuse.
- **`atom_too_large_for_wire` (~33KB) caps `get_atom` recovery** — documented limit; ergonomic gap for large atoms. `partial` — *fix:* document loudly; add per-field fetch option.
- **USER-aware content clip absent** — head+tail applied to whole content; USER question can be lost on long turns. `open` — *fix:* parse USER/ASSISTANT; clip ASSISTANT only.
- **Shape-aware projector registry absent** — each new variadic field needs a new dispatch line. `open` — *fix:* registry-driven `SHAPE_PROJECTORS` dispatch.

### Monitoring ergonomics
- **`wait_for_new_turns` misses terminal watcher git commits even with git in union** — wake-latency gap under the 057a explicit-`sources[]` redesign; unverifiable whether this residual survives the redesign (not re-confirmed live or closed). `unverifiable` — *fix:* audit wake-latency path for git source under the new design.
- **connect-to-sibling-session: literal/MRU brittle, cluster discovery works** — recipe undocumented. `open` — *fix:* document cluster-discovery recipe as canonical.
- **`coord_status` `recent_missed` heap** — push-all-then-slice vs min-heap-of-200. `open` (V1.5+) — *fix:* bounded min-heap.
- **`findGitAncestor` deep-path latency observability** — `src/mcp/util/repo-path.ts`; no dev-mode counter. `open` — *fix:* instrument max-depth counter in dev mode.
- **Lazy Ajv compile threshold unevaluated** — compile cost deferred. `partial` — *fix:* evaluate after 071.

**Fix direction:** Artifact identity (R1) is the prerequisite — retrieval quality is bounded by what is correctly keyed. Once stable, the first retrieval fix is a composite `(timestamp,id)` index + pushing substring predicates into SQL (eliminating the O(n) scan without changing semantics). FTS5 follows. Vector/embedding is subordinate to both — only meaningful once the corpus is correctly keyed and literal-match is sound. **Do not start with embeddings.**

---

## Root 3 — Surface lifecycle is not registry-coupled

**Broken contract:** "registered," "documented," "produced," and "dogfooded" are enforced by convention rather than as a single coupled lifecycle, so capture-gate source kinds, MCP tool rosters, wiki pages, deprecated tool registrations, and schema scaffolding drift independently. Deprecation is a calendar note, not a mechanical gate. (Item 081's Raycast removal vs the still-present `wiki/surfaces/hotkey-overlay-raycast.md` and the stale Raycast bullets caught in round 5 are this root in action.)

**Test cases:**

### Producer / registry gaps
- **Dead `app:`/`domain:`/`api:` source kinds + browser extension not wired to daemon** — capture gate advertises source families with zero producers; the "already built" extension doesn't feed the substrate. `open` — *fix:* wire producer or remove dead dispatch.
- **`get_recent_work_context` removal (item 031) overdue** — removal scheduled 2026-05-17, still registered; gated on dogfooding. `open` — *fix:* file 031 final-removal spec.
- **C1 tool-name codegen across surfaces** — consumers hard-code MCP tool names instead of deriving from a generated registry source. `open` — *fix:* generate tool-name constants from registry; gate consumers on it.
- **`metadata.layer:'content'|'meta'` positive-marker convention** — `exclude_metadata_surface` negative-list is a maintenance burden. `open` — *fix:* add `metadata.layer` at every emission point; retire the negative list.

### Wiki + docs promotion debt
- **Shipped-but-undocumented strategist promotions** — wiki pages still owed for items 058, 080, 088, 090, 091, 092 (no wiki citation), plus `wiki/operating-model/legacy-echo-memory-cleanup.md` (still missing). The 031-readiness reevaluations (030/032/033) are `unverifiable` (folded into 038, no gate-closure record) rather than confirmed live or shipped. `open` — *fix:* one batched strategist wiki-promotion pass + `.manifest.json` + `wiki_index.py` regen.
- **Owed pages from 104/106/107/110/112 (round-6 consolidation)** — 104 Granola capture page + `capture/per-app/granola-collected-data` ref; 106 derived-signal-layer page; 107 cross-team decision surfaces page + `[[interface-layers]]`/`[[audit-page]]`/`principles/` updates; 110 mcp-server packaging note (src/brain/ shared-module boundary); 112 storage `canonical_subject` note. `open` — *fix:* fold into the same batched strategist wiki-promotion pass above.

### Surface lifecycle (overlay / launch / MCP-client)
- **Browser-hosted AI tab targeting** — launch/clipboard surfaces detect only desktop app bundles, not browser-hosted AI tabs (`claude.ai`/`chatgpt.com`). `open` (also R5 — browser AI tabs are a promised bundle surface) — *fix:* surface-agnostic browser-tab detection for any future launch surface.
- **Narrow Claude MCP duplicate detection** (083) — broad `already exists` text-match can false-positive on other MCP servers. `open` — *fix:* tighten to echo-server-specific duplicate shape.

### CLI surface
- **`src/echo-home/index.ts` re-export `paths`+`scaffold`** — downstream consumers (072+) lack a canonical import path. `open` — *fix:* re-export from the 071 barrel.
- **072 founder product call: ECHO-owned vs marker-merge command files** — no decision on whether user-edited command files survive resync. `open` — *fix:* record decision; align adapter-sync.
- **Claude MCP adapter spec trigger on `mcp-not-configured`** — first probe hit should file a claude-code MCP adapter spec. `partial` — *fix:* file on first real hit.
- **Rename `/usr/local/bin/echo`→`echoctl` in decision note** — `2026-05-25-echo-pro-paid-coord-layer-design.md:45`. `open` — *fix:* one-line edit.
- **`uninstall.ts` `--force-purge` without `--purge-state` policy** — flag is a no-op AND silently downgrades exit 1→0. `open` (also R6 — CLI exit semantics are a process boundary) — *fix:* decide usage-error vs silent-ignore; encode it.
- **Migrate `scripts/launchd/uninstall.sh` to wrap `echoctl daemon uninstall`** — legacy script bypasses the CLI. `open` — *fix:* thin wrapper.
- **`echoctl doctor` validate `~/.echo/workflows/*.toml`** — corrupt workflows surface at `run` time, not `doctor` time. `open` — *fix:* read-only `loadWorkflow` health check per file.

**Fix direction:** Couple registered↔documented↔produced↔dogfooded as one content-hash contract enforced at the registry level: the MCP server's tool list is the canonical roster, wiki pages are generated stubs gated on that roster (absent page = CI failure, not a backlog item), each tool registration requires a declared producer surface + `metadata.layer` marker, and deprecation schedules are executable gates (removal spec filed and blocked-by the date) rather than prose calendar notes. A single "surface registration pass" per ship cycle closes the drift permanently — and would have flagged the dead Raycast surface at 081's merge instead of a month later.

---

## Root 4 — Control-plane meaning exists only on instrumented paths

**Broken contract:** ECHO can track structured reviewer/watcher flows because they emit coord events, but passive capture **does not reliably infer** handoff, ownership, deadline, closure, or escalation semantics from improvised human work **today**. Control-plane meaning is emitted, **not yet reconstructed** — passive inference is the intended best-effort layer, not a permanent impossibility; and coord/open-loop semantics are partial even on instrumented paths. (Tests for this root must NOT encode "manual coord verbs required.")

**Test cases:**

### Improvised-flow observability
- **happy-path-vs-improvise** — the "nothing fails silently" guarantee is scoped to instrumented paths (spec→task-state→skill→coord_invoke/emit→reviewer wrapper→deadline→coord_status); improvised manual work loses handoff, ownership, closure, and resume semantics entirely. `open` (also R1 — passive inference requires stable cross-tool join keys) — *fix:* two-tier guaranteed/best-effort model + passive inference + retroactive adopt (NOT human-marked coord verbs).
- **No surface-agnostic active-session model** — the daemon has no "active sessions" concept, so no operator surface can render "Active now"; capture works but active externally-initiated work is invisible (contradicts "every AI smarter about you"). `open` (also R3) — *fix:* add a daemon active-session model before any operator surface renders "Active now."
- **Daemon audit evidence lacks returned atom IDs** — `src/mcp/request-log.ts` records call counts/presence, not the exact atom IDs each MCP call returned, so no surface can show "what was actually retrieved." `open` (also R2 — audit surface must reveal exact retrieval evidence) — *fix:* daemon MCP audit exposes exact atom IDs returned per call.

### Coord semantics & surface gaps
- **`find_clusters` excludes coord atoms by accident** — no coord normalizer adapter exists, so exclusion is latent not explicit; adding one later would silently leak coord atoms into clusters. `open` (also R2 — cluster engine needs an explicit coord retrieval invariant) — *fix:* explicit coord-exclusion invariant + test.
- **Terminal `capture-failed` marker not consumed by combine.py/watcher** (087b) — an infra capture-failure is classified as generic "did not respond," hiding it from `combined.md`. `open` (also R6 — semantic lives here, mechanism in the review harness) — *fix:* explicit `capture-failed` row/verdict + auto-escalation.
- **Coord correlation-id forensic search returns 0** (090/091) — `search_memories(source_prefix="coord:")` by correlation-id misses; `coord_status` is the live-health surface. `open` (also R2 — search substrate must index/query coord correlation IDs) — *fix:* index correlation-ids OR canonicalize `coord_status` as health surface.

### Open-loop hint resolution
- **Open-loop hint regexes intentionally narrow** (018) — `FOLLOWUP_RE`/`TODO_RE` may be too tight; no dogfooding signal yet. `open` — *fix:* refine when dogfooding shows tightness.
- **R1.AQ / R1.TODO "earliest" tests missing** (020) — R1.Q earliest test exists; mirror for AQ and TODO. `open` — *fix:* add earliest tests.
- **R1.TODO snapshot-resolver** (020) — matches only `state.delta`, not git-commit `state.snapshot`; TODOs in git-commit atoms go unresolved. `open` — *fix:* revisit after dogfooding evidence.
- **R1.AQ user-with-empty-input edge case** (020) — `hasNonEmptyContent` falls back to `output`; validate during hand-score. `open` — *fix:* validate during hand-score pass.

### Coord deadline hardening
- **Clamp `expected_by` at emit-time** (057a) — clamped value not persisted; cross-restart replay risks non-idempotent deadline. `open` (also R6 — deadline state must survive restart idempotently) — *fix:* persist clamped value at emit-time.
- **Warn on swallowed `deadlines.ingest()` failure** (057a) — failure currently silent. `open` (also R6 — silent ingest failure breaks coord deadline guarantees) — *fix:* emit warn on ingest failure.
- **TZ-aware validation for `expected_by`** (057a) — no `canonicalizeTimestamp`/explicit-Z enforced at intake. `open` (also R6 — coord deadline intake needs a timestamp contract) — *fix:* apply `canonicalizeTimestamp` or require Z/offset.

**Fix direction:** The happy-path/improvise gap is partly downstream of R1 (inference needs canonical join keys — without `repo_root`/session-id parity, reconstructing "who owns this?" is guesswork). Favor passive inference + retroactive promote/adopt over asking humans to mark coord verbs; the goal is that improvised work eventually surfaces the same ownership/closure signals as instrumented flows, not that users learn new ceremony. The coord-exclusion invariant and correlation-id indexing are small self-contained hardenings. Open-loop hint and deadline gaps are calibration items — hold until dogfooding produces a concrete miscalibration signal rather than pre-emptively widening.

---

## Root 5 — Validation coverage and gates do not match the promised bundle/platform

**Broken contract:** Cursor, browser extension, fs-watcher, and Windows are far less continuously exercised than Claude Code / Codex / macOS, so gaps surface late or survive as quarantines, flakes, owed dogfooding gates, and platform/CI blockers.

**Test cases:**

### Cross-platform, CI & release blockers
- **🔵 Windows EPIC — product unit suite never Windows-portable** — ~120 failures / ~25 files (path seps, CRLF, tmp/HOME, POSIX shell-outs); ship contract passes via `onboarding` job only. `open` — *fix:* triage in batches; re-add windows-latest to quality matrix.
- **Aggregate `all-green` required gate deferred** (092) — no aggregate `needs:[quality,onboarding]` job; branch-protection 403 on free-tier. `partial` — *fix:* add aggregate gate when public/paid.
- **Windows release dry-run of `release.yml`** (092) — `doctor` background-spawn + bare `echoctl --version` untested on real Windows. `open` — *fix:* run `workflow_dispatch` dry-run after billing resolved.
- **OS-matrix pre-tag gate** (093) — independent Ubuntu/macOS/Windows `workflow_dispatch` run is the real pre-tag gate; not blocked by billing (GH Actions billing was restored 2026-06-06, CI runs real jobs today) — still open on its own merits, no dispatch gate exists yet. `open` — *fix:* wire and run the `workflow_dispatch` OS-matrix job.
- **Path-skipped aggregate gate** (094) — future required gate must treat path-skipped runs as success. `open` — *fix:* design skipped-as-success aggregate into the gate spec.
- **Cursor agentKv reactivation gate** — Cursor capture degraded surface; reactivation gate triggered (founder upgraded to Cursor Pro). `partial` — *fix:* reopen on qualifying Cursor-user dogfooding signal.
- **Claude Desktop extractor (future phase)** — Local Agent Mode `audit.jsonl` is capturable; no extractor built. `deferred` (NOT in the V1 promised bundle — future-platform scope; not an active V1 test case) — *fix:* spec when Desktop capture is V1.5+ priority.
- **055 Cursor-as-builder run deadline** (051 R4) — observation deadline 2026-05-22 passed; not retired or specced. `partial` — *fix:* retire entry or spec a successor window.

### Test flakes & quarantine
- **Chokidar teardown race** — 3 suites quarantined via `describe.skip` (fs-watcher, cursor, lifecycle); underlying `watcher.close()` race unresolved. `open` — *fix:* deterministic teardown via `probeFreshness` or sentinel-event subscription.
- **Grep-anchored CI ship-blocker for lingering `describe.skip`** (023) — no guard prevents the quarantine outliving V1 cut. `open` — *fix:* CI failure on the tracking-comment string.
- **Confirm `trace/build.test.ts` perf flake across 3+ runs** (026) — closure unconfirmed. `open` — *fix:* run 3+ passes; widen budget or fix timing.
- **Cursor capture-cadence gap** (029) — legacy bubble cadence-limited; 034 addresses structurally but AC4 evidence not confirmed. `partial` — *fix:* confirm via AC4 capture-rate measurement.
- **Close 029 cadence with empirical evidence** (034) — measurement not yet landed. `partial` — *fix:* run Cursor agent-mode sessions; log to journal.
- **Reevaluate `agentKv:` migration gating after AC4** (034) — needs AC4 data to reprioritize. `partial` — *fix:* revisit after AC4 capture-rate lands.
- **Cursor `checkpoint_not_found` warn-loop** (observed 2026-07-08) — `capture.cursor` warn-spams every ~15s for a missing composer checkpoint (composer `c4de0cd6…`, checkpoint `4e1a5a52…`) with no self-heal and no log demotion; ~5.7k warn lines/day drown real warnings in `echo-daemon.out.log`. `open` (also R6 — P6 self-heal is the missing primitive) — *fix:* rebuild-or-drop the stale composer checkpoint on first miss + warn-once-then-debounce per composer.
- **Real-daemon/concurrency flake class** — `tests/cli/init.test.ts`, `tests/mcp/recent-calls-endpoint.test.ts`, `run-codex-builder` lockfile-race, `coord-volume-perf.test.ts` flake under full-suite load. `open` (also R6 — concurrency failures expose lock/process invariants) — *fix:* harden daemon-health/timeout setup or isolate from voting pool.
- **`sources.ts` win32 case-fold testability seam** (091) — `normalizePathForCompare` win32 branch untestable on POSIX without platform/env injection. `open` (also R1 — cross-platform path identity needs testable normalization) — *fix:* inject `platform`/`env` parameters.
- **Pre-existing flakies stabilization spec** — `trace/build`, `git-watcher`, `coord-status`. `open` — *fix:* file stabilization spec; widen budgets or fix timing.
- **Real long-running MCP shutdown-flush test (067 AC4)** — Test (i) waived at merge; production behavior unverified. `partial` — *fix:* trigger on dogfooding evidence of unexpected `pending→killed`.

### Owed dogfooding / validation gates
- **Lag-measurement harness + Cursor/Claude lag verification** (010/011) — ≤2s / ≤500ms; harness + measurements never landed. `open` — *fix:* build harness; run 5-trial median.
- **e2e wait-budget bump** (011) — `waitFor` deflake still unshipped; wait budget is still `5000ms` in 4 files (the `parse_failed` warn half already shipped — see Archive). `open` — *fix:* bump budget 5000→10000ms.
- **MCP integration smoke vitest test** (015) — ~30 LOC in-memory daemon spawn asserting RC=0; never filed. `open` — *fix:* spec and ship.
- **Founder hand-scores 111 R1 resolution rows** (020) — TP/FP/TN/FN; ≥80% precision gate; verdict column empty. `open` — *fix:* founder half-day scoring pass.
- **Verify migration row-count log on first boot** (022) — 152 expected rows; unverified. `open` — *fix:* check daemon log for `{converted}` line.
- **Rerun tail_session bypass scenarios** (026) — byte/call before-after not logged. `open` — *fix:* rerun 13:27/14:00 PDT scenarios; journal.
- **launchd-cycled smoke + Codex daemon-restart validation** (027) — stateless-transport fix unverified via wire path. `open` — *fix:* run smoke post `launchctl kickstart -k`.
- **Skeleton-format dogfood closure** (028) — real before/after entry not logged. `open` — *fix:* run default-args scenario with `format:'skeleton'`; journal.
- **Real-`echo.db` truncation.source_breakdown test + Phase-3 Cursor live verification** (029) — real-DB fixture + Cursor confirmation owed. `open` — *fix:* add real-DB fixture; founder runs Cursor ≥30 min, checks `source_breakdown.cursor ≥ 1`.
- **Real before/after dogfooding entry for new toolkit** (030) — AC10c closed with synthesized entry; real field evidence owed. `open` — *fix:* log real entry next morning resume.
- **No-args find_clusters auto-expand chain verification + optional Cursor pass** (032) — empirical loop not closed. `open` — *fix:* rerun the 13:06 PDT chain; log three-step AC.
- **get_atom long-turn `truncations:["content"]` dogfood verification** (033) — AC not demonstrated in real session. `open` — *fix:* call `get_atom({id})` next time truncations appear; log outcome.
- **Cursor AC4 capture-rate dogfooding (≥90%)** (034) — formula measurement not run. `open` — *fix:* run sessions; apply AC4 formula; log.
- **AC4 Cursor agent-mode capture dogfood** (036) — multi-tool-call turn ≥90% not landed. `open` — *fix:* schedule within 60s of next Cursor agent-mode session.
- **AC7 `repo_path` six-call dogfood + zero cross-project bleed** (037) — fresh-composer six-call run not done. `open` (also R2 — `repo_path` scoping is retrieval-substrate behavior) — *fix:* run six calls; confirm no bleed.
- **post-038 toolkit composed-workflow dogfood (≤2 calls/step)** (038) — AC6 demo bar unverified in daily workflow. `open` — *fix:* run real workflow citing post-038 tool names; log.
- **Task-state cap-thrash monitoring** (046) — the cold-start reduction measurement itself already landed (`comparison-047.md` §1, PASS recorded — see Archive); cap-thrash monitoring under sustained load remains unmeasured. `open` (also R6 — task-state cold-start is a harness invariant) — *fix:* monitor cap-thrash on a populated task-state under real dogfooding load.
- **AC5 §3/§5 metric fills** (047) — reviewer-tick token counts + founder subjective signal unfiled. `open` — *fix:* pull token counts from review log; fill §3 table.
- **`inferSourceKind` 'unknown' wire-shape test debt** (063 cont) — the universal-only fallback path in `compact.ts` `inferSourceKind` has no test. `open` — *fix:* add a wire-shape test for the 'unknown' source-kind fallback.
- **Overlay packaged-`.app` macOS smoke + ambient-dot dogfood gate** (080) — manual build smoke + ≥3 overlay sessions not done (Tauri `tools/echo-overlay/`). `open` — *fix:* build `.app`, drive menu-bar UI, log ≥3 sessions / ≥2 days.

**Fix direction:** The structural fix is continuous exercise of the under-dogfooded surfaces — assign at least one daily-Cursor and one Windows user to the validation loop before V1 ships, not after. On the CI side, the immediate unblock is resolving GitHub Actions billing so the OS-matrix dry-run can run; every gate that depends on CI is currently inert. Dogfooding debt batches into two sweeps: a founder half-day to close the hand-score + lag-verification items (which gate higher-level UX decisions), and a tooling pass to convert fixed `sleep` waits and synthetic fixtures into real-signal tests before the Windows tester arrives.

---

## Root 6 — Multi-agent harness/process invariants are not enforced as code-owned contracts

**Broken contract:** ECHO's build/review/merge/release machine depends on ambient git state, shell exit behavior, human discipline, stale rendered adapters, shared files, launchd quirks, and convention-based artifacts. Invariants exist in prose but the system does not enforce them at the boundary where another actor depends on them. Codex's cross-cutting re-analysis named the three root shapes: **ambient state treated as a reliable API; local observation trusted over remote durable truth; protocol boundaries still too human-shell-shaped for cross-vendor work.** Co-equal with R1 for the "founder out of the loop" gate.

**Test cases:**

### Role isolation (strategist-in-worktree) · `R6.role_isolation` (P5)
- **Strategist-in-worktree / `main` isolation — P5 second occurrence (070/071 rebase clobber)** — strategist foreground commit clobbered by a parallel watcher rebase; recovery required a manual restore commit. `open` — *fix:* mirror 050 worktree isolation for the strategist path OR a `main_busy` lease atom.
- **Strategist-in-worktree — P5 third surface (merger Step A/D pre-flight)** — merger's Step A pre-flight and Step D `git pull --ff-only` both require a clean live checkout, so strategist's normal mid-spec edits block every `/merge-and-cleanup`. `open` — *fix:* strategist-in-worktree closes both surfaces uniformly.
- **Merger Step A/D transitional mitigation** — whitelist dirty files outside merging-items' scope; stash-pull-unstash bringup so friction is visible-and-handled. `partial` — *fix:* ship as workaround while the structural fix is unshipped.
- **Accidental `wiki/*` sweep into commit** (077 hygiene) — after stash+pull+pop, wiki files left index-staged; `git add backlog/...` swept them in silently. `open` — *fix:* pre-commit hook requiring ack for files outside `files_to_modify`.
- **Untracked strategist wiki promotions never committed** (077 hygiene) — six post-shipment pages authored but uncommitted; caused a builder-read-fail at a pinned SHA. `open` (also R3 — wiki lifecycle failed because the process didn't commit output) — *fix:* commit every wiki promotion in the response it's authored (mirror "commit specs immediately").

### Silent-failure / shell discipline · `R6.shell_exit_contract`
- **`/merge-and-cleanup` Step-B orphan-detection `/var` vs `/private/var` symlink** — defeats skip-if-registered; nuked a registered watcher worktree during 076. `open` — *fix:* canonicalize both sides via `realpath`/`pwd -P` before compare.

### Shared-file concurrency (journal) · `R6.shared_file_concurrency`
- **HEADLINE: shared dogfooding journal has no concurrency story (corroborated 4× — 090/091/Codex monitor/095 full-auto run)** — every reviewer wrapper, watcher tick, and monitor does stash/pull/append/commit/push on one file; 091 hand-resolved 5×; the 095 full-auto pipeline run hit it twice more (autostash conflicts when the strategist's journal edit collided with the reviewer wrappers' appends during the review loop — hand-resolved by chronological union both times). Contention scales exactly with the parallelism the product sells. `RESOLVED` (098, merged 2026-06-08, commit `04eed26b`) — **per-actor monthly shards** (`mcp-interactions-journal-YYYY-MM-<actor>.md`): each writer appends only to its own shard so `git pull --rebase` always replays cleanly (disjoint paths); journal = union of shards read via `tools/dogfooding/journal-cat.sh <month>` (lossless-or-loud). Cutover-not-migration (June file frozen + LD4 note). **Accepted residual:** *same-slug* concurrent writes (two writers mapping to one actor slug — e.g. two `codex` reviewer ticks, or a `claude` reviewer tick racing the interactive/watcher `claude` writer) remain possible but are not the documented cross-reviewer collision; the documented loop topology maps concurrent writers to distinct slugs. File a successor only if a same-slug collision is ever *observed*.

### Merge mechanics · `R6.merge_mechanics`
- **queue-errors per-event aggregation view** — no rendered index for cross-item inspection. `open` — *fix:* lazy index-generator script.
- **046 option-b targeted-restore path** — `git checkout origin/main -- <path>` fallback when staged `combined.md` blocks option-a. `partial` — *fix:* monitor post-merge dogfooding.

### Reviewer orchestration · `R6.reviewer_orchestration`
- **Reviewer background execution (item 041)** — founder still must physically activate Codex + paste Cursor each round; "any reviewer agent in future" must plug into one mechanism. `open` HIGH (also R4 — activation is handoff/deadline ownership semantics) — *fix:* solve the activation pattern generically, not just Codex+Cursor.
- **Watcher cron is session-only (no launchd)** — queue stalls overnight when the strategist session closes. `open` — *fix:* launchd-ify the watcher (standalone helper not needing a live Claude session).
- **Global/passive reviewer ticker selects by round-scan, not item-scoped, and doesn't skip completed items** (round-6 correction, folds two prior mis-described observations into one) — the launchd fallback in `_run_reviewer.sh` (~line 763) passively glob-scans for the first unanswered round rather than being handed an item-scoped `--request-path`; this is the SAME root as the Sweep-2026-07-07 parked observation "reviewer request-selection doesn't skip completed items' stale rounds" (see that section's note for the fold). Two sessions previously used two different escape hatches for the parallel-spec-contention symptom of this. `open` (also R4 — request-path selects the control-plane subject) — *fix:* make the request path a first-class `--request-path` arg (or per-item launchd plist) AND have the scan skip rounds whose item already converged/completed.
- **Same-vendor reviewers serialize** — `codex`+`codex-ops` share one Codex account/session; clean ~5-6 min stagger every round. `open` — *fix:* document; mix vendors (`codex`+`claude`/`cursor`); per-account cap is below ECHO's control.
- **10 remaining AC8 integration tests need scaffolding** (057b) — each needs distinct scaffolding (mocked Codex CLI, EMFILE injection, launchd-cadence sim). `open` — *fix:* file successor item once scaffolding design is finalized.
- **parse-failure-evidence-preservation test refile** (049) — deferred from R7→R8 contradiction; due against the reviewer-invocation contract spec. `open` — *fix:* file against the converged successor.
- **Binary provenance / PATH hardening of reviewer-bindings gate** (087b) — gate validates invocation shape, not `codex` binary provenance/authenticity. `open` — *fix:* host-trust hardening successor.
- **claude/cursor reviewer read-only migration** (087b) — gated on the 056-claude-required-flag-gate decision. `partial` — *fix:* unblock once 056 flag lands.

### Spec / pipeline lifecycle · `R6.pipeline_lifecycle`
- **inbox specs unreviewable** — review tools only scan `ready|claimed|pending_review|complete`; a parked `inbox/` spec is un-reviewable without a temp-promote that makes it prematurely claimable and can break `blocked.py` globally. `open` — *fix:* add `inbox/` to review tools' lookup; keep `blocked.py` excluding it.
- **`docs/BACKLOG.md` in spec `files_to_modify` pattern bug** — strategist error inherited from 060; will recur. `open` — *fix:* `tools/lint-spec.py` rejecting forbidden paths in `files_to_modify`.
- **proposed→ready stale `status: proposed` frozen by seal** — `promote.py` seals before setting `status: ready`; later correction invalidates the sha. `open` — *fix:* set `status: ready` before seal OR exclude `status` from the normalized hash.
- **Builder handoff commit mislabeled `review:`** — collides with `/review-pending` sidecar commits in git log; observed at 088 and 089. `open` — *fix:* rename builder handoff prefix to `handoff:`/`pending-review:`.
- **Malformed `ready_content_sha` fixture in `test_blocked.py`** (089) — missing+mismatch covered; malformed handled in code but unfixtured. `open` — *fix:* add direct fixture; non-blocking.
- **Process-discipline rules (batch)** — agent-run-log filename convention; test-fallout-permitted convention; tests-outside-`files_to_modify` escalation rule; reviewer-artifact-location review-prompt fix; Storage-adapter pre-listing claim rule; multi-tool-impl-review rule; kill-tool grep-scope; Gate-4 re-grep rule; structural-review round-count + decay-curve heuristics. `open` — *fix:* bundle into next AGENT_INSTRUCTIONS + README sweep.
- **Same-vendor `/review-pending` blind spot** — Claude subagent missed `builder.md` staleness another Claude caught. `open` — *fix:* prefer cross-vendor reviewer at every `/review-pending`.
- **Cycle-length-budget gate** (049) — strategist should detect at R3–R4 and simplify; 072's 18-round arc confirmed the need. `open` — *fix:* bake explicit gate into `skills/review-queue-watch.md` after combine.py reads the table.
- **Strategist-drift trajectory-monitor tripwire + review-cost reporting** (072) — pause+escalate if findings haven't dropped for 3 rounds AND target recent-round patches; per-tick `usage:` yaml. `open` — *fix:* monotonic non-improvement detection + cost field.
- **Reviewer test-coverage gaps** (043) — cursor no-op harness; optional-cursor fixture; invalid-config fixtures (5 of 7); cache identity assertion; `_lib` import-time env fragility. `open` — *fix:* file successor spec for the test-gap batch.
- **Watcher-state + slash-body executable integration tests** (039/040) — partially closed: a higher-level integration test now exercises part of the (a)/(b)/(c) transition, but full prose-to-invocation translation is still unverified by executable assertion. `partial` — *fix:* extend the existing integration test to cover the remaining transition legs.

### Stale-adapter root-cause (code-owned artifacts) · `R6.adapter_freshness`
- **Code-owned `emit-sidecar.py` writer + resolve `producer` to writer-role** — `producer` was never emitted programmatically; LLM transcription produced wrong values twice on the 087 sidecar; `review-pending-orchestrator` is always correct. `resolved` — *fix:* ship `emit-sidecar.py` (stamps + validates-before-write); add `validate-sidecar.py` CI gate via `check-coupled-invariants.sh`; retire the enum. — RESOLVED 2026-06-09 by 099 (`ab512320`): `emit-sidecar.py` ships (code-owned writer stamps+validates `producer` before write), `validate-sidecar.py` CI gate wired into `check-coupled-invariants.sh`, transcribed enum retired.
- **Generalize skill-adapter freshness gate to ALL client adapters** — `sync-skills.sh --check` only verifies `.claude/commands/`; `~/.codex/skills/ECHO:*` is outside it; that's how the `producer` template went stale. `resolved` (also R3 — rendered adapters are lifecycle/registry artifacts) — *fix:* fold all render targets into one registry/content-hash check (`install-echo-codex-skills.sh --check`). — RESOLVED 2026-06-09 by 100 (`15a15eaa`): `install-echo-codex-skills.sh --check` ships, placed operator-side in `echoctl doctor` (NOT the merge gate — `~/.codex/skills/` is HOME-relative operator-local state; gating merges on it would couple merges to one operator's machine). 099's After-Completion ask to rescope this into a successor proposed item was satisfied by 100 itself — no new proposed item owed.
- **`echo_skill()` render-at-use-time (endgame, defer)** — thin loaders reading canonical `skills/<name>.md` at execution; doesn't solve mis-transcription, so it's the arc. `partial` — *fix:* defer per friction-first; unblock after emit-sidecar.py.
- **Stale Codex `producer` field** — Codex adapter rendered May 17, field added May 28; propagated undetected. `resolved` — *fix:* superseded by emit-sidecar.py + generalized freshness gate. — RESOLVED 2026-06-09: 099 (`ab512320`) closed the writer half (`producer` no longer LLM-transcribed) and 100 (`15a15eaa`) closed the detection half (operator-local Codex adapter drift now caught by `echoctl doctor`).
- **Stale watcher adapter dropped 086 marker-write → builder couldn't claim** — watcher converged but certified nothing; `blocked.py` kept the spec blocked; builder found zero candidates. `open` (also R4 — the marker write is a convergence control-plane transition) — *fix:* enforce marker-write via tooling (dispatch-next-round refuses to exit if marker missing); sync-check adapter before each tick.
- **C2 adapter-drift detection for Codex-installer adapter** — no parallel to `sync-skills.sh --check`. `resolved` — *fix:* subsumed by the generalized freshness gate above. — RESOLVED 2026-06-09 by 100 (`15a15eaa`): exactly the generalized freshness gate (`install-echo-codex-skills.sh --check` in `echoctl doctor`).
- **Document additive-only extension pattern idiom** (077) — 077's `agent-runner.ts` opt-out flag + helper is the canonical worked example. `open` — *fix:* add a pattern note to AGENT_INSTRUCTIONS or wiki.

### Reliability primitives (flow-agnostic contracts) · `R6.reliability_primitives` (P3–P12)
- **P3–P12 + C3 primitives** — P3 partial-write tolerance; P4 explicit durability contract; P5 at-most-one ownership (3× in 065, 2× more in 070/071); P6 SIGKILL-safe self-heal; **P7 idempotent+near-free re-run — SHIPPED** (`--rebase=merges` landed, see Archive); P8 attributable audit trail; P9 capability self-description+routing (first observed 070/071); **P10 structured typed inter-agent messages — partial** (a typed registry now exists at `validate.ts:104-131`, but `merge_paused`/`blocked` message types are still absent — the 6-untyped-handoffs gap from 065 is only partly closed); P11 programmatic convergence without human-in-loop (3× in 065); P12 trust+sandbox per agent; C3 per-agent/per-item cost accounting. Each MUST hold under any future flow shape. Full observed-instance evidence tables (session IDs, commit SHAs, file:line) preserved in git history at `1cee7ecd`. `open/partial` — *fix:* spec each remaining triggered primitive in priority order — P5 (strategist-in-worktree/lease), P10 (add `merge_paused`/`blocked` to the typed registry), P11 (merge_resolver capability), then C3/P9/P12.
- **THE arc: "typed cross-vendor orchestration with remote-durable-truth state machine"** (077 codex consult) — replace ambient-state coordination (git index as handoff medium, local working-tree as ground truth, prose templates as machine-consumed writers) with code-owned writers + produce-time validation + remote-ref monitoring; covers the highest-leverage R6 work. `open` — *fix:* spec as the synthesis item.
- **Mandatory reframe gate when ≥2 findings target prior-round patches** — currently a judgment-call recommendation in `review-queue-watch.md`, not a protocol trigger; Friction-B regression closures confirmed the gate works. `partial` (also R4 — reframe is escalation semantics, not only prose) — *fix:* make it fire automatically, not by strategist discretion.

### Misc harness · `R6.misc`

> R6 sublabels are **frozen test-case namespaces** (round-4 Codex audit): when these become dev test cases, name them `R6.<sublabel>.<incident>`. The cross-cutting fix theme `R6.remote_durable_truth` (use remote-ref ground truth, not ambient git/working-tree state) spans the shell-discipline, merge-mechanics, and reviewer-orchestration sublabels.
- **agent-id `chmod 0600` + cross-machine lock** (047) — `run-codex-builder.sh:41-46` umask-dependent. `partial` — *fix:* `chmod 600` at creation; cross-machine deferred.
- **probe SIGKILL escalation + wizard mutex** (073) — `probe.ts:realSpawn` SIGTERM-only; concurrent-wizard cache divergence needs `withLock`. `partial` — *fix:* arm both on dogfooding signal.
- **Registration SIGKILL escalation** (083) — Claude MCP registration spawn SIGTERM-only. `open` — *fix:* add SIGKILL escalation after grace period.
- **Codex `/review-pending` adapter frictions** (084) — sandboxed child fails app-server init; escalated child hangs and never writes `--output-last-message`; queue-error commit scope unclear; dirty review tree complicates `git status`. `open` — *fix:* resolve in the reviewer-invocation contract spec; clarify queue-error commit scope.
- **Codex loopback-MCP sandbox escalation doc** (090/091) — `codex exec` monitors need escalation to reach the daemon. `open` — *fix:* document escalation in the monitor recipe.
- **Daemon launchd status flap** — `launchctl list` shows loaded/last-exit-1/not-running despite kickstart exit 0. `partial` — *fix:* investigate launchd PID-file race; V1.5+ reliability cleanup.
- **039 inline-patch queue-contract caveat** — strategist editing a reviewer's pushed response violates the immutable-artifact assumption; logged as emergency. `partial` — *fix:* AC3 emission-validation gate unblocks the strict reading.

**Fix direction:** The synthesis target — named by Codex's fresh-eyes re-analysis of the 077 frictions — is **"typed cross-vendor orchestration on remote-durable-truth":** replace every ambient-state coordination surface (git index as handoff medium, local working-tree checks as ground truth, prose templates as machine-consumed writers, launchd env vars as config) with code-owned writers, produce-time validation, and remote-ref monitoring. Two of the three original near-term forcing functions have shipped: `emit-sidecar.py` + the generalized adapter freshness gate (closed the stale-adapter recurrence loop), and `--rebase=merges` + C9-after-C11 reorder in `skills/merge-and-cleanup.md` (P6/P7 one-line fixes — see Archive). The remaining near-term forcing function: strategist-in-worktree isolation mirroring 050 across all roles (closes P5's second-occurrence trigger — the only role still without isolation). The longer arc — mandatory reframe gate, per-actor journal shards, typed `coord_emit` handoffs, programmatic merge_resolver — lands as capacity allows, but every new spec should be checked against the P3–P12 primitives first: does this lock in a vendor, a human-in-loop dependency, or an ambient-state assumption? If so, generalize before shipping. **Co-equal with R1 for the founder-out-of-the-loop gate — the harness bugs are exactly what force the founder back in.**

---

## Archive — superseded / done / historical (NOT open work)

Recorded with reason so the coverage trail is honest; do not re-list as open test cases.

### Earlier archives (rounds 1–4)
- **Old Cursor "silently invisible" diagnosis** — refuted by 2026-05-09 SQLite/echo.db probes (`raw/internal/decisions/2026-05-09-cursor-capture-diagnosis-correction.md`); the narrower Cursor attribution/title gaps live in R1/R5.
- **Old `agentKv:` "extractor obsolete" diagnosis** — superseded by the corrected diagnosis + 034 evidence.
- **Killed item 017 (read-time normalizer wiring)** — explicitly killed 2026-05-09; reopen only for a concrete consumer.
- **JSONL shape observability duplicate** (011) — covered by the `parse_failed` warn row in R5.
- **Original skeleton response-shape ask** (025) — shipped by 028.
- **`get_atom` as a missing primitive** — shipped by 033; only the dogfooding verification remains (R5).
- **Item 038 "in flight"** (037) — not an open follow-up after 037.
- **AC6b bootstrap / final-verdict notes** (039/040) — historical status, not open work.
- **Reviewer background-execution headline** (039) — became item 041; the residual gap is listed in R6.
- **044 smoke fail-open** — absorbed into 045 AC2.
- **`/process-backlog` builder.md refresh** (047) — specced as 048.
- **P12 sandbox satisfied** (065) — a working mechanism to preserve, not debt.
- **Option-D in disguise** (077) — closed by the Friction-A removal-proof-matrix regression.
- **Friction A + B regression evidence** (077) — explicitly "no further action." (The R6 "mandatory reframe gate" item is a distinct open enhancement: make the gate an automatic protocol trigger, not the closed regression.)
- **Duplicate same-vendor serialization expansions** (087/089) — one open row retained in R6; expansions archived.
- **089 RCA expanded analyses** — explanatory duplicates of the 089-shakedown rows in R6.
- **093 packaged selftest blocker** — filed and shipped through 093; the remaining gate is the OS matrix (R5).
- **093 pid-lock collision** — corrected as a reviewer-environment artifact, not a bug.
- **093 DOC-02 narrowing** — founder accepted the contract; record only.
- **Old "clean-host rehearsal" AC4 framing** — corrected to the OS-matrix dry-run (blocked by billing, R5).
- **094 path-filter residual** — documented accepted operator risk, not mechanism work.
- **Known-V1 multi-agent-dev-template + coordination-layer held** — deferred *opportunity* pending market-validation / founder-out-of-loop signal, not an active broken invariant. Reopen on second-project friction, third-party pull, or post-V1 cohort feedback — see `1cee7ecd` for the held-decision rationale.

### Raycast surface — removed by item 081 (all-REMOVE, `9bf44cea`; round-5 liveness audit)
Raycast extension deleted; the live operator surface is the Tauri `tools/echo-overlay/`. These referenced `tools/raycast-echo/` code that no longer exists, so they are dead test cases (not re-listed as open):
- audit-fetch AbortController timeout · `customCommand` conditional visibility · PATH-undefined runner note · `pasteIntoFrontmost` hardcoded target · AnswerView daemon-error toast · retire `search-context`/`ask-context` commands (also done by 078) · `claudeOauthToken` preference validation · visual-gravity launch row · `SessionDetail.tailLog` whole-file read · empty-landing ActionPanel · cluster-vs-atom search asymmetry · `useClusterPreviews` per-cluster cost · `launch.ts`/`recent-asks.ts` unit tests · 063 five-state UX dogfood gates · Recap surface dogfood gate · Raycast orphan-process cleanup script · recent-asks case-insensitive dedupe.
- *Surface-agnostic survivors were kept/reframed, NOT archived:* Cursor title artifact (R1), browser-hosted AI tab targeting (R3), daemon active-session model (R4), daemon audit-returns-atom-IDs (R4+R2), `inferSourceKind` 'unknown' test debt (R5). The Tauri overlay packaged-`.app` smoke (080) stays live in R5.

### Shipped since filed — chronological-log residue (round-5 liveness audit)
Carried as open but already merged before the rewrite; archived with commit evidence:
- **Cursor `repo_root` write** — 037 / `e5f10197` (extractor now writes `metadata.repo_root`; residual title-artifact gap kept in R1).
- **TZ-marker `+0700`/`+07` variants** — `src/mcp/util/iso8601.ts` accepts them; tests cover it.
- **`get_recent_work_context` skeleton overflow cap** — `recent-work-context.ts` caps skeleton arrays; tests assert clipping.
- **Daemon `uptime`** — `32e07e13` (replaces `unknown`; CLI tests assert it).
- **Packed-install `files` allowlist** — `package.json` includes `assets/echo-{skills,roles,workflows}/**`; packaging tests cover it.
- **🔴 CI-noise test-suite split** — broad non-orchestration split shipped at `1cee7ecd`, but `test:product` still names a repo-wide suite. True product-only semantic correction → SPECCED as `backlog/proposed/2026-07-13-132-product-graduation-foundation.md`.
- **Fixed-`sleep`→poll selftest** — `84033829` (CAP-02 polls daemon readiness/release).
- **review-pending Codex fanout** — `skills/review-pending.md` now has Codex invocation + sidecar validation + commit/push.
- **proposed→ready lifecycle docs** — repo docs (`backlog/README.md`, `AGENT_INSTRUCTIONS.md`, `CLAUDE.md`) describe `proposed/ → ready/` (note: pasted AGENTS preamble may still be stale — regenerate separately).
- **`/review-pending` → `/merge-and-cleanup` sidecar handoff** — `skills/review-pending.md` commits and pushes the sidecar.

### Shipped after the rewrite (2026-06-06→)
Closed via the full spec→review→build→merge pipeline; recorded with commit evidence.
- **Workspace identity: canonical-root same-machine join key (the R1 foundation past 095)** — 096 / `6f4f8bd9`. Git-OPTIONAL workspace identity: the same-machine join key is now the `workspace` artifact `local:workspace:<canonical-root>` (path-based, stable across `git init`, present for non-git folders); the 095 normalized remote URL is retained as the non-join `context.ambient.git_alias` for a future cross-machine merge (invariant: *one active join key per join domain*). New `src/capture/workspace-root.ts` `resolveCanonicalRoot` (git-toplevel → anchor-walk → reported-dir, ambient-root guard, realpath/case canonicalization, bounded never-throw); `probeGitState.repo_root` kept git-only via a shared `gitToplevel` primitive (095 `git_state` preserved). Converged over **6 cross-vendor review rounds** (local-minimum at r5 → broken by a fresh-context Codex holistic spec rewrite per founder direction); **built blind by a Codex builder** (exact allowlist, zero drift); independent **Claude code-reviewer subagent** verdict MERGE AS-IS (AC2 regression vector verified clean). **Closes** the git-init-transition + non-git same-machine split (R1 residual a, same-machine half). **Still open:** cross-machine non-git (accepted boundary), identity-at-rest materialization (#2), Cursor (parked), normalizer residuals (d)/(e). **NOT yet deployed** — daemon runs the installed echoctl package; live in capture only after rebuild+reinstall. Wiki: `wiki/architecture/artifact-identity.md` updated.
- **Cross-adapter repo identity split (the dominant R1 join-key gap)** — 095 / `2d4238fc`, regression guard `6d34cd30`. Capture-time canonical remote-URL identity across claude_code + codex + git: `origin_url` now captured by `probeGitState` + the git watcher (credential-scrubbed, repo-root-scoped, invalidatable cache); the git adapter stops hardcoding `null`. Spec converged in 2 cross-vendor review rounds; built **blind** by a Codex builder; verified by an **independently-authored blind held-out oracle** (red 4/4 on pre-fix main → green 4/4), landed on main as `tests/trace/repo-identity-cross-adapter.test.ts`. Residual sub-gaps (remote-less repos, historical-atom migration, worktree `.git`-file cache invalidation) kept in R1. **NOT yet deployed** — the daemon runs the installed echoctl package; live in capture only after rebuild+reinstall. Unblocks the R2 (ranking) + R4 (passive inference) downstream chain for the beta bundle; R6 is co-equal and untouched.

### Round 6 — 2026-07-07 liveness audit (7-region agent sweep)
Per-root re-verification counts at HEAD: **R1 13L/0S** (nothing archived — dominant context-layer root, all 13 test cases still live); **R2 21L/6S/1O/1U**; **R3 12L+7 wiki-subs live/3S+15 wiki-subs shipped/1U**; **R4 13L/0S** (nothing archived — all 13 control-plane test cases still live); **R5 35L/3S/1O/2 split**; **R6 36L/17S/5O/1U**; tail region per `tail.md` (per-merge append bullets, mixed SHIPPED / SHIPPED-TO-SPEC / relocated). "L"=live/untouched, "S"=shipped, "O"=obsolete, "U"=unverifiable (left in place, not archived — status could not be confirmed either way). SHIPPED-TO-SPEC lines below cite the absorbing spec id.

- [R2] "since=...-07:00 returns 0 atoms; only Z works" — SHIPPED: TZ-offset canonicalization via `canonicalizeTimestamp()` (`src/util/timestamp.ts`, `24a57fae`).
- [R2] "`QueryFilter` `order`/`order_by` missing" — SHIPPED: order+cursor now supported (`interface.ts:22`).
- [R2] "Default 4h window wrong for 'where did I leave off'" — SHIPPED: loud docs + AUTO_EXPAND shipped (032).
- [R2] "`search_memories` KNN/determinism" — SHIPPED: search determinism tie-break shipped (`search-memories.ts:152-163`).
- [R2] "Atom envelope payload floor" — SHIPPED: skeleton-only response shape shipped (`recent-work-context.ts:108,188`).
- [R2] "`wait_for_new_turns` source union must include `git`" — OBSOLETE: 057a redesign made git first-class via explicit `sources[]`.
- [R2] "`wait_for_new_turns` timeout hard-caps ≤60s but docs imply free knob" — SHIPPED: docs now state the cap (=60) inline.
- [R3] "Wiki says 8 MCP tools, server registers 14" — SHIPPED: wiki now matches `server.ts:271-313`.
- [R3] "Tool descriptor field scope" — SHIPPED: scope annotation shipped (`find-clusters.ts:68-70`).
- [R3] wiki-promotion batch (items 019, 020, 021, 022, 025, 026, 028, 029, 034, 036, 037, 038, 039, 047) — SHIPPED: work-trace/storage/mcp-recent-work-context/cross-tool-spec-review/review-queue-protocol/builder-bindings pages landed.
- [R3] "the reviewer_gate addendum (043)" — SHIPPED.
- [R3] "the fail-to-converge-as-designed page (049)" — SHIPPED.
- [R3] "`docs/BACKLOG.md` regen (088)" — SHIPPED: `3f0462ea`.
- [R3] "remove/retire the stale `wiki/surfaces/hotkey-overlay-raycast.md`" — SHIPPED: raycast retirement shipped (`7c3cccf8`/`8919e6ee`), page range covered by 078.
- [R5] "🔴 GitHub Actions billing blocks ALL CI/release" — OBSOLETE: billing restored 2026-06-06; CI runs real jobs today.
- [R5] "`_run_reviewer.sh:17` baked-in `$HOME/Desktop/Project_echo` default (043)" — SHIPPED: parameterized via env var (`_run_reviewer.sh:35`).
- [R5] "POSIX exec-bit assumption `src/coord/paths.ts:140` (057b)" — SHIPPED: inline comment shipped (`paths.ts:320-323`).
- [R5] "`parse_failed` warn + e2e wait-budget bump (011)" (warn half) — SHIPPED: `log.warn("parse_failed")` shipped (`claude-code.ts:230`, `7e4d4e0b`); wait-budget-bump half kept live (still 5000ms in 4 files).
- [R5] "Role-state cold-start reduction measurement + task-state cap-thrash monitoring (046)" (cold-start-measurement half) — SHIPPED: PASS recorded (`comparison-047.md` §1); cap-thrash-monitoring half kept live.
- [R6] "`coord_invoke` ENOENT against packaged daemon (077 + 092 recurrence)" — SHIPPED: 097, `daemon.ts:467`.
- [R6] "monitor `|| true` + `2>/dev/null` swallows rebase error" — SHIPPED: `git fetch` + `git cat-file -e` now standard.
- [R6] "chained-bash push-rejection silently continues" — SHIPPED: `push-with-retry.sh:88-90`.
- [R6] "`disown $!` fails in `run_in_background` harness" — OBSOLETE: bash-wrapper class replaced wholesale by Node spawn in `coord_invoke`.
- [R6] "`set -e` not propagating through background harness on push reject" — OBSOLETE: same Node-spawn replacement.
- [R6] "`pgrep -f \"REVIEWER_NAME=...\"` false-positives" — OBSOLETE: same Node-spawn replacement.
- [R6] "`/merge-and-cleanup` C11 `git push | tail` masks non-zero exit" — SHIPPED (`:354`).
- [R6] "`git pull --rebase` discards conflict resolution on retry" — SHIPPED: `--rebase=merges` landed (`ed5ed8cf`).
- [R6] "C9 cleanup runs before C11 push" — SHIPPED: C9/C11 reorder landed (`ed5ed8cf`).
- [R6] "Rebase replay drops merge-commit's backlog-move/sidecar extras" — SHIPPED: second-parent preserve landed (`ed5ed8cf`).
- [R6] "Stale `ECHO_COORD_REQUEST_PATH` misfired ~24 ticks (087b)" — OBSOLETE: plist only sets TMPDIR now.
- [R6] "Tests spawn real reviewer wrappers (057b r9)" — SHIPPED: wrapper-spawn test stub shipped (`coord-invoke-spawns-wrapper.test.ts:147-160`).
- [R6] "Claim selector ignores spec-review convergence" — SHIPPED: convergence gate shipped (`promote.py:126-142`; caveat: sha-seal still bypassable).
- [R6] "Remove legacy `spec_review` / `legacy_spec_review_satisfied` path (088)" — SHIPPED: 089, `c4150c62`.
- [R6] "Builder wiki-edit policy conflict (019 drift)" — SHIPPED: canonical rule landed (`AGENT_INSTRUCTIONS:367`).
- [R6] "Founder STATUS.md milestone + spec-template fix" — SHIPPED: STATUS.md phrased founder-post-merge (`AGENT_INSTRUCTIONS:370`).
- [R6] "`/review-pending` sidecar-already-exists rerun behavior undefined" — SHIPPED: fail-closed behavior documented (`review-pending.md:190-195`).
- [R6] "Executable test for watcher marker-write path (086)" — OBSOLETE: mechanism deleted by 089.
- [R6] "Confirm 027 run-log artifact exists" — SHIPPED: run-log artifact confirmed to exist.
- [R6.reliability_primitives] "P7 idempotent+near-free re-run" — SHIPPED: `--rebase=merges` landed (folded into the P3–P12 bullet's in-place correction).
- [R6.reliability_primitives] "P10 structured typed inter-agent messages" — SHIPPED (partial): typed registry exists (`validate.ts:104-131`); `merge_paused`/`blocked` types still absent (kept live in place within the P3–P12 bullet).
- [Tail-103] "shell-reachable + recent-calls-endpoint flaky tests (103 merge)" — recent-calls-endpoint half SHIPPED (fixed by 111, 977ms observed); shell-reachable half SHIPPED-TO-SPEC (2026-07-07-126).
- [Tail-107] "recent-calls-endpoint 'logs every runtime-registered tool' timeout (107 merge)" — SHIPPED: fixed by 111 (977ms observed).
- [Tail-108] "Packaged daemon baseline blocker: propose_decision excluded from tarball (108 merge)" — SHIPPED-TO-SPEC (2026-07-07-127).
- [Tail-109] "Extend the planned 108 packaging fix to dist/enrich → ceo-slack-responder import chain (109 merge)" — SHIPPED-TO-SPEC (2026-07-07-127).
- [Tail-110] "import-closure.test.ts: assert shippedJs non-empty (110 merge)" — SHIPPED-TO-SPEC (2026-07-07-127).
- [Tail-112] "shell-reachable flaky under full-suite load (112 merge)" — SHIPPED-TO-SPEC (2026-07-07-126).
- [Tail-113] "strategist post-shipment — new wiki/architecture/signal-window page (113 merge)" — SHIPPED: page exists.
- [Tail-114] "ceo-slack-brain.test.ts process-kill test load-flaky (114 merge)" — SHIPPED-TO-SPEC (2026-07-07-126).
- [Tail-116] "intake-terminal --watch never checks handle.enabled (116 merge review)" — SHIPPED: enabled-check landed (`intake-terminal.ts:317`).
- [Tail-116] "intake-terminal real-path status line hardcodes '0 classifier errors' (116 merge review)" — SHIPPED: classifier-error count now plumbed (`:264` variable).

---

## Opportunistic Cleanup — cosmetic nits (not root-cause evidence)

Preserve if still desired; fix opportunistically when the surrounding file is touched. Not systemic-root evidence.

- **Code/comment nits:** `ObservedState` discriminated-union simplification (016); R1.TODO type-cast narrowing (020); migrate-timestamp inline comment (022); `next_cursor` misleading test comment (026); `get_atom` redundant id validation (033); Prettier churn in shared test files (033); `triggerRepoll` self-coalescing `inFlight` guard (034); `combine.py` dead-branch + re-parse cleanups (042/043); `import os` vs `__import__` (045); `compact` result type cast (063); `doctorState` schemaVersion brittleness note (093); `release-matrix-green` CAP-02 pid-reuse guard + `EPERM⇒alive` comment.
- **Prose/label nits:** doubled run-log filename convention (019); watcher prose-vs-emitter literal mismatch (044); helper-path divergence reconciliation (046); 048 awk/pointer cosmetics; `process-backlog` variable-name clarity (066); empty-view stale copy (069); `echo-home` `ECHO_HOME`/`'code' in err` tidy (070); `discoverSkillsRoot` error-field relabel (071); split composite tests (071); `wired_at` comment + BOM/init `JSON.stringify` comments (074); stdout separator + `daemon:logs` path align (075/076); `auth` substring false-positive note (073); 078 `pending-decisions` `GIT_ASKPASS`/`runaway_churn` dedup nits.
- **Stale-comment hygiene** (harness primitives) — correct stale code comments opportunistically when the next reader notices.

## From 100 merge (2026-06-09) — codex-adapter-freshness-check (non-blocking)

- **doctor perf:** short-circuit `checkCodexAdapter` when no `~/.codex` exists, to avoid the ~2s installer subprocess spawn on every `echoctl doctor` (reviewer-flagged, optional; the shell's absent-install fast path already returns 0 quickly).
- **`--check --quiet`:** optional quiet mode for scripted callers of `tools/install-echo-codex-skills.sh --check`.
- **Strategist post-shipment (owed):** promote 100 per its After-Completion notes — mark `_followups.md` R6.adapter_freshness bullets resolved ("generalize skill-adapter freshness gate to ALL client adapters", "C2 adapter-drift detection for Codex-installer adapter", "Stale Codex producer field" detection half), recording the split: repo-tracked adapters → merge gate (`sync-skills.sh --check`); operator-local Codex adapter → `echoctl doctor` (HOME-relative). Cross-ref 099. Optional one-line operating-model wiki note; no new product wiki page required. — DONE 2026-06-09 (wiki: `operating-model/adapter-freshness.md` documents the two-tier model for both 099 + 100; R6.adapter_freshness bullets reconciled above).
- (from 102 merge 2026-06-13) Add a true parallel (Promise.all) two-writer race test for `upsertProjectRegistration` to complement the lock-timeout/no-truncation test (`tests/echo-home/paths.test.ts:191`); AC8 names concurrent-upsert atomicity but only sequential + lock-failure paths are exercised.
- (from 102 merge 2026-06-13) Builder agent_notes for 102 should note that `coord_invoke`'s request-file existence had briefly become a precondition (B1) and is no longer — for the record.
- [105 merge 2026-06-19] responder.ts:207-216 — successful brain answer is downgraded to a failure message if only the AC6 usage-log append throws; log the append error but still post the valid answer.
- [105 merge 2026-06-19] brain.ts:219-234 — optional recursion-depth guard on assistantText JSON parsing (cheap defense; harmless for trusted shallow codex JSONL).

## From 104 merge (2026-06-21) — non-blocking
- 104: coalesce partial-checkpoint writes if first-sync batches get large (granola-poller.ts:655-664) — optimization.
- 104: optionally skip writing an empty-summary atom when both summary fields absent (granola-poller.ts:513).
- PROCESS: spec-review convergence != buildability — 104 hit 3 build escalations (storage substrate, enum ripple, snapshot pins) the queue review missed. Consider a buildability/file-surface lens in the review queue or a builder dry-run before sealing.

## From 106 merge (2026-06-22 — granola-meeting-signal-extraction)
- [106] Disambiguate same-subject decision linkage (src/enrich/granola-signals.ts:447): rationale→decision fallback matches on canonical_subject; a meeting with ≥2 same-subject decisions picks the last via Map overwrite. LLM-supplied `rationale_for` takes precedence, so low-impact. Non-blocking.
- [106] Lightweight extraction context: the brain runs `codex exec -C <repo>`; full-repo context timed out (180s), an empty dir is rejected (non-git). Give the extractor a minimal trusted-context git dir instead of the full repo.
- [infra] Leaked selftest daemons: ~10 `com.echo.selftest.*` launchd jobs are still running against deleted `/tmp/claude-*/echo-selftest-*` dirs (their sqlite db is unlinked-on-disk, open-fd only). PRODUCTION IS UNAFFECTED — verified 2026-06-22: `com.echo.daemon` (pid 70318, MCP :38478) holds a stable LINKED db at `~/Library/Application Support/ECHO/echo.db` (719MB, inode 6997711, nlink=1; same inode it has open). Fix = tear down selftest daemons when their temp dir is cleaned. Unrelated to 106.

## From 107 merge (2026-06-27 — cross-team-decision-sync-slack)
- [107] propose-decision-tool.ts:95-102 — wrap the `postDraftCard` Slack call so a post-throw dismisses/marks the draft instead of orphaning a `pending` draft. Acceptable for n=2 (next `/echo decision` re-proposes); harden before >2 users. Non-blocking.
- [107] brain.ts:244-256 — `asksForRawContext` keyword heuristic (`diff`/`session`/`log`/…) can false-trigger a canned raw-context refusal on legit decision queries that merely contain those words (e.g. "what did we decide about the logging format"). The structural boundary already enforces the real decision-layer-only cut, so this is only a UX guard — tighten or drop it. Non-blocking.
- [107] R2 startup confirm-target validation: R2 specced startup-time validation of the configured confirm-card target; the build validates at call-time instead (load-bearing invariant — missing/invalid target → operator-visible error + NO draft — is enforced and tested). Optional belt-and-suspenders: add the startup check too. Non-blocking.

## From 108 merge (2026-06-28 — slack-linear-intake-gate)
- [108] Make `idempotency_token` deterministic or remove the random suffix before any future Linear idempotency-key reuse.
- [108] Consider suppressing duplicate `Looking...` messages on replayed Slack message events.
- [109] Store-driven retry for non-terminal seed records — retries currently depend on the classifier re-emitting the candidate within the lookback (granola-intake-candidates.ts:388-467); drive from seedStore.list() instead. Fast-follow before real bridge traffic.
- [109] Skip re-classification for notes whose candidate keys are all terminal — every 10-min bridge pass re-runs the brain on every external note in the lookback.
- [109] Wrap ECHO_GRANOLA_INTAKE_OWNER_MAP parse errors as GranolaIntakeConfigError so a JSON typo cannot crash the daemon at startup (daemon/index.ts:93 unguarded).
- [109] Minor: accepted-seed-but-Linear-unconfigured drops with log.debug only (responder.ts:806-813); owner resolution nondeterministic when multiple attendees map.

## From 110 merge (2026-07-02 — packaged-daemon-brain-boundary) — non-blocking
- [110] Extract the duplicated `npm pack --dry-run --json` parsing into a shared tests/packaging helper (now in both packed-manifest and import-closure tests).
- [110] Deduplicate `normalizeProjectName` + TeamDecision types: single owner in src/brain/brain.ts, responder surface imports from it (inlined during the hoist to avoid re-crossing the 076 boundary).
- [110] Record in drift log that 106+109 crossed the packaged boundary undetected through full review rounds; note the AC5 conditional-registration seam and the AC6 kickstart fix. (The wiki/surfaces/mcp-server.md packaging-note update itself is consolidated into Root 3's "Wiki + docs promotion debt".)

## From 111 merge (2026-07-03 — list-task-states-batched-git) — non-blocking
- [111] Rename run log to drop the doubled date prefix (raw/internal/agent-runs/2026-07-02-2026-07-02-111-... -> 2026-07-02-111-...).
- [111] Restore the pinned-commit-time fallback in the batched path (or document the hard-error choice): the single log walk can miss a tree-present path whose only touching commits are merges (git log --name-only emits no file list for merges without --diff-merges); old code fell back to the pinned commit's own time.
- [111] Strengthen or drop the tautological AC6(a) injected-failure counter test (counter lives inside the fake runner's own try/finally, so it cannot observe a leak); optionally add a PATH-shim git counter if out-of-seam spawn regression ever matters.
- [111] Fold into the [103]/[107] flake-tracking entries above: recent-calls-endpoint timeout root cause is FIXED by 111 (977ms observed) — those older entries are now resolved.
- 2026-07-04 (from 112 merge): during 113 build, confirm loop filter treats canonical_subject as the sole forward join key.
- 2026-07-04 (from 112 merge): builder-report calibration — builder-112 agent_notes claimed 1617/0 tests vs observed 1885+/1886; counts should come from the actual run output.
- 2026-07-04 (from 113 merge): event-time mode materializes the full in-scope ledger and filters since/until in JS — push into SQL WHERE once the ledger grows.
- 2026-07-04 (from 113 merge): founder may override the C4 fixup (SCOPE_EXCLUDED_SOURCE_PREFIXES) if derived:granola-signals-index SHOULD appear in company windows.
- 2026-07-04 (from 114 merge): shared packed-safe module for team-decision read + cofounder identity (removes readLatestDecisions/queryLatestTeamDecisions divergence risk; builder's open question).
- 2026-07-04 (from 114 merge): drift checkpoint pruning + stop persisting whole file per transition (unbounded growth, O(n^2) I/O at scale).
- 2026-07-04 (from 114 merge): tighten if-status-ok guarded assertions in decision-drift tests (vacuous-pass risk).
- 2026-07-04 (from 114 merge): strategist post-shipment — wiki/surfaces/drift-alert page + loop diagram station 6 planned→shipped. (The signal-window page (113) has since shipped and the storage note (112) is consolidated into Root 3's "Wiki + docs promotion debt".)
- 2026-07-04 (from station-2 lock-in codex review): capture-side re-ingest for updated Granola notes — poller permanently skips ingested note ids, so station-2 re-extraction is unreachable for note edits; decide supersede-chain re-capture (104 dedupe_key design) before relying on re-extraction. Until then: ingest meetings only after Granola finishes processing.
- 2026-07-04 (from station-2 lock-in codex review): current-run/supersedes visibility for signal consumers — drift sweep + intake read signals without manifest filtering; pin consumer-side current-run resolution (or add opt-in mode to getSignalWindow) before station-3 rewiring.
- 2026-07-04 (from station-2 lock-in codex review): station 2→3 contract pinned in the lock-in record — provenance tuple + signal_type admission rules + transcript-anchored-quote preference; honor when station 3 is rewired onto signals.
- 2026-07-04 (from expansion-invariants audit): extractor-#2 preconditions bundle — parameterize filterToCurrentSignalRuns/resolver (HIGH: currently fails OPEN for non-Granola signal sources in search_memories); dispatch handle → keyed map + drift chain join; extract shared buildSignalCore(); drift is-signal predicate; split AC4 conformance into CORE_FIELDS + provenance; add #2's -index manifest to SCOPE_EXCLUDED_SOURCE_PREFIXES. Full ledger in raw/internal/decisions/2026-07-04-expansion-invariants-additive-backcompat.md §audit.
- 2026-07-04 (from 115 merge): drift-sweep (station 6) + intake (station 3) adopt filterToCurrentSignalRuns when next touched; wiki signal-window page to cite the helper as the currentness half of the station-2 contract.
- 2026-07-05 (from 116 merge review): invalid brain-name env (e.g. ECHO_CEO_BRAIN=foo) exits via bare main().catch stderr message instead of the "skipped:" status-line format (tools/intake-terminal.ts:300,358).
- 2026-07-05 (from 116 merge review): enrich JSON logs interleave with intake-terminal cards on stdout — consider stderr diversion for demo cleanliness; pair with item 117 observability.
## Sweep 2026-07-07 (strategist, post-116-123 shipping run)

The 2026-07-05/06 tail (25 bullets) dispositioned. Promoted to specs:

- **backlog/proposed/2026-07-07-124-doctor-loop-report-truth.md** absorbs: wire doctor to the 120 heartbeat contract (117 AC3 follow-up, was listed twice), station-2 quiet-day staleness false-alarm (2026-07-06 live check), station-1 phantom source classes claude-code:/codex:/cursor: + silent coord: omission (listed twice: live check + 122-dashboard finding).
- **backlog/proposed/2026-07-07-125-observability-hardening-batch.md** absorbs: trace-card channel seed-store gap (123 live-trace finding — provenance-loss banner can't fire for terminal cards), brain.ts proxy EPIPE handlers, card-atom double-append edge, --note pre-123 seed listing, heartbeatLine esc(), abandoned-not-cancelled comment, present-db AC4 test variant.
- **backlog/proposed/2026-07-07-126-daemon-smoke-test-serialization.md** absorbs: shell-reachable full-suite port-contention flake (bit 116/121/122-build merges), ceo-slack-brain descendant.pid load flake (2026-07-05 entry above).

Done (closed by the 2026-07-06 wiki promotion pass, commit dd4e3cb8): [118] wiki drift-alert nominate-then-confirm update; [121] canonical-invocation docs fold into the terminal-intake-card page; [123] proxy-bypass blind-spot documented in loop-observability.

Parked (unchanged): [122 post-ship] dashboard-v2 candidates (founder-usage gate); [121] sibling entry-guard audit (only-if-recurs); [118] week-1 statements_no_candidate near-miss collection (time gate, week of 2026-07-06); [122 loop observation] reviewer request-selection doesn't skip completed items' stale rounds — **folded (round-6 liveness sweep) into the corrected R6.reviewer_orchestration bullet** ("Global/passive reviewer ticker selects by round-scan..."), which identified this as the same root as the passive launchd fallback in `_run_reviewer.sh` (~line 763); no longer tracked separately here.

Dropped: [118] revert 4 incidental prettier reformats (cosmetic, no reader confusion observed); [119] 'deferred' counter doc polish (log keys already distinguish; wiki delivery-semantics section shipped without confusion).

Process lessons folded to R6.merge_mechanics: [119] verify brace balance after keep-both conflict splicing (common-suffix hoist).

## 125 merge follow-ups (2026-07-07, non-blocking)

- [125 follow-up] optional: e2e `--note` test through `runTraceCard` without an override, to pin the enumerate wiring directly.
- [125 follow-up] optional: revisit the AC3 guard query if card-atom volume ever makes the per-emit full-source scan matter.

## 124 merge follow-ups (2026-07-07, non-blocking)

- [124 follow-up] hardening: `readSignalsHeartbeat` should return null (fall to the inferred path) when `last_tick_at` fails to parse to a finite time — a corrupt-but-JSON-valid heartbeat currently reads as observed-and-never-stale.
- [124 follow-up] founder policy call: should an observed-disabled station-2 worker ever downgrade doctor's overall rollup (currently soft by design — the 124 merge deliberately kept observed disabled/degraded from downgrading the pinned overall-rollup contract).
- [124 follow-up] perf cleanup candidate: `queryClassHealth` materializes full rows to count; `coord:` adds 18k+ rows per doctor run — a `COUNT(*)` storage method would fix the class.

## 127 merge follow-ups (2026-07-07, non-blocking)

- [127 follow-up] backslash-tolerant guard match in src/mcp/server.ts (separator-agnostic regex) — the optional-module guard matches the missing path with a forward slash while Windows ERR_MODULE_NOT_FOUND carries backslashes; any future partial-install on Windows still hard-crashes the daemon through this guard. Left deliberately unfixed under 127's locked scope.
- [127 follow-up] serialize or fixture-share the npm-pack-based packaging tests (shared tarball per run or single-thread the tests/packaging pool) — packaged-boot joins the full-suite flake set via concurrent prepack rebuild races.
- [127 follow-up] AC4 founder/watcher gate: after merge, confirm onboarding·windows-latest (CI) and validate-package·windows-latest (release) go green on real runs; link the run evidence.
- [127 AC4 gate, partial PASS 2026-07-07] Windows packaging fix VERIFIED: onboarding·windows-latest node24 fully green, node22 got past ERR_MODULE_NOT_FOUND into selftest — the 127 closure works. NEW downstream bug unmasked on node22: EBUSY unlink of echo-selftest db during cleanup (win32 refuses to delete open files; daemon handle not released before unlink; timing-dependent — node24 passed). Next Windows-chain item.
- [CI, pre-existing, surfaced by 127 AC4 watch] quality jobs fail on exactly ONE test across all OS/node combos: tests/mcp/tools/list-task-states-batching.test.ts:57 AssertionError (deep-equal) — passes locally (2094 green tonight ×3 merges); CI-env dependent, suspect actions/checkout shallow clone changing git log --name-only behavior (adjacent to the [111] merge-commit fallback followup above). Blocks any future all-green aggregate gate (092).

## 128 merge follow-ups (2026-07-07, non-blocking)

- [128 follow-up] grep audit for other injectable-clock/`Date.now()` splits in enrich/ and surfaces/ — the intake cutoff bug (injectable `deps.now` defined but a second raw `Date.now()` used for the lookback cutoff) is a latent class; fold the below vacuous-coverage item into this audit.
- [128 follow-up] candidates.test.ts:234 internal-only attendee-filter test passes VACUOUSLY after ~2026-07-30 (fixture ages out of the 30d wall-clock window — silent coverage decay, not a fuse). Address inside the injectable-clock grep-audit above.
- [126 review finding] tests/packaging/packaged-boot.test.ts still uses the TOCTOU findFreePort/canListen over the same 40000-49999 range 126 retired from shell-reachable — retire it the same way (bounded-retry with the daemon/process bind as the allocation signal) when the packaging-test serialization follow-up (127) is picked up

## 129 merge follow-ups (2026-07-07, non-blocking)

- [129 follow-up] cosmetic: parseEmittedAtMs's `Number.isNaN` check is unreachable (canonicalizeTimestamp throws first on a bad value) — harmless defense-in-depth; note only, no fix required.
- [129 follow-up] real-world validation (spec After-Completion): with an artificially hung reviewer across daemon restarts, confirm the first-ever production `deadline_missed` atom actually appears — the deadline_missed detector is now able to fire in production for the first time.
- [126 fixup observation] tests/coord/coord-volume-perf.test.ts is load-sensitive (300ms budget measured 445ms during a machine-load spike) — same class as the packaged-boot follow-up; give perf assertions a load-tolerant budget or exclude perf tests from the standard gate
- [126 fixup observation, escalates the 106-era infra followup] ~7 long-running LEAKED echo daemons on this box drove system load to ~100 during test runs, directly causing gate flakes — the "tear down selftest daemons when their temp dir is cleaned" item is no longer cosmetic; a one-shot cleanup (launchctl bootout of com.echo.selftest.*) + the structural fix should be prioritized
- [123 live-trace insight, 2026-07-07] the intake classifier currently makes ZERO ECHO MCP retrievals (capture_status=zero_retrievals on all fresh cards) — cards are synthesized from meeting signals alone; "cross-tool cross-time card assembly" is aspiration, not reality. NEXT DEMO-MECHANISM TUNING SPEC: make the brain classifier retrieve scoped context and use trace:card to measure whether cards improve.
- [from 130 merge 2026-07-09] Daemon opt-in for the decision-changeset producer behind an ECHO_DECISION_CHANGESET_* enable (item-109 off-by-default pattern) — REQUIRED before meeting→card goes live
- [from 130 merge 2026-07-09] Confirm-after-edit: repost fresh-revision card (or update button value) after an accepted edit — edited changesets currently unconfirmable via UI
- [from 130 merge 2026-07-09] Coverage: two pinned close-marker state-matrix tests + true Promise.all concurrent-CAS test
- [from 130 merge 2026-07-09] Founder call: client-intake vs decision-batch classifier semantics at producer go-live (decision-loop canonical model: route by content class)
- [from 130 merge 2026-07-09] Store-path parity: bridge vs responder changeset-draft-store defaults diverge under ECHO_HOME override
- [from 130 tier-1 live test 2026-07-09] Test-isolation leak: a fixture ChangesetDraft (note-1 / "Client sync" / C-INTAKE) exists in the PRODUCTION draft store ~/.echo/state/decision-changeset-drafts.json — some test wrote through granolaDecisionChangesetDraftStorePath() without a temp-dir override; find and fix the test, purge the fixture record
- [from 130 tier-1 live test 2026-07-09] Classifier flattens decision shapes: all 6 EchoBrain Legal lines classified `executable` (policy/directional content like "keep IP separated" became tasks); executable-when-uncertain bias is working but crude — evaluate few-shot decision_type examples in the classifier prompt at producer go-live
- [from 131 AC3 2026-07-10] item-130 bridge must read signals through filterToCurrentSignalRuns — RC3 residual; 131 closes current-run filtering for the post-meeting brief path only
- [from 131 merge 2026-07-10] RC4 residual: shouldExtractNote should treat an existing current-run manifest with matching fingerprint as sufficient skip across SEPARATE checkpoint paths (granola-signals.ts:454-480); low priority — prod shares granolaSignalCheckpointPath(); own item with test
- [from 131 merge 2026-07-10] Cosmetic: FENCE token-reread ENOENT path (granola-poller.ts:607) — clean mismatch error + best-effort temp unlink when lock dir already tombstoned
- [from 131 merge 2026-07-10] Optional: adopt rebound holdout suite (holdout/131-confirmation: tests/holdout-131-rebound/) into main test tree as permanent six-root-cause regressions
- [2026-07-10] tools/review-queue/dispatch-next-round.py cannot dispatch items parked in backlog/inbox/ — it invokes request.py without --artifact-path (find_artifact scans proposed/ready/claimed/pending_review/complete only). Watcher tick for 132 r1→r2 reproduced branch (b) manually. Fix: thread the current request.md artifact_path through to request.py.
- [from 131 founder workflow review 2026-07-10] Brief target-miss diagnostics: AC1 hard-fail messages should instruct the likely fix, not just state the miss — no-fresh-note case names the Granola private-My-Notes cause ("move the note to a team-space folder, e.g. BIASLAB; ECHO sees it within ~60s") alongside the didn't-record possibility; extraction-not-complete case says "wait ~1-2 min and rerun". Error-copy only on the existing AC1 contract; no new architecture. Context: founder's advisor meetings are calendar-less (ad-hoc Zoom join), so the manual move-to-folder step is permanent and the miss will recur.
- [from 131 founder workflow review 2026-07-10] `echoctl brief --wait` retry-until-published: the already-named 131 follow-on (spec Out-of-Scope bullet 1, consumes AC1's target contract) — run at meeting end BEFORE Granola publishes; polls until fresh note visible + ingested + extraction ok, then emits brief; bounded timeout fails loud with the target-miss diagnostics above. Chosen as the best mitigation inside the founder's no-calendar-event workflow (calendar route stays optional); pairs with the manual BIASLAB drag being order-insensitive.
- 2026-07-13 (from 132 review): extend scanGraph to run collectBuiltinChildProcessAccesses on non-owner closure files — getBuiltinModule('child_process') currently evades the static fence on shipped code (tests-only today); add red closure fixture.
- 2026-07-13 (from 132 review): tighten tools/product mount-line regex or add a device-path-containing-' on ' fixture.
- 2026-07-13 (from 132 review): consider exit 0 from product `run` on clean SIGTERM/SIGINT shutdown (currently 1).
- 2026-07-13 (cleanup, founder-deferred): extract shared decision-gate machinery (decision-store, draft-store, intake-seed, propose-decision tool) out of src/surfaces/ceo-slack-responder/ into a neutral home, then remove the Slack/Linear responder legs. Deferred until after YC demo freeze; intake-terminal (kept) depends on the intake bridge that imports these modules.
- 2026-07-13 (founder topology supersession): create three source-independent local repositories before remote publication or FOUNDER LIVE — client product `echo-brain`, internal orchestration `echo-loop`, and context capture/retrieval `echo-context`; keep Project_echo as pinned migration source/backup during parity, then transfer authority per repo only through a later founder checkpoint. → SPECCED as `backlog/proposed/2026-07-13-133-local-echo-brain-source-extraction.md`, `backlog/proposed/2026-07-13-134-local-echo-loop-source-extraction.md`, and `backlog/proposed/2026-07-13-135-local-echo-context-source-extraction.md`. The context authority leg is now SPECCED across `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md`, `backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md`, `backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md`, and `backlog/proposed/2026-07-15-139-echo-context-founder-mac-authority-activation.md`; brain/loop authority legs remain open.
- 2026-07-15 (from 133 merge): track the TypeScript/typescript-eslint peer-range mismatch as qualification debt and optionally consolidate superseded identity sections in the migration record; neither blocks the local DEV repository merge.
- 2026-07-15 (from 135 merge): before qualification, explicitly adjudicate residual onboarding/task-state and coordination vocabulary, Project_echo default-path semantics, and loopback authentication/exposure policy; these do not block repository merge at DEV. → SPECCED across `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md`, `backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md`, `backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md`, and `backlog/proposed/2026-07-15-139-echo-context-founder-mac-authority-activation.md`.
- 2026-07-15 (from 134 merge): refresh or explicitly historicize the target repository's tracked `EXTRACTION-STATUS.md` only in a future target version whose new HEAD/tree and provenance are deliberately rebound; its conservative authority/install posture is correct and it is not an acceptance or runtime artifact, so this does not block the reviewed DEV repository merge.
