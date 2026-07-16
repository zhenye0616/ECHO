---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 16
combined_at: '2026-07-16T11:06:08Z'
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

Fresh-context investigator: `structural_cut` — R15 added three non-load-bearing seams (manual workflow dispatch/correlation, repeated keyring-token acquisition, and a fresh-review sidecar nested beneath the canonical review record) and R16 found defects inside those seams. The strategist accepts the cut. The read-only source build becomes the unique attempt-1 `push` run for exact landed `M`; each controller invocation retains one preflight-validated token Buffer; the existing canonical implementation-review JSON is itself reviewer-owned immutable evidence in an earlier additive commit; and the delegated coordinator, not an already-running target controller, creates and authenticates the clean detached execution clone.

The diagnostic check is falsifiable: the patched spec must contain no `workflow_dispatch`, dispatch correlation, `workflow-dispatch-controller.mjs`, discovery-poll schedule, repeated `gh auth token` acquisition, fresh-review sidecar field/commit, controller self-clone, or mutable-`origin` push. It must still prove one unique successful attempt-1 push run/job/artifact at `M`, one validated credential per invocation, reviewer-owned canonical review bytes, clean detached `H`/`M` launches, sanitized direct-URL pushes, finite operation deadlines, and exact owned-workspace cleanup.

Removal proof matrix:

- `state_removed`: dispatch correlation/input/attempt schedule; per-boundary token Buffers; fresh-review sidecar commit/blob fields; controller-owned nested-clone state; and mutable remote-alias resolution.
- `behavior_removed`: dispatch POST/discovery/terminal polling; repeated token fetches; sidecar publication; controller self-bootstrap; and pushes through `origin`.
- `owners_removed`: `tools/workflow-dispatch-controller.mjs` and its dedicated suite; the separate fresh-review sidecar; repeated-acquisition code; and target-controller clone bootstrap.
- `tests_removed_or_changed`: dispatch/fake-clock/correlation fixtures become absence checks plus exact unique push-run selection; sidecar tests bind the reviewer-owned canonical JSON commit; credential tests reject a second acquisition; push tests poison hooks/follow-tags/aliases/rewrites; launch and cleanup fixtures cover the retained envelope.
- `remaining_invariants`: exact `M` source build; independent reviewer-owned canonical review record; canonical plans/authorizations; one local publisher; immutable tag/object and asset identities; destination readback as durable truth; no retry/adoption/remote cleanup; and `authority:false` / `installed:false`. No replacement durable state or mutation owner is introduced.

Reviewer row 3's request for `return_run_details:true` is rejected on two independent grounds: the dispatch mechanism is removed, and GitHub API version `2026-03-10` removed that legacy parameter and always returns run details. The patched protocol must reject that field if any generic adapter encounters it.


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC4 target-main landing gate and AC6 publication entrypoint, lines 231-239 and 288-290 | accepted with structural cut | Coordinator creates the fresh clone; before any target credential/API access it authenticates clean detached `H`/`M`, tree, controller, static-import closure, schemas, and runtime inventory, then launches the reviewed controller from that clone. |
| 2 | HIGH | codex | AC4/AC6 private-target authentication, lines 239 and 284-286 | accepted with structural cut | Each invocation acquires exactly one strictly parsed keyring token Buffer, validates that same Buffer's identity/scopes/provenance, reuses it, and zeroes it at final teardown; a second acquisition is forbidden. |
| 3 | HIGH | codex | AC6 workflow dispatch contract, lines 253-259 | accepted with structural cut; obsolete parameter rejected | Remove manual dispatch entirely. Authenticated metadata/readback binds the unique successful attempt-1 push-triggered workflow/run/job/artifact at exact `M`; API `2026-03-10` forbids the removed `return_run_details` field. |
| 4 | MEDIUM | codex | AC4 and AC6 Git push commands, lines 237 and 292 | accepted | Both pushes use the direct canonical token-free URL from a config-isolated fresh clone with `--no-verify`, `--no-follow-tags`, explicit one-ref refspec/lease, scrubbed proxy/rewrite/helper state, and exact porcelain/readback. |
| 5 | MEDIUM | codex | files_to_modify and AC4 implementation-review evidence, lines 229 and 233-235 | accepted with structural cut | Remove the redundant sidecar. The independent reviewer owns the existing canonical implementation-review JSON in earlier additive commit `R`; later plan/authorization commit `P_L` binds `R`, path, blob, and SHA-256. |
| 6 | MEDIUM | codex | AC6 discovery polling and workflow-dispatch tests, lines 257 and 336 | accepted with structural cut | Remove dispatch and the contradictory discovery schedule; exact push-run selection is a fully paginated unique-match readback and fails closed on zero, duplicate, rerun, stale, or malformed candidates. |
| 7 | MEDIUM | codex-ops | AC3 — fresh-clone verifier/wrapper and exact child traces | accepted | Harden the existing verifier envelope with explicit absolute tool paths/versions, pre-Node environment scrubbing, controlled child environments, and poisoned-PATH/config fixtures; add no second sandbox owner. |
| 8 | HIGH | codex-ops | AC4 — target-main canonical plan and sole push | accepted with structural cut | Deduplicated with rows 1/4: remove `origin`; bind the canonical endpoint, fresh-clone provenance, controller bytes, clean tree, config isolation, and direct-URL push in the plan and gate. |
| 9 | HIGH | codex-ops | AC6 — workflow-dispatch and release-publication production adapters | accepted in part with structural cut | Remove the dispatch half. Retain monotonic per-operation deadlines, HTTP abort/stream closure, process-group TERM/KILL/reap, ambiguous-write read-only reconciliation, and never-resolving/orphan-child fixtures for landing/publication. |
| 10 | HIGH | codex-ops | AC6 — private-target authentication adapter | accepted with structural cut | Deduplicated with row 2; one validated Buffer per invocation, plus rejection of redirects, proxy overrides, URL rewrites, helper/config leakage, rotation, malformed stdout, or identity/scope drift. |
| 11 | MEDIUM | codex-ops | AC6 — production entrypoint temporary clone, artifact download, and extraction | accepted | Coordinator owns one canonical 0700 `mkdtemp` root; every clone/download/extraction path stays beneath it, exact-root cleanup always runs locally, preserves the primary error, and never interprets remote `cleanup:false` as local leakage. |

## Convergence call

Needs R17 — verify the structural removals, unique exact-`M` push-build selection, reviewer-owned canonical review record ordering, one-token credential lifetime, provenance-bound clean launches, direct-URL sanitized pushes, verifier environment isolation, finite abort/kill semantics, and owned-workspace cleanup on the patched same SHA.
