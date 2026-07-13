# Phase 3 GitHub security remediation

**Date:** 2026-07-12 PDT
**Founder authority:** “proceed with phase 3”
**Executor:** Codex security executor
**Repository baseline:** `zhenye0616/ECHO` at `main` SHA `f77ba415fd6848fbb52586dc0ca4ada522097bac`
**Readiness branch input:** `maint/clarity-phase2` at `a2c53cb924b048bef29726a37ccb6d0e17b45346`
**Gate state:** G1 closed; G2 open; product maturity DEV

## Authority and boundary

The founder's instruction authorizes Phase 3 security remediation and branch readiness. It does not authorize a `main` update, lift G2, create product specs, change product maturity, or begin product code. Repository settings were changed only where the control was reversible and the existing founder account retained an auditable bypass or approval path.

## Live controls applied

| Control | Result | Durable evidence |
|---|---|---|
| Native secret scanning | enabled | Repository `security_and_analysis.secret_scanning=enabled`; zero open secret alerts at the 2026-07-12 readback |
| Secret push protection | enabled | `security_and_analysis.secret_scanning_push_protection=enabled` |
| Dependabot alerts and fixes | enabled | Vulnerability alerts, security updates, and automated security fixes enabled |
| Private vulnerability reporting | enabled | GitHub private-reporting endpoint accepted and read back the setting |
| CodeQL default setup | enabled | JavaScript/TypeScript plus Actions analysis; [initial run 29209675017](https://github.com/zhenye0616/ECHO/actions/runs/29209675017) completed successfully at exact `main` SHA `f77ba415` |
| Main ruleset | active | `Protect main`, ruleset `18842228`: PR-only, merge commits only, review threads resolved, no deletion, no non-fast-forward update; founder user `73834646` is an explicit bypass actor |
| Release-tag ruleset | active | `Protect release tags`, ruleset `18842230`: `refs/tags/v*`, no deletion or non-fast-forward update; founder is an explicit bypass actor |
| Production environment | protected | Required reviewer `zhenye0616`; release publish job is routed through `environment: production` on this branch; admin bypass remains available |
| Immutable releases | enabled | Repository immutable-releases setting enabled for future release behavior |

GitHub's non-provider secret patterns and validity checks remained disabled after explicit enable attempts. Treat them as unavailable on the current repository/account plan until GitHub exposes the controls; native provider secret scanning and push protection are active. This is a recorded residual, not a green claim.

## Branch controls prepared

- Every external action reference in `ci.yml`, `release.yml`, and `secret-scan.yml` is pinned to a full immutable commit SHA. The selected current release pins are checkout `v7.0.0` at `9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0`, setup-node `v6.4.0` at `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e`, upload-artifact `v7.0.1` at `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`, and download-artifact `v8.0.1` at `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c`.
- The four pin mappings were dereferenced directly from the official action repositories through GitHub's `git/ref/tags/<tag>` API on 2026-07-12. Each ref returned a commit object at exactly the SHA recorded above; none was an unresolved or annotated-tag indirection. Recheck these upstream refs before deliberately upgrading a pin, while the committed SHA remains the execution authority.
- `ci.yml` now grants only `contents: read` to its workflow token. The initial CodeQL run's two medium `actions/missing-workflow-permissions` findings point at the pre-remediation `main` copy and can close only after the branch lands and CodeQL analyzes the landed SHA.
- A focused workflow-security test rejects floating external action references and requires the release publish job to use the protected production environment.
- Root dependency remediation pins Vitest `3.2.6` and resolves Vite/Hono transitives; the overlay resolves Vite `7.3.6` plus the affected esbuild/js-yaml chain. Both lockfiles report zero `npm audit` vulnerabilities locally. Vitest 3 compatibility is isolated to test timeouts and single-thread orchestration execution; application source was not changed.

Repository-wide `sha_pinning_required` remains false and `allowed_actions` remains `all` until the pinned workflow files land. Enabling enforcement first would reject the floating action tags still present on `main`. Required status-check contexts are also deferred until landed runs establish the exact stable check names. These are ordered post-landing steps, not abandoned controls.

## Newly exposed CodeQL gate

The successful initial default-setup run produced 79 open alerts on the unchanged `main` source:

| Severity | Rule | Count | Phase 3 disposition |
|---|---|---:|---|
| critical | `js/command-line-injection` | 3 | Founder/security triage required; no source fix during the clarity halt |
| high | `js/path-injection` | 68 | Group by trust boundary and disposition before G1 closes |
| high | `js/incomplete-url-substring-sanitization` | 3 | Security triage required |
| high | `js/incomplete-sanitization` | 1 | Security triage required |
| high | `js/sql-injection` | 1 | Security triage required |
| medium | `actions/missing-workflow-permissions` | 2 | Remediated on this branch; verify at the landed SHA |
| medium | `js/unnecessary-use-of-cat` | 1 | Non-blocking hygiene finding; disposition with the batch |

The three critical alerts are at `src/mcp/tools/coord-invoke.ts`, `src/echo-home/wizard/probe.ts`, and `src/echo-home/adapters/claude-code-mcp.ts`. The SQL alert is at `src/storage/migrate.ts`. Counts are scanner findings, not confirmed vulnerabilities; each requires reachable-input and trust-boundary review.

**Superseding readback 2026-07-12:** the founder approved the per-alert terminal table in `2026-07-12-codeql-terminal-disposition-table.md`, including narrow source fixes for alerts `3-8`, `10`, and PR-only `80`. Fix commit `3c69f815` passed [CodeQL run 29213440261](https://github.com/zhenye0616/ECHO/actions/runs/29213440261) with zero open PR-ref alerts. GitHub now records 58 false-positive, 8 test-only, and 4 won't-fix dismissals with boundary-specific comments. Exactly `1-8` and `10` remain open, all on unchanged `main`; they require natural closure in the first post-land analysis. This authorization is specific to the recorded fixes and does not lift G2 or authorize broader product work.

## Verification completed on the readiness branch

- Full product suite at exact Vitest `3.2.6`: 181 files passed, 1 skipped; 1,867 tests passed, 21 skipped, 1 todo.
- Full orchestration suite at exact Vitest `3.2.6`: 30 files / 269 tests passed without worker or unhandled errors.
- Overlay: 6 files / 21 tests passed; typecheck, lint, and production web build passed.
- Root and overlay `npm audit`: zero known vulnerabilities after the lockfile updates.
- CodeQL initial setup run: completed successfully for JavaScript/TypeScript and Actions at `f77ba415`.
- Root typecheck, lint, CLI build, package dry-run, skill-sync check, YAML parse, and diff check passed.
- Independent review at `91e8c31b` returned READY with no unresolved medium-or-higher findings.
- Founder-approved CodeQL fix tip `3c69f815`: 7 focused files / 57 tests; root typecheck and lint; product 1,888 passed; orchestration 269 passed; full-history secret scan clean across 4,517 commits, including binary and printable-string scans.

## First remote PR run

Draft PR [#8](https://github.com/zhenye0616/ECHO/pull/8) ran at exact head `91e8c31bb69e41953dc755e059e5b27153902809`.

- Both branch/PR full-history secret scans passed.
- CodeQL Actions and JavaScript/TypeScript analysis passed. The workflow-permission remediation is present at the PR head; alert closure still requires landed analysis.
- The release package built and uploaded/downloaded successfully with the new action majors, so the immutable action pins and artifact transport are remotely exercised.
- All four quality jobs failed on one cross-Git-version fixture assertion: hosted Git rendered the same UTC `%cI` instant as `Z` while the checked-in baseline spells it `+00:00`; cleanup then hit a short-lived `ENOTEMPTY` race. A test-only follow-up canonicalizes the timestamp instant and adds bounded cleanup retries. No application source changed.
- Ubuntu onboarding passed on Node 22 and 24. macOS Node 24 passed; macOS Node 22 failed once because selftest's daemon restart saw its own PID lock and timed out. Both Windows onboarding jobs failed in the existing fs-event path.
- Release validation remained red on Ubuntu/Windows and slow on macOS. The Ubuntu installed-package doctor loop cannot reach exit 0 because the package omits `tools/install-echo-codex-skills.sh`, so doctor reports a Codex-adapter check error even when MCP is reachable. Windows also hit the existing fs-event assertion.

The non-quality failures are product runtime/package behavior, not action-pin transport failures. Comparable `ci` and `release` runs were already failing on the unchanged `main` history, including `ci` run `29177757205` at exact baseline SHA `f77ba415` and multiple pre-Phase-3 release runs. The clarity halt forbids repairing those source/package defects here. They require a founder disposition: either keep R3 blocked until post-G2 product work fixes them, or explicitly classify the inherited red checks as deferred-with-owner-and-trigger for this security-only landing. Do not make that choice implicitly.

The test-only follow-up at `6751c5f8` cleared both Ubuntu quality jobs. One macOS quality job still failed because the 30-45 second real-doctor fixture produced empty output while the full product suite ran other process-heavy files concurrently; the repaired Git fixture itself passed. The final test-runner follow-up sets `fileParallelism: false` only in `vitest.product.config.ts`. The full local product suite then passed 181 files / 1,867 tests in 328 seconds, including the real doctor test in 29 seconds. This trades CI duration for deterministic resource isolation and does not change application source or runtime behavior.

The serialized remote rerun cleared Ubuntu Node 24 quality. Ubuntu Node 22 completed all packaged-daemon assertions but teardown raced the daemon's final filesystem-handle release and raised `ENOTEMPTY` while removing its temporary `echo-data` directory. The final test-only cleanup follow-up adds bounded `rmSync` retries to that fixture; two consecutive focused local packaged-boot runs passed. Durable cleanup failures still surface.

The later founder-approved CodeQL fix head `3c69f815` triggered a new PR analysis. Both CodeQL jobs passed and the exact PR ref has zero open alerts. Alert `80` is fixed. The nine fixed baseline alerts remain visible only because `main` is still `f77ba415`; no dismissal was used to hide them.

## Remaining ordered gates

1. Finish local verification and independent review at the exact candidate tip.
2. Push only `maint/clarity-phase2`; require green secret scan and CodeQL readback, rerun the quality matrix after the test-only portability fix, and preserve the inherited onboarding/release failures for explicit founder disposition.
3. Obtain an explicit founder checkpoint before updating `main`.
4. At the landed SHA, require the first green `main` secret-scan run and CodeQL run; verify the two workflow-permission alerts close.
5. Enable repository SHA-pin enforcement and, if the required GitHub-owned actions are compatible, restrict allowed actions. Then rerun the settings audit.
6. Add required status-check contexts to ruleset `18842228` from the stable landed check names.
7. **Completed pre-land:** all 77 non-workflow alerts have founder-approved terminal dispositions; verify the nine fix-designated baseline alerts close naturally after landing and retain the 70 evidence comments.

Any future action-pin upgrade must repeat the official-repository tag-ref dereference and record the resulting commit SHA before changing a workflow.

## Final G1 readback

PR #8 landed at `cddc127c`; PR #9 landed the final command-spawn fixes at security evidence SHA `48ed4f87`. Post-land CodeQL run `29222882099` and secret-scan run `29222882305` passed. Alerts `7-8` closed naturally, all other fix-designated alerts were already fixed, 70 evidence-specific dismissals remain intact, and GitHub reports zero open CodeQL alerts.

Repository SHA-pin enforcement and GitHub-owned-only action restriction are enabled. Main ruleset `18842228` now requires the stable green CodeQL, Gitleaks, package-build, Ubuntu quality, and Ubuntu onboarding contexts with strict head freshness. Dependabot alert `15` is terminally dismissed as tolerable risk for the non-client internal Fleet overlay, with an explicit reopen-before-reactivation/packaging/distribution trigger. Exact closure evidence is in `2026-07-12-g1-exposure-baseline-closure.md`.

G1 is closed. G2 remains open independently; product maturity remains DEV.
