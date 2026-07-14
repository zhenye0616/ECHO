# Independent AC8 review — echo-loop local source extraction (item 134)

**Verdict: REJECT**

## Reviewer identity and independence

- **Reviewer:** `codex-ops` binding, this content-only review session, completed `2026-07-14T08:24:19Z`.
- **Independence:** This reviewer is not builder `fable-builder-134`, did not create or modify the target, and is independent of the neutral reviewer-side executor.
- **Option B split:** A neutral executor ran the deterministic reviewer-side commands and captured evidence; this `codex-ops` session independently inspected the raw evidence and accepted target and authored the judgment; the orchestrating wrapper owns publication of this review record.
- The executor, verdict author, and builder are three distinct parties. No builder self-certification occurred.
- This session performed only read-only inspection. It made no file writes, Git mutations, commits, or pushes.

## Bound inputs

| Binding | Value |
|---|---|
| Item | `2026-07-13-134-local-echo-loop-source-extraction` |
| Sealed item path | `backlog/pending_review/2026-07-13-134-local-echo-loop-source-extraction.md` |
| Sealed item blob / bytes | Git blob `d63de36258a58e041590e1234140a1e57d625df5`; 26,041 bytes; SHA-256 `1e6e98b96e479216249fb9ee106d1479a3c1e14319d1d0bc83374d707297fd6f` |
| Pending-review handoff / spec commit | `6be9db11329c47e0cf46e34aa7897418c2abefaf` |
| `ready_content_sha` | `135bab0fd87554cc4ff3c052764d98b90debded4056ed8532c2cac0b9ebcb086` |
| Requested reviewers | `["codex", "codex-ops"]`; this reviewer is a roster member |
| Builder | `fable-builder-134` |
| Immutable builder feature head | `1519a18ed4f1c05344a1ddbd7f102779c8553843` |
| Migration record | `raw/internal/migrations/2026-07-13-134-echo-loop.md` at the immutable builder head |
| Migration-record blob / bytes | Git blob `b400f4b179dec554e37a022929e1772816c61fd2`; 4,589 bytes; SHA-256 `5dee530b8634abe4630d2be2c2d4d4474678f9f4008173c75b80052f9c1bcb3e` |
| Pinned source | `Project_echo@2971310441b69735cbe759293abd8c4d044bf347` |
| Accepted target path / branch | `/Users/zhenye/Desktop/echo-loop`; `migration/2026-07-13-134` |
| Accepted target HEAD | `8ad7c873d831153ddc25772640720895820515f8` |
| Accepted target tree | `1a6043d16aa21009f7e36909f25faad55fbdc850` |
| Target history | 13 commits; one branch; no remote |
| Sealed source policy | Project_echo blob `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a`; SHA-256 `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a` |
| Target policy copy | Same Git blob OID and SHA-256; byte-identical to the sealed Project_echo object |
| Target authority / installation / maturity | `authority:false`; `installed:false`; local `DEV` candidate only |
| Executor evidence session | `f96bfcee-3199-472c-adf2-9b7367d03b4d` |
| R1 summary | `R1-SUMMARY.json`; 13,303 bytes; SHA-256 `7a298a25b3253b0f45b433a0628401c02ac0d62acae39f8b1e3bf61a00ac453b` |
| Review request | `codex-ops-judgment-prompt.md`; 2,982 bytes; SHA-256 `4830509001591043b4f223c562182510def6c7dd6dcf5fd3f4017b59c375917c` |

## Command and result review

| Evidence step | Executor result | Independent reviewer determination |
|---|---|---|
| `00-environment` | Environment captured | Git 2.37.3, Node 22.22.1, npm 10.9.4, pinned Node headers, sandbox-exec, and target presence recorded coherently. |
| `01-preaudit-a` | `PASS` | HEAD/tree/branch match; 13 commits; one branch; no remote; relevant repository configuration is fail-closed. |
| `02-preaudit-b` | `PASS` | 222 objects equal 222 reachable objects; no missing or unreachable objects; `fsck --full --strict` exits 0; no alternates, promisor, replace, or shallow state. |
| `03-preaudit-c` | `PASS` | All 155 tracked paths exist and tracked status is clean. Seven ignored entries exist: `.DS_Store`, four `.verify-*` directories, `dist`, and `node_modules`. |
| `04-source-object-policy` | `PASS` | Sealed policy type, OID, SHA-256, target OID, and byte identity reproduce exactly. |
| `05-provenance-hashes` | `PASS` | Provenance, package, and lock hashes reproduce. |
| `06-ported-spotcheck` | `PASS` | Nine sampled source/target paths are OID-equal. |
| `07-ported-fullset` | `PASS with accounting correction` | Raw evidence reports 75/75. The committed source seed declares 76 port paths; an independent manifest-driven comparison proves 76/76 OID-equal, with zero missing or differing. |
| `08-env-capability` | `PARTIAL harness result` | Sandbox and outside-sandbox DNS availability were demonstrated. The initial direct TCP capability probe was inconclusive because the harness lacked `timeout`; step 11 supplies direct-IP denial evidence. |
| `09-private-clone` | `PASS` | Config-free `--no-local --no-hardlinks --no-checkout` clone, detached accepted-OID checkout, origin removal, no alternate/promisor/replace/shallow state, and fsck exit 0. |
| `10-dual-route` | `DISCARDED harness failure` | The executor installed from the wrong working directory. Both routes failed and produced equal but unbound inner hashes. This run is not acceptance evidence. |
| `10b-install` | `PASS` | Corrected clone-local `npm ci` installed the lock closure with lifecycle scripts disabled. |
| `10c-dual-route` | `HASH PASS / CONTRACT FAIL` | Both eight-row routes exit 0; inner projections are byte-identical and match `ea6d1112…`. The committed roster omits sealed AC7-required test rows, and the npm route record does not retain its outer npm launcher/banner. |
| `11-offline-matrix` | `PASS with harness note` | Private clone, offline install, named better-sqlite3 rebuild, and native load pass. DNS returns `ENOTFOUND` and direct-IP connect returns `EPERM` under deny-network. The loopback listener’s `EPERM` is a harness-choice limitation, not a target defect. |
| `12-full-tests` | `EXECUTION PASS / CONTRACT INCOMPLETE` | Aggregate `npm test` passes 14 files and 61 tests. The required task-state, review-queue, and source-seed fixture suites are absent from that set. |
| `13-edge-and-tests` | `PASS with reporter correction` | Fixed point matches and the accepted edge record contains 78 rows. Raw `edge count: 0` queried the wrong field. Enumeration confirms only 14 tracked test files. |
| `14-named-suites` | `FAIL` | `test:task-state` and `test:review-queue` each report “No test files found, exiting with code 1.” The custom `exit=` fields are blank due to an evidence-logger defect, but the Vitest diagnostic and accepted tree/config establish failure. |
| `15-postaudit` | `PASS` | HEAD, tree, branch, 222-object set, fsck result, and tracked cleanliness are unchanged from the pre-audit. |
| `R1-SUMMARY` | Evidence-only overall `PASS with FINDING` | Core hash, byte-identity, offline, and invariance claims are coherent after the two accounting corrections. Its overall acceptance implication is rejected because required tests and AC7 workload rows are missing. |

## Bound-hash comparison

| Bound value | Migration record | Reviewer reproduction | Result |
|---|---|---|---|
| Sealed-policy blob OID | `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a` | `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a` | Match |
| Sealed-policy SHA-256 | `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a` | `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a` | Match |
| Target HEAD | `8ad7c873d831153ddc25772640720895820515f8` | `8ad7c873d831153ddc25772640720895820515f8` | Match |
| Target tree | `1a6043d16aa21009f7e36909f25faad55fbdc850` | `1a6043d16aa21009f7e36909f25faad55fbdc850` | Match |
| Source-seed blob OID | `5278839736a53a82bfce884ea16eac0b254437ed` | `5278839736a53a82bfce884ea16eac0b254437ed` | Match |
| Source-seed SHA-256 | `c6121b5092de071efebe1cd8a0c9f6cccbe3364f6edb3edd4548cf97618dd41a` | `c6121b5092de071efebe1cd8a0c9f6cccbe3364f6edb3edd4548cf97618dd41a` | Match |
| Edge-record fixed point | `9044a61cde6ccf63031e5f88a7004bd7cdeb41c88bc28d51f3950c17393dda5f` | `9044a61cde6ccf63031e5f88a7004bd7cdeb41c88bc28d51f3950c17393dda5f` | Match |
| Watcher-project SHA-256 | `2efa5f264a76b3326a7e783bc7ec2cde6dab70c257f8a86a7f1f354b005bd302` | `2efa5f264a76b3326a7e783bc7ec2cde6dab70c257f8a86a7f1f354b005bd302` | Match |
| Verification-workload SHA-256 | `723a9bfc084ee96bcdce3c95438d506e824ea88b5149df85449e2ddeff130665` | `723a9bfc084ee96bcdce3c95438d506e824ea88b5149df85449e2ddeff130665` | Match |
| `package.json` SHA-256 | `c1ec2d0e0e02a16ca24b4fbc45e249442b4cc136073f276df12748651c6616b7` | `c1ec2d0e0e02a16ca24b4fbc45e249442b4cc136073f276df12748651c6616b7` | Match |
| `package-lock.json` SHA-256 | `74c56cce3e6703137a1b0ba4b97bd5c6fa087a192fb28c7af795ac89e0a195ea` | `74c56cce3e6703137a1b0ba4b97bd5c6fa087a192fb28c7af795ac89e0a195ea` | Match |
| Dual-route inner-result SHA-256 | `ea6d1112c8f06b579cc9022dc2a82e70466b5725df5184f520928215abaca02a` | `ea6d1112c8f06b579cc9022dc2a82e70466b5725df5184f520928215abaca02a` | Match |

All 12 bound values reproduce. Direct and npm `inner.json` files both hash to the bound value and compare byte-for-byte equal. This proves identity of the committed eight-row workload result; it does not prove that the workload satisfies sealed AC7.

The Project_echo policy object and target policy blob are byte-identical. The actual port set is 76/76 OID-equal, not the executor’s reported 75/75. Shared-target pre/post state is invariant: the same HEAD, tree, branch, 222-object reachable set, clean tracked status, and fsck result remain after review.

## Findings and dispositions

### F1 — HIGH — Required task-state and review-queue suites are absent and their scripts fail

**Disposition: acceptance-blocking.**

Accepted `package.json:22-23` defines `test:task-state` and `test:review-queue`, but the accepted tree contains only `tests/task-state/anchors-fixtures.json` and `tests/review-queue/fixtures/mock-claude.sh`. No `*.test.ts` exists under either suite, and `vitest.config.ts` does not enable `passWithNoTests`. Both commands therefore report no tests and exit with code 1.

This is not merely a named-script ergonomics issue. The sealed `## Tests` section requires substantive task-state and review-queue suites, AC5 requires their behavioral coverage, and AC7 requires both verification routes to run them. The migration record’s 61-test accounting—coord 28, watcher 21, workflows 4, migration 8—omits both while claiming AC1–AC7 complete.

The executor’s “outside mandated rerun scope” characterization does not limit the acceptance judgment. A reviewer may discover an acceptance failure outside the minimum rerun list, and here the failure also intersects AC7 directly.

### F2 — HIGH — The bound dual-route verifier omits mandatory AC7 checks

**Disposition: acceptance-blocking.**

Accepted `provenance/verification-workload.v1.json:3-12` deliberately contains only provenance, dependencies, skills, source-plan, lint, typecheck, fsck, and diff-tree. It omits task-state, review queue, coord, workflows, full tests, and source-independence, all of which sealed AC7 requires both routes to run.

Running `npm test` and source-independence separately does not satisfy the dual-route contract. The matching `ea6d1112…` hash is cryptographically coherent for a strict subset and cannot cure the missing roster. The implementation must either provide a non-recursive compliant workload or receive an explicit founder-approved spec amendment, then regenerate the target and all affected bindings.

### F3 — HIGH — The required independent source-seed fixture is absent

**Disposition: acceptance-blocking.**

The sealed Tests section names `tests/migration/source-seed-fixture.test.ts`, and AC2 requires independent fixtures containing expected seed bytes rather than using the resolver under test. That file is absent from the accepted tree and from the 14-file, 61-test run.

Without this fixture, the raw-object seed expansion lacks the specified independent oracle. Fixed-point self-consistency and port OID equality do not replace that requirement.

### F4 — HIGH — AC5-mandated recovery fixtures remain unwritten

**Disposition: acceptance-blocking.**

The migration record claims “AC5 DONE (core)” while its disclosed residuals admit that explicit crash-before/after-push, `git gc --prune=now` anchor-survival, both-watcher-orders, and mismatched-digest-after-transition fixtures were not written. Builder notes also disclose the own-process-group isolation gap.

These are mandatory sealed AC5 tests for a watcher authorized to perform leased remote updates, not optional refinement. No founder adjudication waives them. Implemented or serialized CAS edges alone do not prove the required crash, takeover, process-reaping, and ordering behavior.

### F5 — MEDIUM — The npm route envelope does not bind its actual outer launcher or npm banner

**Disposition: acceptance-blocking under sealed AC7.**

Accepted `tools/run-verification.mjs:101-106` records its own inner `process.argv`. Consequently, the npm route’s `route.json` records Node directly invoking `tools/run-verification.mjs`, not the actual outer Node plus `npm-cli.js run verify:extraction` launcher, and it contains no retained npm banner. The direct and npm route records differ only through route/output arguments.

The executor log happens to show the npm banner, but the versioned route artifact does not bind it. Sealed AC7 requires route envelopes to retain differing launcher argv, cwd, and npm banners separately.

### F6 — INFO — Evidence accounting contains three non-substantive reporter defects

**Disposition: correct in this review record; no independent acceptance impact.**

- Raw step 07 and `R1-SUMMARY.json` report 75/75 ported paths and describe the policy copy as a 76th port. The committed source seed instead contains 76 `dispositions.port` paths, excluding the policy copy. Independent comparison proves 76/76 OID equality.
- Raw step 13 prints `edge count: 0` because the reporter queried the wrong field. The committed record uses `rows`, whose length is 78.
- Raw step 14 leaves its custom `exit=` fields blank. Vitest’s own output states code 1, and the accepted tree/config independently establish both failures.

### F7 — INFO — Loopback-listen denial is a harness-choice limitation

**Disposition: no target defect and no reduction in the egress-denial finding.**

The executor attempted a loopback server `listen()` under a `(deny network*)` sandbox, which also denies bind/listen and returned `EPERM`. That does not provide the intended positive loopback control. It also does not undermine the separate outbound evidence: sandboxed DNS returned `ENOTFOUND`, direct-IP TCP connect returned `EPERM`, and the target’s own verifier uses outbound connect rather than a listener. The offline install/rebuild/load matrix remains valid.

### F8 — INFO — Child-commit publication remains wrapper-owned

**Disposition: no reviewer or executor defect under Option B.**

This content-only reviewer correctly did not create a detached worktree, child commit, or push. The orchestrating wrapper must preserve the original AC8 sole-parent, one-path tree delta, expected-old lease, literal endpoint, strict probe, and no-mutation requirements when publishing this rejection record. Publication does not convert the verdict into acceptance.

## Final verdict

**Verdict: REJECT.**

The 12 bound values, sealed-policy byte identity, actual 76/76 port identity, dual-route inner byte equality, offline matrix, and shared-target pre/post invariance are coherent. They prove the identity and stability of the examined candidate.

They do not satisfy the sealed acceptance contract. Required test suites are absent, two required scripts fail, the dual-route workload omits mandatory AC7 checks, the independent source-seed fixture is missing, mandatory AC5 recovery fixtures remain unwritten, and the npm route envelope is incomplete.

The local DEV split is therefore rejected. The target remains `authority:false`, `installed:false`, and at `DEV`, with no maturity advancement. This review does not authorize installation, cutover, a remote, release, or transfer of authority from Project_echo.