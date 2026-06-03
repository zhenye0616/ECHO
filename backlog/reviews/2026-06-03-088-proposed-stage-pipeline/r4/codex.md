---
item_id: "2026-06-03-088-proposed-stage-pipeline"
round: 4
reviewer: "codex"
artifact_sha: "e13d3df2ed885ad5c4519f6202d01a003b87c14f"
completed_at: '2026-06-03T21:55:00Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:125-138,164-167"
    finding: >-
      The new content-identity gate always compares the current proposed spec to the terminal round's request.spec_commit_sha, but AC9 says the review-round mechanics are unchanged and the current watcher still has a terminal verification-waived branch for patches applied after a review request. In that existing branch, the current spec necessarily differs from request.spec_commit_sha, so promote.py would refuse an otherwise-approved terminal path or a builder would have to weaken the gate ad hoc. Patch AC4/watch instructions/tests to either forbid verification-waived promotion after any spec edit under the proposed-stage path and dispatch another round instead, or define an explicit waiver identity source/marker that promote.py can validate without certifying arbitrary unreviewed bytes.
  - severity: "medium"
    where: "backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:11-31,147-153"
    finding: >-
      AC6 requires migrating the live 087b ready item from spec_review: waived to ready_content_sha, and the current repo still has backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md with spec_review: waived. That file is only listed as a spec_ref, not in files_to_modify. A strict builder therefore cannot satisfy the migration and final legacy spec_review removal without an out-of-list backlog-item edit; if they skip it, 087b becomes fail-closed/non-claimable after the new gate. Add the 087b backlog item to files_to_modify with a migration-only note and add a test assertion that its ready_content_sha keeps it claimable.
---

# Codex Review

Verdict: `proceed_after_patches`.

The r4 artifact fixes the two focus-hint items I checked first: the edited-after-request mismatch path is now refuse-only with no inline dispatch, and the generated `.claude/commands/*.md` adapter copies are listed as generated outputs. I found two remaining implementability gaps.

## Findings

1. MEDIUM - The content-identity gate conflicts with the existing verification-waived terminal branch.
   Current watcher mechanics still allow path (c): apply a mechanical spec patch after a review request, waive the verification round, and terminalize. Under this spec, promotion then compares the patched file to the pre-patch `request.spec_commit_sha` and must refuse. The spec should either remove that branch for proposed-stage promotion or define a precise waiver identity contract that keeps the gate meaningful.

2. MEDIUM - The live 087b migration file is not authorized for editing.
   AC6 explicitly says to replace 087b's `spec_review: waived` with a current `ready_content_sha`; the current repo confirms that legacy field is still present. Because the file is only in `spec_refs`, a builder following `files_to_modify` cannot do the required migration without escalating or drifting.
