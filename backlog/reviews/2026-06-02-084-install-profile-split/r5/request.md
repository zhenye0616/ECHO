---
item_id: 2026-06-02-084-install-profile-split
round: 5
spec_commit_sha: cd90ba32f54a8131679f2e34676eb8f0d8c75c60
artifact_path: backlog/ready/2026-06-02-084-install-profile-split.md
class: narrow
requested_at: '2026-06-02T08:19:27Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 1d22ca1e-0e47-4b65-8f5d-6750d88480f5
focus_hints: "Verify r4 at cd90ba32f54a8131679f2e34676eb8f0d8c75c60: (1) AC4 missing\
  \ profile => customer UNCONDITIONALLY, zero inference from completed/agents/file-presence;\
  \ dogfood only via flag/answer-file/recorded. (2) pre-084 loud-warning path (existing\
  \ profile-less file + no flag => customer + restore warning). (3) run-wizard.ts\
  \ in files_to_modify so profile threads Wizard.wire() w/o AC8 violation. (4) no\
  \ remaining discriminator/partial-scaffold/had_onboarding_before_init reference.\
  \ Removal + 1 scope add \u2014 expect convergence."
---

# What to review

Read `backlog/ready/2026-06-02-084-install-profile-split.md` at commit `cd90ba32f54a8131679f2e34676eb8f0d8c75c60`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
