---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 18
combined_at: '2026-07-16T13:30:15Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 98250a763cb24326b3ac989f7488399470d4a3ed
next_round: 19
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

**Founder-delegated disposition.** Both requested R18 reviewers returned `proceed_after_patches`; all substantive high/medium findings are accepted. The patch is exact commit `98250a763cb24326b3ac989f7488399470d4a3ed`, spec SHA-256 `51b11c45b92525acdb97680f2f617f2a5dc4d870fac1340a625b160707012ac5`. R19 must independently verify those same bytes; no claim, build, target write, release, installation, or authority mutation is authorized by this disposition.

**Reframe gate: `structural_cut`.** Several R18 findings attacked lifecycle mechanisms introduced by prior patches, and a separate read-only pre-build audit found a higher-order delegation deadlock: the required pre-operation approval record advances public Project main, so the former linear `E..C` CAS could no longer publish the reviewed candidate without a forbidden rebase/merge or recursive approval. The patch removes that mechanism and replaces it with one deterministic `Q/C/A/U/F` integration per authority class: a record-only approval `A` lands first, a disjoint union tree retains public governance bytes plus the exact candidate, and a fixed two-parent `[A,C]` integration becomes public. Target-main and release execution use separate record-only `A_M`/`A_N` approvals; final evidence uses `E_C/A_E/P_E`. Embedded integration plans contain pre-A inputs/derivation rules only, so no commit or tree names itself.

The same structural cut moves exact-`M` hosted evidence to a fresh read-only `land/converge` phase; starts each host aggregate at coordinator-observed spawn; makes source and CI cleanup single-assignment, bounded, authenticated, and testable; permits only one no-network/no-credential cleanup helper after poison; defines finite polling grids; fixes the UID-0/UID-501 path split; and adds exact Project schemas plus execution-approval fixtures. Two fresh read-only Codex audits compared every official R18 finding and the full authorization topology against the final bytes; both were clean. The strategist pointer SHA-256 is `eed70f889877009de777029c121e343a6fbf951f92ce16805cbe769ae02ce5a2`.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | both (convergent on `AC3 — source-mode cleanup transition`) | AC3 — source-mode cleanup transition | accepted | `98250a763cb24326b3ac989f7488399470d4a3ed` — cleanup atomically marks `running` before any fallible settlement/authentication; all later failures are terminal, and pre-helper plus no-second-spawn fixtures exercise the production transition. |

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC4/AC6 — post-M hosted evidence | accepted | `98250a763cb24326b3ac989f7488399470d4a3ed` — a fresh mutation-incapable `land/converge` host rematerializes `M`, authenticates canonical main, and binds exact quality-macos, quality-ubuntu, secret-scan, and source-build tuples before collection or `P_S`. |
| 2 | HIGH | codex | AC4 — coordinator/host aggregate start | accepted | `98250a763cb24326b3ac989f7488399470d4a3ed` — the aggregate begins at the coordinator-recorded successful direct-child spawn; initial PPID/liveness and executable checks consume that same clock. |
| 3 | HIGH | codex | AC4 — implementation_review CAS reconciliation | accepted | `98250a763cb24326b3ac989f7488399470d4a3ed` — the flawed linear CAS is removed. `A_R/R` use deterministic authorization/integration, and the reviewed-local exception is limited to that Project-only sequence plus mutation-free exact reconcile. |
| 4 | HIGH | codex | AC6 — final repository-bootstrap migration record | accepted | `98250a763cb24326b3ac989f7488399470d4a3ed` — post-release record/backlog evidence forms `E_C`; record-only `A_E` authorizes fixed `P_E`, whose exact public raw-object/tree/path readback is the item-137 gate without a self-SHA claim. |
| 5 | MEDIUM | codex | AC4 — hosted quality-job cleanup | accepted | `98250a763cb24326b3ac989f7488399470d4a3ed` — both jobs use an authenticated `ci-clean-owned-home.mjs` with exact Node/argv, runner-temp/owner/mode/symlink guards, one 180-second `always()` invocation, and parent `ENOENT` readback. |
| 6 | MEDIUM | codex | AC6 — GitHub CLI config path ownership | accepted | `98250a763cb24326b3ac989f7488399470d4a3ed` — `/` and `/Users` require UID 0, founder-home descendants UID 501, all nonsymlink/non-writable, and final/snapshot `hosts.yml` UID 501 mode 0600. |
| 7 | MEDIUM | codex | frontmatter files_to_modify / AC4-AC6 Project_echo schemas | accepted | `98250a763cb24326b3ac989f7488399470d4a3ed` — all four requested schemas plus the integration schema are explicit. Coordinator-only full-item-ID delegated approvals remain outside builder `files_to_modify` per the canonical carve-out. |
| 8 | HIGH | codex-ops | AC4/AC6 — GitHub CLI config snapshot paragraph | accepted | `98250a763cb24326b3ac989f7488399470d4a3ed` — the exact system/founder ownership split, same-descriptor metadata, no-follow read, UID-501 snapshot, and byte/hash readback are executable transport fixtures. |
| 9 | MEDIUM | codex-ops | AC4 — quality-job timeout and always cleanup | accepted | `98250a763cb24326b3ac989f7488399470d4a3ed` — the 80-minute job has nonborrowable 120/3700/300/180-second phase budgets, cleanup starts by elapsed 4500, retains 120 seconds before cutoff, and exhausted-budget fixtures still run cleanup once. |
| 10 | MEDIUM | codex-ops | AC4 — operation-host liveness and poison teardown | accepted | `98250a763cb24326b3ac989f7488399470d4a3ed` — poison rejects all later RPC/resource creation except one preauthenticated bounded local owned-root helper with no credential, network, Git/gh, Project, target, or reconcile capability. |
| 11 | MEDIUM | codex-ops | AC6 — collectPublicationEvidence polling after run discovery | accepted | `98250a763cb24326b3ac989f7488399470d4a3ed` — one 15-second grid covers discovery through 1800 and exact-ID settlement through 2340, capped at 157 ticks with queued/in-progress/last-tick/off-by-one fixtures. |
| 12 | MEDIUM | codex-ops | AC4/AC6 — post-main M hosted-evidence convergence | accepted | `98250a763cb24326b3ac989f7488399470d4a3ed` — a 6000-second read-only phase uses at most 361 ticks through offset 5400, binds all four exact-M results, and supplies the tuple reauthenticated by collect/publish. |
| 13 | HIGH | strategist pre-build audit | AC4/AC6 — delegated approval versus Project-main candidate publication | accepted | `98250a763cb24326b3ac989f7488399470d4a3ed` — `Q/C/A/U/F` removes the authorization recursion; pre-A plans forbid derived identities, public/candidate paths must be disjoint, and fixed `[A,C]` integrations retain approval/governance bytes. Separate A_M/A_N and all four integration classes have production publisher/reconcile fixtures. |

## Convergence call

needs R19 — focus_hints: verify the nonrecursive pre-A `Q/C/A/U/F` contract and full-item-ID delegated approvals; execution-purpose `A_M/A_N`; final `E_C/A_E/P_E`; exact hosted-job helper/deadline cleanup; spawn-anchored aggregate and post-poison cleanup exception; UID ownership split; `land/converge` four-result exact-M tuple; and finite 361/157-tick polling schedules.
