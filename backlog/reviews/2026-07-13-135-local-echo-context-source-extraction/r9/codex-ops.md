---
item_id: "2026-07-13-135-local-echo-context-source-extraction"
round: 9
reviewer: "codex-ops"
artifact_sha: "5e48df5c8b01480ddc76bb50d4f60aee17cf088b"
completed_at: '2026-07-14T00:32:22Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC7 — isolated npm installation"
    finding: >-
      Registry access cannot be proven to contain only lock-authorized fetches with the stated sandbox; npm may make audit, metadata, redirect, or notifier requests, and a successful install supplies no network-closure evidence. Require separate lock-derived, integrity-verified acquisition records and caches for source and target, then run the accepted installs with deny-all network using `npm ci --offline --ignore-scripts --no-audit --no-fund`; enumerate and rebuild any required transitive lifecycle artifacts offline.
  - severity: "high"
    where: "AC7 and AC8 — service sandbox"
    finding: >-
      The single service-profile contract does not establish how both server and client are sandboxed when the exact port is known only after the server binds. Applying an exact-port policy after readiness can leave the server itself unsandboxed. Require distinct parameterized enforcement: launch the server inside a scratch-only profile that permits loopback bind but denies outbound connections, then launch the client under an exact reported-address-and-port profile; run filesystem and network denial probes against both roles.
  - severity: "medium"
    where: "AC2 and AC7 — runtime inventory and PATH isolation"
    finding: >-
      Pinning Node/npm in package metadata and inventorying spawned executable names does not prove which binaries execute. A hostile PATH sentinel could execute and delegate without changing output. Require exact runtime-version preflight, controlled executable resolution through `process.execPath`, target-local binaries, or approved absolute paths, and nondelegating per-name tripwires whose invocation is asserted to remain zero.
  - severity: "medium"
    where: "AC7 — private review clone"
    finding: >-
      `git clone --no-local --no-hardlinks` still follows the source repository's current ref and retains an `origin` pointing at the shared target. Require the verifier to capture the recorded 40-character HEAD and tree, clone into an absent unique directory, detach and verify that exact OID, remove `origin`, prove clean/no-remotes/no-alternates/no-promisor state, and recheck that the shared target HEAD did not change.
  - severity: "medium"
    where: "AC3 — parity sidecar and framing"
    finding: >-
      Aggregate framing is specified, but the sidecar bytes, case-ID constraints, and response-to-case-digest bytes remain ambiguous. Define the sidecar as exactly the lowercase manifest SHA-256 plus LF, verify it before parsing, require unique ASCII case IDs excluding NUL/LF with bytewise sorting, and specify canonical response projection with failure on undeclared volatile fields.
  - severity: "medium"
    where: "AC3, AC7, and AC8 — asynchronous child lifecycle"
    finding: >-
      The `wait new` case has no subscription-ready barrier, and fixed timeouts do not require failed MCP or service children to be terminated and reaped. Require a scripted readiness barrier followed by the post-subscription append or controlled-clock advance, plus process-group ownership with bounded TERM/KILL/wait cleanup on every exit path and injected failure tests proving that no child or listener survives.
  - severity: "medium"
    where: "AC8 — failed-stop evidence and scratch cleanup"
    finding: >-
      Appending failure metadata inside an isolated Project_echo worktree does not make it durable, and retained paths may reference scratch that cleanup subsequently deletes. Preserve bounded stdout/stderr and sandbox-denial diagnostics in an atomically written failure capsule before cleanup, commit and push it with bounded retry, and on publication failure retain the worktree while exposing its stable path. Guard deletion with a unique orchestrator-created scratch root, canonical non-symlink containment checks, and failure-injection tests proving that target, source, siblings, and sentinels cannot be removed.
---
