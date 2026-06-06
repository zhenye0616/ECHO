---
item_id: "2026-06-05-094-ci-burn-reduction-paths-ignore"
round: 2
reviewer: "codex-ops"
artifact_sha: "99f56455533ee164aaf156b11adba971bc288603"
completed_at: '2026-06-06T00:05:34Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC2b - required-checks ground truth recorded"
    finding: "AC2b accepts 403/404 from the branch-protection API as sufficient proof that required checks are absent. In unattended builder environments, a 403 can also be an auth or token-scope failure, which would leave the PR-stranding risk unverified. Patch AC2b to require recording the HTTP status plus response body, and only accept a plan/feature-unavailable 403 or true 404; permission/scope-shaped 403s must be escalated in agent_notes."
  - severity: "medium"
    where: "Locked decision 1 / AC1 / AC2"
    finding: "The spec promises that any mixed push containing a non-ignored file still fires CI, but GitHub path filters are evaluated from a bounded changed-file diff. A large mixed bookkeeping-plus-code push can silently skip CI if the non-ignored file falls outside the evaluated file set. Patch the spec to record this operational limit and require an operator-visible guard or run-log note when a code-bearing commit is bundled with a large ignored-path file set."
---
