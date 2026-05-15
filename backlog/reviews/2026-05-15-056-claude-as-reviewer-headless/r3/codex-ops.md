---
item_id: "2026-05-15-056-claude-as-reviewer-headless"
round: 3
reviewer: "codex-ops"
artifact_sha: "d64afefd8bdcb149278e85ffea27c5a6ec05f718"
completed_at: '2026-05-15T23:53:25Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-15-056-claude-as-reviewer-headless.md:95,140-142,229-233"
    finding: >-
      AC2/AC5 now make `invoke_command` a headless-only runtime field and explicitly allow IDE-mode reviewers to omit it, but AC9 still requires all four slugs, including `cursor`, to carry a non-empty `invoke_command`. If a builder follows the test literally, they either add a bogus cursor command just to satisfy CI or make the test contradict the mode-conditional schema. That weakens the runtime boundary the installer and `_reviewer_gate.py` rely on: IDE reviewers should not look launchd-invokable, and `--print invoke_command` for cursor should fail clearly. Patch AC9 to assert non-empty `invoke_command` only for headless reviewers (`codex`, `codex-ops`, `claude`), assert cursor may omit/loads as `None`, and assert the IDE-mode `--print invoke_command` path exits non-zero with the documented diagnostic.
  - severity: "high"
    where: "backlog/ready/2026-05-15-056-claude-as-reviewer-headless.md:173-176,219-237"
    finding: >-
      AC5 says missing fields, template mismatches, or an executable missing from PATH must surface as a `queue-errors.md` entry, but the spec never says the wrapper must commit and push that entry before the 050 ephemeral worktree cleanup, and AC9 does not test the failure path. In the production launchd case, this is exactly the path where the reviewer child may never start, so there is no prompt body available to journal or push anything; an uncommitted queue-errors append inside `$WT` is deleted by the cleanup trap and the operator is left with only the launchd log. Patch AC5/AC9 to require a wrapper-side queue-error helper that appends, commits, and pushes the row from the isolated worktree before exit, then simulate a missing executable or bad template and assert the row is present on `origin/main` after `_run_reviewer.sh` exits non-zero.
---

# codex-ops review

Verdict: `proceed_after_patches`.

R3 closes the prior concrete issues around the explicit `claude_response` schema field, Option A-only shell substitution, and install-time CLI preflight. Two operational gaps remain: AC9 still contradicts the headless-only `invoke_command` model for cursor, and the wrapper-side queue-error path is not specified tightly enough to survive ephemeral worktree cleanup when the reviewer process never starts.
