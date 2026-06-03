---
item_id: 2026-06-02-087-reviewer-invocation-argv-contract
round: 4
spec_commit_sha: afb01c248c4278a1e9892607d8fa03afa0c9fb2c
artifact_path: backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md
class: narrow
requested_at: '2026-06-03T03:49:27Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 7fcb5d1f-a7b4-4be5-80bd-7ad32814056c
focus_hints: "Verify r3 patch at spec SHA 1dc8e554: AC1 now pins the slash-command\
  \ prompt-path source IN the binding \u2014 stdin_from resolves to .claude/commands/review-queue-<reviewer>.md\
  \ from a binding-owned source (explicit per-entry path or {{REVIEWER}} derivation),\
  \ with NO read of reviewers.json.slash_command; AC4(xi) asserts a headless tick\
  \ resolves the expected per-reviewer prompt path without reading legacy reviewer\
  \ config. Confirm internal consistency with AC1 prompt-not-in-argv + AC2 one-runtime-read-source\
  \ + AC5 scope (reviewers.json untouched). Still behavior-preserving: no read-only\
  \ flip, no commit move, no SLA move."
---

# What to review

Read `backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md` at commit `afb01c248c4278a1e9892607d8fa03afa0c9fb2c`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
