---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 11
reviewer: "codex-ops"
artifact_sha: "b6095d0265b6a6fce2386cd20d98e9965a65359d"
completed_at: '2026-07-14T01:16:31Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC6; Risks; Tests — tests/migration/test-parity.test.ts"
    finding: "AC6 requires the eight pinned tests to remain byte-identical, but Risks and Tests still describe transformed-hash parity. That wording could permit rewritten tests to pass. Replace both references with the byte-identical source-blob, content-hash, destination-hash, and byte-comparison contract, explicitly rejecting any differing byte."
  - severity: "high"
    where: "AC5 — manual receipt reconciliation"
    finding: "Manual reconciliation can retry the remote push and update the canonical receipt after execution merely 'stops', without requiring verified builder-process quiescence, a recorded writer handoff, or pre-intent/raw-log/post-result receipt updates for the retry itself. Require process-group quiescence, takeover from the exact HANDOFF_COMMIT_RECORDED generation with abort-on-generation-change, and durable command/result evidence before monotonically writing PUSH_CONFIRMED/HANDOFF_PUBLISHED."
  - severity: "medium"
    where: "AC7 — package-script npm invocations"
    finding: "The two npm ci commands explicitly select their caches, but subsequent npm run invocations only state that they use the writable offline cache. Under env -i, npm can instead default to the scratch HOME cache or fail the sandbox. Specify the exact npm invocation/config for every lifecycle, build, and test command, including cache, userconfig, globalconfig, and offline settings, and verify the effective cache path before execution."
  - severity: "medium"
    where: "AC1 and AC5 — evidence parent-chain validation"
    finding: "The spec records and revalidates owner and mode metadata, but only explicitly assigns mode 0700 when creating missing evidence parents; it never states that a pre-existing evidence component with the wrong owner or permissions must be rejected. Add component-specific acceptance predicates and require tuple equality during revalidation, including expected ownership and owner-only permissions for every evidence directory."
  - severity: "medium"
    where: "AC5 and AC8 — retained evidence versus scratch cleanup"
    finding: "AC5 prohibits evidence cleanup while AC8 permits deletion of uniquely owned ephemeral scratch, although HOME, XDG, TMPDIR, caches, profiles, tool-bin, outputs, and private verification roots all live beneath the attempt root. Containment alone does not distinguish disposable scratch from retained evidence. Define an explicit cleanup allowlist and forbid removal of receipt, logs, profiles, probes, manifests, immutable cache evidence, and artifact subtrees through review disposition."
---
