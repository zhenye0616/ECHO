---
item_id: 2026-05-25-073-onboarding-wizard
round: 4
spec_commit_sha: 02ab43b0e4020c4f04a81cf52514061dc561a2e9
artifact_path: backlog/ready/2026-05-25-073-onboarding-wizard.md
class: structural-reform
requested_at: '2026-05-26T03:25:28Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: dcd97789-e20a-43e7-a117-b4d5e65ede7e
focus_hints: "Verify: (1) AC8.5 11a/11b/11c fixture shapes match 072 lines 369-377\
  \ (skillsPopulated.ok:false + error sync_skipped:..., roles: {results:[], rolesErrors:[]})\
  \ and 11b references AC9 case 23; (2) files_to_modify includes atom-store-readonly.ts\
  \ + daemon/lifecycle.ts + daemon/index.ts; (3) 'mcp-not-configured' reason consistent\
  \ across ProbeOutcome union + AC6.3 mapping + Out of Scope \xA714 + R8 + DoD manual-run\
  \ line; (4) WireOpts.repoRoot wired through to syncAll(profiles, {repoRoot}) + Wizard.wire\
  \ Pick includes it; (5) J2 prose has zero AtomStore references and matches AC1.3\
  \ operational contract; (6) no regression to r1/r2 patches (atom-store readonly,\
  \ source_prefix matching, AC5.7 three-sentinel, completed-flag ownership)."
---

# What to review

Read `backlog/ready/2026-05-25-073-onboarding-wizard.md` at commit `02ab43b0e4020c4f04a81cf52514061dc561a2e9`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
