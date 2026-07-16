---
task_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
role: builder
binding: codex
claimed_by: codex-136-cycle3-builder-mendel-222cc09b
claimed_at: 2026-07-16T18:42:07Z
last_updated: 2026-07-16T19:17:40Z
branch: agent/echo-context-canonical-repository-release-substrate
worktree: /Users/zhenye/Desktop/Project_echo--echo-context-canonical-repository-release-substrate
target_branch: agent/echo-context-canonical-repository-release-substrate
target_worktree: /Users/zhenye/Desktop/echo-context--echo-context-canonical-repository-release-substrate
handoff_branch: agent/echo-context-canonical-repository-release-substrate
target_head_sha: ad370ae0a666f366e1ff93c9ec5b920763e9cbb8
target_tree_sha: 3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec
handoff_run_log: raw/internal/agent-runs/2026-07-16-2026-07-15-136-echo-context-canonical-repository-release-substrate.md
---

## current_thesis

R24 converged at exact spec commit `f80003a7fbd08755dbff669951ed07bf43b390d0` with ready seal `a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca`. Formal reviewer `codex-136-final-reviewer-b9e01c42` rejected target `02af4e411077063d2cf5d4931bd3e9c1c0f0a5c7` with zero HIGH and exactly three MEDIUM AC3 findings. Fresh builder `codex-136-cycle3-builder-mendel-222cc09b` preserved both feature histories and repaired only complete-terminal deadline rescue, monotonic production time, and per-call synchronous-filesystem deadline checks. The immutable target review candidate is now head `ad370ae0a666f366e1ff93c9ec5b920763e9cbb8`, tree `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`; the three exact reproducers, every exact-head gate, isolated and canonical HTTPS acceptances, and a fresh read-only oracle passed. Landing, tuple sealing, release, install, and authority transfer remain with a different independent reviewer and the persistent coordinator.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — exact target head `ad370ae0a666f366e1ff93c9ec5b920763e9cbb8` is pushed, read back through both feature and PR refs, and ready for independent implementation review.
<!-- builder-state-handoff:end -->

## locked_decisions

- AC1: retain the completed repository/bootstrap history as immutable evidence and keep only the injected local repository-bootstrap gate plus exact scanner contract; never repeat either external operation.
- AC2: preserve item-135 bytes, bind the frozen baseline and successor authority, generate runtime-inventory.v2 for the evolving successor tree, and state the source/runtime authority split honestly.
- AC3: retain the sole source-mode 17-step trace and exact toolchain/environment. The 3,700-second value is an orchestration deadline under responsive kernel calls; no-PID pre-spawn failures and positive-PID spawned children have separate exhaustive terminal proofs, and no outcome reports or advances before its same-handle proof completes.
- AC4: delete every workflow and hosted/release surface; a different fresh reviewer must rerun AC3 at exact target head before the coordinator constructs and authorizes literal merge object `M`.
- AC5: build the deterministic `0.1.0-dev.136.1` source archive/checksum/manifest triple from committed Git objects with `installable:false`, `runtime_authority:false`, and `state_authority:false`.
- AC6: dual-build sealing and the final bootstrap migration record occur only after coordinator landing at canonical `M`; the builder removed the premature cycle-one Project_echo bootstrap record and stops at pending review.
- Verification at exact head `ad370ae0a666f366e1ff93c9ec5b920763e9cbb8` passed all three pinned formal reproducers, the 49-test AC3 focus set, typecheck, lint, inventory (340 packages / 23 sources), authority, all 78 CI files (1,086 passed / 17 skipped), four-ref exhaustive secret scan, two-test pinned operator replay, isolated no-local/no-hardlinks acceptance, and canonical HTTPS acceptance with exactly four advertised refs. A fresh read-only oracle found zero HIGH/MEDIUM blockers at the exact head/tree.

## open_questions

- None. Independent review and all coordinator-owned landing/seal operations remain intentionally pending.

## dont_touch

- Do not edit either main checkout in place, rebase/rewrite frozen cycle-one history, or merge/push either main branch.
- Do not create `.github/workflows/**`, hosted evidence/plan/authorization schemas, release-publication or operation-host tooling, attempt ledgers, runners, controllers, tags, releases, or assets.
- Do not author the coordinator-only target-main landing authorization, independent-review record, or post-landing bootstrap migration record.
- Do not install, configure clients, touch LaunchAgents, credentials, databases, checkpoints, live state, ports, daemons, or any client/user path.
- Do not change context behavior, Team-product maturity, wiki, unrelated backlog items, item-135 provenance bytes, or unrelated user/agent worktrees.

## canonical_anchors

- spec: backlog/claimed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
- reviews: backlog/reviews/2026-07-15-136-echo-context-canonical-repository-release-substrate/r24/
