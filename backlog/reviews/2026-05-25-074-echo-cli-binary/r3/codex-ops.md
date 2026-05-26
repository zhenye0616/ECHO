---
item_id: "2026-05-25-074-echo-cli-binary"
round: 3
reviewer: "codex-ops"
artifact_sha: "ca21a05281d8703360654b8058e1a1bfd698b1b1"
completed_at: '2026-05-26T06:22:47Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:493-495; backlog/ready/2026-05-25-074-echo-cli-binary.md:521-544"
    finding: >-
      The SIGINT/SIGTERM fix still only guarantees an interrupted outcome when the abort is observed "mid-step." A real operator SIGTERM can arrive in the gaps: after a child exits 0 but before the dispatcher starts the next step, or after the final child exits 0 but before runRun derives the exit code. In those cases the handler sets receivedSignal.current and aborts the controller, but the returned outcomes can still all be successful, so AC5.4 step 10 exits 0 despite the process having been interrupted. Patch the contract so dispatchWorkflow checks opts.signal.aborted before each spawn and after each awaited child completion, or so runRun treats a non-null receivedSignal.current after dispatch as 130/143 even if all outcomes succeeded. Add a test that emits SIGTERM in the between-step gap and a one-step-after-success gap, not only while a fake child is in flight.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:123-138"
    finding: >-
      The echo-to-echoctl rename did not fully cascade into generated usage/error copy: AC1.2 still documents the top-level grammar as `echo <subcommand>`, and AC1.3 still tells users to run `echo <cmd> --help`. If the builder copies this into the CLI help or exception path, an operator following the runtime remediation will hit the shell builtin again and never reach this binary. Patch both strings to `echoctl ...`, and pin the usage/error snapshot so the AC1.5 shell-reachability test is not the only guard against this regression.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:488-492; backlog/ready/2026-05-25-074-echo-cli-binary.md:500-503"
    finding: >-
      The ENOENT recovery path now gives a false operational escape hatch. AC5.3 says users can recover from a minimal launchd/cron PATH by passing `--agent <role>=<absolute-path>`, but the public runRun shape still models `agentOverrides` as `ReadonlyMap<string, AgentKind>` and the dispatcher still spawns bare `codex` / `claude`. There is no specified path for an absolute executable override to reach spawn(). Either remove the absolute-path remediation and document that the launching environment's PATH must contain the agent binaries, or add a real binary-path override type plus parsing and dispatch tests. As written, a 03:00 PATH failure points the operator at a flag shape the CLI cannot honor.
---

# codex-ops review

Verdict: `pushback`.

Reviewed the frozen artifact at `ca21a05281d8703360654b8058e1a1bfd698b1b1` through the operational/runtime lens. The matcher taxonomy, `resolvedSandbox` data flow, skills-dir empty/noop behavior, `loadRolesFromDir(..., { skillsRoot, assertDefaults: true })` call shape, and force-purge gate are broadly reviewable as written. The remaining blockers are in runtime operator surfaces: signal gaps can still produce a false success, the binary rename leaves bad help copy, and the PATH failure remediation names an unsupported absolute-path override.
