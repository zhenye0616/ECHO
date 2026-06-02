---
item_id: "2026-06-02-086-claim-gate-spec-review-convergence"
round: 2
reviewer: "codex"
artifact_sha: "920ce51937959b65f9ba9a0ea58fecd39222a19e"
completed_at: '2026-06-02T20:00:39Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md:79-81,91-93; skills/review-queue-watch.md:269-282"
    finding: >-
      The normalized staleness patch still contradicts the existing terminal case-(c) path. The spec now requires spec_review_sha to be the round's reviewed spec_commit_sha, and AC3 blocks whenever the current normalized content differs from that SHA. That works for zero-patch convergence because only the watcher-owned markers are added, but case (c) is explicitly 'Patches applied - verification explicitly waived': after even a comment-only spec patch, the current body/frontmatter differs from the reviewed request SHA, so blocked.py must report spec-edited-after-review immediately after the watcher writes spec_review: converged. Patch the spec to either exclude case (c) from converged, use spec_review: waived for verification-waived patches, or define spec_review_sha for case (c) as the post-patch/pre-marker content SHA with a marker-only-fresh test covering that branch.
---

## Verdict

`proceed_after_patches`

## Findings

1. **HIGH - Verification-waived patch convergence is self-blocking.** The r1 normalization fix resolves the marker-only self-reference for zero-patch convergence, and the parser/test/validation patches are now grounded in the current `tools/blocked.py` and `tools/test_blocked.py` surfaces. The remaining issue is the case-(c) terminal path: the watcher skill describes it as patches-applied but verification-waived, while the patched spec requires `spec_review_sha` to remain the reviewed request SHA. Any actual spec patch changes reviewed substance, so AC3 would block the item as `spec-edited-after-review` immediately after the terminal `converged` marker is written.

Patch options: make case (c) write `spec_review: waived`, stop treating case (c) as `converged`, or define a separate post-patch/pre-marker content SHA for case (c) and pin it with the same marker-only-fresh test. As written, the builder can satisfy AC1 and AC3 independently and still leave the rare but documented terminal path unclaimable.
