---
item_id: 2026-05-25-073-onboarding-wizard
round: 3
spec_commit_sha: 8ad54275e3ca72318ddc46e69f282eaa243ec331
artifact_path: backlog/ready/2026-05-25-073-onboarding-wizard.md
class: structural-reform
requested_at: '2026-05-26T03:12:10Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 05081488-0642-4338-b509-b5c4c127924b
focus_hints: "Verify: (1) AC1.3 prefix-matching via buildSourceAppMap() (source_prefix,\
  \ AgentKind\u2192SourceApp map, atomCountSaturated saturation flag, 50k limit);\
  \ (2) AC2.2 sourceBreakdown classification via same map, SourceApp|'other' keying;\
  \ (3) AC1.3 'DB path resolution must mirror the daemon' + builder-step to promote\
  \ resolveDbPath() to lifecycle.ts; (4) AC5.7 short-circuits on syncLock || repoRoot\
  \ || directorySymlink (all three top-level no-dispatch sentinels); (5) AC8.5 cases\
  \ 11a/11b/11c fixture shapes match 072 AC9 cases 11/22/30 byte-for-byte; (6) AC8.1\
  \ cases 1+4+7+9+10 use realistic FS-prefixed sources + saturation + ECHO_DB_PATH;\
  \ (7) test totals + DoD totals at 52 (10+6+6+4+13+8+5); (8) spec_refs gains source-app.ts\
  \ + daemon/index.ts + per-extractor refs."
---

# What to review

Read `backlog/ready/2026-05-25-073-onboarding-wizard.md` at commit `8ad54275e3ca72318ddc46e69f282eaa243ec331`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
