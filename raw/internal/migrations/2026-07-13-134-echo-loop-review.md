# Independent AC8 sixth judgment — echo-loop local source extraction (item 134)

## Verdict

**REJECT — redo before merge.** The fifth-review watcher and tracked-clean
repairs are closed, but the exact target is not self-contained under AC7's
mandatory scratch-HOME/private-clone envelope. Draft-07 validation depends on a
mutable founder user-site Python package: scratch system `jsonschema` 4.16.0
fails, while founder user-site 4.25.1 passes. The clean full run is 165/169, so
134 is not mergeable and the three-item merge/cleanup must not start.

- Reviewer: fresh independent `codex-ops` session
  `/root/fresh_review_134_r6`, 2026-07-14 PDT; not the builder.
- Fresh-eyes: no task-state pointer was read or written; zero ECHO MCP calls.
- Main handoff: `8bdf76beca0b8406087e46595c381f13258c41ae`.
- Item blob / bytes / SHA-256:
  `77ab2686f38fe62bebc2f3e50ef8a524a678fd67`; 28,738;
  `93e8ad97b8b7d25134a1bd385f9181dae8e943a113e9d2bc6fbe847214a2f760`.
- Immutable builder head: `155c48c0f3b79fb4aad4fa2b1ad95d175f0b0601`,
  sole parent `9bf1d8fbe503f1a0757ca450bc70bf32d8df8a69`, tree
  `b4a6f1e4e42d9c76faf82ac6601da1fda33a9609`; its sole delta is the
  migration record.
- Migration blob / bytes / SHA-256:
  `4855dd938da4a8db312d9e30d584fc9714e44d30`; 12,381;
  `ade0cae94b9cde965bcb9ec6eaa98e021779c5aa5e2b9bfa562746850f46aaca`.
- Target `/Users/zhenye/Desktop/echo-loop` is clean/no-remote on
  `migration/2026-07-13-134` at HEAD
  `c8ed1b01435bf0cb9dbf1ff6eec4c42a5202082b`, tree
  `b6faf29693ff050ee3160d0461a2ad4d075a394e`.
- Target topology: 41 linear commits, one root/branch, zero merges/tags/remotes;
  all 472 objects reachable (41 commits, 177 trees, 254 blobs); strict fsck
  clean; 177 tracked files exactly equal 177 non-`.git` files.
- Publication endpoint/ref:
  `https://github.com/zhenye0616/ECHO.git` /
  `refs/heads/agent/134-echo-loop`; expected-old is the immutable builder head.
  Config-isolated preflight found no URL rewrites, push URLs, or includes, and
  strict pre-push readback returned exactly that expected-old OID.
- `authority: false`; `installed: false`; maturity remains `DEV`.

## Acceptance status

| AC | Status | Evidence |
|---|---|---|
| AC1 | PASS | Exact target identity, clean/no-remote topology, modes, object closure, filesystem equality, and strict fsck reproduce. |
| AC2 | **FAIL** | Exact Draft-07/source-plan validation depends on mutable host user-site state; scratch HOME is 43/46. |
| AC3 | PASS | Coordination/native SQLite tests pass; no coordination failure appears in the clean suite. |
| AC4 | PASS | Provenance, dependency, skill, and target-tree audits preserve the internal orchestration-only boundary. |
| AC5 | PASS | 53/53 watcher tests and code audit close transport-launch CAS, leaderless recovery, binding escalation, and replacement safety. |
| AC6 | PASS | Disposable workflow fixtures pass without touching real repositories. |
| AC7 | **FAIL** | Private-clone offline install passes, but full tests and both exact verifier routes fail under scratch HOME. |
| AC8 | COMPLETE AS REJECTION | One-path immutable rejection child; no installation, authority transfer, or maturity advance. |

## Drift findings

No product/context/history, remote, installation, authority, or maturity drift
was found. The standalone target remains an internal local `DEV` asset and
Project_echo remains authoritative. Backlog/product/context archives are not
present in the target; sealed policy blob
`dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a` hashes to
`44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a`
and is byte-identical to its source.

## Design-choice judgments

- **Stand:** child-owned owner/generation/stage/nonce/PGID launch registration
  and completion CASes before Git contact; successor reaping of authenticated
  ACTIVE launches; sentinel-backed leaderless recovery.
- **Stand:** provisional STOP plus reinspection, CONT-only on identity mismatch,
  and exact owner/full-launch pre-transport escalation.
- **Stand:** deleting/ignoring Python bytecode and sealing final tracked-clean as
  `git status --porcelain=v1 --untracked-files=no` at the manifest tail.
- **Stand:** the 0600 outside-repo Draft-07 payload, ignored stdin, 30-second
  timeout, and `finally` cleanup; no `echo-draft7-*` residue remains.
- **Change:** validation must be self-contained under empty HOME. Correct the
  relative schema base and close/pin the validator behavior rather than relying
  on either system or founder user-site Python state.

## Bugs/risks

### Blocking portability defect — unclosed Draft-07 validator dependency

`provenance/edge-record.v1.schema.json:3` declares relative `$id`
`echo-loop/provenance/edge-record.v1` while using local
`#/definitions/...` references. `tools/lib/draft7-schema.mjs:79-83` launches
`/usr/bin/arch -arm64 /usr/local/bin/python3` with inherited scratch HOME and no
pinned/vendored `jsonschema` closure.

Under scratch HOME, Python 3.10.7 imports system `jsonschema` 4.16.0 from
`/Library/Frameworks/Python.framework/Versions/3.10/lib/python3.10/site-packages`.
Its resolver duplicates the relative base into
`echo-loop/provenance/echo-loop/provenance/edge-record.v1`, then raises
`RefResolutionError: unknown url type`. The same command under founder HOME
imports mutable user-site 4.25.1 from
`/Users/zhenye/Library/Python/3.10/lib/python/site-packages` and passes;
`PYTHONNOUSERSITE=1` reproduces the failure.

The version boundary also controls the intended meta-schema/invalid-regex path:
the rejecting/structurally-invalid fixture cannot reliably reach its expected
`validation_error`/`invalid_schema` classifications on the accepted scratch
toolchain. Thus both local-reference resolution and meta/regex validation are
version-dependent. This violates AC2 exact closure and AC7 environment
equivalence; the migration record's green 169/169, 46/46, and four route
results do not reproduce under the required envelope.

The exact direct and npm routes each emit 14 rows with `source-plan:1` and
`full-tests:1`; their other 12 rows are status 0. Their inner files are
byte-identical at SHA-256
`a35a6f2ad6a7fb8fd14f77aac291494a954c8fc6a7e9a4b6722b48d58e78c5c5`
and correctly say `verdict:fail`.

## Merge-conflict preview

Merge base of current main and builder head is
`84c15504a55d65c093a845b335748f2c58250dd1`. Relative to it, the feature adds
only the migration and review records; current main changes neither. Classic
`merge-tree` reports no conflict markers or changed-in-both path. This review
child changes only the review-record path, so the textual preview remains clean.
That is not merge approval: AC2/AC7 block merge and therefore block cleanup of
all three items.

## Suggested fixups

1. Give the Draft-07 schema a standards-correct absolute base URI (or otherwise
   make local references base-independent) and pin/vendor a validator closure
   that works with empty HOME and no user site.
2. Add exact scratch-HOME plus `PYTHONNOUSERSITE=1` regressions for committed
   validation, rejecting-schema `validation_error`, invalid-regex/meta-schema
   `invalid_schema`, and two consecutive non-writing `--check` runs.
3. Regenerate the source closure and migration/verifier hashes at a new target
   HEAD/tree; rerun all 169 tests, 46 source-plan tests, both verifier orders,
   offline native install/load, cleanup, and strict fsck.
4. Publish a new migration-record-only builder head over this rejection and
   request a new independent review. Do not install or advance maturity.

## Test counts observed

- Clean scratch-HOME full suite: **165/169 passed**; 24 files, 22 passed / 2
  failed, 4 failed tests, 344.13s. Failures: three Draft-07/source-plan tests
  and the dual-route test because both launchers exit 1.
- Focused source-plan: **43/46 passed**; three exact validation failures.
- Focused watcher: **53/53 passed** across seven files, 74.25s.
- Focused review queue + verification cleanliness: **12/12 passed** across four
  files.
- Source-independence/offline lifecycle: **1/1 passed** in a fresh private
  no-local/no-hardlinks clone with deny-network install, named
  `better-sqlite3` rebuild, native SQLite load, origin removal, and clean fsck.
- Direct/npm routes: each **12/14 rows status 0**; byte-identical failing inner
  SHA-256 `a35a6f2a...`; `source-plan` and `full-tests` are status 1.
- Typecheck; lint (46 files); provenance (76/148 byte-identical ports);
  dependencies (5 declared / 132 locked); skills (13); topology/object/mode
  audit; tracked-files/filesystem equality; strict full fsck: pass.
- Scratch Python 3.10.7 + system `jsonschema` 4.16.0: fail. Founder HOME +
  user-site 4.25.1: pass. Founder HOME + `PYTHONNOUSERSITE=1`: fail.

Final acceptance state: **REJECT — redo before merge**; `authority:false`,
`installed:false`, `DEV`.
