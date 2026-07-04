---
item_id: "2026-07-04-114-drift-sweep-v0"
round: 1
reviewer: "codex-ops"
artifact_sha: "a39efaf1355c448da134ca3d1c77319c4d8b7011"
completed_at: '2026-07-04T19:24:29Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 / AC3 / AC5"
    finding: "The spec does not define crash-safe ordering between judge checkpoint writes, Slack delivery, and cursor advancement. A tick can duplicate an alert if it posts then crashes before recording completion, or drop an alert if it records the pair/cursor before a successful post. Patch the ACs to require per-pair delivery state and tests for post failure/crash retry semantics before the watermark advances."
  - severity: "medium"
    where: "AC3"
    finding: "Parse failures are terminal at the same judge version, but the spec only says they are recorded in the checkpoint. A malformed-output or model-regression event could silently suppress every contradiction in an unattended tick. Patch AC3/tests to require durable operator-visible evidence for terminal judge failures, with counts/keys and a clear distinction between terminal malformed verdicts and retryable runBrain infrastructure errors."
---

## Findings

### F1 — Alert delivery needs crash-safe ordering

AC1/AC3/AC5 combine a durable signal cursor, at-most-once judge checkpoint, and Slack card delivery, but the spec does not say which state is persisted before or after a Slack post. In unattended launchd/runtime conditions, a crash or Slack timeout around the post boundary can either spam the owner on the next tick or permanently lose the alert.

Required patch: define per-pair delivery state keyed by the decision dedupe key, statement dedupe key, and judge version. Add tests for Slack post failure and crash/retry ordering, and require that the watermark does not advance past an unhandled contradiction without either a posted alert or durable operator-visible failure.

### F2 — Terminal judge failures need operator-visible evidence

AC3 makes parse failures terminal for the same judge version. That is a reasonable fail-closed posture, but as written the only required durable record is the checkpoint itself. A prompt/model regression that returns malformed JSON could cause the sweep to mark many pairs failed forever while the operator sees no obvious queue error or health signal.

Required patch: require structured, durable evidence for terminal judge failures, including pair keys, judge version, failure reason, and per-tick counts. Also distinguish terminal malformed verdicts from retryable runBrain infrastructure errors so a transient model/network outage does not become permanent silent suppression.
