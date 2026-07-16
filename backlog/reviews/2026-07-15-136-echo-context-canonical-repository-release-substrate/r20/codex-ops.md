---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 20
reviewer: "codex-ops"
artifact_sha: "672d3deffa2512d88a5b2e487d6c095d95fca75d"
completed_at: '2026-07-16T15:11:52Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC4 — Landing authorization record / The single external write"
    finding: "The authorization is committed before M is created and binds B, H, H tree, the message, and a push template containing M, so it does not authorize the exact Git object later pushed. Create M locally first under an exact noninteractive merge command, verify its parents are exactly B then H, its tree equals the reviewed H tree, its message and metadata are fixed, and status is clean; then bind the concrete M, tree, parents, and fully literal push argv in the committed, pushed, and read-back approval before the echo-context write."
  - severity: "high"
    where: "AC4 — Single-use authorization and external-write execution"
    finding: "The rule that reuse invalidates an approval is not an atomic launch gate: overlapping coordinators can both read the same approval and invoke pushes, while the lease limits successful ref updates rather than push attempts. Require an atomic, durable attempt-consumption record keyed by approval and runner before spawn, authenticate its readback, permit only its winner to proceed, and permanently consume the approval on any launch. Also require bounded noninteractive execution with prompting disabled, scrubbed Git/proxy/credential environment, pinned binaries and credential helper, terminal process settlement, and a sanitized durable outcome containing the concrete argv plus authenticated pre/post-main observations."
  - severity: "high"
    where: "AC3 source mode and AC6 tuple-reproduction gate"
    finding: "Source mode accepts only the source SHA, verifies against its own generated manifest hash, and deletes T without exposing an authenticated archive or lock hash. AC6 therefore has no executable fail-closed channel for comparing the rebuilt source-archive SHA-256, lock hash, and manifest hash with the independently recorded seal. Add a seal-reproduction variant or expected-tuple inputs, parse the authenticated manifest before cleanup, compare all three values, emit a fixed machine-readable receipt only after final success, and add mismatch tests for every field and malformed or missing receipts."
  - severity: "medium"
    where: "AC6 — Post-landing seal failure handling"
    finding: "After main becomes M, the migration record is created only on success, so a dual-build, verification, timeout, or source-acceptance failure can leave an irreversible landing without durable operator-visible evidence. Require a sanitized failed-seal record or workflow run log containing M, the failed phase, exact commands and toolchain, timeout or exit disposition, and hash mismatch details; it must be durably persisted and read back before any later resume, with terminal state and no automatic retry or adoption."
---
