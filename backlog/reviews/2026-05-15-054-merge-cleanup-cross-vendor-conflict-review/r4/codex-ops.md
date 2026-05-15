---
item_id: "2026-05-15-054-merge-cleanup-cross-vendor-conflict-review"
round: 4
reviewer: "codex-ops"
artifact_sha: "8bcd9c980163b557727fd0aea6901f8b6548bfaa"
completed_at: '2026-05-15T20:42:59Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-15-054-merge-cleanup-cross-vendor-conflict-review.md:85"
    finding: "AC1b.5/AC1b.7 require an exact string compare between the emitted consult_cwd and $MERGER_WT. In the actual merge runtime the worktree lives under TMPDIR, and on macOS that path can be observed either as /var/folders/... or /private/var/folders/... depending on whether the reporter uses a shell logical PWD, pwd -P, or a CLI/runtime getcwd. That means a correctly-invoked consult can fall into the wrong-tree recovery path and ask the founder to decide under a false failure. Keep the reviewer-emitted consult_cwd field, but make the spec require canonicalizing both paths before comparison, or require the prompt to emit both raw PWD and a canonical pwd -P value and compare the canonical form."
  - severity: "low"
    where: "backlog/ready/2026-05-15-054-merge-cleanup-cross-vendor-conflict-review.md:125"
    finding: "The failed C3.5 review_notes examples end with 'wrong SHA', but the failure mode introduced in AC1b.7 is a consult_cwd/wrong-tree mismatch. If this ships as written, the durable merge audit trail can point operators at an unreachable-SHA problem when the actual runtime failure was that the reviewer ran from the wrong worktree. Change the failed example to 'wrong tree' or 'cwd mismatch' so the C6 record matches the recovery branch."
---

# codex-ops review

Verdict: proceed_after_patches

Findings:

1. [medium] `consult_cwd` is the right runtime signal, but exact raw string equality against `$MERGER_WT` is too brittle for TMPDIR-backed macOS worktrees. Canonicalize before comparison or require the reviewer to emit a canonical cwd field.

2. [low] The C6 failed-consult audit example says `wrong SHA`; it should describe the wrong-tree/cwd-mismatch failure that AC1b.7 actually defines.

Notes:

- The named stdout/stderr capture shape is directionally correct for unattended recovery: command-not-found and non-zero exits have durable files under `$MERGER_WT`, and malformed responses can be surfaced from stdout.
- I do not see a scheduler or launchd overlap issue introduced by this spec because C3.5 is a manual `/merge-and-cleanup` escalation, not a queue tick path.
