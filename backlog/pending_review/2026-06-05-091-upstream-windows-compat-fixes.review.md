---
item_id: 2026-06-05-091-upstream-windows-compat-fixes
verdict: merge as-is
reviewed_at: 2026-06-05T21:55:00Z
test_counts: { passed: 1585, failed: 1 }
producer: review-pending-orchestrator
---

## Verdict
All six ACs are met with strong file:line evidence and zero drift (exactly the 15 declared `files_to_modify`). The four Windows-compat failure classes are upstreamed into `src/` correctly: F4 BOM reader strips only a leading U+FEFF then defers to `JSON.parse` (malformed still throws); the highest-risk R1 path compare is genuinely path-segment-aware (`C:\foobar` does NOT match `C:\foo`, `C:\foo\bar` does) with `coord:` logical prefixes left as plain `startsWith`; the R2 spawn resolver is provably pure (`deps`-only, no `process.*`) and shell-injection-safe (`cmd.exe /d /s /c` with discrete argv, `shell:false`); the macOS data-dir branch is byte-identical (no migration) and launchctl is gated on `darwin` across all three entry paths so win32 AND linux make zero launchctl calls and report a clean manual-daemon state. The echo-fix patcher is retired from the release path, and 090's quarantined windows-compat assertions are un-skipped and pass. Lint + typecheck clean.

The **only** full-suite failure is `tests/mcp/recent-calls-endpoint.test.ts` (15s timeout) — the documented pre-existing environmental flake: the file is untouched by 091, there is no `src/mcp/` diff, and it passes in isolation (~9.9s). It is NOT a 091 regression. `/merge-and-cleanup`'s post-merge verify (fresh-install worktree) will re-confirm; the merger run for 090 showed this class of flake does not recur outside the loaded full-suite run.

## Pre-merge fixups
- [ ] None — no blocking fixups. Mergeable as-is.

## Expected merge conflicts
- All 15 files — none. Main has had zero commits touching any of them since the branch merge-base; clean three-way merge.
- `tests/windows-compat.test.ts` — 091 coherently un-skips the exact `describe.skip`/`it.todo` rows 090 added (verified against main's merged copy); no collision.
- 092 (in `ready/`) — touches `.github/workflows/ci.yml`, `release.yml`, `tests/packaging/packed-manifest.test.ts`, `package.json` — disjoint from 091's 15 files. Sequential dependency only (092 flips the now-green windows-compat job to required). Merge 091 first, then 092.

## Follow-up items (defer, do not block merge)
- The `tests/mcp/recent-calls-endpoint.test.ts` full-suite flake is pre-existing and out of 091's scope — track as a separate friction item (sits alongside the `tests/cli/init.test.ts` flake filed at 090 merge; both are real-daemon/concurrency full-suite flakes that produce false-reds).
- Optional cleanup (non-AC): inject `platform`/`env` into `sources.ts:90 normalizePathForCompare` (mirroring the AC3 subprocess resolver seam) so the win32 case-fold branch is directly unit-testable on a POSIX host. AC2 did not require it (purity was only mandated for the spawn resolver).
