---
item_id: "2026-07-15-138-echo-context-cutover-substrate-rehearsal"
round: 2
reviewer: "codex-ops"
artifact_sha: "15c8e2c7004ea9b6f1c6f1d23a0cdf12e05712f5"
completed_at: '2026-07-15T23:45:49Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC5 / AC8"
    finding: "The cross-repo deterministic build and landing flow does not explicitly require clean-worktree, no-autostash, fixed branch/ref, upstream-drift, and post-merge readback checks for both /Users/zhenye/Desktop/echo-context and Project_echo before candidate hashes are trusted. Add an operational gate that aborts on dirty trees, untracked build inputs, pending rebase/merge state, autostash use, branch/head mismatch, remote divergence, or landed-SHA readback mismatch, and records those checks in the redacted migration handoff."
  - severity: "medium"
    where: "AC1 / AC7"
    finding: "The rehearsal requires crash replay across every journal checkpoint, but the spec does not require durable operator-visible failure evidence for rejected guards or unrecoverable replay states. Add a requirement that every failed precondition/replay stop writes a redacted phase/error record under the supplied rehearsal root and exits non-zero, so unattended rehearsal loops cannot silently spin or leave only transient stderr."
  - severity: "medium"
    where: "AC1 / Out of Scope"
    finding: "The mutation guard rejects real ports 38478/38479 and real launchctl domains, while the same controller archive is intended to be handed to item 139. Clarify that this item's rehearsal command is permanently root-scoped/fake-service-only, and that any live-capable mutation mode remains disabled unless item 139 supplies a separate exact-artifact/live-authorization path; otherwise the built controller could either be unusable for live cutover or accidentally carry a bypass not reviewed here."
---
