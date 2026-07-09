---
item_id: "2026-07-09-130-decision-changeset-compiler-v0"
round: 3
reviewer: "codex-ops"
artifact_sha: "1b4badac3dfaacf5a43e269f3c9982ffe7a25641"
completed_at: '2026-07-09T19:07:42Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-09-130-decision-changeset-compiler-v0.md: Stage 5/6 edit_history and line_key"
    finding: "Duplicate Slack delivery of the same accepted thread reply can still append a second accepted add/split op at a new edit_history position, producing new e<edit_seq> line_keys and later duplicate atoms/Linear mutations. Patch the spec to persist a Slack event/client identity on edit attempts and require duplicate deliveries to no-op or reuse the original accepted edit_history entry; add a test where the same add or split reply is delivered twice and only one new line and one line_key are produced."
  - severity: "medium"
    where: "backlog/proposed/2026-07-09-130-decision-changeset-compiler-v0.md: Stage 6 resume contract and AC8"
    finding: "A stale lease takeover can create two live apply owners during phase 2 if the original owner resumes after the lease expires. Query-before-create/query-before-close idempotency is not atomic against concurrent Linear calls, so duplicate creates or duplicate close comments remain possible. Patch the spec to require owner-token fencing before each external side effect plus a durable per-line mutation claim/heartbeat or equivalent single-owner guard, and test that a stale owner cannot continue applying a line after another owner has taken the lease."
  - severity: "medium"
    where: "backlog/proposed/2026-07-09-130-decision-changeset-compiler-v0.md: Stage 6 close marker and AC5"
    finding: "The close retry contract covers already-closed plus marker, but does not pin the crash case where the marker comment was posted and the state transition did not happen. Patch the spec and tests so marker-present/open-issue means skip the second comment but still perform the close transition; only marker-present/already-closed is a full no-op."
---
