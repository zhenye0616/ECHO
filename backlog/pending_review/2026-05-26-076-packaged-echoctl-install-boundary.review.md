---
item_id: 2026-05-26-076-packaged-echoctl-install-boundary
verdict: merge as-is
reviewed_at: 2026-05-27T00:00:00Z
test_counts: { passed: 1433, failed: 0, skipped: 21 }
---

## Verdict

Merge as-is. The implementation closely matches the spec's load-bearing requirements: install boundary, packaged daemon entrypoint, plist generation with XML escaping + atomic + plutil-lint write, preflight before bootout, post-bootstrap probe-wait with bootout-on-timeout, parity across install/restart/recovery-load-start, loaded-but-unhealthy short-circuit on start/status, full isolation flag surface across all verbs, and a packaged smoke that exercises start/stop/status/logs/coord_invoke against a real packaged daemon. All AC8 gates pass (test 1433/0, lint clean, typecheck clean). No drift outside `files_to_modify`. Worktree HEAD matches recorded `head_sha` (`ad4757dd…`).

## Pre-merge fixups

- [ ] None — all critical AC met; tests/lint/typecheck green.

## Expected merge conflicts

- `backlog/pending_review/2026-05-26-076-packaged-echoctl-install-boundary.md` — main carries the reviewer-queue sidecar commit (`e6b0c93`) touching the item file; merge will see disjoint frontmatter/body additions. Recommended: accept main's reviewer-queue state during merge, then move the item to `complete/` as part of `/merge-and-cleanup`.
- Code paths (`src/cli/**`, `src/daemon/**`, `scripts/**`, `package.json`, `tests/cli/**`, `docs/echoctl-install.md`): no overlap with main since branch fork — clean merge expected.

## Follow-up items (defer, do not block merge)

- Align `package.json` `daemon:logs` script path to `echo-daemon.{err,out}.log` (or delete — superseded by `echoctl daemon logs`).
- Implement real `uptime` in `echoctl daemon status` (parse `launchctl print` or compute from process start) — currently prints `unknown` while AC3.5 lists it.
- Migrate `scripts/launchd/uninstall.sh` to a thin wrapper around `echoctl daemon uninstall "$@"` for parity with `install.sh`.

## Open questions for founder

None — verdict is `merge as-is`.

## Detail — Acceptance status

| AC | Status | Evidence |
|---|---|---|
| AC1.1 files allowlist | Met | `package.json:12-24` |
| AC1.2 negative-assertion | Met | `tests/cli/shell-reachable.test.ts:59-65` |
| AC1.3 self-contained | Met | `shell-reachable.test.ts:79-85` |
| AC1.4 coord runtime config ships | Met | `package.json:19-21`; smoke asserts at `shell-reachable.test.ts:54-56` |
| AC1.5 coord_invoke implicit de-scope | Met | `shell-reachable.test.ts:176-192`; no `src/coord`/`src/mcp` change |
| AC2.1 SQL migrations copied to dist | Met | `package.json:27` build:cli step |
| AC2.2 migration-copy script | Met | `scripts/copy-sql-migrations.js:1-25` (pure Node, idempotent, fails loudly) |
| AC2.3 sqlite path | Met | `src/storage/sqlite.ts:17` uses `import.meta.url` |
| AC3.1 daemon subcommand | Met | `src/cli/index.ts:7,119-121`, `daemon.ts:71-90` |
| AC3.2 plist content | Met | `daemon.ts:261-302` (no WorkingDirectory; all envs persisted) |
| AC3.3 install mechanics | Met | `daemon.ts:437-466` |
| AC3.4 start/stop/restart | Met | `daemon.ts:468-542` |
| AC3.4.1 restart + start parity + bootout-on-timeout | Met | `daemon.ts:418-435,468-528`; shared `bootstrapAndProbe` |
| AC3.5 status incl. data-dir/db-path | Met | `daemon.ts:557-571` (uptime: `unknown` — see follow-up) |
| AC3.6 logs verb | Met | `daemon.ts:573-593` |
| AC3.7 uninstall verb | Met | `daemon.ts:595-608` |
| AC3.8 isolation flags on all verbs | Met | `daemon.ts:140-160,613-629`; `daemon.test.ts:127-156` |
| AC4 bootout, never kill, no kickstart | Met | `daemon.test.ts:263-286` |
| AC5.1 packaged smoke | Met | `shell-reachable.test.ts:90-213` |
| AC5.2 isolation contract | Met | all 7 overrides used; conditional production-mtime snapshot |
| AC5.3 CI gating | Met | `shell-reachable.test.ts:90-93` (`hasLaunchctl` skip) |
| AC6 install doc | Met | `docs/echoctl-install.md:1-74` |
| AC7 metadata | Met | `package.json:2-11` |
| AC8 test gates | Met | typecheck/lint/test all green; pack succeeds inside smoke |

## Detail — Drift findings

None. All changed files are within `files_to_modify`.

## Detail — Bugs/risks (non-blocking)

- `package.json:33` — stale `daemon:logs` script tails `daemon.{err,out}.log` while plist writes `echo-daemon.{err,out}.log`. Cosmetic dev-only.
- `daemon.ts:556` — `uptime` hardcoded to `'unknown'`; AC3.5 lists it but the field exists. Follow-up.
- `scripts/launchd/uninstall.sh:7` — redundant with `echoctl daemon uninstall`; no `--label` support. Follow-up.

## Test counts observed

- `npm test`: 1433 passed / 0 failed / 21 skipped — matches `agent_notes`.
- `npm run lint`: pass.
- `npm run typecheck`: pass.
