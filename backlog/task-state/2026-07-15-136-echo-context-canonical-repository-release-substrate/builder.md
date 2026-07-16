---
task_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
role: builder
binding: codex
claimed_by: codex-136-cycle2-repair-builder-mendel-249e60
claimed_at: 2026-07-16T17:38:20Z
last_updated: 2026-07-16T17:38:20Z
branch: agent/echo-context-canonical-repository-release-substrate
worktree: /Users/zhenye/Desktop/Project_echo--echo-context-canonical-repository-release-substrate
target_branch: agent/echo-context-canonical-repository-release-substrate
target_worktree: /Users/zhenye/Desktop/echo-context--echo-context-canonical-repository-release-substrate
handoff_branch: agent/echo-context-canonical-repository-release-substrate
handoff_head_sha:
handoff_run_log: raw/internal/agent-runs/2026-07-16-2026-07-15-136-echo-context-canonical-repository-release-substrate.md
---

## current_thesis

R24 converged at exact spec commit `f80003a7fbd08755dbff669951ed07bf43b390d0` with ready seal `a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca`. The final repair builder preserves both feature histories and starts from local target commit `249e60dfd8b6615b55dadcd60737a9052da48364`, which contains the deadline and repeated-signal fixes but is not yet remote authority. It must implement the converged pre-spawn/spawned-child terminal shapes, rerun every exact-head gate, and stop at independent-review handoff.

<!-- builder-state-handoff:start -->
- Lifecycle: CLAIMED — builder `codex-136-cycle2-repair-builder-mendel-249e60` owns the final R24 implementation repair; no final target or Project handoff SHA exists yet.
<!-- builder-state-handoff:end -->

## locked_decisions

- AC1: retain the completed repository/bootstrap history as immutable evidence and keep only the injected local repository-bootstrap gate plus exact scanner contract; never repeat either external operation.
- AC2: preserve item-135 bytes, bind the frozen baseline and successor authority, generate runtime-inventory.v2 for the evolving successor tree, and state the source/runtime authority split honestly.
- AC3: retain the sole source-mode 17-step trace and exact toolchain/environment. The 3,700-second value is an orchestration deadline under responsive kernel calls; no-PID pre-spawn failures and positive-PID spawned children have separate exhaustive terminal proofs, and no outcome reports or advances before its proof completes.
- AC4: delete every workflow and hosted/release surface; a different fresh reviewer must rerun AC3 at exact target head before the coordinator constructs and authorizes literal merge object `M`.
- AC5: build the deterministic `0.1.0-dev.136.1` source archive/checksum/manifest triple from committed Git objects with `installable:false`, `runtime_authority:false`, and `state_authority:false`.
- AC6: dual-build sealing and the final bootstrap migration record occur only after coordinator landing at canonical `M`; the builder must remove the premature cycle-one Project_echo bootstrap record and stop at pending review.
- Prior evidence at `1a91750e5b9ce9db49e9c893f9974b318f12f38a` is historical only. Every focused/full/inventory/authority/secret-scan/operator/isolated-clone/canonical-HTTPS acceptance gate must rerun at the final target head.
- No target main push, Project main implementation merge, tag, hosted release, artifact publication, install, live mutation, retry/adoption controller, attempt ledger, credential helper, or authority transfer belongs to this builder.

## open_questions

- None at claim. Any mismatch between the two converged terminal shapes and the production adapter returns to the persistent coordinator rather than changing the spec.

## dont_touch

- Do not edit either main checkout in place, rebase/rewrite frozen cycle-one history, or merge/push either main branch.
- Do not create `.github/workflows/**`, hosted evidence/plan/authorization schemas, release-publication or operation-host tooling, attempt ledgers, runners, controllers, tags, releases, or assets.
- Do not author the coordinator-only target-main landing authorization, the independent-reviewer-owned implementation review, or the post-landing bootstrap migration record.
- Do not install, configure clients, touch LaunchAgents, credentials, databases, checkpoints, live state, ports, daemons, or any client/user path.
- Do not change context behavior, Team-product maturity, wiki, unrelated backlog items, item-135 provenance bytes, or unrelated user/agent worktrees.

## canonical_anchors

- spec: backlog/claimed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
- converged_spec_commit: f80003a7fbd08755dbff669951ed07bf43b390d0
- ready_seal: a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca
- reviews: backlog/reviews/2026-07-15-136-echo-context-canonical-repository-release-substrate/r24/
