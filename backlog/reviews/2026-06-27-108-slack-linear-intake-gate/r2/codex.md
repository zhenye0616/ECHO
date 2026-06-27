---
item_id: "2026-06-27-108-slack-linear-intake-gate"
round: 2
reviewer: "codex"
artifact_sha: "1509a93db764083ec1253d24acb6ab4995176d71"
completed_at: '2026-06-27T22:13:30Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3 / R4 Linear-create exactly-once"
    finding: "The spec still requires crash-after-create-before-status-write replay to recover the stored Linear id, but no stored id can exist if the process crashes before the status write unless the Linear API is explicitly used with a server-side idempotency key. Patch AC3 and the test contract to make replay of creating-without-result enter needs-reconcile with no second create, or make Linear idempotency-key support a required client contract and test it."
  - severity: "medium"
    where: "AC3 / R5 Slack ingress de-dupe"
    finding: "The de-dupe key for interactive confirms is specified as action_id, but Slack Block Kit action_id is a static button identifier, not a unique delivery id; using it would either suppress unrelated confirms or fail to identify replays precisely. Patch R5 to define distinct durable keys for event messages and interactive actions, and add tests for two separate confirm cards with the same action_id."
  - severity: "medium"
    where: "AC4 / linear-client.test.ts"
    finding: "Project resolution has contradictory behavior: AC4 says an unmapped Client/project defaults to LINEAR_DEFAULT_PROJECT_ID, while linear-client.test.ts requires an unresolvable project to produce an operator-visible error with no issue. Pick one behavior and align AC4, the runbook config text, and the test assertion before build starts."
---
