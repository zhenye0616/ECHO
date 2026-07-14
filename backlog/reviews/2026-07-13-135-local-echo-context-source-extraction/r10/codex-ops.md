---
item_id: "2026-07-13-135-local-echo-context-source-extraction"
round: 10
reviewer: "codex-ops"
artifact_sha: "8327efe7b05c67edce34078a13272b20c0e40f14"
completed_at: '2026-07-14T01:06:39Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC7 — Preserve provenance and prove source independence"
    finding: "The fetch sandbox promises network access only for lock-authorized packages, but sandbox-exec can authorize endpoints, not package identities or paths inside registry TLS traffic. Specify an enforceable lock-derived broker with direct egress denied, or narrow the guarantee to registry-endpoint egress followed by integrity verification. Test that an unlisted tarball request is blocked before bytes are fetched."
  - severity: "high"
    where: "AC8 — Prove local service parity and record the handoff"
    finding: "Durable capsules are required only for a failed process stop. Export, dependency, audit, sandbox, parity, record-generation, and catchable-signal failures can therefore exit without durable evidence. Require a top-level finalizer for every nonzero or catchable-signal path after attempt-root creation; it must preserve the original status, atomically publish and verify the capsule before cleanup, and retain scratch state if publication fails. Add representative fault-injection tests."
  - severity: "medium"
    where: "AC1 — Materialize one local Git repository without shipping migration machinery"
    finding: "The evidence hierarchy is new, but only a non-recursive mkdir of the attempt directory is specified. A clean host will fail with ENOENT if `.echo-migration-evidence/135` is absent. Define validated parent provisioning or an explicit founder-owned precondition, test the absent-parent case, and provide operator-visible fallback evidence for failures before the attempt directory exists."
  - severity: "medium"
    where: "AC1, AC2, and AC7 toolchain launch contract"
    finding: "An absolute npm or node_modules/.bin path can still use a `#!/usr/bin/env node` shebang, making execution depend on poisoned PATH and either invoking the tripwire or an unpinned Node. Require the pinned Node executable plus an absolute JavaScript entry point for JS CLIs, or define and verify an immutable minimal PATH and shebang policy."
  - severity: "medium"
    where: "AC7 — dependency acquisition and sandbox roots"
    finding: "The env-i install contract isolates HOME, XDG, and npm cache state but does not set TMPDIR, TMP, or TEMP. Node and npm can consequently use shared `/tmp`, causing sandbox denial, cross-attempt collisions, or writes outside owned cleanup roots. Require a mode-0700 attempt-local temp directory, set all three variables, allow only that root, and assert that default temp locations remain untouched."
  - severity: "medium"
    where: "AC8 — Project_echo failure publication"
    finding: "Bounded push retry does not define non-fast-forward, dirty-tree, autostash, rebase, merge, or force-push behavior. Limit retries to transient failures; forbid automatic autostash, rebase, merge, and force-push; and on upstream divergence retain the local commit and worktree while recording local and remote SHAs in the capsule."
---
