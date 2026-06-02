---
item_id: "2026-06-01-083-init-registers-claude-code-mcp"
round: 3
reviewer: "codex-ops"
artifact_sha: "93c9b6ef11db1d05d5ac5946f7359651f6ae6be0"
completed_at: '2026-06-02T07:19:45Z'
verdict: "proceed"
findings: []
---

# codex-ops review

Verdict: proceed.

## Findings

No findings.

## Ops notes

R3 focused on the r2 removal requested by the round: Locked decision #4 and AC3(b) no longer instruct the builder to parse `claude mcp get echo`, compare CLI output, or auto remove and re-add a duplicate entry. The duplicate path is now operationally conservative: record `already-exists (unverified)`, let the post-registration probe be the health authority, and rely on doctor remediation for stale or shadowed entries.

That leaves the two-live-daemons case as an explicit V1 limitation under OoS#8, not an implicit success path. From the unattended-runtime lens, this is the safer spec boundary: init does not hang, does not mutate vendor config from ambiguous human CLI output, and does not report claude-code healthy on an exit-1 duplicate unless an independent probe passes.
