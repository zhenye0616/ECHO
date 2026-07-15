# Independent AC8 fifth judgment — echo-loop local source extraction (item 134)

**Verdict: REJECT — redo before merge.**

The fourth-review remediation closes the four findings it explicitly names:
the edge record now validates against its exact Draft-07 schema, the six
source-plan extraction/context cases fail closed, takeover evidence is written
in the takeover CAS, and every database mutation of an APPLYING row is
owner-token fenced. The exact hashes, 153-test suite, offline native install,
source-independence check, and dual-route inner result all reproduce.

The candidate remains acceptance-blocked by two independently observed
residuals. First, watcher ownership is checked before each transport spawn but
is not atomically coupled to child creation. A lease takeover can therefore
commit no-prior-identity evidence while the old owner is paused between its
check and spawn; that old owner can resume and start a late probe or push which
the successor never saw or reaped. Second, the accepted repository tracks two
Python bytecode-cache files which the normal review-queue tests rewrite, while
the 14-row verifier checks `git diff-tree HEAD` rather than post-workload
working-tree cleanliness and false-greens the mutation.

This is a local `DEV` judgment only:

- `authority: false`
- `installed: false`
- maturity remains `DEV`

## Reviewer identity and independence

- Reviewer binding/session: fresh independent `codex-ops` reviewer
  `/root/fresh_review_134_r4`, completed 2026-07-14 PDT.
- Builder binding/session: `fable-builder-134b` via
  `/root/remediate_134_r4`; this reviewer did not build the target or reuse the
  builder's verdict.
- Fresh-eyes discipline: no file under
  `backlog/task-state/2026-07-13-134-local-echo-loop-source-extraction/` was
  read or written.
- No ECHO MCP call was made.
- Shared main, shared feature worktree, and accepted target remained read-only.
  Installs, generated verifier outputs, and fixture repositories lived only
  under `/tmp/echo134-fresh-review.tPEPgF/` or test-owned system scratch.
- Publication uses a detached child whose sole parent is the immutable builder
  head and whose only changed path is this review record. The child OID is
  learned from the literal remote ref after publication, never embedded in its
  own tree.

## Bound inputs

| Binding | Value |
|---|---|
| Item | `2026-07-13-134-local-echo-loop-source-extraction` |
| Pending-review handoff / spec commit | `7f0f0911e8c54d21504f4eb7b4b29934e7b6cd8c` |
| Item blob / bytes / SHA-256 | `51fcfcddce3a0add5fdc0501d374874e2c83726e`; 28,543 bytes; `f684b85c3fe73dfae8ce092ae086a3897e54939e23a0e0ed82ec45527e2ace0d` |
| `ready_content_sha` | `135bab0fd87554cc4ff3c052764d98b90debded4056ed8532c2cac0b9ebcb086` |
| Requested reviewers | `["codex", "codex-ops"]`; this binding is requested |
| Immutable builder head | `ed41a6685848a0dc6f04d558e00e3c426a9b3166` |
| Builder parent / shape | sole parent `fe26a78f89d130364af5b2207e7b07b41eecb78b`; migration-record-only delta |
| Migration record blob / bytes / SHA-256 | `275d500416f15c6d01385923e990c254bcdea4b9`; 12,761 bytes; `ade1111973a9d6734444729be59305377bb39957cdb0f420227499e1a4265cae` |
| Publication endpoint / full ref | `https://github.com/zhenye0616/ECHO.git`; `refs/heads/agent/134-echo-loop` |
| Expected-old publication OID | `ed41a6685848a0dc6f04d558e00e3c426a9b3166` |
| Target path / branch | `/Users/zhenye/Desktop/echo-loop`; `migration/2026-07-13-134` |
| Target HEAD / tree | `38989db78e221a7e15b2adbe859fa76244bf16e4`; `76a7bc47a9aaf0196d2a43497d01460b0df86847` |
| Pinned source | `Project_echo@2971310441b69735cbe759293abd8c4d044bf347` |

The shared-repository config preflight found no active
`url.*.insteadOf`/`pushInsteadOf`, `remote.*.pushurl`, or config includes under
the config-isolated Git envelope. A strict literal `ls-remote` returned exactly
the builder OID for the full feature ref before review publication.

## Ground-truth audit

- Main and the shared feature worktree were clean at `7f0f0911…` and
  `ed41a668…` respectively.
- Builder head has exactly one parent, the immutable fourth rejection
  `fe26a78f…`; its sole path delta is
  `raw/internal/migrations/2026-07-13-134-echo-loop.md`.
- Target HEAD/tree match the binding. History is 34 linear commits, with one
  root and one local branch; all 400 objects are reachable (34 commits, 147
  trees, 219 blobs). There are no tags, remotes, alternates, promisor/partial,
  replace, graft, shallow, symlink, or gitlink states; strict full fsck passes.
- The accepted target worktree is empty even with untracked and ignored files
  requested. Its 173 tracked files exactly equal its 173 non-`.git` filesystem
  files.
- Sealed source-policy object `dd9d78ab…` is a Project_echo blob, hashes to
  `44bef194…`, and is byte-identical to the target copy.

## Acceptance status

| AC | Status | Independent evidence |
|---|---|---|
| AC1 | PASS | Exact target identity, ordinary clean/no-remote topology, object closure, modes, and strict fsck reproduced. |
| AC2 | PASS | Exact Draft-07 validation has zero errors; `--check` is non-writing/fail-closed; 604-row closure and all six former extraction/context residuals pass. |
| AC3 | PASS | Full coordination/native SQLite lifecycle and declared retry/publication fixtures pass. |
| AC4 | PASS | Provenance and source-independence checks show the intended orchestration-only boundary; no product/history drift was found. |
| AC5 | **FAIL** | Database takeover evidence and mutation fencing are fixed, but transport child creation remains outside the owner-token CAS. A stale owner can start a late push after successor takeover. |
| AC6 | PASS | Four disposable workflow-loop fixtures pass. |
| AC7 | **FAIL** | Offline install, source independence, and route-byte equivalence reproduce, but the workload rewrites two tracked `.pyc` files and the verifier's final `diff-tree` row cannot detect working-tree dirtiness. |
| AC8 | COMPLETE AS REJECTION | Exact-object independent review and immutable one-path rejection publication are performed; no installation, authority transfer, or maturity advance. |

## Reproduced bindings

| Artifact | Blob OID | SHA-256 / result |
|---|---|---|
| `source-policy.v1.json` | `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a` | `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a` |
| `edge-record.v1.json` | `02b50876b9f07c5fa4a004b68fe6816622c97fa4` | `2dbb5f13edabdac076ba4b961281f36aef3bae93d251c53fa001c439197b87c0` |
| `edge-record.v1.schema.json` | `9ed57b7a338f12a6258a4ea4fdddab7f1da78813` | `70af1779c9a864073e3690b8eb93662292d4b5d5e4c4d47480fcd9210d775c09` |
| `watcher-project.v1.json` | `af08720815120b4c40bc07ad1bf78977b1573f20` | `2efa5f264a76b3326a7e783bc7ec2cde6dab70c257f8a86a7f1f354b005bd302` |
| `verification-workload.v1.json` | `f5b632170bcd0c8b639d119124a3c962aa80ff52` | `be2d600767d88c9f4e057dc2a539ba9f5032fa40dab25495ffd4462902972a33` |
| `source-seed.v1.json` | `5278839736a53a82bfce884ea16eac0b254437ed` | `c6121b5092de071efebe1cd8a0c9f6cccbe3364f6edb3edd4548cf97618dd41a` |
| `package.json` | `afaedd015a49f98bf7bb3d154281665879f2aa10` | `c1ec2d0e0e02a16ca24b4fbc45e249442b4cc136073f276df12748651c6616b7` |
| `package-lock.json` | `b67ca3f905e5c87023198d47edaaf24f725edea2` | `74c56cce3e6703137a1b0ba4b97bd5c6fa087a192fb28c7af795ac89e0a195ea` |
| Edge fixed point | 604 rows / 9 classes / 104 source blobs / 3 manifest blobs | `b1745bfd39cd51d89b52d0e669b073643103ec597ee9c5f731d1bcb599b9cb5a` |
| Direct/npm inner result | 14/14 rows status 0 in each route; byte-identical | `e21c1d0fb2f4afcbe88b27d4fd7988cb7f180c9b72a18936ca4ea98c7d81d0ef` |

The direct/npm inner result exactly matches the builder binding under this
reviewer's distinct scratch clone and environment. Route records differ by
design and bind the npm outer launcher/banner.

## Prior-blocker closure

### D1 — CLOSED — exact Draft-07 validation is now real and fail-closed

The schema declares `policy_sha256`, `source_blobs`, `manifest_blobs`, and every
row's `from_blob`, with closed enums and resolution-kind constraints. Direct
`Draft7Validator.check_schema` plus validation of the exact HEAD value reports
zero errors. `build-source-plan --check` validates both generated and committed
values before fixed-point and byte comparison; two consecutive invocations are
stable and non-writing. The rejecting-schema and structurally-invalid-schema
regressions pass.

### D2 — CLOSED — the six source-plan extraction/context residuals reject

The lexical scanner now scans executable test bodies while treating fixture
strings/comments as tokens, rejects `process.env`/member command expressions,
recognizes `/src/...` as repository-capable, tracks function parameters and
reassignment, and binds one source-specific tsconfig variant while rejecting
equal-depth competitors. The exact source-plan suite passes 46/46, including
all six former adversarial cases, and the exact committed closure has 604 rows.

### C1 — CLOSED AS WRITTEN — takeover CAS carries prior identity and evidence

`WatcherStore.takeover` validates prior-PGID evidence and writes
`prior_owner_pgid` plus `takeover_evidence` in the same conditional SQL update
which installs the successor. The crash-immediately-after-CAS reopen fixture
observes both fields durably. There is no longer a second evidence write needed
to make that takeover record complete.

### C2 — CLOSED — every APPLYING database mutation is owner-token fenced

Recovery, APPLIED, escalation, retry/failure accounting, PGID, and termination
evidence updates all predicate on `state='APPLYING' AND owner_token=?`.
Non-applying escalation is limited to PREPARED/APPROVED. The stale-owner fixture
proves the old token cannot change state, counters, evidence, or terminal fields
after takeover.

## Acceptance-blocking findings

### C3 — HIGH — owner fencing does not cover transport child creation

The watcher checks ownership and then spawns separately:

- `src/watcher/apply.ts:202-220` reads the row/checks ownership, then starts the
  pre-push probe;
- `src/watcher/apply.ts:241-245` checks ownership, then starts the push;
- `src/watcher/apply.ts:246-252` records the push child/checks ownership, then
  starts the post-push probe.

Meanwhile takeover reads `owner_pgid` or the PGID file at
`src/watcher/apply.ts:125-150` and commits the successor at lines 151-165. The
child shim does not write its PGID until after process creation
(`src/watcher/reaper.ts:96-100`). Therefore this valid interleaving remains:

1. the old owner passes an ownership check and is paused before spawn after its
   lease has expired;
2. the successor sees no old PGID/file, commits `no_prior_identity` evidence,
   and takes ownership;
3. the old owner resumes and starts the probe or exact-lease push. Its later
   owner-guarded database write loses, but the external operation already ran,
   and its late PGID was not part of the successor's evidence or reap.

The exact expected-old server lease protects against overwriting an unrelated
OID, but it does not satisfy AC5's stronger guarantee that all old-owner
probe/push groups are known and reaped before takeover or that one owner alone
may initiate transport. The current crash and stale-mutation fixtures begin
with either a known PGID or no later-resuming owner, so all 28 watcher tests
pass without exercising this check/use window.

### V1 — HIGH — verification false-greens tracked bytecode mutation

The accepted tree tracks:

- `tools/review-queue/__pycache__/_lib.cpython-310.pyc`
- `tools/review-queue/__pycache__/_reviewers.cpython-310.pyc`

In a fresh clean private clone, the exact command
`vitest run tests/review-queue` passes 9/9 and rewrites both tracked files
(4,750→4,766 bytes and 4,548→4,564 bytes). The full 153-test run and both
14-row verification routes reproduce the same tracked dirty state. The final
workload row runs `git diff-tree --no-commit-id --name-only -r HEAD`, which
describes the HEAD commit and cannot detect working-tree changes. The route
therefore reports `verdict=pass` even though its own workload mutated accepted
tracked bytes. This undercuts the clean, source-independent verification
contract and leaves path/interpreter-specific generated artifacts in the
ordinary source repository.

## Design-choice judgments

- **Stand:** exact Draft-07 validation before comparison/write, the lexical
  fail-closed scanner, source-specific tsconfig selection, and source/manifest
  blob fixed-point binding are appropriate and now reproduce.
- **Stand:** atomic takeover evidence and owner-token predicates on every state
  mutation are the correct database design.
- **Change:** process creation needs an owner-aware launch barrier, not merely a
  check immediately before `spawnSync`. A child must publish identity before
  transport and proceed only after its still-current owner is confirmed, while
  takeover must either revoke that launch or observe and reap it.
- **Change:** generated Python bytecode must not be tracked, and the verifier
  must assert post-workload tracked cleanliness rather than using `diff-tree`
  as a working-tree proxy.

## Drift and merge preview

- No product/context/history, installation, remote, authority, or maturity
  drift was observed. The standalone loop remains an internal local `DEV`
  asset and Project_echo remains authoritative.
- Feature merge base against current main is
  `84c15504a55d65c093a845b335748f2c58250dd1`. Relative to that base, the feature
  adds only the migration record and this review record. Current main changes
  neither path; classic `merge-tree` reports no conflict markers or
  changed-in-both path.
- This clean textual preview is not merge approval. The acceptance blockers
  require a new target and builder head before merge.

## Suggested fixups

1. Introduce a launch protocol which closes the owner-check-to-child-spawn
   window for pre-probe, push, and post-probe. Add deterministic fixtures that
   pause the old owner after each ownership check, perform an expired-lease
   takeover, resume the old owner, and assert no old transport starts and the
   remote remains successor-controlled.
2. Remove tracked `__pycache__`/`*.pyc` artifacts, ignore them, and run Python
   consumers with bytecode writes disabled or redirected. Add a final verifier
   row which fails on tracked/staged/unmerged worktree changes after every
   workload row has run.
3. Regenerate the source inventory/closure and migration bindings at a new
   target HEAD/tree, publish a new migration-record-only builder head on top of
   this rejection child, and request a fresh independent review. Do not install
   or advance authority/maturity.

## Test counts observed

- Full target suite: **22/22 files; 153/153 tests passed** in 219.12s.
- Source-plan focused suite: **46/46 passed**; independent exact Draft-07
  validation: **0 errors**.
- Watcher focused suites: **4/4 files; 28/28 passed** (containment 10, state 7,
  recovery 6, apply 5).
- Review queue focused rerun: **3/3 files; 9/9 passed**, while reproducing the
  two tracked `.pyc` modifications.
- Workflow loop: **4/4 passed**; source independence: **1/1 passed**.
- Typecheck, lint (43 files), provenance (76/148 byte-identical ports),
  dependencies (5 declared / 132 locked), skills (13), source-plan `--check`
  twice, strict full fsck, and object/topology checks: pass.
- Offline reviewer lifecycle: clean private clone, isolated offline
  `npm ci --ignore-scripts`, named offline `better-sqlite3` rebuild, and native
  in-memory SQLite smoke: pass.
- Direct/npm routes: **14/14 rows status 0 in each route**; inner bytes equal;
  SHA-256 `e21c1d0f…` reproduced. The green result is insufficient because its
  workload leaves tracked files dirty and does not check that state.

## Final verdict

**REJECT — redo before merge.** The fourth-review findings are genuinely
closed, but AC5 still permits a late old-owner transport child after takeover,
and AC7 false-greens tracked bytecode mutation. The target remains unaccepted,
`authority:false`, `installed:false`, and `DEV`; Project_echo remains the
active authority.
