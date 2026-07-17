---
item_id: 2026-07-15-137a-echo-context-candidate-runtime
round: 4
spec_commit_sha: 7bf19a111d9719165f98a0f85569f8b978e117c4
artifact_path: backlog/proposed/2026-07-15-137a-echo-context-candidate-runtime.md
class: structural-reform
requested_at: '2026-07-17T21:36:14Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 5b5a8585-067b-4088-899d-645536a5614b
focus_hints: delta-verify that AC5 and --mode full execute both existing third-observer
  kill cases with bounded absence/no-retry evidence, and that only the third proof
  runner launches a fresh outer after complete absence; confirm every other family
  remains closed
review_protocol: 2
review_mode: delta
review_counter:
  lifetime: 4
  epoch: 1
  epoch_round: 4
review_targets: []
family_context:
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
- family_id: fam-68977d8ba2d0dabb
  mechanism: parent-liveness orphan cleanup and external observation
  origin: original
  first_seen_round: 1
  latest_round: 3
  state: patched
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
- family_id: fam-e9ae0e92ef54305d
  mechanism: candidate SQLite writer lease acquisition
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: closed
  reviewers:
  - codex
baseline_spec_sha: 91849d511040cc1d061d43e7b7ffb16b67ebf2d5
---

# What to review

Read `backlog/proposed/2026-07-15-137a-echo-context-candidate-runtime.md` at commit `7bf19a111d9719165f98a0f85569f8b978e117c4`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

Protocol v2 mode: `delta`; lifetime round `4`; epoch `1` round `4`. Treat the embedded family and proof context as the complete cross-round review lens.
