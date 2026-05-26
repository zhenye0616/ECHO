---
item_id: "2026-05-25-074-echo-cli-binary"
round: 1
reviewer: "codex-ops"
artifact_sha: "d755579749ba3aa267586d8302e7f2aa35ca9901"
completed_at: '2026-05-26T05:44:57Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:103,338-359,383-390; backlog/complete/2026-05-25-073-onboarding-wizard.md:426-430,668; assets/echo-roles/builder.toml:3,6-8; assets/echo-roles/strategist.toml:3,6-8"
    finding: >-
      AC5 has no runtime path that can actually dispatch the default write-capable roles. 073 persists `OnboardedAgentProfile.capabilities` unchanged/empty, and 074 never specifies the mutation that fills those capabilities before `echo run` reads `onboarding.json`; if the builder follows that literally, every real workflow step fails matching before any spawn. If the builder instead populates write capabilities ad hoc, the dispatcher still hard-codes Codex to `--sandbox read-only` while the default builder/strategist roles require `fs.write`, `git.write`, and `mcp.echo.write`, so the matched child runs under weaker permissions than the role contract. Patch the spec to define the persisted per-agent capability source and map `role.sandbox`/required capabilities into dispatch sandbox choices, or explicitly scope 074's runtime to read-only reviewer workflows; add an end-to-end test that starts from the onboarding state produced by `echo init` plus the actual `assets/echo-roles/*.toml` defaults.
  - severity: "high"
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:155-160,431-435,457-468"
    finding: >-
      The non-TTY prompt contract can auto-confirm `echo init` instead of rejecting it. AC6.1 says `makeTtyPrompt()` returns prompt defaults when stdin is not a TTY, and the init flow has defaults for the welcome confirmation, agent subset, and project skip prompts; under a pipe/cron-style invocation that can proceed into `wizard.wire()` and modify `~/.codex`, `~/.claude`, `~/.cursor`, and `~/.echo` without a human confirmation. AC7.1 case 10 expects non-TTY init to exit 2, but that expectation is not enforced by the command contract. Patch `runInit`/top-level dispatch to fail closed on non-TTY before any wizard side effect unless a future explicit non-interactive answer file exists, and pin a test that no wizard methods are called in this branch.
  - severity: "high"
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:272-275,481-491,531-535"
    finding: >-
      The Codex TOML inverse can delete unrelated user config after the ECHO table. AC4.3 says to remove from `[mcp_servers.echo]` through the next `[mcp_servers.<next>]` header or EOF, but real `~/.codex/config.toml` may put unrelated tables such as `[profiles.work]`, `[model]`, or `[tools]` immediately after the ECHO MCP block. In that layout, `echo uninstall` removes the ECHO entry plus the rest of the file, which is production data loss in a secret-bearing config. Patch the elision rule to stop at the next TOML table or array-of-tables header of any name while preserving CRLF/no-trailing-newline/BOM behavior, and add a fixture with `[mcp_servers.echo]` followed by a non-MCP table that survives byte-for-byte.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:107,373-390,411-418,493-504"
    finding: >-
      `--project` is resolved but never applied to the spawned agent process. `dispatchWorkflow()` accepts `projectRoot`, and `runRun()` resolves it per J8, but the spawn contract only lists command/args and does not require `cwd: projectRoot` or an equivalent Codex/Claude working-directory flag. In production, `echo run --project /repo` from a different cwd can launch Codex/Claude against the caller's current directory while the CLI reports that `/repo` was selected. Patch AC5.3 to pass `cwd: projectRoot` to every child spawn and add a run test that invokes from a git-rootless cwd with `--project` pointing at a fixture repo and asserts the fake spawn receives that cwd.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:188-200,470-479; src/daemon/lifecycle.ts:53-55"
    finding: >-
      `echo doctor` checks `<dataDir>/echo.pid`, but the daemon actually writes `<dataDir>/daemon.pid`. That means the health report can never observe the real daemon lock: a running daemon with a closed MCP port, or a stale lock left after a crash, will be reported with `pidLockHeld: false`, hiding the exact production failure AC3.2 says doctor should surface independently. Patch the spec to use `daemon.pid` via the daemon lifecycle helper or a shared constant, and add a doctor fixture with `daemon.pid` present and the MCP port closed.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The CLI shape is directionally workable, but this r1 spec is not claim-ready from the unattended-runtime lens. The main blockers are around production side effects: `echo run` cannot reliably execute the shipped default roles, non-TTY `echo init` can fall through into writes, uninstall can over-delete Codex TOML, child agents can spawn in the wrong repo, and doctor is looking for a PID lock filename the daemon does not write.

I reviewed `backlog/ready/2026-05-25-074-echo-cli-binary.md` at requested commit `d9ef0c07804647d9c2e17f2be64553186a129d79` / artifact blob `d755579749ba3aa267586d8302e7f2aa35ca9901`. I did not consume task-state for this reviewer tick.
