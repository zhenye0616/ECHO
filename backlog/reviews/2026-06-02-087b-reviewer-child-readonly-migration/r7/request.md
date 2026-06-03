---
item_id: 2026-06-02-087b-reviewer-child-readonly-migration
round: 7
spec_commit_sha: 1c84820c92194f2aab1d1b604aaa7b44507e0c29
artifact_path: backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md
class: structural-reform
requested_at: '2026-06-03T07:35:14Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: f4dcbfa2-d0da-481c-a5ab-dce1058213b8
focus_hints: "Verify r6 patch at spec SHA 9965da9a: terminal capture-failure (rc\u2260\
  0/empty/malformed) emits an explicit terminal-capture-failure tick_end outcome AFTER\
  \ the marker/queue-error push, so the coord deadline closes and a handled failure\
  \ is not mistaken for a hung tick / false deadline_missed (AC2 + AC5 v). Confirm\
  \ coherent with the rest of the wrapper-owned lifecycle; no new mechanism introduced;\
  \ no regression. The capture-failure path is now complete (terminal marker + durable\
  \ push + bounded diagnostic + explicit tick_end) \u2014 assess whether anything\
  \ load-bearing remains or this converges."
---

# What to review

Read `backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md` at commit `1c84820c92194f2aab1d1b604aaa7b44507e0c29`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
