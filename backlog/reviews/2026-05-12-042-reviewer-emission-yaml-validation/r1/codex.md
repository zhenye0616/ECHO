---
item_id: 2026-05-12-042-reviewer-emission-yaml-validation
round: 1
reviewer: codex
artifact_sha: 11429386867b2c64912c6d0b73db746313fc1b4d
completed_at: '2026-05-12T23:36:09Z'
verdict: proceed_after_patches
findings:
- severity: high
  where: Acceptance Criteria AC2 + AC3, combined.md frontmatter contract
  finding: 'AC2 instructs the builder to emit `verdict: escalated`, but the current
    combined-response contract is `combined_verdict`; the schema also has `additionalProperties:
    false` and still requires `combined_verdict`. AC3 adds `reason`, `offending_response`,
    and `parse_error`, but it never updates the required verdict field or enum to
    make the AC2 document valid. A literal implementation will either fail `validate_frontmatter(...,
    "combined")` or produce a file downstream watcher logic will not understand. Patch
    the spec to name the exact `combined_verdict` value and schema enum change for
    malformed reviewer responses, or explicitly remove validation/watchers from this
    path and update the contract accordingly.'
- severity: medium
  where: Acceptance Criteria AC2b, malformed responses from both reviewers
  finding: The implementation text says to wrap each reviewer-response parse and compose
    the escalation on catch, but AC2b requires `offending_response` to list both malformed
    reviewer files when both are bad. With the current read order in `combine.py`,
    an immediate catch on `codex.md` would never parse `cursor.md`, so the required
    list cannot be produced. Patch AC2 to require collecting parse errors from all
    existing reviewer response files before writing `combined.md`, and define the
    ordering plus `parse_error` shape for multiple failures.
- severity: medium
  where: Acceptance Criteria AC2 implementation vs AC2a test, offending_response path
  finding: 'AC2 says `offending_response` is the path relative to the repo root, but
    AC2a asserts `offending_response: r1/cursor.md`. For this queue layout the repo-root-relative
    path would be `backlog/reviews/<item_id>/r1/cursor.md`; `r1/cursor.md` is only
    relative to the item directory. Pick one path base in the spec and tests so builders
    do not have to guess.'
---

# Codex Review

The failure mode is real and the proposed containment is the right shape. The spec needs the contract patches above before implementation, mainly so the malformed-response `combined.md` can pass schema validation and be understood by the existing watcher path.
