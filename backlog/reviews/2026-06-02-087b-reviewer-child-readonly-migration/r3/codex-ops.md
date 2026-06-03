---
item_id: "2026-06-02-087b-reviewer-child-readonly-migration"
round: 3
reviewer: "codex-ops"
artifact_sha: "22008a762c89696d75969b9e8f0936123abe8a32"
completed_at: '2026-06-03T06:48:30Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md:65"
    finding: "AC2 makes failed capture terminal by writing a skip marker, but it does not require that marker to be committed and pushed before the headless wrapper cleanup deletes the ephemeral worktree. In production, a read-only child that returns rc != 0, empty stdout, or schema-invalid stdout can leave only a local marker; the EXIT trap then removes $WT, the next launchd tick reclones origin/main, sees no reviewer response/no combined.md/no marker, and reselects the same broken round indefinitely, starving later reviews. Patch AC2/AC5 to require the queue-error row plus terminal marker to land on origin via push-with-retry before cleanup, and add a fresh-worktree/origin-backed test proving the next scan skips the failed-capture round after wrapper exit."
---

# codex-ops Review

Ops verdict: proceed after the durability patch above.
