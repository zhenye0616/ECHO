---
item_id: "2026-07-15-138-echo-context-cutover-substrate-rehearsal"
round: 4
reviewer: "codex-ops"
artifact_sha: "8d863930d444b2cef91739f104039f12e5024675"
completed_at: '2026-07-16T03:34:02Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC2 — authority-fence lock protocol"
    finding: "Locking the canonical transaction record does not define a stable lock identity when that record is absent or atomically replaced, and an old-full process releases the lock after startup, allowing a start-wins process to keep writing after prepared or active commits. Name a never-replaced lock or lease that exists before record creation, require every startup and transition to recheck through that same lock, and either retain a lifetime authority lease or stop and verify every already-started full process while holding it before phase commit. Test absent-record and record-replacement cases, both race orders, and a post-commit write attempt."
  - severity: "medium"
    where: "AC2 and tests/daemon/authority-fence.test.ts"
    finding: "Rate-bounded fence evidence is not closed across fresh launchd processes: an in-memory limiter resets on every relaunch, while the pre-open fence cannot assume it may create the log directory. Specify a preprovisioned operator-visible sink and a durable or coalescing cross-process bound, then make the fake-launchd fixture launch fresh processes and assert bounded attempts and log records with evidence still visible after restart."
  - severity: "medium"
    where: "AC1 — pre-trust journaling contract"
    finding: "The requirement to journal every filesystem operation conflicts with the requirement that pre-trust root-validation and guard failures write nothing anywhere. State explicitly that these checks produce no durable journal, temporary file, cache, or secondary log and that durable journaling begins only after the root descriptor is trusted and locked; extend the zero-mutation matrix to sentinel temporary, cache, and log locations."
  - severity: "medium"
    where: "AC1 and AC5 — command-surface contract"
    finding: "AC1 calls rehearse the only mutation-capable command, but AC5 requires candidates:build scripts that mutate repository output directories. Narrow AC1 to the only controller or runtime-state mutation entrypoint, classify candidate builds as artifact-output-only commands forbidden from invoking service, client, or state adapters, declare whether candidates:verify is read-only, and test that command-surface separation."
---
