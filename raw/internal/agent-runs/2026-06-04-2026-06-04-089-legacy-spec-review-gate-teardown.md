---
backlog_item: 2026-06-04-089-legacy-spec-review-gate-teardown
agent_run_started: 2026-06-05T06:04:08Z
agent_run_ended: 2026-06-05T06:16:30Z
status: ready_for_review
test_status: passing
branch: agent/legacy-spec-review-gate-teardown
head_sha: c4150c62a98c2f73c17308a2c4690e334d3cb9f4
---

# Agent Run: 089 Legacy Spec Review Gate Teardown

## What I Implemented

Removed the legacy `spec_review` / `spec_review_sha` claim path from `tools/blocked.py`. A `ready/` item is now claimable only when `ready_content_sha` exists and matches the normalized content; legacy fields remain excluded from the seal hash for stability but are otherwise inert.

Reworked the selector harness around that contract, removed the `--spec-review-sha` CLI alias after a live caller sweep found only `tools/blocked.py`, cleaned the `promote.py` insertion regex, removed stale watcher/builder docs prose, and regenerated `.claude/commands/review-queue-watch.md` from the canonical skill.

## Files Modified

- `tools/blocked.py` — removed legacy fallback, legacy validation, helper alias, and CLI alias; preserved `CONTENT_MARKER_FIELDS`.
- `tools/test_blocked.py` — reworked legacy tests to assert fail-closed missing seals and lenient legacy-field ignore; added canonical CLI help/alias coverage.
- `tools/review-queue/promote.py` — removed the dead `spec_review_sha` branch from the ready seal insertion point.
- `skills/review-queue-watch.md` — removed legacy marker-write branch prose.
- `.claude/commands/review-queue-watch.md` — regenerated adapter copy via `tools/sync-skills.sh`.
- `docs/AGENT_INSTRUCTIONS.md` — removed the transitional `spec_review` caveat from builder no-write rules.

## Decisions Made During Implementation

### Decision 1: Drop the CLI Alias

- **Options considered:** keep `--spec-review-sha` for compatibility, or remove it now.
- **Chose:** remove it now.
- **Why:** AC3 gated removal on a live caller sweep. The sweep over `tools/`, `skills/`, and `.claude/commands/` excluding historical artifacts found only `tools/blocked.py` itself.
- **Worth founder review?** No — directly specified by AC3.

### Decision 2: Keep Parsing but Stop Projecting Legacy Fields

- **Options considered:** special-case legacy fields during frontmatter parsing, or simply stop loading/validating them while leaving the generic parser unchanged.
- **Chose:** generic parsing unchanged; `load_items()` no longer projects `spec_review` / `spec_review_sha`.
- **Why:** The marker names must still be excluded from `normalized_content_sha()` for seal stability, but they no longer participate in validation or claimability.
- **Worth founder review?** No — matches locked decision 2 and AC3.

## Acceptance Criteria Status

- [x] AC1 — legacy claim path removed; missing `ready_content_sha` fails closed with `missing-ready-content-sha`.
- [x] AC2 — `spec_review` / `spec_review_sha` are no longer validated; arbitrary values pass `--validate` and do not unblock without a seal.
- [x] AC3 — helper and CLI cleanup complete; `CONTENT_MARKER_FIELDS` unchanged; caller sweep found no live alias users; `promote.py` regex cleaned.
- [x] AC4 — docs and watcher skill coherent; `.claude` adapter regenerated; sync check green.
- [x] AC5 — required checks passed after one scoped fix to `promote.py` indentation.
- [x] AC6 — no drift: touched only the six listed files; did not change proposed-stage, promotion/bounce/identity logic, request/dispatch, backlog index, docs/BACKLOG, wiki, or historical records.

## Tests Run

Initial npm commands before dependency install failed because the worktree had no `node_modules`:

```text
> echoctl@0.1.0 lint
> eslint . --max-warnings 0 && npm run lint:task-state

sh: eslint: command not found

> echoctl@0.1.0 typecheck
> tsc --noEmit

sh: tsc: command not found

> echoctl@0.1.0 test
> vitest run

sh: vitest: command not found
```

Installed pinned dependencies:

```text
npm warn deprecated prebuild-install@7.1.3: No longer maintained. Please contact the author of the relevant native addon; alternatives are available.

added 282 packages, and audited 283 packages in 3s

89 packages are looking for funding
  run `npm fund` for details

11 vulnerabilities (9 moderate, 1 high, 1 critical)
```

Focused selector harness:

```text
Ran 35 tests in 6.341s

OK
```

Live backlog / generated-index / adapter / whitespace checks:

```text
OK: 89 items across all stages, no errors
backlog_index.py fixture check passed.
OK: all Claude command adapters (project + global ~/.claude/commands) match canonical skills/
```

First full `npm test` run failed only in `promote.test.ts` because the `promote.py` regex cleanup had a Python indentation error:

```text
IndentationError: expected an indented block after 'for' statement on line 79

Test Files  1 failed | 145 passed | 1 skipped (147)
Tests  5 failed | 1550 passed | 21 skipped (1576)
```

After fixing that indentation, targeted promote tests passed:

```text
Test Files  1 passed (1)
Tests  5 passed (5)
```

Final full suite:

```text
Test Files  146 passed | 1 skipped (147)
Tests  1555 passed | 21 skipped (1576)
Duration  118.11s
```

Final lint and typecheck:

```text
> echoctl@0.1.0 lint
> eslint . --max-warnings 0 && npm run lint:task-state

> echoctl@0.1.0 lint:task-state
> python3 tools/task-state/lint.py

> echoctl@0.1.0 typecheck
> tsc --noEmit
```

## Open Questions for Founder

None.

## Drift Events

None. I caught and corrected one execution-context mistake: initial manual patches landed in the main checkout instead of the isolated worktree. I moved exactly that diff into the agent worktree and restored `main` before testing/committing.

## Next Suggested Backlog Items (Don't Auto-Create)

- Update `tools/mcp-integration-smoke.sh` to tolerate the current coord/task-state MCP tool surface or split daemon reachability from exact tool-set assertions. The pre-claim MCP smoke reached the daemon but failed on a stale expected-tool-set check.
