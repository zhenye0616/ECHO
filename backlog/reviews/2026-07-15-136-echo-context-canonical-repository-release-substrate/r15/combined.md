---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 15
combined_at: '2026-07-16T10:20:24Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

## Reframe gate

Fresh-context investigator: `propagation_completion` — R15 selected mechanisms required by the cycle-one rejection but did not propagate identities and protocol contracts end-to-end. Diagnostic tracing accepted all rows. One isolated override applies to the investigator's named risk: the release-authorization ref plus remote publish dispatch add no independent enforcement beyond the immutable Project_echo record, and a lost publish-dispatch response can still launch later remote mutations. They are therefore structurally cut; publication becomes one local exact-plan controller operation after the read-only Actions build.

Removal proof matrix:

- `state_removed`: target `release-authorizations/<nonce>` commit/ref and remote publish-run nonce state.
- `behavior_removed`: authorization-ref mutation/readback and write-capable `source-release-publish.yml` dispatch.
- `owners_removed`: off-main `source-release-approval.v1.json`, auth-ref publisher, and remote publish workflow.
- `tests_removed_or_changed`: auth-ref/reused-publish-dispatch fixtures become exact Project_echo authorization, local publication-controller, token-isolation, and no-remote-write-workflow fixtures.
- `remaining_invariants`: exact Project_echo authorization + canonical plan; one retry-free correlated build dispatch; exact build run/job/artifact readback; deterministic authorized tag object; one local response-plus-readback publication controller; destination namespace durable truth; no retry/adoption/cleanup; `authority:false` and `installed:false`. No compensating persistent state or new authority is introduced.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC4 — exact-SHA check-run evidence | accepted | Pin PR jobs to the event head SHA, assert HEAD/tree in-job, publish exact evidence carriers, and bind run/job/artifact identities; reject synthetic merge-ref substitution. |
| 2 | HIGH | codex | AC6 — annotated-tag construction and authorization | accepted | Canonical tag-object bytes/tagger metadata/OID are computed before approval and threaded through plan, Project_echo authorization, controller, push, and readback. |
| 3 | MEDIUM | codex | AC6 — release-asset mutation responses | accepted | Remove nonexistent response `release_id`; bind through captured release-scoped endpoint plus exact-ID paginated enumeration/metadata/download. |
| 4 | MEDIUM | codex | AC6 — publish preflight and public Project_echo read | accepted with structural cut | Remove remote publish checkout; local committed controller uses a host-pinned credentialless public-ECHO adapter, and target auth exists only at exact target-operation boundaries. |
| 5 | MEDIUM | codex | AC6 — build-run approval and readback | accepted | Bind workflow ID/path, event, ref/head SHA, run attempt/status/conclusion, build job ID/name/status/conclusion, and exact evidence/artifact IDs/digests. |
| 6 | MEDIUM | codex | AC4/AC6 — independent-review enforcement | accepted | Canonical implementation-review record binds builder/reviewer actor and run identities and rejects equality/substitution. |
| 7 | MEDIUM | codex | AC4/AC6 — execution-plan hashes | accepted | Add canonical JSON plan paths/schemas/bytes and exact recomputation for ordered commands/requests/readbacks/retry policy. |
| 8 | MEDIUM | codex | files_to_modify versus AC4/AC6 committed artifacts | accepted | Add exact implementation-review, plan, and authorization record paths with reviewer/coordinator ownership. |
| 9 | HIGH | codex-ops | AC6 — two manual release workflows and build-artifact discovery | accepted with structural cut | Keep only retry-free correlated read-only build dispatch; remove remote publish dispatch so lost dispatch cannot authorize later release writes. |
| 10 | HIGH | codex-ops | AC6 — public Project_echo authorization-record read | accepted | Host-pinned unauthenticated adapter sends no authorization/cookie/helper/askpass/extraheader/token and rejects redirects; production-path leak fixtures required. |
| 11 | MEDIUM | codex-ops | AC6 — create-only release-authorization ref operation | accepted — mechanism dropped | Authorization ref is removed per matrix; immutable Project_echo record plus local controller is the sole approval carrier. |
| 12 | HIGH | codex-ops | AC6 — source-release approval and annotated-tag publication | accepted | Deduplicated with row 2; exact canonical tag object and OID are approval inputs, not selected after authorization. |
| 13 | MEDIUM | codex-ops | AC6 — release asset upload response and production adapter tests | accepted | Deduplicated with row 3; protocol-faithful production REST/redirect/pagination/porcelain adapters and fixtures replace fake-only assumptions. |

## Convergence call

Needs R16 — verify the exact feature-head CI carrier, correlated retry-free build dispatch, canonical actor/plan/build-run/tag identities, credential-isolated public read, local publication structural cut, protocol-faithful asset binding, and complete fault fixtures on the patched same SHA.
