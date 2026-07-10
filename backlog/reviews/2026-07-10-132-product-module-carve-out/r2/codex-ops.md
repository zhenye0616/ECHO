---
item_id: "2026-07-10-132-product-module-carve-out"
round: 2
reviewer: "codex-ops"
artifact_sha: "a1518ac2f0b6846cfa14e8171ccc5bd0dd49cf08"
completed_at: '2026-07-10T21:18:24Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/inbox/2026-07-10-132-product-module-carve-out.md:AC2"
    finding: "AC2 requires the product daemon to acquire the same pid lock as the full daemon and fail loud when the full daemon is already running, but the pinned smoke-test contract only covers clean start/stop and registered worker set. Add an unattended test that simulates or holds the full daemon lock under a scratch ECHO_HOME, invokes `echoctl product daemon`, and asserts non-zero exit plus a conflict message naming `com.echo.daemon`; otherwise the highest-risk runtime invariant for preventing concurrent daemons against one db can regress silently."
---
