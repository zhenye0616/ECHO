---
item_id: "2026-06-04-089-legacy-spec-review-gate-teardown"
round: 1
reviewer: "codex-ops"
artifact_sha: "cd8b4ff087209e76930cf427ae01efab0c0cd824"
completed_at: '2026-06-05T05:43:52Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-04-089-legacy-spec-review-gate-teardown.md:98"
    finding: "AC5 allows the no-live-spec_review guard to be only a unit test. That does not protect the unattended claim queue at merge time: if a ready/claimed/pending_review item with legacy spec_review appears after the fixture passes, removing spec_review from CONTENT_MARKER_FIELDS can change its seal hash and leave the item unclaimable. Require a live-repo preflight in python3 tools/blocked.py --validate, or an equivalent required AC5 command, with an operator-visible failure before this teardown can ship."
  - severity: "medium"
    where: "backlog/proposed/2026-06-04-089-legacy-spec-review-gate-teardown.md:90"
    finding: "AC3 drops the --spec-review-sha CLI alias but only requires a help/assertion for the retained flag. In an unattended launchd/reviewer environment, any stale script or generated command still passing the old alias will fail with an argparse error at runtime. Add a repo-wide caller check for --spec-review-sha across tools/, skills/, .claude/commands/, and launchd/script surfaces, excluding historical records, and require either all live callers are updated or the alias remains until the caller sweep is green."
---
