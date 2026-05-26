---
item_id: 2026-05-25-074-echo-cli-binary
verdict: merge as-is
reviewed_at: 2026-05-26T08:18:53Z
test_counts: { passed: 1376, failed: 0, skipped: 21 }
---

## Verdict
Ground-truth SHA matches recorded `head_sha` (`c3797e77`). Full suite: 1376 passed / 0 failed / 21 skipped; lint clean; typecheck clean; `npm run build:cli` clean; shell-reachability smoke test passes end-to-end in 13.5s. Drift sweep empty — every changed file matches `files_to_modify`. `git merge-tree` against current `origin/main` reports no conflict markers (main has only advanced by one commit — 074's own review sidecar — since the merge-base, touching no source files 074 touches). Code quality is high across the highest-risk surfaces: inverse adapters preserve user data byte-for-byte outside the `<!-- BEGIN ECHO --> ... <!-- END ECHO -->` block; codex TOML elision finds the "next header of any name" boundary as specified; skills inverse uses byte-equality ownership proof; `doctor` performs zero writes under `~/.echo/` (verified by grep); binary is named `echoctl` consistently with no surviving `bin/echo` references (the only remaining `echo` mention is the decision-archive line 45, which the After-Completion notes already flag for post-merge update); `run` dispatcher gates unmatched roles BEFORE any spawn; SIGTERM-priority exit-code logic in `computeExitCode` correctly puts the signal-flag check first. All 8 judgment calls (J1–J8) stand. No blocking fixups.

## Pre-merge fixups
- (none — founder may merge with `git merge --no-ff agent/echo-cli-binary-restart`)

## Expected merge conflicts
- None predicted. `git merge-tree $(git merge-base origin/main agent/echo-cli-binary-restart) origin/main agent/echo-cli-binary-restart` produced zero `CONFLICT` markers; the only commit on origin/main since the merge-base is the 074 sidecar itself (touches no source files).

## Follow-up items (defer, do not block merge)
- Strategist post-merge: update `raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md:45` from `/usr/local/bin/echo` to `/usr/local/bin/echoctl` per the spec's After-Completion notes and the r2 codex-ops F1 binary-rename decision.
- Cosmetic: document the `wired_at` lexicographic-sort assumption in `src/cli/workflow/match.ts:22-24` via a one-line comment (the comparator is correct for ISO-8601 strings but would silently mis-sort if a future spec ever allows numeric epoch values).
- Edge case: `src/cli/commands/uninstall.ts:184,207` — when `--force-purge` is set without `--purge-state`, the flag has no semantic effect AND silently downgrades the exit code from 1 to 0 if cleanup conflicts existed. Decide whether this combination should be a usage error (exit 2), be silently ignored (current behavior), or still exit 1 because cleanup had conflicts. Spec is silent on the combination.
- Cosmetic: `src/cli/inverse/codex-config.ts:29` `isEchoHeader` regex tolerates BOM (`﻿?`) but `isAnyHeader` on line 32 does not. Boundary line is post-BOM in practice so this should never matter; future-proofing nit.
- Init capability change-detection at `src/cli/commands/init.ts:170` uses `JSON.stringify` equality (order-sensitive). Correct because the writer always emits canonical order via the frozen `AGENT_CAPABILITIES_BY_KIND`, but worth documenting if a future contributor adds keys.
