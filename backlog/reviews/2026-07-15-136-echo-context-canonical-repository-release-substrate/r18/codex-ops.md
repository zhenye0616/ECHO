---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 18
reviewer: "codex-ops"
artifact_sha: "065feea6cda7f9824d54f9041fecc637dd1bccbc"
completed_at: '2026-07-16T13:24:54Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC4/AC6 — GitHub CLI config snapshot paragraph"
    finding: "Requiring every component of the absolute GitHub config path to be owned by UID 501 rejects a normal /Users/zhenye path because / and /Users are root-owned, making every credentialed Project or target invocation fail before authentication. Permit authenticated root-owned, nonsymlink, non-group/world-writable system ancestors, require UID 501 from the founder home downward, and test the real ownership split."
  - severity: "medium"
    where: "AC3 — source-mode cleanup transition"
    finding: "The cleanup transition performs fallible child settlement and helper authentication before marking its state running. Failure there leaves not_started, so the surrounding finally invokes the transition again, violating the single-assignment and no-retry contract. Atomically claim running before any fallible cleanup work, make every later error terminal failed, and test pre-helper failures for zero second transition or spawn."
  - severity: "medium"
    where: "AC4 — quality-job timeout and always cleanup"
    finding: "The 65-minute job watchdog provides only 200 seconds beyond the verifier's 3,700-second aggregate, while checkout, tool resolution, sandbox creation, carrier generation/upload, and HOME_JOB cleanup have no subordinate bounds. The watchdog can therefore terminate a valid run before the always cleanup executes. Add explicit phase limits and a larger job-level bound with a guaranteed cleanup reserve, plus an exhausted-budget cancellation fixture."
  - severity: "medium"
    where: "AC4 — operation-host liveness and poison teardown"
    finding: "The host must reject every resource-creating dispatch after liveness EOF or poison, but poison teardown must spawn the owned-root cleanup child. Without an explicit exception, literal implementations either skip mandatory cleanup or violate the liveness rule. Allow only the already-authenticated bounded local cleanup helper after poison, with zero Project or target transport capability, and assert this in coordinator-death and aggregate-expiry fixtures."
  - severity: "medium"
    where: "AC6 — collectPublicationEvidence polling after run discovery"
    finding: "The 121-call monotonic schedule governs only global head_sha selection. After a run appears, exact-ID run, job, and artifact polling through completion has no cadence or attempt cap, permitting a rate-limit-exhausting busy loop. Bind post-discovery polling to an explicit finite monotonic schedule within the aggregate and final reserve, and test queued, in-progress, and last-eligible-poll cases."
  - severity: "medium"
    where: "AC4/AC6 — post-main M hosted-evidence convergence"
    finding: "land/write is capped at 900 seconds but must verify post-M quality-macos, quality-ubuntu, secret-scan, and source-build results, while either quality job may validly consume the 65-minute job bound. The later collect phase authenticates only source-release-build, leaving no fresh phase that can wait for and bind all four exact-M identities before publication. Add a fresh read-only post-M convergence phase with an adequate bound and require its exact run, job, check, and carrier tuple in publication authorization."
---
