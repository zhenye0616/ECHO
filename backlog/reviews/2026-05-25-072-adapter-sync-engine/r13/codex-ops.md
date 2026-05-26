---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 13
reviewer: "codex-ops"
artifact_sha: "404ec50d225d93ba0a5f5b79fa6bc8e1517c1c05"
completed_at: '2026-05-26T01:41:40Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:324"
    finding: >-
      The lock cleanup signal handlers are registered as anonymous SIGINT/SIGTERM wrappers, but the finally block removes `handler`, not those wrappers. After any successful `syncAll()` in a long-lived caller, the stale signal listeners remain installed; a later SIGINT/SIGTERM when no sync is running can still invoke an old wrapper and force `process.exit(130|143)`, and repeated syncs accumulate listeners until Node starts warning or firing multiple stale cleanup paths. This is a production runtime leak in the exact daemon/future watcher case the spec calls out. Require named signal wrapper functions that are the same references passed to `removeListener`, and extend the listener-count test to cover `exit`, `SIGINT`, and `SIGTERM` after both success and adapter-error paths.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:358"
    finding: >-
      AC6a's directory-symlink preflight omits the resolved `configFile` directories. Codex's default `.codex` directory is only covered indirectly through `instructionsFile`, and Cursor has no instructions file at all, so a symlinked `~/.cursor` or a caller-provided symlinked config directory is not caught before `syncCursorMcpEntry` reads/parses and writes `mcp.json`. Because AC7 only handles symlinked target files, not symlinked parent directories, this can silently route secret-bearing MCP config writes into a redirected tree while `overallOk` reports success. Add `path.dirname(configFile)` to the guarded directory list for codex and cursor profiles, define its boundary explicitly, and pin symlinked `.cursor` plus overridden-config-dir cases in AC9.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The spec is close from an operational/runtime lens. Patch the signal-listener cleanup and config-directory preflight gaps before builder claim so unattended CLI or wizard runs do not inherit stale process handlers or silently write config through a redirected parent directory.
