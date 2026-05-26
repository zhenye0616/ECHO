---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 4
reviewer: "codex-ops"
artifact_sha: "e11470fc8fb3585ab31a213c43bc7d9c6dc335a3"
completed_at: '2026-05-26T00:13:31Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:226; backlog/ready/2026-05-25-072-adapter-sync-engine.md:229-249"
    finding: >-
      AC6 promises that no exception escapes syncAll and defines a structured lock-timeout SyncResult, but the lock acquisition algorithm still says non-EEXIST errors should be propagated. At runtime those errors include missing or unwritable ~/.echo/state, ECHO_HOME pointing at a file, ENOTDIR on a parent path, or permission drift after daemon startup. In those cases the first unattended wizard/CLI sync throws before it can return syncLock/overallOk:false, so the operator gets a process failure instead of the recoverable "another sync / lock unavailable" result shape. Patch AC6 so lock acquisition either creates/verifies the state directory before linking or converts ENOENT/EACCES/ENOTDIR/UNKNOWN into the top-level syncLock AdapterError shape, and add an AC9 case for at least one filesystem-level lock acquisition failure.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:229-238"
    finding: >-
      The release contract unconditionally unlinks adapter-sync.lock in finally and also registers a process-wide exit handler, but it does not say to remove that handler after the owning sync finishes or to verify that the lockfile still contains this invocation's owner metadata before unlinking. In a long-lived caller, a completed sync can leave behind a stale exit handler; if this process later exits while another process owns the lock, the stale handler can delete the live lock and let a third sync enter, defeating the lost-update protection AC6 added. Patch the lock metadata with an acquisition token and require release/exit cleanup to unlink only when the on-disk metadata still matches, then unregister the handler in finally.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r4 artifact closes the prior corrupt-lock and TOML shape gaps, but the lock contract still has two production failure paths: filesystem-level acquisition errors can escape instead of returning the public `SyncResult`, and stale process-wide cleanup can remove a lock this invocation no longer owns.
