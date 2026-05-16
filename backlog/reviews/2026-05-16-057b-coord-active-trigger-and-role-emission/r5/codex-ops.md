---
item_id: "2026-05-16-057b-coord-active-trigger-and-role-emission"
round: 5
reviewer: "codex-ops"
artifact_sha: "e6124c00279112d074df7c5767ac174aa13691ca"
completed_at: '2026-05-16T07:47:08Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:140"
    finding: >-
      AC0 specifies the production active-spawn path as spawn(wrapperAbsolutePath, ...),
      stdio:'ignore', then child.unref(), but never requires an error listener on the
      returned ChildProcess. Node emits spawn/exec failures (for example EMFILE/EAGAIN,
      a wrapper removed between stat and exec, or a bad shebang) as an asynchronous
      'error' event; without a listener, that is process-fatal. In production, one
      failed reviewer spawn can crash the MCP daemon before the pre-spawn deadline or
      coord_status surface has a chance to report the failed reviewer. Add an explicit
      child.on('error', ...) contract before unref() that records/logs the spawn failure
      without taking down the daemon, and add a test that forces spawn to emit 'error'
      while asserting coord_invoke returns/records a bounded failure and the daemon stays
      alive.
---

# codex-ops review

Ops/runtime review at the requested artifact SHA. The active trigger shape is close,
but the daemon must not be allowed to crash on a failed detached spawn.
