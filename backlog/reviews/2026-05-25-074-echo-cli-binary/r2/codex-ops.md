---
item_id: "2026-05-25-074-echo-cli-binary"
round: 2
reviewer: "codex-ops"
artifact_sha: "177a85fea24c656f3a8e580d8e94f02e1e7bb7e8"
completed_at: '2026-05-26T06:04:03Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:113-127"
    finding: >-
      AC1 names the executable `echo` and documents `echo <subcommand>`, but bash/zsh resolve `echo` as a shell builtin before PATH, so an npm-linked `bin.echo` is not what the founder will run in a normal terminal. In production `echo init` just prints `init`, `echo --help` prints `--help`, and none of the runtime surface is reachable unless the user disables a builtin or calls an absolute path. Patch by choosing a non-builtin command name, or by adding explicit shell-function install logic despite the current no-install scope, and pin a smoke test that verifies the documented command reaches `dist/cli/index.js` from a real shell.
  - severity: "high"
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:131-134; backlog/ready/2026-05-25-074-echo-cli-binary.md:430-486"
    finding: >-
      AC1 promises SIGINT/SIGTERM exits as 130/143, but AC5.3 says an aborted signal kills the child and returns the partial outcome array, while AC5.4 exits 0 when every returned outcome has exitCode 0. If a launchd shutdown or operator SIGTERM arrives after step 1 succeeded but before step 2 records a failing outcome, `echo run` can report success for a partially executed workflow. Patch the dispatcher/runRun contract so interruption always records an interrupted outcome and returns 130/143, and add tests for SIGINT/SIGTERM after at least one successful step.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:454-456"
    finding: >-
      `echo run` spawns bare `codex` / `claude` with `env: process.env`. That works in the interactive shell used during `echo init`, but fails under launchd, Raycast, or any cron-like caller with a minimal PATH: an onboarded agent can become ENOENT at workflow time, with no spec-pinned per-step remediation or JSON outcome. Patch the runtime to use a persisted resolved executable path from onboarding, or to normalize the child PATH deliberately, and add a test where PATH omits the agent binary and the failure is reported as an actionable dispatch outcome instead of a generic crash.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:280-292"
    finding: >-
      `echo uninstall` exits 0 for partial adapter failures and then `--purge-state` can still remove `~/.echo/`. In production a parse-error or symlink conflict can leave `~/.codex`, `~/.claude`, or `~/.cursor` still pointing at ECHO after the canonical state and skills are gone; automation sees exit 0 and treats the uninstall as complete. Patch AC4 so adapter conflicts/errors produce a non-zero or distinct JSON result, and either block `--purge-state` until inverse cleanup succeeds or require an explicit force path that makes the residual config risk observable.
---

# codex-ops review

Verdict: `pushback`.

Reviewed the frozen artifact at `177a85fea24c656f3a8e580d8e94f02e1e7bb7e8` through the operational/runtime lens.

The spec still has a command-reachability blocker: the documented `echo` command loses to shell builtins in normal terminals, so the binary is not reachable by the happy path. Even after renaming or adding install-time shell wiring, the unattended `run` path needs signal and PATH behavior pinned, and uninstall needs partial cleanup failures to be visible to automation before this is safe to build.
