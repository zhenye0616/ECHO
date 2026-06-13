---
item_id: 2026-06-13-102-orchestration-init-per-project
round: 2
spec_commit_sha: 9db479c2d777952cceff4198cb513a45908ff5b7
artifact_path: backlog/proposed/2026-06-13-102-orchestration-init-per-project.md
class: structural-reform
requested_at: '2026-06-13T09:13:29Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: ff8e0d82-8857-4008-a431-72b5c2178f33
focus_hints: "R2 verify after r1 patch cd2fd7c4 (5 issues ADOPTED). Check: (1) AC3\
  \ canonical realpath containment + symlink/abs/traversal rejection sound; (2) AC5\
  \ narrowed to review surface + _run_reviewer.sh/push-with-retry.sh coord_ref plumbing\
  \ + no-silent-misconfig fail-loud; (3) is the 102/104 scope boundary coherent \u2014\
  \ does 102 still deliver a runnable review loop on an onboarded repo WITHOUT 104,\
  \ or did narrowing AC5 leave a gap where a round can't run? (4) AC6 binding-consumer\
  \ + external-command-copy fixture; (5) AC2 atomic upsert. Confirm no new findings\
  \ or raise them."
---

# What to review

Read `backlog/proposed/2026-06-13-102-orchestration-init-per-project.md` at commit `9db479c2d777952cceff4198cb513a45908ff5b7`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
