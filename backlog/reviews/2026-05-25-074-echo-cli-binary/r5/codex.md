---
item_id: "2026-05-25-074-echo-cli-binary"
round: 5
reviewer: "codex"
artifact_sha: "2ce9fc2af9a09bdd775df7cc047ef22d00291217"
completed_at: '2026-05-26T06:52:08Z'
verdict: "proceed_after_patches"
findings:
  - severity: medium
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:502-516,692-694"
    finding: >-
      The r5 `signalGate.beforeNextSpawn` contract is still internally inconsistent. AC5.3 says the hook is awaited after the loop's pre-iteration `signal.aborted` check, but AC7.4 case 12a expects that same pre-iteration check to observe the SIGTERM emitted by the hook and append an interrupted step without spawning. If the test hook emits on every call, it fires before step 1 rather than between steps; if it emits only on the second call, the loop has already passed the only abort check for step 2 and can still spawn after SIGTERM. Patch the spec to either move the hook before the abort check or require a second post-hook abort check, and spell out that the 12a fixture emits only on the second hook invocation.
  - severity: medium
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:121,145-150; .gitignore:40"
    finding: >-
      AC1.1 allows a plain `tsc` build that emits a multi-file `dist/cli/` tree, while AC1.5 packages the result with `npm pack`; at this SHA `dist/` is gitignored and `package.json` has no `files` allowlist. npm will include the `bin` target itself, but not arbitrary ignored sibling modules under `dist/cli/commands` / `dist/cli/workflow`, so a packed/global install can have `echoctl --version` pass while real subcommands fail with module-resolution errors. Patch the spec to require either a single-file bundle or package metadata that includes the full emitted CLI tree, and extend the smoke to invoke a packed subcommand path such as `echoctl --help` or `echoctl doctor --help`.
---

# Codex review

Verdict: `proceed_after_patches`.

The r5 artifact closes the stale uninstall expectation and adds the missing `projects.json` fallback seam/test. I do not see a new broad architecture blocker.

The remaining issues are bounded spec patches: the signal-gate ordering still does not make case 12a implementable as written, and the npm-pack smoke needs to account for tsc's multi-file output under the repo's ignored `dist/` tree.

## Findings

1. **medium** - `backlog/ready/2026-05-25-074-echo-cli-binary.md:502-516,692-694`

   The r5 `signalGate.beforeNextSpawn` contract is still internally inconsistent. AC5.3 says the hook is awaited after the loop's pre-iteration `signal.aborted` check, but AC7.4 case 12a expects that same pre-iteration check to observe the SIGTERM emitted by the hook and append an interrupted step without spawning. If the test hook emits on every call, it fires before step 1 rather than between steps; if it emits only on the second call, the loop has already passed the only abort check for step 2 and can still spawn after SIGTERM. Patch the spec to either move the hook before the abort check or require a second post-hook abort check, and spell out that the 12a fixture emits only on the second hook invocation.

2. **medium** - `backlog/ready/2026-05-25-074-echo-cli-binary.md:121,145-150; .gitignore:40`

   AC1.1 allows a plain `tsc` build that emits a multi-file `dist/cli/` tree, while AC1.5 packages the result with `npm pack`; at this SHA `dist/` is gitignored and `package.json` has no `files` allowlist. npm will include the `bin` target itself, but not arbitrary ignored sibling modules under `dist/cli/commands` / `dist/cli/workflow`, so a packed/global install can have `echoctl --version` pass while real subcommands fail with module-resolution errors. Patch the spec to require either a single-file bundle or package metadata that includes the full emitted CLI tree, and extend the smoke to invoke a packed subcommand path such as `echoctl --help` or `echoctl doctor --help`.
