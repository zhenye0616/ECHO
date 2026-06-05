---
item_id: "2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor"
round: 1
reviewer: "codex"
artifact_sha: "da47a231eacdec5670f4c8a30042348f0f836928"
completed_at: '2026-06-05T23:19:19Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Acceptance Criteria / AC4 - packaged rehearsal is the gate"
    finding: "The rehearsal requires a clean npm prefix, but not an isolated HOME/CODEX_HOME/ECHO_HOME. That can still read pre-existing ~/.codex skills and mask the WIR-06/SKILL-02 second-hop failure this item is meant to catch. Patch AC4 to require a temp home/codex home/echo home, or an equivalent env-isolated run, and record those env settings with the JSON output."
  - severity: "medium"
    where: "Acceptance Criteria / AC2 - DOC-02 diagnosed and green"
    finding: "AC2 says DOC-02 must be green, but also tells the builder to move to pending_review with only a diagnosis when the root cause is outside files_to_modify. That creates a mergeable-looking handoff with AC2/AC4 still red. Patch the spec to either expand files_to_modify to include the likely doctor/daemon implementation paths, or state that this branch is a blocked escalation handoff and not an acceptance-complete pending_review item."
---

## Review

Proceed after the above spec patches. The second-hop placement in the adapter layer is the right direction, and AC3's poll-loop requirement is implementable as written.
