---
item_id: "2026-05-26-076-packaged-echoctl-install-boundary"
round: 1
reviewer: "codex-ops"
artifact_sha: "a0e7578d10511fc34375e67bc6acb7cc7939d16e"
completed_at: '2026-05-27T05:00:13Z'
verdict: "proceed_after_patches"
findings:
  - severity: high
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:228"
    finding: >-
      AC5 says the packaged smoke runs the daemon with a tmp ECHO_HOME and random ECHO_MCP_PORT, but the launchd plist in AC3.2 only persists PATH. A launchd-started process will not inherit the test process environment, so the smoke can start the packaged daemon against the default ~/.echo state and canonical 38478 port. In unattended runs this can fight the founder's real daemon, corrupt/probe the wrong state, or falsely pass because an existing daemon answered the /mcp probe. Patch the spec so daemon install renders explicit ECHO_HOME/ECHO_MCP_PORT environment variables when supplied, and make AC5 assert the plist and probe use those isolated values.
  - severity: high
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:202"
    finding: >-
      AC3 hardcodes the production LaunchAgent label and ~/Library/LaunchAgents path, while AC5 expects an isolated smoke test. A local `npm test` run would bootout or overwrite the real com.echo.daemon job if the founder already has ECHO installed, and cleanup failure would leave the real service pointed at the test package/log/state. Patch the spec to require test-only overrides for label, plist path, log dir, and launchctl domain (or an explicit skip when the production label exists), with assertions that the production plist/job were never touched.
  - severity: medium
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:211"
    finding: >-
      The plist launches `/usr/bin/env node` with a fixed PATH, but many macOS installs put the working Node 22 binary under nvm, asdf, mise, or Volta paths that launchd will not see. The package can install successfully from an interactive shell and then fail only after launchd bootstraps it, or worse, boot with an older Node found earlier on PATH. Patch AC3 to resolve and persist an absolute Node executable at install time, preferably process.execPath, and verify `node --version` satisfies AC7.4 before reporting install success.
  - severity: medium
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:239"
    finding: >-
      `echoctl daemon install` bootouts an existing job before the spec requires validation that the new packaged daemon path, copied SQL migrations, coord config, schema files, and Node executable are actually usable. A bad tarball or partial npm global install would convert an upgrade into an outage and leave the operator with only a launchctl error after the old daemon is already down. Patch AC3.3/AC6 so install/restart preflight the new runtime artifacts before bootout and print a clear recovery path if bootstrap fails.
---

# codex-ops review

Verdict: `proceed_after_patches`.

## Findings

1. high - `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:228`

   AC5 depends on tmp `ECHO_HOME` and a random `ECHO_MCP_PORT`, but AC3.2's plist only persists `PATH`. launchd will not inherit the shell/test environment, so the packaged smoke can hit `~/.echo` and port `38478` instead of the isolated runtime.

2. high - `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:202`

   The daemon lifecycle surface uses the production label/path while AC5 asks for an isolated launchd smoke. Without test-only label/plist/log overrides, a local test run can bootout or rewrite the founder's real `com.echo.daemon` service.

3. medium - `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:211`

   `/usr/bin/env node` plus a fixed plist `PATH` is fragile under nvm/asdf/mise/Volta. The install can succeed interactively and then fail under launchd, or launch with the wrong Node major version.

4. medium - `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:239`

   The install flow stops the old job before the spec requires preflight of the replacement daemon path, copied runtime files, schemas, and Node executable. A broken package would turn upgrade into a daemon outage with weak recovery guidance.
