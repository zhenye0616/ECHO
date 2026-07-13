---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 4
reviewer: "codex"
artifact_sha: "fa7b3a03ad11e39c0ea89fb252dac52bcf6790ad"
completed_at: '2026-07-13T22:11:26Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC7 — Prove native source independence and parity"
    finding: "The clean-install proof is not executable as specified: `env -i` supplies a fresh scratch `HOME`, external network is denied, and `npm ci` receives neither a populated isolated cache nor `--offline`. Define an integrity-checked cache-preparation checkpoint before isolation, record its exact hash in external state, pass an explicit `npm_config_cache` plus `--offline` during verification, and test failure when a required package is absent."
  - severity: "high"
    where: "AC5 and AC7 build-artifact command contract"
    finding: "AC5 requires a distinct run-scoped artifact lock, but AC7 omits its flag from `npm run build:artifact -- --expected-head ... --run-output ...`, and the lock's acquisition, ownership, stale-state, release, and resume rules are undefined. Specify the exact flag and path, an atomic acquisition protocol bound to run ID/head/input hashes, recovery ownership, release ordering, and concurrent-invocation tests; use the same complete command in AC7 and the Tests section."
  - severity: "medium"
    where: "AC1 publication reconciliation and AC7 migration record"
    finding: "The post-`RENAME_EXCL` reconcile path may create or finish the migration record, but `ready_to_publish` does not bind the exact record bytes and no atomic record-publication protocol is prescribed. Render and hash the deterministic record before `ready_to_publish`, publish it with temp-write/fsync/rename/parent-fsync or verify an existing byte-identical record, refuse mismatches during reconcile, and require `verify-handoff` to validate that bound digest and the recorded artifact bytes."
  - severity: "medium"
    where: "AC1 lifecycle CLI and tests/repository-extraction/echo-brain.test.ts"
    finding: "The production target and control-state paths are fixed absolute locations, but no test-only path injection contract exists, so failpoint and concurrency tests would contend with or mutate the real Desktop candidate. Define exact test-only target/state/staging/record root flags or dependency injection, gate them on `ECHO_EXTRACTION_TEST_MODE=1`, reject them in production, and require every lifecycle test to use isolated temporary roots."
  - severity: "medium"
    where: "AC6 — Preserve product behavior at the pinned source boundary"
    finding: "`check-test-parity.mjs` is required to verify a `signed evidence digest`, but the signature algorithm, canonical bytes, signer, key source, signature field, and trust anchor are unspecified and credentials are forbidden. Either define a complete credential-free authenticity mechanism anchored in committed candidate/external ready-state hashes, or replace `signed` with an exact canonical SHA-256 digest contract and state where that digest is immutably bound."
---
