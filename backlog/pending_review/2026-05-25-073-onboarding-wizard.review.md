---
item_id: 2026-05-25-073-onboarding-wizard
verdict: merge as-is
reviewed_at: 2026-05-26T04:53:06Z
test_counts: { passed: 1351, failed: 0, skipped: 21 }
---

## Verdict
Ground-truth SHA matches recorded `head_sha` (`896f89d9`). Full suite: 1351 passed / 0 failed / 21 skipped — exact match to agent's claim. Lint + typecheck clean. All 8 ACs met with file-level evidence; all 6 judgment calls (J1–J6) stand. Critical correctness check: the wizard goes through `openExistingAtomStoreReadOnly()` and never imports `SqliteStorage` in production code (the single test-fixture import at `tests/echo-home/wizard/detect-agents.test.ts:5` is spec-sanctioned for AC8.1 case 10). Per-agent JSON adapter cache (J5) and wizard-owned `onboarding.json` writes (J6) both confirmed. `git merge-tree` against current `origin/main` reports a clean merge — only the two daemon-refactor hunks (pure promotion of `resolveDbPath`); 072's adapter-sync surface is consumed (imported) by 073, not modified, so the feared collision does not materialize. No blocking fixups.

## Pre-merge fixups
- (none — founder may merge with `git merge --no-ff agent/onboarding-wizard`)

## Expected merge conflicts
- None predicted. `git merge-tree $(git merge-base origin/main agent/onboarding-wizard) origin/main agent/onboarding-wizard` reports zero conflict markers. The two daemon-refactor hunks (`src/daemon/index.ts`, `src/daemon/lifecycle.ts`) apply cleanly on top of post-072 main.

## Follow-up items (defer, do not block merge)
- R8 dogfooding trigger from spec: file a 075-class "claude-code MCP adapter" spec the first time a user hits `reason: 'mcp-not-configured'` in probe.
- Probe-stability hardening (V1.5+): arm a SIGKILL escalation in `probe.ts:realSpawn` after a grace period beyond `timeoutMs`. Today only SIGTERM is sent on timeout; a stubborn child that ignores SIGTERM would hang the promise.
- R5 follow-up trigger: if dogfooding surfaces concurrent-wizard-induced cache divergence, file the wizard-level mutex / `withLock(callback)` extension spec.
- Cosmetic — `authRequired` regex in `probe.ts:84-86` uses substring `auth`, so neutral strings like "author"/"authority" in stderr would mis-route to `auth-required`. Matches the literal AC6.3 spec ("case-insensitive substring auth/login/not authenticated"), so spec-faithful, but flag if dogfooding shows false-positives.
