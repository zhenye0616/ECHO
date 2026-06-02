---
item_id: "2026-06-02-086-claim-gate-spec-review-convergence"
round: 1
reviewer: "codex"
artifact_sha: "a4be8f4012d8e9c93449df3dda4ac8b429d82f95"
completed_at: '2026-06-02T19:47:29Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md:64-75,87,89"
    finding: >-
      The staleness contract self-invalidates the moment the watcher writes the convergence metadata. AC1 says the terminal commit writes spec_review/spec_review_sha into the reviewed backlog item, while the Design says spec_review_sha is the pre-terminal spec_commit_sha that the round was pinned to and AC3 compares the current spec content to that SHA. A blob/content comparison will see the newly inserted frontmatter fields as an edit after review; the git-log alternative is also inconsistent because the latest commit touching the file becomes the terminal metadata commit, not spec_review_sha. Patch the spec to define a deterministic normalization, for example compare the current item to spec_review_sha after stripping only watcher-owned review metadata, or choose another non-self-referential reviewed-content token and test it.
  - severity: "high"
    where: "backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md:10,20,88"
    finding: >-
      The selector input assumption does not match tools/blocked.py's parser. The spec says parse_frontmatter already captures requested_reviewers as a list and therefore needs no parser change, but the current parser only handles [] and multi-line dash lists; the canonical inline form used by 085/086 parses as the string '["codex", "codex-ops"]'. If the builder follows the spec and writes a list-only helper, the live specs that this item is meant to protect can be treated as unreviewed-by-design and remain claimable. Require either inline-list parser support or an explicit normalization rule/test for string-valued inline reviewer lists.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md:17,92"
    finding: >-
      The test contract is misgrounded. The spec says blocked.py currently has no dedicated test file and points at a new tests/backlog/blocked-spec-review-gate.test.* path, but tools/test_blocked.py already exists and is the dedicated selector/validator unittest harness. Patch AC6 to extend or explicitly run that harness, or state why a Vitest wrapper is the new convention; otherwise the builder can add tests in a path that misses the existing selector regression suite.
---

## Verdict

`proceed_after_patches`

## Findings

1. **HIGH - Staleness self-invalidates after the watcher writes metadata.** AC1 makes the watcher mutate the reviewed backlog item by adding `spec_review` and `spec_review_sha`, but AC3 then asks `blocked.py` to compare the current item content to the pre-terminal `spec_commit_sha`. A blob comparison will always see the metadata write as a post-review edit, and the suggested git-log alternative also points at the terminal metadata commit rather than the reviewed SHA. The spec needs a concrete normalized comparison, or a different token, before this is implementable.

2. **HIGH - `requested_reviewers` parsing assumption is false for the repo's current frontmatter shape.** Current ready specs use inline lists such as `requested_reviewers: ["codex", "codex-ops"]`, but `tools/blocked.py` parses that as a string, not a list. The gate must either extend the parser or explicitly normalize this string form, with a regression test against the live inline shape.

3. **MEDIUM - AC6 points away from the existing blocked.py test harness.** `tools/test_blocked.py` already exists as the dedicated selector/validator test file. AC6 should either extend it and require `python3 tools/test_blocked.py`, or deliberately define a Vitest wrapper that exercises the same script. As written, the builder has an ambiguous test target.
