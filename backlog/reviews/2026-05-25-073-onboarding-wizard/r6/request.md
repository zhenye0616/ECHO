---
item_id: 2026-05-25-073-onboarding-wizard
round: 6
spec_commit_sha: 053aa7dea2f0bdc54bf1d0258f40f008a706242f
artifact_path: backlog/ready/2026-05-25-073-onboarding-wizard.md
class: structural-reform
requested_at: '2026-05-26T03:38:58Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 5c1fbbbe-844f-4b38-9970-c6fcee55c7e2
focus_hints: "Verify: (1) AC6.2 codex + claude-code happy path requires pong:true\
  \ AND string ts \u2014 no remaining 'ok:true' in probe-success context (072 AgentResult.ok\
  \ is unrelated and correct); (2) AC8.6 case 1 fixture is {\"pong\":true,\"ts\":\"\
  ...\"} with companion sub-case proving ts is required; (3) AC8.6 case 6 (claude\
  \ happy path) updated to same shape; (4) AC6.3 failure-mapping row reflects pong:true\
  \ AND string ts; (5) no regression to all prior r1-r4 patches (read-only opener,\
  \ source_prefix matching, AC5.7 three-sentinel, completed-flag ownership, WireOpts.repoRoot,\
  \ J2 prose, files_to_modify, mcp-not-configured surface). r5 had one legitimate\
  \ HIGH spec/code divergence (now caught), otherwise codex-ops at proceed twice in\
  \ a row. If r6 yields proceed from both, spec is claim-ready terminal."
---

# What to review

Read `backlog/ready/2026-05-25-073-onboarding-wizard.md` at commit `053aa7dea2f0bdc54bf1d0258f40f008a706242f`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
