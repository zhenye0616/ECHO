---
item_id: 2026-05-25-073-onboarding-wizard
round: 2
spec_commit_sha: 6a5a1778ece70705fe398a79ac460961e85135e9
artifact_path: backlog/ready/2026-05-25-073-onboarding-wizard.md
class: structural-reform
requested_at: '2026-05-26T02:52:56Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 76a6bd57-1bdc-4915-b88f-f950c65ef966
focus_hints: 'Verify: (1) AC1.3 openExistingAtomStoreReadOnly() is implementable against
  src/storage/sqlite.ts (better-sqlite3 supports {readonly:true,fileMustExist:true}
  + pragma query_only=ON); (2) AC2.3 routes through same helper; (3) AC8.1 case 8
  + AC8.2 case 6 pin fresh-install no-FS-side-effects (readdir diff pre/post); (4)
  AC5.7 lock-failure path: no cache writes, no onboarding mutation, onboardingStateUpdated:false,
  cacheUpdates:[]; (5) AC8.5 case 11 pins byte-identical onboarding.json on lock-failure;
  (6) AC5.5 + AC7 completed-flag ownership is consistent (markCompleted() sole writer;
  summary() read-only); (7) R5 follow-up trigger is concrete; (8) terminology corrections
  (Storage, source, timestamp) didn''t regress elsewhere.'
---

# What to review

Read `backlog/ready/2026-05-25-073-onboarding-wizard.md` at commit `6a5a1778ece70705fe398a79ac460961e85135e9`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
