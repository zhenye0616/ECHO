---
item_id: "2026-07-15-137a-echo-context-candidate-runtime"
round: 7
reviewer: "codex-ops"
artifact_sha: "3852a4ede6501871b738739b0bbba7d522bd730a"
completed_at: '2026-07-18T03:30:58Z'
verdict: "pushback"
review_protocol: 2
review_mode: "full"
consumed_task_state: false
findings:
  - severity: "high"
    mechanism: "proof-control EOF overload conflates intentional shutdown with control-owner loss"
    origin: "unknown"
    where: "AC4 — proof-runner-to-outer byte protocol, proof-control EOF handling, and post-baseline writable roster"
    finding: "The accepted proof-runner-to-outer protocol has RUN, OUTER_SELF_KILL, and ARM_INNER_PRE_READY_FAULT but no normal STOP or live-runner abort byte. Normal shutdown after RUN therefore requires closing fd 4, yet every post-RUN EOF makes the outer publish outer-orphan.v1.json. The writable-roster contract permits that file only after proof-runner loss, and successful full proof explicitly forbids it. A live proof runner handling driver-liveness loss creates the same contradiction when it closes outer control. The outer cannot infer which condition caused EOF, so normal completion and driver-loss evidence cannot satisfy the stated roster. Add distinct phase-gated STOP and abort controls, reserve EOF for actual control-owner loss, and test all three paths through final roster validation."
  - severity: "high"
    mechanism: "one-way stdout drain is treated as durable evidence custody before destructive cleanup"
    origin: "unknown"
    where: "AC4 — exact-summary streaming and cleanup commit; AC5 — post-landing evidence capture"
    finding: "The driver streams summary record 1, waits only for write/backpressure completion, then irreversibly deletes the proof parent. A successful pipe write proves only that bytes entered or traversed the pipe, not that the coordinator validated and fsynced them. Coordinator or reader failure after accepting bytes can therefore delete the sole summary before durable custody. Driver-result record 2 is created only after deletion and uses the same unacknowledged channel, so its cleanup truth can also disappear. This can leave an already-landed target without recoverable post-landing evidence. Require an explicit receipt tied to fsynced coordinator custody and a durable result carrier outside the deletion boundary, or retain recoverable quarantine until both handoffs are durably acknowledged; test reader loss before and after each record."
---
