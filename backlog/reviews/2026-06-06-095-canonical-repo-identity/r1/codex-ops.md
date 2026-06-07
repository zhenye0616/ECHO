---
item_id: "2026-06-06-095-canonical-repo-identity"
round: 1
reviewer: "codex-ops"
artifact_sha: "5eaee043db5c54a71e42ef36874658e3f7d5af18"
completed_at: '2026-06-07T04:39:53Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-06-095-canonical-repo-identity.md:55"
    finding: "AC1/AC3 require persisting the raw `git remote get-url origin` value, but HTTPS remotes can contain embedded credentials. Patch the spec so capture stores a credential-scrubbed normalized URL in `metadata.git_state.origin_url` and `metadata.origin_url`, and add a regression case for credential-bearing remotes."
  - severity: "medium"
    where: "backlog/proposed/2026-06-06-095-canonical-repo-identity.md:64"
    finding: "AC3 allows the long-lived git watcher to resolve origin once per repo; an initial miss, transient config-read failure, or later remote change can permanently stamp local fallback or stale identity until restart. Patch AC3 to require retrying absent values and using a bounded or invalidatable remote cache for future commit candidates."
---

## Ops Review

The core capture-time canonicalization direction is operationally sound: `git remote get-url origin` is local, cacheable, and should work for normal worktrees. The required patches are limited to durability hazards in what gets persisted and how long-lived watcher state recovers.
