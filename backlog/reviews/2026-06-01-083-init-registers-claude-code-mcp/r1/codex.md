---
item_id: "2026-06-01-083-init-registers-claude-code-mcp"
round: 1
reviewer: "codex"
artifact_sha: "c55be7b34cba261a2a6daae80167f2006c713220"
completed_at: '2026-06-02T06:50:41Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md:81"
    finding: "AC3 says duplicate/already-registered outcomes are non-fatal, but the installed Claude CLI returns exit code 1 for the real duplicate path (`MCP server echo already exists in user config`). Patch the spec/tests to require that exact non-zero duplicate case in `tests/cli/init.test.ts` or the new adapter test; otherwise a builder can accidentally treat only exit 0 as idempotent and pass the happy-path registration assertion."
  - severity: "medium"
    where: "backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md:82 and tools/foreign-install-smoke.sh:7"
    finding: "AC4 says the smoke test asserts the fake `claude` argv, but the current smoke script is observational (`set -uo pipefail`, command output piped through `head`, no hard-fail assertions). Patch AC4 to require a non-zero smoke exit with a clear diagnostic when the recorded argv is absent or differs from `mcp add --transport http --scope user echo <url>`, so this does not become another log-only check."
  - severity: "low"
    where: "backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md:93 and src/cli/commands/init.ts:488"
    finding: "Out-of-scope item #5 says the documented flow runs daemon install before probing, but `runInit` currently calls `wizard.probe(selectedAgents)` before `ensureDaemonRunning(...)`. If the intent is to leave that order unchanged, patch the spec to state the standalone-init behavior explicitly; otherwise builders may rely on a false code claim when reasoning about init-time Claude MCP warnings."
---

# Codex Review - R1

Verdict: proceed_after_patches.

The core shape is implementable. I verified the local Claude CLI accepts `claude mcp add --transport http --scope user echo <url>`, and `--scope` defaults to `local` when omitted, so the user-scope decision is correct. I also verified duplicate registration in an isolated temporary HOME: the first add exits 0, the second exits 1 with `MCP server echo already exists in user config`, which is the main implementation edge AC3 needs to pin down.

J1 lean is sound if registration is driven from `wire.ts` with a tiny adapter dependency, because `wireDepsOverride` already lets tests inject dependencies without changing `run-wizard.ts`. Avoid moving this into `adapter-sync.ts` unless the file list is widened; AC7 currently forbids that extra touch.
