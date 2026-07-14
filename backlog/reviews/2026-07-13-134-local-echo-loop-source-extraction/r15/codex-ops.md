---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 15
reviewer: "codex-ops"
artifact_sha: "75b5ce407a8b680a7a53ac280d26281ff73e2387"
completed_at: '2026-07-14T03:26:05Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC5 — watcher disposition state machine"
    finding: "APPLIED is determined only from the local ref, with no durable remote-ref or push state. A crash after local CAS, or an upstream advance before push, can leave the row terminal while origin lacks the candidate. Add a recoverable publication phase that records the expected remote SHA, uses a non-force lease-bound push, and durably escalates divergence; test crashes around push and concurrent upstream advancement."
  - severity: "high"
    where: "AC5 — watcher CAS recovery; AC6 — workflow fixtures"
    finding: "The spec does not define index/worktree invariants around update-ref. Preparing through a temporary index leaves a checked-out tree stale after CAS, while preparing in the main index leaves it dirty before CAS and conflicts with dirty-tree refusal after a crash. Define a no-autostash, no-clobber recovery protocol and test restart from PREPARED and immediately after CAS, including concurrent filesystem changes, proving either a clean synchronized worktree or durable escalation."
  - severity: "medium"
    where: "AC3 — invokeRole identity and retry semantics"
    finding: "A repeated invocation key with a different normalized deadline or payload hash has no required outcome. It could be reported as duplicate, overwrite intent, or disagree with the deterministic invocation ID. Require immutable payload-hash comparison for both PENDING and PUBLISHED rows, a stable conflict error with no event mutation, and mismatch fixtures for both states."
---
