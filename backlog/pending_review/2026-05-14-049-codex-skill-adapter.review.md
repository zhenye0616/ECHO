---
item_id: 2026-05-14-049-codex-skill-adapter
verdict: merge as-is
reviewed_at: 2026-05-14T21:55:00Z
test_counts: { passed: 910, failed: 0, skipped: 21 }
---

## Verdict

All five acceptance criteria are met with file:line evidence. `tools/sync-skills.sh` is extended with a `codex` target that materializes `adapters/codex/skills/<name>/SKILL.md` for the in-scope set (`process-backlog`, `review-pending`) — frontmatter via `yaml.safe_dump`, body byte-identical to canonical. `--check` verifies presence + body + frontmatter and rejects unexpected adapter directories (the R4-cycle drift guard). `skills/review-pending.md` is vendor-neutralized; codex binding-specific notes implement every prose mitigation from rounds R2/R5/R6/R7/R8 — `workspace-write -C <worktree>`, `RUN_DIR` via `mktemp`, `--output-last-message` capture instead of stdout parsing, all 8 required section headings, parse-failure evidence preservation, N≤4 concurrency cap. `.claude/commands/review-pending.md` synced byte-identical. `tools/install-codex-adapters.sh` implements `--symlink`/`--copy`/`--dry-run` with the 3-factor stale-lock gate (age + `kill -0` PID liveness + process search), staging at `$HOME/.codex/.echo-staging/` outside the skill discovery root, `find -mindepth 1` cleanup, content-SHA256 sentinel (not git HEAD per R8), and mode-agnostic locking. AC3's 27 vitest cases (9 sync + 18 install) all green; AC3's `parse-failure-evidence-preservation` test deferred per spec line 161 (the spec itself authorizes the deferral). AGENTS.md gains the codex skill discovery paragraph with the `--copy` snapshot caveat. No drift outside `files_to_modify`. `npm test` 910/0/21, `npm run lint` clean, `npm run typecheck` clean, `tools/sync-skills.sh --check` clean. No merge conflicts predicted against current main (`218c5c3`).

## Pre-merge fixups

(none — verdict is merge as-is)

## Expected merge conflicts

- None predicted. Merge-tree dry-run against current main produces zero CONFLICT markers. All modified files are either new (`adapters/codex/...`, `tools/install-codex-adapters.sh`, `tests/sync-skills/*`) or touch lines untouched on main since the branch's merge-base (`tools/sync-skills.sh`, `skills/review-pending.md`, `.claude/commands/review-pending.md`, `AGENTS.md`). Current main activity (spec 050 dispatch + journal updates) is in unrelated paths.

## Follow-up items (defer, do not block merge)

- Cosmetic: `tools/install-codex-adapters.sh:201` — diagnostic `age_ok=${age_ok}` is always 1 by the time it's printed (early-return on the ≤600s branch). Tighten in a janitorial pass.
- Cosmetic: `tools/install-codex-adapters.sh:342` — `cp -R "$adapter/." "$stage/"` runs after writing the sentinel; if an adapter ever contained its own `.echo-managed` (it shouldn't per V1 scope), it would overwrite the stage-written one. V1 scope guarantees adapters contain only `SKILL.md`, so safe in practice. Worth a comment.
- Document in `tools/sync-skills.sh`'s header that `--check` reads `$HOME/.codex/skills/*/` for stale-`--copy` warnings, so CI environments aren't surprised by warnings against a real founder `~/.codex/skills/`.
- Strategist followups already named by the spec's "After Completion" section: extend vendor-neutralization to `merge-and-cleanup`, `review-queue-*`, `process-backlog-batch`; generate `agents/openai.yaml` for each adapter; add pre-commit hook for `sync-skills.sh --check`; verify codex auto-discovery honors symlinks (R2).
- The deferred `parse-failure-evidence-preservation` test belongs in a future spec that implements the codex fan-out orchestrator/parser (suggested `050`-equivalent — though `050` itself is already worktree-isolation; pick the next free id).
- Human smoke test owed per DoD line 240: run `tools/install-codex-adapters.sh` in a real codex CLI session and verify `/review-pending` discovers in codex's slash-command surface.

## Open questions for founder

(none)
