---
item_id: 2026-05-12-041-reviewer-background-execution
round: 2
combined_at: '2026-05-12T21:40:31Z'
codex_response: codex.md
cursor_response: cursor.md
patch_commit_sha: e8edb29
next_round: 3
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | LOW | both (convergent on `AC1 invalid `ECHO_REVIEW_QUEUE_REPO_ROOT` handling`) | AC1 invalid `ECHO_REVIEW_QUEUE_REPO_ROOT` handling | **accept — patch AC1** | Both reviewers want `set -euo pipefail` discipline + a one-line stderr preamble naming the env var when `cd "$ECHO_REVIEW_QUEUE_REPO_ROOT"` fails. Under unattended launchd, this distinguishes "env/path misconfig" from "Codex CLI failure" in the log tail. Codex's framing focuses on exit-before-`codex exec` discipline; Cursor's framing focuses on log readability. Both intents satisfied by one patch. |

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC5 isolated smoke repo branch setup vs push-with-retry.sh | **accept — patch AC5 (load-bearing for smoke executability)** | `git init` creates `master` on the founder's machine (no `init.defaultBranch` configured), but `push-with-retry.sh` hardcodes `git pull --rebase origin main && git push origin main`. Smoke would fail on branch naming before exercising the wrapper. Patch AC5 to use `git init -b main "$SMOKE_WORK"` (single-command form); fall-through for older git versions: `git init "$SMOKE_WORK" && (cd "$SMOKE_WORK" && git checkout -b main)`. Same fix for the bare origin: `git init --bare -b main "$SMOKE_ORIGIN"`. |
| 2 | LOW | codex | AC5 real-GitHub-origin-unchanged sanity assertion | **accept — patch AC5 sanity logic** | The original `git rev-list HEAD..origin/main \| wc -l` before/after diff on the production clone is race-prone: other review-queue actors (e.g., a parallel agent's commit) can legitimately push during smoke. It also doesn't prove the smoke repo's remotes don't include the real GitHub URL. Patch AC5 to make the hard assertion local-only and deterministic: (a) `$SMOKE_WORK`'s `origin` URL must equal `$SMOKE_ORIGIN` (string equality on `git -C "$SMOKE_WORK" remote get-url origin`); (b) no other remote is configured in `$SMOKE_WORK`; (c) the production GitHub URL `https://github.com/zhenye0616/echo_wiki.git` is absent from `$SMOKE_WORK`'s `.git/config`. Production-origin delta check stays as **advisory log line**, not failure. |
| 3 | LOW | cursor | AC1 — missing or non-repo `ECHO_REVIEW_QUEUE_REPO_ROOT` | **accept — folded with C1** | combine.py double-listed this finding: it correctly matched as convergent with Codex L3 (Convergent #1 above) AND surfaced separately here. Same gap; same patch as C1. Operator note: combine.py's match-key for `where` strings is fuzzy enough that some convergent findings appear twice — strategist disposition collapses them. |
| 4 | NIT | cursor | AC5 minimal copy-set vs reviewer prompt reachability | **accept — add to Implementation Hints** | If the AC5 builder shrinks the smoke copy-set for speed, they must ensure the reviewer prompt's path references (e.g., `.claude/commands/review-queue-codex.md` references to `tools/review-queue/schemas/`, `tools/review-queue/_lib.py`, etc.) all resolve in the smoke tree. Add to Implementation Hints: when shrinking copy list, `grep -E 'tools/review-queue/\|.claude/commands/' .claude/commands/review-queue-codex.md` and ensure every referenced path is included in the smoke copy. Not load-bearing — full-tree copy is the safe default. |
| 5 (MISSING from combined.md) | LOW | cursor | AC2 `Label` vs kickstart target | **accept — patch AC2** | combine.py did NOT include this finding in either the convergent or divergent tables; manual strategist read of `cursor.md` surfaces it. Cursor's L1: the kickstart command `launchctl kickstart -k gui/$(id -u)/com.echo.review-queue-codex` resolves the `com.echo.review-queue-codex` identifier from the plist's `<key>Label</key><string>...</string>`, not the filename. AC2 specifies the plist filename + intervals but not the Label. Without normative Label, install scripts can drift (duplicate labels or mismatched kickstart domain). Patch AC2 to require `<key>Label</key><string>com.echo.review-queue-codex</string>` as the FIRST entry in the plist's top-level dict. **Operator note: this is the second R2 combine.py classification anomaly — Cursor's #1 was dropped entirely. Worth filing a `combine.py` reviewer-finding-enumeration follow-up after 041 ships, but for now the strategist's manual read is the safety net.** |

## Convergence call

**needs R3 — focus_hints**: Verify (a) AC1 `set -euo pipefail` + one-line stderr preamble on `cd` failure naming `ECHO_REVIEW_QUEUE_REPO_ROOT` and its value; (b) AC5 uses `git init -b main` (with fall-through for older git); same for `git init --bare -b main` on `$SMOKE_ORIGIN`; (c) AC5 sanity assertions are local-and-deterministic — smoke repo's `origin` URL = `$SMOKE_ORIGIN`, no other remotes, prod GitHub URL absent from `$SMOKE_WORK/.git/config`; production-origin delta is advisory; (d) AC2 plist `Label` is explicit + normative; (e) Implementation hint added re reviewer-prompt-path-grep when shrinking AC5 copy-set. Five patches; one folded duplicate (D3 ↔ C1); one combine.py-missed finding manually surfaced (Cursor L1). R2→R3 decay: 6 (incl. missing) findings → 5 spec patches. Trending toward convergence.

