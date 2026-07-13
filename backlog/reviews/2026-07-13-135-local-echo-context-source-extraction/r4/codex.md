---
item_id: "2026-07-13-135-local-echo-context-source-extraction"
round: 4
reviewer: "codex"
artifact_sha: "fa7b3a03ad11e39c0ea89fb252dac52bcf6790ad"
completed_at: '2026-07-13T22:19:24Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 lifecycle ownership and AC7 process-group supervisor"
    finding: "A hard-killed orchestrator can leave a child process group running after its one-time nonce validation; the owner PID then appears stale, allowing quarantine and a new nonce while the old child still mutates staging. The resume credential is also described as the stale nonce even though quarantine creates a new nonce. Specify the exact quarantine/resume CLI and atomic transition, persist the active child PGID plus leader start identity before releasing a spawn handshake, and require quarantine/resume to prove that group dead or terminate and probe it before takeover. Add a failpoint test that kills the orchestrator mid-command and proves no concurrent writer, socket, or SQLite lock survives."
  - severity: "high"
    where: "AC2 dependency preflight and AC7 sandboxed npm ci"
    finding: "The clean install runs with scratch HOME under a sandbox that denies all non-loopback networking, but the spec defines neither an offline npm cache nor a pre-isolation acquisition phase. A source lock alone does not make package tarballs available, and enabled install scripts may need downloads or an un-preflighted native toolchain. Define a content-integrity-verified dependency staging mechanism, run npm ci explicitly offline against only that staged cache, capability-check any required compiler or native-build tools, and test from an initially cold cache."
  - severity: "medium"
    where: "AC3 tool evidence and AC6 source-evidence-verified checkpoint"
    finding: "The spec does not define an executable, independent derivation from pinned TypeScript commit objects to the request schema, response schema, readOnlyHint, defaults, caps, and structured-envelope JSON whose digests become evidence. Blob verification and target/evidence agreement can therefore pass without proving those semantic values match the source. Name the extractor/helper and exact inputs, define normalization including absent and non-JSON values, pin an aggregate output digest, and test with synthetic source-semantic mutations that must fail source-evidence-verified independently of the target manifest and runtime registry."
  - severity: "medium"
    where: "AC7 loopback-only sandbox preflight and AC8 integration coverage"
    finding: "The claimed IPv4/IPv6 inbound-and-outbound boundary is covered only by a singular loopback echo, a singular non-loopback attempt, and an IPv4-only service bind, so an overbroad IPv6 or directional rule can pass. Require separate positive loopback and negative non-loopback probes for AF_INET and AF_INET6 in both relevant directions, with failures attributable to the OS sandbox rather than absence of a route or listener."
---
