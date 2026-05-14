---
item_id: 2026-05-14-050-worktree-isolation-for-multi-step-main-writers
round: 4
reviewer: codex
artifact_sha: adb9000e3eeb27cfb5ee1c8725604bdbdafa4d69
completed_at: '2026-05-14T22:51:42Z'
verdict: proceed_after_patches
findings:
- severity: medium
  where: §AC1 step 4, lines 74-80; files_to_modify lines 22-25
  finding: AC1 requires the child process to cd into $WT, export ECHO_REVIEW_QUEUE_REPO_ROOT=$WT,
    and run codex exec -C $WT, but it never says to resolve PROMPT from the worktree.
    The current wrapper computes PROMPT from REPO_ROOT before launching Codex, and
    REPO_ROOT is the live checkout today. If the builder preserves that shape, the
    process writes in $WT while reading reviewer prose from the founder checkout,
    so the R3 prompt-only fixes listed in files_to_modify (same-reviewer overlap guard
    and journal-before-cleanup ordering) can be absent from the actual stdin even
    though they exist in origin/main and the freshly-created worktree. Patch AC1 to
    require PROMPT=$WT/.claude/commands/${SLASH_COMMAND}.md after git worktree add
    (or an equivalent worktree-root prompt path), and add the wrapper test/smoke to
    assert codex exec receives stdin from the worktree copy.
---


R4 is close. The headless-vs-IDE split is coherent, `push-with-retry.sh` has the right detached-HEAD refspec contract, and the journal-before-cleanup ordering is now explicit enough for a builder.

The remaining issue is a narrow wrapper/source-of-truth gap: routing CWD/env/-C is not enough if the prompt bytes still come from the live checkout. Because the R3 fixes are prompt prose changes, AC1 should pin the prompt path to `$WT` too.
