---
item_id: "2026-06-01-083-init-registers-claude-code-mcp"
round: 1
reviewer: "codex-ops"
artifact_sha: "c55be7b34cba261a2a6daae80167f2006c713220"
completed_at: '2026-06-02T06:49:39Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md:81"
    finding: >-
      AC3 treats an already-registered Claude MCP entry as non-fatal, while AC1/locked decision #5 require the entry to point at the resolved mcpServerUrl. In a fake HOME, `claude mcp add --transport http --scope user echo http://127.0.0.1:1111/mcp` succeeds, but rerunning it for `http://127.0.0.1:2222/mcp` exits 1 with "MCP server echo already exists in user config" and leaves the old URL in place. If the builder simply swallows that duplicate as idempotent success, a rerun after `--port`/`ECHO_MCP_PORT` changes leaves Claude Code connected to the wrong daemon while init exits cleanly. Require the duplicate path to verify/update the existing user-scope URL (for example get/remove/re-add) and add a fake-CLI stale-URL test.
  - severity: "medium"
    where: "backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md:79"
    finding: >-
      The spec adds a new external `claude mcp add` spawn to init/wire, but AC1-AC3 do not require timeout, kill, or non-interactive stdio semantics. In an answer-file install or foreign smoke run, a present but blocked `claude` binary can hang on a prompt, config lock, or slow vendor startup and prevent init from ever reaching the probe/doctor/remediation path. Pin the registration spawn to a bounded timeout (the 30s probe precedent is fine), ignore stdin, capture bounded stderr/stdout for remediation, and test a fake `claude` that never exits.
  - severity: "low"
    where: "backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md:80"
    finding: >-
      The spec acknowledges that local scope shadows user scope, and the old remediation copy omitted `--scope`, which means anyone who followed it likely created exactly that local shadow. AC2 still mandates a doctor remediation that only says to add the user-scope server, while AC5 puts the `claude mcp remove echo -s local` escape hatch in install docs. At runtime, doctor can keep telling the operator to run a command that cannot beat the local shadow. Either include the local-shadow escape hatch in the mcp-not-configured doctor copy, or make the defer explicit with a follow-up tied to doctor output rather than docs-only troubleshooting.
---

# codex-ops review

Verdict: proceed_after_patches.

## Findings

1. MEDIUM - Stale user-scope duplicates can leave Claude Code pointed at the wrong port. I verified the installed `claude` CLI under a fake HOME: the first user-scope `echo` add succeeds, but a second add for a different URL exits 1 and preserves the old URL. The spec should require duplicate handling to prove the existing entry already matches the resolved URL, or update it.

2. MEDIUM - The new registration spawn needs an unattended-runtime contract. Without timeout/kill/stdin rules, `echoctl init --answer-file` can hang forever on a blocked vendor CLI before it reaches the remediation path.

3. LOW - Doctor copy should not hide the local-scope shadow case. Because the previous remediation defaulted to local scope, a docs-only escape hatch is easy to miss when doctor remains degraded after the new user-scope command.

## Ops notes

The requested `claude mcp add --transport http --scope user echo <url>` flag shape is valid against the installed CLI, and `--scope user` is the right default for cross-project availability. The remaining risk is making reruns and failure modes observable enough that a headless or concierge install does not report success while Claude Code is still connected to the wrong MCP server.
