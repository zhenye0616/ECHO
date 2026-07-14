# Independent AC8 review — echo-context (item 2026-07-13-135)

## Reviewer identity and independence

- **Judgment author:** `codex-ops` binding, acting as the independent AC8 reviewer.
- **Builder:** `fable-builder-135`; neither this reviewer nor the neutral executor built the target.
- **Option B disclosure:** under Founder adjudication #1, a neutral executor performed the deterministic reviewer-side mechanics and captured evidence; this `codex-ops` session inspected the sealed contract, immutable builder record, accepted target, summary, and raw evidence and authored the judgment; the wrapper alone publishes this record.
- This reviewer performed no writes, Git mutations, commits, pushes, target changes, or live-state access. No builder self-certification occurred.

## Bindings

- **Item:** `2026-07-13-135-local-echo-context-source-extraction`
- **ready_content_sha:** `aa9fa9d89c30b2ba2823d6b3eecdc32e389120bb9f3bc46538b9335a301c8392`
- **Pinned source commit:** `2971310441b69735cbe759293abd8c4d044bf347`
- **Immutable builder feature head:** `f8607d2b6b30da111231aa0cfce322db8f794b3d`
- **Builder migration record:** `raw/internal/migrations/2026-07-13-135-echo-context.md`
- **Migration-record SHA-256:** `c49438f80f0220fb4daae3241069cd88fad12b288e9cd5e18dab6e0c2fa980b5`
- **Migration-record Git blob:** `d6cfcc4c1310160e94ac9a3b07740252bf7285ba`
- **Accepted target:** `/Users/zhenye/Desktop/echo-context`
- **Target HEAD:** `aabf144e156bc6582f4a094b9c668c83aaac935b`
- **Target tree:** `899d769ae72e16e940d3879c828ef1a35c3010fc`
- **Target branch:** `migration/2026-07-13-135`
- **Tracked partition:** `190 = 38 target-only + 152 source-derived`; source-derived is `144 ported + 8 rewritten`.
- **Full source disposition:** `217 = 144 ported + 8 rewritten + 65 excluded`, comprising 110 source paths and 107 test/fixture paths.
- **Mechanical evidence execution:** `2026-07-14T09:04Z`
- **State:** `authority:false`, `installed:false`.

## Founder adjudications applied

1. **Founder adjudication #1 — AC8 Option B execution split.** The founder-approved review instruction supplies the three-party procedure: neutral mechanical executor, independent `codex-ops` judgment author, and wrapper-owned publication. The item’s AC8 handoff at `backlog/pending_review/2026-07-13-135-local-echo-context-source-extraction.md:145` and its agent notes at lines 51–53 reflect that procedure. The checked item visibly labels only adjudications #2 and #3; this record binds #1 to the founder-supplied Option B ruling and infers no substantive acceptance waiver from it.

2. **Founder adjudication #2 — Q1 scratch configuration and Q2 state paths.** At item lines 181–195, Q1 permits an uncommitted check-time tsconfig only if its exact bytes are recorded in the migration record so this reviewer can rerun byte-identically. Q2 permits `src/echo-home/state-paths.ts` as the recorded rewrite implementing `ECHO_CONTEXT_HOME` and `~/.echo-context`. Q2 is satisfied. Q1’s mandatory recording condition is not satisfied, as dispositioned in F3.

3. **Founder adjudication #3 — Q3 tsx child harness.** At item lines 197–208, the founder approved the pinned `tsx` dependency and literal `node --import tsx tools/verify-service-parity.mjs` child shape while rejecting committed `dist/` and in-process Vitest substitutes. The executor verified the real child-process, FD3, loopback, and process-group ceremony. This adjudication does not waive AC6 or adjudication #2’s byte-replay requirement.

## Evidence reviewed

The raw spot-check covered the pre-audit partition/object logs, the exact 217-path inventory bytes, source/target rewrite diffs, private-clone and native rebuild logs, FD3 readiness records, the 19-file hash table, and pre/post object sets. Direct target inspection covered `tools/check-parity.mjs`, `tests/migration/parity-matrix.test.ts`, the affected parity row, and the AC8 child/test harness.

## Per-step outcomes

| Step | Outcome | Review result |
|---|---|---|
| S1 — shared-target pre-audit | **PASS** | HEAD/tree/branch match; 346 objects equal 346 reachable objects; fsck and unreachable checks are clean; no remotes, reflogs, alternates, promisor, replace, shallow, or graft state; exact disjoint `38 + 152 = 190` partition. |
| S2 — pinned source objects and dispositions | **PASS WITH FINDINGS** | Canonical inventory is exactly 217 paths with the required hash; 144 ported rows are byte-identical, 65 excluded rows are absent, and the 8 actual rewrites are intended source-to-target differences. F2 shows one inaccurate replay row; F5 shows the required replay/whole-blob enforcement is absent. |
| S3 — reviewer private clone | **PASS** | Config-isolated `--no-local --no-hardlinks` clone, detached accepted-OID checkout, origin removal, clean status, clean fsck, and 190 tracked files reproduced. |
| S4 — AC7 installation and native proof | **PASS** | Offline `npm ci --ignore-scripts` installed 291 packages under network denial; only the adjudicated `better-sqlite3` rebuild executed; the module loaded and the native artifact hash matched exactly. |
| S5 — full verification battery | **PARTIAL / BLOCKED** | 72 files and 966 tests passed with 17 skipped and 0 failures; runtime inventory, source audit, context-tool evidence, Node syntax checks, typecheck, and lint were functionally clean. The migration record’s 66-file statement is wrong (F4), and byte-identical scratch-config replay was impossible because the bytes are absent (F3). |
| S6 — AC8 service parity | **PASS** | The adjudicated tsx child produced exactly one canonical JSON-LF FD3 readiness record, listened only on `127.0.0.1`, exercised ping/capture/search/clusters/atoms/wait with unknown-field rejection, and left no surviving process-group members after teardown. |
| S7 — bound target-file hashes | **PASS** | All 19 recorded target-file hash prefixes reproduced exactly; 19 matches, 0 mismatches. |
| S8 — shared-target post-audit | **PASS** | HEAD/tree/branch and the 346-object set remained unchanged; pre/post object-set digest is identical; fsck remains clean; no remote or reflog appeared; no untracked path exists outside `node_modules`. |

## Hash results

### Bound target-file hash table

| Path | Recorded SHA-256 prefix | Reproduced SHA-256 prefix | Result |
|---|---:|---:|---|
| `package.json` | `99efa7b4bd754cf5` | `99efa7b4bd754cf5` | MATCH |
| `package-lock.json` | `4c5639f08feb5d64` | `4c5639f08feb5d64` | MATCH |
| `context-tools.v1.json` | `db6eab7d3046f692` | `db6eab7d3046f692` | MATCH |
| `schemas/service-api.v1.json` | `ff4e2f2aec002e39` | `ff4e2f2aec002e39` | MATCH |
| `provenance/target-only-policy.v1.json` | `4f075fcaee338aaf` | `4f075fcaee338aaf` | MATCH |
| `provenance/runtime-inventory.v1.json` | `687e74265ae07ffc` | `687e74265ae07ffc` | MATCH |
| `provenance/source-evidence.v1.json` | `bc3094d81b47f22f` | `bc3094d81b47f22f` | MATCH |
| `provenance/parity-matrix.v1.json` | `4499bcc575ca1687` | `4499bcc575ca1687` | MATCH |
| `provenance/source-extraction.v1.json` | `c9d5801c4eb826e8` | `c9d5801c4eb826e8` | MATCH |
| `provenance/lifecycle-expected.v1.json` | `be8f50ec9be56220` | `be8f50ec9be56220` | MATCH |
| `provenance/lifecycle-observed.v1.json` | `ed3b7eb844239a98` | `ed3b7eb844239a98` | MATCH |
| `provenance/native-toolchain.v1.json` | `4341f8703999c60c` | `4341f8703999c60c` | MATCH |
| `provenance/context-tool-parity.v1.json` | `1aa7ae620208120d` | `1aa7ae620208120d` | MATCH |
| `tools/emit-source-inventory.mjs` | `8aea6b7acd6aacdb` | `8aea6b7acd6aacdb` | MATCH |
| `tools/check-runtime-inventory.mjs` | `1a37c1eb849fc4f8` | `1a37c1eb849fc4f8` | MATCH |
| `tools/check-parity.mjs` | `91c60e191cf90b2e` | `91c60e191cf90b2e` | MATCH |
| `tools/audit-pinned-extraction.mjs` | `dcd035cbfcf632df` | `dcd035cbfcf632df` | MATCH |
| `tools/verify-context-tools.mjs` | `3c21ca81b908cb63` | `3c21ca81b908cb63` | MATCH |
| `tools/verify-service-parity.mjs` | `ee6e6973c59eb8ed` | `ee6e6973c59eb8ed` | MATCH |

### Ceremony and replay hashes

| Object | Recorded | Reproduced | Result |
|---|---|---|---|
| 217-path inventory | `8b0280660ea5eb64851a5ce0d1a9d56b707d6e29ce00d113ec6656b055d72d37` | Same | MATCH |
| AC3 aggregate | `632a7b2f2515a68d92e819fcedfa5d26f3960bb631995046ccf3d23de245da90` | Same from the 10 ordered case rows | MATCH |
| `better_sqlite3.node` | `289ac2671fc501b275af7ce170ea2ef84e07be7e2a4a403aaa055cef02018557` | Same | MATCH |
| Shared-target object set | `b27f7b51ea21cfb13a4b7abb95b991c3aacce46652ec893d63c1bfd13cde3276` pre-audit | Same post-audit | MATCH |
| Scratch tsconfig | `7164ed9356aa3bd1d9108283eee164053bc6f251418d0aa1dc4d4b02726bf78f` | Bytes absent; cannot reproduce | BLOCKED |
| Scratch eslint config | `df912afc56372010d08414de6421d28fee931b908cdbbf0fd742ecf20e605bba` | Bytes absent; cannot reproduce | BLOCKED |

## Findings and dispositions

### F1 — INFORMATIONAL: untracked `node_modules`

The accepted worktree contains 7,597 untracked installation entries under `node_modules`; no `.gitignore` can be added without violating the sealed 38-path target-only set. None is tracked or reachable from the accepted commit, and the HEAD, tree, tracked partition, and object set remained unchanged.

**Disposition:** non-blocking benign installation residue. It must remain outside any accepted commit.

### F2 — LOW: one rewrite row does not describe its actual transformation

The `tests/mcp/recent-calls-endpoint.test.ts` parity row describes only deletion of `enable_deadlines: false` and labels the rewrite `deletion-only`. The actual source-to-target change also replaces the removed `coord_emit` error case with a multiline `search_memories` documented-`isError` case and changes the asserted tool name. Applying the recorded replay alone produces SHA-256 `51ae54261f5cbbaff423f204230b92f4d324af968af4ce768f4ce3a1f983ff04`, not the bound target hash `c3e2dfa2873aa69c571a0c44c0bb52863d8432a73b417ef110d871cb267fb279`.

The transformation itself is intentional and acknowledged in the builder’s agent notes; the defect is provenance accuracy and replay completeness.

**Disposition:** required correction and a direct AC6 exact-replay violation. It contributes to rejection, although it is not evidence that the target test behavior is wrong.

### F3 — MEDIUM: founder-mandated scratch-config bytes are absent

Founder adjudication #2 Q1 says the scratch tsconfig’s exact bytes **MUST** be recorded in the migration record so the independent reviewer can rerun with byte-identical configuration. The record contains only the tsconfig and eslint SHA-256 values plus prose descriptions. A one-way digest cannot recover the bytes, and the source repository configurations have different hashes. The executor’s best-effort reconstructions typechecked and linted successfully, but they cannot prove identity to the recorded configurations.

**Disposition:** acceptance-blocking. Functional success does not satisfy the adjudication’s explicit reproducibility condition. A refreshed record must contain the exact configuration bytes and hashes, followed by byte-identical reruns; if the original bytes cannot be recovered, a new founder adjudication and fresh verification are required.

### F4 — LOW: migration record misstates the test-file count

The migration record says `66 files / 966 tests`, while the accepted target contains and the executor ran 72 tracked test files. The 966-test count, 17 skipped count, and zero-failure result are correct.

**Disposition:** not independently acceptance-blocking, but the immutable builder record must be corrected in the rejection fix cycle.

### F5 — MEDIUM: AC6 rewrite replay and anti-whole-blob guarantees are unenforced

AC6 requires every rewritten row to bind a deterministic byte diff and exact replay command, requires an authored whole-blob replacement to fail, and requires omission/authored-replacement/whole-blob fixtures. The accepted `tools/check-parity.mjs` instead checks only that the target hash matches and that `rewrite_kind` and `replay` are non-empty. It never executes replay, reconstructs the target from the pinned source, verifies determinism, or rejects a whole-blob replacement. Its header expressly says an authored whole-blob replacement is allowed to differ. `tests/migration/parity-matrix.test.ts` has no replay-mismatch or whole-blob mutation fixture.

The executor directly verified that the eight current rewrites are legitimate rather than illicit whole-blob replacements. That establishes the current facts, but it does not satisfy the sealed requirement for fail-closed, reproducible enforcement. F2 demonstrates the consequence: an incomplete replay descriptor passed all committed checks.

**Disposition:** acceptance-blocking. The parity verifier and mutation fixtures must enforce exact replay and reject whole-blob substitution, F2’s row must be corrected, and the resulting target must receive a new accepted HEAD/tree and full rerun.

## Verdict

**Verdict: REJECT**

The runtime, source partition, hashes, installation proof, AC3 aggregate, and adjudicated AC8 child ceremony are strong and reproduced cleanly. They do not cure two mandatory contract failures: Founder adjudication #2’s exact-byte reviewer replay is impossible, and AC6’s exact-replay/anti-whole-blob guarantee is absent from the accepted tooling and fixtures. F2 is also an actual inaccurate replay record hidden by that enforcement gap.

This rejection is limited to the local DEV split at the exact bindings above. It does not assert that the eight current rewrites or service behavior are functionally wrong. It grants no authority transfer, installation, release, or maturity advancement: `authority:false`, `installed:false`, maturity remains **DEV**, and Project_echo remains the active daemon/MCP and live-state authority.