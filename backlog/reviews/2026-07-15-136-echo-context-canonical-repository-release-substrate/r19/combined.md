---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 19
combined_at: '2026-07-16T14:17:55Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
combined_verdict: pushback
escalated_to_founder: false
---

# Combined findings

Reframe gate: FIRED — all 7 findings target mechanism introduced by the r15–r18 reframe patch lineage (`47909a31`, `0ef00dc0`, `065feea6`, `98250a76`); none targets original spec text. The mandatory fresh-context investigator was NOT run: the founder directly ordered the structural cut in the strategist session on 2026-07-16 (~07:50 PDT), pausing the Codex coordinator and directing that all GitHub Actions / hosted-gate scope move to a follow-up item. Founder decision record: `raw/internal/decisions/2026-07-16-136-defer-github-hosted-gates.md` (landed `4acb3bbe`). Effective investigator verdict: `kind: structural_cut`.

Removal proof matrix (covers rows 1–7 jointly; the disposition is one structural cut, not seven local patches):

- `state_removed`: `.github/workflows/**` (deleted from the feature branch in cycle two); `tools/echo-context-operation-host.mjs`, `tools/echo-context-git-askpass-fd.mjs`, `tools/echo-context-remove-owned-root.mjs`, `tools/echo-context-reviewed-operation-launcher.mjs`, `tools/echo-context-operation-envelope.mjs`, `tools/echo-context-project-authority-commit-publisher.mjs`; schemas `echo-context-operation-rpc.v1`, `target-main-execution-plan.v1`, `project-echo-delegated-operation-authorization.v1`, `source-release-publication-plan.v1`, `project-authority-integration-plan.v1`, `implementation-review-evidence.v1` (JSON), `hosted-check-evidence.v1`; the four canonical plan/authorization JSON migration records; execution-purpose approvals `A_M`/`A_N`; the Q/C/A/U/F integration classes.
- `behavior_removed`: hosted CI runs and check gating; operation-host-supervised GitHub mutations; liveness-pipe/poison topology; anonymous-FD askpass credential transport; land/converge/collect/publish polling grids and deadline inventories; tag/draft/asset/publish release mutations; post-publication hosted fresh-clone acceptance.
- `owners_removed`: all `tools/echo-context-operation-*` / askpass / publisher entries, `tests/echo-context/**`, plan/authorization schema entries, and `.github/workflows/**` leave `files_to_modify` (workflows re-listed only as a deletion).
- `tests_removed_or_changed`: `tests/echo-context/operation-envelope.test.ts`, `operation-transports.test.ts`, `project-authority-commit-publisher.test.ts`, `tests/governance/workflow-policy.test.ts`, `landing-gate.test.ts`, `source-release-build-selection.test.ts`, `github-publication-adapters.test.ts`, `release-publication-controller.test.ts`, and the hosted portions of `release-authorization.test.ts` are removed from spec scope; remaining tests assert local contracts only.
- `remaining_invariants`: immutable completed bootstrap (AC1); provenance/authority records (AC2); AC3 fresh-clone acceptance as the quality gate, run by builder AND independently by reviewer; deterministic source artifact + six-field tuple seal (AC5/AC6); builder ≠ reviewer with `merge_ready` verdict before landing; the precedented delegated-approval-record → single leased `--porcelain` push → authenticated readback protocol for the one external write (already landed twice: `e1ec8f74`, `ece86049` — precedented, not new compensating mechanism); private visibility; explicit no-server-enforcement honesty.

Failure-mode check: `state_removed`/`behavior_removed`/`owners_removed` are all non-empty and real; `remaining_invariants` introduces no new compensating contract (the landing protocol is the already-landed bootstrap pattern). This is a true structural cut.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC4 operation-host contract and AC6 post-publication fresh-clone acceptance | accepted — mechanism dropped | Operation host + hosted publication removed from scope; AC3 acceptance now runs locally (builder + reviewer), so no host mode or budget conflict exists. See matrix above. |
| 2 | HIGH | codex-ops | AC6 post-publication fresh-clone acceptance; AC4 top-level operation-kind contract | accepted — mechanism dropped | Same structural cut; the operation-kind contract no longer exists. |
| 3 | HIGH | codex-ops | AC4 land/converge polling, AC6 collect polling, and the generated deadline inventory | accepted — mechanism dropped | No hosted runs to poll; polling grids and deadline inventory removed with the host. |
| 4 | HIGH | codex-ops | AC4 final 50-second host reserve and expiry/cleanup contract | accepted — mechanism dropped | Host aggregate/reserve/cleanup topology removed. |
| 5 | MEDIUM | codex-ops | AC4 hosted quality-job HOME cleanup | accepted — mechanism dropped | No hosted quality jobs; deferred to item 140 (`backlog/inbox/2026-07-16-140-echo-context-hosted-ci-and-release-governance.md`). |
| 6 | MEDIUM | codex-ops | AC6 anonymous-FD Git askpass transport | accepted — mechanism dropped | Askpass transport removed; the remaining pushes use the founder's existing gh/git credentials exactly as the two landed bootstrap operations did. |
| 7 | MEDIUM | codex-ops | AC4 coordinator fallback cleanup after partial materialization | accepted — mechanism dropped | No coordinator materialization root exists after the cut. |

## Convergence call

needs R20 — focus_hints: structural cut per founder decision `raw/internal/decisions/2026-07-16-136-defer-github-hosted-gates.md`; verify the slimmed spec (a) retains AC1/AC2/AC3/AC5 contracts intact, (b) contains zero hosted-CI/protection/release/operation-host residue, (c) specifies an executable local landing protocol (independent review record, delegated-approval record, single leased porcelain push, readback) and tuple-based artifact seal, and (d) the removal is complete — no orphaned test, file, schema, or cross-reference to removed mechanism remains.
