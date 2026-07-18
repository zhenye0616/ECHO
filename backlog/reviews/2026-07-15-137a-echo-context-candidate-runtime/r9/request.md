---
item_id: 2026-07-15-137a-echo-context-candidate-runtime
round: 9
spec_commit_sha: de8d534cf73d72575dc1e54d194c0ef9e6b28e14
artifact_path: backlog/proposed/2026-07-15-137a-echo-context-candidate-runtime.md
class: structural-reform
requested_at: '2026-07-18T04:54:18Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 3f0cccc3-2e61-41ed-b752-1914ddd7ae7b
focus_hints: 'Final permitted R9 proof: falsify literal /private/tmp parent-entry
  durability before ACK1 and exclusive receipt-file write/fsync/rename/directory-fsync/no-follow
  canonical readback before parent success, including every injected failure.'
review_protocol: 2
review_mode: proof
review_counter:
  lifetime: 9
  epoch: 3
  epoch_round: 3
review_targets:
- family_id: fam-09bc94d7d11e3d10
  claim: Custody survives a crash after ACK1 and the final receipt is durably and
    canonically validated before parent success.
  check: Trace caller and custody-parent /private/tmp fsync ordering, record-1 file/directory/parent
    durability before ACK1, exclusive receipt temp write and file fsync, rename and
    custody-directory fsync, O_NOFOLLOW identity/canonical length/hash readback, caller
    field validation, and every injected failure outcome.
  anchors:
  - AC1 proof/custody creation durability
  - AC4 ACK1 parent-entry durability gate
  - AC4 final custody receipt publication/readback
  - tests/candidate/smoke.test.ts durability fault matrix
family_context:
- family_id: fam-09bc94d7d11e3d10
  mechanism: Acknowledged durable custody before destructive cleanup
  origin: unknown
  first_seen_round: 7
  latest_round: 8
  state: patched
  reviewers:
  - codex
  - codex-ops
- family_id: fam-23d135eeb416e265
  mechanism: continuously drained bounded diagnostic capture and failure cleanup
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: closed
  reviewers:
  - codex-ops
- family_id: fam-58138afe52e773f2
  mechanism: candidate entrypoint and execution environment closure
  origin: original
  first_seen_round: 1
  latest_round: 3
  state: closed
  reviewers:
  - codex
  - codex-ops
- family_id: fam-6760319bb44add40
  mechanism: proof-control EOF overload conflates intentional shutdown with control-owner
    loss
  origin: unknown
  first_seen_round: 7
  latest_round: 8
  state: closed
  reviewers:
  - codex-ops
- family_id: fam-68977d8ba2d0dabb
  mechanism: parent-liveness orphan cleanup and external observation
  origin: original
  first_seen_round: 1
  latest_round: 4
  state: closed
  reviewers:
  - codex-ops
- family_id: fam-98852860031f9aaf
  mechanism: generated stage inventory and executed-byte binding
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: closed
  reviewers:
  - codex
- family_id: fam-a1eac2e4f6b38335
  mechanism: process-tree-scoped repository and network denial
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: closed
  reviewers:
  - codex
  - codex-ops
- family_id: fam-b5cc6c437eea0108
  mechanism: bounded shutdown with active HTTP connections
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: closed
  reviewers:
  - codex-ops
- family_id: fam-d8a4bf5b6feb34d0
  mechanism: authentication before application body consumption
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: closed
  reviewers:
  - codex
- family_id: fam-dfbd55bbe7c54f1a
  mechanism: candidate root topology and ownership
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: closed
  reviewers:
  - codex
- family_id: fam-e1e2aa89ad31ffc0
  mechanism: Canonical acquisition and publication of the reviewed target head
  origin: unknown
  first_seen_round: 7
  latest_round: 8
  state: closed
  reviewers:
  - codex
- family_id: fam-e9ae0e92ef54305d
  mechanism: candidate SQLite writer lease acquisition
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: closed
  reviewers:
  - codex
- family_id: fam-f26c7c780ca4a891
  mechanism: Run-root encoding into the generated sandbox policy and textual evidence
  origin: unknown
  first_seen_round: 7
  latest_round: 8
  state: closed
  reviewers:
  - codex
baseline_spec_sha: c91f69dca1d5ecef2cf6ee03a9ec2bce8b1916f1
---

# What to review

Read `backlog/proposed/2026-07-15-137a-echo-context-candidate-runtime.md` at commit `de8d534cf73d72575dc1e54d194c0ef9e6b28e14`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

Protocol v2 mode: `proof`; lifetime round `9`; epoch `3` round `3`. Treat the embedded family and proof context as the complete cross-round review lens.
