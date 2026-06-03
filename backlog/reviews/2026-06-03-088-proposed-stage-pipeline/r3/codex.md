---
item_id: "2026-06-03-088-proposed-stage-pipeline"
round: 3
reviewer: "codex"
artifact_sha: "1a4d3eb8d5032941623ad835160f7240dcf85943"
completed_at: '2026-06-03T21:45:51Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:112-129"
    finding: >-
      The normal match path and recovery/bounce modes are now split, but the edited-after-request mismatch path still has no unambiguous commit owner when promote.py is invoked in stage-only terminal mode. Stage-only is defined as no commit/push with the watcher folding the staged move into the terminal combined.md commit; on mismatch there is no staged move, and the helper is also required to write queue-errors.md and dispatch a fresh verification round. Without a specified branch, a builder can either leave r<N+1>/request.md and queue-errors.md as local-only mutations, or incorrectly commit them as a terminal promotion/audit commit. Patch AC4/watch instructions/tests to say exactly who commits the mismatch dispatch in terminal mode, for example: promote.py returns a structured mismatch result; the watcher switches to the dispatch branch, creates r<N+1>/request.md at current HEAD, updates combined.md to next_round, stages queue-errors.md if written, commits `review-r<N+1>: dispatch on <item_id>`, and does not promote.
  - severity: "low"
    where: "backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:18-23,145-148"
    finding: >-
      AC7 requires `.claude/` adapters to be regenerated via tools/sync-skills.sh, and that script compares each edited skills/*.md file against its tracked .claude/commands/*.md copy. The file surface lists the canonical skills but omits the generated adapter files, so a strict builder following files_to_modify can either leave tools/sync-skills.sh --check red or make out-of-list edits. Add the affected .claude/commands/process-backlog.md, process-backlog-batch.md, merge-and-cleanup.md, and review-queue-watch.md adapter copies to files_to_modify with a generated/do-not-hand-edit note.
---

# Codex Review

Verdict: `proceed_after_patches`.

The r3 artifact closes the main normal-path concerns: the terminal promotion path is mutate-only, recovery/bounce own commit+push, and the content-identity gate compares the current `proposed/` file to the reviewed artifact at `request.spec_commit_sha`. I found one remaining branch-boundary gap in the mismatch case, plus one adapter-surface cleanup needed for `sync-skills` to be mechanically satisfiable.

## Findings

1. MEDIUM - `promote.py` mismatch dispatch has no committed owner in stage-only mode.
   On a content mismatch during terminal promotion, the spec says to leave the item in `proposed/`, write `queue-errors.md`, and dispatch a fresh verification round. But terminal mode is explicitly no-commit/no-push, and the watcher branch is described as folding a successful staged move into the terminal commit. Add the missing mismatch branch so the new request and queue error cannot be left local-only or committed as a false terminal promotion.

2. LOW - The required generated Claude adapters are missing from `files_to_modify`.
   Because `tools/sync-skills.sh --check` compares `skills/*.md` to `.claude/commands/*.md`, the affected adapter copies need to be listed as generated outputs for the builder to commit.
