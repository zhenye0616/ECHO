# Independent AC8 re-review — echo-loop local source extraction (item 134)

**Verdict: REJECT**

## Reviewer identity and independence

- **Reviewer:** `codex-ops` binding, independent content-only re-review completed `2026-07-14T09:36:16Z`.
- **Independence:** This reviewer is not builder `fable-builder-134`, did not create or modify the target, and is independent of the neutral reviewer-side executor.
- **Supersession:** This judgment supersedes the prior `codex-ops` REJECT record committed at `ca82e5237d6212ae99fc9ae4ef3dd2451d760210`.
- **Option B split:** A neutral executor reran the deterministic reviewer-side commands and captured evidence; this `codex-ops` session independently inspected the raw logs, committed target, and implementation and authored the judgment; the orchestrating wrapper owns publication.
- The executor, verdict author, and builder are distinct parties. No builder self-certification occurred.
- This session performed read-only inspection only. It made no file writes, Git mutations, commits, or pushes.

## Bound inputs

| Binding | Value |
|---|---|
| Item | `2026-07-13-134-local-echo-loop-source-extraction` |
| Sealed item path | `backlog/pending_review/2026-07-13-134-local-echo-loop-source-extraction.md` |
| Sealed item blob / bytes | Git blob `54f247f7c4cd98504a104ff5d303fad2272059c2`; 26,023 bytes; SHA-256 `75f61a123674a59eba78122d3f373cc9c27303fc3691951beee9913e0faf39a2` |
| Pending-review handoff commit | `12723cd99313a1eea17c4725ec780a11b6344066` |
| `ready_content_sha` | `135bab0fd87554cc4ff3c052764d98b90debded4056ed8532c2cac0b9ebcb086` |
| Requested reviewers | `["codex", "codex-ops"]`; this reviewer is a roster member |
| Builder | `fable-builder-134` |
| Immutable fix-cycle builder head | `ee3bc0e9616a2ea9699ad673856518e8ba90744c` |
| Builder-head tree / parent | Tree `44ae68c34262a9612b2013a63f06af5b1ad87030`; sole parent `ca82e5237d6212ae99fc9ae4ef3dd2451d760210` |
| Prior REJECT record | `raw/internal/migrations/2026-07-13-134-echo-loop-review.md` at `ca82e5237d6212ae99fc9ae4ef3dd2451d760210` |
| Updated migration record | `raw/internal/migrations/2026-07-13-134-echo-loop.md` at the immutable builder head |
| Migration-record blob / bytes | Git blob `55f15e583e01204a2977246a7b60e4fa5449496e`; 5,354 bytes; SHA-256 `1589952184e4f01c6c9a7cde6d5ed2830261386e47089905d9798603c6e4e5b8` |
| Pinned source | `Project_echo@2971310441b69735cbe759293abd8c4d044bf347` |
| Accepted target path / branch | `/Users/zhenye/Desktop/echo-loop`; `migration/2026-07-13-134` |
| Accepted target HEAD | `2aeb1ede21b16d47f9d11da69f0a3cb10425ddb6` |
| Accepted target tree | `a56fe5e042fbcfa609918fe7b61c420805421880` |
| Target repository state | 14 linear commits; one branch; no remote; `git fsck --full --strict` exits 0; tracked checkout is dirty because of Finding A |
| Sealed source policy | Project_echo blob `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a`; SHA-256 `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a` |
| Target policy copy | Same Git blob OID and SHA-256; byte-identical to the sealed Project_echo object |
| Target authority / installation / maturity | `authority:false`; `installed:false`; local `DEV` candidate only |
| Executor evidence session | `f96bfcee-3199-472c-adf2-9b7367d03b4d` |
| Rerun summary | `R1-SUMMARY.json`; 17,241 bytes; SHA-256 `c3a4aa6cc5f6f4b60a6a2799d7eefe0d344d7a69061f00a6c3b759acd22b6e54` |
| Review request | `codex-ops-judgment-prompt.md`; 3,211 bytes; SHA-256 `0576ddc6c18cfb6892c0af976a92a73b3d464f9ef12854ca56850c042756fd24` |

## Rerun outcomes

| Evidence | Executor result | Independent reviewer determination |
|---|---|---|
| `00-environment` | Environment captured | Git 2.37.3, Node 22.22.1 under Rosetta, npm 10.9.4, Python/jsonschema architecture note, and sandbox tooling are coherent. |
| `01-preaudit` | `PASS with observation` | Bound HEAD/tree, 14 linear commits, one branch, no remote, 254 reachable objects, and fsck reproduce. The checkout already has tracked modification `provenance/edge-record.v1.json`; this is Finding A, not a clean accepted checkout. |
| `02-private-clone` | `PASS` | Config-free `--no-local --no-hardlinks --no-checkout` clone, detached accepted-OID checkout, origin removal, clean tree, no alternate/promisor/replace/shallow state, and fsck exit 0. |
| `03-sourceplan-behavior` | Generator exits 0 | On a pristine committed tree, `build-source-plan.mjs` changes the fixed point from committed `9044a61c…` to `4aece3d2…`, overwrites the tracked record, and still exits 0. Acceptance failure; see Finding A. |
| `04-source-object` | `PASS` | Sealed policy type, OID, SHA-256, target-copy OID, and byte identity reproduce. Other committed manifest hashes reproduce, but no checker validates the committed edge record against the current source. |
| `05-dual-route` | Equivalence pass; bound hash mismatch | Direct and npm routes each run all 14 rows with status 0 and produce byte-identical inner bytes. Scratch-envelope SHA-256 is `600f1363…`, not bound `8c81ece2…`; see Finding B. |
| `06-home-bruteforce` | Founder-HOME match found | Replacing only `workload_env.HOME` with `/Users/zhenye` reproduces bound `8c81ece2…`; scratch HOME, `/var/empty`, `/root`, `/tmp`, and empty HOME do not. |
| `07-fixclaims` | `PASS` | F1 suites pass: task-state 16 tests / 2 files and review-queue 9 tests / 3 files. F3’s independent five-path raw-object oracle exists and passes. F5’s npm route binds outer launcher, banner, and user-agent. |
| `08-suite-f4` | 97 tests / 21 files pass | Test count and the five named recovery fixtures reproduce. The process-group/takeover test does not prove the sealed termination semantics, and implementation inspection shows those semantics remain absent; see Finding C. |
| `09-offline-matrix` | `PASS` | Outbound loopback/DNS/direct-IP controls behave as expected; private clone, offline `npm ci`, named better-sqlite3 rebuild, and native load pass under deny-network. |
| `10-postaudit` | Committed state invariant | HEAD, tree, object set, no-remote state, and fsck remain unchanged. The same pre-existing tracked edge-record modification remains. |
| `R1-SUMMARY` | Evidence-only overall finding | Its raw outcomes and two reported HIGH findings reproduce. Its acceptance implication is rejected, and implementation inspection found additional sealed-contract gaps below. |

The full route roster is `provenance`, `dependencies`, `skills`, `source-plan`, `task-state`, `review-queue`, `coord`, `workflows`, `lint`, `typecheck`, `full-tests`, `source-independence`, `fsck`, and `diff-tree`. Every row reports status 0 in both routes.

## Prior F1–F5 re-disposition

| Prior finding | Re-disposition | Evidence |
|---|---|---|
| **F1 — missing task-state and review-queue suites** | **RESOLVED** | Substantive suites now exist; `test:task-state` passes 16 tests and `test:review-queue` passes 9 tests. |
| **F2 — incomplete dual-route workload** | **RESOLVED AS ORIGINALLY STATED; AC7 STILL BLOCKED** | The committed manifest now carries the complete 14-row sealed roster, recursion is broken by `vitest.workload.config.ts`, and direct/npm inner bytes are equal. Finding B independently invalidates the bound canonical hash and scratch-envelope contract. |
| **F3 — missing independent source-seed oracle** | **RESOLVED** | `tests/migration/source-seed-fixture.test.ts` contains hard-coded raw-object hashes and byte counts and does not invoke the extraction resolver. |
| **F4 — missing recovery/process-isolation proof** | **PARTIALLY RESOLVED; STILL ACCEPTANCE-BLOCKING** | The five named crash/gc/order/digest fixtures now exist and pass. The own-process-group fixture checks only elapsed time and an `unreachable` result; full-group TERM/KILL reaping, termination evidence before takeover, and other sealed watcher invariants remain unimplemented. See Finding C. |
| **F5 — npm launcher/banner not bound** | **RESOLVED** | The npm route record now retains inner and outer launcher argv, npm banner, and user-agent; the direct route retains null npm-specific fields. |

## Bound-hash comparison

| Bound value | Migration record | Reviewer reproduction | Result |
|---|---|---|---|
| Sealed-policy blob OID | `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a` | `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a` | Match |
| Sealed-policy SHA-256 | `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a` | `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a` | Match |
| Target HEAD | `2aeb1ede21b16d47f9d11da69f0a3cb10425ddb6` | `2aeb1ede21b16d47f9d11da69f0a3cb10425ddb6` | Match |
| Target tree | `a56fe5e042fbcfa609918fe7b61c420805421880` | `a56fe5e042fbcfa609918fe7b61c420805421880` | Match |
| Source-seed blob OID | `5278839736a53a82bfce884ea16eac0b254437ed` | `5278839736a53a82bfce884ea16eac0b254437ed` | Match |
| Source-seed SHA-256 | `c6121b5092de071efebe1cd8a0c9f6cccbe3364f6edb3edd4548cf97618dd41a` | `c6121b5092de071efebe1cd8a0c9f6cccbe3364f6edb3edd4548cf97618dd41a` | Match |
| Edge-record schema SHA-256 | `30d25c7fe55c27e2b79e06bbf38dbb410ab7e3ebbf3484c8ef8a408ef4429277` | `30d25c7fe55c27e2b79e06bbf38dbb410ab7e3ebbf3484c8ef8a408ef4429277` | Match |
| Watcher-project SHA-256 | `2efa5f264a76b3326a7e783bc7ec2cde6dab70c257f8a86a7f1f354b005bd302` | `2efa5f264a76b3326a7e783bc7ec2cde6dab70c257f8a86a7f1f354b005bd302` | Match |
| Verification-workload SHA-256 | `5444243de498f28da61eceda9d818c76df8410cef82366fea1e779d630af5ce2` | `5444243de498f28da61eceda9d818c76df8410cef82366fea1e779d630af5ce2` | Match |
| `package.json` SHA-256 | `c1ec2d0e0e02a16ca24b4fbc45e249442b4cc136073f276df12748651c6616b7` | `c1ec2d0e0e02a16ca24b4fbc45e249442b4cc136073f276df12748651c6616b7` | Match |
| `package-lock.json` SHA-256 | `74c56cce3e6703137a1b0ba4b97bd5c6fa087a192fb28c7af795ac89e0a195ea` | `74c56cce3e6703137a1b0ba4b97bd5c6fa087a192fb28c7af795ac89e0a195ea` | Match |
| Edge-record fixed point | `9044a61cde6ccf63031e5f88a7004bd7cdeb41c88bc28d51f3950c17393dda5f` | Current committed source generates `4aece3d23682a57e34554f2ff3e4814135a22bba5f54f82a451054faea347f15` | **Does not reproduce** |
| Dual-route inner-result SHA-256 | `8c81ece2fe3bd29ab97c50285bf51316316d8814078c1eb838f457db8c8c2377` | Scratch envelope produces `600f1363394e417372b34207c0454f421777f2d5c1a84b6527b0c88a099038e6`; bound value appears only with `HOME=/Users/zhenye` | **Does not reproduce** |

Exactly 11 of 13 bound values reproduce cleanly. The two non-reproducing rows are acceptance-critical rather than reporting defects.

## Findings and dispositions

### Finding A — HIGH — The committed edge-record fixed point is stale, and its checker self-certifies by overwriting it

**Disposition: acceptance-blocking.**

Target commit `2aeb1ede…` changed `src/watcher/gitenv.ts` from blob `0b325393e363e59630cafc0f345dca99203a1084` to `e4e9aa5c5d7d9cfcd99d46c684b7eed087419423`, but the committed edge record still references the old blob in three rows and retains fixed point `9044a61c…`.

On a pristine clone of the accepted commit, `tools/build-source-plan.mjs` deterministically produces `4aece3d2…`, unconditionally overwrites `provenance/edge-record.v1.json`, and exits 0. It never compares generated bytes with the committed artifact. `tests/migration/source-plan.test.ts` invokes the same generator and checks only the regenerated output, while `check-provenance` does not inspect the edge record.

Consequently:

- the migration record’s fixed point does not describe the accepted source tree;
- the `source-plan` workload row cannot detect committed drift in its own output;
- both verification routes report success because their row hashes bind only argv and exit status;
- the shared accepted checkout is left tracked-dirty at `provenance/edge-record.v1.json`.

This violates AC2’s final-HEAD fixed-point binding, AC7’s fail-closed verification requirement, and AC8’s clean-target handoff.

### Finding B — HIGH — The bound dual-route hash embeds the founder’s absolute HOME path

**Disposition: acceptance-blocking.**

`tools/run-verification.mjs:63-72` copies raw `process.env.HOME` into `workloadEnv`, and lines 93-103 include that raw value in the supposedly route-invariant inner projection.

Under the AC7-mandated scratch HOME/XDG/TMP envelope, both routes are byte-identical and hash to:

`600f1363394e417372b34207c0454f421777f2d5c1a84b6527b0c88a099038e6`

The migration-record value:

`8c81ece2fe3bd29ab97c50285bf51316316d8814078c1eb838f457db8c8c2377`

reproduces exactly only after substituting `HOME=/Users/zhenye`. `/var/empty`, `/root`, `/tmp`, empty HOME, and the reviewer’s scratch HOME all produce different hashes.

The F2/F5 route-equivalence repair is genuine, but the canonical inner projection is machine-user-coupled and independently unreproducible. This directly violates AC7’s normalized-root-token and scratch-envelope requirements.

### Finding C — HIGH — AC5 watcher process containment, takeover, and recovery invariants remain incomplete

**Disposition: acceptance-blocking; prior F4 remains partially open.**

Implementation inspection found several sealed operational requirements absent despite the newly named fixtures:

- `src/watcher/gitenv.ts:41-63` uses synchronous `spawnSync` with `detached:true`, a timeout, and `killSignal:'SIGKILL'`. There is no group-directed signal such as `kill(-pgid, ...)`, no TERM-then-KILL sequence, and no PID/PGID or termination evidence. Killing the group leader does not prove descendants are reaped.
- `tests/watcher/recovery.test.ts:93-101` only measures an unreachable probe’s elapsed time. It creates no descendant, checks no PGID, and proves no full-group termination.
- `src/watcher/apply.ts:84-93` performs an expired-lease SQLite takeover immediately and begins `attemptPush`; it requires no evidence that the prior owner’s probe/push group terminated. Endpoint re-probing after the CAS does not cure concurrent survival of the prior push.
- `src/watcher/candidate.ts:63-68` spreads ambient `process.env` into private-index `git add`, `write-tree`, and `commit-tree` calls, bypassing `gitEnv()`’s config-free environment.
- The APPLYING takeover path skips the APPROVED path’s approval-token and endpoint checks. Neither `row.repoIdentity` nor `row.fullRef` is compared with the sealed project’s `repository_identity` and `full_ref`.
- `next_attempt_at` is written but never enforced, repeated identical failures never escalate, and an unreachable result after an attempted push is returned to APPROVED even though AC5 requires ambiguous post-push state to escalate.
- Prepared candidate and `-base` refs are created but never deleted on terminal state.

These are runtime safety properties, not stylistic preferences. A green happy-path fixture using disposable `file://` remotes does not prove safe takeover when a real transport child or descendant survives its lease.

### Finding D — HIGH — The source-plan implementation covers only a small subset of the sealed edge model

**Disposition: acceptance-blocking.**

The sealed policy defines 14 edge classes, manifest/workspace/import-map context, resolution precedence, computed-edge rejection, unknown-edge rejection, shell/Python/toolchain handling, and final-HEAD closure across ported, rewritten, authored, and generated files.

`tools/build-source-plan.mjs` instead:

- scans only tracked `.ts` and `.mjs` files under `src/` and `tools/`;
- recognizes only static `import/export … from` syntax;
- does not load the sealed policy, schema, manifest contexts, workspace exports/imports, tsconfig aliases, or stated precedence;
- can emit only `repository_static_import`, `node_builtin`, or `npm_package`;
- ignores literal file reads, side-effect/dynamic/CommonJS imports, npm CLIs, Python and shell modules/scripts, workers, system helpers, tests, templates, and generated files.

The committed 78-row record contains exactly 33 repository-static, 42 Node-builtin, and 3 npm-package rows, with zero rows in the other 11 sealed classes—even though the target invokes absolute Git/Node/Python/shell helpers and contains shell and Python tooling.

`tests/migration/source-plan.test.ts` checks only non-empty output, duplicate absence, better-sqlite3 presence, and self-determinism. It does not contain the sealed variant-tsconfig/workspace alias, shell/Python, metacharacter, queue-order, transitive-helper, cycle, ambiguity, or context-changing fixtures.

Regenerating and committing `4aece3d2…` would fix Finding A’s staleness but would not establish the source closure required by AC2.

### Finding E — MEDIUM — The updated migration record omits required AC8 command/result bindings

**Disposition: acceptance-blocking under the sealed handoff contract.**

The updated migration record removed the prior `## Commands + exits` section. It gives aggregate prose and test counts but does not bind the exact verification commands and exit results required by AC8. Its final binding section also omits the target repository path/branch, a separate target-policy-copy OID/SHA binding, and a truthful clean-status binding.

Its two most important result bindings are additionally false for the accepted tree: the edge fixed point is stale and the dual-route hash is not reproducible under the mandated envelope. A corrected candidate requires a new immutable builder record with the complete AC8 bindings, not an editorial amendment to this review.

## Final verdict

**Verdict: REJECT.**

F1, F3, and F5 are resolved, and F2’s original roster/equivalence defect is repaired. The five named F4 recovery fixtures also now exist. Those improvements do not satisfy the sealed acceptance contract.

The committed edge record is stale and checked by an overwriting self-certifier; the bound dual-route hash embeds the founder’s HOME and fails the required scratch-envelope reproduction; AC5 process containment and takeover safety remain incomplete; the source-plan implementation does not implement the sealed edge closure; and the immutable migration record omits required AC8 bindings.

The local split remains rejected at `DEV`. The target remains `authority:false` and `installed:false`. This review authorizes no installation, cutover, remote creation, release, maturity advancement, or transfer of authority from Project_echo.