---
task_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
role: builder
binding: codex
claimed_by: codex-136-cycle2-builder-7f6a2d31
claimed_at: 2026-07-16T15:40:53Z
last_updated: 2026-07-16T16:08:28Z
branch: agent/echo-context-canonical-repository-release-substrate
worktree: /Users/zhenye/Desktop/Project_echo--echo-context-canonical-repository-release-substrate
target_branch: agent/echo-context-canonical-repository-release-substrate
target_worktree: /Users/zhenye/Desktop/echo-context--echo-context-canonical-repository-release-substrate
handoff_branch: agent/echo-context-canonical-repository-release-substrate
handoff_head_sha: 59db3c608ecbb3af0e7723e960bd80748d9e1326
handoff_run_log: raw/internal/agent-runs/2026-07-16-2026-07-15-136-echo-context-canonical-repository-release-substrate.md
---

## current_thesis

Cycle two repairs the frozen cycle-one Project_echo head `25b833332bb22ec79700fcdf31b9c9f20eea79f5` and echo-context head `145868a67a85dbb651faed457ee4001370c0fad0` without rebasing or rewriting either history. The reviewed R21 cut keeps the local source substrate and deterministic artifact, deletes all hosted/release/controller machinery, and hands exact feature heads to an independent reviewer. This builder never lands target main, authors an approval, seals at canonical `M`, releases, installs, or changes runtime/state authority.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at 59db3c608ecbb3af0e7723e960bd80748d9e1326.
<!-- builder-state-handoff:end -->

## locked_decisions

- AC1: retain the completed repository/bootstrap history as immutable evidence and keep only the injected local repository-bootstrap gate plus exact scanner contract; never repeat either external operation.
- AC2: preserve item-135 bytes, bind the frozen baseline and successor authority, generate runtime-inventory.v2 for the evolving successor tree, and state the source/runtime authority split honestly.
- AC3: provide the sole source-mode fresh-clone acceptance trace with exact authenticated toolchain, scrubbed environment, bounded cleanup, one artifact build/verify, and no sibling or live-state dependency.
- AC4: delete every workflow and hosted/release surface; a different fresh reviewer must rerun AC3 at exact target head before the coordinator constructs and authorizes literal merge object `M`.
- AC5: build the deterministic `0.1.0-dev.136.1` source archive/checksum/manifest triple from committed Git objects with `installable:false`, `runtime_authority:false`, and `state_authority:false`.
- AC6: dual-build sealing and the final bootstrap migration record occur only after coordinator landing at canonical `M`; the builder must remove the premature cycle-one Project_echo bootstrap record and stop at pending review.
- No target main push, Project main implementation merge, tag, hosted release, artifact publication, install, live mutation, retry/adoption controller, attempt ledger, credential helper, or authority transfer belongs to this builder.

## open_questions

- None. Any implementation ambiguity or failed mandatory gate will be escalated to the persistent coordinator rather than guessed.

## dont_touch

- Do not edit either main checkout in place, rebase/rewrite frozen cycle-one history, or merge/push either main branch.
- Do not create `.github/workflows/**`, hosted evidence/plan/authorization schemas, release-publication or operation-host tooling, attempt ledgers, runners, controllers, tags, releases, or assets.
- Do not author the coordinator-only target-main landing authorization, the independent-reviewer-owned implementation review, or the post-landing bootstrap migration record.
- Do not install, configure clients, touch LaunchAgents, credentials, databases, checkpoints, live state, ports, daemons, or any client/user path.
- Do not change context behavior, Team-product maturity, wiki, unrelated backlog items, item-135 provenance bytes, or unrelated user/agent worktrees.

## canonical_anchors

- spec: backlog/pending_review/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
- reviews: backlog/reviews/2026-07-15-136-echo-context-canonical-repository-release-substrate/r21/
