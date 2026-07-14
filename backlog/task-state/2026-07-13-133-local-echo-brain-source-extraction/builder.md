## current_thesis

The independent HIGH computed-command provenance finding is remediated at target `957ad4680f6c67d15fb3dfa0941b52c2ab9c3110` (tree `0a34ef4aa27ca460b0697773c78a2281ff534f31`). The exact old fail-open now fails closed, all builder proofs are green, and feature handoff `b62d160c6deeb77f528e58e0ef49090de7fac72d` is pushed. Fresh independent review is the next action.

## locked_decisions

- Binding syntax alone is never executable provenance.
- Computed spawn commands are allowed only in `src/product/spawn-sanitized-child.ts`, `tools/verify-artifact.mjs`, and `tools/product/toolchain-preflight.mjs`.
- Literal command tuples remain independently enumerated and classified.
- B0/B1/B2/builder-R1 share tarball `b7708d8f…`, 27 members, manifest `f868ad68…`, tree `0a34ef4a…`, and lock `9ffc39fa…`.
- Target remains parentless, one-branch, clean, no-remote, `authority:false`, and `maturity:DEV`.
- Builder-operated R1 is evidence only and cannot satisfy reviewer independence.

## open_questions

- Fresh codex-ops review must bind the exact new target OID/tree and rerun independent R1 judgment.
- Reconcile the recorded TypeScript/ESLint peer-range before qualification; it does not block this DEV merge review.

## dont_touch

- Do not rewrite the existing independent rejection or review sidecar.
- Do not create a target remote, advance maturity, publish, install, or claim authority.
- Do not touch items 134/135, wiki, holdout-131, or adjacent product work.

## canonical_anchors

- decision: raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md
- spec: backlog/pending_review/2026-07-13-133-local-echo-brain-source-extraction.md
- migration_record: raw/internal/migrations/2026-07-13-133-echo-brain.md
- handoff_head_sha: b62d160c6deeb77f528e58e0ef49090de7fac72d
- reviews: backlog/reviews/2026-07-13-133-local-echo-brain-source-extraction/
