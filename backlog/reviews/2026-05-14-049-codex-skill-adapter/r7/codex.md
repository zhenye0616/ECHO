---
item_id: 2026-05-14-049-codex-skill-adapter
round: 7
reviewer: codex
artifact_sha: f1a9bd74dd3df02eaa49d8e1f5f219ccfe8ed2f9
completed_at: '2026-05-14T21:08:36Z'
verdict: proceed_after_patches
consumed_task_state: false
findings:
- severity: high
  where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md@f1a9bd7:86-98"
  finding: >-
    AC2 requires the orchestrator to capture each child with `codex exec ... > "$RUN_DIR/<item-id>.stdout"` and then extract the required review sections from that stdout by regex. That is not a stable final-message stream in the installed Codex CLI. A local probe against `codex-cli 0.130.0` printed the Codex banner, workdir/model metadata, the full user prompt, token summary, and then the final answer to stdout. Because the per-item prompt itself names the same review headings, regex extraction from stdout can match prompt/template text or log text instead of the child's actual review. Patch the codex binding contract to write the final response through `--output-last-message "$RUN_DIR/<item-id>.review.md"` (or parse a documented `--json` final event) and parse that final-message file; keep stdout/stderr only as diagnostics on child failure.
- severity: medium
  where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md@f1a9bd7:140 and :116-131"
  finding: >-
    AC4 now requires stale-lock recovery (`$HOME/.codex/.echo-locks/<name>` with an old timestamp is removed and install proceeds) and even says AC3 covers it, but the AC3 install-helper test list covers active lock blocking, mode-agnostic locking, and stale staging cleanup only. There is no stale-lock recovery case. Add the missing test: pre-create a lock with an old timestamp/pid, run both relevant install modes or at least the default mode, assert the stale lock is warned about/removed, and assert installation proceeds without waiting for the 10-minute timeout.
---

# Codex review - r7

Verdict: `proceed_after_patches`.

The adapter target is implementable after a narrow patch. The remaining runtime blocker is that the codex child-output contract parses `codex exec` stdout, but stdout contains execution framing and the prompt, not just the final markdown. Use `--output-last-message` or a documented JSON final event as the parse source. Also add the missing stale-lock recovery test promised by AC4.
