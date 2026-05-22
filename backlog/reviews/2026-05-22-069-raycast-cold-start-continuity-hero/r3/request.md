---
item_id: 2026-05-22-069-raycast-cold-start-continuity-hero
round: 3
spec_commit_sha: 386b4dd9041ce20503293e211a0b56c49961626b
artifact_path: backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md
class: narrow
requested_at: '2026-05-22T20:26:23Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: c741452f-929e-4cc3-83cb-3e6028645775
focus_hints: "Verify: (a) narrative + V1 contract + Arch Invariant all align with\
  \ patched ACs (time_range.to, substrate-OR-session anchor disjunction, artifact\
  \ 'type' field repo/file/commit, atom 'source.app === git', no atom-preview); (b)\
  \ tools/raycast-echo/src/lib/mcp.ts in files_to_modify; AC2 specifies explicit 18h\
  \ since; new mcp-find-clusters-since test pins request args; (c) AC3 rank tests\
  \ grew 3\u21925, with tests 3 and 4 pinning artifact-anchor and git-source-anchor\
  \ branches such that wrong field names fail; (d) DoD test count = 13; (e) no prose-vs-AC\
  \ contradictions left."
---

# What to review

Read `backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md` at commit `386b4dd9041ce20503293e211a0b56c49961626b`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
