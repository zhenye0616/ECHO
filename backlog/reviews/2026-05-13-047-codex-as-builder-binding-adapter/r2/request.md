---
item_id: 2026-05-13-047-codex-as-builder-binding-adapter
round: 2
spec_commit_sha: 966ef059e71dd6ac5a6d29bb7f1d7c6575ed53f8
artifact_path: backlog/ready/2026-05-13-047-codex-as-builder-binding-adapter.md
class: structural-reform
requested_at: '2026-05-14T05:57:12Z'
requested_reviewers:
- codex
- cursor
focus_hints: "R1 dispositioned: all 8 findings (7 unique root) accept-with-patch at\
  \ this SHA. Verdict divergence (codex pushback / cursor proceed_after_patches) auto-resolved\
  \ per 046 R4 extension \u2014 complementary coverage, not contradiction. See r1/combined.md.\n\
  \nR2 NARROW focus:\n1. AC3 direct-commit path for builder.md (no CAS): verify implementable\
  \ from existing skills/process-backlog.md shape; the protocol already does git add\
  \ + commit + push on the agent branch.\n2. AC1 atomic mkdir lockfile: verify diagnostic\
  \ + trap match merge-and-cleanup Step B pattern; verify the trap fires correctly\
  \ under SIGINT/SIGTERM during the codex exec child.\n3. AC4 3-case test partition\
  \ (wrapper-vs-stub): verify case-3 (overlapping-process: slow stub holds lock; parallel\
  \ invocation tries during sleep) is buildable in vitest+spawnSync without flakiness.\
  \ Codex lens.\n4. files_to_modify list: verify exhaustive (anything missing?).\n\
  5. AC7 + AC8 cursor specifics: re-confirm slash command + MCP-config-checklist actually\
  \ unblock cursor-reviewer + codex-builder first-run setup. Cursor lens.\n\nBoth\
  \ reviewers should now converge. R2 target: proceed or proceed_after_patches with\
  \ LOW only (no HIGH).\n\nSame roster [codex, cursor]. Cursor reviewer must be MANUALLY\
  \ triggered by founder from Cursor IDE via `/review-queue-cursor` slash command\
  \ (per the AC7 patch)."
---

# What to review

Read `backlog/ready/2026-05-13-047-codex-as-builder-binding-adapter.md` at commit `966ef059e71dd6ac5a6d29bb7f1d7c6575ed53f8`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
