---
task_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
role: builder
binding: codex
claimed_by: codex-136-cycle2-final-builder-oracle-42c8
claimed_at: 2026-07-16T17:45:27Z
last_updated: 2026-07-16T18:23:23Z
branch: agent/echo-context-canonical-repository-release-substrate
worktree: /Users/zhenye/Desktop/Project_echo--echo-context-canonical-repository-release-substrate
target_branch: agent/echo-context-canonical-repository-release-substrate
target_worktree: /Users/zhenye/Desktop/echo-context--echo-context-canonical-repository-release-substrate
handoff_branch: agent/echo-context-canonical-repository-release-substrate
handoff_head_sha: 2fdce9c64b8077de1e73fffe5232bc471a973ac3
handoff_run_log: raw/internal/agent-runs/2026-07-16-2026-07-15-136-echo-context-canonical-repository-release-substrate.md
target_head_sha: 02af4e411077063d2cf5d4931bd3e9c1c0f0a5c7
target_tree_sha: bc8b700fe5db3435d54a930a71d0c5455b85541b
---

## current_thesis

R24 converged at exact spec commit `f80003a7fbd08755dbff669951ed07bf43b390d0` with ready seal `a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca`. Final builder `codex-136-cycle2-final-builder-oracle-42c8` preserved both feature histories and repaired only the converged deadline, signal, pre-spawn, positive-PID terminality, inherited-group, and ceremony-completion paths. The immutable Project evidence head is `2fdce9c64b8077de1e73fffe5232bc471a973ac3` (tree `11fbc67d4efd9be05942ad0b8ed7a18fb75b1950`); the immutable target candidate is `02af4e411077063d2cf5d4931bd3e9c1c0f0a5c7` (tree `bc8b700fe5db3435d54a930a71d0c5455b85541b`). Both are pushed and read back, every exact-head gate passed, and the builder stops at independent-review handoff.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at 2fdce9c64b8077de1e73fffe5232bc471a973ac3.
<!-- builder-state-handoff:end -->

## locked_decisions

- AC1: retain the completed repository/bootstrap history as immutable evidence and keep only the injected local repository-bootstrap gate plus exact scanner contract; never repeat either external operation.
- AC2: preserve item-135 bytes, bind the frozen baseline and successor authority, generate runtime-inventory.v2 for the evolving successor tree, and state the source/runtime authority split honestly.
- AC3: retain the sole source-mode 17-step trace and exact toolchain/environment. The 3,700-second value is an orchestration deadline under responsive kernel calls; no-PID pre-spawn failures and positive-PID spawned children have separate exhaustive terminal proofs, and no outcome reports or advances before its proof completes.
- AC4: delete every workflow and hosted/release surface; a different fresh reviewer must rerun AC3 at exact target head before the coordinator constructs and authorizes literal merge object `M`.
- AC5: build the deterministic `0.1.0-dev.136.1` source archive/checksum/manifest triple from committed Git objects with `installable:false`, `runtime_authority:false`, and `state_authority:false`.
- AC6: dual-build sealing and the final bootstrap migration record occur only after coordinator landing at canonical `M`; the builder must remove the premature cycle-one Project_echo bootstrap record and stop at pending review.
- Prior evidence at `1a91750e5b9ce9db49e9c893f9974b318f12f38a` is historical only. At final head `02af4e411077063d2cf5d4931bd3e9c1c0f0a5c7`, the 42-test AC3 focus set, typecheck, lint, inventory (340 packages / 23 sources), authority, all 78 CI files (1,079 passed / 17 skipped), four-ref exhaustive secret scan, two-test operator replay, isolated no-local acceptance, canonical HTTPS acceptance, and independent oracle all passed.
- No target main push, Project main implementation merge, tag, hosted release, artifact publication, install, live mutation, retry/adoption controller, attempt ledger, credential helper, or authority transfer belongs to this builder.

## open_questions

- None. Independent review of both exact feature heads and all coordinator-owned landing/seal operations remain intentionally pending.

## dont_touch

- Do not edit either main checkout in place, rebase/rewrite frozen cycle-one history, or merge/push either main branch.
- Do not create `.github/workflows/**`, hosted evidence/plan/authorization schemas, release-publication or operation-host tooling, attempt ledgers, runners, controllers, tags, releases, or assets.
- Do not author the coordinator-only target-main landing authorization, the independent-reviewer-owned implementation review, or the post-landing bootstrap migration record.
- Do not install, configure clients, touch LaunchAgents, credentials, databases, checkpoints, live state, ports, daemons, or any client/user path.
- Do not change context behavior, Team-product maturity, wiki, unrelated backlog items, item-135 provenance bytes, or unrelated user/agent worktrees.

## canonical_anchors

- spec: backlog/pending_review/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
- reviews: backlog/reviews/2026-07-15-136-echo-context-canonical-repository-release-substrate/r24/
