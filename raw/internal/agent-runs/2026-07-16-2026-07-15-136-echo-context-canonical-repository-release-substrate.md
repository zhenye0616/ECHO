---
backlog_item: 2026-07-15-136-echo-context-canonical-repository-release-substrate
agent_run_started: 2026-07-16T08:33:45Z
agent_run_ended: 2026-07-16T09:34:40Z
status: ready_for_review
test_status: passing
---

# Agent Run: Canonical echo-context repository and source-artifact substrate

## Outcome

Implemented item 136 on isolated Project_echo and echo-context feature branches. The exact target feature head is `145868a67a85dbb651faed457ee4001370c0fad0`, tree `44ae95b77cd2298cd25b915f283b07bd7423100e`, and pull request `https://github.com/zhenye0616/echo-context/pull/1`.

The builder pushed only the target feature branch. It did not merge or push target main, create a tag/release, configure hosting controls, install anything, read live state, or transfer runtime/state authority.

## What I Implemented

- Froze the item-135 extraction at commit `0cf7b006eba665c0bf55e82ff04da70f19f01ebb`, tree `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`, and an exact 190-path mode/blob/size/content inventory.
- Added explicit source/source-artifact authority records while retaining `runtime_authority:false`, `state_authority:false`, and `installed:false`.
- Preserved item-135 `provenance/runtime-inventory.v1.json` byte-for-byte and added a generated cross-platform successor runtime-inventory.v2 closure.
- Committed the standalone TypeScript, ESLint, and source/operator Vitest configurations; moved raw Project_echo replay behind explicit operator inputs.
- Added exact source/release clean-clone traces, including three clean/HEAD boundary pairs and source-owned temporary-directory cleanup proof.
- Added deterministic Git-object-only USTAR+gzip source artifact creation and strict verification with canonical manifest bytes.
- Added the shared Gitleaks contract, digest-pinned installer, full-advertised-ref scanner, least-privilege CI workflows, hosting-control verifier, build-once release workflow, exact-ID bundle verifier, and sole release publication controller.
- Added governance fixtures for authority, artifact determinism/mutations, secret-scan failure semantics, workflow permissions/ordering, hosting controls, rerun rejection, and exact release traces.

## Verification

- `npm ci` — passed; 291 packages, zero audit vulnerabilities.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run test:ci` — passed; 77 files, 1,025 passed, 17 skipped, zero failed.
- `npm run test:operator` with explicit Project_echo Git dir/SHA — passed; 2/2.
- `npm run verify:inventory` — passed; 340 lock-closure packages and 25 successor executable/config sources.
- `npm run verify:authority` — passed.
- Full-history/all-advertised-ref Gitleaks 8.30.1 scan — passed; zero findings.
- Deterministic source artifact build/verify — passed at the exact feature head.
- Detached no-local clone under a temporary HOME, with no sibling repository and all ECHO variables absent — passed the exact 16-step source trace.
- Workflow YAML structural parse — passed.
- Hosted CI run `29487447722` — passed at the exact target head on macOS and Ubuntu.
- Hosted secret-scan run `29487447735` — passed at the exact target head.
- `git diff --check`, target cleanliness, remote feature-head readback, and PR head readback — passed.

## Repaired Gate

The first detached-clone trace failed at secret-scan step 14 because the verifier accepted an absolute scanner path but did not resolve a PATH-only executable. I fixed the resolver, refreshed the sealed v2 inventory, reran scanner/type/lint fixtures, and reran the complete detached clone successfully.

Hosted runs `29486617903` and `29486617921` then exposed founder-machine Node/Git paths plus a binary-file `GITHUB_PATH` entry. I changed CI Node launchers to `process.execPath`, made Git PATH-resolved, changed the scanner installer to emit and verify its directory PATH entry, and added regression tests. The following CI run `29487188805` exposed one nested Node hardcode in the parity verifier while secret-scan run `29487188736` passed; I changed that launcher to `process.execPath` and extended the regression test. After each repair I refreshed runtime-inventory.v2 and reran the relevant focused tests plus the full local and detached-clone gates. Final hosted runs `29487447722` and `29487447735` passed. No failure was waived or merely rerun without a cause-level repair.

## External Gate Preserved

The current private GitHub repository/account tier cannot enforce the exact reviewed protected-main and required-environment-reviewer controls, and the current account has no distinct reviewer identity for the required PR approval. The implementation remains fail-closed; no workflow or test was weakened and no release was attempted. The persistent coordinator must resolve this after independent implementation review and before target-main/release completion.

## Authority Boundary

- Echo-context feature bytes: review candidate only.
- Canonical source authority: remains pending target-main merge/readback.
- Source-artifact authority: remains pending the later build-once private prerelease.
- Project_echo remains installed runtime, live-state, client endpoint, backup, and rollback authority.
- Runtime authority: `false`; state authority: `false`; installed: `false`; maturity: `DEV`.

## ECHO MCP

Zero ECHO MCP calls were made. Per the repository rule, no dogfooding journal entry is owed.

---

## Run 1 (resumed at 2026-07-16T15:40:53Z)

### What I Implemented

Cycle two continued the frozen Project_echo and echo-context feature histories
without rebase or rewrite and implemented the founder-directed R21 scope cut.
It preserved the source substrate and deterministic non-installable artifact,
added the injected frozen repository-bootstrap gate, replaced the old
source/release verifier with the sole source-mode bounded state machine and
cleanup child, added real top-level secret-scan failures plus no-hosted-surface
governance, and deleted every hosted workflow, release/publication controller,
and operation-host surface.

### Prior State Kept vs. Discarded

- Kept: item-135 immutable provenance, repository/source authority records,
  source behavior and parity bytes, the deterministic source artifact builder
  and verifier, the exact Gitleaks contract/installer, and the evolving v2
  runtime inventory.
- Discarded: all three `.github/workflows/**` files, workflow policy tests,
  hosted-control and workflow-artifact verifiers, release-bundle/tuple tools,
  the publication controller, release mode in fresh-clone acceptance, and the
  premature builder-authored Project_echo bootstrap migration record.

### Files and Branches

- Project_echo branch `agent/echo-context-canonical-repository-release-substrate`
  at `59db3c608ecbb3af0e7723e960bd80748d9e1326` updates cycle-two pointer/run
  evidence and removes the premature migration record.
- Echo-context branch `agent/echo-context-canonical-repository-release-substrate`
  at `358fb4da774287b6c55d287a46d53b5aff033e87`, tree
  `70c18b4c2e3f6e24b46c6cd8da56acc0eb13e76d`, contains the complete source-only
  implementation. Remote feature-head readback matched exactly.

### Decisions Made During Implementation

- Bound the scrubbed acceptance scanner to the reviewed release binary at
  `<sandbox HOME>/bin/gitleaks`; the host Homebrew binary has the same version
  but different bytes and correctly fails the committed digest contract.
- Made the clean-clone scan consume an exhaustively fetched local
  `refs/echo-scan/**` snapshot so the credential-free acceptance process makes
  no private-remote request while Gitleaks still scans every reachable ref.
- Kept dual-build tuple sealing, target-main landing authorization, and the
  final bootstrap record coordinator-only after independent review.

### Acceptance Criteria Status

- [x] AC1 — frozen bootstrap gate model and exact full-ref secret scanner,
  including live top-level negative fixtures; no bootstrap write repeated.
- [x] AC2 — frozen v1 evidence preserved; v2 regenerated for 340 packages and
  22 executable/config sources; source/runtime authority split unchanged.
- [x] AC3 — exact source-only wrapper/verifier/cleanup trace passed in a fresh
  no-local sibling-free clone under a scrubbed temporary HOME; operator replay
  independently passed 2/2.
- [x] AC4 — implementation is independently reviewable at exact feature heads;
  no target-main push was attempted and no hosted surface remains.
- [x] AC5 — deterministic Git-object-only source artifact builder/verifier and
  mutation tests passed; install/runtime/state flags remain false.
- [ ] AC6 — intentionally coordinator-owned after review and canonical landing;
  no tuple seal, final migration record, tag, release, or artifact publication
  was performed by this builder.

### Tests Run (verbatim terminal summaries)

```text
runtime-inventory.v2 OK: 340 packages, 22 sources
repository-authority OK: baseline ancestor of 358fb4da774287b6c55d287a46d53b5aff033e87

Test Files  78 passed (78)
Tests  1041 passed | 17 skipped (1058)

secret-scan OK: 4 snapshotted source ref(s), full reachable history
fresh-clone acceptance OK

Test Files  1 passed (1)
Tests  2 passed (2)
```

`npm run typecheck`, `npm run lint`, `git diff --check`, target feature push,
and both remote feature-head readbacks also exited zero.

### Open Questions

None for the builder. Independent implementation review and the exact
coordinator-owned landing/seal sequence remain mandatory next steps.

### Drift Events

None. No ECHO MCP calls were made, so no dogfooding journal entry is owed.

---

## Cycle-two independent-review repair continuation

- Same builder actor: `codex-136-cycle2-builder-7f6a2d31`
- Repair run ID: `cycle2-7f6a2d31-20260716-repair1`
- Rejected target head: `358fb4da774287b6c55d287a46d53b5aff033e87`
- Repair implementation commit: `3cb0d54` (`fix: close fresh-clone review gaps`)
- Repaired target feature head: `1a91750e5b9ce9db49e9c893f9974b318f12f38a`
- Repaired target tree: `ed851f9deb2ba3135af5f11955d878f5d1c9c802`
- Repaired Project_echo feature head: `5b99d896e9103e0047c31d19fc574d7eea92abc5`
- Finished repaired-head verification: `2026-07-16T16:59:16Z`

The first independent cycle-two review reproduced a process-group lifecycle
hole and rejected the candidate. This continuation preserved both branch
histories and repaired only the bounded findings: the child adapter now returns
one synchronous cancellable handle whose completion and idempotent
`cancelAndSettle` retain PID/PGID/direct-exit/stdout/stderr state until all are
terminal; mutable temporary-root creation uses synchronous production FS calls
and records `T` immediately after `mkdtemp`; every Promise-bound dependency is
explicitly read-only; the authenticated prefetch writes a strict advertised-ref
manifest under the Git directory and the offline scanner compares the exact
transformed ref-name/OID set; and bootstrap push parsing accepts only the full
`To` / created-main / `Done` grammar. Cancellation, post-`T` survivor,
TERM-resistant stream, cleanup timeout, stage-specific partial-`T`,
never-settling read/cleanup/final-HEAD, aggregate deadline, successful scrubbed
shell-to-Node, omitted branch/tag, and malformed/trailing porcelain fixtures
were added. A read-only pre-freeze oracle reran the exact late-mutation
reproducer and the complete focused set before the commits were frozen.

### Repaired-head verification

- `npm run typecheck` and `npm run lint` — passed.
- Repair-focused Vitest set — passed; 60/60.
- `npm run test:ci` — passed; 78 files, 1,066 passed, 17 intentionally skipped, zero failed.
- `npm run verify:inventory` — passed; 340 packages and 23 executable/config sources.
- `npm run verify:authority` — passed at exact repaired head.
- Gitleaks 8.30.1 installed and digest-checked from the committed contract; exhaustive authenticated prefetch bound four canonical advertised refs and the top-level full-history scan passed with zero findings.
- `npm run test:operator` with explicit Project_echo Git dir and source SHA `2971310441b69735cbe759293abd8c4d044bf347` — passed 2/2.
- A real `--no-local` isolated clone at the exact repaired head passed the complete scrubbed wrapper trace.
- After the target feature push, a fresh canonical HTTPS clone of `zhenye0616/echo-context` read back exact head `1a91750e5b9ce9db49e9c893f9974b318f12f38a`, bound all four advertised refs, and passed the complete scrubbed wrapper trace including one owned-root cleanup and final clean status/HEAD readback.
- Remote target feature readback equals `1a91750e5b9ce9db49e9c893f9974b318f12f38a`.

The item remains pending independent review. No target-main or Project-main
implementation merge/push, approval, release, install, live-state access, or
authority transfer occurred. Zero ECHO MCP calls were made, so no dogfooding
journal entry is owed.

---

## Run 2 (resumed at 2026-07-16T17:45:27Z)

### Exact reviewed input and final identities

- Final builder: `codex-136-cycle2-final-builder-oracle-42c8`.
- Converged R24 spec commit: `f80003a7fbd08755dbff669951ed07bf43b390d0`.
- Fresh ready seal: `a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca`.
- Prior remote target head: `1a91750e5b9ce9db49e9c893f9974b318f12f38a`.
- Final target feature head: `02af4e411077063d2cf5d4931bd3e9c1c0f0a5c7`.
- Final target tree: `bc8b700fe5db3435d54a930a71d0c5455b85541b`.
- Final Project evidence head: `2fdce9c64b8077de1e73fffe5232bc471a973ac3`.
- Final Project evidence tree: `11fbc67d4efd9be05942ad0b8ed7a18fb75b1950`.

### What I implemented

Preserved the existing feature history and changed only the R24-converged AC3
terminality surface. The verifier now separates terminal no-PID pre-spawn
failures from positive-PID children; proves direct exit, both stream closures,
and process-group absence for spawned children; starts one idempotent
TERM/exact-five-second/conditional-KILL ceremony for surviving descendant
groups; and withholds completion, cleanup advancement, and the original child
outcome until the same handle re-proves terminal after the ceremony. The
orchestration deadline remains bounded under responsive kernel calls without
inventing a lifecycle failure when a reap observation expires.

Previous target state was kept. No commit was rebased, amended, dropped, or
force-pushed. Three target files changed from the prior remote head:

- `tools/fresh-clone-verifier.mjs` — +222/-64.
- `tests/governance/fresh-clone-acceptance.test.ts` — +523/-46.
- `provenance/runtime-inventory.v2.json` — +2/-2, mechanically regenerated.

### Acceptance criteria status

- [x] AC1 — immutable bootstrap history and exact scanner contract preserved;
  no repository/bootstrap external operation repeated.
- [x] AC2 — item-135 bytes preserved; successor inventory and source/runtime
  authority checks pass at the final target head.
- [x] AC3 — both exhaustive terminal shapes, the sole 17-step source trace,
  exact toolchain/environment, cleanup, deadlines, and original-outcome
  withholding pass at the final target head.
- [x] AC4 — no workflow or hosted/release surface was added; the immutable
  feature candidate is pushed for a different independent reviewer.
- [x] AC5 — the deterministic non-installable source artifact build/verify ran
  inside both isolated acceptance traces with runtime/state authority false.
- [ ] AC6 — intentionally coordinator-owned after independent review and
  canonical target-main landing; no merge object, tuple seal, or final
  migration record was authored by this builder.

### Exact-head verification

```text
Target H  = 02af4e411077063d2cf5d4931bd3e9c1c0f0a5c7
Target T  = bc8b700fe5db3435d54a930a71d0c5455b85541b
AC3 focus = 42 passed / 42
typecheck = passed
lint      = passed
inventory = runtime-inventory.v2 OK: 340 packages, 23 sources
authority = passed
CI        = 78 files passed; 1,079 passed; 17 skipped; 0 failed
secrets   = 4 advertised refs; full reachable history; passed
operator  = 2 passed / 2 at Project source 2971310441b69735cbe759293abd8c4d044bf347
no-local  = fresh-clone acceptance OK; exact H; clean status; no owned run root
HTTPS     = canonical origin; 4 advertised refs; acceptance OK; exact H; clean status
oracle    = explicit PASS at H/T; no remaining HIGH or MEDIUM blocker
remote    = refs/heads/agent/echo-context-canonical-repository-release-substrate == H
```

One full-CI attempt exposed an unrelated `kill EPERM` race in the migration
protocol-probe cleanup. It was not waived: the exact failing file reran 6/6,
then the full exact-head suite reran green as reported above. The first
no-local harness command also asserted that the acceptance parent directory
must not exist; the reviewed cleanup intentionally removes only its owned
`run-*` root and leaves the empty parent. A new no-local/no-hardlinks clone
reran with the correct empty-parent/readback contract and passed. Neither
event changed target bytes or H.

### Decisions, open questions, and drift

No implementation choice exceeded the R24 contract. A read-only fresh oracle
checked the exact final H/T independently. Independent implementation review,
target-main landing authorization, literal landing, dual-build tuple sealing,
and Project completion remain pending. No target-main or Project-main
implementation merge/push, release, install, live-state access, or authority
transfer occurred. No drift event occurred.

Zero ECHO MCP calls were made, so no dogfooding journal entry is owed.

---

## Final coordinator completion validation

This chronologically final section supersedes only the historical builder-state
sentences immediately above that said AC6 and the reviewer record were pending;
those statements remain preserved as exact earlier-run evidence.

- [x] AC1 — immutable create/baseline approvals and secret-scan proof recorded.
- [x] AC2 — frozen baseline and successor authority/readback identities recorded.
- [x] AC3 — independently reviewed exact `H`; all mandatory gates green.
- [x] AC4 — one authorized target-main fast-forward; readback exact `M`.
- [x] AC5 — deterministic source artifact retained with non-installable flags.
- [x] AC6 — two canonical builds and verifications agree; migration record
  published and read back at Project `e0506f30c399819305c5aa94e85acce407e738ca`.

Completion-payload validations passed:

```text
task-state lint             = PASS
backlog index regeneration  = byte-stable, SHA-256 510706195d9dc2448c31aefc98a43272218b70c5e6f0185566dd8046229aa35a
blocked.py --validate       = OK: 138 items across all stages, no errors
coupled invariants          = PASS
skill adapter sync          = PASS
git diff --check            = PASS
stage uniqueness            = one item-136 spec under backlog/complete only
```

The completion commit intentionally changes only the pending-to-complete item
move, finalized builder pointer, deterministic backlog index, and this run-log
evidence. The prior migration-record commit is not edited. No Project feature
merge, branch/worktree deletion, target mutation, release, install, or live
operation is part of completion.

---

## Coordinator completion — canonical landing, tuple seal, and Project evidence

### Program and review identities

- Persistent coordinator: Codex `/root`, acting under
  `raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md`.
- Exact reviewed spec / seal: `f80003a7fbd08755dbff669951ed07bf43b390d0` /
  `a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca`.
- Builder actor / run: `codex-136-cycle3-builder-mendel-222cc09b` /
  `cycle3-mendel-222cc09b-20260716T184207Z`.
- Independent reviewer actor / run: `codex-136-final-reviewer-b9e01c42` /
  `codex-136-final-rereview-20260716T192413Z`.
- Reviewer-owned record Project commit:
  `058eeed26f217e1a4d3f35fc7f2070138b2540a8`; verdict `merge_ready` with
  zero HIGH and zero MEDIUM findings.

### Canonical target landing

- Baseline `B` / tree: `0cf7b006eba665c0bf55e82ff04da70f19f01ebb` /
  `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`.
- Reviewed feature `H` / tree: `ad370ae0a666f366e1ff93c9ec5b920763e9cbb8` /
  `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`.
- Literal merge `M` / tree: `78bf523e87c8b9986d31ba28fdf987cf6ea66c29` /
  `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`, ordered parents `[B,H]`.
- First landing approval `372e5d50-ae1e-43c6-a557-ab874994784c` was consumed
  by a client-side zsh refspec-expansion error before Git sent an update. It had
  no porcelain row, and authenticated reconciliation returned `main=B`; it was
  never retried or reused.
- Replacement approval `d7189a6f-813b-40d1-ae03-bb19eedf816a`, published by
  Project commit `66509501308942e18f00b78dbdc0fec3982c160f`, authorized one
  fully literal leased push. That single attempt returned exactly one
  fast-forward main row and authenticated readback `main=M`.
- No second target push, target feature deletion, tag, release, asset, install,
  client mutation, or live-state mutation occurred.

### AC6 deterministic source seal

A new mode-0700 root held a fresh canonical HTTPS `--no-local` clone detached at
exact `M`, with temporary HOME/TMP/npm caches, fixed Node `v22.22.1`, npm
`10.9.4`, and Git `2.37.3`. Two separate output roots each received exactly the
source archive, checksum sidecar, and canonical manifest. Pairwise comparison
proved all three files byte-identical; each build's committed verifier passed.
An independent read-only agent repeated the clone, file, checksum, manifest,
tuple, and verifier checks and returned PASS.

Final six-field tuple:

```text
source SHA              = 78bf523e87c8b9986d31ba28fdf987cf6ea66c29
source tree             = 3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec
version                 = 0.1.0-dev.136.1
source-archive SHA-256  = 3e7a76c930e7198bbf03b7b13390f5eb2341702d2d3c61ba6d89d00090647bef
lock hash               = 13ead528470d91adfc4456d349ae628f03f768ba51d78aee8d0b2c42dc12784b
manifest hash           = 6a5def0ec7ca27f9230c587f5f9e2bb7caedb0253171198a7bde380877a26e01
```

The manifest remains `artifact_kind:source`, `installable:false`,
`runtime_authority:false`, `state_authority:false`, and `maturity:DEV`.

### Project evidence and completion disposition

- Migration-record publication approval
  `aa41b29f-24a1-446b-b4b0-5513d1afdd12` landed at Project commit
  `1833ea6796f65b97d987ae0e23c8f72813da110e`.
- The independently audited 16,946-byte migration record landed as the sole
  path in Project commit `e0506f30c399819305c5aa94e85acce407e738ca`,
  SHA-256 `6c17caf511a1ea7712ed2ccc0c98137061475f2004b9f2cb349ff3ba5b05f2c4`,
  blob `29660e321815180743553ba3e32de7e818be1f3d`; authenticated readback matched.
- `project_landed_sha` therefore binds that migration-record commit, never the
  later completion commit. `target_landed_sha` binds exact `M`.
- Project feature `7f156ba44b3ff17095a55198a7463ede713f81f7` is intentionally not
  merged: canonical main already contains the complete Run-3 coordination
  evidence and the divergent feature contains no Project implementation bytes.
- Completion authorization ID:
  `d39627d1-d036-45f9-be6b-0d09d48d627e`; its create-only parent record binds
  the exact completion payload before the final Project-main push.
- Source authority is `echo-context/main`; source-artifact authority is the
  versioned tuple. Project_echo remains installed runtime and live-state
  authority. Item 137 is the independent rebuild/install consumer; item 140
  owns all hosted governance and release publication.

No ECHO MCP call was made during coordinator landing, sealing, evidence
publication, or completion preparation. No dogfooding journal entry is owed.

---

## Run 3 claim — consolidated formal-review repair

- Claimed at: `2026-07-16T18:42:07Z`.
- Builder actor ID: `codex-136-cycle3-builder-mendel-222cc09b`.
- Builder run ID: `cycle3-mendel-222cc09b-20260716T184207Z`.
- Formal reviewer actor ID: `codex-136-final-reviewer-b9e01c42`.
- Formal reviewer run ID: `codex-136-final-review-20260716T182509Z`.
- Rejected target head/tree: `02af4e411077063d2cf5d4931bd3e9c1c0f0a5c7` / `bc8b700fe5db3435d54a930a71d0c5455b85541b`.
- Exact spec/seal: `f80003a7fbd08755dbff669951ed07bf43b390d0` / `a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca`.
- Verdict: FAIL — zero HIGH, exactly three MEDIUM; no review record published.

The coordinator assigned one bounded repair after the independent reviewer
completed every long gate. The builder must preserve history and change only:

1. Record deadline-rescue time when the complete terminal predicate and any
   required ceremony finish, never at direct exit/error. Reproducer SHA-256:
   `636dfb61badab446d49e7cdc6d89ad89b3abfa21c605aef6aa6388ca303120e0`.
2. Replace production `Date.now()` deadline accounting with one monotonic clock
   used consistently. Reproducer SHA-256:
   `799dc1796a359cc7b8ffb6a478ddac8d9bd4ad38d501d0f7e0caf339ea4f2120`.
3. Check the monotonic deadline immediately before and after every verifier-local
   synchronous filesystem call; a late return forbids every later operation.
   If `mkdtempSync` returns late, record `T` immediately before rejection so the
   existing cleanup transition owns it. Reproducer SHA-256:
   `67a4e3ea325456c802272352ad972fc5ebd1d13282fdf53386ac8cda8a9c7b85`.

All other formal gates passed at the rejected head: sequential canonical
fresh-clone acceptance, focused AC3 42/42, full CI 1,079 passed/17 skipped,
typecheck, lint, inventory, authority, operator 2/2, four-ref secret scan, dual
deterministic artifact verification, fsck, scope audit, and target merge preview.
Every gate must be rerun at the new exact head. No target-main or Project-main
implementation merge, release, install, live mutation, or authority transfer is
authorized. No ECHO MCP calls were made, so no dogfooding journal entry is owed.

---

## Run 3 completion — formal-review AC3 repair

### Identities and immutable lineage

- Builder actor: `codex-136-cycle3-builder-mendel-222cc09b`.
- Builder run: `cycle3-mendel-222cc09b-20260716T184207Z`.
- Formal reviewer actor: `codex-136-final-reviewer-b9e01c42`.
- Formal reviewer run: `codex-136-final-review-20260716T182509Z`.
- Exact spec/seal: `f80003a7fbd08755dbff669951ed07bf43b390d0` /
  `a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca`.
- Rejected target head/tree: `02af4e411077063d2cf5d4931bd3e9c1c0f0a5c7` /
  `bc8b700fe5db3435d54a930a71d0c5455b85541b`.
- Final target head/tree: `ad370ae0a666f366e1ff93c9ec5b920763e9cbb8` /
  `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`.
- Repair commits: `5455a40` (`fix: enforce monotonic verifier deadlines`) and
  `ad370ae` (`chore: refresh verifier runtime inventory`).
- Final Project feature evidence head/tree: `7f156ba44b3ff17095a55198a7463ede713f81f7` /
  `6b23ee3310c3714c1292d9dbcfa80a1c1b03e119`.

The formal reviewer found zero HIGH and exactly three MEDIUM AC3 defects at the
rejected head: deadline rescue timestamped direct exit/error instead of the full
terminal predicate and any initiated ceremony; production deadline math used
`Date.now()`; and verifier-local synchronous filesystem calls were grouped
rather than individually checked immediately before and after control returned.
The fresh builder changed only those findings, retained every earlier target
commit, and made a normal two-commit fast-forward. No commit was rebased,
amended, dropped, or force-pushed.

The three pinned reviewer reproducers remained byte-identical:

- late terminal: `636dfb61badab446d49e7cdc6d89ad89b3abfa21c605aef6aa6388ca303120e0`;
- backward clock: `799dc1796a359cc7b8ffb6a478ddac8d9bd4ad38d501d0f7e0caf339ea4f2120`;
- filesystem sequencing: `67a4e3ea325456c802272352ad972fc5ebd1d13282fdf53386ac8cda8a9c7b85`.

### Bounded implementation

The verifier now uses one `performance.now()`-based production deadline clock
and rejects non-finite or backward injected readings without allowing a clock
regression to extend a budget. It assigns `outcomeAt` only after the complete
terminal predicate is true and any already-started termination ceremony has
finished. Every verifier-local synchronous filesystem operation goes through
one immediate monotonic pre/post checker; a late return blocks all later setup.
`mkdtempSync` is the sole special seam: its returned `T` is recorded immediately
before the post-call deadline check so the existing single cleanup transition
can remove it exactly once.

The target delta from the rejected head is exactly three paths:

```text
provenance/runtime-inventory.v2.json            |   4 +-
tests/governance/fresh-clone-acceptance.test.ts | 243 ++++++++++++++++++++++--
tools/fresh-clone-verifier.mjs                  | 156 +++++++++++----
3 files changed, 353 insertions(+), 50 deletions(-)
```

No wrapper argv, 17-step plan, deadline constant, hosted surface, `src/**`
behavior, artifact builder/verifier, item-135 v1 provenance, or authority flag
changed.

### Exact-head verification

All evidence below binds target head `ad370ae0a666f366e1ff93c9ec5b920763e9cbb8`
and tree `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`:

```text
AC3 focus = 1 file passed; 49 passed / 49
typecheck = passed
lint      = passed
inventory = runtime-inventory.v2 OK: 340 packages, 23 sources
authority = repository-authority OK at ad370ae0a666f366e1ff93c9ec5b920763e9cbb8
CI        = 78 files passed; 1,086 passed; 17 skipped; 0 failed
operator  = 1 file passed; 2 passed / 2 at Project source 2971310441b69735cbe759293abd8c4d044bf347
secrets   = 4 exhaustive advertised refs; full reachable history; passed
no-local  = --no-local --no-hardlinks acceptance OK; exact H/tree; clean; no owned T
HTTPS     = literal canonical origin; 4 refs; acceptance OK; exact H/tree; clean; no owned T
oracle    = PASS at exact H/tree; zero HIGH and zero MEDIUM
fsck      = passed
remote    = feature ref and PR 1 head equal H; target main remains 0cf7b006eba665c0bf55e82ff04da70f19f01ebb
Project   = feature ref equals 7f156ba44b3ff17095a55198a7463ede713f81f7
```

The exact late-terminal reproducer rejected the one-millisecond-late case with
`clock=30001`, `outcomeAt=30001`, and one `SIGTERM`; the committed parameterized
regression also accepts the exact 30000 boundary. The backward-clock reproducer
rejected with `fresh-clone-verifier: monotonic clock regressed` after
1,072,000 milliseconds of monotonic elapsed time. The filesystem reproducer
rejected immediately after late `mkdirSync`, recorded no later event, and
reported `laterMutationAfterLateMkdir=false`.

The builder acceptance toolchain was:

```text
NODE = /usr/local/Cellar/node@22/22.22.1_1/bin/node (v22.22.1)
NPM  = /usr/local/Cellar/node@22/22.22.1_1/lib/node_modules/npm/bin/npm-cli.js (10.9.4)
GIT  = /usr/local/Cellar/git/2.37.3/bin/git (2.37.3)
```

The first top-level scan stopped before scanning because the expected scanner
binary was absent. The coordinator provisioned the official Gitleaks v8.30.1
Darwin x64 executable in a mode-0700 temporary root. The builder independently
proved canonical regular nonsymlink mode-0700 identity, version `8.30.1`, and
SHA-256 `cee01fea7173f1b779dff188e1c26ecbcb4027d394acc573b23aaf0be260e291`,
which exactly matches the committed contract, then reran the unchanged scan
successfully. No target byte changed during provisioning or replay.

The isolated builder replay used a new mode-0700 root and HOME, cloned with
`--no-local --no-hardlinks --no-checkout`, detached exact `H`, prefetched the
four canonical advertised refs, and passed the committed source-mode wrapper.
Readback proved exact HEAD/tree, empty porcelain, an empty acceptance-temp
parent with no surviving `T`, canonical origin, non-shallow history, no
alternate/promisor/replace state, and clean `git fsck --full`.

After that gate, the builder normally fast-forwarded only
`refs/heads/agent/echo-context-canonical-repository-release-substrate` from
`02af4e4` to `ad370ae`. Exact remote readback proved both the feature ref and
`refs/pull/1/head` equal `H`, while `refs/heads/main` remained the frozen
baseline. A second new clone of literal
`https://github.com/zhenye0616/echo-context.git` repeated the complete wrapper
and every cleanup/clean/exact-HEAD postcondition at the same `H`.

Project feature evidence then advanced normally from `2fdce9c6` to
`7f156ba4`; the commit touches only this run log and the builder task-state
pointer, and remote readback equals the full Project evidence head above.

### Acceptance criteria and authority boundary

- [x] AC1 — immutable repository/bootstrap evidence and scanner contract
  preserved; neither bootstrap operation repeated.
- [x] AC2 — item-135 bytes preserved; successor inventory and authority checks
  pass at the exact final target head.
- [x] AC3 — all three formal findings repaired; sole source trace, terminal
  proof, monotonic deadlines, per-call filesystem checks, and cleanup pass.
- [x] AC4 — feature candidate only is pushed and read back for a different
  independent reviewer; target main is unchanged.
- [x] AC5 — deterministic non-installable source artifact build/verification
  passes inside both isolated acceptance traces.
- [ ] AC6 — intentionally coordinator-owned after independent review and
  canonical target-main landing; no merge object, tuple seal, or final migration
  record was authored by this builder.

The reviewer-owned implementation-review record remains absent. No target-main
or Project-main implementation merge, tag, release, hosted artifact, install,
live-state access, client mutation, or source/runtime/state authority transfer
occurred. There are no open builder questions and no drift event.

Zero ECHO MCP calls were made, so no dogfooding journal entry is owed.

---

## Completion log terminus

The chronologically final coordinator evidence and validation sections above
supersede the earlier Run-3 pending-state statements while preserving them as
historical builder evidence. Item 136 ends with canonical target `M`, migration
record Project commit `e0506f30c399819305c5aa94e85acce407e738ca`, all AC1–AC6
checks green, and only the separately authorized completion-state publication
remaining in this commit.
