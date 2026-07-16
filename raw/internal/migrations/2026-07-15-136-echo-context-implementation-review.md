# Independent implementation review — echo-context canonical source (item 136)

`verdict: merge_ready`

The exact successor candidate below satisfies the reviewed source-only item-136
contract. All prior implementation findings are closed, both the builder and a
different reviewer completed the required clean-clone acceptance at the same
target head, and this review found zero HIGH and zero MEDIUM findings.

This verdict is only an independent implementation-review result. It does not
perform or authorize an unrecorded write. The coordinator must still commit,
push, and read back these exact review-record bytes on Project_echo main before
constructing the separately recorded target-main landing authorization. No tag,
GitHub Release, hosted artifact, install, live-state mutation, client change,
runtime/state authority transfer, or maturity advance is approved here.

## Reviewer identity and independence

- Item: `2026-07-15-136-echo-context-canonical-repository-release-substrate`.
- Builder actor ID: `codex-136-cycle3-builder-mendel-222cc09b`.
- Builder run ID: `cycle3-mendel-222cc09b-20260716T184207Z`.
- Reviewer actor ID: `codex-136-final-reviewer-b9e01c42`.
- Reviewer run ID: `codex-136-final-rereview-20260716T192413Z`.
- Recomputed identity checks:
  `codex-136-cycle3-builder-mendel-222cc09b != codex-136-final-reviewer-b9e01c42`
  and
  `cycle3-mendel-222cc09b-20260716T184207Z != codex-136-final-rereview-20260716T192413Z`.
- Canonical non-task-state evidence for the builder identity is present in both
  the pending-review item and the item run log at Project_echo main head `MH`
  below. The reviewer did not read or write any `backlog/task-state/**` pointer.
- The reviewer used new config-isolated clones, separate temporary mode-0700
  homes, and a separately installed digest-pinned scanner. No shared builder
  worktree was used for acceptance.
- No ECHO MCP call was made. No target-main write, Project feature merge,
  release, install, daemon operation, live database access, or authority
  transfer was performed by this review.

## Immutable bindings

- Reviewed spec commit: `f80003a7fbd08755dbff669951ed07bf43b390d0`.
- Normalized ready seal recomputed from the spec at that commit:
  `a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca`.
- Frozen target baseline `B` / tree:
  `0cf7b006eba665c0bf55e82ff04da70f19f01ebb` /
  `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`.
- Prior rejected target head / tree:
  `02af4e411077063d2cf5d4931bd3e9c1c0f0a5c7` /
  `bc8b700fe5db3435d54a930a71d0c5455b85541b`.
- Reviewed target feature head `H` / tree:
  `ad370ae0a666f366e1ff93c9ec5b920763e9cbb8` /
  `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`.
- Builder Project evidence head `PH` / tree:
  `7f156ba44b3ff17095a55198a7463ede713f81f7` /
  `6b23ee3310c3714c1292d9dbcfa80a1c1b03e119`.
- Reviewed Project_echo main head `MH` / tree:
  `3e21634393543f31cfbaae52587191a7c1d534e3` /
  `66692a5cef1a5d7bee3424faae07423698a13973`.
- Pending-review item at `MH`, Git blob / byte SHA-256:
  `c4911c6bffe084941826791736edef47a6359a05` /
  `3fad187e1b2a2bbdc2e8636703287efd1f4cce7ffa3906110bbf473a97935fee`.
- Item run log at `MH`, Git blob / byte SHA-256:
  `90d288674c0e1012aef49d193b0a9cb3dd8a6bda` /
  `28e04b898c07b3fa2fda11eb1b75331c23f7458a58a48dce07944855e4969f1b`.
- Pinned Project_echo source replay commit:
  `2971310441b69735cbe759293abd8c4d044bf347`.
- Canonical target remote: `https://github.com/zhenye0616/echo-context.git`.

Authenticated readback during this review returned exact user login
`zhenye0616`, repository ID `1302541575`, node ID `R_kgDOTaM1Bw`, full name
`zhenye0616/echo-context`, `private=true`, and default branch `main`. The exact
four advertised refs were:

```text
032921cf3be7d0dd310db13df337d6237a35c37d refs/pull/1/merge
0cf7b006eba665c0bf55e82ff04da70f19f01ebb refs/heads/main
ad370ae0a666f366e1ff93c9ec5b920763e9cbb8 refs/heads/agent/echo-context-canonical-repository-release-substrate
ad370ae0a666f366e1ff93c9ec5b920763e9cbb8 refs/pull/1/head
```

Project_echo canonical readback returned feature ref `PH` and main ref `MH`
exactly.

## Builder acceptance result

The immutable `MH` run-log evidence records the builder's complete exact-head
rerun at `H`:

- AC3 focus: 49 passed / 49.
- Typecheck and lint: passed.
- Runtime inventory: `340 packages, 23 sources`; repository authority: passed
  at exact `H`.
- Full CI: 78 files passed; 1,086 tests passed; 17 intentionally skipped; zero
  failed.
- Operator replay: 2 passed / 2 against explicit Project source commit
  `2971310441b69735cbe759293abd8c4d044bf347`.
- Complete-ref secret scan: four advertised refs; full reachable history; zero
  findings.
- A fresh `--no-local --no-hardlinks` acceptance and a second literal canonical
  HTTPS acceptance both returned `fresh-clone acceptance OK`, exact `H`/tree,
  clean status, and no surviving owned temporary root.
- Remote feature and pull-request-head readback returned exact `H`; target main
  remained exact `B`.

The builder acceptance invocation was source mode with immutable SHA `H` and
these recorded toolchain identities:

```text
NODE = /usr/local/Cellar/node@22/22.22.1_1/bin/node (v22.22.1)
NPM  = /usr/local/Cellar/node@22/22.22.1_1/lib/node_modules/npm/bin/npm-cli.js (10.9.4)
GIT  = /usr/local/Cellar/git/2.37.3/bin/git (git version 2.37.3)
ARGS = --mode=source --source-sha ad370ae0a666f366e1ff93c9ec5b920763e9cbb8
```

The builder's provisioned Gitleaks executable was v8.30.1, regular,
nonsymlink, under a mode-0700 temporary home, with SHA-256
`cee01fea7173f1b779dff188e1c26ecbcb4027d394acc573b23aaf0be260e291`,
matching the committed Darwin x64 contract.

## Independent reviewer acceptance result

The reviewer cloned the literal canonical HTTPS remote twice with system/global
Git config disabled and `--no-local --no-hardlinks`, detached both clones at
exact `H`, captured all four advertised refs before acceptance, and used two
separate mode-0700 homes:

```text
clone 1 = /private/tmp/echo136-c3-review-https.EmEmN6/clone1
HOME 1  = /private/tmp/echo136-c3-review-home1.vHtk7w
clone 2 = /private/tmp/echo136-c3-review-https.EmEmN6/clone2
HOME 2  = /private/tmp/echo136-c3-review-home2.8sAKj3
```

Each clone invoked its canonical absolute
`tools/fresh-clone-acceptance.sh` from its physical clone root with the same
exact Node/npm/Git paths and versions shown above, its own sandbox home, and:

```text
--mode=source --source-sha ad370ae0a666f366e1ff93c9ec5b920763e9cbb8
```

Both independent invocations returned exactly `fresh-clone acceptance OK`.
After each run, readback proved exact `H`/tree, empty porcelain, clean
`git fsck --full`, no acceptance `run-*` root, no alternates, no multiply linked
object files, and unchanged exhaustive ref snapshots. Both homes contained the
same reviewed Gitleaks v8.30.1 binary digest
`cee01fea7173f1b779dff188e1c26ecbcb4027d394acc573b23aaf0be260e291`.

The reviewer's additional exact-head gates returned:

```text
AC3 focus   = 1 file passed; 49 passed / 49
typecheck   = passed
lint        = passed
inventory   = runtime-inventory.v2 OK: 340 packages, 23 sources
authority   = repository-authority OK at H
full CI     = 78 files passed; 1,086 passed; 17 skipped; zero failed
operator    = 1 file passed; 2 passed / 2 at pinned Project source
secret scan = 4 snapshotted source refs; full reachable history; zero findings
fsck        = passed in all fresh review clones
diff check  = passed
```

## Source artifact and provenance evidence

Two independent builds, one from each reviewer clone, consumed committed Git
objects at `H`. Their three emitted files were byte-identical, and both
`verify:artifact` invocations passed against the emitted manifest hash.

The review-only deterministic tuple at `H` is:

```text
source SHA                 = ad370ae0a666f366e1ff93c9ec5b920763e9cbb8
source tree                = 3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec
version                    = 0.1.0-dev.136.1
source-archive SHA-256     = 9bea0cddb6fb815b87d899599b99600a59be2722bd729cd31ea39fad2165de76
lock hash                  = 13ead528470d91adfc4456d349ae628f03f768ba51d78aee8d0b2c42dc12784b
manifest hash              = ee8fd23f199205505b4af3e667b555b2a9f0f2a1ab8fb7b44c65368b95cf50ad
artifact_kind              = source
installable                = false
runtime_authority          = false
state_authority            = false
maturity                   = DEV
```

This tuple is review evidence only, not the final AC6 seal. AC6 must rebuild
twice from the later literal target-main merge commit `M` after its authorized
landing.

Additional provenance checks passed:

- `B` is an ancestor of `H`; frozen baseline inventory is 190 paths.
- Immutable `provenance/runtime-inventory.v1.json` SHA-256 remains
  `29512b101dc672aec83102f147b60c04dd694b1602479024299b228becf95caf`.
- Successor `runtime-inventory.v2` regenerated byte-exact at 340 packages and
  23 executable/config sources.
- Secret-scan contract SHA-256 is the spec-bound
  `b186d99d61f774a6fbf6f16849c7aeb21618d90f79d3f7da4398d88d95925453`.
- The target `LICENSE` is byte-identical to Project_echo's reviewed MIT license.
- The `B..H` delta contains no `src/**` byte and no `.github/workflows/**`,
  hosted-operation, release-publication, install, live-state, or authority
  transfer surface. No tag was advertised.

## Prior finding dispositions

### Cycle-one hosted/release implementation: superseded and absent

The founder-locked source-only scope cut and reviewed R24 spec replaced the
cycle-one hosted/release design; this is not a waiver. The current `H` contains
no workflow, hosted gate, operation host, publication controller, tag, release,
or release script. `tests/governance/no-hosted-surface.test.ts` and the full tree
audit pass.

### Earlier cycle-two process/ref/cleanup findings: closed

The earlier positive-PID process-group lifecycle hole, pre-spawn/no-PID seam,
repeated-signal behavior, exhaustive remote-ref snapshot, cleanup ownership,
and bootstrap porcelain grammar are covered by the current production state
machine and committed negative fixtures. The current focused suite is 49/49,
both literal acceptance runs pass, all four advertised refs are snapshotted,
and no child group or owned root survives.

The R24 contract truthfully treats a non-returning synchronous kernel call as a
pending invocation rather than claiming abortability or a hard process-exit
bound. Every returning verifier-local synchronous filesystem call is bounded
fail-closed, and no external supervisor or extra production child was added.

### R24-F1 — late terminal-proof acceptance: closed

`outcomeAt` is now assigned only after the complete terminal predicate and any
already-started TERM/five-second/conditional-KILL ceremony finish. A separate
production-handle matrix proves spawned and asynchronous no-PID terminal shapes
at exactly 30,000 ms versus 30,001 ms, while committed cases cover a surviving
PGID. Exact-boundary terminal proof is accepted; the one-millisecond-late case
is rejected. The preserved reproducer SHA-256
`636dfb61badab446d49e7cdc6d89ad89b3abfa21c605aef6aa6388ca303120e0`
now returns `accepted:false`, `outcomeAt:30001`.

### R24-F2 — non-monotonic production deadline accounting: closed

Production uses `performance.now()` through one regression-checking monotonic
clock for deadline arithmetic. Non-finite or backward injected readings fail
closed and cannot extend a budget. The preserved reproducer SHA-256
`799dc1796a359cc7b8ffb6a478ddac8d9bd4ad38d501d0f7e0caf339ea4f2120`
now rejects with `fresh-clone-verifier: monotonic clock regressed` even while
the wall clock moves backward.

### R24-F3 — grouped synchronous-filesystem checks: closed

Every verifier-local `realpath`, `lstat`, `access`, `mkdir`, `mkdtemp`, and
`chmod` operation is checked immediately before and immediately after control
returns. A late call blocks the next operation. `mkdtempSync` records the owned
root before its post-return check, allowing exactly one cleanup transition and
one absence readback with no later setup mutation. The preserved reproducer
SHA-256
`67a4e3ea325456c802272352ad972fc5ebd1d13282fdf53386ac8cda8a9c7b85`
now records only the late `mkdirSync` and reports
`laterMutationAfterLateMkdir:false`. An additional seven-stage matrix passed at
each synchronous setup seam.

No prior finding remains open, and this re-review found no new HIGH or MEDIUM
finding.

## Merge previews and Project evidence disposition

- Target preview: `/usr/bin/git merge-tree --write-tree B H` exited zero,
  produced exact `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`, and reported no
  conflict. The preview tree equals `H^{tree}` exactly.
- Project evidence: `PH` is intentionally not an ancestor of `MH`; both descend
  from the completed baseline-publication history. `PH` contributes only the
  run log outside the excluded task-state pointer. `MH` already contains the
  complete Run-3 builder completion payload plus additive exact `PH`/tree and
  remote-readback bindings, as well as the pending-review handoff and generated
  index.
- A direct `MH`/`PH` merge preview reports the expected add/add coordination
  conflict in the run log (and the excluded task-state pointer). Merging `PH`
  would reintroduce stale/divergent coordination history and is neither needed
  nor approved. The correct disposition is **no Project feature merge**. The
  reviewer-owned record is a new one-path child of current `MH`.
- Project_echo and target fresh clones both pass `git fsck --full` and are clean.

## Final verdict and authority boundary

`verdict: merge_ready`

The implementation at exact `H` is ready for the coordinator's recorded
landing sequence with no pre-merge code fixup. This record approves repository
merge readiness only after these exact bytes are committed, pushed, and read
back from Project_echo main.

Item 136 remains source-only and **DEV**. The target source artifact is
explicitly non-installable. `runtime_authority:false`, `state_authority:false`,
and `installed:false`; Project_echo remains the active daemon, live-state,
client-endpoint, and rollback authority. No hosted gate/release claim exists,
and no artifact byte is published or handed off by this review.
