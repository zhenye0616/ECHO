---
item_id: "2026-07-09-130-decision-changeset-compiler-v0"
round: 1
reviewer: "codex-ops"
artifact_sha: "d36cf4fc83ca21aa5a1e78d6b22a07de3983de1f"
completed_at: '2026-07-09T18:52:21Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC4 / AC5"
    finding: "decision_atom_id is minted when the team-decision atom is appended but is also the required Linear idempotency key; patch the spec to pin crash retry ordering so a crash after atom append and before Linear apply reuses the same durable atom ids from draft/apply state or a stable atom dedupe key, rather than appending duplicate atoms or losing the pending Linear mutations."
  - severity: "medium"
    where: "AC4 / AC5 / linear-client close path"
    finding: "Close mutations lack an idempotent retry contract; patch the spec to require closing an already-closed target to succeed as a no-op and to de-dupe the decision closing comment by decision_atom_id plus target issue id, so a crash after close but before draft completion cannot loop or leave duplicate comments."
  - severity: "medium"
    where: "AC2 / AC4"
    finding: "Thread edits and confirm can race because the spec does not require a draft revision or compare-and-swap lock around the rendered changeset; patch the spec so confirm applies only the latest rendered revision or rejects and re-renders when edits arrive during apply, with an operator-visible Slack failure instead of silently applying stale mutations."
  - severity: "medium"
    where: "AC2"
    finding: "The natural-language edit loop has no runtime failure contract; patch the spec to require unrecognized or ambiguous edits to leave the draft unchanged, record the failed edit in history, and render a visible needs-human message rather than silently ignoring or partially applying the edit."
---
