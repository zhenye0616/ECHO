# Independent AC8 re-review — echo-context (item 2026-07-13-135)

This record supersedes the prior `codex-ops` REJECT published at review child `f5596ab3a69658b0ce7946e22a289949035bbd98`.

## Reviewer identity and independence

- **Judgment author:** `codex-ops`, acting as the independent AC8 reviewer.
- **Builder:** `fable-builder-135`; neither this reviewer nor the neutral executor built the target.
- **Option B disclosure:** a neutral executor performed the deterministic reviewer-side mechanics and captured the rerun evidence. This `codex-ops` session independently inspected the sealed contract, R2 builder record, accepted target, raw evidence, and implementation before authoring the judgment. The wrapper alone publishes this record.
- This reviewer performed no writes, Git mutations, commits, pushes, target changes, or live-state access. No builder self-certification occurred.

## Bindings

- **Item:** `2026-07-13-135-local-echo-context-source-extraction`
- **ready_content_sha:** `aa9fa9d89c30b2ba2823d6b3eecdc32e389120bb9f3bc46538b9335a301c8392`
- **Pinned source commit:** `2971310441b69735cbe759293abd8c4d044bf347`
- **Immutable R2 builder head:** `ca70b7f2857dbd9cca44e6a1f3095674e4d62cbf`
- **Builder-head parent / prior REJECT child:** `f5596ab3a69658b0ce7946e22a289949035bbd98`
- **R2 builder delta:** exactly `raw/internal/migrations/2026-07-13-135-echo-context.md`
- **Migration-record Git blob:** `6b5ed61b0fbb07b29a2fa744527b64320746b325`
- **Migration-record SHA-256:** `0c4d7cb9c74ada6c47b691739367c53a40983f4f820554484671653017ccd42e`
- **Accepted target:** `/Users/zhenye/Desktop/echo-context`
- **Target HEAD:** `86a5c40386250a3c87313f39f65273be914b3b93`
- **Target tree:** `a933781cf669ae6cbdf0c3f240ade248bf90afed`
- **Target branch:** `migration/2026-07-13-135`
- **Tracked partition:** `190 = 38 target-only + 152 source-derived`
- **Source-derived partition:** `152 = 144 ported + 7 rewritten + 1 duplicated`
- **Full source disposition:** `217 = 144 ported + 7 rewritten + 1 duplicated + 65 excluded`
- **Mechanical evidence execution:** `2026-07-14T09:54Z`
- **Evidence directory:** `/private/tmp/claude-501/-Users-zhenye-Desktop-Project-echo/f96bfcee-3199-472c-adf2-9b7367d03b4d/scratchpad/r1-evidence-135-rerun`
- **State:** `authority:false`, `installed:false`, maturity **DEV**.

## Founder adjudications applied

1. **Option B execution split:** the neutral executor owns deterministic mechanics, `codex-ops` owns the independent judgment, and the wrapper owns publication.

2. **Adjudication #2:** the scratch tsconfig and eslint configurations remain uncommitted. Their verbatim bytes are now embedded in the migration record and reproduce their recorded hashes. The accepted AC4 implementation remains the recorded `src/echo-home/state-paths.ts` rewrite using `ECHO_CONTEXT_HOME` and `~/.echo-context`.

3. **Adjudication #3:** the AC8 harness uses pinned `tsx` and the approved real-child invocation `node --import tsx tools/verify-service-parity.mjs`, preserving FD3 readiness, process-group, teardown, and loopback-only requirements.

## Rerun outcomes

| Step | Outcome | Review result |
|---|---|---|
| RR-S1 — shared-target pre-audit | **PASS** | HEAD/tree/branch matched; 366 objects equaled 366 reachable objects; fsck and unreachable checks were clean; no remotes, reflogs, alternates, promisor, replace, shallow, or graft state; exact `38 + 152 = 190` partition. |
| RR-S2 — source objects and dispositions | **PASS WITH CONTRACT FINDING** | Inventory reproduced exactly at 217 paths; 144 ported rows were byte-identical, seven replay patches reproduced their target bytes, the deliberate AC5 duplicate was distinct and hash-bound, and 65 exclusions were absent. F6 identifies a separate missing target-blob-OID binding. |
| RR-S3 — reviewer private clone | **PASS** | Config-isolated `--no-local --no-hardlinks` clone, detached accepted-OID checkout, origin removal, clean tracked state, clean fsck, and 190 tracked files reproduced. |
| RR-S4 — AC7 installation and native proof | **PASS** | Offline `npm ci --ignore-scripts` installed 291 packages under network denial; only `better-sqlite3` rebuilt; DNS/IP/HTTPS denial and loopback controls passed; the native artifact loaded and matched its bound hash. |
| RR-S5 — verification battery | **PASS WITH LOW RECORD FINDING** | Byte-identical scratch configs reproduced and typecheck/lint passed. Vitest ran 72 files with **971 passed, 17 skipped, 0 failed**. Runtime inventory, extraction audit, parity enforcement, AC3 parity, roster, and Node syntax checks passed. RR-F1 records the migration record’s stale `966` count. |
| RR-S6 — AC8 service parity | **PASS** | The adjudicated tsx child produced one 46-byte canonical JSON-LF FD3 readiness record, listened only on `127.0.0.1`, passed the seven integration cases, and left no surviving process-group members. |
| RR-S7 — bound hashes | **PASS** | All 19 target-file hashes and all ceremony hashes reproduced exactly. |
| RR-S8 — shared-target post-audit | **PASS** | HEAD/tree and the 366-object set remained unchanged; pre/post object lists were byte-identical; fsck remained clean; no remote or reflog appeared; only untracked `node_modules/` remained. |

## Hash results

### Bound target-file hashes

| Path | SHA-256 — recorded and reproduced | Result |
|---|---|---|
| `package.json` | `99efa7b4bd754cf5b6794267da136aa85820577e7ec53d619a91c7127fcb8ce2` | MATCH |
| `package-lock.json` | `4c5639f08feb5d64a7659e154fbe9c0f4f44deaa5c91ff5f1edee8aacf8568e5` | MATCH |
| `context-tools.v1.json` | `db6eab7d3046f6925ac9a58bf4ff13bf321547c2b74903acde71821f4c09ce37` | MATCH |
| `schemas/service-api.v1.json` | `ff4e2f2aec002e39a776279f3ca4c9d8f530d50eaee3420a83c5b01360144540` | MATCH |
| `provenance/target-only-policy.v1.json` | `4f075fcaee338aaf66a79bb61c95200ff2802d470d7bac2383e577159705df77` | MATCH |
| `provenance/runtime-inventory.v1.json` | `05ef704bdbdc834f3872db916917cb70b4ca5a59bf35443a834cec7b522f3840` | MATCH |
| `provenance/source-evidence.v1.json` | `bc3094d81b47f22ff27422644b40893eb3f5a050c12e3aa5d049b40394fc6279` | MATCH |
| `provenance/parity-matrix.v1.json` | `47331ae46ac49ebe20a07db17925b5cf8951bdc2792ae550685829ae61e20ce5` | MATCH |
| `provenance/source-extraction.v1.json` | `fca6c5609ff4a6e436f3ce1576b7aebc7d532f75a7f91ac2dc67035a3db1a5de` | MATCH |
| `provenance/lifecycle-expected.v1.json` | `be8f50ec9be562201616845a47e5990722cd1aaeb0140104a474067178b58151` | MATCH |
| `provenance/lifecycle-observed.v1.json` | `ed3b7eb844239a98e83189462cdfe3beedc07e06f02ac93c716f5c3d19135697` | MATCH |
| `provenance/native-toolchain.v1.json` | `4341f8703999c60c570c89c34abe7d6955477477aac4c743afba740dab9b5c7d` | MATCH |
| `provenance/context-tool-parity.v1.json` | `1aa7ae620208120d42a60f070355bf303d9675811e147f258ec7c9806234dcc4` | MATCH |
| `tools/emit-source-inventory.mjs` | `8aea6b7acd6aacdb2629c6b345ad8d6de08a61779aa90a190634dd08f989904c` | MATCH |
| `tools/check-runtime-inventory.mjs` | `1a37c1eb849fc4f82629793fb46cc3588f88e27b977ba7b7ce56a041ba2d7d31` | MATCH |
| `tools/check-parity.mjs` | `305f5697eb58b29dff3a8d70f1ccb79c7b9b75a4bfb93e63f714af74f5a8c940` | MATCH |
| `tools/audit-pinned-extraction.mjs` | `26972d9cbd45ca0a0ecaa53dddd9e019faf7cba1ceaffbc96bdb774eee4028ec` | MATCH |
| `tools/verify-context-tools.mjs` | `3c21ca81b908cb63addbbfb25181d262d6ac78b9cb96c4ad5827974a2058a6a2` | MATCH |
| `tools/verify-service-parity.mjs` | `ee6e6973c59eb8ed785df3f039f232f23ee3dbe743540f8535933c89a66f688c` | MATCH |

### Ceremony and replay hashes

| Object | Reproduced value | Result |
|---|---|---|
| 217-path inventory | `8b0280660ea5eb64851a5ce0d1a9d56b707d6e29ce00d113ec6656b055d72d37` | MATCH |
| AC3 aggregate | `632a7b2f2515a68d92e819fcedfa5d26f3960bb631995046ccf3d23de245da90` | MATCH |
| `better_sqlite3.node` | `289ac2671fc501b275af7ce170ea2ef84e07be7e2a4a403aaa055cef02018557` | MATCH |
| Scratch tsconfig | `7164ed9356aa3bd1d9108283eee164053bc6f251418d0aa1dc4d4b02726bf78f` | MATCH FROM EMBEDDED BYTES |
| Scratch eslint config | `df912afc56372010d08414de6421d28fee931b908cdbbf0fd742ecf20e605bba` | MATCH FROM EMBEDDED BYTES |
| Shared-target object set | `479e022ebba6192414506c0c7b9973861c5b92d49ada7290b7eeac8395053433` | MATCH PRE/POST |
| Seven rewritten rows | All seven replay patches reproduced their recorded target SHA-256 and committed target bytes | 7/7 MATCH |

## F1–F5 re-disposition

| Finding | Re-disposition | Blocking? |
|---|---|---|
| **F1 — untracked `node_modules/`** | **CONFIRMED BENIGN.** It remains untracked installation residue. HEAD, tree, tracked partition, and object set stayed unchanged. | No |
| **F2 — inaccurate recent-calls replay** | **LOAD-BEARING FAILURE RESOLVED.** The executable `replay_patch` now includes both `enable_deadlines` deletions and the `coord_emit`→`search_memories` error-case substitution, and reproduces the committed target exactly. The ignored legacy fields `replay`, `rewrite_kind`, and `summary` still describe only the deletions; that is misleading LOW descriptive-metadata drift but no longer defeats exact replay. | No |
| **F3 — scratch-config bytes absent** | **RESOLVED.** Both configurations are embedded verbatim, hash exactly to `7164ed93…` and `df912afc…`, and passed byte-identical typecheck/lint replay. | No |
| **F4 — incorrect test-file count** | **ORIGINAL FINDING RESOLVED.** The target contains and the rerun executed 72 test files. RR-F1 below records a successor aggregate-test-count inaccuracy. | No |
| **F5 — replay and anti-whole-blob enforcement absent** | **RESOLVED FOR ITS ORIGINAL SCOPE.** `check-parity.mjs` executes every rewritten patch, requires target-hash and committed-byte equality, rejects whole-blob substitution, and separately validates the deliberate duplicate. Whole-blob, mismatched replay, omitted replay, and duplicated-byte-copy mutations fail closed. | No |

## RR-F1 — LOW: aggregate test count is stale

The R2 migration record states `72 test files / 966 tests pass`. The rerun produced **72 files / 971 passed / 17 skipped / 0 failed**. The five-test increase is corroborated by the five new F5 mutation tests in `tests/migration/parity-matrix.test.ts`.

**Disposition:** recordable, non-blocking factual inaccuracy. The sealed contract does not prescribe an aggregate test count, and the expanded suite passed. RR-F1 alone would not justify rejecting this local DEV split.

## F6 — MEDIUM, NEW: rewritten rows do not bind target Git blob OIDs

AC6 explicitly requires each rewritten row to bind the source blob OID, target blob OID, deterministic byte diff, and exact replay command.

All seven rewritten rows contain `source_blob_oid`, `target_path`, `target_content_sha256`, `replay_patch`, and `replay_command`, but **zero of seven contains a full `target_blob_oid`**. The parity schema does not define or require that field, and `check-parity.mjs` does not compute or validate a target Git blob OID. The unified-diff headers contain only unvalidated abbreviated OIDs.

| Rewritten path | Actual target Git blob OID, currently not row-bound |
|---|---|
| `src/echo-home/state-paths.ts` | `c81342401b31e2a89eb4d76e344e355d7c2790af` |
| `src/mcp/server.ts` | `5182cc601d3be54bfbf1bae80217955f553001af` |
| `tests/echo-home/paths.test.ts` | `f842aee9645aca4f266e3273943cdee602485a55` |
| `tests/mcp/recent-calls-endpoint.test.ts` | `119dc15c08f72891255679235646e19cd276ed17` |
| `tests/mcp/server.test.ts` | `645fc78de697fbf1c84e08fa8a0aa019d3c5efd6` |
| `tests/mcp/tools/recent-work-context.test.ts` | `d4ffb9e47495a44bf8610709afde8b66cb8aac02` |
| `tests/mcp/tools/search-memories.test.ts` | `fbd739babe6dc33a1ac910d3e0f17767132d260c` |

Accepted HEAD/tree, target path, full content SHA-256, clean detached-clone proof, and exact byte replay together provide strong practical byte identity. They do not satisfy the sealed contract’s separate literal requirement that each rewritten row bind the target blob OID, and no founder adjudication authorizes that substitution.

**Disposition:** acceptance-blocking provenance-contract defect. Resolution requires either full target-blob-OID fields enforced by the schema and verifier for all seven rows, or an explicit founder adjudication accepting the existing composite binding as equivalent. This is a **NEW finding class**, so the standing founder rule halts the item to the founder.

## Verdict

**Verdict: REJECT**

The R2 fix cycle successfully resolves the load-bearing portions of F2–F5, and every runtime, source-partition, replay, configuration, service, installation, and hash proof reproduced. RR-F1 and the stale F2 legacy descriptors are LOW, recordable, and would not block a local DEV split.

Rejection is solely for F6: the sealed AC6 contract explicitly requires row-level target Git blob OID bindings, but the accepted provenance schema, seven rewritten rows, and verifier omit them. Because F6 is a new finding class, this rejection halts to the founder under the standing rule.

No authority transfer, installation, release, or maturity advancement is granted: `authority:false`, `installed:false`, maturity remains **DEV**, and Project_echo remains the active daemon/MCP and live-state authority.