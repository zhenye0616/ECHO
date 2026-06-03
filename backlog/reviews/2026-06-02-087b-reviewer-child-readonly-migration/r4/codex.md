---
item_id: "2026-06-02-087b-reviewer-child-readonly-migration"
round: 4
reviewer: "codex"
artifact_sha: "af3bd184b49e8efa9177980e3c4e52b23d518cad"
completed_at: '2026-06-03T06:58:44Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md:57,65,68; .claude/commands/review-pending.md:116-128; codex exec --help --output-last-message"
    finding: >-
      AC2 still makes the wrapper validate the raw Codex stdout stream as the canonical Markdown review (`capture.stdout_path`), but the installed Codex CLI already has a clean final-message file channel and ECHO's review-pending prompt documents why raw `codex exec` stdout is unsafe: it can include banner/workdir/model metadata, echoed prompt text, and token summaries before the final answer. If 087b implements the literal stdout_text redirect, a successful child can either fail schema validation forever or, worse, let prompt text contaminate the parser. Patch AC2/AC5 to require a tested final-response capture for codex/codex-ops, for example `codex exec --output-last-message <wrapper-owned final_message_path>` or an equivalently parsed `--json` event stream, while keeping raw stdout/stderr as diagnostics only. Add a regression where raw stdout contains prompt/banner noise but the wrapper publishes only the final assistant message.
---

## Codex Review

Verdict: `proceed_after_patches`.

The r4 scoping and durability patches look aligned with the prior findings: publisher migration is now codex/codex-ops only, capture failures must become durable on `origin/main`, and the wrapper owns selection, lifecycle, git sync, and packet prep before the read-only flip. The remaining issue is the Codex capture channel: raw stdout is not a reliable review-markdown source for the actual CLI.
