---
item_id: "2026-07-15-137a-echo-context-candidate-runtime"
round: 9
reviewer: "codex-ops"
artifact_sha: "de8d534cf73d72575dc1e54d194c0ef9e6b28e14"
completed_at: '2026-07-18T04:59:19Z'
verdict: "proceed_after_patches"
review_protocol: 2
review_mode: "proof"
findings:
  - severity: "medium"
    mechanism: "Acknowledged durable custody before destructive cleanup"
    origin: "unknown"
    family_id: "fam-09bc94d7d11e3d10"
    where: "backlog/proposed/2026-07-15-137a-echo-context-candidate-runtime.md:477 (AC4 caller receipt validation); tests/candidate/smoke.test.ts contract at spec lines 1610-1634"
    finding: "The receipt binds record identity, attempt ID, and source SHA/tree, but caller acceptance checks only record paths/lengths/hashes, ACK values, booleans, and roster; it never requires those identity fields to equal the caller-selected attempt, reviewed source tuple, and both records. A canonical, durably published but stale or misbound receipt can therefore pass caller acceptance, and the smoke matrix has no caller-side mismatch oracle. Require exact cross-field equality and fault tests that mutate each identity field and prove caller non-success with custody retained."
---
