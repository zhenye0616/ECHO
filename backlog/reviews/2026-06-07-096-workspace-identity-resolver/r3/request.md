---
item_id: 2026-06-07-096-workspace-identity-resolver
round: 3
spec_commit_sha: 33d647bce765638f94f42497b108f89b48112410
artifact_path: backlog/proposed/2026-06-07-096-workspace-identity-resolver.md
class: structural-reform
requested_at: '2026-06-07T19:20:45Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 00cc9995-731d-400d-96c3-6757c8f21ffe
focus_hints: 'Verify r2 patches: AC1 names the reused 1500ms git-subprocess timeout
  (no new value/config; pure-FS walk-up/realpath have no timer/AbortController); AC8
  case-fold tested via injected caseInsensitiveFilesystem seam (test-only, deterministic
  on case-sensitive CI). Confirm no new mechanism/observability and no scope creep
  into identity-at-rest or cross-machine.'
---

# What to review

Read `backlog/proposed/2026-06-07-096-workspace-identity-resolver.md` at commit `33d647bce765638f94f42497b108f89b48112410`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
