---
item_id: 2026-05-25-074-echo-cli-binary
round: 1
spec_commit_sha: d9ef0c07804647d9c2e17f2be64553186a129d79
artifact_path: backlog/ready/2026-05-25-074-echo-cli-binary.md
class: structural-reform
requested_at: '2026-05-26T05:40:57Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 1bbd4787-3c08-4db8-8050-0fd0df192aa0
focus_hints: "R1 focus: pressure-test the 8 judgment calls (J1-J8), especially J1\
  \ (no third-party CLI framework \u2014 defensible vs dogfooding-UX risk), J2 (ship\
  \ 'run' before workflows exist), J4 (deterministic agent-picking by earliest wired_at),\
  \ J6 (doctor stays read-only \u2014 preserves 072 r3-r6 lockfile removal). Also:\
  \ AC4.4 requires a paired 072 change (add <!-- echo-owned-skill --> marker) \u2014\
  \ is that defensible scope expansion or should it be its own item? AC5 ships 'run'\
  \ runtime without 075's workflow library \u2014 is the workflow file format minimal\
  \ enough to survive 075's needs? AC2.2 reimplements resolveMcpPort inline vs importing\
  \ \u2014 is that the right boundary? AC4.3's string-level TOML table-elision (smol-toml\
  \ round-trip) \u2014 pressure-test the comment + CRLF + no-trailing-newline edge\
  \ cases."
---

# What to review

Read `backlog/ready/2026-05-25-074-echo-cli-binary.md` at commit `d9ef0c07804647d9c2e17f2be64553186a129d79`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
