---
item_id: "2026-07-13-135-local-echo-context-source-extraction"
round: 6
reviewer: "codex-ops"
artifact_sha: "780fb99a7384626e89be7b293f444e776d712e45"
completed_at: '2026-07-13T23:05:33Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 — Create one local echo-context Git repository with no remote"
    finding: "The fixed claim path is created by atomic mkdir, but discard only says that state, staging, record, cache, and output are archived; it never specifies removal or atomic archival of the claim directory itself. A completed discard can therefore leave `.echo-extractions/135` present and make the required fresh extraction fail forever. Specify an idempotent discard transition that archives the externally published record when present, atomically renames the entire claim directory to a collision-safe run-id-bound archive, fsyncs the parent, and proves a new atomic mkdir succeeds after failures at every discard boundary."
  - severity: "medium"
    where: "AC1 and AC7 — hard-kill discard refusal and recorded process checks"
    finding: "The spec records owner and child PIDs and makes discard refuse while a recorded process may remain, but it does not bind those PIDs to durable process identities. After a hard kill and PID reuse, an unrelated long-lived process can permanently block recovery or be mistaken for an extraction child. Bind each supervised process to at least PID, process-group ID, start-time identity, and executable; require discard to treat PID reuse as quiescent without signaling the foreign process; and add a deterministic PID-reuse fixture."
---
