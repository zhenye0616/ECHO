---
task_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
role: strategist
binding: codex
last_updated: 2026-07-16T17:19:57Z
---

## current_thesis

Item 136 is back in proposed after the second independent cycle-two implementation review rejected exact Project head `5b99d896e9103e0047c31d19fc574d7eea92abc5` and target head `1a91750e5b9ce9db49e9c893f9974b318f12f38a`. Two findings are narrow code defects: a terminal child result may arrive after its execution deadline, and `process.once` lets a repeated signal restore the default kill path before cleanup. The third is a specification impossibility: the fixed in-process Node verifier cannot both hard-return within 3,700 seconds from a non-returning synchronous kernel filesystem call and prove no later mutation. R22 must verify the smallest truthful orchestration-deadline cut before implementation resumes.

## locked_decisions

- The founder's 2026-07-16 item-136 cut remains controlling: no hosted workflow, protection, tag, release, or asset work; those surfaces remain item 140.
- Exact cycle-one history remains rejected and frozen. Cycle-two target history is preserved; no rebase, rewrite, or main landing occurs during spec review.
- R21's exact spec SHA and former ready seal are historical only. Any body change removes the seal, returns the item to `proposed/`, and requires same-SHA Codex plus Codex-Ops convergence and a fresh seal.
- Retain the exact authenticated wrapper, canonical 17-step child trace, sole cleanup helper, numeric class deadlines, 120-second final orchestration reserve, TERM-after-timeout then KILL-after-five-seconds ceremony, and no-success/no-advance requirement.
- Reframe 3,700 seconds only as an orchestration deadline under responsive kernel calls. Returning synchronous filesystem calls get monotonic before/after checks; a non-returning call or unproved PGID may keep the invocation pending past `aggregate_end` and is never accepted, advanced, retried, or abandoned.
- Reject alternative supervisors, Worker watchdogs, controllers, or extra production children: they change the reviewed process topology and still cannot prove cancellation of a stuck kernel request.
- The implementation must reject completion after its execution deadline, keep idempotent SIGINT/SIGTERM handlers until explicit post-cleanup disposal, and remain pending on an existing managed handle until direct exit, stream closure, and PGID absence are proven.
- Every medium finding remains blocking. A fresh independent reviewer must rerun the exact target/Project heads after repair and own the implementation-review record.
- Target main landing, Project integration, migration evidence, and completion publication remain separate coordinator operations with immutable single-use authorizations and exact remote readback.

## open_questions

- R22 reviewers must decide only whether the scope correction is internally consistent and testable; they must not reintroduce the removed supervisor/hosted architecture.
- After R22 promotion, the repair builder must report whether waiting for terminal settlement requires an adapter-shape change beyond the two already-local fixes. Any such byte remains independently reviewable.

## dont_touch

- Do not touch either canonical main checkout, rewrite prior target/Project feature history, or push implementation to main during proposal review.
- Do not waive the second-review failure, preserve the stale ready seal, or treat the earlier 60/60 and 1,066-test results as acceptance for repaired bytes.
- Do not add `.github/workflows/**`, hosted/release machinery, a supervisor, Worker watchdog, controller, extra production child, runtime install, state migration, live service mutation, or client-facing behavior.
- Do not change item-135 provenance, items 137–140, Team-product maturity, wiki, echo-brain, echo-loop, credentials, live databases, or unrelated user/agent worktrees.

## canonical_anchors

- spec: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
- review_lineage: backlog/reviews/2026-07-15-136-echo-context-canonical-repository-release-substrate/
- prior_spec_commit: 1c8814406d0667e98cff99784e59df5bb613f8f2
- rejected_project_head: 5b99d896e9103e0047c31d19fc574d7eea92abc5
- rejected_target_head: 1a91750e5b9ce9db49e9c893f9974b318f12f38a
- delegation: raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md
- founder_scope_cut: raw/internal/decisions/2026-07-16-136-defer-github-hosted-gates.md
