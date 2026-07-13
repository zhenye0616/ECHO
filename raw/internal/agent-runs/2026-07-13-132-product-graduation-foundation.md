# Agent run — 2026-07-13-132-product-graduation-foundation

## Run 1

- Role: Codex builder
- Branch: `agent/132-product-graduation-foundation`
- Starting SHA: `0984ca6f39bd6d6755db5d9f79c6e35592eb5a29`
- Worktree: `/Users/zhenye/Desktop/Project_echo--132-product-graduation-foundation`
- Backlog state, main checkout, and remote refs were not modified.

## What I implemented

- In progress. AC1's import-fence tool was the first source deliverable.

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

- In progress; final counts and head SHA will be recorded at closeout.

## Decisions made during implementation

- None beyond contract-prescribed seams.

## Acceptance criteria status

- AC1: passing — fence modes, reduced closure, source/pipeline/state seams, and compatibility checks
- AC2: passing — strict schema/config, deepest-match filesystem probe, product-local paths, transactional runtime, bounded idempotent shutdown, and product-only CLI
- AC3: passing — founder CLI brain isolated in lab adapter with explicit dispatch/brief injection and no product fallback
- AC4: implementation passing — product-only Vitest config, shared environment/network/child-process guard, sanitized child sentinel, red fixtures, structural test scan, and renamed broad suite; CI scratch-artifact wiring completes with AC5
- AC5: in progress — independent private package metadata and the exact root-lock-derived 43-package runtime shrinkwrap are committed; Git-object builder/offline support/install verification remain
- AC6: pending
- AC7: pending
- AC8: pending
- AC9: pending

## Test results

- AC1 seed-inventory mode: PASS (1 command, 19 internal modules, 2 external packages).
- AC1 phase-2 boundary check: PASS (19 product-closure modules, 1 external package).
- AC1 focused verification: PASS (7 files, 100 tests); typecheck, lint, and `git diff --check` PASS.
- AC2 focused verification: PASS (3 files, 48 tests); typecheck, lint, boundary check, and `git diff --check` PASS.
- AC3 focused verification: PASS (4 files, 68 tests); typecheck, lint, boundary check, and `git diff --check` PASS.
- AC4 product verification: PASS (4 files, 56 tests); typecheck, lint, boundary check, formatting, and `git diff --check` PASS.
- AC4 renamed broad-suite verification: FAIL (183 files passed, 1 file failed, 1 file skipped; 1,893 tests passed, 1 failed, 21 skipped, 1 todo). The only failure is the existing inline generic-package file-list snapshot in `tests/packaging/packed-manifest.test.ts`, which correctly observes the new compiled seam/product files. That test is outside this item's `files_to_modify`; no snapshot update or generic-package behavior change was made. This is a repository-suite expectation update, not a product-suite or AC1–AC4 functional failure. It currently blocks an all-green `test:repo` closeout unless the authorized scope is amended or the strategist updates the generic-package snapshot.

## Open questions for founder

- None.

## Drift events caught

- None.
