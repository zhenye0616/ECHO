---
backlog_item: 2026-06-02-087b-reviewer-child-readonly-migration
agent_run_started: 2026-06-03T17:49:29Z
agent_run_ended: 2026-06-03T17:53:49Z
status: needs_input
test_status: skipped
---

# Agent Run: 087b Reviewer-child Read-only Migration

## What I Implemented

No implementation changes were made. I claimed the item, created the initial Codex `builder.md` task-state pointer, created the feature branch/worktree, loaded the mandatory builder context and the item context, then stopped on a write-scope blocker before editing code.

## Files Modified

- `backlog/claimed/2026-06-02-087b-reviewer-child-readonly-migration.md` -> `backlog/pending_review/2026-06-02-087b-reviewer-child-readonly-migration.md` on `main` for claim and blocked handoff.
- `backlog/task-state/2026-06-02-087b-reviewer-child-readonly-migration/builder.md` on `main` for the initial builder pointer and final escalated handoff refresh.
- Branch: `agent/reviewer-child-readonly-migration`
- Head SHA pushed: `388b8cf0e96020bed185e0759b44f87ef45b59ca`

## Decisions Made During Implementation

### Decision 1: Stop before widening `files_to_modify`

- **Options considered:** modify the existing 087 binding tests anyway; add only a new `reviewer-readonly.test.*`; stop and escalate.
- **Chose:** stop and escalate.
- **Why:** AC3/AC5 require flipping codex/codex-ops bindings from `danger-full-access`/`child` to `read-only`/`wrapper`, but `tests/review-queue/reviewer-bindings.test.ts` currently asserts the old behavior and is not listed in `files_to_modify`. Creating only a new `reviewer-readonly.test.*` would leave the existing suite red after the required config flip.
- **Worth founder review?** Yes. The likely fix is to add `tests/review-queue/reviewer-bindings.test.ts` to `files_to_modify`, or explicitly allow updating existing 087 binding-contract tests.

## Acceptance Criteria Status

- [ ] AC1 - blocked before implementation because satisfying AC1 implies updating tests outside the listed write set.
- [ ] AC2 - blocked before implementation.
- [ ] AC3 - blocked before implementation; this is the AC that conflicts with existing unlisted test assertions.
- [ ] AC4 - blocked before implementation.
- [ ] AC5 - blocked before implementation; full `npm test` cannot be green if existing old-behavior assertions remain.
- [x] AC6 - no scope drift; stopped instead of widening the write set.

## Tests Run

No test suite was run because implementation stopped at the scope blocker.

Evidence command:

```text
$ rg -n "danger-full-access|commit_policy|records current sandbox|preserves current reviewer" tests/review-queue/reviewer-bindings.test.ts tools/review-queue/reviewer-bindings.json
tools/review-queue/reviewer-bindings.json:8:      "argv": ["codex", "exec", "-C", "{{WT}}", "--sandbox", "danger-full-access", "-"],
tools/review-queue/reviewer-bindings.json:11:      "agent_sandbox": "danger-full-access",
tools/review-queue/reviewer-bindings.json:12:      "commit_policy": "child",
tools/review-queue/reviewer-bindings.json:47:      "argv": ["codex", "exec", "-C", "{{WT}}", "--sandbox", "danger-full-access", "-"],
tools/review-queue/reviewer-bindings.json:50:      "agent_sandbox": "danger-full-access",
tools/review-queue/reviewer-bindings.json:51:      "commit_policy": "child",
tests/review-queue/reviewer-bindings.test.ts:93:  it('records current sandbox and child commit reality without flipping behavior', () => {
tests/review-queue/reviewer-bindings.test.ts:96:      expect(b.agent_sandbox).toBe('danger-full-access');
tests/review-queue/reviewer-bindings.test.ts:97:      expect(b.commit_policy).toBe('child');
tests/review-queue/reviewer-bindings.test.ts:124:  it('preserves current reviewer executable, flags, worktree routing, and sandbox values', () => {
tests/review-queue/reviewer-bindings.test.ts:136:    const codexArgv = ['codex', 'exec', '-C', wt, '--sandbox', 'danger-full-access', '-'];
tests/review-queue/reviewer-bindings.test.ts:142:      expect(sandbox.stdout.trim()).toBe('danger-full-access');
```

## Open Questions for Founder

Should 087b be amended to include `tests/review-queue/reviewer-bindings.test.ts` in `files_to_modify`, or should the builder be explicitly allowed to update existing 087 binding-contract tests while adding `tests/review-queue/reviewer-readonly.test.*`?

## Drift Events Caught

None. This handoff is the drift prevention mechanism firing: the implementation needs a file outside the listed write set.

## Resume State

This was not a resumed run. The feature branch exists at `origin/agent/reviewer-child-readonly-migration` and currently contains only the claim commit; no code edits were made in the worktree.

---

## Run 2 (resumed at 2026-06-03T22:34:50Z)

## What I Implemented

Implemented the reviewer-child read-only migration for codex and codex-ops on branch `agent/reviewer-child-readonly-migration`.

The wrapper now owns request selection, duplicate/capture-failure exclusion, git sync, immutable review packet preparation, coord lifecycle, child stdout/stderr capture, final assistant-message extraction from `codex exec --json`, schema validation, canonical `<reviewer>.md` publication through `commit-reviewer-response.sh`, terminal capture-failure marker + `queue-errors.md` publication, and post-response dogfooding journal append. The codex/codex-ops child prompts are now content-only: read the packet from `$ECHO_REVIEW_PACKET_PATH`, reason, and emit final reviewer markdown; no child-side git, file writes, coord lifecycle, or journal writes.

Codex and codex-ops bindings now use `--sandbox read-only`, `agent_sandbox: read-only`, `commit_policy: wrapper`, and `capture.kind: stdout_json`. Claude and Cursor were not migrated; their skill/adapters received only the requested monthly-journal/no-HTML prose cleanup.

## Files Modified

- `tools/review-queue/reviewer-bindings.json` - flips codex/codex-ops runtime sandbox, commit policy, and capture shape.
- `tools/review-queue/_run_reviewer.sh` - adds the wrapper-owned publisher/capture/lifecycle path while preserving the legacy non-wrapper path.
- `tools/review-queue/commit-reviewer-response.sh` - makes usage/prose reviewer-generic for wrapper-owned calls.
- `skills/review-queue-codex.md`, `skills/review-queue-codex-ops.md` - content-only child prompt contracts.
- `skills/review-queue-claude.md`, `skills/review-queue-cursor.md` - prose cleanup only.
- `.claude/commands/review-queue-*.md` - regenerated adapters via `tools/sync-skills.sh`.
- `docs/review-queue-setup.md` - documents read-only child plus wrapper-owned commit for codex/codex-ops.
- `tests/review-queue/reviewer-bindings.test.ts` - updates the authorized binding assertions.
- `tests/review-queue/reviewer-readonly.test.ts` - adds wrapper happy-path and terminal capture-failure regression coverage.
- `tests/review-queue/056-claude-reviewer-onboarding.test.ts` - updated after explicit founder authorization when full-suite testing exposed its stale codex/codex-ops argv snapshot.
- Branch: `agent/reviewer-child-readonly-migration`
- Head SHA pushed: `05a7ef3ad712f3456bb3294362c25db62ea52068`

## Decisions Made During Implementation

### Decision 1: Keep wrapper publication in `_run_reviewer.sh`

- **Options considered:** introduce a new helper script for the wrapper-owned publisher; keep the publication flow in `_run_reviewer.sh` with small local helpers.
- **Chose:** keep it in `_run_reviewer.sh`.
- **Why:** the spec named `_run_reviewer.sh` as the wrapper handoff point and this keeps request selection, coord lifecycle, child spawn, capture parsing, validation, and publish outcome in one process boundary.
- **Worth founder review?** No.

### Decision 2: Use durable `<reviewer>.capture-failed` as the selector marker

- **Options considered:** retry counter; per-round terminal marker.
- **Chose:** per-round `<reviewer>.capture-failed` marker plus a bounded `queue-errors.md` diagnostic row, committed and pushed before exit.
- **Why:** it directly satisfies the no-reselect requirement without broadening into retry policy or watcher/combine native classification.
- **Worth founder review?** No.

### Decision 3: Update one unlisted stale test only after authorization

- **Options considered:** leave `tests/review-queue/056-claude-reviewer-onboarding.test.ts` failing; update the codex/codex-ops argv snapshot.
- **Chose:** update the stale argv snapshot after founder authorization in this run.
- **Why:** the test was asserting the old `--sandbox danger-full-access -` argv for codex/codex-ops; the migration necessarily changes that to `--sandbox read-only --json -`.
- **Worth founder review?** Already authorized.

## Acceptance Criteria Status

- [x] AC1 - codex/codex-ops child no longer writes/commits/pushes; wrapper owns selection, lifecycle, validation, canonical response commit, and post-response journal append.
- [x] AC2 - codex/codex-ops use `stdout_json`; wrapper parses the final assistant-message event; terminal capture failures write durable selector markers and bounded queue-error diagnostics before exit.
- [x] AC3 - codex/codex-ops runtime argv and metadata both use `read-only`; no codex/codex-ops binding retains `danger-full-access`.
- [x] AC4 - docs describe the read-only child plus wrapper-owned commit model for codex/codex-ops without claiming Claude/Cursor are migrated.
- [~] AC5 - focused/relevant tests, lint, typecheck, sync-skills, syntax, prettier, and diff hygiene passed. Default full `npm test` remains red due an unrelated load-sensitive MCP timeout that passes focused; see Tests Run.
- [x] AC6 - no new capture kind, no Claude/Cursor migration, no watcher/combine marker classification, no SLA/config drift.

## Tests Run

```text
$ bash -n tools/review-queue/_run_reviewer.sh
ok

$ bash -n tools/review-queue/commit-reviewer-response.sh
ok

$ tools/sync-skills.sh --check
OK: all Claude command adapters (project + global ~/.claude/commands) match canonical skills/

$ git diff --check
ok

$ npx prettier --check tests/review-queue/reviewer-bindings.test.ts tests/review-queue/reviewer-readonly.test.ts tests/review-queue/056-claude-reviewer-onboarding.test.ts
All matched files use Prettier code style!

$ npm run lint
passed

$ npm run typecheck
passed

$ npx vitest run tests/review-queue/reviewer-readonly.test.ts
2 passed

$ npx vitest run tests/review-queue/reviewer-bindings.test.ts tests/review-queue/reviewer-readonly.test.ts
10 passed

$ npx vitest run tests/review-queue/045-pre-link-yaml-validation.test.ts tests/review-queue/reviewer-bindings.test.ts tests/review-queue/reviewer-readonly.test.ts
15 passed

$ npx vitest run tests/review-queue/056-claude-reviewer-onboarding.test.ts
16 passed

$ npx vitest run tests/mcp/recent-calls-endpoint.test.ts
passed when focused
```

Full-suite caveat:

```text
$ npm test
Test Files  1 failed | 143 passed | 1 skipped
Tests       1514 passed | 21 skipped

FAIL tests/mcp/recent-calls-endpoint.test.ts
Error: Test timed out in 15000ms.
```

Focused rerun of `tests/mcp/recent-calls-endpoint.test.ts` passed, so this appears load-sensitive and unrelated to 087b. A retry with `npm test -- --testTimeout=30000` did not override that test's 15s timeout and ended with two load-sensitive failures:

```text
FAIL tests/mcp/recent-calls-endpoint.test.ts
Error: Test timed out in 15000ms.

FAIL tests/cli/shell-reachable.test.ts
AssertionError: daemon ... did not become healthy

Test Files  2 failed | 142 passed | 1 skipped
Tests       1513 passed | 21 skipped
```

`tests/cli/shell-reachable.test.ts` had passed in the default full-suite attempts; I did not change unrelated MCP/daemon tests.

## Open Questions for Founder

None blocking. Residual review caveat: decide whether to accept the handoff with the unrelated full-suite timeout, or spin a separate item for the load-sensitive `recent-calls`/daemon full-suite behavior.

## Drift Events Caught

- The listed `spec_refs` still pointed at `backlog/pending_review/2026-06-02-085-reviewer-invocation-contract.md`; by implementation time the file was in `backlog/complete/2026-06-02-085-reviewer-invocation-contract.md`. I read the complete-path file and did not edit the spec body.
- Updating `tests/review-queue/056-claude-reviewer-onboarding.test.ts` was outside the explicit file allow-list. I stopped, got founder authorization, and changed only the stale codex/codex-ops argv snapshot.

## Resume State

This run intentionally kept the prior escalation log and did not reuse any prior implementation state; the previous branch had contained only the claim/no-implementation commit. The new implementation commit is pushed at `05a7ef3ad712f3456bb3294362c25db62ea52068`.
