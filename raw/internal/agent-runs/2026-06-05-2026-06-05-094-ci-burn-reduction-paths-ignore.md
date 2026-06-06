---
backlog_item: 2026-06-05-094-ci-burn-reduction-paths-ignore
agent_run_started: 2026-06-06T00:56:52Z
agent_run_ended: 2026-06-06T01:06:40Z
status: needs_input
test_status: failing
branch: agent/ci-burn-reduction-paths-ignore
head_sha: 0ee083c36e0a608cf14c76c9be61b64e30212604
---

# Agent Run: 094 CI Burn Reduction Paths Ignore

## What I Implemented

Implemented the trigger-only `paths-ignore` change requested by the spec.

- Added the bookkeeping ignore list to `.github/workflows/ci.yml` for `push` to `main` and `pull_request`.
- Added the same ignore list to `.github/workflows/release.yml` for `agent/**` rehearsal pushes and `pull_request`.
- Left `workflow_dispatch`, all jobs, all steps, all matrices, and the `publish` tag gate unchanged.
- Verified AC3 against GitHub's workflow syntax docs: path filters are not evaluated for tag pushes, so `v*` tag pushes remain unfiltered without the sanctioned job-level exception.

## Files Modified

Branch: `agent/ci-burn-reduction-paths-ignore`
Head SHA: `0ee083c36e0a608cf14c76c9be61b64e30212604`

- `.github/workflows/ci.yml` - added `paths-ignore` under `on.push` and `on.pull_request`.
- `.github/workflows/release.yml` - added `paths-ignore` under `on.push` and `on.pull_request`.

## Decisions Made During Implementation

- Used one `paths-ignore` list under the existing `release.yml` `on.push` block rather than restructuring triggers. GitHub's official workflow syntax says path filters are not evaluated for tag pushes, so the existing `tags: ['v*']` path remains unconditional for AC3.
- Did not add an aggregate gate, branch-protection checks, workflow job guards, matrix changes, or release job edits. Those are outside AC5.
- During implementation, an initial manual patch landed in the main checkout because `apply_patch` has no workdir parameter. I applied the same patch to the feature worktree by absolute path and restored only my accidental main-checkout workflow edits before continuing.

## Acceptance Criteria Status

- [x] AC1 - `ci.yml` `push` and `pull_request` now have the requested bookkeeping `paths-ignore`; `workflow_dispatch` is unchanged.
- [x] AC2 - `release.yml` `agent/**` push rehearsal and `pull_request` now have the same `paths-ignore`; `workflow_dispatch` is unchanged.
- [x] AC2b - No branch-protection or required-check verification was added; this is spec-recorded only.
- [x] AC3 - GitHub docs verify path filters are not evaluated for tag pushes, so `v*` tag pushes remain unfiltered.
- [ ] AC4 - Static workflow assertions passed and the focused timeout test passed, but full `npm test` failed twice on `tests/mcp/recent-calls-endpoint.test.ts` timing out at 15s. Stopped before `npm run lint` and `npm run typecheck` per the stopping condition.
- [x] AC5 - Feature branch touches only the two workflow trigger blocks.

## Test Results

Dependency install:

```text
> npm ci
npm warn deprecated prebuild-install@7.1.3: No longer maintained. Please contact the author of the relevant native addon; alternatives are available.

added 283 packages, and audited 284 packages in 3s

92 packages are looking for funding
  run `npm fund` for details

5 vulnerabilities (4 moderate, 1 critical)
```

Static workflow check:

```text
workflow static assertions passed; actionlint unavailable; GitHub docs: path filters are not evaluated for tag pushes, so v* tag pushes remain unfiltered.
```

First full `npm test` attempt:

```text
FAIL  tests/mcp/recent-calls-endpoint.test.ts > GET /mcp/recent-calls > logs every runtime-registered tool through the wrapper
Error: Test timed out in 15000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".

Test Files  1 failed | 150 passed | 1 skipped (152)
Tests  1 failed | 1591 passed | 21 skipped | 1 todo (1614)
Start at  18:01:01
Duration  114.15s
```

Focused retry:

```text
> npx vitest run tests/mcp/recent-calls-endpoint.test.ts

RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--ci-burn-reduction-paths-ignore

✓ tests/mcp/recent-calls-endpoint.test.ts (2 tests) 7846ms
  ✓ GET /mcp/recent-calls > logs every runtime-registered tool through the wrapper 7837ms

Test Files  1 passed (1)
Tests  2 passed (2)
Start at  18:03:12
Duration  9.04s
```

Second full `npm test` attempt:

```text
FAIL  tests/mcp/recent-calls-endpoint.test.ts > GET /mcp/recent-calls > logs every runtime-registered tool through the wrapper
Error: Test timed out in 15000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".

Test Files  1 failed | 150 passed | 1 skipped (152)
Tests  1 failed | 1591 passed | 21 skipped | 1 todo (1614)
Start at  18:03:33
Duration  113.27s
```

Not run because the second full-suite attempt hit the same timeout stop condition:

```text
npm run lint
npm run typecheck
```

## Open Questions for Founder

The workflow implementation is complete, but should 094 proceed to review despite the repeated full-suite timeout on `tests/mcp/recent-calls-endpoint.test.ts` when the focused test passes, or should a separate flake-fix item run before this CI-burn patch is reviewed?

## Drift Events Caught

None. I did not change jobs, steps, matrices, permissions, branch-protection state, billing settings, repo visibility, or bookkeeping branch design.

## Next Suggested Backlog Items

- If the founder treats this as blocking, create a focused flake item for `tests/mcp/recent-calls-endpoint.test.ts` timing out only during the full suite.
