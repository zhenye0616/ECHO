---
item_id: "2026-05-25-075-first-demo-workflow"
round: 4
reviewer: "codex-ops"
artifact_sha: "bcdb6c374d9f92fbd09be17b3531f7422550d055"
completed_at: '2026-05-26T20:59:45Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-25-075-first-demo-workflow.md:186"
    finding: >-
      AC3.5 treats every user-modified default workflow as a healthy init outcome, but that includes a stale, corrupt, or final-file-symlinked ~/.echo/workflows/change-review.toml. In that production state, echoctl init can report overallOk: true while the immediate next demo command, echoctl run change-review, fails in loadWorkflow before the reviewer ever starts. Patch the spec so default workflow user-modified only stays green after the existing target is known loadable, or explicitly mark invalid/unloadable default workflow preservation as overallOk: false with a workflowsResult diagnostic and a regression test.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-075-first-demo-workflow.md:214"
    finding: >-
      The MCP best-effort regression check only requires /best.effort/i plus an mcp__echo__ substring, which does not pin the runtime fallback promised in AC1.3: MCP missing, unavailable, errored, or timed out must still continue with repository-local context and emit one of the terminal outputs. A prompt can pass this test while still making an MCP outage fatal or blocking for the first demo. Add assertions for the failure/timeout fallback language, not just the phrase best-effort.
---

# codex-ops review - r4

## Findings

1. **MEDIUM - Invalid preserved default workflow can make init green while run fails**  
   `backlog/ready/2026-05-25-075-first-demo-workflow.md:186` says user-modified workflow outcomes do not fail `overallOk` because the existing file is still loadable by `echoctl run`. That is not guaranteed operationally: a prior dogfood run, manual edit, interrupted write, or final-file symlink can leave `~/.echo/workflows/change-review.toml` present but invalid or unreadable. The next `echoctl init` would preserve it and report green, then `echoctl run change-review` would fail before dispatch. Require either validation of user-modified default workflow targets before treating them as healthy, or an explicit false/diagnostic outcome for invalid preserved defaults, with a regression test.

2. **MEDIUM - MCP best-effort test does not pin the outage fallback**  
   `backlog/ready/2026-05-25-075-first-demo-workflow.md:214` only tests for the words `best-effort` and `mcp__echo__`. The runtime contract in AC1.3 is stronger: if MCP tools are missing, down, erroring, or timing out, the agent must continue with local repo context and still emit one of the pinned terminal outputs. A prompt can satisfy the current marker while still failing the unattended demo when MCP is unreachable. Strengthen AC4.1 to assert the failure/timeout/local-context fallback language directly.

## Verdict

`proceed_after_patches`.
