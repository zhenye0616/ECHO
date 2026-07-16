---
item_id: "2026-07-15-138-echo-context-cutover-substrate-rehearsal"
round: 7
reviewer: "codex-ops"
artifact_sha: "777c6f494c2b5acf9d5c138b24136c330b6e5ea4"
completed_at: '2026-07-16T05:33:09Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC4 — per-target CAS transaction; Tests — client-adapters.test.ts"
    finding: "The CAS contract defines before/after comparison but not an atomic, durable replacement protocol. A kill during an in-place write can leave a controller-created third image; recovery must then classify it as foreign drift and is forbidden to restore it. Require same-directory exclusive temporary files, metadata application and file fsync before atomic rename, parent-directory fsync, under-lock interrupted-temp reconciliation, and kill tests around write/fsync/rename/parent-fsync for apply, rollback, and recutover."
---
