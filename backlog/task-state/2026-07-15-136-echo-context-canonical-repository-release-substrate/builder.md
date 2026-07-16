---
task_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
role: builder
binding: codex
claimed_by: codex-builder-136-20260716
claimed_at: 2026-07-16T08:33:45Z
last_updated: 2026-07-16T10:03:40Z
branch: agent/echo-context-canonical-repository-release-substrate
worktree: /Users/zhenye/Desktop/Project_echo--echo-context-canonical-repository-release-substrate
target_branch: agent/echo-context-canonical-repository-release-substrate
target_worktree: /Users/zhenye/Desktop/echo-context--echo-context-canonical-repository-release-substrate
handoff_branch: agent/echo-context-canonical-repository-release-substrate
handoff_head_sha: 25b833332bb22ec79700fcdf31b9c9f20eea79f5
handoff_run_log: raw/internal/agent-runs/2026-07-16-2026-07-15-136-echo-context-canonical-repository-release-substrate.md
---

## current_thesis

Implementation cycle one is rejected after independent review and is historical evidence only. Frozen cycle-one heads are Project_echo `25b833332bb22ec79700fcdf31b9c9f20eea79f5` and echo-context `145868a67a85dbb651faed457ee4001370c0fad0` / tree `44ae95b77cd2298cd25b915f283b07bd7423100e` / PR `https://github.com/zhenye0616/echo-context/pull/1`. R15 findings are accepted and the specification is patched for R16 verification; neither branch may resume, merge, or release until exact-SHA convergence, a fresh content seal, and a fresh builder claim.

<!-- builder-state-handoff:start -->
- Lifecycle: ESCALATED/REJECTED — cycle-one review evidence is sealed at Project_echo commit 77c5e0c3f7f64c0bda1d99439d8d35eca54551ee; specification reopened for R15.
<!-- builder-state-handoff:end -->

## locked_decisions

- AC1: verify the exact clean 0cf7b006 baseline/tree/190-path closure and prepare the reviewed create-only bootstrap contract; the builder never creates the repository or pushes target main.
- AC2: preserve all item-135 provenance bytes, add frozen-baseline and repository-authority records, and move current validation to generated runtime-inventory.v2.json.
- AC3: commit the accepted standalone typecheck/lint configs and exact source/release fresh-clone verifier traces; no Project_echo or live-state dependency is allowed.
- AC4: add immutable-action, least-privilege CI, fail-closed full-history secret scanning, hosting-control verification, and policy fixtures.
- AC5: build exactly one deterministic source-only archive/checksum/manifest triple at version 0.1.0-dev.136.1 with authority:false and installed:false.
- AC6: implement the guarded first-release-only workflow and sole publication controller, but do not merge, publish, release, install, or mutate runtime/state authority in this builder run.
- Project_echo remains the coordination and installed/runtime/state authority throughout this item; echo-context feature work stays on the named target worktree and branch.

## open_questions

- R16+ exact-SHA specification convergence and a fresh claim are required before any cycle-two implementation edit. The pending contract removes remote publication/auth-ref state and requires a correlated read-only build plus the local exact-plan publisher; this is not implementation authority until sealed.
- Cycle-one accepted findings are immutable in `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.review.md`; all high/medium findings remain blocking.

## dont_touch

- No LaunchAgent, installation, MCP/client registration, port, authentication, live database, checkpoint, config, credential, daemon, or authority transfer.
- No context behavior changes, public package/repository, generic release framework, Project_echo deprecation, echo-brain, echo-loop, or Team-product maturity advance.
- Do not edit target main in place, merge or push either main branch, publish a release, create tags, configure hosting controls, or execute the coordinator's delegated authority.
- Do not edit wiki, item body, unrelated backlog items, historical item-135 provenance bytes, or unrelated user/agent worktrees.

## canonical_anchors

- spec: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
- reviews: backlog/reviews/2026-07-15-136-echo-context-canonical-repository-release-substrate/
