---
item_id: 2026-07-15-137a-echo-context-candidate-runtime
round: 3
spec_commit_sha: 91849d511040cc1d061d43e7b7ffb16b67ebf2d5
artifact_path: backlog/proposed/2026-07-15-137a-echo-context-candidate-runtime.md
class: structural-reform
requested_at: '2026-07-17T21:27:55Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: f4afe7aa-13d2-4dc3-b4fd-253a877cc92a
focus_hints: delta-verify the exact five-command outer/inner/sandboxed-runtime surface,
  the two-level outer-to-inner-to-runtime EOF chain, spawn-before-ready identity relay,
  and third-observer kill tests; confirm all seven R2-closed families remain closed
review_protocol: 2
review_mode: delta
review_counter:
  lifetime: 3
  epoch: 1
  epoch_round: 3
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
  latest_round: 2
  state: patched
  reviewers:
  - codex
  - codex-ops
- family_id: fam-68977d8ba2d0dabb
  mechanism: parent-liveness orphan cleanup and external observation
  origin: original
  first_seen_round: 1
  latest_round: 2
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
baseline_spec_sha: 55f9adebc54cd77f95265b8da2c6ca6ae7886d07
---

# What to review

Read `backlog/proposed/2026-07-15-137a-echo-context-candidate-runtime.md` at commit `91849d511040cc1d061d43e7b7ffb16b67ebf2d5`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

Protocol v2 mode: `delta`; lifetime round `3`; epoch `1` round `3`. Treat the embedded family and proof context as the complete cross-round review lens.
