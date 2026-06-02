---
task_id: 2026-06-02-086-claim-gate-spec-review-convergence
role: builder
binding: codex
claim_branch: agent/claim-gate-spec-review-convergence
last_updated: 2026-06-02T22:35:14Z
---

## current_thesis
Claimed 086 as codex builder. Implement the claim gate so a `ready/` item with non-empty `requested_reviewers` is claimable only after watcher/founder-owned spec-review convergence is present and fresh, while unreviewed-by-design items keep today's selector behavior.

## locked_decisions
- AC1: update `skills/review-queue-watch.md` so both terminal paths write `spec_review: converged` and a normalized-content digest in `spec_review_sha`, then regenerate `.claude/commands/review-queue-watch.md`.
- AC2: update `tools/blocked.py` to parse/preserve `requested_reviewers`, `spec_review`, and `spec_review_sha`; gate candidates through an isolated review-satisfaction helper that fails closed on malformed reviewer lists.
- AC3: implement one shared normalized-content digest that excludes `spec_review`, `spec_review_sha`, and agent-managed fields; converged markers with digest mismatch block as `spec-edited-after-review`, while `waived` bypasses staleness.
- AC4: update `docs/AGENT_INSTRUCTIONS.md` and `backlog/README.md` to document the conditional review gate, founder-only `waived`, and watcher/founder ownership of `spec_review` fields.
- AC5: make `blocked.py --validate` reject bad `spec_review`, missing/malformed converged digests, and malformed digest fields while allowing absent `spec_review` and digest-less `waived`.
- AC6: extend `tools/test_blocked.py` for inline reviewer lists, blocked/unblocked review states, marker-only fresh vs AC-body stale, waived, validation failures, and `--list-blocked` reason output.
- AC7: preserve existing behavior for absent or empty `requested_reviewers`; verify through selector tests and `blocked.py --list-all`.

## open_questions
- None blocking at claim time. Escalate if implementation needs files outside `files_to_modify`, a new dependency, changes to convergence computation, or a new test framework.

## dont_touch
- Do not make `backlog/inbox/` reviewable-but-not-claimable.
- Do not change `combine.py` convergence computation or watcher escalation boundaries.
- Do not mechanize `docs/BACKLOG.md`.
- Do not auto-fire reviewers or add a headless dispatcher.
- Do not edit `wiki/`, backlog item bodies, docs/status/backlog founder-owned files, or files outside the spec's `files_to_modify`.

## canonical_anchors
- spec: backlog/claimed/2026-06-02-086-claim-gate-spec-review-convergence.md
- reviews: backlog/reviews/2026-06-02-086-claim-gate-spec-review-convergence/
