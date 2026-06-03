---
item_id: 2026-06-02-087-reviewer-invocation-argv-contract
round: 3
spec_commit_sha: 887fbe1cf2112458140ecb28a0114a03adc4c088
artifact_path: backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md
class: narrow
requested_at: '2026-06-03T03:35:34Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 2d83994c-d0bf-49a6-a51b-a6b8cc1d0c2a
focus_hints: "Verify r2 corrections at spec SHA e6bfe794: (1) AC4(v) now SPLIT into\
  \ v-a ({{WT}} survives argv handoff as one element) + v-b (PROMPT path tested as\
  \ quoted stdin operand < \"$STDIN_FROM\", never argv) \u2014 internally consistent\
  \ with AC1 prompt-not-in-argv; (2) AC2 gate-exit-status contract: bare mapfile <\
  \ <(gate) called out as INSUFFICIENT, wrapper must observe rc==0 + non-empty argv\
  \ before exec, AC4(ix) gate-failure regression; (3) AC2 'one RUNTIME-READ invocation\
  \ source' narrowing + AC4(x) no-path-reads-reviewers.json.invoke_command assertion\
  \ + OoS #12, reviewers.json/_reviewers.py/schema stay OUT of scope; (4) AC5 boundary\
  \ intact. Confirm still behavior-preserving: no read-only flip, no commit move,\
  \ no SLA move."
---

# What to review

Read `backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md` at commit `887fbe1cf2112458140ecb28a0114a03adc4c088`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
