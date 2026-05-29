---
item_id: "2026-05-28-078-decision-card-board"
round: 2
reviewer: "codex-ops"
artifact_sha: "b904fedeb7788c6d7fd65c4bc9956c2531983f2e"
completed_at: '2026-05-29T03:20:51Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-28-078-decision-card-board.md:83-100; backlog/ready/2026-05-28-078-decision-card-board.md:103; backlog/ready/2026-05-28-078-decision-card-board.md:128; tools/review-queue/push-with-retry.sh:39-43"
    finding: >-
      source_state.behind can still report fresh when no one has fetched after the last queue push. AC1 forbids a network fetch and says the daemon compares the local checkout to its known origin/main; the queue push helper fetches before pushing HEAD:main, but that push does not refresh the local remote-tracking ref afterward. In the unattended path, a reviewer or watcher worktree can push an escalated combined.md to GitHub while the founder's repo_path still has old files and an old origin/main, so local_head equals upstream_head, behind is 0, dirty is false, and the board silently renders no decisions. Patch the contract with an observable freshness proof, such as a max-age or checked-at field for the remote-tracking ref that forces a warning when stale or unknown, or a bounded fetch mode outside the hot scan budget, plus a fixture where origin/main is stale after a local queue push.
  - severity: "medium"
    where: "backlog/ready/2026-05-28-078-decision-card-board.md:101; tools/review-queue/dispatch-next-round.py:7-16; tools/review-queue/dispatch-next-round.py:144-205; tools/review-queue/schemas/combined.schema.json:42-49"
    finding: >-
      AC2's close/reset predicate still depends on a non-empty convergence call or disposition, but the durable queue schema only exposes next_round and patch_commit_sha; terminal branches leave next_round null and write any waiver or convergence only into body text. For an escalated round that is founder-dispositioned terminally with no next request while the item remains in ready or pending_review, the adapter must either parse Markdown prose/table placeholders, which AC2 forbids, or keep the card and A1 alarm open forever. Patch the spec to use existing machine fields exclusively or require a machine-readable close marker in combined.md frontmatter, then add a fixture for an escalated round with no r<N+1> request but a terminal disposition.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The DecisionCard board is close: A2 deferral is coherent, the scan is bounded to in-flight items, and the Raycast polling contract now has single-flight/backoff language. The remaining problems are runtime observability contracts. As written, the board can still lie by omission when the remote-tracking ref is stale, and it can leave terminally dispositioned escalations open because the close marker is not machine-readable.
