---
item_id: 2026-05-15-056-claude-as-reviewer-headless
round: 1
spec_commit_sha: a37c9b9cbb3670641e9d9b9f181842b19f0eac42
artifact_path: backlog/ready/2026-05-15-056-claude-as-reviewer-headless.md
class: structural-reform
requested_at: '2026-05-15T22:48:56Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "AC5 is the load-bearing substrate change \u2014 review carefully: (a)\
  \ the {{WT}}/{{PROMPT}} template substitution mechanism, (b) byte-identical backwards-compat\
  \ for codex/codex-ops invocations, (c) integration-test coverage in AC9 unit prong,\
  \ (d) failure mode if invoke_command is missing from a roster entry. Also check:\
  \ AC2 schema-sync rule covers both schemas; AC1 'required: false' rationale is sound\
  \ (avoid blocking current rounds); AC7 smoke runner fail-open on missing claude\
  \ CLI is correctly scoped (skip vs fail-closed)."
---

# What to review

Read `backlog/ready/2026-05-15-056-claude-as-reviewer-headless.md` at commit `a37c9b9cbb3670641e9d9b9f181842b19f0eac42`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
