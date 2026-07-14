# Independent AC8 review — echo-brain local source extraction (item 133)

**Verdict: REJECT**

## Reviewer identity and independence

- **Reviewer:** `codex-ops` binding, this content-only child session, completed `2026-07-14T07:32:21Z`.
- **Independence:** This reviewer is not builder `fable-builder-133`, did not create or modify the target, and is independent of the neutral R1 executor.
- **Option B split:** The neutral executor ran the mechanical R1 commands and captured evidence; this `codex-ops` session independently inspected that evidence and authored the judgment; the orchestrating wrapper owns creation and publication of the review-record child commit.
- This session performed only read-only inspection. It did not write files, mutate Git state, commit, or push.

## Bound inputs

| Binding | Value |
|---|---|
| Item | `2026-07-13-133-local-echo-brain-source-extraction` |
| Sealed item path | `backlog/pending_review/2026-07-13-133-local-echo-brain-source-extraction.md` |
| Sealed item bytes | 24,974 bytes; SHA-256 `aeb95285d8038a42675f83a1c6131344b3c6588acf01aaecf8cc657446958eb9` |
| Pending-review handoff commit | `ba2eea321cfb3589af1826e8a8f9ad6b1c85f3b6` |
| `ready_content_sha` | `832be81341f2c523fd42918206774ec8a51f54de653a323ad56d612e0ea47748` |
| Requested-reviewer roster | `["codex", "codex-ops"]`; this reviewer is a roster member |
| Builder | `fable-builder-133` (`Claude Code` / `claude` actor) |
| Immutable builder feature head | `d3f71b16c7c90e0178d7a10edaa76f8cd34f4d8a` |
| Migration record | `raw/internal/migrations/2026-07-13-133-echo-brain.md` |
| Matrix-inclusive migration-record commit | `d3f71b16c7c90e0178d7a10edaa76f8cd34f4d8a` |
| Migration-record blob / bytes | Git blob `299b40689b0bcf38b37ab9a76f2f4ed76d6a4872`; 9,934 bytes; SHA-256 `0f2b9cdf8ed0af4e4951f54d193abe1c1bd0f0517eceb8e42cb7e5203c7268a2` |
| Pinned source SHA | `2971310441b69735cbe759293abd8c4d044bf347` |
| Accepted target path / branch | `/Users/zhenye/Desktop/echo-brain`; `migration/2026-07-13-133` |
| Accepted target HEAD | `54259ef67eb90b5a1412bf15bac716180e822c72` |
| Accepted target tree | `e13b0cc57365acf9600f06882750982e02412c5a` |
| Target authority / maturity | `authority:false`; `maturity:DEV` |
| R1 summary | `R1-SUMMARY.json`, 11,959 bytes; SHA-256 `e61ec9ef395204f858ecb297e162ed093c7530d5a7fd74972bf5a73d659c6195` |
| Review-request bytes | `codex-ops-judgment-prompt.md`, 3,090 bytes; SHA-256 `7e90ce5c698138f92204df6995bb0e534c1925bb9b20e8a01062c2beda1d63a8` |

## Founder-adjudication bindings

1. `backlog/pending_review/2026-07-13-133-local-echo-brain-source-extraction.md`, **“Founder adjudication (2026-07-13, pre-review)”**, governs the AC3/AC5 schema-path reconciliation and the eight unexecuted product-test parity leaves. This review accepts both rulings: the committed schema is staged into the tarball at `schemas/product/runtime-config.v1.schema.json`, and all eight parity leaves were verified byte-identical without being added to the executed DEV suite.

2. The founder’s **Option B AC8 execution-split adjudication**, bound by this session’s review request, governs separation between the neutral executor, this judgment-authoring reviewer, and the publishing wrapper. Accordingly, absence of a reviewer child commit from the R1 evidence is not an executor or reviewer failure.

The named sealed item contains only the first adjudication heading and no Option B text. The second ruling is therefore bound here through the founder-controlled review request rather than through the asserted second section of the sealed item. That source discrepancy is recorded below and does not waive any technical acceptance criterion.

## R1 command and result review

| Step | Executor outcome | Independent reviewer determination |
|---|---|---|
| 1 — Shared-target PRE audit | `PASS` | HEAD, tree, sole ref, zero reflog entries, empty fsck output, and equal 78-object object/reachable sets were verified. The target was not literally clean: `?? .DS_Store` existed before R1. |
| 2 — Sanitized R1 clone | `PASS` | `env -i` clone used `--no-local --no-hardlinks --no-checkout`, detached checkout of the accepted OID, origin removal, empty hooks/template directories, and no alternates, promisor, replace, partial-clone, or remote state. |
| 3 — Offline lifecycle | `PASS` | Sandbox effectiveness was demonstrated by reachable DNS/direct IP outside and `EPERM`/`ENOTFOUND` inside. All four lifecycle phases had pre/post denial probes and both-half loopback controls. Offline runtime install, native `better-sqlite3` build, artifact build, fresh-prefix install, and CLI smoke succeeded. R1 used a cache root distinct from `cache2-B0`, `cache2-B1`, and `cache2-B2`. |
| 4 — AC7 battery | Executor reported `PASS (lint absent)` | Dependency, boundary, provenance, typecheck, corrected 8/8 parity verification, synthetic test, and 14/14 executed tests passed. AC7 as sealed did **not** pass because no lint command or tooling exists. The dependency-checker completeness defect below also means its exit zero does not prove the claimed exhaustive edge partition. |
| 5 — Operator audit | `PASS` | Canonical JSON records `verdict:"PASS"`, `errors:[]`, source tree 2,847, target tree 57, partition rows 56, and target-only count 21. The convenience summary’s zero row counts queried nonexistent field names; the canonical result is coherent. |
| 6 — Tuple comparison | Core tuple `MATCH` | Tarball, target tree, lock, and 27-member count match B0/B1/B2. Independent tar enumeration also produced exactly 27 members. The abbreviated auxiliary manifest digest was not reproduced. |
| 7 — Shared-target POST audit | `PASS (unchanged)` | HEAD, tree, ref, reflog, fsck, object set, and reachable set were unchanged. PRE/POST object and reachable-set files all hash to `8419d759b1e16acb0b5277df94ba2d4d5f56ccba87e1163f68dab1269a63b1ea`; both fsck files are empty. The same pre-existing `.DS_Store` remained. |

The first Vitest launch failed because a temporary config outside the clone could not resolve `vitest/config`. The executor moved the temporary config into the clone and reran; 5 files and 14 tests passed, after which tracked content and fsck were reverified. An earlier parity spot-check also queried the wrong JSON shape and returned zero entries before the corrected 8/8 check. These are disclosed harness corrections, not target-test failures.

## Identity-tuple comparison

| Field | B0/B1/B2 migration record | R1 evidence | Determination |
|---|---|---|---|
| Target HEAD | `54259ef67eb90b5a1412bf15bac716180e822c72` | `54259ef67eb90b5a1412bf15bac716180e822c72` | Match |
| Target tree | `e13b0cc57365acf9600f06882750982e02412c5a` | `e13b0cc57365acf9600f06882750982e02412c5a` | Match |
| Tarball SHA-256 | `d8abbae572bac1a00c93522263d9e8f94112fe582aa7ef2ddf992267e39c970f` | `d8abbae572bac1a00c93522263d9e8f94112fe582aa7ef2ddf992267e39c970f` | Match |
| Lock SHA-256 | `9ffc39fa013a67517d95399c80759a4fd359ce1ab1ccc5ee0e957504796ab296` | `9ffc39fa013a67517d95399c80759a4fd359ce1ab1ccc5ee0e957504796ab296` | Match |
| Ordered members | 27 | 27 | Match |
| Manifest digest | Truncated `59ed001c9974…`; serialization unspecified | Candidate serialization hashes `c7468c41…`, `d995c556…`, and `d66037be…` | Not reproduced; non-authoritative auxiliary digest |
| Member identity | Migration record asserts equality | R1 manifest contains 27 `{path,mode,size,sha256}` rows; tar independently enumerates 27 members | Cryptographically bound by the matching complete tarball SHA-256 |

## Findings and dispositions

### F1 — HIGH — AC7 lint was not run and is not runnable

**Disposition of open item (a): acceptance-blocking.**

AC7 separately requires typecheck, lint, and full tests. Accepted-target `package.json` has no scripts or development dependencies, no lint configuration or linter is tracked, and the R1 toolchain contains no ESLint, Biome, or Oxlint binary. `README.md:38-40` nevertheless says the separately provisioned linter is named in `provenance/dependency-toolchain.v1.json`; that manifest names only TypeScript and Vitest.

No founder adjudication waives lint. Adding tooling or configuration would change the accepted tree and tuple, requiring a new accepted OID and rerun of B0/B1/B2/R1. The current AC7 result is therefore incomplete.

### F2 — HIGH — AC2/AC5 dependency and toolchain enforcement is materially incomplete

Accepted-target `tools/check-dependencies.mjs` claims to partition package CLIs and literal system helpers, but its implementation scans only import specifiers, never consumes `toolchain.system_helpers`, and does not inspect command/helper invocations. `tests/migration/dependency-set.test.ts` contains only positive checks and no omission/evasion fixtures.

A concrete miss exists in the accepted tree: `tools/product/toolchain-preflight.mjs:53-61` invokes `clang++`, `xcode-select`, and `xcrun`; all three are absent from `provenance/dependency-toolchain.v1.json`, yet `check-dependencies` returns `ok:true`. Therefore its exit zero does not establish the sealed AC2/AC5 claim that every helper/CLI edge is named and that unlisted executables fail.

The same manifest records TypeScript and Vitest integrity only as `provisioned-out-of-band`, not a digest, and omits build inputs `@types/node@22.10.5` and `@types/better-sqlite3@7.6.11` consumed by R1. Distinct cache roots isolate filesystem writes; they do not cryptographically bind these shared cache inputs.

### F3 — MEDIUM — `package.json` does not pin npm 10.9.4

AC2 requires `package.json` to pin Node 22.22.1 and npm 10.9.4. The accepted `package.json:10-12` pins only Node and contains neither an npm engine constraint nor a `packageManager` declaration. Other evidence records npm 10.9.4, but that does not satisfy the specified package-level pin.

### F4 — LOW — Shared-target invariance passed, but literal cleanliness did not

The untracked `.DS_Store` existed before R1 and remained byte-state-neutral afterward. It did not affect HEAD, tree, refs, object sets, or fsck, and R1 did not create it. Nevertheless, AC1/AC7’s literal clean-working-tree condition was false at review time. Removal followed by a read-only audit would close this finding without changing the accepted commit.

### F5 — MEDIUM — The asserted second adjudication is absent from the sealed item bytes

The sealed 179-line item contains only `Founder adjudication (2026-07-13, pre-review)`. No Option B or neutral-executor section appears in those bound bytes. The direct founder-controlled review request is sufficient to govern this session’s role split, but the adjudication trail should be reconciled before merge so later reviewers do not depend on an ephemeral request for authority.

### F6 — LOW — Sandbox behavior is strong, but exact argv/environment traceability is incomplete

Raw logs demonstrate effective denial, eight lifecycle pre/post probes, four loopback controls, successful offline operations, and a distinct R1 cache. They do not echo every npm argv/environment value; poisoned proxy variables and some exact flags are executor-attested in `R1-SUMMARY.json`. Poisoned proxies also literally differ from AC5’s statement that proxy variables are absent, although they do not weaken the demonstrated network denial.

### F7 — INFO — Truncated manifest digest is non-blocking

**Disposition of open item (b): documentation gap, not an artifact mismatch.**

The record’s `59ed001c9974…` prefix cannot be reproduced because neither the complete digest nor serialization is specified. It is not used as an acceptance key. Matching complete tarball SHA-256, tree, lock hash, member count, and independently enumerated R1 manifest establish the relevant artifact identity. A future record should store the full digest and canonical serialization.

### F8 — INFO — Child-commit publication is wrapper-owned

**Disposition of open item (c): no reviewer defect.**

Under Option B, this content-only reviewer correctly did not create a detached worktree, child commit, or push. The wrapper owns publication and must preserve the original AC8 one-path-delta, sole-parent, expected-old, endpoint, and remote-probe constraints. The migration record does not contain the literal Project_echo origin URL contemplated by original AC8, so the wrapper’s publication evidence must bind the endpoint it actually uses.

## Final verdict

**Verdict: REJECT.**

The R1 tuple, operator audit, sandbox behavior, source identity, and shared-target invariance are coherent. Rejection is required because the sealed AC7 lint gate was not executed, and the accepted dependency/toolchain checker and manifest do not enforce the exhaustive AC2/AC5 contract they claim to prove. These are acceptance-criteria failures, not cosmetic review-record defects.

This judgment does not transfer authority, authorize a remote or cutover, approve a client installation or release, or advance maturity. The target remains `authority:false` and `maturity:DEV`; passing evidence here proves no more than a local DEV candidate, and this review does not accept that split yet.