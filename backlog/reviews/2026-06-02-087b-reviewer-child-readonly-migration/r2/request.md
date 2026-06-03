---
item_id: 2026-06-02-087b-reviewer-child-readonly-migration
round: 2
spec_commit_sha: 8f718f35fc1d7d8f6ee2c78165116d66e376d32a
artifact_path: backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md
class: structural-reform
requested_at: '2026-06-03T06:22:10Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: c25e22cd-3739-4843-b15c-3fa4772861e0
focus_hints: "Verify r1 pushback rework at spec SHA e14c677f: (1) AC2 stdout capture\
  \ channel for the read-only child \u2014 wrapper redirects child stdout to capture.stdout_path\
  \ (wrapper-owned, OUTSIDE child sandbox), publishes from it; rc\u22600/empty/malformed\
  \ \u2192 durable queue-error (AC5 iii/iv). Is this coherent + is wiring this 087-enum\
  \ kind correctly scoped (AC6)? (2) AC3 flips the RESOLVED ARGV --sandbox read-only\
  \ (not just agent_sandbox metadata); AC5(i) asserts resolved argv. (3) AC1 wrapper\
  \ owns tick_start/tick_end-outcome + journaling; AC5(v) outcome tests (validation-fail/push-fail/duplicate/success,\
  \ no orphaned tick_start). (4) danger-full-access ban narrowed to codex/codex-ops;\
  \ claude/cursor + 056 stay OoS \u2014 internally consistent? (5) parent spec_ref\
  \ lifecycle path (complete/ with pending_review note). (6) commit-move-BEFORE-sandbox-flip\
  \ order (Locked-3) preserved; no intermediate read-only-but-self-committing state."
---

# What to review

Read `backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md` at commit `8f718f35fc1d7d8f6ee2c78165116d66e376d32a`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
