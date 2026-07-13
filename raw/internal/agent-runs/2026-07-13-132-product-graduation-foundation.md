# Agent run — 2026-07-13-132-product-graduation-foundation

## Run 1

- Role: Codex builder
- Branch: `agent/132-product-graduation-foundation`
- Starting SHA: `0984ca6f63e7f98c940d922011146f2f61a2f4c7`
- Worktree: `/Users/zhenye/Desktop/Project_echo--132-product-graduation-foundation`
- Backlog state, main checkout, and remote refs were not modified.

## What I implemented

- AC1 through AC9 are implemented and committed. AC1's import-fence tool was the first source deliverable.

## AC1 phase-1 closure inventory

Command (run before product composition):

```text
node tools/product/check-boundary.mjs --seed-inventory --roots src/capture/surfaces/granola-poller.ts src/enrich/granola-signals.ts src/enrich/post-meeting-brief.ts src/enrich/worker-heartbeat.ts src/storage/interface.ts src/storage/sqlite.ts src/storage/migrate.ts src/storage/source-match.ts src/echo-home/adapters/atomic-write.ts src/echo-home/paths.ts src/logging/index.ts src/guards.ts src/util/json.ts src/util/subject.ts src/util/timestamp.ts
```

Deterministic inventory:

```json
{
  "mode": "seed-inventory",
  "roots": [
    "src/capture/surfaces/granola-poller.ts",
    "src/echo-home/adapters/atomic-write.ts",
    "src/echo-home/paths.ts",
    "src/enrich/granola-signals.ts",
    "src/enrich/post-meeting-brief.ts",
    "src/enrich/worker-heartbeat.ts",
    "src/guards.ts",
    "src/logging/index.ts",
    "src/storage/interface.ts",
    "src/storage/migrate.ts",
    "src/storage/source-match.ts",
    "src/storage/sqlite.ts",
    "src/util/json.ts",
    "src/util/subject.ts",
    "src/util/timestamp.ts"
  ],
  "closure": [
    "src/brain/brain.ts",
    "src/capture/gate.ts",
    "src/capture/pipeline.ts",
    "src/capture/sources.ts",
    "src/capture/surfaces/granola-poller.ts",
    "src/echo-home/adapters/atomic-write.ts",
    "src/echo-home/paths.ts",
    "src/enrich/granola-signals.ts",
    "src/enrich/post-meeting-brief.ts",
    "src/enrich/worker-heartbeat.ts",
    "src/guards.ts",
    "src/logging/index.ts",
    "src/storage/interface.ts",
    "src/storage/migrate.ts",
    "src/storage/source-match.ts",
    "src/storage/sqlite.ts",
    "src/util/json.ts",
    "src/util/subject.ts",
    "src/util/timestamp.ts"
  ],
  "external_packages": [
    "ajv",
    "better-sqlite3"
  ]
}
```

Disposition: proceed. The three internal paths outside AC1's maximum allowlist are absorbed by explicitly authorized seams: `capture/gate.ts` and `capture/sources.ts` by `pipeline-core.ts` plus `granola-source-policy.ts`, and `brain/brain.ts` by `granola-signals-cli-adapter.ts`. No additional internal allowlist edge is required.

## AC1 phase-2 product closure

Command (run immediately after the minimal `src/product/` entry point existed):

```text
node tools/product/check-boundary.mjs
```

Actual sorted closure (the manifest allowlist was reduced to these files):

```text
src/capture/granola-source-policy.ts
src/capture/pipeline-core.ts
src/capture/surfaces/granola-poller.ts
src/echo-home/adapters/atomic-write.ts
src/echo-home/state-paths.ts
src/enrich/granola-signals.ts
src/enrich/post-meeting-brief.ts
src/enrich/worker-heartbeat.ts
src/guards.ts
src/logging/index.ts
src/product/index.ts
src/product/spawn-sanitized-child.ts
src/storage/interface.ts
src/storage/migrate.ts
src/storage/source-match.ts
src/storage/sqlite.ts
src/util/json.ts
src/util/subject.ts
src/util/timestamp.ts
```

External runtime closure: `better-sqlite3` only. Forbidden legacy paths `src/capture/sources.ts`, `src/capture/gate.ts`, `src/brain/brain.ts`, and `src/cli/commands/brief.ts` are absent.

## Files modified

- 54 tracked paths changed across 13 implementation commits plus this closeout evidence commit.
- Verified implementation head: `ad4bea2e6214b2fe053a5d3cc986e3904f3eae45`.
- The only path outside the spec's `files_to_modify` list is `tests/packaging/packed-manifest.test.ts`; its inline snapshot was mechanically refreshed to list exactly the 20 new compiled seam/product files observed by the existing generic-package contract. No generic package behavior or inherited AC8 debt changed.

## Decisions made during implementation

- None beyond contract-prescribed seams.

## Acceptance criteria status

- AC1: passing — fence modes, reduced closure, source/pipeline/state seams, and compatibility checks
- AC2: passing — strict schema/config, deepest-match filesystem probe, product-local paths, transactional runtime, bounded idempotent shutdown, and product-only CLI
- AC3: passing — founder CLI brain isolated in lab adapter with explicit dispatch/brief injection and no product fallback
- AC4: passing — product-only Vitest config, shared environment/network/child-process guard, sanitized child sentinel, red fixtures, structural test scan, renamed broad suite, and an unconditional macOS scratch-artifact product lane in the existing quality matrix
- AC5: passing — independent private package metadata, exact root-lock-derived 43-package runtime shrinkwrap, Git-object staging/atomic artifact builder, exact-cache/header support producer, fail-before-install toolchain preflight, root-locked offline source-build install, installed config/selftest, and build-race tests
- AC6: passing — versioned 24-cell matrix, strict standalone report-schema evaluator, controlled first-release N/A, authority/identity/skip/qualification validator, and DEV/incomplete draft generation
- AC7: passing — exact-SHA single build, immutable bundle/support hashes, no-checkout macOS arm64 Node 22 target, two-prefix state isolation, always-run evidence uploads, standalone aggregation, and a final red-cell/dependency/identity/skip terminal gate
- AC8: passing — product README and qualification-workflow comments preserve the exact generic package/platform debt owners, deadlines, support boundary, and blocking-red/no-retry disposition
- AC9: passing — private/unpublished package, DEV/incomplete-only report creation, no tag/release/publication/protected-environment mechanism, and an explicit ordered post-foundation handoff

## Test results

- AC1 seed-inventory mode: PASS (1 command, 19 internal modules, 2 external packages).
- AC1 phase-2 boundary check: PASS (19 product-closure modules, 1 external package).
- AC1 focused verification: PASS (7 files, 100 tests); typecheck, lint, and `git diff --check` PASS.
- AC2 focused verification: PASS (3 files, 48 tests); typecheck, lint, boundary check, and `git diff --check` PASS.
- AC3 focused verification: PASS (4 files, 68 tests); typecheck, lint, boundary check, and `git diff --check` PASS.
- AC4 product verification: PASS (4 files, 56 tests); typecheck, lint, boundary check, formatting, and `git diff --check` PASS.
- AC4 initial renamed broad-suite verification: FAIL (183 files passed, 1 file failed, 1 file skipped; 1,893 tests passed, 1 failed, 21 skipped, 1 todo). The only failure was the existing inline generic-package file-list snapshot in `tests/packaging/packed-manifest.test.ts`, which correctly observed exactly 20 new compiled seam/product files. At closeout, the snapshot alone was refreshed and its focused test passed (1 file, 1 test); no generic package behavior or inherited AC8 debt was changed. The final broad-suite result is recorded below.
- AC5 product verification: PASS (6 files, 74 tests). The packaged-product test built one local scratch lineage from committed Git objects, prepared 285 hashed support/cache/header entries, installed the tarball into an empty external prefix using the exact 43-package root-derived lock and npm offline mode, compiled `better-sqlite3` from source, and ran installed `validate-config` plus `selftest`. The build-once test paused after the fence preflight, mutated a closure source and added an ignored file under `src/product/`, then proved neither worktree byte entered the artifact.
- AC6 focused verification: PASS (1 file, 8 tests). A complete machine-cell CI draft validates while human cells remain pending; missing cells, CI-authored human passes, forbidden N/A, identity mismatch, unexpected skips, and premature QUALIFIED all fail. The only permitted N/A is `upgrade-from-previous` with both founder and independent-reviewer rationale.
- AC7 focused verification: PASS (3 files, 31 tests). The bundled verifier, DEV-draft creator, schema validator, target evidence, aggregator, and terminal gate run without a checkout. Static workflow assertions find exactly one product builder, no downstream checkout/build/pack, checksum verification before install, always-run uploads, and the terminal gate last. A forced target dependency failure produces a valid DEV/incomplete report with explicit red cells while the terminal gate exits 1.
- AC8 focused verification: PASS (1 file, 6 tests). A static contract requires the exact inherited-debt tool/failure names, owners, deadlines, macOS-only support claim, and blocking-red/no-retry language in both the product README and workflow comments; it also rejects a Windows qualification runner.
- AC9 focused verification: PASS (1 file, 7 tests). The negative-release contract checks private package metadata, DEV/incomplete report assignments, absence of tag/publication/release/protected-environment workflow mechanisms, all prohibited transition statements, and the exact five-gate handoff order.

## Open questions for founder

- None.

## Drift events caught

- None.

## Final verification results

- `npm run typecheck`: PASS (1 command passed, 0 failed).
- `npm run lint`: PASS (ESLint and task-state lint both passed; 2 checks passed, 0 failed).
- `npm run test:repo`: PASS (184 files passed, 1 file intentionally skipped, 0 failed; 1,894 tests passed, 21 skipped, 1 todo, 0 failed; 1,916 total).
- `npm run test:product`: PASS (7 files passed, 0 failed; 89 tests passed, 0 skipped, 0 failed).
- `npm run test:orchestration`: PASS (30 files passed, 0 failed; 269 tests passed, 0 skipped, 0 failed).
- `npm run product:check-boundary`: PASS (1 fence passed, 0 failed; final closure 23 internal modules and 2 declared external packages; 0 forbidden/unresolved edges).
- Fresh support preparation: PASS (1 run passed, 0 failed; 294 hashed support/cache/header entries).
- Fresh Git-object artifact build: PASS (1 tarball passed, 0 failed), version `0.1.0-dev.132-closeout`, source `ad4bea2e6214b2fe053a5d3cc986e3904f3eae45`, size 53,416 bytes, SHA-256 `ec8af1a85994e1a94e2b3e34641fff0a32b8f408f631313ca8748bd920fc7941`.
- Bundle checksum/support verification: PASS (1 bundle passed, 0 failed; 0 verification errors).
- Offline installed-artifact verification on the available `darwin/x64` host: PASS (1 install passed, 0 failed; 44 packages installed from the exact cache; toolchain preflight 13 checks passed, 0 failed; installed `validate-config` and `selftest` both exited 0, reported local APFS, `maturity: DEV`, and `wedge_executed: false`).
- Phase-1 target-cell execution on the available host: ENVIRONMENT-LIMITED FAIL (0 passed, 1 failed before install). The evidence correctly recorded `darwin/x64` versus the declared `darwin/arm64` target and left all target cells red; it blocks local production of arm64 target evidence, but blocks no implementation AC because the workflow and its static/forced-failure contracts are implemented and the installed artifact passed locally. The actual arm64 qualification job was not executed from this worktree.
- `git diff --check`: PASS (1 check passed, 0 failed).
- Required closeout commands and artifact/selftest checks: 9 passed, 0 failed. Extra architecture-strict target execution: 0 passed, 1 expected environment mismatch, recorded above without waiver.
