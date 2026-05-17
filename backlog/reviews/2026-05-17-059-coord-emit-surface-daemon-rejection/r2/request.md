---
item_id: 2026-05-17-059-coord-emit-surface-daemon-rejection
round: 2
spec_commit_sha: 033867c910afcdbc1f9e42822b6a5fdccefef215
artifact_path: backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md
class: narrow
requested_at: '2026-05-17T07:57:16Z'
requested_reviewers:
- codex
- codex-ops
- claude
correlation_id: 06297318-1195-4ad4-bc3d-6fd64d664136
focus_hints: "Verify the new ## Tests section is well-formed and matches the locked\
  \ AC1/AC3 contract. Confirm AC3 test (ii) uses pickClosedPort() and asserts no /coord-emit\\\
  .sh:/ in stderr (silent-on-unreachable locked). Confirm AC3 test (iii) uses an in-process\
  \ node:http fixture (NOT the MCP daemon) returning 500 + asserts 'coord-emit.sh:\
  \ daemon returned HTTP 500' substring. Confirm AC1 parsing-constraint truncation\
  \ contract (500 chars + '\u2026[truncated]', never body-dump) is the single shape\
  \ across AC1 + R1. Confirm Out of Scope #11 names concrete candidate callsites the\
  \ builder might be tempted to touch. Spot-check Definition of Done line-up with\
  \ the three locked AC contracts."
---

# What to review

Read `backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md` at commit `033867c910afcdbc1f9e42822b6a5fdccefef215`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
