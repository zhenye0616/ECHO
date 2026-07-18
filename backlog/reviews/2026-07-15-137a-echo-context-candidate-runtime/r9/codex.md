---
item_id: "2026-07-15-137a-echo-context-candidate-runtime"
round: 9
reviewer: "codex"
artifact_sha: "de8d534cf73d72575dc1e54d194c0ef9e6b28e14"
completed_at: '2026-07-18T04:58:45Z'
verdict: "proceed_after_patches"
review_protocol: 2
review_mode: "proof"
findings:
  - severity: "medium"
    mechanism: "Acknowledged durable custody before destructive cleanup"
    origin: "unknown"
    family_id: "fam-09bc94d7d11e3d10"
    where: "AC4 final custody receipt publication/readback, lines 477-500; tests/candidate/smoke.test.ts, lines 1630-1634"
    finding: "The receipt claims to bind its record identity, attempt ID, and source SHA/tree, but the parent's descriptor readback only checks canonical encoding and equality with its retained preimage, while the caller's enumerated checks cover record paths/lengths/hashes, ACK values, and boolean lifecycle fields without requiring those identity fields to equal the caller-known current attempt and reviewed source. A wrong-but-canonical retained preimage is therefore not independently rejected by the stated gates. Require the parent readback and caller acceptance gate to compare every semantic receipt field—especially record identity, attempt ID, source SHA, and source tree—against independently retained or caller-known values. Add one-field-at-a-time smoke negatives using otherwise canonical receipts with valid lengths/hashes, and require caller rejection with custody retained."
---
