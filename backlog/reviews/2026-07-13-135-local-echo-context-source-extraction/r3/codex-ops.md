---
item_id: "2026-07-13-135-local-echo-context-source-extraction"
round: 3
reviewer: "codex-ops"
artifact_sha: "b86104c8fad4211f90df7486f5460a7bb79b3195"
completed_at: '2026-07-13T21:57:58Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 — Create one local echo-context Git repository with no remote"
    finding: "The publication protocol has an unrecoverable crash window: after staging is renamed to the final target but before the published phase, migration record, or lock release is durable, the next run must refuse the existing target and cannot resume it. Specify idempotent finalization for an exact matching run without adopting unknown targets, and inject crashes after rename, after the publication marker, after migration-record creation, and before lock release."
  - severity: "high"
    where: "AC6 repository-owned parity checker and AC7 sandboxed check:parity"
    finding: "The parity checker must regenerate the inventory from source commit objects, but check:parity must also run while Project_echo is unreadable and the new repository is not required to contain those objects. Require a tracked, digest-verified source-evidence bundle or another durable in-repository representation produced from the pinned commit before isolation, and test parity with the source checkout absent as well as sandbox-denied."
  - severity: "medium"
    where: "AC3 — Split retrieval MCP from loop coordination tools"
    finding: "Comparing the runtime registry with a newly authored manifest permits common-mode schema drift and does not prove parity with the pinned source SHA. Pin canonical source paths and blob IDs plus normalized per-tool request, response, metadata, defaults, caps, and envelope digests, then require the checker to compare both the manifest and runtime registrations independently against that evidence."
  - severity: "medium"
    where: "AC8 — Prove local service parity and stop before cutover"
    finding: "The requirement to forbid external network and clean up in finally is not fail-safe when the smoke process hangs or is killed, because finally may never execute and descendants can survive a parent-only timeout. Require a fail-closed OS network sandbox with preflights proving loopback succeeds and non-loopback is denied, plus a bounded process-group supervisor that terminates all descendants and records post-timeout PID, socket, and SQLite-lock checks."
---
