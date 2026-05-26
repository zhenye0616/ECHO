---
item_id: 2026-05-25-073-onboarding-wizard
round: 5
spec_commit_sha: b0c811a7c072872e6e93fcde57d3deb7abd4c23a
artifact_path: backlog/ready/2026-05-25-073-onboarding-wizard.md
class: structural-reform
requested_at: '2026-05-26T03:32:21Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 39db5474-50ef-4dce-84f4-9241eb6eea20
focus_hints: 'Verify: (1) AC8.6 case 9 covers all four AC6.3 claude-code patterns
  via it.each and includes codex companion sub-case proving claude-code-scoping of
  the AC6.3 row; (2) AC8.6 case count is 9, Tests + DoD totals are 53; (3) CreateWizardOpts
  jsdoc has no ''real AtomStore'' references outside the codex-r4-F2 historical parenthetical;
  (4) no regression to r1/r2/r3 patches (readonly opener, source_prefix matching,
  AC5.7 three-sentinel, completed-flag ownership, WireOpts.repoRoot pass-through,
  J2 prose, files_to_modify, mcp-not-configured surface). r4: codex-ops verdict was
  clean proceed; only codex 1 MED + 1 LOW. If r5 yields proceed from both (or single-reviewer
  auto-disposition), spec is claim-ready.'
---

# What to review

Read `backlog/ready/2026-05-25-073-onboarding-wizard.md` at commit `b0c811a7c072872e6e93fcde57d3deb7abd4c23a`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
