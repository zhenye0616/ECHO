---
item_id: "2026-07-15-138-echo-context-cutover-substrate-rehearsal"
round: 5
reviewer: "codex"
artifact_sha: "677c585a8ca839233d9c1c79596345ab2e427515"
completed_at: '2026-07-16T03:59:21Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 — initialize/resume root-state contract"
    finding: "Creating the mandatory stable lock makes a new root non-empty before the first canonical transaction record exists. A crash after lock creation, or an absent-record rollback-full contender that creates the lock, leaves an authority.lock-only root; AC1 permits initialization only for a nonexistent or empty root and resume only when a valid record exists, so the next rehearse must reject this state and strand replay. Recognize one tightly validated pristine lock-only bootstrap state, or specify another atomic bootstrap that cannot leave this window, and add a crash/barrier test between lock creation and the first planned-record commit."
  - severity: "medium"
    where: "AC5 — cross-repository identity handoff"
    finding: "The four-identity handoff remains cyclic and underspecified. The first echo-context build must emit a manifest containing the Project_echo SHA/tree, but the only named counterpart input is --counterpart-manifest on the later Project_echo build; consequently each build cannot verify a received counterpart, and the later checkout cannot validate echo-context objects without a named counterpart object database. Name the owning orchestration command and exact checkout or manifest inputs that establish and locally verify both identities before the first candidate manifest, require both builds to consume that immutable tuple, and test counterpart tampering in both directions."
---
