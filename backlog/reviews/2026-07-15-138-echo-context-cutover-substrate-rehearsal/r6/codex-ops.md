---
item_id: "2026-07-15-138-echo-context-cutover-substrate-rehearsal"
round: 6
reviewer: "codex-ops"
artifact_sha: "38b2f9d70c326577ca9f5679fa6f05c3b286d915"
completed_at: '2026-07-16T04:23:45Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 — Implement one closed, replayable phase machine behind a hard mutation boundary"
    finding: "The admitted startup states exclude the temporary file required by the mandated temp-write/fsync/rename record commit. A kill after the initial temp-file fsync but before rename leaves authority.lock plus a temp record and no canonical record, so restart rejects the root instead of replaying it. Define descriptor-relative validation and reconciliation for exactly this interrupted-commit state, including stale-temp handling, and test kills after temp creation/fsync and around rename for both the first record and later replacements."
  - severity: "medium"
    where: "AC1 durable-journaling invariant and AC2 deadline-bounded lock acquisition"
    finding: "AC1 permits durable journaling only while authority.lock is held, but AC2 requires a controller that times out acquiring that lock to persist a failure record under the root. Writing that record while another process owns the lock creates an undefined concurrent writer. Split lock-acquisition timeout from post-acquisition failures: use redacted stderr and zero root mutation, or define a separate descriptor-relative concurrency-safe evidence channel; persist ordinary under-root failure records while still holding the lock, then release it. Align the fence wording with its later best-effort sink contract."
  - severity: "high"
    where: "AC2 start-job neutralization and AC7 rollback/recutover"
    finding: "Prepared and active persistently boot out or disable every old-full start job, but rollback never explicitly restores the captured enable/load/KeepAlive state. Rollback can therefore become logically old-authoritative while leaving the only old-full service permanently down. Require idempotent restoration of the exact service-control before image, old-full readiness verification before rollback completes, recutover neutralization, and fake-launchd crash/failure tests that prove rollback-era writes occur through the restored job rather than a direct test-only start."
  - severity: "medium"
    where: "AC5 — Build deterministic controller and Project_echo package candidates"
    finding: "The promise that every interrupted build leaves no publishable manifest is impossible after the final publication operation: a kill immediately after an atomic rename can leave a valid published pair even though the launcher never reports success. Define one fully fsynced versioned directory containing both archive and manifest, publish it with one rename as the commit point, treat post-rename recovery plus candidates:verify as success, and scope the no-manifest guarantee to pre-commit failures. Add kill tests immediately before and after that rename."
---
