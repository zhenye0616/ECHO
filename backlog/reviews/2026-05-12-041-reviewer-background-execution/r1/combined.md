---
item_id: 2026-05-12-041-reviewer-background-execution
round: 1
combined_at: '2026-05-12T21:30:27Z'
codex_response: codex.md
cursor_response: cursor.md
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | both (convergent on `AC1 hardcoded production repo path vs AC5 synthetic smoke isolation`) | AC1 hardcoded production repo path vs AC5 synthetic smoke isolation | **accept — patch AC1 + AC5 (load-bearing)** | AC1 hardcodes `~/Desktop/Project_echo` and the production `codex exec -C` path; AC5 requires running against tmpdir. As written, a copied repo with `.git` could push synthetic smoke artifacts to the real origin; without `.git` would fail commit. Patch AC1 to make the working repo configurable via env var `ECHO_REVIEW_QUEUE_REPO_ROOT` (default `$HOME/Desktop/Project_echo`); launchd plist omits the env so production behavior unchanged; smoke tests set it to a tmpdir. Patch AC5 to spec an isolated tmp git repo with a **local bare origin** (`git init --bare` in a tmpdir; set as the smoke repo's `origin` remote) so push completes without touching the real GitHub origin. |
| 2 | MEDIUM | both (convergent on `AC1 and AC5 repo-root contract`) | AC1 and AC5 repo-root contract | **accept — same patch as C1; env var normative in AC1** | Folded with C1 — same root cause. The env-var contract is documented in AC1 (variable name, default, launchd-omits-it semantics, wrapper-uses-it semantics); AC5 just consumes it. One patch, two convergent rows. **Plus: also covers Cursor's M2 finding** ("AC5 synthetic item_id whitelist undefined") — combine.py folded that finding into this row's match-key; my patch pins the synthetic ID (`2026-05-12-999-smoke-test-synthetic`) explicitly in AC5 so smoke is deterministic. |

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC4 validation failure path | **accept — patch AC4 (load-bearing)** | Codex caught a real deadlock: AC4 says malformed `<reviewer>.md` stays at the canonical path; the reviewer prompt's polling step (`if [ -f "$dir/cursor.md" ]; then continue; fi`) **skips any round where the response file already exists** — so a failed-validation file blocks ALL future retries forever. Patch AC4 to move the invalid file aside as `<reviewer>.md.invalid.<ISO-ts>` after the validation failure + queue-errors append. Canonical filename is gone → next tick polls clean → reviewer regenerates → validation runs again. Closes the unattended-retry deadlock. |
| 2 | MEDIUM | codex | Test list: `npm test` expected pass count | **accept — patch test list (folded with row 6)** | Test list says "787 pass" while also saying `concurrency.test.ts:133` is known red and out-of-scope. Mutually exclusive. Replace the scalar with "+1 net vs pre-041 baseline (existing 46 review-queue tests + 1 new AC4 integration test = 47); `concurrency.test.ts:133` remains pre-existing red until the separate test-fix item lands; acceptance is focused review-queue suite passes + typecheck + lint, NOT full-suite green." |
| 3 | LOW | codex | AC2 launchd smoke wording | **accept — clarify AC2 wording** | `RunAtLoad: false` + "founder fires smoke via `launchctl load`" is contradictory: loading a plist with `RunAtLoad: false` does NOT trigger the job. Patch AC2 to say smoke is invoked via `launchctl kickstart -k gui/$(id -u)/com.echo.review-queue-codex` (explicit one-shot trigger) after `launchctl bootstrap gui/$(id -u) <plist>`. Bootstrap loads the plist; kickstart fires it once for smoke. |
| 4 | LOW | cursor | AC2 plist `StandardOutPath`/`StandardErrorPath` vs AC1 log-append requirement | **accept — plist streams → /dev/null** | AC2 plist routing stdout/stderr to the same log file AC1's wrapper already writes to → double-log risk (launchd prepends timestamps; wrapper has its own preamble). Patch AC2 to set plist `StandardOutPath` and `StandardErrorPath` to `/dev/null`. AC1 wrapper owns unified logging end-to-end. |
| 5 | LOW | cursor | AC2 normative text vs Implementation hints (bootstrap/bootout) | **accept — pull bootstrap/bootout into AC2** | The macOS Sonoma+ `launchctl bootstrap`/`bootout` requirement is in Implementation Hints but not AC2 itself — builder could ship `launchctl load`/`unload`-only and pass AC2 as written. Patch AC2 to make the version-gated pair normative: install script uses `bootstrap`; uninstall uses `bootout`; falls back to `load`/`unload` on macOS < Sonoma (detection via `sw_vers -productVersion`). |
| 6 | NIT | cursor | Test list — `npm test` numeric expectation (787) | **accept — folded with row 2** | Same as Codex M2; Cursor framed it as a code-rot concern ("hard-coded pass counts rot quickly"). My patch removes the scalar entirely, replacing with "+1 vs baseline" framing. Both reviewers' intents satisfied. |

## Convergence call

**needs R2 — focus_hints**: Verify (a) AC1's new `ECHO_REVIEW_QUEUE_REPO_ROOT` env var contract — normative variable name, default value, launchd-omits-it semantics, wrapper-derives-cwd-and-invocation; (b) AC5's isolated tmp git repo with local bare origin — no path through which smoke artifacts can reach the real GitHub origin; pinned synthetic item_id `2026-05-12-999-smoke-test-synthetic` for deterministic smoke; (c) AC4's invalid-file aside pattern — `<reviewer>.md.invalid.<ISO-ts>` rename on validation failure unblocks the next reviewer tick; (d) AC2 normative text now includes the macOS-version-gated `bootstrap`/`bootout` (with `load`/`unload` fallback) pair; smoke fires via `kickstart -k`; plist streams to `/dev/null` with AC1 wrapper owning unified logging; (e) Test list scalar removed, replaced with "+1 vs baseline + concurrency:133 pre-existing red" framing. Five load-bearing patches; one combine.py-fold-correction (C2b). R1→R2 decay: 8 (+1 folded) findings → 5 spec patches.

