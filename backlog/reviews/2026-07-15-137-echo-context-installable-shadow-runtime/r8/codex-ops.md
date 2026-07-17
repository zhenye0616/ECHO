---

item_id: "2026-07-15-137-echo-context-installable-shadow-runtime"
round: 8
reviewer: "codex-ops"
artifact_sha: "e6ee720f09d72db7694ac25ff1a1d1cdd4cdbc5a"
completed_at: '2026-07-17T19:45:16Z'
verdict: "pushback"
review_protocol: 2
review_mode: "delta"
findings:
  - severity: "high"
    mechanism: "launchd and no-launchd lifecycle state convergence"
    origin: "original"
    family_id: "fam-59151b4a69e640a5"
    where: "AC4 and AC6 — no-launchd process ownership and cleanup"
    finding: "The candidate runtime is detached, but cleanup depends on harness-driven stop or finally. SIGKILL or abrupt harness death bypasses both and can leave an orphan listener, writer lock, and disposable root. Require an inherited parent-liveness FD whose EOF triggers bounded shutdown, exact-identity orphan reconciliation, and a harness-SIGKILL test proving process, listener, and lock disappearance."
  - severity: "medium"
    mechanism: "launchd discards the fallback diagnostic channels before bounded runtime logging is guaranteed"
    origin: "unknown"
    family_id: "fam-b1c1dd448cd031dd"
    where: "AC1 and AC4 — direct launchd runtime startup and crash evidence"
    finding: "Opening the sink at the start of JavaScript still cannot cover dyld, bundled-Node, or entrypoint failures before that code runs, nor uncatchable post-bind crashes. With stdout/stderr at /dev/null and KeepAlive retrying nonzero exits, launchd can loop without bounded durable failure evidence. Require a bounded diagnostic channel active before Node executes, or an equivalent generation-bound termination record, and test broken executables, unloadable entrypoints, and signal crashes under launchd-equivalent retry."
  - severity: "medium"
    mechanism: "authorization-to-bootstrap exact-artifact trust handoff"
    origin: "original"
    family_id: "fam-7c73935a9092db29"
    where: "AC6 — descriptor-protected installation"
    finding: "Snapshots are rewound before hashing, but no rewind or positioned-read requirement exists after runner or bootstrap verification. On Darwin, /dev/fd descriptors share the underlying open-file offset, so the shell or installer can receive EOF after hashing. Require positioned hashing or an explicit lseek to offset zero before every handoff and consumption, with descriptor-only verify-then-consume tests."
  - severity: "medium"
    mechanism: "trusted acquisition of the bundled Node and native runtime closure"
    origin: "original"
    family_id: "fam-d1516500edd71225"
    where: "AC3 — deny-by-default dependency acquisition"
    finding: "The artifact says redirects fail while prescribing curl --location, and npm fetch may likewise follow a redirect after checking only the lockfile's initial URL. Integrity protects returned bytes but does not preserve the declared network allowlist. Require fail-on-first-3xx behavior for both acquisition paths, or explicitly validate every redirect target before following it, and add Node and dependency redirect tests."
---
