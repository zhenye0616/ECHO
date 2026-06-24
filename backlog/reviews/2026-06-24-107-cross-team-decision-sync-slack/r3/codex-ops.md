---
item_id: "2026-06-24-107-cross-team-decision-sync-slack"
round: 3
reviewer: "codex-ops"
artifact_sha: "b099353b1f0a957215614dfc5954f265390f464a"
completed_at: '2026-06-24T05:04:38Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-24-107-cross-team-decision-sync-slack.md / R1 - Shared decision store / Read path"
    finding: "The read-path bullet still allows a machine-scoped raw-store path for the asker's own raw store, which contradicts AC2/R3's decision-layer-only Slack surface and can reintroduce cross-machine raw routing at runtime. Patch R1 to remove the exception and make cross-team-scope.test.ts assert that the Slack cross-team surface refuses all raw-store access, including the asker's own machine-scoped store."
  - severity: "medium"
    where: "backlog/proposed/2026-06-24-107-cross-team-decision-sync-slack.md / AC3 and R5 - Confirm idempotency"
    finding: "Confirm idempotency is specified as durable, but not atomic across the draft-store status transition and the decision-store append. A responder crash or Slack retry between those writes can lose a confirmed decision or append twice. Patch AC3/R5 to require a single atomic or replay-safe confirm operation that persists the resulting decision_atom_id/result, and extend confirm-idempotency.test.ts with concurrent retry and crash-after-one-write coverage."
  - severity: "medium"
    where: "backlog/proposed/2026-06-24-107-cross-team-decision-sync-slack.md / R2 and AC6 - propose_decision confirm card routing"
    finding: "The MCP-originated propose_decision call has no Slack event context, but the spec does not define the confirm-card destination, such as a channel/user mapping or env var. In unattended onboarding this can fail after the tool call or post to the wrong place. Patch R2/AC6 to require explicit confirm-target configuration, startup/runbook validation, and a test that a missing target returns an operator-visible error without creating a draft."
---
