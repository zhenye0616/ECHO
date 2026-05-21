---
item_id: "2026-05-21-066-process-backlog-handoff-atomicity"
round: 1
reviewer: "codex-ops"
artifact_sha: "1ca158b7ac038bc45ed66bf9daa132aa7e446686"
completed_at: '2026-05-21T21:54:02Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:134-140; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:182-184"
    finding: >-
      The proposed Step 3 relies on `git mv` after the frontmatter edit to stage the renamed file with the edited contents, but default Git does not do that. In a throwaway repo, editing `backlog/claimed/item.md` and then running `git mv backlog/claimed/item.md backlog/pending_review/item.md` produced a staged R100 rename at the old blob plus an unstaged modification on `backlog/pending_review/item.md`. Because the canonical transcript never runs `git add` on the moved item path after `git mv`, `git commit -m "review: $ITEM_ID"` can commit the pending_review file with stale/empty `head_sha`, `pr_url`, and `agent_notes`, then leave the worktree dirty for the next unattended tick. Patch AC1/R2 to stage the destination item explicitly after `git mv` and add a test assertion that the committed pending_review file, not just the working tree, contains the edited handoff frontmatter.
  - severity: "high"
    where: "backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:122-143; tools/task-state/patch-builder-state.py:289-310; tools/task-state/patch-builder-state.py:403-407"
    finding: >-
      The canonical transcript passes `--spec-path "$ITEM_FILE"` while `$ITEM_FILE` still points at `backlog/claimed/<id>.md`, and the current patcher records that argument verbatim into `## canonical_anchors` rather than reading the spec and independently choosing a destination anchor. At runtime the handoff commit would therefore publish `builder.md` with `canonical_anchors.spec` pointing at a claimed-path file that no longer exists after the same commit moves the item to `pending_review/`. That breaks cold-start/task-state consumers right after the handoff. Patch the spec to pass the final `backlog/pending_review/<id>.md` anchor to the patcher (while still reading `task_state_ref` from the source file), or add an explicit post-move anchor rewrite before the final commit.
  - severity: "medium"
    where: "backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:157-165; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:198-208"
    finding: >-
      The specified Test 2 assertion uses `git diff-tree --no-commit-id --name-status HEAD` as though it will report file-level R/M/A entries, but `diff-tree` is non-recursive by default and does not force rename detection. In a default throwaway repo this shape can collapse to directory-level rows such as `M backlog` / `A raw`, or D/A instead of R, making `npm test` fail or become dependent on local Git config rather than the handoff invariant. Pin the harness command to `git diff-tree -r -M --no-commit-id --name-status HEAD` (or an equivalent forced-recursive, forced-rename form) before relying on it as the structural regression gate.
---

# codex-ops review

Verdict: `pushback`.

The spec is targeting the right runtime seam, but two of the proposed operational invariants do not hold with the current transcript. Literal execution can publish a pending_review item with stale frontmatter and a builder pointer whose canonical spec anchor points at the removed claimed path. Fix those before a builder claims 066.
