---
item_id: "2026-07-13-135-local-echo-context-source-extraction"
round: 5
reviewer: "codex"
artifact_sha: "22b706d9a16591ff3b4ecaa1cc9fbac89baa9da4"
completed_at: '2026-07-13T22:42:58Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 — stale-run quarantine and process-group takeover"
    finding: "The persisted PGID and leader start identity do not safely authenticate a process group after the leader disappears, yet quarantine may TERM/KILL that PGID. A recycled PGID could identify unrelated processes. Require an explicit pre-signal identity algorithm, refusal when ownership cannot be proven, and regression tests for leader-dead orphans and PGID/PID reuse."
  - severity: "medium"
    where: "AC1 entrypoint command roster versus AC3 snapshot-source-tools"
    finding: "The committed entrypoint permits only start, resume, status, quarantine-lock, and verify-handoff, but AC3 requires the same entrypoint to execute snapshot-source-tools. Add that subcommand to the public command contract and specify its argument validation, lifecycle ownership, cleanup, and exit-code behavior."
  - severity: "high"
    where: "AC3 — context tool roster and fixture evidence"
    finding: "The spec never enumerates the eight context tool IDs or the per-tool fixture vectors. Because context-tools.v1.json is created by the implementation, the target, manifest, and source snapshot can agree on an implementation-selected roster without proving the intended split. Pin the independent expected IDs and exact success/error/default/cap fixture cases in the spec or in a source-derived immutable artifact whose digest is stated here."
  - severity: "medium"
    where: "AC7 — dependency-cache-ready"
    finding: "The prescribed npm ci acquisition command has no mechanism that enforces fetches only from lockfile resolved URLs and omits flags or configuration preventing audit and other registry requests. Specify the enforcing transport or prefetch mechanism, redirect policy, sanitized npm configuration, and a negative test proving an off-lock URL or metadata request is denied."
  - severity: "high"
    where: "AC7 network probes and AC8 context-service.test.ts"
    finding: "AC8 requires the service to bind only 127.0.0.1 while also requiring a request to a non-loopback address to fail specifically because of sandbox denial; with no listener on that address, the observable failure can instead be connection refusal. Define separate direction-specific probe topologies for AF_INET and AF_INET6, identify which endpoint is sandboxed, and assert policy denial independently from the service's loopback-only binding."
  - severity: "low"
    where: "AC6 — standalone check:parity contract"
    finding: "The parity checker is required to validate 'AC8 counts,' but AC8 defines no inventory counts. Replace this dangling reference with the intended AC6 fixed counts and hashes, or add the missing counted invariant explicitly."
---
