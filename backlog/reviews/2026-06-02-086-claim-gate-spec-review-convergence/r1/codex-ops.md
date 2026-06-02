---
item_id: "2026-06-02-086-claim-gate-spec-review-convergence"
round: 1
reviewer: "codex-ops"
artifact_sha: "a4be8f4012d8e9c93449df3dda4ac8b429d82f95"
completed_at: '2026-06-02T19:46:36Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md:64-75; backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md:87-89"
    finding: >-
      The freshness contract can block every successfully reviewed item at runtime. AC1 says the watcher writes spec_review/spec_review_sha into the item frontmatter in the terminal commit, while spec_review_sha is the pre-marker spec_commit_sha the round reviewed; AC3 then allows a content/blob comparison against that SHA. Under that implementation, the watcher marker commit itself makes the current item content differ from the reviewed artifact, so blocked.py reports spec-edited-after-review immediately after convergence and the item is never claimable. Patch the spec to choose one deterministic freshness model that accounts for the marker write (for example compare content with watcher-owned marker fields ignored, or store both reviewed_artifact_sha and marker_commit_sha, or require the git-log latest-touching-commit strategy) and pin that exact model in AC3/AC6 tests.
  - severity: "high"
    where: "backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md:10; backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md:20; tools/blocked.py:59-117; tools/blocked.py:174-181"
    finding: >-
      The proposed gate can fail open on the current production frontmatter shape. The spec relies on non-empty requested_reviewers, but the pinned selector parser only special-cases empty inline lists and multiline dash lists; a live line like requested_reviewers: ["codex", "codex-ops"] is parsed as a scalar string, and load_items drops requested_reviewers and other arbitrary frontmatter entirely from the item record. If the builder follows the spec's "no parser change" assumption, reviewed-required specs keep looking unreviewed-by-design or invisible to the helper and remain claimable before convergence. Patch AC2/AC6 to require blocked.py to preserve requested_reviewers plus spec_review/spec_review_sha in loaded item data, parse the existing inline-list roster shape correctly, and test against an inline requested_reviewers fixture matching this spec and 085.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md:71-75; backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md:91-92"
    finding: >-
      The validation contract does not cover the partial-marker failure mode that matters operationally: spec_review: converged with a missing spec_review_sha. AC5 only rejects malformed spec_review_sha when it is present, so a failed watcher edit or manual repair could leave a converged marker without the stale-proof value and the claim gate may unblock without any freshness check. Patch AC5/AC6 so converged requires a present valid spec_review_sha, missing SHA is reported as a blocked/validation failure, and waived remains the only explicit no-SHA bypass.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The spec closes the right operational gap, but the marker and parser contracts need tightening before a builder implements it. As written, one valid implementation can leave every converged item permanently blocked, while another can fail open for today's inline `requested_reviewers` frontmatter.
