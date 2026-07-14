# Independent AC8 fourth review — echo-brain local source extraction (item 133)

**Verdict: ACCEPT**

This fourth judgment supersedes the three earlier REJECT records published at feature-branch commits `90fb2b649c62418d947f91a7e8d1bdfaab38aae1`, `4e43c99682ee94de2f9ef2ea9205e0cf5d6d0533`, and `2b4ebbe8283ac9343eeff362479133888bff0ae0`.

## Reviewer identity and independence

- **Reviewer:** `codex-ops` binding, content-only session, completed `2026-07-14T17:46:43Z`.
- **Independence:** This reviewer is not builder `fable-builder-133`, did not create or modify the accepted target, and is independent of the neutral R1 executor.
- **Option B split:** A neutral executor performed the write-heavy R1 mechanics and captured evidence; this `codex-ops` session independently inspected the accepted tree, migration record, scoped delta, R1 evidence, checker behavior, fixture, and artifacts and authored the judgment. The wrapper owns publication as the one-path, sole-parent child of the immutable builder head.
- This session performed read-only inspection only. It did not write files, mutate Git state, commit, or push.

## Bound inputs

| Binding | Value |
|---|---|
| Item | `2026-07-13-133-local-echo-brain-source-extraction` |
| Sealed item path | `backlog/pending_review/2026-07-13-133-local-echo-brain-source-extraction.md` |
| Pending-review re-handoff / sealed-spec commit | `2e27eff8bef027670ee3a745384087a314008551` |
| Sealed item blob / bytes / SHA-256 | Git blob `13e19484ae35f0ae1bf401adb1e35ebeb32da37e`; 31,526 bytes; `c2b3498ba323972e398d7bca87d6d511eaf376798fbea4dec747c47decbcfe26` |
| `ready_content_sha` | `832be81341f2c523fd42918206774ec8a51f54de653a323ad56d612e0ea47748` |
| Requested-reviewer roster | `["codex", "codex-ops"]`; this reviewer is a roster member |
| Builder | `fable-builder-133` (`Claude Code` / `claude` actor) |
| Immutable builder feature head | `20c8135a37e123f1735dd07023ccc0bfc184b624`; tree `c2492883ac74829b453d79959a0ae0b0f2ef4436` |
| Builder-head ancestry | Sole parent `2b4ebbe8283ac9343eeff362479133888bff0ae0`, preserving the third REJECT record |
| Migration record | `raw/internal/migrations/2026-07-13-133-echo-brain.md` at builder head `20c8135a37e123f1735dd07023ccc0bfc184b624` |
| Migration-record blob / bytes / SHA-256 | Git blob `8fbf32d26a51eb1cf83061747f73a436652c68b2`; 28,855 bytes; `364069c06ac1306f4a33a282619bb352f211fbb9a957c342747829f060de3e9c` |
| Prior REJECT #1 | Commit `90fb2b649c62418d947f91a7e8d1bdfaab38aae1`; blob `e76586e8705e616000090f04c091607798719590`; 13,162 bytes; SHA-256 `dd645a4977673682165ecd39cbf3cfad91205bc4dcf7760bab9e0532dda21df4` |
| Prior REJECT #2 | Commit `4e43c99682ee94de2f9ef2ea9205e0cf5d6d0533`; blob `6c3769e795c1978c3d17a70e8012213090a816a6`; 17,402 bytes; SHA-256 `c86e33e584b8d90d2501feafcf63d8b6e60f0cbac9983def2c08deec29c3837a` |
| Prior REJECT #3 | Commit `2b4ebbe8283ac9343eeff362479133888bff0ae0`; blob `dc256879ed6b6c878043e1c891d7a30461f2ea5a`; 13,709 bytes; SHA-256 `51b42a643cb086546cfbe778d80345cc54e55f3eb408f202d4ffead7585dc7cd` |
| Pinned source SHA | `2971310441b69735cbe759293abd8c4d044bf347` |
| Accepted target path / branch | `/Users/zhenye/Desktop/echo-brain`; `migration/2026-07-13-133` |
| Accepted target HEAD / tree | `4a6dcb33d2e73f718e36832941b4fa2bc34c7285`; `e2466238d90691cc4488b9909ec31064a1b3df33` |
| Target state | Parentless root commit; one branch; no remote; 57 tracked files; zero untracked files or symlinks; empty fsck; 78 objects equal 78 reachable objects |
| Target authority / maturity | `authority:false`; `maturity:DEV` |
| Authorized micro-cycle delta | Exactly `tools/check-dependencies.mjs`, `tests/migration/dependency-set.test.ts`, and regenerated `provenance/source-extraction.v1.json`; no added or removed paths |
| Regenerated extraction SHA-256 | `1db0a00eb6a2cf1a06c10b0fe66c8b8157ab94e420333dd49bc62ebd210c8ff9` |
| Builder matrix evidence | `/private/tmp/claude-501/-Users-zhenye-Desktop-Project-echo/f96bfcee-3199-472c-adf2-9b7367d03b4d/scratchpad/matrix/legmicro-B{0,1,2}` |
| R1 evidence directory | `/private/tmp/claude-501/-Users-zhenye-Desktop-Project-echo/f96bfcee-3199-472c-adf2-9b7367d03b4d/scratchpad/r1-evidence-133-rerun3` |
| R1 summary | 8,574 bytes; SHA-256 `a674afedf0c4d3a479a278e919cba43190c85d20ea2e9261bf5f6d4ba638798f` |
| Fourth-review request | 3,344 bytes; SHA-256 `7dbbfbeec612d8d66873674d36e34a31886dc3d0630452dfefb411762493a6ed` |
| Feature ref / publication endpoint | `refs/heads/agent/133-echo-brain`; `https://github.com/zhenye0616/ECHO.git`; publication remains wrapper-owned and was not performed here |

## Founder-adjudication bindings

1. **Founder adjudication #1** governs the AC3/AC5 schema-path reconciliation and the eight product-test parity leaves. This review continues to accept both rulings.

2. **Founder adjudication #2** governs the Option B split among the neutral executor, independent `codex-ops` judgment author, and publishing wrapper.

3. **Founder adjudication #3** governs the scratch-config lint design and the sole semantically verified `package.json` npm-pin transform. It does not waive AC2/AC5’s exhaustive, fail-closed command-edge partition or AC7’s mandatory-command behavior.

4. **Founder-authorized surgical micro-cycle:** The only substantive correction after the third REJECT was the N2 `DESTRUCTURE_RE` fix and its exact regression fixture, plus mechanically regenerated extraction provenance. The independent tree comparison confirms that scope held.

## Fourth-pass outcomes

| Step | Executor outcome | Independent reviewer determination |
|---|---|---|
| 0 — Authorized-scope comparison | `PASS` | **PASS.** Both trees contain 57 paths. Exactly three mode-preserving blobs changed: `tools/check-dependencies.mjs`, `tests/migration/dependency-set.test.ts`, and `provenance/source-extraction.v1.json`; nothing was added or removed. |
| 1 — Shared-target PRE audit | `PASS` | **PASS.** HEAD/tree, sole branch, no remotes, clean 57-file worktree, zero symlinks, empty fsck, and equal 78-object object/reachable sets were verified. |
| 2 — Sanitized R1 clone | `PASS` | **PASS.** The clone used `--no-local --no-hardlinks --no-checkout`, detached the accepted OID, removed origin, and verified clean/no-remote/no-alternate/no-promisor/no-replace state. |
| 3 — Offline lifecycle plus lint | `PASS`, first attempt | **PASS.** All six manifest-bound toolchain integrities matched before lint. The fail-fast runner used strict `env -i`; all six lifecycle commands ran under the deny-network sandbox with pre/post denial probes and both loopback-control halves. Lint ran exactly once, exited zero, and no lifecycle phase was retried. |
| 4 — AC7 battery | `PASS`; 22/22 tests | **PASS.** `check-dependencies`, boundary, provenance, parity, typecheck, source-independence, and fsck checks passed. The exact ordinary-array N2 evasion now fails closed; the accepted genuine `for (const [name, args] …)` tuple destructure still classifies; `used_commands` includes `/sbin/mount`, `clang++`, `xcode-select`, and `xcrun`. |
| 5 — Transform-aware operator audit | `PASS` | **PASS.** Verdict `PASS`, zero errors, 57 target blobs, 56 partition rows, 21 target-only paths, correct reviewed-spec hash, and only the adjudicated `engines.npm="10.9.4"` transform. |
| 6 — Tuple comparison | All five fields match | **PASS.** B0/B1/B2/R1 match on accepted HEAD/tree, tarball, lock, member count, and canonical `String.localeCompare`-ordered manifest digest. |
| 7 — Shared-target POST audit | `PASS` | **PASS.** HEAD, tree, refs, worktree, fsck, object set, and reachable set were unchanged from PRE. |

## Fourth-pass identity tuple

| Field | Builder B0/B1/B2 | R1 | Determination |
|---|---|---|---|
| Target HEAD | `4a6dcb33d2e73f718e36832941b4fa2bc34c7285` | `4a6dcb33d2e73f718e36832941b4fa2bc34c7285` | Match |
| Target tree | `e2466238d90691cc4488b9909ec31064a1b3df33` | `e2466238d90691cc4488b9909ec31064a1b3df33` | Match |
| Tarball SHA-256 | `b7708d8f195662a9180347ea0a52e6440af3b572fa2a6248c61e146d65f26e8b` | `b7708d8f195662a9180347ea0a52e6440af3b572fa2a6248c61e146d65f26e8b` | Match |
| Lock SHA-256 | `9ffc39fa013a67517d95399c80759a4fd359ce1ab1ccc5ee0e957504796ab296` | `9ffc39fa013a67517d95399c80759a4fd359ce1ab1ccc5ee0e957504796ab296` | Match |
| Ordered members | 27 | 27 | Match |
| Canonical member-manifest digest | `f868ad68125b2d0943f98793419784ba7399357eaf3ecd13f770a55d8f25cc24` | `f868ad68125b2d0943f98793419784ba7399357eaf3ecd13f770a55d8f25cc24` | Match |

The tarball, lock, ordered members, and manifest digest correctly remain unchanged because none of the three authorized changed paths is a tarball member. Only the accepted Git tree advances from `27250ad0…` to `e2466238…`.

## Cumulative F1–F7 and N1–N6 dispositions

| Finding | Severity | Fourth-pass disposition | Determination |
|---|---:|---|---|
| F1 — AC7 lint absent/unrunnable | HIGH | **FIXED; stable** | Scratch-config lint is runnable, exact-pinned, integrity-verified, resolvable from the start, and passed in one invocation. |
| F2 — Dependency/toolchain enforcement incomplete | HIGH | **FIXED; closed through N2** | Missing helpers, build inputs, integrity bindings, sanitized-spawner coverage, and computed-command enforcement are fixed. The sole remaining `DESTRUCTURE_RE` evasion now fails closed. |
| F3 — npm 10.9.4 not pinned | MEDIUM | **FIXED; stable** | `package.json` pins npm `10.9.4`; the sole transform remains founder-authorized and operator-audit verified. |
| F4 — Target not literally clean | LOW | **FIXED; stable** | PRE/POST and direct inspection show zero untracked files or symlinks. |
| F5 — Option B adjudication absent from sealed bytes | MEDIUM | **FIXED; stable** | Founder adjudication #2 remains durable in the sealed item. |
| F6 — Exact argv/environment traceability incomplete | LOW | **FIXED; stable** | Builder and R1 evidence record sanitized environments and all six lifecycle command forms. |
| F7 — Truncated digest / unspecified serialization | INFO | **FIXED; stable** | The full digest and compact serialization are recorded and reproduced using `String.localeCompare` ordering. |
| N1 — R1 lint not fail-closed or toolchain-bound | HIGH | **FIXED; stable** | The fail-fast executor verified all six toolchain integrities before a single successful lint invocation, with no retry-to-green. |
| N2 — Checker misses helper/computed-command edges | HIGH | **FIXED; closed** | The binding-keyword regex no longer treats ordinary array construction as tuple destructuring. The exact prior evasion fails closed, genuine declaration destructuring remains recognized, and the complete suite passes 22/22. |
| N3 — Builder evidence lacks strict `env -i` | MEDIUM | **FIXED; stable** | Every sandboxed lifecycle command uses strict `env -i`; dangerous inherited variables are absent, and all six argv forms are recorded. |
| N4 — Migration record retains stale hashes | MEDIUM | **FIXED; refreshed** | The migration record contains a complete hash table for `4a6dcb33…`; regenerated `source-extraction.v1.json` hashes to `1db0a00e…`, with the other seven bound hashes unchanged. |
| N5 — README claims byte-identical package relocation | LOW | **FIXED; stable** | README states the founder-adjudicated npm-pin transform exception. |
| N6 — Comparator named incorrectly | INFO | **FIXED; stable** | The record correctly names `String.prototype.localeCompare`; the artifact algorithm and digest remain unchanged. |

## Closed residual — N2

The third judgment rejected because the prior expression:

```js
/\[\s*([A-Za-z_$][\w$]*)\s*,/g
```

matched any bracketed array beginning with an identifier. It therefore treated the ordinary array construction in this exact evasion as proven tuple destructuring:

```js
import { spawnSync } from 'node:child_process';
const c = process.env.SNEAKY;
const unrelated = [c, ['--version']];
spawnSync(c, []);
```

The accepted checker now uses:

```js
/\b(?:const|let|var)\s+\[\s*([A-Za-z_$][\w$]*)\s*,/g
```

The binding keyword must immediately precede the destructuring pattern. `const unrelated = [c, …]` therefore does not add `c` to `destructuredVars`, and the later computed spawn exits nonzero with `computed spawn command`. The new fixture drives that exact sequence and asserts both failure and diagnostic text.

Independent regex behavior checks confirmed that ordinary constructions such as `const arr = [cmd, extra]` and `arr = [cmd, extra]` do not bind `cmd`, while `const [cmd, args]`, `let [name, rest]`, `var [x, y]`, and the accepted target’s `for (const [name, args] of commandChecks)` do bind their first elements.

The sole F2/N2 acceptance blocker is therefore closed. The sealed AC2/AC5 executable partition is enforced to the standard demanded by the prior N2 finding.

## Executor-disclosure dispositions

### Peer-range mismatch

**Disposition: recordable, not acceptance-blocking for this local DEV split.**

`typescript-eslint@8.20.0` declares TypeScript `>=4.8.4 <5.8.0`, while the manifest pins TypeScript `5.9.2`. Exact installation therefore requires `--legacy-peer-deps`. The executor installed the recorded versions, independently matched all six package integrities before lint, and ran lint cleanly.

This compatibility debt must be reconciled before any qualification or portability claim. It does not invalidate the observed local result at `authority:false`, `maturity:DEV`.

### Sanitizer-regex exclusions

**Disposition: disclosed harness behavior, not acceptance-blocking.**

The executor harness deliberately excludes the benign path-pointer variables `GIT_BIN`, `NODE_BIN`, and `NPM_CLI` from its dangerous-variable sanitizer. This preserves the correction made after the earlier pre-lifecycle `^GIT_` abort. The exclusion is baked into this fourth-pass harness, did not re-trigger, and did not permit inherited Git/npm behavior variables through the strict `env -i` lifecycle allowlist. No lifecycle command was retried.

### Copied evidence-header labels

**Disposition: recordable, not acceptance-blocking.**

Three log headers retain copied prior-run labels: `battery-A.log` says `rerun2 @ffc11b45`, `audit.log` says `rerun @493b558f`, and `tuple.log` initially says `rerun2 @ffc11b45` before an appended correction. Their actual commands, accepted OIDs, trees, hashes, and results bind `4a6dcb33…` / `e2466238…`; no payload mismatch was found.

## Final verdict

**Verdict: ACCEPT.**

F1–F7 and N1–N6 are fixed and stable. The authorized micro-cycle remained within exactly three files, the prior N2 ordinary-array evasion now fails closed, genuine tuple destructuring remains classified, the AC7 battery passes 22/22, the operator audit passes, the target is unchanged across PRE/POST, and B0/B1/B2/R1 share the complete accepted identity tuple.

This acceptance proves only the local DEV split. It does not transfer authority, create or authorize a remote, approve cutover, client installation, publication, deployment, or release, or advance maturity. The target remains `authority:false` and `maturity:DEV`.