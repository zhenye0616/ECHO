---
item_id: "2026-05-28-078-decision-card-board"
round: 2
reviewer: "codex"
artifact_sha: "b904fedeb7788c6d7fd65c4bc9956c2531983f2e"
completed_at: '2026-05-29T03:20:18Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-28-078-decision-card-board.md:101 and :114; tools/review-queue/combine.py:735-739 at b904fede"
    finding: >-
      AC2 still tells the adapter to close/reset cards when combined.md carries a non-empty convergence call / disposition, while also saying the predicate is built only from frontmatter/dir facts and no body-placeholder inference. In the current queue emitter the convergence call is always a body placeholder, not frontmatter, and combined.schema has no disposition/convergence field; so a literal implementation either closes every escalated card immediately by seeing the placeholder, or parses body/table prose that AC2 forbids. Patch the predicate/tests to use only existing durable fields (for example escalated_to_founder, next_round, and item stage; defer "disposition body closes card" until the queue has a real frontmatter field) or explicitly add the durable field as a separate queue change.
  - severity: "medium"
    where: "backlog/ready/2026-05-28-078-decision-card-board.md:83-100 and :103"
    finding: >-
      The source_state contract says behind=0 is fresh and AC4 says the board never silently renders no decisions over a stale read, but AC1 also forbids a network fetch and only compares local HEAD to the repo's cached origin/main ref. If origin/main has not been fetched since another worktree pushed a new escalated combined.md, rev-parse/rev-list report behind=0, dirty=false, partial=false, and the board can show an empty/no-warning state over a stale checkout. Patch the contract to surface cached-ref freshness explicitly (for example upstream_checked=false or upstream_head_source=local_ref with a banner, or another durable freshness signal) or narrow the AC4 claim/tests to the "known local origin ref" semantics.
---

# Codex Review

Verdict: `proceed_after_patches`.

The r2 spec is close, but these two points still need a spec patch before build. Both are implementation-contract issues: one asks the adapter to infer state from non-durable body text, and the other promises stronger freshness than the no-fetch design can verify.
