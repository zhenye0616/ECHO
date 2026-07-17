---
item_id: 2026-07-15-137a-echo-context-candidate-runtime
round: 2
combined_at: '2026-07-17T21:22:37Z'
claude_response: null
codex-ops_response: codex-ops.md
codex_response: codex.md
cursor_response: null
patch_commit_sha: null
next_round: null
combined_verdict: pushback
escalated_to_founder: false
review_protocol: 2
review_mode: delta
review_counter:
  lifetime: 2
  epoch: 1
  epoch_round: 2
finding_families:
- family_id: fam-23d135eeb416e265
  mechanism: continuously drained bounded diagnostic capture and failure cleanup
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: closed
  reviewers:
  - codex-ops
- family_id: fam-58138afe52e773f2
  mechanism: candidate entrypoint and execution environment closure
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: patched
  reviewers:
  - codex
  - codex-ops
- family_id: fam-68977d8ba2d0dabb
  mechanism: parent-liveness orphan cleanup and external observation
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: patched
  reviewers:
  - codex-ops
- family_id: fam-98852860031f9aaf
  mechanism: generated stage inventory and executed-byte binding
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: closed
  reviewers:
  - codex
- family_id: fam-a1eac2e4f6b38335
  mechanism: process-tree-scoped repository and network denial
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: closed
  reviewers:
  - codex
  - codex-ops
- family_id: fam-b5cc6c437eea0108
  mechanism: bounded shutdown with active HTTP connections
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: closed
  reviewers:
  - codex-ops
- family_id: fam-d8a4bf5b6feb34d0
  mechanism: authentication before application body consumption
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: closed
  reviewers:
  - codex
- family_id: fam-dfbd55bbe7c54f1a
  mechanism: candidate root topology and ownership
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: closed
  reviewers:
  - codex
- family_id: fam-e9ae0e92ef54305d
  mechanism: candidate SQLite writer lease acquisition
  origin: original
  first_seen_round: 1
  latest_round: 2
  state: closed
  reviewers:
  - codex
round_diagnostics:
  new_family_ids: []
  recurring_family_ids:
  - fam-58138afe52e773f2
  - fam-68977d8ba2d0dabb
  reopened_family_ids: []
  proof_failed_family_ids: []
  patch_introduced_family_ids: []
  closed_family_ids:
  - fam-23d135eeb416e265
  - fam-98852860031f9aaf
  - fam-a1eac2e4f6b38335
  - fam-b5cc6c437eea0108
  - fam-d8a4bf5b6feb34d0
  - fam-dfbd55bbe7c54f1a
  - fam-e9ae0e92ef54305d
  root_cause: review_contract_static
sealed_spec_sha: null
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | both (convergent on `AC4 — closed executable-surface list versus the staged smoke-controller lifecycle topology`) | AC4 — closed executable-surface list versus the staged smoke-controller lifecycle topology | patched | Replaced the ambiguous four-command surface with exactly five shell-free launches: stage, sandboxed seed, outer, inner-owner mode, and sandboxed serve. The contract now closes each argv, role discriminator, cwd, positive environment, sandbox profile, and FD map, and the smoke test observes them and rejects every extra mode. |

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex-ops | AC4 lines 262–287 and 316–323 — outer/inner/runtime liveness topology | patched | Added a sole-writer outer-to-inner liveness FD above the existing inner-to-runtime FD, a durable `runtime_spawned` PID/start relay before readiness, and third-runner outer-after-ready and inner-before-ready SIGKILL proofs. Unknown PIDs are never signaled. |

## Round diagnosis

- Root cause: `review_contract_static`
- New families: `none`
- Recurring families: `fam-58138afe52e773f2, fam-68977d8ba2d0dabb`
- Reopened families: `none`
- Proof-failed families: `none`
- Patch-introduced families: `none`
- Closed families: `fam-23d135eeb416e265, fam-98852860031f9aaf, fam-a1eac2e4f6b38335, fam-b5cc6c437eea0108, fam-d8a4bf5b6feb34d0, fam-dfbd55bbe7c54f1a, fam-e9ae0e92ef54305d`

| Family | State | Origin | Mechanism |
|---|---|---|---|
| `fam-23d135eeb416e265` | closed | original | continuously drained bounded diagnostic capture and failure cleanup |
| `fam-58138afe52e773f2` | patched | original | candidate entrypoint and execution environment closure |
| `fam-68977d8ba2d0dabb` | patched | original | parent-liveness orphan cleanup and external observation |
| `fam-98852860031f9aaf` | closed | original | generated stage inventory and executed-byte binding |
| `fam-a1eac2e4f6b38335` | closed | original | process-tree-scoped repository and network denial |
| `fam-b5cc6c437eea0108` | closed | original | bounded shutdown with active HTTP connections |
| `fam-d8a4bf5b6feb34d0` | closed | original | authentication before application body consumption |
| `fam-dfbd55bbe7c54f1a` | closed | original | candidate root topology and ownership |
| `fam-e9ae0e92ef54305d` | closed | original | candidate SQLite writer lease acquisition |

## Convergence call

needs R3 — focus_hints: delta-verify the exact five-command outer/inner/sandboxed-runtime surface, the two-level outer→inner→runtime EOF chain, spawn-before-ready identity relay, and third-observer kill tests; confirm all seven R2-closed families remain closed.
