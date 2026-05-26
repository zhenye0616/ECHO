---
item_id: "2026-05-25-074-echo-cli-binary"
round: 3
reviewer: "codex"
artifact_sha: "ca21a05281d8703360654b8058e1a1bfd698b1b1"
completed_at: '2026-05-26T06:23:10Z'
verdict: "proceed_after_patches"
findings:
  - severity: medium
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:32"
    finding: >-
      The r3 binary rename has not fully cascaded. AC1.1 correctly sets `bin.echoctl`, but the frontmatter still tells the builder to add `bin: { echo: ... }`, AC1.2 documents the grammar as `echo <subcommand>`, and AC1.3 points failures at `echo <cmd> --help`. Those are the exact user-facing/builder-facing strings that caused the original builtin collision, so the spec still contains incompatible command names. Patch these to `echoctl` everywhere except intentional MCP server names such as `claude mcp add echo`.
  - severity: medium
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:145"
    finding: >-
      AC1.5's shell-reachability smoke is not hermetic with the current package shape. The bin points at `./dist/cli/index.js`, AC1.1 says there is no `prepare`/auto-build hook, and the pinned `package.json` has no lifecycle script that would create `dist` during `npm pack` or `npm install -g <path>`. A fresh test run can therefore either install a broken bin or accidentally pass against stale local build output. Patch the smoke to run `npm run build:cli` into the tmp install input, or add an explicit pack/install lifecycle and test that exact lifecycle.
  - severity: medium
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:492"
    finding: >-
      The ENOENT remediation says the user's escape hatch is `--agent <role>=<absolute-path>`, but the public `agentOverrides` type is `ReadonlyMap<string, AgentKind>` and the matcher validates overrides as onboarded `AgentKind` values. The tests only cover `--agent reviewer=codex` / `cursor`. A builder cannot implement an absolute-path override without changing the reviewed interface, parser grammar, match semantics, and tests. Either remove the absolute-path escape-hatch copy, or explicitly add a separate binary-path override contract and coverage.
  - severity: medium
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:252"
    finding: >-
      The doctor MCP probe is underspecified for the installed Streamable HTTP transport. The pinned server tests' raw HTTP helper sends `Accept: application/json, text/event-stream` and `Content-Type: application/json` before posting the JSON-RPC `initialize` body; AC3.2 only says "send a single HTTP POST" with a minimal body. If the builder omits the transport-required headers, a healthy daemon can be reported unreachable. Patch AC3.2/AC7.2 to pin the exact headers and initialize envelope, or switch doctor to the SDK client intentionally.
  - severity: low
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:26"
    finding: >-
      AC4.4's stale pre-r2 wording still appears in frontmatter: `inverse/skills.ts` is described as removing files "only those listed in DEFAULT_ROLE_FILENAMES -> role.skills union", while the body correctly changed the source to enumerating `~/.echo/skills/*.md`. The R-flagged section also still asks reviewers to revisit the dropped marker mechanism. Patch the stale summary/pushback text so the builder does not reintroduce the already-dispositioned uninstall bug.
---

# Codex review

Verdict: `proceed_after_patches`.

The r3 patches resolve the prior high-severity role-loading, sandbox data-flow, skill enumeration, and matcher taxonomy blockers. I do not see a remaining reason to push back on the overall design, but the spec still needs a small cleanup pass before a builder should claim it.

## Findings

1. **medium** - `backlog/ready/2026-05-25-074-echo-cli-binary.md:32`

   The r3 binary rename has not fully cascaded. AC1.1 correctly sets `bin.echoctl`, but the frontmatter still tells the builder to add `bin: { echo: ... }`, AC1.2 documents the grammar as `echo <subcommand>`, and AC1.3 points failures at `echo <cmd> --help`. Those are the exact user-facing/builder-facing strings that caused the original builtin collision, so the spec still contains incompatible command names. Patch these to `echoctl` everywhere except intentional MCP server names such as `claude mcp add echo`.

2. **medium** - `backlog/ready/2026-05-25-074-echo-cli-binary.md:145`

   AC1.5's shell-reachability smoke is not hermetic with the current package shape. The bin points at `./dist/cli/index.js`, AC1.1 says there is no `prepare`/auto-build hook, and the pinned `package.json` has no lifecycle script that would create `dist` during `npm pack` or `npm install -g <path>`. A fresh test run can therefore either install a broken bin or accidentally pass against stale local build output. Patch the smoke to run `npm run build:cli` into the tmp install input, or add an explicit pack/install lifecycle and test that exact lifecycle.

3. **medium** - `backlog/ready/2026-05-25-074-echo-cli-binary.md:492`

   The ENOENT remediation says the user's escape hatch is `--agent <role>=<absolute-path>`, but the public `agentOverrides` type is `ReadonlyMap<string, AgentKind>` and the matcher validates overrides as onboarded `AgentKind` values. The tests only cover `--agent reviewer=codex` / `cursor`. A builder cannot implement an absolute-path override without changing the reviewed interface, parser grammar, match semantics, and tests. Either remove the absolute-path escape-hatch copy, or explicitly add a separate binary-path override contract and coverage.

4. **medium** - `backlog/ready/2026-05-25-074-echo-cli-binary.md:252`

   The doctor MCP probe is underspecified for the installed Streamable HTTP transport. The pinned server tests' raw HTTP helper sends `Accept: application/json, text/event-stream` and `Content-Type: application/json` before posting the JSON-RPC `initialize` body; AC3.2 only says "send a single HTTP POST" with a minimal body. If the builder omits the transport-required headers, a healthy daemon can be reported unreachable. Patch AC3.2/AC7.2 to pin the exact headers and initialize envelope, or switch doctor to the SDK client intentionally.

5. **low** - `backlog/ready/2026-05-25-074-echo-cli-binary.md:26`

   AC4.4's stale pre-r2 wording still appears in frontmatter: `inverse/skills.ts` is described as removing files "only those listed in DEFAULT_ROLE_FILENAMES -> role.skills union", while the body correctly changed the source to enumerating `~/.echo/skills/*.md`. The R-flagged section also still asks reviewers to revisit the dropped marker mechanism. Patch the stale summary/pushback text so the builder does not reintroduce the already-dispositioned uninstall bug.
