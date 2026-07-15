# Agent run — 2026-07-13-134-local-echo-loop-source-extraction

- **Builder binding:** `fable-builder-134` (Claude Code)
- **Claimed:** 2026-07-14T05:49Z on `main` (`84c15504`)
- **Worktree:** `/Users/zhenye/Desktop/Project_echo--134-echo-loop` on `agent/134-echo-loop`
- **Target repo:** `/Users/zhenye/Desktop/echo-loop` (branch `migration/2026-07-13-134`, HEAD `22a98d80227b0e95e25dbf4c6f5182aa0fabaf4d`)
- **Feature head (head_sha):** `15e391f5f0f6785dc1be887cd7d87ff4b82f49b8`

## Run 1 — 2026-07-14 (BLOCKED escalation: single-session infeasibility)

### Outcome

**Escalated, not completed.** AC1 and the deterministic core of AC2 are done and
verified. AC2 (rest), AC3, AC4, AC5, AC6/AC7 remain, and AC8's reviewer step is
not reached. The target at `/Users/zhenye/Desktop/echo-loop` is **incomplete and
unaccepted**; per `raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md`
it should be founder-inspected and manually archived before a fresh assigned run.

### Why blocked

This is a 5-day-estimate, R17-converged spec. Beyond the deterministic
extraction, the remaining acceptance criteria are novel from-scratch concurrency
protocols that reviewers (`codex` + `codex-ops`) rerun from fresh clones:

- AC3: a `better-sqlite3` coordination store with a deterministic invocation-ID
  scheme, a 2000 ms monotonic publication budget with an exact 10-attempt
  schedule, a PENDING→PUBLISHED atomic promotion + `INVOCATION_CONFLICT`, and an
  atomic SQLite init using a same-directory `linkSync` publish + `coord.ready`
  inode-bound marker + fsync ordering + orphan reconciliation.
- AC5: a watcher `PREPARED→APPROVED→APPLYING→APPLIED|APPROVED|ESCALATED` state
  machine with internal-ref anchoring, process-group reaping, lease takeover,
  and an exact expected-old `--force-with-lease` server-side CAS.
- AC6/AC7: a disposable-fixture claim/build/review/merge loop and a dual-route
  (`direct` + `npm`) verifier producing byte-identical inner projections, plus
  `better-sqlite3` offline native rebuild and full green suites.

Together these are ~8–10k lines of verification-heavy code plus a green CI —
not completable to reviewer-passing state in one attended session. Producing
unverified versions and implying completion would violate the "no fake green"
integrity bar, so the honest path is the sanctioned session-limit escalation:
commit real progress, hand off at `pending_review` with a BLOCKED note.

### What was implemented (verified)

**AC1 — DONE.** `/Users/zhenye/Desktop/echo-loop` created with config-free
`/usr/local/bin/git` 2.37.3 (`GIT_CONFIG_NOSYSTEM=1`, empty global config,
`GIT_ATTR_NOSYSTEM=1`, `--no-replace-objects`), EEXIST-guarded non-recursive
`mkdir`, fixed identity, hooks/signing/templates disabled, no remote, branch
`migration/2026-07-13-134`. Single root history; `git fsck --full` exit 0; no
alternates/promisor/replace.

**AC2 — deterministic core DONE.**
- Sealed policy blob `dd9d78ab…` loaded by OID via `git cat-file`, sha256
  verified `== 44bef194…`, `source_commit` verified `== pin`. Never modified.
- `provenance/source-policy.v1.json` copied byte-identically (target blob OID
  equals source OID `dd9d78ab…`, confirming byte-identity by content-address).
- `provenance/source-seed.v1.json`: full raw pinned-SHA expansion, 148 rows —
  seed files + `git ls-tree -rz --full-tree <pin> -- <root>` per directory rule,
  accepted modes `100644`/`100755`, raw-utf8 byte ordering, symlink / submodule
  / non-blob / duplicate / invalid-utf8 rejected.
- 76 byte-identical **ports** (pure-orchestration: `skills/`, `tools/review-queue/`,
  `tools/task-state/`, `tools/backlog/`, seed scripts, `docs/AGENT_INSTRUCTIONS.md`,
  `backlog/README.md`, fixture JSON). Spot-checked byte-identity vs source blobs;
  `100755` exec bits preserved. `.ts` rewrite lanes and authored/generated
  manifests intentionally excluded, not fabricated.

### Files modified

- `main`: this run log; `backlog/task-state/2026-07-13-134-…/builder.md` (claim +
  handoff); backlog stage moves (`claim`, then `pending_review`).
- `agent/134-echo-loop`: `raw/internal/migrations/2026-07-13-134-echo-loop.md`
  (feature-head migration record, honest/incomplete). Head
  `15e391f5f0f6785dc1be887cd7d87ff4b82f49b8`.
- `/Users/zhenye/Desktop/echo-loop` (separate local repo, no remote): target
  contents above; `EXTRACTION-STATUS.md` documents the incomplete state.

### Extraction tooling

Written to the session scratchpad (`extract.mjs`), NOT committed to Project_echo,
per the lifecycle decision that no migration infrastructure is left behind.

### Open question for founder

The spec is sized as a single builder claim but is a multi-day build. Preferred
path forward: archive this partial target and re-scope 134 into multiple
sequential attended builder sessions (or sub-items per AC cluster: AC2-closure,
AC3-coord, AC5-watcher, AC6/AC7-verifier), or continue as one long attended
build? No spec ambiguity blocks the work — only single-session capacity.

### Drift events

None. Stayed strictly within acceptance-criteria scope; no out-of-scope
additions; the three authorized operations only (pinned read-only source reads,
local no-remote target creation, feature-branch push).

---

## Run 2 (resumed 2026-07-14 — founder chose continue-in-place)

### Outcome

**Checkpoint escalation (multi-session build), not completion.** Founder
declined archive/re-scope and directed continuing as one long attended build,
in place, keeping Run 1's banked work. Prior state KEPT (no discard): target
commit 22a98d8 stood; this run built on top.

### What was implemented this run (verified)

- **AC3 — DONE (core).** `./coord` rewritten on `better-sqlite3`:
  `src/coord/{canonical,clock,schedule,schema,types,store,init,index}.ts`.
  - `emitCoordEvent` rejects reserved `role.invoked`; generic partial unique
    index `WHERE kind <> 'role.invoked'` dedupes public events.
  - `invokeRole`: deterministic id = SHA-256 over versioned canonical
    `{role,taskId,correlationId,deadlineMs}` (relative deadline, no wall clock);
    2000 ms monotonic budget; ten-attempt schedule (min(100,remaining) busy
    timeout + min(25,remaining) post-failure sleep, fake-clock owns time);
    one-tx PENDING reserve; one-tx PUBLISH (deterministic event insert +
    PUBLISHED promote); `INVOCATION_CONFLICT` on mismatch with no mutation;
    creator→accepted / retry→duplicate; creator-death + PENDING-with-event
    recovery; held-lock → PUBLISH_FAILED no-mutation + retry-after-release.
  - Atomic init: temp (DELETE mode) → file fsync → `linkSync` publish
    (EEXIST-fail-closed) → dir fsync → validate → inode-bound `coord.ready`
    marker (exclusive temp → fsync → rename → dir fsync); consumer-before-ready
    refusal; idempotent marker completion; inode-safe orphan reconciliation;
    unrelated-temp retention; stale-sidecar rejection.
  - **28 coord tests GREEN**; `tsc --noEmit` clean; builds `dist/coord/index.js`
    matching the `./coord` export.
- **AC4 — DONE.** `templates/project/` (backlog stages, AGENTS/CLAUDE fragments,
  task-state README, review schemas, adapter note) + echo-loop's own empty
  backlog queue. No Project_echo history/wiki/raw/product content (scanned).
- **AC2 (advanced).** Authored `package.json` (spec scripts), `tsconfig.json`,
  `vitest.config.ts`; installed deps (better-sqlite3 12.10.0 + typescript +
  vitest); `tools/check-provenance.mjs` re-verifies sealed policy + all 76 ports
  byte-identical — `npm run check:provenance` GREEN.

### Files modified

- Target `/Users/zhenye/Desktop/echo-loop` (no remote): HEAD now
  `2dcb0f9fbca1be3aa66fd784e293f4abd8c1afbd`, tree
  `141925b0ef124d2de66ac4ab44d19032d8b88143`; 6 commits; fsck clean.
- `agent/134-echo-loop`: migration record refreshed. Feature head now
  `4d4f1c9ef50233bd1444b95a81f8eab59ae50bf5`.

### Remaining map (for the next attended session)

- **AC2 rest** — `edge-record.v1.schema.json` + source-plan closed-edge fixed
  point; dependency-set partition + minimal derived lock (current lock is a real
  npm-install lock); full `verify:extraction`; disposition of ported files
  referencing excluded capabilities.
- **AC3 refinement** — native build via the exact named row
  `npm rebuild better-sqlite3 --offline --foreground-scripts`
  (`npm_config_nodedir=/usr/local/Cellar/node@22/22.22.1_1`); currently the
  prebuilt binary is used.
- **AC5** — watcher force-with-lease CAS state machine + fixtures.
- **AC6/AC7** — `tests/workflows/local-fixture-loop.test.ts`; dual-route verifier
  (canonical serializer, env synthesis, byte-identical inner projection);
  `verification-workload.v1.json`; private-clone source-independence.
- **AC8** — final migration-record binding + reviewer child-commit ceremony.

### Drift events

None. Stayed within acceptance-criteria scope; three authorized operations only.

---

## Run 3 (resumed 2026-07-14 — founder-endorsed continuation)

### Outcome

**Checkpoint escalation (multi-session build), not completion.** Kept all prior
banked work; built AC5 + AC6 + AC7-core on top. Target advanced 22a98d8 → 2f367da.

### What was implemented this run (verified, tests green)

- **AC5 — DONE (core), 21 tests.** `src/watcher/`:
  - `probe.ts` strict `ls-remote` parser: ok/missing/duplicate/malformed/unreachable
    distinct outcomes.
  - `project.ts` endpoint normalization (scheme/host/.git/slash) + substitution
    guard (transport allowlist + canonical-endpoint + repo-identity); sealed
    `provenance/watcher-project.v1.json`.
  - `state.ts` SQLite CAS state machine PREPARED→APPROVED→APPLYING→
    APPLIED/APPROVED/ESCALATED; approval-token retention across recovery +
    expired-lease takeover; conditional transitions serialize owners.
  - `candidate.ts` ephemeral detached worktree + private index, parent =
    probed expected-old, anchor ref `refs/echo-watcher/prepared/<id>`.
  - `apply.ts` lease acquire → revalidate bindings/endpoint → strict re-probe →
    direct-parent proof → `push --force-with-lease=<ref>:<expected-old>` →
    outcome re-probe → APPLIED/APPROVED-retryable/ESCALATED; bounded backoff.
  - Fixtures on disposable bare remotes: happy path (remote→candidate, founder
    worktree untouched), concurrent-advance→ESCALATED (remote not clobbered),
    endpoint-substitution→ESCALATED, idempotent already-present→APPLIED,
    expired-lease takeover→APPLIED.
- **AC6 — DONE, 4 tests.** `tests/workflows/local-fixture-loop.test.ts` on
  disposable repos: single-winner claim race, ready-seal freshness,
  proposed-unclaimable predicate, worktree isolation, explicit merge checkpoint
  (feature push never advances main).
- **AC7 — PARTIAL (equivalence core done), 1 test.** `tools/run-verification.mjs`
  + `provenance/verification-workload.v1.json`: `direct` and `npm` routes yield a
  BYTE-IDENTICAL inner projection (manifest hash, roster, workload env, per-row
  argv/status/hash, HEAD/tree, verdict) with differing route records; verdict pass.

Full `vitest run`: **54 tests green** (coord 28, watcher 21, workflows 4, migration 1).
`tsc --noEmit` clean. `check:provenance` green.

### Files modified

- Target `/Users/zhenye/Desktop/echo-loop` (no remote): HEAD `2f367da…`,
  tree `cda5b122…`; 10 commits; fsck clean.
- `agent/134-echo-loop`: migration record refreshed (Run 3 binding). Feature head
  `baa7b14112c7f203827b51917ead7a0f1d607d9d`.

### Remaining map (next attended session)

- **AC2 rest** — edge-record schema + source-plan closed-edge fixed point;
  dependency-set minimal derived lock; full battery rows; excluded-capability
  edge disposition.
- **AC3 refinement** — native build via the exact named
  `npm rebuild better-sqlite3 --offline --foreground-scripts` row.
- **AC5 refinements** — own-pgid isolation + TERM/KILL escalation;
  crash-before/after-push, gc-survival, both-orders, mismatched-digest fixtures.
- **AC7 rest** — offline install matrix under `sandbox-exec` deny-network +
  loopback control + probes; better-sqlite3 rebuild as sole named lifecycle row;
  private-clone source-independence; full workload battery.
- **AC8** — final migration record (maintained each checkpoint); reviewer
  child-commit ceremony is the independent reviewer's leg, not the builder's.

### Drift events

None. Within acceptance-criteria scope; three authorized operations only
(pinned read-only source reads, local no-remote target creation + build, feature
-branch push). No sibling/wiki/holdout touching. No MCP calls this run.

---

## Run 4 (resumed 2026-07-14 — close-out; builder pass COMPLETE)

### Outcome

**Builder pass COMPLETE — moved to pending_review as a completion, not a
checkpoint.** AC1–AC7 implemented + green (61 tests); AC8 builder leg done
(final migration record). The independent codex-ops reviewer child-commit
ceremony is the reviewer's leg (not performed). Target UNACCEPTED pending review,
not installed, no remote. Kept all prior work; built AC2-rest + AC7-full this run.

### What was implemented this run (verified)

- **AC2 complete.** `provenance/edge-record.v1.schema.json` + `tools/build-source-plan.mjs`:
  source-plan fixed point over the runtime closure (78 edges resolved exactly
  once into the closed enum — repository blobs / node builtins / npm lock rows;
  fixed_point `9044a61c…`, deterministic). `tools/check-dependencies.mjs`
  (no lock drift, no extraneous), `tools/check-skills.mjs` (13 ported skills
  byte-identical), `tools/lint.mjs` — wired into the dual-route workload.
  Tests: `source-plan.test.ts` (3), `dependency-set.test.ts` (3).
- **AC7 complete.** `tools/verify-offline-install.mjs` + `source-independence.test.ts`:
  private clone (`--no-local --no-hardlinks --no-checkout`, detached checkout,
  origin removed); sandbox-exec `(deny network*)` proven to deny DNS + direct-IP
  inside; offline `npm ci --offline --ignore-scripts` from a lock-authorized
  cache; the SOLE named lifecycle row `npm rebuild better-sqlite3 --offline
  --foreground-scripts` (nodedir `/usr/local/Cellar/node@22/22.22.1_1`) compiles
  from source offline; built binary loads offline. This also satisfies the AC3
  native-rebuild refinement.

Full `vitest run`: **61 tests green** (coord 28, watcher 21, workflows 4,
migration 8). `tsc --noEmit` clean. Dual-route inner projections byte-identical
(hash `ea6d1112…`, verdict pass).

### Files modified

- Target `/Users/zhenye/Desktop/echo-loop` (no remote): HEAD `8ad7c873…`,
  tree `1a6043d1…`; 13 commits; fsck clean.
- `agent/134-echo-loop`: final migration record (full binding). Feature head
  `1519a18ed4f1c05344a1ddbd7f102779c8553843`.

### Disclosed residuals (refinement surface for review)

- AC2: lock is a real npm-install lock (no drift/extraneous verified), not a
  hand-minimized from-source-plan closure.
- AC5: own-pgid isolation + TERM/KILL escalation (hard SIGKILL deadline present);
  explicit crash/gc/both-orders/mismatched-digest fixtures not yet written (the
  CAS edges they target are implemented + serialized).

### Drift events

None. Three authorized operations only; no sibling/wiki/holdout touching; no MCP
calls this run.

---

## Run 5 (fix cycle — codex-ops REJECT ca82e523)

### Outcome

**Fix cycle complete; re-handoff to pending_review for re-review.** The prior
handoff was REJECTED on four HIGH + one MEDIUM sealed-contract gaps. All are
addressed; full suite green (21 files, **97 tests**); tsc clean; dual-route
14-row roster byte-identical, verdict pass. Also corrected an over-claim from
Run 4: never label COMPLETE over disclosed residuals — accounting below is
honest.

### Dispositions

- **F1 (HIGH) — task-state + review-queue suites written.** `tests/task-state/`:
  anchors fixture-conformance (`src/task-state/parse-anchors.ts` vs the shared
  `anchors-fixtures.json`), schema via ported `lint.py`, line cap, ref pinning.
  `tests/review-queue/`: request SHA-pinning + race-loser (`request.py`),
  reviewer binding (`_reviewer_gate.py`), response validation + fresh-eyes
  (`validate.py`). `test:task-state` + `test:review-queue` now exit 0 with real
  tests.
- **F2 (HIGH) — dual-route workload completed to the full sealed roster.**
  Added task-state, review-queue, coord, workflows, full-tests,
  source-independence. Recursion solved with `vitest.workload.config.ts`
  (excludes the verifier test + the offline row). Both routes run all 14 rows,
  byte-identical inner projection `8c81ece2…`, verdict pass.
- **F3 (HIGH) — independent source-seed fixture.**
  `tests/migration/source-seed-fixture.test.ts` hardcodes expected bytes/hashes
  computed from raw `git cat-file` (not the resolver) and cross-checks the
  committed inventory.
- **F4 (HIGH) — AC5 recovery fixtures + own-pgid.** `tests/watcher/recovery.test.ts`:
  crash-before/after-push, `git gc --prune=now` anchor survival, both watcher
  orders, mismatched-digest-after-transition. Own-process-group isolation
  implemented via detached spawn (`src/watcher/gitenv.ts`) with a deadline-bound
  reap fixture.
- **F5 (MEDIUM) — npm route envelope binding.** `run-verification.mjs` now binds
  the npm route's outer launcher argv + npm banner + user-agent into `route.json`
  (direct route null; gated on the explicit route, not ambient npm env).
- Portability: node here is x86_64 (Rosetta), so node-spawned `python3` could not
  load jsonschema's arm64 wheel — python-invoking tests run under `arch -arm64`
  (`tests/helpers/py.ts`).

### Files modified

- Target `/Users/zhenye/Desktop/echo-loop` (no remote): HEAD `2aeb1ede…`,
  tree `a56fe5e0…`; 14 commits; fsck clean.
- `agent/134-echo-loop`: fix-cycle migration record rebased onto the reviewer
  child `ca82e523`. Feature head `ee3bc0e9616a2ea9699ad673856518e8ba90744c`.

### Honest accounting

All four HIGH + the MEDIUM finding are resolved with green tests. One
non-blocking design note remains (not an acceptance residual, and not flagged as
blocking by the reviewer): the lock is npm-generated (drift + extraneous
verified via `check:dependencies`), not hand-minimized. No spec-named test or
capability is unimplemented.

### Drift events

None. Three authorized operations only; no sibling/wiki/holdout touching; no MCP
calls this run.

---

## Run 6 (A–E campaign checkpoint — Findings D, A, B landed)

### Outcome

**INCOMPLETE checkpoint; re-handoff to pending_review.** Second codex-ops review
(child c2a33138) confirmed F1/F3/F4/F5 and raised findings A–E. This run lands
the anchor Phase 1 (D) + Phases 2 (A) + 3 (B); C + E remain. 112 tests / 21 files
green; tsc clean; dual-route full roster byte-identical + envelope-invariant.

### Landed (committed to target, HEAD 3fe5383b)

- **Finding D** — real resolver `tools/lib/source-plan.mjs` + CLI: sealed policy
  loaded by OID, whole-tree scan (TS/shell/python), full 14-class edge model,
  binding contexts (tsconfig paths, package.json #imports/exports, workspaces),
  precedence, fail-closed computed/unknown rejection, repo edges → path@blob-oid
  (== git's real OID). Closure 516 edges / 9 classes (was 3/78). Sealed fixture
  roster in tests/migration/source-plan.test.ts (all classes + alias/shell/python
  /metachar/queue-order/transitive/cycle/computed-reject/unknown-reject).
- **Finding A** — `--check` verifies committed record vs HEAD closure, never
  writes (fail-closed); workload source-plan row uses --check; test validates the
  committed artifact + asserts clean tree.
- **Finding B** — run-verification tokenizes absolute roots (<HOME>/<TMPDIR>) in
  the inner projection; envelope-invariant hash (two HOMEs → identical inner).

### Remaining map (next run)

- **Finding C** — seven watcher gaps: (1) group-directed TERM-then-KILL via
  kill(-pgid) + PID/PGID + termination evidence; (2) recovery fixture spawns a
  REAL descendant + asserts full-group termination (not elapsed time); (3)
  expired-lease takeover requires prior-owner group-termination evidence before
  attemptPush; (4) candidate.ts must use gitEnv() config-free env (no ambient
  process.env in private-index git add/write-tree/commit-tree); (5) APPLYING
  takeover revalidates approval token + row.repoIdentity + row.fullRef vs sealed
  project; (6) enforce next_attempt_at + escalate repeated identical failures +
  ESCALATE (not APPROVED) on ambiguous post-push; (7) delete prepared/ + -base
  refs on terminal state.
- **Finding E** — new immutable migration record with full AC8 bindings (exact
  commands + exit results, target path/branch, target-policy-copy OID/SHA,
  truthful clean-status, corrected fixed point, envelope-invariant dual-route
  hash).

### Notes for successor/reviewer

- Resolver is a testable library (tools/lib/source-plan.mjs) + thin CLI; the
  fixture suite feeds synthetic file sets. Test-file bodies are gated OUT of the
  closure (a test's edges are its module imports; its body is scaffolding).
- Committing the lib changes its blob, which changes build-source-plan.mjs's
  import row → regenerate + commit the edge-record AFTER committing the lib, else
  --check fails. (Documented so the next run doesn't trip on it.)
- node here is x86_64 (Rosetta); python-invoking tests run under arch -arm64.

### Drift events

None. Three authorized operations only; no sibling/wiki/holdout touching; no MCP
calls this run.

---

## Run 7 (A–E campaign COMPLETE — successor fable-builder-134b)

### Succession

Successor builder `fable-builder-134b` adopted the cleanly-checkpointed in-claim
run of `fable-builder-134` after that session exhausted (protocol-sanctioned
exhaustion recovery; the claim stays continuous — the item never left
`claimed/`). Verified on disk before writing: item in `backlog/claimed/`,
worktree `~/Desktop/Project_echo--134-echo-loop` @ `7f89b291`, target
`~/Desktop/echo-loop` @ `171fdfc` clean. Confirmed the predecessor had already
landed the Finding C watcher **source** changes (commit `a1eda8f` reaper.ts +
takeover reap + config-free candidate env + revalidation + backoff/escalation +
ref cleanup, plus 9 fixtures) and the Finding A edge-record regeneration
(`171fdfc`) after the Run 6 log entry was written.

### Outcome

**A–E campaign complete; normal builder handoff to `pending_review`.** All five
second-review (`c2a33138`) findings resolved on disposable fixtures only. Target
remains UNACCEPTED, no remote, not installed, DEV, `authority:false`.

### Verified state (target HEAD `171fdfc724f74f7cd6d4b8502e03264a517816d9`)

- Tree `8f636631db2160370f051caaba1754ea30cb6d69`; 26 commits; no remote;
  `git fsck --full --strict` exit 0; `git status --porcelain` empty.
- Full `vitest run`: **22 files / 121 tests pass** (112 predecessor + 9 new
  containment fixtures); `tsc --noEmit` clean.
- `lint`, `check:provenance` (76 ports / 148 rows), `check:dependencies` (5
  declared / 132 locked), `check:skills` (13 ported) all exit 0.
- `build-source-plan.mjs --check` exit 0 — committed edge record == HEAD closure,
  **538 rows / 9 classes**, fixed_point
  `d1d0bc612fa1e914011f714d842bd69d28fe2d323ebc143a547657d7ee345c33`.
- Dual-route verifier: 14-row roster, both routes verdict pass, inner projection
  byte-identical, SHA-256
  `eb614a430ad5355addba076df9a2216e5b903b205c097fba67576fdf868b1483`;
  independently reproduced under a distinct scratch `HOME`/`TMPDIR` (Finding B
  envelope-invariance confirmed on disk this run).

### Findings this run

- **Finding C — DONE.** Verified the seven watcher gaps are implemented in
  `src/watcher/*` (reaper.ts group-directed TERM-then-KILL via `kill(-pgid)` +
  `TerminationEvidence`; `apply.ts` reaps prior-owner `owner_pgid` before
  `attemptPush`; `candidate.ts` config-free `gitEnv()`; APPLYING revalidates
  approval token + `repoIdentity` + `fullRef`; `next_attempt_at` enforced +
  repeated-failure/ambiguous-post-push ESCALATE; prepared/`-base` refs deleted on
  terminal) and covered by 9 REAL fixtures in `tests/watcher/containment.test.ts`
  (real backgrounded descendant asserted dead; real orphaned process group
  asserted `isGroupAlive==false`; disposable `file://` remotes — no elapsed-time
  proxies).
- **Finding E — DONE.** Wrote the new immutable feature-head migration record
  `raw/internal/migrations/2026-07-13-134-echo-loop.md` with full AC8 bindings:
  restored `## Commands + exits`, target path/branch, target-policy-copy OID
  `dd9d78ab…`/sha256 `44bef194…`, truthful clean-status, corrected fixed point,
  envelope-invariant dual-route hash, per-artifact OID/SHA-256 table,
  `authority:false`, `installed:false`.
- **Finding A / B — re-verified on disk** (see state above): `--check` validates
  without overwriting; dual-route hash reproduces under a scratch envelope.

### Handoff

- Migration record committed on `agent/134-echo-loop`; feature head
  **`b8e4fe23f53db95b385eec748ce326269f9bf934`** pushed to origin.
- Item moved `claimed/ → pending_review/`; `head_sha` + task-state
  `handoff_head_sha` set to the feature head; `claimed_by` = `fable-builder-134b`.

### Drift events

None. Three authorized operations only (pinned read-only Project_echo source
reads already done by predecessor; local no-remote target; feature-branch push).
No sibling / wiki / holdout-131 touching. No `mcp__echo__*` calls this run.

---

## Run 8 (A–E round-2 residuals CLOSED — fable-builder-134b)

### Trigger

Third codex-ops judgment (feature-branch child `770b101f`) REJECTed with
same-class residuals in C, D, E; A and B confirmed repaired and all 18 bound
hashes reproduced. Founder-authorized precise fix cycle. Item re-opened to
`backlog/claimed/` (main `ea61017f`); no re-claim (continuous claim). New builder
commits stack on the review child `770b101f`.

### Outcome

**All three residuals closed on disposable fixtures only; normal builder handoff
to `pending_review`.** Target remains UNACCEPTED, no remote, not installed, DEV,
`authority:false`.

### Verified state (target HEAD `d69c003ae4146140d3d0ee3fe945778781ae5a43`)

- Tree `ca77fbda46887a4b7e6170029cd5615e2feefad8`; 29 commits; no remote;
  `git fsck --full --strict` exit 0; `git status --porcelain` empty.
- Full `vitest run`: **22 files / 143 tests pass** (was 121; +D fixture roster,
  +C live-group/crash-window fixtures, +fail-closed/tamper fixtures); `tsc
  --noEmit` clean; lint / check:provenance / check:dependencies / check:skills
  exit 0.
- `build-source-plan.mjs --check` exit 0 — committed edge record == HEAD closure,
  **584 rows / 9 classes**, fixed_point
  `203f53420fb50ce82d0064ef238b568371a7095d8f7d2fff52256f7875a8dac8`.
- Dual-route verifier: 14-row roster, both routes verdict pass, inner projection
  byte-identical, SHA-256
  `b47d8c8d2bc0c99fbdd1550b4930a7199468360cb04f0f03c9332373840e3f9d`;
  reproduced under a distinct scratch `HOME`/`TMPDIR` (envelope-invariant).

### Finding D residual (CLOSED)

`tools/build-source-plan.mjs` stops discarding the policy (`void policy` gone);
the sealed policy object drives the accepted `edge_classes` set + fail-closed
reject flags, and `policy_sha256` is bound into the fixed point. Rows are
`(from, from_blob, specifier, edge_class, resolution, context_hash)`;
`source_blobs` binds all 103 executable code-file blobs (incl. the verifier),
`manifest_blobs` binds manifest context → tamper-evident fixed point (verified: a
1-byte change to `build-source-plan.mjs` and a policy-sha change each move it).
`context_hash` hashes canonical manifest/context BYTES (verified via lock-row
version). Fail-closed `EdgeReject` on unresolved repository-capable
file/schema/worker/script/exec + computed; extractor precision fixed
(script-extension boundary guard + heredoc-body skipping) so the real tree yields
zero rejects. Workspace exports / package exports / tsconfig `extends` / `baseUrl`
/ `references` resolve (workspace-only `@acme/foo` fixture passes). Fixture roster
completed (dynamic import, CommonJS require, schema/template, npm JS CLI, python
script, worker entry, baseUrl, fail-closed rejects, policy-driven flags,
tamper-evidence).

### Finding C residual (CLOSED)

Transport children write their process-group id to a durable `pgid_file` as their
FIRST action, before contacting the remote (an `sh` shim: `echo $$ > file; exec
git …`), closing the crash window where `owner_pgid` was persisted only after the
synchronous child returned. Takeover reaps the ACTUAL prior group (`owner_pgid`,
or the `pgid_file` on crash) with a group-directed TERM/KILL and requires
termination evidence before `attemptPush`; evidence stored durably.
`setOwnerPgid` + takeover CAS are owner-token-predicated (a resurfacing prior
owner cannot clobber the new owner). State schema adds `pgid_file` +
`termination_evidence` (+ forward-migration). Fixtures couple a LIVE prior-owner
group (orphaned to init — no zombie, modelling a crashed prior owner) to an
expired APPLYING lease and assert reap-before-apply; a crash-window fixture proves
recovery via the durable `pgid_file` alone.

### Finding E residual (CLOSED)

New migration record `raw/internal/migrations/2026-07-13-134-echo-loop.md` binds
the literal publication endpoint `https://github.com/zhenye0616/ECHO.git` + full
ref `refs/heads/agent/134-echo-loop`, and states concrete route argv (no
`<dir>`/`<npm-cli>` placeholders), alongside the full artifact OID/SHA-256 table,
corrected fixed point, envelope-invariant dual-route hash, `authority:false`,
`installed:false`.

### Handoff

- Migration record committed on `agent/134-echo-loop`; feature head
  **`375bdf694d8bd71bf383b6ae7416d69990ab3092`** (sole parent review child
  `770b101f`) pushed to origin.
- Item moved `claimed/ → pending_review/`; `head_sha` + task-state
  `handoff_head_sha` set to the feature head.

### Drift events

None. Three authorized operations only (pinned read-only Project_echo source
reads; local no-remote target; feature-branch push). No sibling / wiki /
holdout-131 touching. No `mcp__echo__*` calls this run.

---

## Run 9 (fourth-review remediation — successor builder)

### Trigger and prior state

The immutable fourth `codex-ops` judgment child
`fe26a78f89d130364af5b2207e7b07b41eecb78b` reproduced the Run 8 evidence and
REJECTed four same-class residuals: D1 (schema false-green), D2 (executable-edge
extraction/context omissions), C1 (takeover evidence crash window), and C2
(stale-owner APPLYING mutation). Founder authorized only those four repairs and
the normal builder handoff.

Kept: the clean feature-branch judgment child, the clean no-remote target at
rejected HEAD `d69c003ae4146140d3d0ee3fe945778781ae5a43`, and all previously
accepted A/B/E and broader C/D work. Discarded: no committed or uncommitted
state. The successor consists of five linear target commits after `d69c003`:
`27290be` (schema/scanner/watcher fix), `cf2e936` (repo-vs-fixture roots),
`02e0107` (validated closure regeneration), `7d349fe` (remove closure
self-reference), and `38989db` (final stable closure).

### Outcome

**D1, D2, C1, and C2 are CLOSED on disposable fixtures.** This is a normal
builder handoff to `pending_review`; fresh independent review is required and
the builder makes no acceptance claim. The target remains UNACCEPTED, has no
remote, is not installed, and remains a local `DEV` candidate with
`authority:false` and `installed:false`.

### Implemented remediation

- **D1 — CLOSED.** Added the complete Draft-07 schema for all emitted root and
  row fields, including `policy_sha256`, source/manifest blobs, `from_blob`, the
  closed edge enum, and class/resolution-kind relationships. Generation and
  `--check` validate generated and exact committed values against the exact
  committed schema before comparison/write. Rejecting and structurally invalid
  schema fixtures fail closed.
- **D2 — CLOSED.** Replaced global regex/literal inference with a lexical,
  string/comment-aware JS scanner. It scans executable calls in test bodies but
  ignores fixture strings; recognizes member/computed expressions such as
  `process.env.SCRIPT`; classifies absolute repo-root paths; tracks lexical
  shadowing and reassignment; and binds a source-specific tsconfig chain.
  Equal-depth competing tsconfigs reject as `ambiguous_tsconfig_context`. Exact
  adversarial fixtures cover all six fourth-review cases.
- **C1 — CLOSED.** Takeover now accepts the exact prior owner token, prior PGID,
  prior PGID file, and validated termination evidence as CAS inputs. The same
  guarded SQL update installs the successor and durably records prior identity
  plus proof. A crash-immediately-after-CAS fixture reopens the database and
  observes both successor ownership and evidence already committed.
- **C2 — CLOSED.** Every APPLYING mutation is guarded by
  `state='APPLYING' AND owner_token=?`, including escalation, retry/failure
  accounting, PGID/evidence writes, recovery, and APPLIED. Non-applying
  escalation is limited to PREPARED/APPROVED. A stale-owner fixture proves the
  prior owner cannot escalate, increment attempts, overwrite evidence, or mark
  the successor applied after takeover.

### Files modified

The target delta `d69c003..38989db` is 15 files, 1,383 insertions and 305
deletions:

- `provenance/edge-record.v1.json`
- `provenance/edge-record.v1.schema.json`
- `src/watcher/apply.ts`
- `src/watcher/reaper.ts`
- `src/watcher/state.ts`
- `tests/migration/source-plan.test.ts`
- `tests/migration/verification-result.test.ts`
- `tests/watcher/containment.test.ts`
- `tests/watcher/recovery.test.ts`
- `tests/watcher/state.test.ts`
- `tools/build-source-plan.mjs`
- `tools/lib/draft7-schema.mjs`
- `tools/lib/source-plan.mjs`
- `tools/run-verification.mjs`
- `tools/verify-offline-install.mjs`

Project_echo feature commit `ed41a6685848a0dc6f04d558e00e3c426a9b3166`
changes only
`raw/internal/migrations/2026-07-13-134-echo-loop.md`; its sole parent is the
rejected judgment child `fe26a78f89d130364af5b2207e7b07b41eecb78b`.
The migration-record blob is `275d500416f15c6d01385923e990c254bcdea4b9`
(12,761 bytes; SHA-256
`ade1111973a9d6734444729be59305377bb39957cdb0f420227499e1a4265cae`).

### Exact target and closure evidence

- Target HEAD `38989db78e221a7e15b2adbe859fa76244bf16e4`; tree
  `76a7bc47a9aaf0196d2a43497d01460b0df86847`; branch
  `migration/2026-07-13-134`; 34 linear commits; one root and one branch.
- Edge schema blob `9ed57b7a338f12a6258a4ea4fdddab7f1da78813`, SHA-256
  `70af1779c9a864073e3690b8eb93662292d4b5d5e4c4d47480fcd9210d775c09`.
  Edge record blob `02b50876b9f07c5fa4a004b68fe6816622c97fa4`, SHA-256
  `2dbb5f13edabdac076ba4b961281f36aef3bae93d251c53fa001c439197b87c0`.
- Exact HEAD closure: 604 rows / 9 classes, 104 source blobs, 3 manifest
  blobs; fixed point
  `b1745bfd39cd51d89b52d0e669b073643103ec597ee9c5f731d1bcb599b9cb5a`.
- Direct and npm routes each passed the exact 14-row workload. Their inner
  projection is byte-identical and envelope-invariant, SHA-256
  `e21c1d0fb2f4afcbe88b27d4fd7988cb7f180c9b72a18936ca4ea98c7d81d0ef`.
  Route SHA-256 values are direct
  `e545fadfde78db82fe846fe2e4ed1ec1efc9396187740a27f85c5ac5171bc32e`
  and npm
  `c0095e584c4a845b23c7b59ed26f3156d2e091816553c5915e623a4da9689e52`.
- Target filesystem is clean, including ignored/untracked state: 173 tracked
  files exactly equal 173 non-`.git` filesystem files. The tracked
  `.verify-smoke*` directories exactly match HEAD; generated `.DS_Store`,
  `.verify-*`, `dist/`, and `node_modules/` residue was removed.
- All 400 objects are reachable: 34 commits / 147 trees / 219 blobs. Strict
  fsck/unreachable checks are clean. There is no target remote, alternate,
  promisor, replace, shallow state, tag, symlink, or gitlink.

### Tests and checks — verbatim result summaries

Full suite:

```text
Test Files  22 passed (22)
Tests       153 passed (153)
Duration    225.37s
```

Focused source-plan suite:

```text
Test Files  1 passed (1)
Tests       46 passed (46)
Duration    5.81s
```

Focused watcher suite:

```text
Test Files  4 passed (4)
Tests       28 passed (28)
Duration    42.67s
```

Additional zero-exit checks: TypeScript `--noEmit`; lint (`43 source files, no
stray debug`); provenance (`76 byte-identical ports / 148 inventory rows`);
dependencies (`5 declared / 132 locked, no root drift`); skills (`13 ported,
byte-identical`); repeated source-plan `--check`; private-clone source
independence; strict fsck; and both direct/npm route verifiers. The focused
tests explicitly include exact-schema validation, six extraction/context
adversaries, atomic-CAS crash persistence, and stale-owner exclusion.

### Acceptance-criteria status and decisions

- AC1–AC7 remain green at the exact successor target and hashes above.
- AC8 feature publication is complete: literal remote readback of
  `refs/heads/agent/134-echo-loop` equals
  `ed41a6685848a0dc6f04d558e00e3c426a9b3166`. The first strict config-free push
  attempt lacked credentials and failed without mutation; a one-shot explicit
  credential helper retried the same `--force-with-lease` expected-old
  `fe26a78f89d130364af5b2207e7b07b41eecb78b` and succeeded.
- The exact target repository remains the acceptance object. No result was
  generalized into a release, install, remote creation, maturity advancement,
  or authority transfer.
- Fresh independent review at feature head `ed41a668...` is the only next
  lifecycle step; do not inherit the builder's conclusion.

### Open questions

None for the builder. Independent review may accept or reject the immutable
feature head; this handoff does not pre-decide that verdict.

### Drift and ECHO MCP

No drift. Only pinned read-only source access, the existing local no-remote
target, and the authorized Project_echo feature-branch publication were in
scope. No sibling, wiki, holdout-131, install, release, or target-remote action
occurred. No ECHO MCP call was made, so no dogfooding-journal entry was added.

---

## Run 10 (resumed at 2026-07-15T06:23:18Z — fifth-review residuals CLOSED)

### Trigger and prior state

The immutable fifth `codex-ops` judgment child
`9bf1d8fbe503f1a0757ca450bc70bf32d8df8a69` reproduced Run 9 and REJECTed two
remaining defects: C3, the check/use gap between watcher ownership validation
and transport child creation; and V1, tracked Python bytecode mutations hidden
by a final `git diff-tree HEAD` row which never inspected the worktree.
Founder authorized only precise fifth-round remediation and a normal builder
handoff.

Kept: the clean rejection child, the clean no-remote target at reviewed HEAD
`38989db78e221a7e15b2adbe859fa76244bf16e4`, all previously accepted
D1/D2/C1/C2 and broader AC work, and the existing feature worktree. Discarded:
no committed or uncommitted source state. Generated verifier outputs and
`node_modules/` were removed only after their hashes/results were recorded.
Seven linear target commits advance the reviewed target:

- `08404d0` — watcher launch fencing and verifier cleanliness;
- `1c3a6df` — pinned watcher-supervisor executable;
- `6a06983` — extraction closure regeneration;
- `59a2699` — takeover identity hardening;
- `981874a` — watcher launch closure refresh;
- `ba8bee2` — bounded cross-architecture validator transport;
- `c8ed1b0` — final validator-transport closure.

### Outcome

**C3 and V1 are CLOSED on disposable fixtures; normal builder handoff to
`pending_review`.** Fresh independent review is required and the builder
makes no acceptance claim. The target remains UNACCEPTED, no remote, not
installed, and local `DEV`; `authority:false`; `installed:false`.

### Implemented fifth-review remediation

- **C3 — CLOSED.** Added a durable launch tuple
  `(generation, stage, nonce, pgid, status, result)` for pre-probe, push, and
  post-probe. A pinned detached supervisor becomes group leader; the child owns
  exact owner-token registration before Git and exact completion after Git.
  The parent consumes only the completed fence. Takeover binds the exact old
  owner plus full launch tuple/evidence and either consumes completion or
  authenticates and reaps the active identity before the successor CAS.
  Deterministic fixtures cover both CAS interleavings at all three launch
  stages, parent/child crashes, wrong nonce, and post-Git crash.
- **V1 — CLOSED.** Deleted the two tracked
  `tools/review-queue/__pycache__/*.pyc` files; added `__pycache__/` and
  `*.py[cod]` ignores; forced `PYTHONDONTWRITEBYTECODE=1` through test,
  verifier, schema, offline-install, and sandbox children. Replaced the
  non-observing `diff-tree` tail with exact final row
  `["git","status","--porcelain=v1","--untracked-files=no"]`, expected
  empty stdout. The verifier resolves HEAD/tree before executing the workload,
  making `tracked-clean` the last executable child. New regressions prove the
  prior false green and reject unstaged, staged, and unmerged tracked changes.

### Self-audit repairs before final sealing

A separate read-only adversarial re-audit found three defects in the initial C3
repair; none was carried into the final green target:

- A supervisor death while Git was live could leave a leaderless transport
  group with insufficient identity evidence. A same-PGID inert sentinel now
  carries the exact marker, and a real SIGKILL fixture against live
  `git daemon` proves successor authentication and reap.
- Group identity could change between inspection and TERM/KILL. Reaping now
  STOPs, re-inspects the exact marker, and sends only CONT on mismatch—never
  TERM/KILL or takeover CAS. A deterministic replacement fixture proves it.
- A locally invalid binding after takeover could strand APPLYING. An exact
  successor-owner/current-non-ACTIVE-launch CAS now escalates durably without
  admitting stale-owner mutation.

The source-plan check also rejected a computed supervisor executable; transport
now pins `/usr/local/bin/node`. These repairs were re-audited with no remaining
concrete blocker before the final suite.

### Disclosed killed attempt versus final green run

The first full-suite attempt was **not** counted as green. Under Rosetta x86_64
Node spawning arm64 Python, Draft-07 validation hung in
`json.load(sys.stdin)` for approximately six minutes. That exact test session
was terminated; no pass result was claimed. The repair writes canonical JSON to
a mode-0600 temporary file outside the repo, invokes Python with that pathname
and stdin closed, applies a hard 30-second timeout, and removes the file in all
outcomes. The validator then passed five consecutive probes. A completely new
full-suite run at final HEAD `c8ed1b0` passed 24/24 files and 169/169 tests.

### Files modified

Target delta `38989db..c8ed1b0`: **25 paths, 2,114 insertions, 540
deletions**:

- watcher protocol: `src/watcher/{apply,reaper,state,transport}.ts`,
  `tools/watcher-transport-{supervisor,sentinel}.mjs`;
- watcher tests: `tests/watcher/{apply,containment,launch-barrier,recovery,state}.test.ts`;
- verifier/schema: `tools/lib/{draft7-schema,verification-workload}.mjs`,
  `tools/{run-verification,verify-offline-install}.mjs`,
  `provenance/{edge-record.v1.json,verification-workload.v1.json}`;
- verifier tests/config: `tests/helpers/py.ts`,
  `tests/migration/{verification-cleanliness,verification-result}.test.ts`,
  `vitest.config.ts`, `vitest.workload.config.ts`;
- cleanliness: `.gitignore` plus deletion of the two tracked review-queue pyc
  files.

Project_echo feature commit
`155c48c0f3b79fb4aad4fa2b1ad95d175f0b0601` changes only
`raw/internal/migrations/2026-07-13-134-echo-loop.md`; its sole parent is
`9bf1d8fbe503f1a0757ca450bc70bf32d8df8a69`. The record blob is
`4855dd938da4a8db312d9e30d584fc9714e44d30` (12,381 bytes; SHA-256
`ade0cae94b9cde965bcb9ec6eaa98e021779c5aa5e2b9bfa562746850f46aaca`).

### Exact target, closure, and topology

- HEAD `c8ed1b01435bf0cb9dbf1ff6eec4c42a5202082b`; tree
  `b6faf29693ff050ee3160d0461a2ad4d075a394e`; branch
  `migration/2026-07-13-134`; 41 linear commits, one root/branch, no merges.
- Edge record blob `d8ee0bd667e95c288fefb063155f085f68595b14`,
  SHA-256 `6d1129a7862303b4dd5d5d42c9defd56504d1f0dc1bd11ed63b465c8203b85ff`;
  exact closure 644 rows / 9 classes / 110 source blobs / 3 manifest blobs;
  fixed point
  `b719002a8a1a2426ff55698e914ee0a66ede394ef00e1797336ac6c0d70bb20f`.
- 472/472 reachable objects: 41 commits / 177 trees / 254 blobs; strict
  `fsck --full --strict --no-reflogs --unreachable` exits 0 with zero garbage.
- 177 tracked files exactly equal 177 non-`.git` filesystem files after
  cleanup; status including ignored/untracked is empty. No remote, tags,
  alternates, promisor/partial-clone, replace, graft, shallow, symlink, or
  gitlink state.

### Tests and checks — final accepted execution results

Full suite, new run after the killed attempt:

```text
Test Files  24 passed (24)
Tests       169 passed (169)
Duration    331.94s
```

Focused suites:

```text
Watcher:             7 files / 53 tests passed
Source plan:         1 file  / 46 tests passed
Review+cleanliness:             12 tests passed
```

Dual-route workload, canonical direct→npm and reverse npm→direct:

```text
verify:extraction route=direct verdict=pass rows=14 out=.verify-direct
verify:extraction route=npm verdict=pass rows=14 out=.verify-npm
verify:extraction route=npm verdict=pass rows=14 out=.verify-reverse-npm
verify:extraction route=direct verdict=pass rows=14 out=.verify-reverse-direct
```

All four `inner.json` files were byte-identical, SHA-256
`ce265a7b646513945e9944a1f26e0b8ee86c748d57a30911463ca104a9c6a99f`.
Each contains the exact 14-row roster, all status 0, ending in
`tracked-clean`. Typecheck; lint (46 source files); provenance (76/148);
dependencies (5 declared / 132 locked); skills (13); repeated source-plan
`--check`; private-clone deny-network offline install/native SQLite
rebuild+load; source independence; and strict fsck all passed.

### Acceptance-criteria status and decisions

- **AC1 PASS:** exact clean ordinary local repo/topology/object closure above.
- **AC2 PASS:** final policy-bound 644-row fixed point and dependency/skill/
  provenance closure pass.
- **AC3 PASS:** coordination semantics and offline native SQLite proof remain
  green.
- **AC4 PASS:** protocol-template boundary remains product/history-free.
- **AC5 PASS FOR BUILDER HANDOFF:** C3 launch barrier, crash recovery,
  identity reinspection, and stale-owner exclusion are implemented and covered
  by 53/53 watcher tests. Independent reviewer must still judge acceptance.
- **AC6 PASS:** disposable claim/build/review/merge fixtures pass.
- **AC7 PASS FOR BUILDER HANDOFF:** tracked-clean closes V1; all four route
  results are identical and source-independence/offline checks pass.
- **AC8 BUILDER LEG COMPLETE:** literal leased feature publication used
  expected-old fifth judgment `9bf1d8f…`; strict literal remote readback is
  exactly `155c48c0…`. The independent review child is deliberately not
  created by this builder.

No new design choice widens the spec. The target remains the acceptance object;
no result is generalized into an install, release, remote, maturity advance, or
authority transfer.

### Open questions

None for the builder. A fresh independent review may accept or reject exact
feature head `155c48c0…`; this handoff does not inherit or pre-decide a
reviewer verdict.

### Drift and ECHO MCP

No drift. Work stayed within the two fifth-review residuals plus repairs needed
to make that exact mechanism fail closed. No sibling, wiki, holdout-131,
target-remote, install, release, item-body, review-sidecar, or docs/BACKLOG
change occurred. Zero ECHO MCP calls were made, so no MCP journal entry was
added.
