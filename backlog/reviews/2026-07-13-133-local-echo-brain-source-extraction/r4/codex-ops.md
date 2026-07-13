---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 4
reviewer: "codex-ops"
artifact_sha: "fa7b3a03ad11e39c0ea89fb252dac52bcf6790ad"
completed_at: '2026-07-13T22:12:05Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC7 — Prove native source independence and parity"
    finding: "The required cache-cold install cannot run as specified: env -i gives npm a fresh scratch HOME/cache while sandbox-exec denies all network, so npm ci has no source for dependency tarballs. Define a deterministic acquisition phase or a verified run-scoped cache populated from package-lock integrity records, then run npm ci with explicit offline/cache arguments and durable failure evidence."
  - severity: "high"
    where: "AC1 — external state and resume contract"
    finding: "Resume state is bound to the item and source SHA but not to the orchestrator revision or hashes of echo-brain.mjs, the sandbox profile, and publication helper. A rebase or tool edit can therefore reuse checkpoints produced by different control logic and publish a mixed-provenance candidate. Persist those control-plane identities at start and reject every resume, reconcile, quarantine, and publication operation when they differ."
  - severity: "high"
    where: "AC1 and AC7 — lock ownership and process-group supervision"
    finding: "Lock liveness records only the orchestrator PID/start identity, while child processes merely receive the nonce. If the orchestrator is killed without running its signal handler, a build or npm child can remain active; the lock then appears stale and may be quarantined while that child still mutates staging or run output. Record the supervised process-group identity, refuse quarantine/resume while any matching member survives, and add an orphaned-child failpoint test."
  - severity: "medium"
    where: "AC1 — target lock acquisition"
    finding: "The spec does not give the target lock a canonical target-keyed path, and the external state path itself is run-scoped. This leaves room for two different run IDs to acquire independent locks and race toward the same final target. Specify one canonical lock outside run directories and test simultaneous starts with distinct run IDs, including crash-before-owner and quarantine races."
  - severity: "medium"
    where: "AC5, AC7, and Tests — build-artifact command contract"
    finding: "AC5 requires a distinct artifact-lock path, but the exact AC7 invocation omits an artifact-lock argument and the Tests section invokes npm run build:artifact without any required arguments. Define the option and atomic ownership/stale-lock semantics, include it in every exact command, and test overlapping build invocations plus interrupted lock recovery."
  - severity: "medium"
    where: "AC8 — immutable handoff"
    finding: "The migration record names the artifact version and SHA-256 but no immutable artifact location, while verify-handoff does not explicitly require reopening and hashing the artifact bytes. Record the exact run-scoped artifact path and manifest identity, and require verify-handoff to prove the object still exists and rehashes to the recorded digest before independent review."
---
