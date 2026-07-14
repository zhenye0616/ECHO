---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 18
reviewer: "codex"
artifact_sha: "19fe3ae2e9e41ac01ee5695959c3834b18038d49"
completed_at: '2026-07-14T05:19:45Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC8 — detached Project_echo worktree and feature-branch push"
    finding: "The prescribed detached worktree still reads Project_echo's common/local Git config, while the stated sanitized envelope disables only selected behavior. A local url.*.pushInsteadOf/insteadOf or transport setting can redirect the supposedly fixed endpoint. Require a controlled private Git directory or a fail-closed local-config check, and give the literal config-free env plus exact --force-with-lease push argv used by the reviewer."
  - severity: "medium"
    where: "AC5 — durable watcher state graph"
    finding: "The declared graph provides no ownership-transfer edge for expired APPLYING: it allows only APPLYING to APPLIED, APPROVED, or ESCALATED, but later requires same-digest resumption and requires a mismatched digest to acquire a transition. Specify an explicit conditional APPLYING(old expired owner) to APPLYING(new owner) CAS, or the complete guarded two-step route through APPROVED, including approval/candidate preservation and a takeover fixture."
  - severity: "medium"
    where: "AC8 — pending-review head_sha update"
    finding: "The required value of the item's updated head_sha is undefined. Writing the new child OID into that child is self-referential; writing the builder OID leaves head_sha different from the pushed pending-review branch head and can cause downstream merge tooling to omit the review child. Define the non-self-referential field semantics and the exact remote-ref/parent validation that makes the review child authoritative."
  - severity: "medium"
    where: "AC8 — ambiguous push recovery"
    finding: "When the post-push probe observes neither the child nor the expected old OID, the spec requires a durable record but names no writable durable sink or publication command. The detached worktree may be ephemeral, and committing another record conflicts with the exact two-path child delta and stop requirement. Specify the failure-record path, ownership, commit shape, and authorized publication mechanism."
---
