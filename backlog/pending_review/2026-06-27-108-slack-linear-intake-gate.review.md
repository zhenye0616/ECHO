---
item_id: 2026-06-27-108-slack-linear-intake-gate
verdict: merge as-is
reviewed_at: '2026-06-27T23:11:52Z'
test_counts:
  passed: 36
  failed: 0
producer: review-pending-orchestrator
---
## Verdict
Independent review (Claude code-reviewer subagent; did NOT write the code) verdict: merge as-is. Ground-truth HEAD matches recorded head_sha 531486a3. All AC1-AC6 and all binding refinements R1-R9 are implemented and backed by tests that exercise the load-bearing invariants (not assertion-only): R4/R7 fail-closed needs-reconcile with no recover-by-read and no second create; R5/R8 de-dupe by Slack event_id not static action_id; R9 unmapped project asks from known projects; AC6 confirmed NO new Slack capture source (no src/capture/ diff). 36/36 responder tests pass, typecheck + lint + git diff --check clean. Zero drift (all 11 changed files on files_to_modify). Merge to current main is clean (main advanced only one backlog-state commit, no code overlap). No pre-merge blockers.

## Pre-merge fixups
- [ ] (none — no blocking fixups; merge as-is)

## Expected merge conflicts
- (clean) — merge-base..main is one backlog-state-only commit; no overlap with any code file in files_to_modify. Standard --no-ff merge, no manual conflict resolution expected.

## Follow-up items (defer, do not block merge)
- In-process-only draft lock (intake-draft-store.ts:235-253): exactly-once holds within a single responder process only; if a second responder process is ever introduced, add a cross-process guard (lockfile/OS-level) or document the single-process constraint in the runbook. Consistent with the 107 draft-store precedent.
- Plain-English extraction is label-dependent (brain.ts): why/clientOutcome/doneWhen/evidence need labeled lines; genuinely unlabeled prose triggers extra follow-up rounds. Upgrade toward true free-form extraction once a real non-technical teammate dogfoods it (feeds the After-Completion validation signal).
- Redelivery double-post: a Socket-Mode message redelivery re-posts the ACK and re-runs the deterministic brain before the event_id dedup short-circuits. Duplicate cards are prevented; duplicate ack message is not. Guard the ACK re-post + brain re-run behind the event_id dedup.
- already_created confirm re-posts the receipt (idempotent on the Linear create; duplicate Slack message only). Post once or use an already-created variant.
