---
item_id: 2026-06-13-102-orchestration-init-per-project
round: 1
spec_commit_sha: f8b9e7ecf432641a2edc652e8ecd053ecec096c9
artifact_path: backlog/proposed/2026-06-13-102-orchestration-init-per-project.md
class: structural-reform
requested_at: '2026-06-13T09:01:41Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 91cc131d-a1e2-4a04-b02c-47adf7497a15
focus_hints: "New spec under spec-review (not a retro). Load-bearing concerns: (1)\
  \ AC3 \u2014 relaxing coord_invoke's path-validation regex is the security edge;\
  \ is the containment model sound against traversal/symlink/abs-path escapes? (2)\
  \ AC4/AC7 byte-stable-default guardrail \u2014 does the configurable layer truly\
  \ leave Project_echo behavior unchanged? (3) is the 102|103 decomposition boundary\
  \ right (review-loop decoupling now, ~/.echo control plane deferred), or does 102\
  \ need more of the control plane to be coherent? (4) is the AC1-AC8 scope one buildable\
  \ item or must it split at the named seam? Read backlog/proposed/2026-06-13-102-orchestration-init-per-project.md\
  \ and raw/internal/decisions/2026-06-13-machine-global-orchestration-onboarding.md\
  \ at the spec SHA."
---

# What to review

Read `backlog/proposed/2026-06-13-102-orchestration-init-per-project.md` at commit `f8b9e7ecf432641a2edc652e8ecd053ecec096c9`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
