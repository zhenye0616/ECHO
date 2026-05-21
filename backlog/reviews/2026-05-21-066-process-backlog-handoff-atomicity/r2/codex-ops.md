---
item_id: "2026-05-21-066-process-backlog-handoff-atomicity"
round: 2
reviewer: "codex-ops"
artifact_sha: "fedad0dde567c97e835715b39011504830994942"
completed_at: '2026-05-21T23:01:43Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:180; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:223-232; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:304-305"
    finding: >-
      The recovery transcript passes the full touched-surface list to `git restore`, including paths that commonly do not exist in HEAD yet (`$DEST`, a new run log, and sometimes the builder pointer). Git aborts the restore when any pathspec is unknown; because the command is hidden behind `2>/dev/null || true`, the dirty claimed item is left dirty and the subsequent `git diff --quiet -- "${surfaces[@]}"` returns non-zero. At runtime, a crash after the source metadata edit but before `git mv` therefore makes the next unattended process-backlog run stop before `git pull --rebase`, which is exactly the human-triage state P1 is supposed to remove. Patch the recipe to restore only tracked/existing HEAD paths, separately remove untracked transition artifacts, and add a test where `$DEST` and `$LOG` are absent while the claimed item is dirty.
  - severity: "high"
    where: "backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:235-240; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:271-272; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:295; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:368"
    finding: >-
      The current consumer declares one local Git commit as the durable boundary, but the backlog handoff is operationally visible to other actors only after `origin/main` receives that commit. If the process crashes after `git commit` and before `git push`, or if the direct `git push origin main` is rejected, the next run sees `HEAD:$DEST` and exits via the idempotency check without retrying the push. That strands the item as `pending_review` only in the founder's local checkout while every other scheduler/reviewer polling `origin/main` still sees it as claimed. Treat the pushed ref as the boundary for this consumer, or add a recovery branch that detects `HEAD` ahead of `origin/main` / `origin/main:$DEST` missing and pushes with the retry helper before declaring the transition complete; pin it with a crash-after-commit-before-push test.
---

# codex-ops review

Verdict: `pushback`.

Round 2 fixes the r1 `git add "$DEST"`, `--spec-path "$DEST"`, and recursive rename-detection gaps. The remaining failures are operational: the rollback recipe can fail in the normal missing-path crash case, and a post-commit/pre-push interruption can make the handoff look complete locally while remaining invisible on `origin/main`.
