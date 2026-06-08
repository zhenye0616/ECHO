---
item_id: 2026-06-08-098-per-actor-journal-shards
round: 5
spec_commit_sha: fe7d02bacdb5573461115753dd2e30aee0e3120c
artifact_path: backlog/proposed/2026-06-08-098-per-actor-journal-shards.md
class: narrow
requested_at: '2026-06-08T22:29:58Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: f547ca0a-ef2e-4b4d-95d9-fb8b268d7bcb
focus_hints: "Verify r4 patches at 44c2a151: (a) AC4 gate is now a stated allowlist\
  \ INVARIANT (no surface may instruct a bare-shared-path write in concrete/placeholder/template\
  \ form; every mcp-interactions-journal hit must be an allowed form) \u2014 confirm\
  \ this closes the stale-write window robustly WITHOUT a brittle regex; (b) AGENTS.md\
  \ added to files_to_modify (builder, symmetric w/ CLAUDE.md). The gate was converted\
  \ from regex to invariant precisely because each round poked a new regex hole \u2014\
  \ please do NOT propose another regex tweak; if the INVARIANT itself is incomplete,\
  \ name the missing surface/form, else this is terminal."
---

# What to review

Read `backlog/proposed/2026-06-08-098-per-actor-journal-shards.md` at commit `fe7d02bacdb5573461115753dd2e30aee0e3120c`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
