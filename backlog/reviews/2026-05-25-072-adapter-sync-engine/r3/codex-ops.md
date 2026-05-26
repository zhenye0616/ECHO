---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 3
reviewer: "codex-ops"
artifact_sha: "b37b865ea305032c651de57617f6b75336f8f842"
completed_at: '2026-05-26T00:04:24Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:225; backlog/ready/2026-05-25-072-adapter-sync-engine.md:350-352"
    finding: >-
      The advisory-lock recovery path only covers a parsed lockfile whose PID is dead, but production crashes can leave `adapter-sync.lock` present with empty or corrupt metadata: `fs.openSync(lockPath, 'wx')` creates the file before the JSON payload is durably written, and SIGKILL, power loss, or ENOSPC in that window bypasses the `exit`/`finally` cleanup. A later unattended `syncAll` then has no valid PID to probe; depending on the implementation it either throws while parsing the lock or waits 30 seconds and returns `RETRY_CONFLICT` forever, permanently blocking onboarding/resync until a human deletes the file. Patch AC6/AC9 so malformed or empty lockfiles are treated as stale after a short freshness window, or make lock acquisition atomic with metadata (for example temp-write metadata then `link` into place), and add a corrupt-lock test proving the next run resolves with a safe `SyncResult` rather than an escaped exception or permanent false conflict.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r3 spec closes the r2 parse/write error and lost-update findings. One runtime edge remains in the lockfile recovery contract: crash-truncated lock metadata can turn the new protection into a permanent false lock.
