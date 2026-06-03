---
item_id: "2026-06-02-087b-reviewer-child-readonly-migration"
round: 2
reviewer: "codex-ops"
artifact_sha: "8f718f35fc1d7d8f6ee2c78165116d66e376d32a"
completed_at: '2026-06-03T06:32:07Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md:64-68"
    finding: "The spec flips codex/codex-ops to read-only after moving only the canonical <reviewer>.md publish path, but it does not explicitly move the rest of the current reviewer-loop side effects out of the child or require a write-free child happy path. In the live prompt, the child still performs operations like git pull/rebase and materializing the artifact to a temp file before it ever emits review content; under --sandbox read-only those writes can fail at 03:00 and produce rc!=0/empty stdout instead of a review. AC5 should require the wrapper to prepare/pass an immutable review packet to the child, or otherwise prove the migrated prompt can review a real request under read-only without any child-side writes except stdout."
  - severity: "medium"
    where: "backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md:65-68"
    finding: "AC2 says rc!=0, empty stdout, and schema-invalid stdout produce a durable queue-error and are not an infinite re-poll, but the spec does not name the queue-state transition that makes that true. A queue-error row by itself leaves the launchd fallback predicate unchanged: no codex-ops.md, no combined.md, reviewer still in the roster, so the next tick selects the same broken round again and can starve later reviews while appending repeated diagnostics. Add an explicit terminal marker/synthetic reviewer response/bounded retry state and an AC5 test that the next scan does not reselect the same failed capture forever."
---

## Codex-Ops Review

Verdict: `pushback`.

The r2 edits fixed the earlier ownership direction: wrapper-owned publish/lifecycle is now the right target, stdout is scoped as an existing 087 capture kind, and the actual codex/codex-ops argv sandbox flip is called out. The remaining blockers are runtime-state issues around what the read-only child is still allowed to do and how a failed capture leaves the queue eligible for the next unattended tick.
