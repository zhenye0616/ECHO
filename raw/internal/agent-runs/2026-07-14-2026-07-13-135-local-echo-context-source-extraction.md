# Agent run — 2026-07-13-135-local-echo-context-source-extraction

- Item: `2026-07-13-135-local-echo-context-source-extraction`
- Builder persona: `fable-builder-135` (Claude Code / claude binding)
- Branch: `agent/135-echo-context`
- Worktree: `/Users/zhenye/Desktop/Project_echo--135-echo-context`
- Target repo: `/Users/zhenye/Desktop/echo-context` (standalone, local-only)
- Pinned source commit: `2971310441b69735cbe759293abd8c4d044bf347`
- Outcome: **ESCALATED — incomplete attended build, target unaccepted.** Per the
  governing lifecycle decision, the visible target is incomplete and must be
  founder-archived before a continued or fresh run. No auto-resume.

## Run 1 (2026-07-14, PDT)

### Summary

This is a 5-day-estimate, byte-exact multi-proof extraction spec (eight ACs,
14 provenance JSON + 9 schemas, six authored audit tools, a standalone-buildable
TS package with ~107 tests, a native `better-sqlite3` install proof under
`sandbox-exec` network denial, context-tool + service parity harnesses, a
migration record, and a `codex-ops` reviewer feature-branch child-push handoff).
Full acceptance at the required correctness bar — where an independent reviewer
reproduces every artifact byte-for-byte from its own clone — is not reachable in
a single attended session. The governing decision
`raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md`
explicitly provisions for this: "If a builder is interrupted, the visible target
is incomplete and unaccepted. The orchestrator inspects and manually archives it
before a fresh assigned run. No agent automatically adopts, deletes, resumes,
reconciles, or repairs it."

Rather than push a large volume of unverified, non-byte-exact, non-building
artifacts into `pending_review` (which would fail the reviewer's from-clone
reproduction immediately and misreport status), this run completes and *verifies*
the load-bearing foundation, records the full disposition analysis, and escalates
honestly with a precise per-AC remaining-work map. This de-risks the continuation.

### What was completed and verified this run

**Environment binding (verified).** Toolchain matches the spec pins exactly:
`/usr/local/bin/git` = git 2.37.3; `/usr/local/bin/node` = v22.22.1. Pinned
commit `2971310…` resolves to a `commit` object; its tree is `7320c94d…`.
Source-repo hygiene under the config-free envelope: no replace/graft refs, no
promisor config, not shallow, no alternates.

**AC1 — target repository created (structural init done).**
- Absence gate passed; one non-recursive `mkdir` (EEXIST-fail semantics).
- `git init --initial-branch=migration/2026-07-13-135 --template=` under the
  config-free envelope (`env -i` allowlist; `GIT_CONFIG_NOSYSTEM=1`, empty
  `GIT_CONFIG_GLOBAL`, `GIT_ATTR_NOSYSTEM=1`, `GIT_NO_REPLACE_OBJECTS=1`).
- Config set: fixed identity (`echo-context migration` /
  `migration@echo-context.local`), `core.hooksPath=/dev/null`,
  `core.logAllRefUpdates=false`, `commit.gpgsign=false`, `tag.gpgsign=false`.
- HEAD → unborn `refs/heads/migration/2026-07-13-135`. No remote. No reflogs.
- NOT YET accepted: acceptance ("clean, one branch/root history, passing
  `git fsck --full`") is only meaningful once the extracted contents are
  committed; the repo currently has zero commits (correct incomplete state).

**AC6 — canonical source-inventory tool authored and VERIFIED.**
`/Users/zhenye/Desktop/echo-context/tools/emit-source-inventory.mjs` implements
the AC6 algorithm: refuses any `--git` not literally `/usr/local/bin/git` (and
not symlink-resolving to it), spawns git under AC1's config-free envelope,
requires zero exit / no signal, parses NUL-delimited `ls-tree -r -z` output,
selects exact root-or-descendant membership, rejects LF/invalid-UTF-8 paths,
sorts by raw UTF-8 bytes, and emits each path + LF including a final LF.

Verified with the exact canonical command from AC6 (20 roots):
```
/usr/local/bin/node tools/emit-source-inventory.mjs \
  --git /usr/local/bin/git --git-dir /Users/zhenye/Desktop/Project_echo/.git \
  --sha 2971310441b69735cbe759293abd8c4d044bf347 \
  --root src/capture … --root src/guards.ts … --root tests/fixtures
```
Output: **217 paths (110 source, 107 test/fixture)**, SHA-256
**`8b0280660ea5eb64851a5ce0d1a9d56b707d6e29ce00d113ec6656b055d72d37`** — matches
the spec binding byte-for-byte (7408 bytes, 217 LF-terminated lines). Negative
case: `--git /bin/git` is rejected. The full tool source is in the appendix
below (durable against target archival).

### Disposition analysis (verified against pinned source; ready for continuation)

The 217-path closure default is `ported` (byte-exact copy at the same path). The
following forbidden-capability modules under the roots must be `excluded` or
`rewritten` per AC6/AC5 (each with recorded rationale; `rewritten` rows bind
source OID + target OID + deterministic byte diff + replay command — never a
whole-blob authored replacement):

Source modules requiring exclusion/rewrite:
- `src/mcp/server.ts` — mixed registry; **rewrite** to register only the eight
  context tools (`echo_ping`, `echo_resolve_mru`, `find_clusters`, `get_atom`,
  `get_atoms`, `get_recent_work_context`, `search_memories`,
  `wait_for_new_turns`); drop imports/registration of the product/loop tools.
- `src/mcp/tools/coord-emit.ts`, `coord-invoke.ts`, `coord-status.ts` — loop
  coordination → **exclude**.
- `src/mcp/tools/get-role-state.ts`, `list-task-states.ts`,
  `pending-decisions.ts` — loop/product → **exclude**.
- `src/mcp/tools/internal/decision-card-types.ts`,
  `decision-source-playbook.ts` — product decision surface → **exclude**.
- `src/mcp/tools/_cursor.ts` — inspect: exclude unless a context tool depends on it.
- `src/enrich/decision-drift.ts`, `granola-intake-candidates.ts`,
  `granola-intake-seed-store.ts` — product enrichment → **exclude**.
- `src/enrich/granola-signals.ts`, `post-meeting-brief.ts` — product-owned by
  item 133 (AC5): **exclude** or recorded deliberate duplication — never a
  silent double-claim. `granola-signals-cli-adapter.ts`, `dispatch.ts` — inspect
  import reach; likely exclude.
- `src/echo-home/wizard/detect-agents.ts` — → **exclude**.

Their tests (must be excluded alongside, per AC6's cannot-exclude carve-out that
protects only capture/normalize/storage/trace/context-MCP/util tests):
- `tests/mcp/pending-decisions.test.ts`,
  `tests/mcp/tools/list-task-states-batching.test.ts` and its
  `tests/mcp/tools/fixtures/{build-list-task-states-fixture.ts,list-task-states-baseline.json}`.
- `tests/enrich/{decision-drift,granola-intake-candidates,granola-intake-card-atom,granola-intake-cutoff-clock,granola-intake-seed-store,post-meeting-brief}.test.ts`.
- `tests/echo-home/wizard/detect-agents.test.ts`.
- `tests/normalize/dispatch.test.ts`, `tests/storage/iterate-coord-by-append-order.test.ts` — inspect: exclude iff they exercise excluded coord/dispatch capability.

The full byte-exact import-graph closure (to confirm no `ported` file
transitively imports an `excluded` module, forcing further rewrite/exclusion)
is the first task of the continuation and is NOT yet complete.

### Per-AC remaining work (not done this run)

- **AC1 (finish):** commit the accepted contents; prove clean/one-root/no-reflogs/`git fsck --full`.
- **AC2:** `package.json` (Node 22.22.1 / npm 10.9.4) + committed lockfile;
  `provenance/runtime-inventory.v1.json` (closed edge grammar);
  `tools/check-runtime-inventory.mjs`. Standalone import closure.
- **AC3:** `context-tools.v1.json` (exactly 8); `tests/fixtures/context-tool-parity.v1.json`
  (10 ordered cases); `tools/verify-context-tools.mjs` projector;
  `provenance/context-tool-parity.v1.json` + schema; byte-canonical aggregate;
  live source-MCP-over-stdio parity run on synthetic seed.
- **AC4/AC5:** `src/state/paths.ts` `ECHO_CONTEXT_HOME` distinct default;
  Granola dedup dispositions recorded in provenance.
- **AC6 (finish):** materialize ported/rewritten source byte-exact; author
  `source-evidence.v1.json`, `parity-matrix.v1.json`, `source-extraction.v1.json`,
  `target-only-policy.v1.json` (38 paths) + schemas; `tools/check-parity.mjs`,
  `tools/audit-pinned-extraction.mjs`; standalone typecheck/lint/tests green.
- **AC7:** `lifecycle-expected/observed.v1.json`, `native-toolchain.v1.json`;
  private `git clone --no-local`; `sandbox-exec` deny-network `npm ci --offline
  --ignore-scripts` + `npm rebuild better-sqlite3` (only that rebuild executes);
  DNS/TCP-connect + loopback-control probes; object-closure + source-independence.
- **AC8:** `schemas/service-api.v1.json`; `tools/verify-service-parity.mjs`;
  `tests/integration/context-service.test.ts`; migration record with full hash
  set; `codex-ops` reviewer feature-branch child-push handoff (expected-old CAS).

### Notes on handoff shape

- No `agent/135-echo-context` code commits: this item's code lives in the
  separate standalone target repo, not the worktree branch, by design. The
  branch head therefore equals the claim commit.
- No migration record (`raw/internal/migrations/2026-07-13-135-echo-context.md`)
  was authored — writing one would falsely assert an accepted target. It is
  produced only on a completed build.
- ECHO MCP: zero `mcp__echo__*` calls this run (all work was filesystem/git/node);
  per the CLAUDE.md skip-rule, no dogfooding-journal entry is owed.

## Appendix — verified `tools/emit-source-inventory.mjs`

Reproduces `8b0280660ea5eb64851a5ce0d1a9d56b707d6e29ce00d113ec6656b055d72d37`.
Preserved here so it survives founder archival of the incomplete target. Also at
`/Users/zhenye/Desktop/echo-context/tools/emit-source-inventory.mjs` and
`<session-scratchpad>/inv-emit.txt` (its 217-line output).

---

## Run 2 (2026-07-14 — founder-endorsed in-place continuation)

Founder decision on the Run 1 escalation: continue in place (target NOT archived;
the archive rule governs fresh attempts). Item re-claimed to `backlog/claimed/`.
This run materialized the extraction and committed a founder-endorsed INCOMPLETE
milestone in the target.

### Verified this run

**Import-graph analysis → final disposition partition (172 / 3 / 42).** Scanned
the 217-file closure for import edges; computed transitive taint from the
forbidden-capability seeds with edge-cuts at rewrite/duplicate nodes.
- **172 ported** (byte-exact copies).
- **3 rewritten:**
  - `src/mcp/server.ts` — deletion-only rewrite to register EXACTLY the 8 context
    tools (echo_ping, search_memories, get_recent_work_context, find_clusters,
    get_atoms, wait_for_new_turns, get_atom, echo_resolve_mru). Removed all coord
    machinery (imports `../coord/*` are outside the roots), get-role-state /
    list-task-states / pending-decisions / coord-emit/status/invoke, DeadlineTracker,
    and the optional propose-decision loader (reaches `src/surfaces`, product).
  - `src/enrich/granola-signals.ts` — AC5 recorded deliberate duplication: the full
    1230-line product worker module is NOT copied (item-133-owned); a minimal
    generic-retrieval subset is authored (GRANOLA_SIGNAL_SOURCE,
    GRANOLA_SIGNAL_INDEX_SOURCE, filterToCurrentSignalRuns +
    resolveCurrentGranolaSignalRuns + parseManifest) so `search_memories` stays
    byte-ported. Recorded in parity-matrix as deliberate duplication, not silent
    double-claim.
  - `tests/mcp/tools/search-memories.test.ts` — deletion-only: excised the
    decision-store import (`src/surfaces/ceo-slack-responder`, outside roots) and
    the item-112 cross-source-join describe block (its 2 cases need
    createTeamDecisionStore). Generic search + item-115 filterToCurrentSignalRuns
    coverage preserved (1647 → 1525 lines).
- **42 excluded:** coord/product/loop MCP tools, product enrich workers
  (decision-drift, granola-intake*, dispatch, worker-heartbeat, granola-signals-cli,
  post-meeting-brief), the whole onboarding wizard subtree (reaches `src/daemon`
  outside roots), and the brain-retrieval test (reaches `src/brain`, item-133).
- **Import closure verified: 0 unresolved local imports** among ported+rewritten.

**Provenance + target-only scaffold authored and committed:**
- `provenance/source-evidence.v1.json` — 217 rows {path, mode, blob_oid,
  content_sha256}; inventory SHA bound.
- `provenance/parity-matrix.v1.json` — per-row disposition; rewrite rows bind
  source OID + target_content_sha256 + rewrite kind + replay note.
- `context-tools.v1.json` — exact 8-tool roster.
- `package.json` — Node 22.22.1 / npm 10.9.4 pins; runtime deps derived from the
  23 bare specifiers the closure actually imports.
- `tools/emit-source-inventory.mjs` (from Run 1).

**First target commit (INCOMPLETE/UNACCEPTED):**
- Target HEAD `e49f87da18c12db90700938666ea4bff1b6e7e53`, tree
  `0918788b8d7c3d3d4497904c1885b7e81106b25a`, 181 tracked files, branch
  `migration/2026-07-13-135`, no remote.
- AC1 checks on the real commit: `git fsck --full` OK; after `gc --prune=now`,
  `git fsck --full --no-reflogs --unreachable` is empty (amend dangling cleaned).
- A stray `.DS_Store` was caught and removed before finalizing.

### Two genuine spec-partition open questions (surfaced, not guessed)

1. **`tsconfig.json` is not in the AC6 38-path target-only policy**, yet AC7
   requires `typecheck`/`lint` from the private clone, and every source file
   imports via `.js` specifiers (NodeNext). A provisional NodeNext/ES2022 strict
   tsconfig (mirroring source) is kept in the builder's scratch, NOT committed, to
   avoid violating the exact-HEAD partition. Reconcile: supply TS/lint config via
   CLI flags at check time, or add the config paths to the 38-path policy.
2. **AC4's `src/state/paths.ts`** (new, `ECHO_CONTEXT_HOME` distinct default) is
   neither in the 38-path target-only policy nor a source-extracted path
   (`src/state/` is not among the 20 roots; the closure ships
   `src/echo-home/state-paths.ts`). Clarify whether AC4 intends a rewrite/rename of
   `echo-home/state-paths.ts`, an added target-only path, or reuse of the ported
   module.

### Remaining before acceptance (updated map)
- Standalone build green: AC7 install (native better-sqlite3 rebuild under
  `sandbox-exec` deny-network; only that rebuild executes), typecheck, lint, ~107
  tests; committed `package-lock.json`.
- `provenance/target-only-policy.v1.json` (exact 38-path list + ready SHA),
  `source-extraction.v1.json` partition, the 9 provenance schemas; exact HEAD
  equality.
- `provenance/runtime-inventory.v1.json` + `tools/check-runtime-inventory.mjs`
  (AC2 closed edge grammar).
- `tests/fixtures/context-tool-parity.v1.json` + `tools/verify-context-tools.mjs`
  + `provenance/context-tool-parity.v1.json` + schema (AC3 stdio parity, 10 cases).
- `src/state/paths.ts` (pending Q2), `schemas/service-api.v1.json`,
  `tools/verify-service-parity.mjs`, `tests/integration/context-service.test.ts`
  (AC4/AC8).
- `provenance/lifecycle-expected/observed.v1.json`, `native-toolchain.v1.json`
  (AC7); the six `tests/migration/*.test.ts`; migration record; codex-ops reviewer
  feature-branch child-push handoff (AC8).

### Journal
- Zero `mcp__echo__*` calls this run (all filesystem/git/node analysis). Per the
  CLAUDE.md skip-rule, no dogfooding-journal entry is owed.

---

## Run 3 (2026-07-14 — founder-endorsed continuation; Q1/Q2 adjudicated)

Founder adjudicated Q1 (scratch tsconfig, never committed; record its bytes in the
migration record; invoke via `--project <scratch>`) and Q2 (implement AC4 as a
recorded REWRITE of `src/echo-home/state-paths.ts`, not a new `src/state/paths.ts`).
Both applied. This run got the standalone package to a GREEN build.

### Headline: standalone typecheck clean + 939 tests green

- Dev `npm install` in the target succeeded (native better-sqlite3 built, exit 0).
- `tsc --noEmit` via the scratch tsconfig: **0 errors**.
- `vitest run`: **64 test files pass, 939 tests pass, 17 skipped, 0 fail.**
- Target committed (INCOMPLETE/UNACCEPTED) at HEAD
  `d0b67033175b1c936e153c984a6e1e33a5efa89c`, tree
  `0c4218ff24255cdcc30b1deb626cfa39a7a3ca78`, 159 tracked files (152 source + 7
  policy/provenance), fsck clean, no unreachable, no remote. node_modules and the
  scratch tsconfig are NOT tracked.

### Partition finalized (import-closed, build-verified)

Re-analysis with the echo-home onboarding layer excluded gives the final
partition **144 ported / 8 rewritten / 65 excluded** (0 unresolved local imports):
- **8 rewritten** (each a parity-matrix `rewritten` row with source OID +
  target_content_sha256 + rewrite kind + replay): `src/mcp/server.ts` (8-tool
  roster), `src/enrich/granola-signals.ts` (AC5 generic duplicate),
  `src/echo-home/state-paths.ts` (AC4: `ECHO_HOME`→`ECHO_CONTEXT_HOME`, `~/.echo`→
  `~/.echo-context` — Founder adjudication #2), and five test rewrites
  (`recent-work-context.test.ts` roster 15→8; `server.test.ts` +
  `recent-calls-endpoint.test.ts` drop `enable_deadlines`, latter also swaps the
  removed-`coord_emit` error case for a documented `search_memories` isError path;
  `search-memories.test.ts` product-case excision; `paths.test.ts` AC4 defaults).
- **65 excluded**: coord/product/loop MCP tools, product enrich workers, the
  onboarding wizard subtree, AND the echo-home onboarding/config-sync layer
  (adapter-sync, index, roles, scaffold, adapters/{claude-code-mcp,codex-config,
  cursor-config,markers,role-sync,skill-sync,workflow-sync}) which is not imported
  by the context core, reaches `assets/` outside the 20 roots, and is not context
  substrate per AC2 — plus their tests. Kept echo-home = `paths.ts`,
  `state-paths.ts`, `adapters/atomic-write.ts` (the generic bits capture/storage need).

### AC4 (done, per Q2) + AC5 (done)

- `state-paths.ts` rewritten for `ECHO_CONTEXT_HOME` (default `~/.echo-context`,
  distinct from echo-brain/echo-loop/`~/.echo`). `paths.ts` inherits the context
  home via its state-paths dependency, so capture-source config lands under the
  context home. Deviation from AC4's literal `src/state/paths.ts` recorded here for
  the migration record.
- AC5 granola dedup: `granola-signals.ts` minimal generic duplicate ships;
  `post-meeting-brief.ts` excluded (item-133 product). Recorded, no double-claim.

### Provenance updated

- `source-evidence.v1.json` (217 rows) and `parity-matrix.v1.json` (144/8/65 with
  rewrite hashes + replay) regenerated from a single idempotent extract script.
- `package.json` + committed `package-lock.json` (dev-generated; AC7 will re-derive
  under the pinned offline lock). `context-tools.v1.json` (8 roster).

### Q1 record (for the migration record)
- Scratch tsconfig SHA-256: `7164ed9356aa3bd1d9108283eee164053bc6f251418d0aa1dc4d4b02726bf78f`
  (NodeNext/ES2022 strict, mirrors source). Typecheck/lint invoke via
  `--project <scratch-tsconfig>`; not committed to the target.

### Remaining before acceptance (capacity boundary)
- AC2: `provenance/runtime-inventory.v1.json` + `tools/check-runtime-inventory.mjs`
  (closed edge grammar); `tests/migration/dependency-set.test.ts`.
- AC3: `tests/fixtures/context-tool-parity.v1.json` (10 ordered cases) +
  `tools/verify-context-tools.mjs` + `provenance/context-tool-parity.v1.json` +
  schema; the stdio parity runner; `tests/api/context-only-roster.test.ts`.
- AC6: `provenance/target-only-policy.v1.json` (exact 38) + `source-extraction.v1.json`
  + the 9 provenance schemas + `tools/check-parity.mjs` + `audit-pinned-extraction.mjs`;
  the migration tests (parity-matrix, context-tool-evidence, committed-source-only,
  source-independence, object-closure). Exact-HEAD equality once all 38 exist.
- AC7: `lifecycle-expected/observed.v1.json`, `native-toolchain.v1.json`; private
  clone; `sandbox-exec` deny-network `npm ci --offline --ignore-scripts` +
  `npm rebuild better-sqlite3` (only that rebuild executes); DNS/TCP + loopback probes.
- AC8: `schemas/service-api.v1.json`, `tools/verify-service-parity.mjs`,
  `tests/integration/context-service.test.ts`; migration record. (NOT the codex-ops
  reviewer leg — that's the independent reviewer's.)
- lint (via scratch eslint config, same Q1 pattern).

### Journal
- 2× `search_memories` this run (both 0-match — siblings' artifacts not in the live
  db); journaled in-the-moment to the 2026-07 claude shard.

---

## Run 4 (2026-07-14 — AC7 install proof + exclusion rationales)

Target advanced to HEAD `e5a34a357e1fcee8b142e85d4d37c06202f6ffb3` (tree
`24ae1c2291106d580f7ba6d2b1060dd2395325af`), fsck clean, no remote. Still
INCOMPLETE/UNACCEPTED.

### AC7 clean-install lifecycle proof — VERIFIED under sandbox-exec deny-network

Ran the full proof against a private clone of the accepted target OID:
- `git clone --no-local --no-hardlinks --no-checkout` + hook-disabled detached
  checkout of the accepted OID; origin removed; 0 remotes.
- Online cache-fill phase: `npm ci --ignore-scripts` (exit 0) into a distinct
  cache root; node_modules then discarded before the sandboxed install.
- Network-denial probes inside `sandbox-exec -p '(version 1) (allow default)
  (deny network*)'`: DNS `FAIL-ENOTFOUND`, direct-IP TCP `FAIL-EPERM`, https
  `FAIL-ENOTFOUND`. Loopback control BOTH halves: outside profile `ACCEPT`,
  inside profile `LISTEN-DENIED-EPERM`.
- `npm ci --offline --ignore-scripts` under deny-network: **exit 0** (290 pkgs),
  zero lifecycle scripts executed.
- `npm rebuild better-sqlite3 --offline --foreground-scripts --build-from-source`
  with `npm_config_nodedir=/usr/local/Cellar/node@22/22.22.1_1` under deny-network:
  **exit 0**, node-gyp built from source. Only better-sqlite3 executed; esbuild +
  fsevents also carry install scripts in the lock but were NOT executed (their
  platform binaries ship as optional-dependency packages, not via scripts).
- Native artifact `node_modules/better-sqlite3/build/Release/better_sqlite3.node`
  sha256 `289ac2671fc501b275af7ce170ea2ef84e07be7e2a4a403aaa055cef02018557`
  (1985384 bytes). Smoke: in-memory db open/insert/select OK under deny-network.
- A hook attempting a secondary download fails at the socket (https `ENOTFOUND`
  inside the profile) — the fixture requirement holds.

Committed provenance: `provenance/lifecycle-expected.v1.json` (derived from
package/lock: 3 install-script packages, only better-sqlite3 allowed to execute),
`provenance/lifecycle-observed.v1.json` (ci + rebuild exits, scripts executed,
produced-artifact hash, network-denial results), `provenance/native-toolchain.v1.json`
(node 22.22.1, npm 10.9.4, clang 21.0.0, python 3.10.7, nodedir, artifact hash).
The AC7 proof commands are recorded here for reviewer replay (no committed tool —
AC7's proof is not one of the 38-path tools).

Toolchain: node v22.22.1, npm 10.9.4, Apple clang 21.0.0, python3 3.10.7.

### Exclusion rationales (reviewer heads-up addressed)

All 65 `excluded` parity-matrix rows now carry a self-contained rationale citing
the spec clause it rests on — one of: `[AC2 forbidden-capability + AC6]` (coord/
product/loop MCP tools), `[AC2/AC5 forbidden-capability + AC6]` (product enrich
workers), `[AC6 + outside-roots + AC2]` (onboarding wizard subtree),
`[AC2 scope + outside-roots + sibling-reach]` (echo-home onboarding/config-sync
layer), `[outside-roots + sibling-reach]` (brain-retrieval test → src/brain).

### Remaining before acceptance (unchanged set minus AC7)
- AC2: `provenance/runtime-inventory.v1.json` + `tools/check-runtime-inventory.mjs`
  (closed edge grammar incl. repository_literal_process_launch);
  `tests/migration/dependency-set.test.ts`.
- AC3: `tests/fixtures/context-tool-parity.v1.json` (10 ordered cases) +
  `tools/verify-context-tools.mjs` + stdio runner + `provenance/context-tool-parity.v1.json`
  + schema; `tests/api/context-only-roster.test.ts`.
- AC6 close-out: `target-only-policy.v1.json` (exact 38) + `source-extraction.v1.json`
  + 9 provenance schemas + `check-parity.mjs`/`audit-pinned-extraction.mjs` + the 5
  migration tests + exact-HEAD equality (gated on all 38 target-only files existing).
- AC8: `schemas/service-api.v1.json` + `tools/verify-service-parity.mjs` +
  `tests/integration/context-service.test.ts`; the migration record (which will bind
  source SHA, target HEAD/tree, all provenance/lifecycle/tool hashes, AC3 aggregate,
  service results, object-closure/no-remotes, authority:false/installed:false, the Q1
  scratch-tsconfig bytes+SHA `7164ed93...`, and the Q2 + echo-home-exclusion
  deviations citing Founder adjudication #2). NOT the codex-ops reviewer child leg.
- lint (via scratch eslint config, Q1 pattern).

### Journal
- Zero `mcp__echo__*` calls this run (all filesystem/git/node/sandbox-exec). Per the
  skip-rule, no journal entry owed.
