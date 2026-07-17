---
item_id: "2026-07-15-137-echo-context-installable-shadow-runtime"
round: 7
reviewer: "codex-ops"
artifact_sha: "add84d7175238018c0e5c62a16014664f6ea4ab7"
completed_at: '2026-07-17T18:43:47Z'
verdict: "proceed_after_patches"
review_protocol: 2
review_mode: "delta"
findings:
  - severity: "high"
    mechanism: "trusted acquisition of the bundled Node and native runtime closure"
    origin: "original"
    family_id: "fam-d1516500edd71225"
    where: "AC3 — Build one locally staged, exact runtime installation bundle from landed source"
    finding: "The official Node tarball is declared the only network build input and caches are forbidden, but the fresh detached clone has no specified source for the package-lock-pinned better-sqlite3, writer-lock, and native dependency closure. Under these rules the final builder cannot obtain that closure reproducibly. Bind a vendored dependency closure into the reviewed source tuple, or explicitly permit and pin every dependency acquisition URL, integrity value, and required native toolchain input; then prove the final build from a fresh empty-cache clone."
  - severity: "high"
    mechanism: "launchd and no-launchd lifecycle state convergence"
    origin: "original"
    family_id: "fam-59151b4a69e640a5"
    where: "AC4 — launchctl vectors and stop/restart convergence"
    finding: "`launchctl kill SIGTERM` stops the process but does not unload the job, so `stop` cannot wait for job absence as specified. The subsequent `restart` bootstrap encounters an already-loaded, stopped job and the verify-then-adopt mapping does not start it. Define one consistent FSM: either stop converges to loaded/stopped and restart uses `kickstart`, or stop bootouts and restart bootstraps; update the launchd tests to assert the exact registered-job, PID, and listener states."
  - severity: "medium"
    mechanism: "status and doctor can observe mixed lifecycle generations because they do not participate in lifecycle serialization"
    origin: "unknown"
    family_id: "fam-063c32423565fd88"
    where: "AC4 shared lifecycle lock and AC5 multi-source status/doctor observations"
    finding: "The shared lifecycle lock serializes CLI commands, but launchd does not participate in that lock and may replace the runtime after a crash while status or doctor is probing PID, listener, and readiness. The command can therefore still combine different process incarnations into one healthy result. Bracket the observation with launchd PID/start-time and readiness identity revalidation, retry within a fixed bound when they change, and otherwise return the schema-valid busy/timeout result; add a SIGKILL-and-KeepAlive restart race test."
---

