---
item_id: 2026-05-25-074-echo-cli-binary
round: 2
spec_commit_sha: 177a85fea24c656f3a8e580d8e94f02e1e7bb7e8
artifact_path: backlog/ready/2026-05-25-074-echo-cli-binary.md
class: structural-reform
requested_at: '2026-05-26T05:58:16Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 1c7d9699-54e8-47bc-b666-c9fe25cbb54f
focus_hints: "r2 verification: (1) AC2.5 capability population \u2014 does the static\
  \ AGENT_CAPABILITIES_BY_KIND constant + init-time mutation of onboarding.json correctly\
  \ produce a matcher that picks codex/claude-code for write-capable roles? Any 070/073\
  \ surface assumption broken? (2) AC5.3 sandbox mapping derives from role.sandbox\
  \ \u2014 load-bearing for builder/strategist role dispatch. (3) AC4.3 next-header-of-any-name\
  \ elision rule \u2014 pressure-test the regex on real-world ~/.codex/config.toml\
  \ shapes (consider [[mcp_servers.foo]] arrays, [model.providers.openai] dotted-table\
  \ chains, CRLF, BOM, no-trailing-newline). (4) AC4.4 byte-equality ownership: confirm\
  \ 072's syncClaudeSkills + populateEchoSkills produce byte-equal copies in steady\
  \ state (so the inverse correctly identifies ECHO-owned files); failure mode if\
  \ 072's copy normalizes line-endings differently than the source. (5) AC2.1.0 TTY\
  \ guard: any path where wizard methods could still be invoked? (6) AC3.6 truth table\
  \ evaluates top-to-bottom; first-match-wins \u2014 check no row is unreachable.\
  \ (7) AC2.2 fs.readFileSync(new URL(...)) \u2014 works from compiled dist/cli/ AND\
  \ from vite-node src/cli/. (8) Did any r1 patch introduce a new mechanism that itself\
  \ needs review (per 058 discipline)?"
---

# What to review

Read `backlog/ready/2026-05-25-074-echo-cli-binary.md` at commit `177a85fea24c656f3a8e580d8e94f02e1e7bb7e8`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
