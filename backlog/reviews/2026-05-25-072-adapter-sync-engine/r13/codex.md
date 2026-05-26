---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 13
reviewer: "codex"
artifact_sha: "404ec50d225d93ba0a5f5b79fa6bc8e1517c1c05"
completed_at: '2026-05-26T01:41:44Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:324"
    finding: "The SIGINT/SIGTERM listener registration uses anonymous wrapper functions but the cleanup removes `handler`, so those signal listeners are never unregistered. In a long-lived caller this accumulates stale signal handlers despite the scoped-handler invariant, and AC9 case 13 only checks the `exit` listener so the leak would pass. Bind the wrappers to named constants and remove those exact functions in `finally`, and extend the listener-count test to include `SIGINT` and `SIGTERM`."
---

# Codex Review

## Findings

1. Medium — `backlog/ready/2026-05-25-072-adapter-sync-engine.md:324`: the SIGINT/SIGTERM handlers are registered as anonymous wrappers, but cleanup calls `removeListener(..., handler)`. Node removes listeners by function identity, so these two removals are no-ops. The result contradicts the scoped-handler invariant for long-lived callers and can accumulate stale signal handlers across successful `syncAll` calls; the existing AC9 case only counts `exit`, so it would not catch the leak. Patch the spec to name the signal wrapper functions, unregister those exact functions in `finally`, and assert listener counts for `exit`, `SIGINT`, and `SIGTERM`.

No other implementability blockers found in this pass.
