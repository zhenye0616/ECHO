---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 1
reviewer: "codex-ops"
artifact_sha: "4345f0a6d80be12461d1085330c52effb5b89231"
completed_at: '2026-05-25T23:39:06Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:181,184,189-197,238-242"
    finding: >-
      AC6 says `populateEchoSkills(...)` failure is returned as `skillsPopulated` rather than thrown, but the `overallOk` contract ignores that field and the claude-code dispatch still reads `ECHO_HOME_PATHS.skills`. In production, if the packaged CLI cannot find the bundled `skills/` directory, the source directory is unreadable, or the first-hop copy fails mid-run, `syncClaudeSkills` can copy stale files from a prior install or no files at all while `overallOk` still reports true because every agent and role result is otherwise ok. Require first-hop failure to make `overallOk` false and either mark the claude-code agent failed or skip the second-hop fan-out; add an adapter-sync test where populate fails and the result cannot look successful.
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:93-107,166-168,215-223"
    finding: >-
      The TOML and JSON config mutators write MCP config files that may contain secret-bearing fields (`headers` or arbitrary serverConfig keys), but the spec never defines file-mode preservation or secure creation. A tmp-then-rename implementation normally replaces the existing file with the temp file's mode, so an existing `0600` `~/.cursor/mcp.json` or `~/.codex/config.toml` can become `0644` under a common umask; the missing-file branches can also create new config files readable by group/world. Require replacing writes to preserve the existing mode, missing config files to be created `0600`, and tests that chmod a fixture before sync and assert the mode after add/update.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:81-86,93-107,200"
    finding: >-
      The atomic-write contract uses a fixed sibling path (`<filePath>.tmp`) and AC1 even constrains `markers.ts` to read/write only that temp path. If two `syncAll` invocations overlap on the same machine - for example a wizard retry while `echo init` is still running, or a future watcher-triggered repair during manual onboarding - both processes share the same temp file. One process can rename the other process's bytes onto the final config or fail after the other process already removed the temp, which breaks the idempotent/recoverable runtime contract. Require unique temp names in the same directory, plus best-effort cleanup or a per-target lock; add a narrow overlap test or mocked-fs assertion so the implementation cannot use a global `<file>.tmp` path.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:96,102-107,250"
    finding: >-
      Config conflict payloads expose raw `currentValue`, `expectedValue`, `proposedValue`, and `unifiedDiff`, while `serverConfig` explicitly allows `headers` and arbitrary keys. When the wizard or `echo doctor` surfaces a failed sync result, bearer tokens, API keys, or env-style secrets in `mcpServers.echo` can be printed to logs or terminal output. Require config-mutator conflict objects to redact secret-looking fields before returning them, or make the redaction responsibility explicit in 073/074 and pin it with a test fixture containing an Authorization header.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The engine is scoped correctly, but a few unattended runtime paths need tightening before this can safely mutate user home configs. The highest-risk gaps are that skill population can fail while the aggregate result still looks successful, and secret-bearing MCP configs can be rewritten with weaker file permissions.
