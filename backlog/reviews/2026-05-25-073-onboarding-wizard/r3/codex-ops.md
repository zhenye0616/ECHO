---
item_id: "2026-05-25-073-onboarding-wizard"
round: 3
reviewer: "codex-ops"
artifact_sha: "8ad54275e3ca72318ddc46e69f282eaa243ec331"
completed_at: '2026-05-26T03:15:28Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:354-361,434-438,669"
    finding: >-
      The Claude Code wire path still never installs an ECHO MCP server config, but AC6 immediately probes Claude by asking it to call `mcp__echo__echo_ping` and the Definition of Done expects the Claude probe to succeed. AC5.2 explicitly sets `mcpServerConfig` to `undefined` for `claude-code` and treats skill-file copy as the wiring path; 072's sync engine only merges `~/.claude/CLAUDE.md` and copies command files for Claude Code. On a clean production machine where Claude Code does not already have ECHO MCP configured, `wire()` can report a successful Claude agent while the first unattended probe fails with an unavailable MCP tool. Patch the spec to either add a real Claude Code MCP wiring step/adapter, or make Claude Code's automated probe and DoD success conditional on a documented pre-existing MCP configuration.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:329-340,375,396-410"
    finding: >-
      AC5.7 now observes 072's `repoRoot` no-dispatch sentinel, but `wire()` has no way to recover from it because `WireOpts` exposes no `repoRoot` or `SyncAllOpts` pass-through and AC5.3 mandates `syncAll(profiles, { /* no opts; defaults are correct */ })`. 072 documents `repoRoot` as the structured failure for packaged/bundled layouts where the source `package.json + skills/` tree is not discoverable, with recovery by passing `opts.repoRoot`; 073 makes that recovery impossible for 074. In a production install that hits this path, onboarding can only surface "caller must pass opts.repoRoot" and then fail again on every retry. Patch the wizard API to accept/pass the repo-root override (or an explicit sync opts object) and pin a test where a first `repoRoot` failure is recoverable by a caller-supplied root.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:90-91,161-199"
    finding: >-
      The stale J2 judgment call still says the wizard imports `AtomStore` and opens the SQLite DB at a `resolveDataDir()`-based path, contradicting the later AC1.3 production opener that requires `Storage`, `openExistingAtomStoreReadOnly()`, and daemon-identical `resolveDbPath()` precedence. This is not just editorial: if a builder follows the judgment-call summary while implementing the production path, detection will either import a nonexistent type or reopen the already-fixed runtime bug where `ECHO_DB_PATH` deployments silently read the wrong database. Patch J2 to match AC1.3 so the spec has one operational contract.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r3 reform closes the r2 source-prefix, DB-path, and top-level no-dispatch mutation gaps. Two runtime gaps remain before this should go to a builder: Claude Code is probed for an MCP tool that this spec never wires, and the repo-root recovery path 072 exposes cannot be used through 073's API. There is also one stale judgment-call paragraph that still points builders at the old unsafe DB path contract.
