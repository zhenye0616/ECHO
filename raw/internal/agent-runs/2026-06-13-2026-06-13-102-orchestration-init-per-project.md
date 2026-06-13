---
backlog_item: 2026-06-13-102-orchestration-init-per-project
agent_run_started: 2026-06-13T09:31:00Z
agent_run_ended: 2026-06-13T10:07:57Z
status: ready_for_review
test_status: passing
branch: agent/orchestration-init-per-project
head_sha: 8190e7babbefc6dadbc4e3dbf64fe68fbc877849
---

# Agent Run: Orchestration Init Per Project

## What I Implemented

Implemented the 102 vertical slice: per-project `.echo/project.json` loading/defaults, `echoctl orchestration init <repo>`, reviews-root and coordination-ref decoupling for request/combine/reviewer publishing, and side-ref review-loop coverage.

## Files Modified

Branch: `agent/orchestration-init-per-project`
Head SHA: `8190e7babbefc6dadbc4e3dbf64fe68fbc877849`

- `src/echo-home/paths.ts` - project config schema/defaults, registry read/upsert, atomic locked `projects.json` writes.
- `src/cli/commands/orchestration.ts`, `src/cli/index.ts` - new `orchestration init` command and CLI registration.
- `src/coord/paths.ts`, `src/mcp/tools/coord-invoke.ts` - request-path realpath containment and `coord_invoke` wiring away from hardcoded `backlog/reviews`.
- `tools/review-queue/request.py`, `tools/review-queue/combine.py` - `--reviews-root` and `.echo/project.json` defaults.
- `tools/review-queue/_run_reviewer.sh`, `tools/review-queue/push-with-retry.sh`, `tools/review-queue/reviewer-bindings.json` - configurable `coord_ref`, side-ref selection/read/write, and `{{REVIEWS_ROOT}}` response templates.
- `tests/cli/`, `tests/coord/`, `tests/echo-home/`, `tests/review-queue/` - focused coverage for init, config defaults, path traversal/symlink rejection, reviews-root, side-ref reviewer operation, and publish helper behavior.

## Decisions Made During Implementation

### Decision 1: CLI registration file

- **Options considered:** only add `src/cli/commands/orchestration.ts`; also wire `src/cli/index.ts`.
- **Chose:** wire `src/cli/index.ts`.
- **Why:** AC2 requires a runnable `echoctl orchestration init <repo>` command; the existing CLI command structure registers commands in `src/cli/index.ts`.
- **Worth founder review?** Low. This is the existing command pattern.

### Decision 2: `coord_invoke` consumer wiring

- **Options considered:** only add the resolver in `src/coord/paths.ts`; replace the hardcoded regex call site in `src/mcp/tools/coord-invoke.ts`.
- **Chose:** replace the call site.
- **Why:** AC3 explicitly says to decouple `coord_invoke` path validation. Leaving `coord-invoke.ts` on its old literal regex would keep custom `reviews_root` unusable through MCP.
- **Worth founder review?** Medium. `src/mcp/tools/coord-invoke.ts` was not named in `files_to_modify`, but it is the direct consumer of the hardcoded validation AC3 removes.

### Decision 3: Formatting gate

- **Options considered:** run repo-wide `format:check`; format only touched files.
- **Chose:** ran repo-wide check, observed pre-existing unrelated warnings, then formatted and checked only touched files.
- **Why:** repo-wide Prettier is already red on 104 unrelated files; formatting the full tree would create unrelated churn.
- **Worth founder review?** No.

## Acceptance Criteria Status

- [x] AC1 - `.echo/project.json` schema/default loader and Project_echo-compatible defaults.
- [x] AC2 - `echoctl orchestration init <repo>` scaffolds the pipeline, writes config, and atomically upserts `projects.json`.
- [x] AC3 - `coord_invoke` request validation uses configured `reviews_root` with realpath containment and traversal/symlink rejection.
- [x] AC4 - `request.py` and `combine.py` accept/read `reviews_root` and preserve defaults.
- [x] AC5 - review helpers fetch/select/read/write against configured `coord_ref`; side-ref request-only fixture passes with default branch untouched.
- [x] AC6 - reviewer binding response paths use `{{REVIEWS_ROOT}}` and wrapper resolution honors it.
- [x] AC7 - default Project_echo tests in the touched areas stay green.
- [x] AC8 - focused init/config/path/request/combine/side-ref tests added and passing.

## Tests Run

Environment setup:

```text
npm ci
added 356 packages, and audited 357 packages in 4s
5 vulnerabilities (4 moderate, 1 high)
```

Typecheck:

```text
$ npm run typecheck

> echoctl@0.1.0-beta.1 typecheck
> tsc --noEmit
```

Lint:

```text
$ npm run lint

> echoctl@0.1.0-beta.1 lint
> eslint . --max-warnings 0 && npm run lint:task-state

> echoctl@0.1.0-beta.1 lint:task-state
> python3 tools/task-state/lint.py
```

Python and shell syntax:

```text
$ python3 -m py_compile tools/review-queue/request.py tools/review-queue/combine.py && bash -n tools/review-queue/_run_reviewer.sh tools/review-queue/push-with-retry.sh
```

Targeted formatting:

```text
$ npx prettier --check <touched TS/JSON files>
Checking formatting...
All matched files use Prettier code style!
```

Focused regression:

```text
$ npx vitest run tests/echo-home/paths.test.ts tests/cli/orchestration.test.ts tests/coord/paths-resolution.test.ts tests/coord/coord-invoke-input-validation.test.ts tests/coord/coord-invoke-spawns-wrapper.test.ts tests/coord/coord-invoke-fire-and-forget.test.ts tests/coord/coord-invoke-cwd-independent.test.ts tests/coord/causality-reviewer-invoked-before-tick-start.test.ts tests/review-queue/request.test.ts tests/review-queue/combine.test.ts tests/review-queue/reviewer-readonly.test.ts tests/review-queue/push-with-retry-cwd-agnostic.test.ts tests/review-queue/reviewer-bindings.test.ts

Test Files  13 passed (13)
Tests  129 passed (129)
Duration  136.18s
```

Diff hygiene:

```text
$ git diff --check
```

Repo-wide formatting note:

```text
$ npm run format:check
Code style issues found in 104 files. Run Prettier with --write to fix.
```

This is pre-existing unrelated formatting debt. I did not format unrelated files; the targeted touched-file Prettier check passed.

## Open Questions for Founder

None.

## Drift Events

None.

## Previous-Attempt State

Not a resumed run.
