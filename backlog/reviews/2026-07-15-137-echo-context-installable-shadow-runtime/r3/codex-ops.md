---
item_id: "2026-07-15-137-echo-context-installable-shadow-runtime"
round: 3
reviewer: "codex-ops"
artifact_sha: "e9033277f938c94b3e71b88465f980e1aa5639c9"
completed_at: '2026-07-16T03:06:08Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 — single-writer lease and AC6 doctor evidence"
    finding: "The lease contract defines owner identity but not atomic acquisition/fencing or a concurrent-contender test. A check-then-reclaim race can let two launchd starts reach SQLite, while a losing process has no defined persistent record for later doctor inspection. Require process-lifetime atomic exclusion with crash-safe metadata replacement, a bounded owned last-refusal record, and barrier-based concurrent, PID-reuse, and stale-reclaim tests proving exactly one process opens storage and doctor retains blocker evidence."
  - severity: "high"
    where: "AC4 phase two and AC7 private-release/install sequence"
    finding: "Build-exactly-once is not safely resumable after interruption. Failure after the release build or partial upload but before smoke, publication, install, or evidence recording can force a prohibited rebuild or reliance on an ephemeral detached clone. Require durable sealed-byte staging keyed by landed SHA, version, and artifact SHA-256; atomic phase checkpoints; and idempotent retry logic that verifies and reuses exact existing local and partially published assets."
  - severity: "high"
    where: "AC7 — repo-free clean-home lifecycle and timeout cleanup"
    finding: "Temporary filesystem prefixes do not isolate the per-user launchd namespace or TCP port, and terminating the foreground process group does not stop a job already submitted to launchd. The smoke can collide with the canonical com.echo.context job or leave a surviving job/listener that poisons retries. Require a run-unique smoke label and reserved port or equivalent isolated domain, ownership-fenced cleanup in an unconditional finally path, verification that the canonical label/port remain untouched, and durable redacted failure evidence before temporary cleanup."
  - severity: "medium"
    where: "AC5–AC6 — launchd lifecycle and bounded logs"
    finding: "The plist does not define RunAtLoad, KeepAlive, or restart throttling, while retention is enforced only at install/start and log modes are not exact. The service may remain down or hot-loop, and launchd-held stdout/stderr descriptors can grow after the CLI exits. Specify restart/backoff behavior, pre-create the directory and files with exact 0700/0600 modes, use a lifetime-compatible bounded sink or truncation mechanism, and test both long-running output and repeated crashes under real launchd while doctor independently verifies effective caps."
  - severity: "medium"
    where: "AC3 and Tests — configuration-derived support-root isolation"
    finding: "The test inventory does not explicitly prove that candidate clean-home execution leaves the real Application Support and secret roots unchanged. Add resolver tests for temporary and founder paths plus a deny-write or before/after audit proving every candidate write stays beneath the temporary prefixes while both cases exercise the same resolution code."
  - severity: "medium"
    where: "AC5–AC6 and Tests — architecture/Rosetta preflight ordering"
    finding: "The acceptance text orders the probes, but the listed tests cover only generic architecture failure modes. Add mutation-sentinel tests proving an incompatible host or unavailable Rosetta fails before extraction or any secret/config/plist/launchd mutation, and that a failing bundled-node architecture probe occurs after extraction but before plist creation or service start."
---
