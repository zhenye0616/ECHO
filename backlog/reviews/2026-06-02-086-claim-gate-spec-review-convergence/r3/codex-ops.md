---
item_id: "2026-06-02-086-claim-gate-spec-review-convergence"
round: 3
reviewer: "codex-ops"
artifact_sha: "ac3d50a0944b2c1deea15a1803dff7432c724daf"
completed_at: '2026-06-02T20:10:15Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md:81-83,95-99"
    finding: >-
      The case-(c) fix avoids immediate self-stale by writing spec_review: waived with no sha and making waived skip the AC3 staleness check, but that turns a watcher-issued verification waiver into a permanent fail-open marker. If the spec is edited after the case-(c) terminal commit and before an unattended builder tick claims it, blocked.py has no reviewed-content anchor to compare against and will still treat the item as claimable. Founder-written waived can be an intentional manual bypass, but watcher case-(c) only certifies the exact post-patch content. Add a sha-backed watcher-waived/converged marker or equivalent clearing/staleness rule so post-waiver substantive edits re-block.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md:13,21,81-83,95"
    finding: >-
      The r2 body and AC1 now say case (c) writes spec_review: waived, but the frontmatter guidance still tells the builder to update both watcher terminal paths with spec_review: converged plus spec_review_sha, and spec_refs still says the gate must treat both terminal proceed-class verdicts as converged. If the builder follows those older operational instructions while editing skills/review-queue-watch.md, the original case-(c) self-stale runtime failure comes back. Update the frontmatter/spec_ref text to match the two-marker contract before releasing the item to a builder.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r2 patch closes the immediate case-(c) self-stale path, but it introduces an unanchored watcher-waiver path that can fail open after later spec edits. There is also stale frontmatter guidance that still points the builder at the old single-marker behavior.
