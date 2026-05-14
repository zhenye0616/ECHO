---
item_id: 2026-05-14-049-codex-skill-adapter
round: 7
combined_at: '2026-05-14T21:14:00Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
patch_commit_sha: null
next_round: 8
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

**Both verdicts converged at `proceed_after_patches`** (2nd consecutive round). 5 findings, all mechanical. Founder authorized "keep --copy mode + apply patches + dispatch R8" at the post-R7 escalation checkpoint. Strategist applied patches inline.

## Convergent findings

No same-`where` pairs at R7 (each reviewer caught complementary issues).

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC2 codex output format: `codex exec` stdout contains banner+prompt+token-summary BEFORE final answer; per-item prompt names same review section headings codex emits; regex extraction from raw stdout would match PROMPT text not actual review | accept-with-patch | **Real builder-blocking spec bug.** AC2 patched: children now use `codex exec --output-last-message "$RUN_DIR/<item-id>.review.md"` to write FINAL response to a separate file. Orchestrator parses `<item-id>.review.md` (NOT stdout). stdout+stderr become diagnostic-only, surfaced on parse failure or rc≠0. |
| 2 | MEDIUM | codex | AC4 stale-lock recovery missing tests; AC3 install-helper test list covered active-lock blocking + mode-agnostic + stale staging but not stale-lock | accept-with-patch | AC3 patched: new test `stale-lock recovery — readable old timestamp` (pid + old-timestamp fixture, asserts recovery + install proceeds). |
| 3 | MEDIUM | codex-ops | AC2 parse-failure diagnostic only logs stderr+rc; RUN_DIR cleanup trap deletes the stdout/review.md that explains the failure; operator loses the only artifact | accept-with-patch | AC2 patched: parse-failure path COPIES the child's `{stdout, stderr, review.md}` triple to `raw/internal/queue-errors/<ISO-ts>-review-pending-<item-id>/` BEFORE RUN_DIR cleanup fires. Durable evidence directory. queue-errors row names missing heading + rc + first 2KB stderr inline. AC3 patched: new test `parse-failure preserves evidence outside RUN_DIR cleanup`. |
| 4 | MEDIUM | codex-ops | AC4 stale-lock recovery handles readable timestamps only; crash between `mkdir "$LOCK"` and timestamp-write leaves lock with no usable timestamp; next install fails under set -e or treats lock as active forever | accept-with-patch | AC4 patched: stale-lock recovery now has THREE shapes — (a) readable timestamp >600s old → stale; (b) missing/non-integer timestamp → fall back to lock-dir mtime; if mtime >600s → stale. Read wrapped in safe pattern (`[ -f ... ] && cat ... 2>/dev/null` + integer-regex check) so `set -euo pipefail` doesn't terminate script. AC3 patched: new test `stale-lock recovery — corrupted/missing timestamp (mtime fallback)`. |
| 5 | MEDIUM | codex-ops | AGENTS.md docs say "run install once" but --copy mode installs are snapshots; future sync-skills.sh runs update repo but NOT `~/.codex/skills/*`; --copy users get stale skills silently | accept-with-patch | AGENTS.md patched: explicit warning that --copy mode installs are SNAPSHOTS; users MUST re-run install after every sync. Spec adds stale-copy detection: `.echo-managed` sentinel now records `synced_from_commit=<sha>`; `tools/sync-skills.sh --check` reads the sentinel + WARNS (stderr, not error) if installed copy's sha differs from canonical's current sha. AC3 patched: 2 new tests (`--copy install sentinel records synced_from_commit` + `sync-skills.sh --check warns on stale copy-mode adapter`). |

## Convergence call

**needs R8 — final-final verification round (narrow focus_hints):**
- Verify AC2 children use `--output-last-message "$RUN_DIR/<item-id>.review.md"`; orchestrator parses that file (NOT stdout).
- Verify AC2 parse-failure path copies child triple to `raw/internal/queue-errors/<ISO-ts>-review-pending-<item-id>/` before RUN_DIR cleanup.
- Verify AC4 stale-lock recovery handles BOTH shapes (readable old timestamp AND missing/corrupted timestamp via mtime fallback) with set -euo pipefail-safe read pattern.
- Verify AGENTS.md warns --copy users about snapshot refresh; sentinel records `synced_from_commit`; --check warns on stale copy-mode adapter.

R7 decay: 5 findings → 5 unique-root (no consolidations this round; each reviewer's findings hit different surfaces). **Both verdicts proceed_after_patches** (2nd consecutive round with no pushback). All patches mechanical, no design redo. R8 expected terminal: zero new HIGH = CLAIM-READY. Founder explicitly authorized continuing (post-R7 escalation: "keep").

