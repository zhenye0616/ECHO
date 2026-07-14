# Independent AC8 re-review — echo-brain local source extraction (item 133)

**Verdict: REJECT**

This re-judgment supersedes the earlier REJECT record published at feature-branch commit `90fb2b649c62418d947f91a7e8d1bdfaab38aae1`.

## Reviewer identity and independence

- **Reviewer:** `codex-ops` binding, this content-only session, completed `2026-07-14T08:52:19Z`.
- **Independence:** This reviewer is not builder `fable-builder-133`, did not create or modify the accepted target, and is independent of the neutral R1 executor.
- **Option B split:** A neutral executor performed the write-heavy R1 mechanics and captured evidence; this `codex-ops` session independently inspected the accepted tree, implementation, migration record, raw logs, and artifacts and authored the judgment. The wrapper owns publication of this review record as the one-path child commit.
- This session performed read-only inspection only. It did not write files, mutate Git state, commit, or push.

## Bound inputs

| Binding | Value |
|---|---|
| Item | `2026-07-13-133-local-echo-brain-source-extraction` |
| Sealed item path | `backlog/pending_review/2026-07-13-133-local-echo-brain-source-extraction.md` |
| Sealed item bytes | 29,419 bytes; SHA-256 `af66d11a8e6531acff0f6fe50c22ebf282248f2f707a780b3df11c002e70e186` |
| Pending-review re-handoff commit | `16847a6c2da9a12f89aedf88478fe25fb6bb87d2` |
| `ready_content_sha` | `832be81341f2c523fd42918206774ec8a51f54de653a323ad56d612e0ea47748` |
| Requested-reviewer roster | `["codex", "codex-ops"]`; this reviewer is a roster member |
| Builder | `fable-builder-133` (`Claude Code` / `claude` actor) |
| New immutable builder feature head | `e64bfb8071097af9156e79e7a6ffc7d437a7be60` |
| Builder-head ancestry | Sole parent `90fb2b649c62418d947f91a7e8d1bdfaab38aae1`, preserving the prior REJECT record |
| Migration record | `raw/internal/migrations/2026-07-13-133-echo-brain.md` at `e64bfb8071097af9156e79e7a6ffc7d437a7be60` |
| Migration-record blob / bytes | Git blob `a44e3d294072b49430c91a5dac8430e24176b36c`; 17,379 bytes |
| Migration-record SHA-256 | `7dc4d5df1a31a0147a7b4bf35fe6af860797c8501170bcbe3eb46a006e6762cd` |
| Prior REJECT record | Commit `90fb2b649c62418d947f91a7e8d1bdfaab38aae1`; blob `e76586e8705e616000090f04c091607798719590`; 13,162 bytes; SHA-256 `dd645a4977673682165ecd39cbf3cfad91205bc4dcf7760bab9e0532dda21df4` |
| Pinned source SHA | `2971310441b69735cbe759293abd8c4d044bf347` |
| Accepted target path / branch | `/Users/zhenye/Desktop/echo-brain`; `migration/2026-07-13-133` |
| New accepted target HEAD | `493b558f30d0e7b24dd2ebef883c10285f835f48` |
| New accepted target tree | `98d8549b55cdfd4f10d9452c840c006fa2c7a693` |
| Target state | Single root commit, no remote, clean working tree, 78 objects equal 78 reachable objects, empty fsck |
| Target authority / maturity | `authority:false`; `maturity:DEV` |
| R1 evidence directory | `/private/tmp/claude-501/-Users-zhenye-Desktop-Project-echo/f96bfcee-3199-472c-adf2-9b7367d03b4d/scratchpad/r1-evidence-133-rerun` |
| R1 summary | 10,740 bytes; SHA-256 `af502599128111f9c031819155c0e8115aefcef6f5945caf23bfc10ff961fe73` |
| Review request | 3,670 bytes; SHA-256 `882f71d3797270a60f494c8fc34f3d89d3fc2e5eac2ebd5519c4646f63191bec` |

## Founder-adjudication bindings

1. The sealed item’s **“Founder adjudication (2026-07-13, pre-review)”** at lines 187–198 governs the AC3/AC5 schema-path reconciliation and the eight product-test parity leaves. This review continues to accept both rulings: the committed runtime schema is staged into the artifact at the byte-immutable loader’s expected path, and the eight item-132 tests are preserved as byte-parity evidence rather than executed DEV tests.

2. **“Founder adjudication #2 (2026-07-13, AC8 Option B execution split)”** at lines 200–214 durably records the previously request-only ruling: neutral executor, independent `codex-ops` judgment author, and wrapper publisher are three distinct parties. This fixes prior finding F5 and governs this re-judgment.

3. **“Founder adjudication #3 (2026-07-14, post-REJECT fix cycle)”** at lines 216–233 authorizes the scratch-config lint design and directs the F2–F7 fix cycle. It also resolves the sealed AC2/AC3 contradiction by authorizing exactly one disclosed, semantically verified `package.json` npm-pin transform. The original empty-transform clause is superseded only for that row; `exclusion_allowlist` remains empty.

None of the adjudications waives AC2’s exhaustive command-edge partition, AC5’s version/integrity and sanitized-environment requirements, AC7’s stop-on-command-failure rule, or AC8’s migration-record hash bindings.

## R1 rerun outcomes

| Step | Executor outcome | Independent reviewer determination |
|---|---|---|
| 1 — Shared-target PRE audit | `PASS` | **PASS.** HEAD `493b558f…`, tree `98d8549b…`, one branch, no remotes, 57 tracked files, zero untracked files or symlinks, empty fsck, and equal 78-object object/reachable sets were verified. |
| 2 — Sanitized R1 clone | `PASS` | **PASS.** The clone used `--no-local --no-hardlinks --no-checkout`, detached the accepted OID, removed origin, and verified clean/no-remote/no-alternate/no-promisor/no-replace state. |
| 3 — Offline lifecycle plus lint | Summary reports `PASS` | **FAIL for acceptance.** Runtime install, build, artifact creation, fresh install, smoke, probes, and loopback controls succeeded. However, the first lint exited 2 and was retried rather than stopping; the successful retry used `typescript-eslint@8.64.0`, not the manifest-bound `8.20.0`. |
| 4 — AC7 battery | `PASS`; 18/18 tests | **FAIL for acceptance.** Typecheck, tests, provenance, boundary, and the named helper fixtures passed, but the dependency checker still misses a real accepted-tree command edge and retains a computed-command bypass. Its exit zero does not prove the exhaustive AC2/AC5 partition. |
| 5 — Transform-aware operator audit | `PASS` | **PASS.** Verdict `PASS`, zero errors, 57 target blobs, 56 partition rows, 21 target-only paths, and `reviewed_spec_sha` equal to `ready_content_sha`. Independent comparison confirmed the sole semantic source/target difference is `engines.npm="10.9.4"`. |
| 6 — Tuple comparison | All five fields match | **PASS for artifact identity.** All four tarballs and emitted member manifests match. The migration record misnames the emitted `String.localeCompare` order as raw byte order; that is an INFO documentation defect, not an artifact mismatch. |
| 7 — Shared-target POST audit | `PASS` | **PASS.** HEAD, tree, refs, fsck, working tree, object set, and reachable set were unchanged from PRE. |

The first lint failure appears at `03-lifecycle/phase-build-lint.log:58-73`. The executor then copied the identical-hash config into the clone and reran it successfully at `03-lifecycle/phase-lint.log:18-19`. The correction was disclosed, and the scratch file was removed, but the runner used `set -u` without fail-fast pipeline handling and continued after the failed mandatory command. That contradicts AC7’s stop-on-failure rule and the R1 summary’s own “no retry-to-green” disclaimer.

## New identity tuple

| Field | Builder B0/B1/B2 | R1 | Determination |
|---|---|---|---|
| Target HEAD | `493b558f30d0e7b24dd2ebef883c10285f835f48` | `493b558f30d0e7b24dd2ebef883c10285f835f48` | Match |
| Target tree | `98d8549b55cdfd4f10d9452c840c006fa2c7a693` | `98d8549b55cdfd4f10d9452c840c006fa2c7a693` | Match |
| Tarball SHA-256 | `72a32d2dcf34625856512b82f914596a77f5c62b1220b4ef96c9757e20a1922b` | `72a32d2dcf34625856512b82f914596a77f5c62b1220b4ef96c9757e20a1922b` | Match |
| Lock SHA-256 | `9ffc39fa013a67517d95399c80759a4fd359ce1ab1ccc5ee0e957504796ab296` | `9ffc39fa013a67517d95399c80759a4fd359ce1ab1ccc5ee0e957504796ab296` | Match |
| Ordered members | 27 | 27 | Match |
| Emitted-manifest digest | `1f9dbd66932a6120e9cfad90b1c820faf5052ca9cb8e481772744289460467ae` | `1f9dbd66932a6120e9cfad90b1c820faf5052ca9cb8e481772744289460467ae` | Match |

Independent spot checks hashed all four corrected tarballs to the same value and confirmed that the B0/B1/B2/R1 identity files are equal after excluding `run_id`. The R1 tar contains exactly 27 members, and each member’s path, mode, size, and SHA-256 matches the emitted manifest.

The operative F7 serialization is the UTF-8 bytes of compact `JSON.stringify(member_manifest)` in the array order emitted by `tools/verify-artifact.mjs`, whose paths are ordered with JavaScript `String.localeCompare`; object keys are inserted as `path`, `mode`, `size`, `sha256`. That serialization yields `1f9dbd66…`. Re-sorting paths by raw UTF-8 bytes instead yields `45bb23d859d870f7d0cef95afbd8927f999bfedbc94694af006f251de5b9e83c`. The migration record’s “byte-sorted” wording is therefore inaccurate, but the matching complete tarball SHA-256 independently proves byte-level artifact identity.

## Prior F1–F7 re-disposition

| Finding | Prior severity | Re-disposition | Determination |
|---|---:|---|---|
| F1 — AC7 lint absent/unrunnable | HIGH | **NOT FIXED at the mandatory R1 gate** | A real scratch-config lint mechanism now exists, its bytes hash correctly to `eb0562e63321f18f5ded9edfbb5fcb0c2058054455bccfb7458030c104b4a84c`, and builder legs ran it. R1’s first lint failed, the runner continued, and the successful retry used an unbound `typescript-eslint` version. |
| F2 — Dependency/toolchain enforcement incomplete | HIGH | **NOT FIXED** | The named clang/xcode helpers, `@types` inputs, registry digests, and three fixtures were added. Nevertheless, R1 did not use the recorded lint toolchain, and the checker still fails to cover every actual command edge or fail closed on all computed-command evasions. |
| F3 — npm 10.9.4 not pinned | MEDIUM | **FIXED under founder adjudication #3** | `package.json` pins Node `22.22.1` and npm `10.9.4`; the policy has exactly one transform row; the extraction row declares it; and the operator audit reconstructs source plus only the npm pin. |
| F4 — `.DS_Store` made target literally dirty | LOW | **FIXED** | PRE, POST, and direct inspection show 57 tracked files, zero untracked files, zero symlinks, and no `.DS_Store`. |
| F5 — Option B adjudication absent from sealed item | MEDIUM | **FIXED** | Founder adjudication #2 is now durable in the sealed item at lines 200–214. |
| F6 — Exact argv/environment traceability incomplete | LOW | **NOT FIXED** | Builder and R1 evidence still omit some lifecycle argv echoes; builder commands do not themselves use `env -i`; and the R1 build echo claims an `ECHO_TSC` assignment that the following `env -i` clears. |
| F7 — Truncated digest and unspecified serialization | INFO | **FIXED for identity; wording correction required** | The full emitted-manifest digest is recorded and reproduced, and all 27 tar members match. The actual order is `String.localeCompare`, not raw UTF-8 byte order. |

## New findings

### N1 — HIGH — R1 lint was neither fail-closed nor bound to the recorded toolchain

The accepted `provenance/dependency-toolchain.v1.json` records:

- `typescript-eslint@8.20.0`
- integrity `sha512-Kxz2QRFsgbWj6Xcftlw3Dd154b3cEPFqQC+qMZrMypSijPd4UanKKvoKDrJ4o8AIfZFKAF+7sMaEIR8mTElozA==`

R1’s cache-fill and offline provisioning commands instead request bare `typescript-eslint` without a version. The surviving R1 clone’s `node_modules/.package-lock.json` and package metadata show that npm resolved:

- `typescript-eslint@8.64.0`
- integrity `sha512-0qg+pDNMnqYzqH9AnNK+39tejHvsShUOUUoRUgtnTGE7QuMZhiFDnozq8nHJVq+Wae6NMLKNWLg5WmkcC/ndyQ==`

The scratch config imports `typescript-eslint`, so the successful lint used the unrecorded 8.64.0 semantics. This violates AC5’s package/version/integrity binding and founder adjudication #3’s explicit condition that scratch lint be backed by recorded digests.

The first lint also exited 2 with `ERR_MODULE_NOT_FOUND`; the runner continued through a `tee` pipeline and a second script retried with the config copied inside the clone. A new R1 must start with the resolvable config placement, install exactly `typescript-eslint@8.20.0`, verify its recorded integrity, and stop on the first failed mandatory command.

### N2 — HIGH — `check-dependencies.mjs` still does not enforce the exhaustive command partition

The accepted runtime contains a real helper edge at `src/product/config.ts:165`:

`spawnSanitizedChild('/sbin/mount', …)`

`provenance/dependency-toolchain.v1.json` contains the corresponding `/sbin/mount` row, but `tools/check-dependencies.mjs:146` recognizes only direct calls named `spawn`, `spawnSync`, `exec*`, or `fork`. It does not recognize `spawnSanitizedChild`, and the accepted checker output’s `used_commands` omits `/sbin/mount`. Consequently, the manifest row’s presence is not enforced; removing it would not be detected through that runtime callsite.

The computed-command logic at `tools/check-dependencies.mjs:160-171` is also not fail-closed: the presence of any tuple-shaped command list sets `hasTuple`, after which every computed spawn in that file is accepted without proving that the spawn variable derives from the tuple. The new evasion fixture tests a separate file with no tuple and does not cover this path.

This is the same acceptance-level defect class as prior F2. AC2/AC5 require every helper edge to be named and unlisted or computed executables to fail. Repair requires target checker and fixture changes, a new accepted target OID/tree, and renewed matrix/R1 bindings.

### N3 — MEDIUM — Builder B0/B1/B2 evidence does not establish AC5’s sanitized environment

The corrected builder runner’s lifecycle invocations use `/usr/bin/env` with selected assignments but without `-i`. Its exact-argv logs show forms such as:

`env HOME=… npm_config_cache=… /usr/local/bin/npm …`

rather than `env -i …`. No durable outer invocation transcript proves that `run_leg.sh` itself was launched from a sanitized environment. Therefore inherited `NODE_OPTIONS`, `NODE_PATH`, npm/Git variables, or DYLD/LD variables were not shown absent as AC5 requires.

The three `argv-echo.log` files also contain only four entries—npm ci, build/pack, lint, and tarball install—while `validate-config` and `selftest` are executed without an echo. R1 likewise omits full argv/environment echoes for npm ci, tarball install, and both CLI smokes. The migration record and R1 summary overstate “every sandboxed lifecycle command.”

### N4 — MEDIUM — The updated migration record retains stale content hashes

AC8 requires the builder migration record to bind the accepted package, lock, provenance, and parity hashes. The fix-cycle section replaces the old HEAD/tree/artifact tuple, but the only explicit content-hash table still contains values from the superseded target:

| Path | Recorded in migration record | Actual at `493b558f…` |
|---|---|---|
| `package.json` | `c27bff20e659dbd11131e51eb397769647ebb376a43569e1547ae6bbfa09e519` | `e7dd03dfce75c3ae4053541bb813b17f228dc6e15cec32aa268d0adbf3320736` |
| `provenance/extraction-policy.v1.json` | `82ffa0a7cde086600e55dd929565e20c6f99b4b1d708c72f5c7d7deb5e02caad` | `771a59ed73be2221ef10d1814beeb6d8d5cc06b937186407332f3cde67072945` |
| `provenance/source-extraction.v1.json` | `271dd1c7e229ffa269b8dd1d62da8242dac17de23f92af37be8ca4615e594fac` | `ba956517e7cb2ea1aaac5073d5350bc5e468334cfa479d2fa44d09b4427e8117` |

The lock and test-parity hashes remain correct. The three changed hashes must be replaced or explicitly superseded by a complete new-state hash table before AC8’s migration-record binding is satisfied.

### N5 — LOW — README still describes the transformed package as byte-identical

`README.md:18-20` says `product/package.template.json` was relocated “without content change.” Founder adjudication #3 and the accepted provenance correctly describe it as the sole semantically verified npm-pin transform. The README should state that exception rather than contradict the accepted provenance.

### N6 — INFO — F7’s recorded ordering name is wrong

`tools/verify-artifact.mjs` uses `String.localeCompare`; the migration record calls the resulting order “byte-sorted.” The full emitted-manifest digest and tarball identity remain valid, but the record should name the actual comparator or the implementation must switch to raw-byte ordering and regenerate the tuple.

## Final verdict

**Verdict: REJECT.**

The new accepted target is clean and stable; F3, F4, and F5 are fixed; the transform-aware audit passes; and the B0/B1/B2/R1 artifact tuple is byte-identical. Rejection remains necessary because:

1. the independent R1 lint used an unrecorded `typescript-eslint` version and retried after a mandatory command failure;
2. the accepted dependency checker still does not enforce every actual helper edge or computed-command evasion;
3. builder evidence does not establish AC5’s `env -i` lifecycle environment; and
4. the migration record does not bind the changed package and provenance hashes required by AC8.

This judgment rejects only acceptance of the local DEV split at the current bindings. It does not transfer authority, authorize a remote, cutover, client installation, publication, deployment, or release, and it does not advance maturity. The target remains `authority:false` and `maturity:DEV`.