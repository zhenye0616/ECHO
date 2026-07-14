# Independent AC8 third review — echo-brain local source extraction (item 133)

**Verdict: REJECT**

This third judgment supersedes the earlier REJECT records published at feature-branch commits `90fb2b649c62418d947f91a7e8d1bdfaab38aae1` and `4e43c99682ee94de2f9ef2ea9205e0cf5d6d0533`.

## Reviewer identity and independence

- **Reviewer:** `codex-ops` binding, content-only session, completed `2026-07-14T09:37:01Z`.
- **Independence:** This reviewer is not builder `fable-builder-133`, did not create or modify the accepted target, and is independent of the neutral R1 executor.
- **Option B split:** A neutral executor performed the write-heavy R1 mechanics and captured evidence; this `codex-ops` session independently inspected the accepted tree, migration record, builder matrix, R1 evidence, and artifacts and authored the judgment. The wrapper owns publication as the one-path, sole-parent child of the immutable builder head.
- This session performed read-only inspection only. It did not write files, mutate Git state, commit, or push.

## Bound inputs

| Binding | Value |
|---|---|
| Item | `2026-07-13-133-local-echo-brain-source-extraction` |
| Sealed item path | `backlog/pending_review/2026-07-13-133-local-echo-brain-source-extraction.md` |
| Pending-review re-handoff commit | `2e27eff8bef027670ee3a745384087a314008551` |
| Sealed item blob / bytes / SHA-256 | Git blob `13e19484ae35f0ae1bf401adb1e35ebeb32da37e`; 31,526 bytes; `c2b3498ba323972e398d7bca87d6d511eaf376798fbea4dec747c47decbcfe26` |
| `ready_content_sha` | `832be81341f2c523fd42918206774ec8a51f54de653a323ad56d612e0ea47748` |
| Requested-reviewer roster | `["codex", "codex-ops"]`; this reviewer is a roster member |
| Builder | `fable-builder-133` (`Claude Code` / `claude` actor) |
| Immutable builder feature head | `3a693a7369c46a15f07f5704dec033b1a7230af5`; tree `921b530b70ec4ce5ca81d65d5d19d43b97da6722` |
| Builder-head ancestry | Sole parent `4e43c99682ee94de2f9ef2ea9205e0cf5d6d0533`, preserving the second REJECT record |
| Migration record | `raw/internal/migrations/2026-07-13-133-echo-brain.md` at builder head `3a693a7369c46a15f07f5704dec033b1a7230af5` |
| Migration-record blob / bytes / SHA-256 | Git blob `e00bd6664c472b551a45ee02503ed9c582803170`; 24,022 bytes; `458d7f50a0e16e929912fed24e79f97c451a689dee3d367c685f2ca84260f697` |
| Prior REJECT #1 | Commit `90fb2b649c62418d947f91a7e8d1bdfaab38aae1`; blob `e76586e8705e616000090f04c091607798719590`; 13,162 bytes; SHA-256 `dd645a4977673682165ecd39cbf3cfad91205bc4dcf7760bab9e0532dda21df4` |
| Prior REJECT #2 | Commit `4e43c99682ee94de2f9ef2ea9205e0cf5d6d0533`; blob `6c3769e795c1978c3d17a70e8012213090a816a6`; 17,402 bytes; SHA-256 `c86e33e584b8d90d2501feafcf63d8b6e60f0cbac9983def2c08deec29c3837a` |
| Pinned source SHA | `2971310441b69735cbe759293abd8c4d044bf347` |
| Accepted target path / branch | `/Users/zhenye/Desktop/echo-brain`; `migration/2026-07-13-133` |
| Accepted target HEAD / tree | `ffc11b45ca42fba19e25582f00e92dbaa63c9a3c`; `27250ad06e90d6ed4534dc6e50f880874818e659` |
| Target state | Parentless root commit; one branch; no remote; 57 tracked files; zero untracked files or symlinks; empty fsck; 78 objects equal 78 reachable objects |
| Target authority / maturity | `authority:false`; `maturity:DEV` |
| Builder matrix evidence | `scratchpad/matrix/legfc2-B{0,1,2}` |
| R1 evidence directory | `/private/tmp/claude-501/-Users-zhenye-Desktop-Project-echo/f96bfcee-3199-472c-adf2-9b7367d03b4d/scratchpad/r1-evidence-133-rerun2` |
| R1 summary | 11,222 bytes; SHA-256 `320243077bf68af6ba4f7ae9445a076503d1a021ab0eb72f60c7a7ecd92539ce` |
| Review request | 3,666 bytes; SHA-256 `b3ceb17824bfde71192dcf0173d7729de4916bd4df491495545ba77d2d17eab2` |
| Feature ref / publication endpoint | `refs/heads/agent/133-echo-brain`; `https://github.com/zhenye0616/ECHO.git`; publication remains wrapper-owned and was not performed here |

## Founder-adjudication bindings

1. **Founder adjudication #1** governs the AC3/AC5 schema-path reconciliation and the eight product-test parity leaves. This review continues to accept both rulings.

2. **Founder adjudication #2** governs the Option B split among the neutral executor, independent `codex-ops` judgment author, and publishing wrapper.

3. **Founder adjudication #3** authorizes the scratch-config lint design and the sole semantically verified `package.json` npm-pin transform. It does not waive AC2/AC5’s exhaustive, fail-closed command-edge partition or AC7’s mandatory-command behavior.

The standing third-rejection rule applies to a rejection on a new finding class. The remaining blocker below is a continuation of the existing F2/N2 checker-enforcement class, not a new class.

## Third-pass outcomes

| Step | Executor outcome | Independent reviewer determination |
|---|---|---|
| 1 — Shared-target PRE audit | `PASS` | **PASS.** HEAD/tree, sole branch, no remotes, clean 57-file worktree, empty fsck, and equal 78-object object/reachable sets were verified. |
| 2 — Sanitized R1 clone | `PASS` | **PASS.** The clone used `--no-local --no-hardlinks --no-checkout`, detached the accepted OID, removed origin, and verified clean/no-remote/no-alternate/no-promisor/no-replace state. |
| 3 — Offline lifecycle plus lint | `PASS` | **PASS.** Exact manifest-pinned toolchain integrities were verified before lint; the resolvable scratch config was present from the start; the inner runner used `set -euo pipefail` plus an `ERR` trap; lint ran exactly once and exited zero. Six lifecycle commands ran under strict `env -i` with denial probes and loopback controls. |
| 4 — AC7 battery | `PASS`; 21/21 tests | **FAIL for acceptance.** The mechanical battery passed and `/sbin/mount` appears in `used_commands`, but the accepted checker retains a computed-command evasion described below. The three new fixtures do not cover it. |
| 5 — Transform-aware operator audit | `PASS` | **PASS.** Verdict `PASS`, zero errors, 57 target blobs, 56 partition rows, 21 target-only paths, correct reviewed-spec hash, and only the adjudicated `engines.npm="10.9.4"` transform. |
| 6 — Tuple comparison | All five fields match | **PASS.** B0/B1/B2/R1 match on target/tree, tarball, lock, member count, and canonical `String.localeCompare`-ordered manifest digest. |
| 7 — Shared-target POST audit | `PASS` | **PASS.** HEAD, tree, refs, fsck, worktree, object set, and reachable set were unchanged from PRE. |

## Third-pass identity tuple

| Field | Builder B0/B1/B2 | R1 | Determination |
|---|---|---|---|
| Target HEAD | `ffc11b45ca42fba19e25582f00e92dbaa63c9a3c` | `ffc11b45ca42fba19e25582f00e92dbaa63c9a3c` | Match |
| Target tree | `27250ad06e90d6ed4534dc6e50f880874818e659` | `27250ad06e90d6ed4534dc6e50f880874818e659` | Match |
| Tarball SHA-256 | `b7708d8f195662a9180347ea0a52e6440af3b572fa2a6248c61e146d65f26e8b` | `b7708d8f195662a9180347ea0a52e6440af3b572fa2a6248c61e146d65f26e8b` | Match |
| Lock SHA-256 | `9ffc39fa013a67517d95399c80759a4fd359ce1ab1ccc5ee0e957504796ab296` | `9ffc39fa013a67517d95399c80759a4fd359ce1ab1ccc5ee0e957504796ab296` | Match |
| Ordered members | 27 | 27 | Match |
| Canonical member-manifest digest | `f868ad68125b2d0943f98793419784ba7399357eaf3ecd13f770a55d8f25cc24` | `f868ad68125b2d0943f98793419784ba7399357eaf3ecd13f770a55d8f25cc24` | Match |

All four actual tarballs rehash to the recorded tarball digest. Compact serialization of each emitted member array, without a trailing newline, reproduces `f868ad68…`.

## Cumulative F1–F7 and N1–N6 dispositions

| Finding | Severity | Third-pass disposition | Determination |
|---|---:|---|---|
| F1 — AC7 lint absent/unrunnable | HIGH | **FIXED** | Scratch-config lint is runnable, exact-pinned, integrity-verified, resolvable from the start, and passed in one invocation. |
| F2 — Dependency/toolchain enforcement incomplete | HIGH | **NOT FULLY FIXED; remains open as N2** | The original missing helpers, build inputs, and integrity bindings are fixed. The exhaustive command checker still admits an unlisted computed executable through the residual N2 regex defect. |
| F3 — npm 10.9.4 not pinned | MEDIUM | **FIXED** | `package.json` pins npm `10.9.4`; the sole transform is founder-authorized and operator-audit verified. |
| F4 — Target not literally clean | LOW | **FIXED** | PRE/POST and direct inspection show zero untracked files or symlinks. |
| F5 — Option B adjudication absent from sealed bytes | MEDIUM | **FIXED** | Founder adjudication #2 is durable in the sealed item. |
| F6 — Exact argv/environment traceability incomplete | LOW | **FIXED** | Builder B0/B1/B2 have sanitized outer transcripts and six exact command/environment echoes per leg. R1 records six command forms, its sanitized outer environment, and the `env -i` lifecycle allowlist. |
| F7 — Truncated digest / unspecified serialization | INFO | **FIXED** | The full digest and compact serialization are recorded and reproduced; the record correctly names `String.localeCompare`. |
| N1 — R1 lint not fail-closed or toolchain-bound | HIGH | **FIXED** | All six package integrities, including `typescript-eslint@8.20.0`, were independently matched before lint. The inner runner is fail-fast; the config is resolvable; lint ran once and passed. |
| N2 — Checker misses helper/computed-command edges | HIGH | **NOT FULLY FIXED; acceptance-blocking** | `/sbin/mount` and `spawnSanitizedChild` are now covered, but `DESTRUCTURE_RE` misclassifies ordinary array construction as proven tuple destructuring and still permits an unlisted computed executable. |
| N3 — Builder evidence lacks strict `env -i` | MEDIUM | **FIXED** | All 18 recorded builder lifecycle invocations use `env -i`; each leg has a sanitized outer transcript and six argv echoes. |
| N4 — Migration record retains stale hashes | MEDIUM | **FIXED** | All eight fresh hashes match the blobs at `ffc11b45`, including package, lock, README, policy, plan, extraction, parity, and toolchain records. |
| N5 — README claims byte-identical package relocation | LOW | **FIXED** | README lines 16–22 state the sole founder-adjudicated npm-pin transform and semantic audit. |
| N6 — Comparator named incorrectly | INFO | **FIXED** | The record names `String.prototype.localeCompare`; `verify-artifact.mjs` is unchanged and retains SHA-256 `3ef643821f782033a6acdd67782040f9d7e047542eda6a68697efc78e0e446a9`. |

## Acceptance-blocking residual — N2

The positive N2 corrections are present: the manifest declares `/sbin/mount`, `spawnSanitizedChild` is recognized, `used_commands` includes the mount edge, exactly three new tests were added, and Vitest reports 21/21.

The remaining defect is in `tools/check-dependencies.mjs:154,166,174-180`:

- `DESTRUCTURE_RE` is `/\[\s*([A-Za-z_$][\w$]*)\s*,/g`.
- That expression matches any bracketed array beginning with an identifier, not only a destructuring binding.
- Every captured identifier is added to `destructuredVars`.
- A computed spawn is accepted whenever `destructuredVars.has(tok)` is true.

Therefore this non-owner file evades the checker:

```js
import { spawnSync } from 'node:child_process';
const c = process.env.SNEAKY;
const unrelated = [c, ['--version']];
spawnSync(c, []);
```

The ordinary array expression records `c` as “destructured,” after which `spawnSync(c, [])` is accepted without classifying the executable or requiring a manifest row. The new unrelated-tuple fixture uses a literal `'git'` tuple and therefore does not exercise this same-variable false proof.

This contradicts the stated “directly tuple-destructured variable” rule and AC2/AC5’s requirement that unlisted or computed executables fail closed. It is the same checker-enforcement finding class as prior F2/N2 and remains acceptance-blocking even for the local DEV split.

## Executor-disclosure dispositions

### Peer-range mismatch

**Disposition: recordable, not acceptance-blocking for this local DEV split.**

`typescript-eslint@8.20.0` declares TypeScript `>=4.8.4 <5.8.0`, while the manifest pins TypeScript `5.9.2`. Exact installation therefore required `--legacy-peer-deps`. The executor nevertheless installed the exact recorded versions, independently matched all six package integrities, and ran lint cleanly.

This is manifest/toolchain compatibility debt that should be reconciled before a qualification or portability claim. It does not invalidate the observed lint result at `authority:false`, `maturity:DEV`.

### Initial sanitizer-regex abort

**Disposition: accepted as a pre-lifecycle harness correction, not a lifecycle retry.**

The sanitizer assertion executes before phase 1 and before argv entry #1. The initial `^GIT_` expression matched the harness’s benign `GIT_BIN` path pointer and aborted at that preflight point. Tightening the expression and restarting could not have retried a lifecycle command because none had run. The original aborted transcript was overwritten, so this conclusion rests on the disclosed failure point plus the preserved runner ordering.

## Final verdict

**Verdict: REJECT.**

N1 and N3–N6 are fixed; F1 and F3–F7 remain fixed; the target is clean and stable; the operator audit passes; and B0/B1/B2/R1 share the complete artifact tuple. Rejection remains required because N2’s command checker is still not fail closed and therefore does not establish the sealed AC2/AC5 exhaustive executable partition.

This is a continuation of the existing F2/N2 finding class, not a new finding class. This judgment does not transfer authority, create or authorize a remote, approve cutover, client installation, publication, deployment, or release, or advance maturity. The target remains `authority:false` and `maturity:DEV`.