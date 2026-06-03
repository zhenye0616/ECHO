---
backlog_item: 2026-06-02-087-reviewer-invocation-argv-contract
agent_run_started: 2026-06-03T04:21:01Z
agent_run_ended: 2026-06-03T04:52:37Z
status: ready_for_review
test_status: passing
---

# Agent run: 2026-06-02-087-reviewer-invocation-argv-contract

## What I implemented

Implemented the narrow reviewer invocation argv contract from 087:

- Added `tools/review-queue/reviewer-bindings.json` with codex, cursor, codex-ops, and claude bindings.
- Added `tools/review-queue/schemas/reviewer-bindings.schema.json`.
- Reworked `_reviewer_gate.py` so runtime argv/stdin resolution comes from reviewer-bindings.json, while preserving legacy roster validation and compatibility diagnostics.
- Reworked `_run_reviewer.sh` to resolve NUL-delimited argv into a Bash array, check gate rc before reading argv, preflight argv[0], and execute `echo_effect ... "${INVOKE_ARGV[@]}" < "$STDIN_FROM"` without `bash -c`.
- Reworked `_install_reviewer_launchd.sh` to preflight the binding argv instead of `_reviewer_gate.py --print invoke_command`.
- Updated `coord_invoke` wording to document that the spawned wrapper resolves child argv from reviewer-bindings.json.
- Updated review-queue setup docs to describe the binding model and current `danger-full-access` + child self-commit reality, with 087b as the read-only/wrapper-owned successor.
- Added focused tests for schema parsing, behavior preservation, prompt stdin routing, NUL argv handoff, no shell-string runtime path, invalid binding failure, and npm package inclusion.

## Files modified

Feature branch: `agent/reviewer-invocation-argv-contract`

Head SHA at handoff: `5083f9d5cee2621170881b62ccba542dccf54432`

- `tools/review-queue/reviewer-bindings.json`
- `tools/review-queue/schemas/reviewer-bindings.schema.json`
- `tools/review-queue/_reviewer_gate.py`
- `tools/review-queue/_run_reviewer.sh`
- `tools/review-queue/_install_reviewer_launchd.sh`
- `src/mcp/tools/coord-invoke.ts`
- `package.json`
- `docs/review-queue-setup.md`
- `tests/review-queue/reviewer-bindings.test.ts`

Main handoff artifacts:

- `backlog/pending_review/2026-06-02-087-reviewer-invocation-argv-contract.md`
- `backlog/task-state/2026-06-02-087-reviewer-invocation-argv-contract/builder.md`
- `raw/internal/agent-runs/2026-06-02-2026-06-02-087-reviewer-invocation-argv-contract.md`

## Decisions made during implementation

- Kept 087 behavior-preserving: codex and codex-ops record `agent_sandbox: danger-full-access` and `commit_policy: child`; no read-only flip and no wrapper-owned commit migration.
- Kept `reviewers.json` and `_reviewers.py` unchanged. `_reviewer_gate.py` still uses the roster for reviewer identity/mode validation, but runtime child argv/stdin resolution comes from reviewer-bindings.json.
- Preserved deprecated `--print invoke_command` as a compatibility diagnostic generated from bindings, because existing 056 smoke tests use it as a guard against invoking a real vendor CLI. `_run_reviewer.sh` and `_install_reviewer_launchd.sh` no longer call it.
- Added an explicit `ECHO_REVIEWER_BINDINGS_CONFIG` override for binding fixtures. Existing `ECHO_REVIEWERS_CONFIG` smoke fixtures are bridged in the gate only to avoid accidental real CLI invocation during legacy tests.
- Did not move coord-roles SLA config, alter reviewer schemas, alter reviewer prompts, add new capture behavior, or touch 087b scope.

## Acceptance criteria status

- AC1: complete. New binding file and schema added; package manifest includes the binding file.
- AC2: complete. Runtime wrapper/installer use binding argv with NUL-delimited Python-to-Bash handoff and stdin_from prompt redirection; the `bash -c "$INVOKE_CMD"` path is gone from runtime scripts.
- AC3: complete. Docs describe reviewer-bindings.json, current danger-full-access child execution, current child self-commit behavior, and 087b as the future read-only/wrapper-owned migration.
- AC4: complete. Added `tests/review-queue/reviewer-bindings.test.ts`; full suite, lint, typecheck, sync, shell syntax, and diff hygiene are green.
- AC5: complete. Changes are limited to `files_to_modify`; no sandbox flip, no commit ownership move, no coord-roles SLA migration.

## Tests run

```text
$ bash -n tools/review-queue/_run_reviewer.sh
<no output; exit 0>

$ bash -n tools/review-queue/_install_reviewer_launchd.sh
<no output; exit 0>

$ python3 -c "import ast,pathlib; ast.parse(pathlib.Path('tools/review-queue/_reviewer_gate.py').read_text())"
<no output; exit 0>

$ env REVIEWER_NAME=codex WT=/tmp/wt python3 tools/review-queue/_reviewer_gate.py --print stdin_from
/tmp/wt/.claude/commands/review-queue-codex.md

$ env REVIEWER_NAME=codex WT=/tmp/wt python3 tools/review-queue/_reviewer_gate.py --print argv_nul
codex<NUL>exec<NUL>-C<NUL>/tmp/wt<NUL>--sandbox<NUL>danger-full-access<NUL>-<NUL>

$ npx vitest run tests/review-queue/reviewer-bindings.test.ts
Test Files  1 passed (1)
Tests  8 passed (8)

$ npx vitest run tests/review-queue/n-reviewer-framework.test.ts tests/review-queue/045-smoke-gate-fail-closed.test.ts tests/review-queue/056-claude-reviewer-onboarding.test.ts
Test Files  3 passed (3)
Tests  39 passed (39)

$ npm test
Test Files  143 passed | 1 skipped (144)
Tests  1513 passed | 21 skipped (1534)

$ npm run lint
eslint . --max-warnings 0 && npm run lint:task-state
<no errors; exit 0>

$ npm run typecheck
tsc --noEmit
<no output; exit 0>

$ tools/sync-skills.sh --check
OK: all Claude command adapters match canonical skills/

$ git diff --check
<no output; exit 0>
```

Note: `python3 -m py_compile tools/review-queue/_reviewer_gate.py` was not used as the final syntax check because the sandbox denied writing `tools/review-queue/__pycache__`. The AST parse above validates syntax without bytecode writes.

## Open questions for founder

None.

## Drift events caught

- I avoided implementing the 087b read-only-child + wrapper-owned-commit migration.
- I avoided editing `reviewers.json`, `_reviewers.py`, and `reviewers-config.schema.json`; their legacy `invoke_command` field remains intact and validated.
- I cleaned duplicate implementation files from the main checkout before handoff so main only carries backlog/run-log metadata for review.
