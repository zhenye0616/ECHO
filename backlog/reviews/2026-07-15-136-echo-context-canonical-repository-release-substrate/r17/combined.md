---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 17
combined_at: '2026-07-16T12:06:12Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 065feea6cda7f9824d54f9041fecc637dd1bccbc
next_round: 18
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

**Founder-delegated divergence resolution** — codex=`proceed_after_patches` and codex-ops=`pushback` crossed the normal escalation boundary. The scoped founder delegation recorded at `raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md` authorizes the persistent strategist to decide that boundary without waiving same-SHA verification. Every substantive R17 high/medium is dispositioned below; accepted findings are patched at exact commit `065feea6cda7f9824d54f9041fecc637dd1bccbc`, and R18 must independently verify those bytes.

**Reframe gate: `structural_cut`.** Multiple findings attacked mechanisms added during the R15–R16 recovery patches. The patch consolidates OS/process/credential/root ownership into one reviewed operation host rather than adding cleanup prose to launcher-owned children; makes destination readback the only durable authority rather than adding recursive markers; removes the credentialed `gh auth status`/active-account/OAuth-class mechanism and uses one exact user-pinned local token command plus host-owned identity readback; and couples build identity to the existing namespace transaction boundaries rather than adding a parallel publication state machine. Removal proof matrix: `state_removed` = active-account/OAuth/configured-protocol authority and launcher-held credential/process state; `behavior_removed` = `gh auth status`, launcher/controller spawn, retry/adoption, and time-window-before-uniqueness selection; `owners_removed` = launcher/envelope/controllers no longer own credentialed transports, child groups, or root cleanup; `tests_removed_or_changed` = status/socket-pretense tests are replaced by exact pinned-child/snapshot tests and launcher tests assert spawn absence; `remaining_invariants` = one pinned GH credential acquisition, exact `/user` identity/scopes, one host broker, destination readback, exact CAS, and same-SHA independent verification.

Before sealing the patch, two fresh read-only Codex audits found and the strategist accepted five propagation defects in the new mechanisms: coordinator liveness/PPID fencing, `gh auth status` account ambiguity and its unsupported socket-denial claim, AC3 teardown reserve plus single-assignment cleanup, live-config validate/use TOCTOU, and build drift between publication transitions. All were patched into the same commit; the final precommit audits were clean on spec SHA-256 `f89e21df1ad04b6544be66d7175c9c5c4e7bfa05671ef35929b4e4a120f2e98e`.


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC3/AC4 — fresh-clone acceptance and hosted quality workflows | accepted | `065feea6cda7f9824d54f9041fecc637dd1bccbc` — both quality jobs now require `fetch-depth:0`, canonical absolute tools, fresh mode-0700 HOME/tmp, the exact source-mode acceptance vector, 65-minute job bounds, and `always()` exact-root cleanup, with structural mutation tests. |
| 2 | HIGH | codex | AC3 — `tools/fresh-clone-acceptance.sh` bootstrap contract | accepted | `065feea6cda7f9824d54f9041fecc637dd1bccbc` — the shell resolves only its canonical nonsymlink verifier sibling, and the verifier binds `import.meta.url` plus physical cwd before mutation/spawn; wrong-cwd/symlink/decoy fixtures fail before execution. |
| 3 | HIGH | codex | AC4/AC6 — private-target Git credential transport | accepted | `065feea6cda7f9824d54f9041fecc637dd1bccbc` — Project_echo owns an authenticated absolute `GIT_ASKPASS` helper, exact token/receipt FD names, fixed prompt receipts, command-scoped redirect denial, no alternate helper, one user-pinned keyring acquisition from an exact no-secret config snapshot, and bounded teardown/zeroing. |
| 4 | HIGH | codex | AC6 — unique source-build selection | accepted | `065feea6cda7f9824d54f9041fecc637dd1bccbc` — every selection fully paginates the complete `head_sha=M` set and requires global cardinality zero/one before all other predicates; publish repeats exact run/job/artifact stability at every transaction boundary and final postcondition. |
| 5 | HIGH | codex | AC6 — release publication transitions | accepted | `065feea6cda7f9824d54f9041fecc637dd1bccbc` — first release now uses repository-wide exact snapshots `E`, `N0`…`N5` before and after all six writes, coupled to build identity; any foreign object or drift permits at most the already in-flight mutation and no successor. |
| 6 | MEDIUM | codex | AC4/AC6 — deadline and cleanup policy | accepted | `065feea6cda7f9824d54f9041fecc637dd1bccbc` — a generated exhaustive inventory covers filesystem/config/hash/HTTP/Git/gh/transfer/cleanup operations, abort settlement, TERM/KILL/reap, PGID absence, credential zeroing, root absence, host aggregate reserve, and coordinator outer reserve. |
| 7 | HIGH | codex-ops | AC4 — reviewed launcher/envelope cleanup and deadline contracts; AC6 — hard-loss semantics | accepted | `065feea6cda7f9824d54f9041fecc637dd1bccbc` — one OS-parent operation host now owns every credentialed HTTP transport and Git/gh/cleanup child group; launcher/controllers cannot spawn. Liveness FD plus expected PPID fence coordinator loss, and real-process launcher/coordinator death tests cover cooperative teardown and honest hard-loss limits. |
| 8 | HIGH | codex-ops | AC4 — review commit R and landing-plan P_L publication; AC6 — source-publication plan/authorization commit | accepted | `065feea6cda7f9824d54f9041fecc637dd1bccbc` — one Project authority publisher implements exact one-attempt CAS for `R`, `P_L`, and `P_S` with clean isolated worktrees, canonical URL/argv, leases, porcelain, no pull/rebase/retry, public byte/ancestry readback, and fresh mutation-incapable reconciliation after ambiguity. |
| 9 | MEDIUM | codex-ops | AC3 — fresh-clone verifier child execution and source temporary-directory cleanup | accepted | `065feea6cda7f9824d54f9041fecc637dd1bccbc` — exact per-child and 3,700-second aggregate bounds reserve the final 120 seconds for settlement/cleanup/final probes; every child has TERM/KILL/reap/stream semantics, and `T` cleanup is one single-assignment transition with step-16/17 no-respawn tests. |
| 10 | MEDIUM | codex-ops | AC6 — unique source-release workflow-run selection | rejected — founder-decided | Current GitHub Actions workflow-run REST responses report the run `path` with the ref suffix (for this workflow, `.github/workflows/source-release-build.yml@main`), while workflow metadata reports the plain `.github/workflows/source-release-build.yml`. The patch preserves those endpoint-specific fields separately and adds raw protocol fixtures accepting only the current run form. Requiring the plain path for a run would reject legitimate exact-M evidence. See GitHub's current workflow-runs REST schema/example: https://docs.github.com/en/enterprise-cloud%40latest/rest/actions/workflow-runs?apiVersion=2026-03-10. |

## Convergence call

needs R18 — focus_hints: verify the exact host/coordinator liveness and deadline partitions; finite framed RPC; Project authority CAS/reconcile; AC3 source vector, 120-second final reserve, single-assignment cleanup, and CI cleanup; user-pinned GH config snapshot/askpass boundary; global run uniqueness and exact-ID stability at every repository-wide `E`/`N0`…`N5` boundary; and current-API workflow-run `@main` path versus plain workflow metadata.
