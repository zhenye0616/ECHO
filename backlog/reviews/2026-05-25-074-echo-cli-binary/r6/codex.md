---
item_id: "2026-05-25-074-echo-cli-binary"
round: 6
reviewer: "codex"
artifact_sha: "78ca68b1ba80aebd0dd1e489f73998dda93543a7"
completed_at: '2026-05-26T07:03:22Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:115"
    finding: "AC1.1's npm files allowlist only packs dist/cli/**, but the required CLI implementation imports existing runtime modules outside src/cli (for example echo-home/wizard, echo-home/adapters/atomic-write, daemon/lifecycle, guards). A normal tsc ESM emit preserves those imports as ../../echo-home/... and emits the dependencies under dist/echo-home, dist/daemon, etc.; npm pack will omit them, so the globally installed echoctl can resolve the bin and even dist/cli/commands/doctor.js while failing with ERR_MODULE_NOT_FOUND as soon as a command imports its real helpers. Patch AC1.1 to either pack the whole emitted runtime tree, e.g. dist/**/*.js and dist/**/*.d.ts, or require a true self-contained bundle, and make AC1.5 assert the installed tarball exercises at least one transitive helper import rather than only the dist/cli command file."
  - severity: "medium"
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:124"
    finding: "The deps-safe build path names tsc -p tsconfig.cli.json, but that file does not exist in the repo and is not listed in files_to_modify. The current root tsconfig has no outDir/declaration emit contract and includes tests/tools, so a builder following the specified tsc route has no concrete way to emit the dist layout that AC1.1 and AC1.5 depend on. Add tsconfig.cli.json to files_to_modify and pin the rootDir/outDir/include shape, or replace the script with an explicit existing-config tsc command that is proven to emit the packaged layout."
---

## Review

Verdict: `proceed_after_patches`.

The r6 signal-handling patches look implementable: the tail-positioned `signalGate.beforeNextSpawn` plus the post-dispatch `beforeExitDerivation` gate give tests deterministic hooks for the between-step and post-final-step windows. I did not find a new ordering bug there.

The remaining blocker is the CLI build/package contract. AC1.1 fixes the earlier multi-file `dist/cli` omission, but it still assumes the CLI's runtime graph lives entirely under `dist/cli`. The spec itself requires imports from 070-073 modules outside `src/cli`, so a plain `tsc` emit will leave required JS outside the packed allowlist. That needs to be patched before builder claim; otherwise the shell smoke can pass reachability while the installed command is still broken for real subcommands.
