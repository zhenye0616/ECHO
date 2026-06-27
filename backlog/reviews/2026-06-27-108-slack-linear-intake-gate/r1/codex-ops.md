---
item_id: "2026-06-27-108-slack-linear-intake-gate"
round: 1
reviewer: "codex-ops"
artifact_sha: "044e7669597babd7c98adc6d7827e58650328b63"
completed_at: '2026-06-27T22:06:50Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-27-108-slack-linear-intake-gate.md:101"
    finding: "AC3 requires exactly one Linear issue across Slack retries, double-clicks, and crash-after-write replay, but the spec does not require a Linear-side idempotency key or an unknown-outcome recovery path. Patch AC3/AC4 and tests so the draft stores a deterministic idempotency token before calling Linear, reuses it on retries if the API supports it, or stops with operator-visible reconciliation evidence instead of issuing a second create when success is uncertain."
  - severity: "medium"
    where: "backlog/proposed/2026-06-27-108-slack-linear-intake-gate.md:88"
    finding: "AC1/AC3 say the responder acks, runs the intake brain, posts cards, and creates Linear issues, but they do not require Slack event/action de-duplication beyond confirm draft idempotency. In Socket Mode, Slack retries events and interactive actions when ack is slow or the process restarts, which can produce duplicate follow-up questions/cards or execute a stale confirm. Patch AC1/AC3 tests to assert immediate Slack ack before brain/Linear work and durable de-dupe keyed by team/channel/event_id/action_id/draft_id."
  - severity: "medium"
    where: "backlog/proposed/2026-06-27-108-slack-linear-intake-gate.md:96"
    finding: "AC2 keys durable intake state only by Slack thread_ts. That is not a safe operational key across channels/workspaces and can cross-contaminate concurrent intake requests in the same thread. Patch AC2/AC3 to key state and locks by team_id + channel_id + thread_ts + draft/request id, and add a collision/concurrent-thread test."
  - severity: "medium"
    where: "backlog/proposed/2026-06-27-108-slack-linear-intake-gate.md:109"
    finding: "AC4 covers missing API key/project as operator-visible, but it does not specify timeouts, retry/backoff, rate-limit handling, or durable failure evidence for Linear/Slack network failures. Patch AC4/AC6 to require bounded external-call timeouts, no retry path that can duplicate issue creation, a requester-visible failure reply, and a durable operator-visible log/draft status for retry or manual reconciliation."
---
