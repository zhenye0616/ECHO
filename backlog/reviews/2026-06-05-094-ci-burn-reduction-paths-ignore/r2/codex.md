---
item_id: "2026-06-05-094-ci-burn-reduction-paths-ignore"
round: 2
reviewer: "codex"
artifact_sha: "99f56455533ee164aaf156b11adba971bc288603"
completed_at: '2026-06-06T00:05:35Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC2b"
    finding: "The required-checks re-verification still is not fully implementable: `gh api repos/{owner}/{repo}/branches/main/protection` exits nonzero for the expected 403/404 path, and 403 is only conclusive if the response body shows plan/branch-protection unavailability rather than auth/scope failure. Patch AC2b to give the exact capture command/flags, require logging status plus response body, and require stop/escalation if the result is 200 with required checks or an ambiguous 403."
  - severity: "medium"
    where: "AC2b / files_to_modify / AC5"
    finding: "AC2b requires a standing note for the future aggregate-gate item, but the spec does not name the artifact to edit and AC5 only permits workflow trigger edits plus lifecycle files. Patch the spec to either name an allowed durable path, such as `backlog/_followups.md`, and add it to `files_to_modify`/AC5, or explicitly say the note is satisfied by `agent_notes`/run log if no durable repo edit is intended."
---

## Review Notes

The r1 tag-safety carve-out is narrow enough and resolves the trigger-only contradiction without opening general job-edit scope. AC3 gives the builder a clear decision point: verify tag/path semantics first, then only use the minimal release.yml exception if needed.
