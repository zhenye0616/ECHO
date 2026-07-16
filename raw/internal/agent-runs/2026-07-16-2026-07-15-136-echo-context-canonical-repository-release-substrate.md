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

## Cycle-two R21 source-only repair

- Builder actor: `codex-136-cycle2-builder-7f6a2d31`
- Run ID: `cycle2-7f6a2d31-20260716`
- Started: `2026-07-16T15:40:53Z`
- Finished implementation verification: `2026-07-16T16:04:04Z`
- Frozen input target head: `145868a67a85dbb651faed457ee4001370c0fad0`
- Final target feature head: `358fb4da774287b6c55d287a46d53b5aff033e87`
- Final target tree: `70c18b4c2e3f6e24b46c6cd8da56acc0eb13e76d`

The founder-directed R21 scope cut supersedes the hosted/release portions of the
cycle-one entry above. Cycle two preserved the source substrate and deterministic
source artifact, added the injected frozen bootstrap-gate model, replaced the
source/release verifier with the sole bounded source-mode fresh-clone state
machine, and deleted every GitHub Actions workflow, hosted-evidence surface,
release/publication controller, and hosted-policy test. The premature builder
bootstrap migration record was removed; AC6 permits the persistent coordinator
to create that record only after reviewed target-main landing and dual-build seal.

### Cycle-two verification

- `npm run verify:inventory` — passed; 340 packages and 22 executable/config sources.
- `npm run verify:authority` — passed at exact final target head.
- `npm run typecheck` and `npm run lint` — passed.
- `npm run test:ci` — passed; 78 files, 1,041 passed, 17 skipped, zero failed.
- Digest-pinned Gitleaks 8.30.1 top-level scan — passed against the complete local source-ref snapshot; zero findings.
- Fresh `--no-local --no-hardlinks` sibling-free clone with temporary mode-0700 HOME, pinned Node/npm/Git, pinned sandbox scanner, and no inherited ECHO state — exact canonical wrapper passed.
- `npm run test:operator` with explicit Project_echo Git dir and source SHA `2971310441b69735cbe759293abd8c4d044bf347` — passed 2/2.
- Target feature push and remote readback — exact `358fb4da774287b6c55d287a46d53b5aff033e87`.

No target-main or Project-main implementation merge/push, approval, tag,
release, hosted artifact, install, live-state access, or authority transfer was
performed. Zero ECHO MCP calls were made, so no dogfooding journal entry is owed.

---

## Cycle-two independent-review repair continuation

- Same builder actor: `codex-136-cycle2-builder-7f6a2d31`
- Repair run ID: `cycle2-7f6a2d31-20260716-repair1`
- Rejected target head: `358fb4da774287b6c55d287a46d53b5aff033e87`
- Repair implementation commit: `3cb0d54` (`fix: close fresh-clone review gaps`)
- Repaired target feature head: `1a91750e5b9ce9db49e9c893f9974b318f12f38a`
- Repaired target tree: `ed851f9deb2ba3135af5f11955d878f5d1c9c802`
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
