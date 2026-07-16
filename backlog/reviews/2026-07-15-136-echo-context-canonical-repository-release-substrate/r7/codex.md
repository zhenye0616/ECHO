---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 7
reviewer: "codex"
artifact_sha: "d309cdebc804c2fd5aa924f14d4d7496358b0a0a"
completed_at: '2026-07-16T04:22:03Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC6 — layered rerun rejection"
    finding: "The successful attempt-1 rerun-guard is not guaranteed to be selected by GitHub's failed-jobs rerun; the selected failed jobs then skip on their run_attempt == 1 conditions, leaving no executed failing job and permitting the all-skipped result AC6 forbids. Add a no-permissions, no-environment terminal sentinel or equivalent that fails whenever an attempt-1 job fails, is therefore selected on failed-only reruns, and fails again on run_attempt > 1. Test failed-job scheduler selection, not only the static conditions."
  - severity: "high"
    where: "AC3 and AC6 — approved manifest-hash verification"
    finding: "verify:artifact accepts only the archive, checksum, and manifest paths, while release-mode fresh-clone acceptance has no approved manifest-hash or tuple input and the tuple record is workflow-only. The fresh clone can recompute the manifest hash but cannot compare it with the founder-approved value as required. Add an explicit external expected-manifest-hash or approved-tuple input sourced from the approval/migration record, persist that value in the handoff record, and add a valid-artifact/wrong-approved-hash negative fixture."
  - severity: "medium"
    where: "AC6 and Tests — protected-environment verification"
    finding: "The workflow-policy test contract checks that publish-release names the environment but does not cover the required reviewer set exactly equal to zhenye0616, prevent-self-review false, administrative bypass disabled, main-only deployment policy, or failure when any field is missing, unexposed, or unenforceable. Specify the concrete API-readback verifier and ownership, then add fixtures for every required field and fail-closed case."
  - severity: "medium"
    where: "AC6 and Tests — workflow-artifact download"
    finding: "The generic commit-SHA-pinned download-action alternative does not guarantee access to the raw workflow-artifact archive before extraction; common download actions extract internally. Prescribe the exact-ID REST download to a file or name an action that demonstrably preserves the raw archive, require actions: read, and add assertions for wrong artifact name plus rejection of name/latest-based retrieval before raw-digest verification and safe extraction."
  - severity: "medium"
    where: "AC6 and Tests — release identity readback"
    finding: "The release-identity fixtures omit two normative checks: draft creation must leave the tag ref absent, and the annotated tag must carry the required version/source-SHA message. Add negative fixtures for an implicitly created tag and for a missing or incorrect annotation message."
  - severity: "medium"
    where: "AC1, AC4, and Tests — secret-scan contract"
    finding: "The tests cover unsupported and digest-mismatched scanner binaries but do not prove that an actual leak finding or scanner failure remains nonzero through redaction/reporting. They also cannot substantiate bootstrap-versus-committed command equivalence if the bootstrap command exists only in the sibling Project_echo migration record. Add leak-exit and pipeline-masking fixtures and persist a target-repository scan-contract artifact or digest that both the bootstrap record and tools/secret-scan.sh bind to."
---
