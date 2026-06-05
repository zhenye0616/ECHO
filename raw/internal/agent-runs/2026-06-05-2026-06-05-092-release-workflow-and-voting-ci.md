---
backlog_item: 2026-06-05-092-release-workflow-and-voting-ci
agent_run_started: 2026-06-05T22:00:46Z
agent_run_ended: 2026-06-05T22:23:31Z
status: needs_input
test_status: failing
---

# Agent Run: 092 — Release workflow + voting CI + packed manifest

## What I Implemented

Implemented the 092 release/CI work on `agent/release-workflow-and-voting-ci` at `0f392a3263b1109803b00190f5932b1e894aa903`, then stopped because the current installed-tarball `echoctl selftest --json` fails before this release workflow can safely become a required gate.

Implementation landed:
- Added `.github/workflows/release.yml` with build-once `npm pack`, uploaded tarball + SHA-256 checksum, OS-matrix validation that downloads and verifies the same artifact, and tag-only GitHub prerelease publishing with `contents: write` only on the publish job.
- Flipped `.github/workflows/ci.yml` onboarding from non-voting to voting by removing `continue-on-error: true`, and fixed its tarball-name extraction so lifecycle-script stdout does not poison the tarball path.
- Added `tests/packaging/packed-manifest.test.ts`, an inline snapshot of sorted `npm pack --dry-run --json` paths only.
- Set `package.json` version to `0.1.0-beta.1` so `v0.1.0-beta.1` can pass the workflow's tag/package identity gate. `package-lock.json` was intentionally not touched because it is not in `files_to_modify`; `npm ci --dry-run` still passes.

## Files Modified

- `.github/workflows/ci.yml` — modified, 68 lines
- `.github/workflows/release.yml` — created, 170 lines
- `package.json` — modified, 68 lines
- `tests/packaging/packed-manifest.test.ts` — created, 309 lines

Branch: `agent/release-workflow-and-voting-ci`

Head SHA: `0f392a3263b1109803b00190f5932b1e894aa903`

## Decisions Made During Implementation

### Stale spec_refs resolved by item id

- **Observed:** the item lists 090/091 under `backlog/proposed/`, but both had already moved to `backlog/complete/`.
- **Chose:** read `backlog/complete/2026-06-05-090-adopt-selftest-onboarding-harness.md` and `backlog/complete/2026-06-05-091-upstream-windows-compat-fixes.md` by item id.
- **Why:** the item itself says 091 must be complete before 092, and `tools/blocked.py` selected 092.
- **Worth founder review?** No, but noted for traceability.

### Package version without lockfile update

- **Observed:** `package-lock.json` records root version `0.1.0`, but package-lock is not in `files_to_modify`.
- **Chose:** update only `package.json` to `0.1.0-beta.1` and verify `npm ci --dry-run`.
- **Why:** the release workflow needs the package version to match `v0.1.0-beta.1`; modifying package-lock would violate the declared file list.
- **Worth founder review?** Yes, if the reviewer wants package-lock root version consistency as a required follow-up.

### Tarball name extraction

- **Observed:** `npm pack --silent` still prints `copy-sql-migrations` lifecycle output before the tarball filename.
- **Chose:** in both workflows, capture pack stdout and use the final line as the tarball name.
- **Why:** otherwise `packed/<tarball>` can include lifecycle log text and fail only in CI.
- **Worth founder review?** No; this directly protects 090/092's packed-artifact path.

## Acceptance Criteria Status

- **AC1 — tag-triggered build-once:** implemented in `release.yml`.
- **AC2 — validate exact artifact, then gated publish:** workflow implemented, but blocked because current installed-tarball `echoctl selftest --json` fails locally.
- **AC2b — runnable rehearsal:** implemented via `pull_request`, `push` to `agent/**`, and `workflow_dispatch`; publish is tag-only.
- **AC3 — onboarding CI blocking gate:** implemented by removing onboarding `continue-on-error`; no branch-protection changes attempted.
- **AC4 — packed manifest pinned:** implemented and focused test passes.
- **AC5 — tests + local rehearsal:** partial/failing. Static workflow checks, focused manifest test, typecheck, and lint pass. Full `npm test` has four existing/load-sensitive failures. Local installed-tarball release rehearsal fails on `echoctl selftest --json`.
- **AC6 — no drift:** upheld. No `src/`, wiki, docs, public distribution, telemetry, acceptance repo, or `files` allowlist edits.

## Tests Run

### `npx vitest run tests/packaging/packed-manifest.test.ts -u`

```text
✓ tests/packaging/packed-manifest.test.ts (1 test) 5321ms
Snapshots  1 written
Test Files  1 passed (1)
Tests  1 passed (1)
```

### `python3` static workflow check

```text
release/ci static wiring ok
```

Checked: `v*` tag trigger, `pull_request`, `workflow_dispatch`, build/validate/publish jobs, validate matrix `ubuntu-latest`/`macos-latest`/`windows-latest`, publish `needs: [build, validate]`, tag-only publish condition, read/write permissions split, exactly one `npm pack`, Node `crypto` checksum verifier, no `sha256sum`/`shasum`/`certutil`, prerelease publish, no CI `continue-on-error`.

### `npm ci --dry-run`

```text
up to date in 461ms
```

### `npx vitest run tests/packaging/packed-manifest.test.ts`

```text
✓ tests/packaging/packed-manifest.test.ts (1 test) 5233ms
Test Files  1 passed (1)
Tests  1 passed (1)
```

### Local installed-tarball release rehearsal

Command shape: `npm pack --pack-destination /private/tmp/...`, Node SHA-256 write+verify, `npm install -g --prefix /private/tmp/... <tarball>`, installed `echoctl --version`, installed `echoctl selftest --json`, then installed daemon + `echoctl doctor --json`.

```text
echoctl-0.1.0-beta.1.tgz 7805c77bcef4144ff4398d9dc8a3b212c4d20a9265bb567a944391e70ef4dfb2
checksum ok
0.1.0-beta.1
```

`echoctl selftest --json` then failed:

```json
{
  "failedIds": ["WIR-06", "SKILL-02", "DOC-02"],
  "passed": 17,
  "failed": 3,
  "skipped": 3
}
```

Relevant failed check details:

```text
WIR-06: Codex SKILL.md
SKILL-02: SKILL.md frontmatter
DOC-02: doctor: mcp reachable
```

### `npm run typecheck`

```text
> echoctl@0.1.0-beta.1 typecheck
> tsc --noEmit
```

Exit code: 0.

### `npm run lint`

```text
> echoctl@0.1.0-beta.1 lint
> eslint . --max-warnings 0 && npm run lint:task-state

> echoctl@0.1.0-beta.1 lint:task-state
> python3 tools/task-state/lint.py
```

Exit code: 0.

### `npm test`

```text
Test Files  4 failed | 147 passed | 1 skipped (152)
Tests  4 failed | 1583 passed | 21 skipped | 1 todo (1609)
Duration  218.92s
```

Failures:

```text
tests/backlog/run-codex-builder.test.ts
case 3 — atomic lockfile prevents overlapping wrapper invocations (race-free)
Error: Test timed out in 5000ms.

tests/coord/coord-volume-perf.test.ts
expected 315 to be less than 300

tests/mcp/recent-calls-endpoint.test.ts
logs every runtime-registered tool through the wrapper
Error: Test timed out in 15000ms.

tests/review-queue/056-claude-reviewer-onboarding.test.ts
056 AC9 — wrapper end-to-end with mock-claude > produces claude.md + commits via mock-claude
wrapper rc=null stderr=: expected null to be +0
```

## Open Questions for Founder

1. Should 092 remain blocked until a prerequisite fixes packaged `echoctl selftest --json` (`WIR-06`, `SKILL-02`, `DOC-02`) from the installed tarball, or should the release workflow temporarily run a narrower install/doctor gate instead of `selftest`?

## Drift Events Caught

- None. I did not modify `src/` to fix the selftest failure because `src/` is outside `files_to_modify` and AC6 explicitly forbids product drift beyond the release workflow, CI voting flip, manifest snapshot, and lifecycle metadata.

## Next Suggested Backlog Items (Don't Auto-Create)

- Fix installed-tarball `echoctl selftest --json` failures for Codex SKILL.md/frontmatter and the internal doctor reachability check, then re-run 092.
- Decide whether `package-lock.json` root version should be updated in the release-versioning spec when `package.json` moves to prerelease versions.
