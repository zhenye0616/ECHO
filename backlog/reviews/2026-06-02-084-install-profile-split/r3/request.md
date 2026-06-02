---
item_id: 2026-06-02-084-install-profile-split
round: 3
spec_commit_sha: a8f4b7223efb37756d6ce7e5e87179d93b51da2e
artifact_path: backlog/ready/2026-06-02-084-install-profile-split.md
class: narrow
requested_at: '2026-06-02T08:00:49Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 2841902f-e42e-41b5-8c53-9664fb106e89
focus_hints: "Verify r2 at a8f4b7223efb37756d6ce7e5e87179d93b51da2e: (1) AC2b/prune\
  \ fully removed \u2014 no AC/test/files_to_modify references a prune, inverse helper,\
  \ or stale-artifact removal; AC2 guarantee is fresh-install-scoped; OoS#1b documents\
  \ reprofile-out + filed followup. (2) AC4 captures had_onboarding_before_init BEFORE\
  \ ensureEchoHome and persists profile atomically before any fallible step; AC6(ii)+AC7\
  \ cover no-flip-on-rerun / partial-scaffold. (3) AC3 customer-skip-as-success intact.\
  \ (4) blocked_by 083 covers shared init.ts/smoke. Removal + 1 patch \u2014 expect\
  \ convergence."
---

# What to review

Read `backlog/ready/2026-06-02-084-install-profile-split.md` at commit `a8f4b7223efb37756d6ce7e5e87179d93b51da2e`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
