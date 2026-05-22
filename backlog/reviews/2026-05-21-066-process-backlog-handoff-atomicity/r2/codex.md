---
item_id: "2026-05-21-066-process-backlog-handoff-atomicity"
round: 2
reviewer: "codex"
artifact_sha: "fedad0dde567c97e835715b39011504830994942"
completed_at: '2026-05-21T23:02:37Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:238-240; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:267-272; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:295; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:309"
    finding: >-
      The spec declares the durable boundary as one local commit and the transcript treats a local HEAD:$DEST as published, but process-backlog's handoff is only visible to other actors after origin/main advances. If git push origin main fails after the commit, the next run rebases a branch that is simply ahead of origin, HEAD:$DEST remains true, $ITEM_FILE is gone locally, and lines 238-240 exit without retrying the push. The item stays in backlog/claimed/ on origin while the local checkout believes the handoff is done. Make the boundary a pushed ref, or add deterministic recovery for "local commit exists but origin lacks $DEST" that retries/pushes with the existing push-with-retry pattern, and add a remote-backed test because AC3 currently says the tests do not push.
  - severity: "medium"
    where: "backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:176-180; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:223-236; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:270; skills/process-backlog.md:145-170"
    finding: >-
      The rollback surface includes $LOG, but the current process-backlog flow writes or appends that run log before the stage-move block. On a resumed crash with an uncommitted run-log add or append, recover_p1_stage_move restores or removes $LOG before pull/rebase, then the transcript proceeds directly to metadata edits, patching, git mv, and git add "$LOG" without recreating the run-log content. That can either drop the current run section from the final commit or fail the publish block when $LOG was untracked and got removed. Pin recovery before the run-log write, or explicitly replay E1 after recovery, and add a crash test for both untracked and tracked-modified run logs.
  - severity: "medium"
    where: "backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:205-236; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:306; skills/process-backlog.md:62-84"
    finding: >-
      recover_p1_stage_move can reject unsafe surfaces or return nonzero when the touched surfaces are still dirty, but the canonical caller ignores that status and the surrounding transcript does not establish set -e. Existing process-backlog snippets handle load-bearing failures explicitly, so a literal implementation can pass the AC3 direct-function test while still continuing to git pull/rebase after recovery refused to run. Guard the call as recover_p1_stage_move "${P1_TOUCHED_SURFACES[@]}" || exit $? (or set strict shell semantics for the whole block) and test that a recovery failure prevents pull/publish.
---

# Codex review

Verdict: `pushback`.

The r1 corrections are preserved: the destination path is staged after `git mv`, the builder-state patcher receives `--spec-path "$DEST"`, and the diff-tree assertion is recursive with rename detection. I would not hand this to a builder yet because the handoff can still become local-only after a push failure, and the recovery recipe can erase the run-log work it is supposed to publish.
