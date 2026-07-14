---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 17
reviewer: "codex-ops"
artifact_sha: "e1115daee4ad389bca1bed9b10a43e76df534c19"
completed_at: '2026-07-14T04:35:13Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC5 — APPLYING remote probe/push contract"
    finding: "The contract pins Git but does not bound remote-helper, SSH, credential-prompt, DNS, or network execution. A hung child can outlive the APPLYING lease, allowing another tick to acquire state while the original process can still CAS-push. Require a sanitized noninteractive transport envelope, a hard child lifetime shorter than the lease, process-group termination/reaping, and takeover only after termination plus endpoint re-probe. Add minimal/hostile-PATH, credential-prompt, hanging-helper, crash, and lease-expiry overlap fixtures."
  - severity: "medium"
    where: "AC5 — PREPARED candidate commit durability"
    finding: "PREPARED and APPROVED are durable, but the candidate commit is reachable only through an unspecified ephemeral detached worktree. Cleanup, worktree pruning, or Git GC can remove the approved object before a later watcher applies it. Require a CAS-managed internal ref or equivalent durable Git-native reachability anchor, startup reconciliation, terminal cleanup, and a crash plus `git gc --prune=now` fixture between PREPARED, APPROVED, and APPLYING."
  - severity: "medium"
    where: "AC5 — post-push `old -> APPROVED/retryable` transition"
    finding: "A rejected push followed by a successful probe of the unchanged old SHA returns to APPROVED without required durable attempt evidence, backoff, or retry bound. Persistent authorization, hook, or transport failures can therefore become a silent hot loop. Persist sanitized failure class, attempt count, timestamp, and next-attempt time; define bounded backoff and escalation for permanent or repeated failures; and test restart persistence and operator-visible disposition."
---
