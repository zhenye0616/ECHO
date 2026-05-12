---
item_id: 2026-05-12-041-reviewer-background-execution
round: 2
reviewer: cursor
artifact_sha: 59bcdc1c8b9c1e35607f0387c7489afbae52a5ea
completed_at: '2026-05-12T23:15:00Z'
verdict: proceed
findings:
  - severity: low
    where: AC2 — LaunchAgents `Label` vs `launchctl kickstart` target
    finding: "Smoke trigger names `launchctl kickstart -k gui/$(id -u)/com.echo.review-queue-codex`. launchd resolves that identifier from the plist's `Label` string, not only the filename. AC2 is explicit about the plist path and intervals but does not normatively state `<key>Label</key><string>com.echo.review-queue-codex</string>`. Recommend one explicit bullet so install scripts cannot drift (duplicate labels or mismatched kickstart domain)."
  - severity: low
    where: AC1 — missing or non-repo `ECHO_REVIEW_QUEUE_REPO_ROOT`
    finding: "`cd \"$ECHO_REVIEW_QUEUE_REPO_ROOT\"` with `set -e` already aborts before `codex exec`, but unattended launchd ticks deserve a one-line stderr preamble (e.g., 'ECHO_REVIEW_QUEUE_REPO_ROOT is missing or not a directory: …') so status tail && queue-errors triage distinguish env/path misconfig from Codex failures."
  - severity: nit
    where: AC5 minimal copy-set vs reviewer prompt reachability
    finding: "AC5 allows copying a minimal subset of the tree for speed; if the slash-command or reviewer helper references paths outside that subset, smoke may fail opaquely or pass without covering real prompts. Acceptable builder judgment — optional hint to grep reviewer markdown for path references when shrinking the copy list."
---

# Reviewer notes (R2 @ `59bcdc1`)

## ECHO hydrate (strategist)

- **`echo_resolve_mru`** (`claude_code`, `repo_path: /Users/zhenye/Desktop/Project_echo`) → same MRU JSONL as prior rounds.
- **`search_memories`** (`limit: 8`, no query) → newest turn includes R1 combine disposition, AC4 rename-aside for validation failures, R2 poll armed — consistent with `r1/combined.md` and `r2/request.md`.

## Verification vs R1 patches

| Patch theme | R2 check |
|-------------|----------|
| **AC1 `ECHO_REVIEW_QUEUE_REPO_ROOT`** | Normative name, default `$HOME/Desktop/Project_echo`, launchd omits, preamble logs value; `codex exec -C` and stdin path both rooted in the same var — closes R1 AC1↔AC5 fork. |
| **AC2 plist I/O** | `StandardOutPath`/`StandardErrorPath` → `/dev/null`; bootstrap/bootout vs load/unload version-gated in AC body; `--smoke` uses `kickstart -k` after bootstrap — fixes RunAtLoad:false contradiction. |
| **AC4 unattended retry** | Validation failure → `mv` to `<path>.invalid.<ISO-ts>` + `queue-errors.md` row — removes stale canonical file so polling can regenerate; addresses Codex H1. |
| **AC5 isolation** | Tmp work + bare `origin`, pinned `2026-05-12-999-smoke-test-synthetic`, stub ready item for `find_artifact()`, production-repo sanity assertion — convergent H2/M1/M2 resolved. |
| **Test list** | Scalar removed; focused review-queue acceptance + concurrency:133 explicitly out of band — matches Codex/Cursor R1. |

## Second-order checks (from `r2/request.md`)

- **`push-with-retry.sh` vs bare origin:** Helper always does `git pull --rebase origin main && git push origin main`. AC5 builds `origin` as the local bare repo and seeds `main`; retries stay on-disk — no path to GitHub. Real-origin check is correctly scoped to the **production** clone assertion.
- **AC4 rename atomicity:** Same-filesystem `mv` avoids a window with two canonical filenames; validator refuses before any git state change.

## Convergence

**`proceed`** — R1 load-bearing patches are present and internally consistent; remaining notes are documentation/tightening for implementers, not spec-blocking gaps.
