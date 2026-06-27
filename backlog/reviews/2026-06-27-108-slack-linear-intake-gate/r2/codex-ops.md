---
item_id: "2026-06-27-108-slack-linear-intake-gate"
round: 2
reviewer: "codex-ops"
artifact_sha: "1509a93db764083ec1253d24acb6ab4995176d71"
completed_at: '2026-06-27T22:13:20Z'
verdict: "pushback"
findings:
  - severity: "medium"
    where: "AC3 / R4 — Linear-create exactly-once"
    finding: "The crash-after-create-before-status-write requirement is still not operationally buildable under the spec's own constraints. If Linear receives the create and the responder dies before persisting the issue id/url, the next tick only has local state `creating` plus an idempotency token; with Linear reads forbidden and API idempotency only optional, it cannot both recover the created issue and prove that a second create is safe. Patch the spec to require a concrete, verified Linear idempotency mechanism that can return the original issue on replay, or change this failure mode to `needs-reconcile` with requester-visible failure and no automatic second create. The current test expectation to `recover stored id` after a crash is not valid unless the id was durably stored before the crash."
  - severity: "medium"
    where: "AC3 / R5 — Slack ingress de-dupe"
    finding: "The de-dupe key `team:channel:event_id / action_id` is unsafe for unattended Slack operation because `action_id` identifies the button/action definition, not a unique delivery. Using it as the durable idempotency key can either collapse unrelated confirmations or fail to identify replayed deliveries, depending on payload shape. Patch the spec to require distinct durable keys for Slack message events and interactive actions using the unique envelope/event/action delivery identifier plus draft/thread identity, and keep consumed-draft handling as the final no-op guard."
  - severity: "medium"
    where: "AC4 — project resolution"
    finding: "Project routing has contradictory runtime behavior: AC4 says an unmapped Client/project defaults to `LINEAR_DEFAULT_PROJECT_ID`, while the tests require an unresolvable project to produce an operator-visible error with no partial issue. In unattended use this decides whether a typo silently creates work in the wrong Linear project or fails closed. Patch the spec to pick one behavior explicitly, including the Slack requester reply and durable operator evidence for the rejected/defaulted case."
---
