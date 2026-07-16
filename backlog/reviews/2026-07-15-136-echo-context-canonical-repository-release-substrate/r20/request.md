---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 20
spec_commit_sha: 672d3deffa2512d88a5b2e487d6c095d95fca75d
artifact_path: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
class: structural-reform
requested_at: '2026-07-16T15:05:10Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 360367ec-ef8b-4f8f-9023-f348c196ddfa
focus_hints: 'Structural-cut verification round per founder decision raw/internal/decisions/2026-07-16-136-defer-github-hosted-gates.md
  (all hosted CI/protection/release deferred to parked item 140). Verify: (a) AC1/AC2/AC3/AC5
  contracts are intact from the r14-reviewed lineage; (b) zero hosted-CI/branch-protection/environment/tag/release/asset/operation-host/askpass/authority-publisher
  residue remains anywhere in frontmatter, ACs, tests, or risks; (c) AC4''s local
  landing protocol is executable as written (dual local AC3 acceptance, independent
  review record with builder!=reviewer recomputation, single-use delegated-approval
  record committed+pushed+read back, one leased porcelain push H merged onto B=baseline,
  authenticated readback, fail-closed ambiguity); (d) AC6''s tuple seal is executable
  (dual-build determinism at M, source-mode acceptance tuple equality, migration record,
  no self-naming project_landed_sha); (e) the removal is complete with no orphaned
  cross-reference; (f) the workflow-deletion requirement and no-hosted-surface test
  make the deferral mechanically visible.'
---

# What to review

Read `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at commit `672d3deffa2512d88a5b2e487d6c095d95fca75d`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
