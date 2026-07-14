---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 12
reviewer: "codex-ops"
artifact_sha: "83ba8a0ec42306b58948b7a942a16521962a89ad"
completed_at: '2026-07-14T01:54:19Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3 — Preserve loop-owned coordination semantics"
    finding: "The invokeRole idempotency boundary is not crash-safe or fully defined. Its public input has neither actor nor kind, so the stated `(actor,kind,correlationId)` key cannot be constructed unambiguously; additionally, transactional admission occurs before publication without a durable pending/outbox state. A crash can therefore leave a retry classified as duplicate although no invocation was published, or permit double publication if the reservation was not committed. Define an explicit invocation key and payload hash, atomically persist a durable pending record, publish through a recoverable state transition, return the original invocationId for duplicates, reconcile pending rows after restart, and test process death at every transaction/publication boundary."
  - severity: "medium"
    where: "AC3 signal contract and AC7 fetch, oracle, audit, and verifier execution"
    finding: "The spec defines exit codes for one catchable signal but provides no bounded cleanup, repeated-signal policy, or independent wall-clock timeout for child processes and migration phases. A stalled npm fetch, sandboxed oracle, audit, or cleanup handler can hang indefinitely and never produce the promised durable failure evidence. Require monotonic per-command deadlines, process-group termination and reaping, a one-shot shutdown latch, deterministic handling of a second signal, and tests using nonresponsive children that verify bounded exit, one diagnostic, no survivors, and retained phase/timeout evidence."
  - severity: "medium"
    where: "AC1 provenance/toolchain.v1.json and AC7 isolated install/clone commands"
    finding: "The pinned toolchain is not closed over the commands the spec requires. Every sanitized invocation starts with `/usr/bin/env`, `git clone --no-local` can execute Git libexec helpers such as upload-pack and index-pack, and the pinned npm-cli.js entry loads the remainder of npm's module tree; none of those runtime components is covered by the stated path/version/hash set, while the tests claim failure if any other executable is used. Expand the provenance manifest and sandbox allowlist to the complete executed and loaded runtime closure, hash that closure, record the resolved Git exec path, and add tamper tests proving an altered helper or npm module fails preflight."
---
