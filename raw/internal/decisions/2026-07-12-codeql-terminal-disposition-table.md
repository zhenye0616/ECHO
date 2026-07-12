# CodeQL terminal disposition table - PR #8 founder checkpoint

**Prepared:** 2026-07-12 16:01 PDT
**Repository:** `zhenye0616/ECHO`
**PR:** `#8` - Phase 3 security and landing readiness
**Exact PR head:** `5df97a26932f971b52e4a5f2d4c23ac4ae07b05e`
**Base:** `main` at `f77ba415fd6848fbb52586dc0ca4ada522097bac`
**Status:** founder approved on 2026-07-12; fix execution in progress
**Mode:** the founder approved the terminal table before implementation; alert dismissals remain gated on a clean PR-ref CodeQL analysis

## Plain-English result

The 79 open alerts are the baseline scan of `main`, not 79 findings introduced by PR #8. All 79 most-recent instances point to `refs/heads/main` at `f77ba415`. CodeQL also analyzed exact PR head `5df97a26`; GitHub reports only one PR-ref alert, number 80, for an unnecessary `cat` process in a new test.

"CodeQL passed" means both analyses completed successfully. It does not mean the 79 baseline alerts were cleared.

The terminal plan is:

| Terminal action | Baseline alerts | Count | PR-only alerts | Rationale |
|---|---|---:|---|---|
| Fix and verify before merge | `1-8`, `10` | 9 | `80` | Two already fixed workflow-permission alerts; real correctness/hardening issues; trivial test portability fixes |
| Dismiss as false positive with evidence | `9`, `11`, `14-69` | 58 | - | Validated wrapper execution, repository-owned migrations, and intentional local-operator path contracts |
| Dismiss as used in tests | `70-77` | 8 | - | Temporary paths are created and controlled entirely by tests |
| Dismiss as won't-fix outside shipped boundary | `12-13`, `78-79` | 4 | - | Raw prototype and developer-only tools; reconsider if promoted into the client product |
| **Total** |  | **79** | **1** | Every visible alert is covered exactly once |

## Per-alert disposition groups

### D1 - workflow permissions: fixed in PR

| Alerts | Rule | Disposition | Evidence / completion condition |
|---|---|---|---|
| `1-2` | `actions/missing-workflow-permissions` | `FIX` | PR #8 adds root `permissions: contents: read` to `ci.yml`; the PR-ref Actions analysis no longer reports these alerts. Close only after post-merge `main` CodeQL confirms them fixed. |

### D2 - actual correctness and hardening fixes

| Alerts | Rule / path | Disposition | Required fix |
|---|---|---|---|
| `3` | incomplete sanitization - `tools/validate-resolution.ts` | `FIX` | Escape backslashes before Markdown pipes/newlines and add repeated-backslash/pipe/newline tests. This is a real output-correctness issue, not SQL or shell injection. |
| `4-6` | incomplete URL host check - `src/normalize/artifacts.ts` | `FIX` | Parse the URL/SSH host structurally and match exact allowlisted hosts or explicit subdomains. Current `endsWith('github.com')` shape can misclassify `evilgithub.com`; impact is provider classification, not redirect/SSRF. |
| `7-8` | command-line injection - Claude registration / agent probe | `FIX` | Replace generic string command inputs with runtime-validated executable enums/constants; validate the MCP URL; harden Windows `.cmd` dispatch against shell metacharacters; retain argv-based spawning and add Windows injection controls. Critical severity warrants code evidence rather than dismissal. |
| `10` | unnecessary `cat` - existing review-queue test | `FIX` | Replace the child `cat` invocation with `readFileSync`; behavior is test-only and the fix improves Windows portability. |
| `80` | unnecessary `cat` - new secret-scan test | `FIX` | Replace `spawnSync('cat', ...)` with `readFileSync`; rerun focused tests and PR CodeQL. This is the only alert currently reported on the PR ref. |

### D3 - command/SQL false positives

| Alerts | Rule / path | Disposition | Evidence to place in the GitHub dismissal comment |
|---|---|---|---|
| `9` | command-line injection - `src/mcp/tools/coord-invoke.ts` | `DISMISS_FALSE_POSITIVE` | `role` is roster-validated; `resolveReviewerWrapperPath` applies shape, construction, realpath containment, existence, and executable gates; spawn uses the validated path with zero arguments and `shell:false`. Request data is passed only through environment variables after separate validation. |
| `11` | SQL injection - `src/storage/migrate.ts` | `DISMISS_FALSE_POSITIVE` | Executing migration SQL is the function's purpose. SQL comes only from repository/package migration files whose names match `^\\d{4}_[A-Za-z0-9_-]+\\.sql$`; version is parsed as an integer. No request/client value reaches `db.exec`. |

### D4 - intentional local path contracts

Alerts `14-69` are all `js/path-injection`. CodeQL correctly sees parameterized paths, but the inspected call chains do not cross a remote-attacker or privilege boundary. ECHO runs as the same local OS user who supplies these paths. The path is the intended resource, not a filename derived from Slack or meeting text.

| Alerts | Boundary | Disposition evidence |
|---|---|---|
| `14-25` | Brain cwd, workspace discovery, daemon/doctor/db/log/pid paths | CLI options, environment, captured local cwd, package paths, or process-owned data directories; operations are the explicit local-runtime contract. Workspace discovery is read-only. |
| `26-47` | ECHO_HOME adapter/config/marker/skill paths | User-selected local configuration paths. Atomic writes reject symlinks by default; explicitly followed same-user config symlinks are resolved before temp-plus-rename. Writes preserve modes and lock secret files to `0600`. |
| `48-54` | MCP shutdown log, validated reviewer cwd, git repo root, SQLite path | Shutdown log and database locations are operator configuration; Git cwd is the caller-selected repository for read-only plumbing; alert `52` uses the constant repository root after wrapper validation. |
| `55-69` | Slack responder draft/log stores | File paths come from startup environment/configuration. Slack/client values are serialized as file content and never become the destination path. The process has no higher privilege than the configuring user. |

**Terminal disposition for `14-69`:** `DISMISS_FALSE_POSITIVE`, with the boundary-specific comment above. Trigger a new review if any of these APIs becomes reachable from an untrusted remote path input, runs with elevated privileges, or is promoted into the client product with a different trust boundary.

### D5 - test-only paths

| Alerts | Paths | Disposition | Evidence |
|---|---|---|---|
| `70-75` | `tests/cli/shell-reachable.test.ts` | `DISMISS_USED_IN_TESTS` | Test-created package/temp paths; no production call path. |
| `76-77` | `tests/tools/loop-dashboard.test.ts` | `DISMISS_USED_IN_TESTS` | Test-owned temporary paths; no production call path. |

### D6 - non-shipped prototype and developer tools

| Alerts | Paths | Disposition | Owner and trigger |
|---|---|---|---|
| `12-13` | `raw/internal/prototypes/brief-now-prototype.mjs` | `DISMISS_WONT_FIX` | Strategist owns reconsideration if the prototype is promoted, packaged, or used with client data. It is not part of the shipped package. |
| `78-79` | `tools/loop-dashboard.ts`, `tools/trace-card.ts` | `DISMISS_WONT_FIX` | Developer-tool owner reopens if either tool enters the client package, runs with elevated privilege, or accepts remote path inputs. Current paths are local operator inputs. |

## Severity accounting

The 79 baseline alerts comprise:

| Security severity | Count | Terminal plan |
|---|---:|---|
| Critical | 3 | Fix `7-8`; evidence-backed false-positive dismissal for `9` |
| High | 73 | Fix `3-6`; dismiss `11-79` only under the exact grouped evidence above |
| Medium | 3 | Fix `1-2` and `10` |

PR-only alert `80` is medium severity and is assigned `FIX`.

## Approved execution checkpoint

Founder approval was received on 2026-07-12 before any remediation or alert dismissal. The local implementation now:

- fixes alerts `3-8`, `10`, and `80` under the contracts above;
- retains the already-landed PR fixes for alerts `1-2`;
- adds focused regression coverage for URL authority boundaries, local MCP URL validation, executable allowlists, Windows `.cmd` metacharacter rejection, Markdown table escaping, and direct file reads;
- changes no product boundary, product spec, maturity stage, or G2 state.

Pre-push verification on 2026-07-12:

| Check | Result |
|---|---|
| Focused CodeQL regression set | 7 files / 57 tests passed |
| Onboarding/CLI compatibility set | 5 files / 88 passed / 1 pre-existing todo |
| Final registration regression set | 4 files / 82 tests passed |
| `npm run typecheck` | passed |
| `npm run lint` | passed |
| `npm run test:product` | 183 files passed / 1 skipped; 1,888 tests passed / 21 skipped / 1 todo |
| `npm run test:orchestration` | 30 files / 269 tests passed |
| `tools/secret-scan.sh history` | 4,517 commits; no leaks; archive and printable-string scans clean |
| `git diff --check` | clean |

GitHub CodeQL and alert dismissals remain pending until this implementation is committed and pushed to PR #8.

## Required execution order

1. Founder approves or edits this table.
2. Builder fixes `3-8`, `10`, and `80` without expanding the product boundary.
3. Run focused tests, typecheck, lint, full product/orchestration suites, CodeQL, and the existing Phase 3 CI/security matrix.
4. Confirm PR-ref CodeQL has zero new alerts.
5. Apply GitHub dismissals for `9`, `11`, and `12-79` using the exact reason/evidence groups above. Do not bulk-dismiss with a generic comment.
6. Merge only after required checks and founder approval.
7. Run CodeQL on post-merge `main`; confirm fixed alerts close and dismissed alerts retain their recorded rationale.
8. Attach the final alert export/counts to the A6/G1 closure evidence.

## What this does not authorize

- No product source, product spec, G2 lift, or maturity advancement.
- No dismissal before founder approval.
- No claim that CodeQL is green merely because the workflow completed.
- No claim that inherited package/runtime failures are resolved; they require their separate terminal dispositions.
