---
item_id: "2026-07-01-109-granola-meeting-intake-bridge"
round: 1
reviewer: "codex"
artifact_sha: "5972dcfe86f1dea91f10c801e1e454c41a50efbd"
completed_at: '2026-07-02T02:47:25Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Acceptance Criteria / AC2"
    finding: "AC2 currently requires both exactly one Slack seed message and record-then-post at-least-once delivery. Those guarantees conflict across crash windows: recording before post can permanently suppress an unposted candidate, while posting before durable acknowledgement can duplicate visible seeds after a crash. Patch the spec to define the durable seed state machine, for example pending-before-post, posted-after-Slack-ts, retry pending records, and explicitly scope exactly-once to responder draft creation rather than visible Slack messages unless a concrete Slack idempotency mechanism is required and tested."
  - severity: "medium"
    where: "Acceptance Criteria / AC3"
    finding: "The self-bot marker carve-out is not specific enough to be spoof- and loop-safe. Patch AC3 to require validation against the configured Slack bot identity, intake channel, marker version, and candidate key before draft creation, and add negative cases for human-authored marker text, non-self bot messages, malformed markers, duplicate candidate keys, and responder follow-up or confirm-card bot messages that must remain ignored."
  - severity: "medium"
    where: "files_to_modify / Acceptance Criteria / AC6"
    finding: "The allowed file list and tests do not cover several required durable behaviors: daemon-side seeded-record storage, dismissal-by-candidate-key storage, feature flag/lookback/internal-domain/owner-map config, responder seed acceptance tests, issue provenance rendering tests, and daemon scheduling tests. Patch the spec to name the concrete implementation and test paths for those behaviors, or narrow AC2/AC5/AC6 so the listed files are sufficient."
---

## Findings

The proposal is directionally buildable, but the crash-safety contract needs to be made implementable before a builder claims it. The main required patch is to separate visible Slack seed delivery from exactly-once draft creation and specify the durable state transitions around `chat.postMessage`.

The seed acceptance carve-out also needs sharper validation language and test cases. The current text says "self-bot" and "valid marker", but the builder needs concrete checks so marker text alone cannot open drafts and bot-authored follow-ups cannot loop back into intake.

Finally, the spec should add a real Tests section and expand `files_to_modify` for the durable daemon-side state and responder/rendering/config coverage required by the ACs.
