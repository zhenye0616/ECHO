---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 22
reviewer: "codex-ops"
artifact_sha: "a15489704aa9dacb08b8a67143251dc97ffd845e"
completed_at: '2026-07-16T17:26:17Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3 — deadline and managed-child settlement paragraphs"
    finding: "Terminal settlement before reporting is required only for timeout/cancellation, not an ordinary nonzero/error child exit. Such a child can exit while a descendant remains in its PGID—especially before T exists, when finally starts no cleanup transition—allowing failure return while mutation remains possible. Require direct-child exit, stream closure, and PGID absence before reporting every child outcome; apply the same idempotent TERM/5-second/KILL ceremony when an ordinary error leaves its PGID alive, remain pending until absence is proved, and add a pre-T nonzero-with-surviving-descendant fixture."
---
