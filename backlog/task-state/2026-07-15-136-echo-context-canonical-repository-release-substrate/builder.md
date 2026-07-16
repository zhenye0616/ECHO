---
task_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
role: builder
binding: codex
claimed_by: codex-builder-136-20260716
claimed_at: 2026-07-16T08:33:45Z
last_updated: 2026-07-16T09:36:40Z
branch: agent/echo-context-canonical-repository-release-substrate
worktree: /Users/zhenye/Desktop/Project_echo--echo-context-canonical-repository-release-substrate
target_branch: agent/echo-context-canonical-repository-release-substrate
target_worktree: /Users/zhenye/Desktop/echo-context--echo-context-canonical-repository-release-substrate
handoff_branch: agent/echo-context-canonical-repository-release-substrate
handoff_head_sha: 25b833332bb22ec79700fcdf31b9c9f20eea79f5
handoff_run_log: raw/internal/agent-runs/2026-07-16-2026-07-15-136-echo-context-canonical-repository-release-substrate.md
---

## current_thesis

Implemented the reviewed standalone repository, self-contained CI, deterministic non-installable source artifact, and fail-closed first-release controls as the fresh independent Codex builder. Exact hosted-green echo-context review candidate: `145868a67a85dbb651faed457ee4001370c0fad0` / tree `44ae95b77cd2298cd25b915f283b07bd7423100e` / PR `https://github.com/zhenye0616/echo-context/pull/1`.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at 25b833332bb22ec79700fcdf31b9c9f20eea79f5.
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

- Independent implementation review is required before either feature branch may merge.
- The current private-repository/account tier cannot enforce the exact protected-main plus required-environment-reviewer contract, and the sole current repository identity cannot supply an independent required PR approval. The persistent coordinator must disposition and repair this external hosting gate before target-main or release execution.

## dont_touch

- No LaunchAgent, installation, MCP/client registration, port, authentication, live database, checkpoint, config, credential, daemon, or authority transfer.
- No context behavior changes, public package/repository, generic release framework, Project_echo deprecation, echo-brain, echo-loop, or Team-product maturity advance.
- Do not edit target main in place, merge or push either main branch, publish a release, create tags, configure hosting controls, or execute the coordinator's delegated authority.
- Do not edit wiki, item body, unrelated backlog items, historical item-135 provenance bytes, or unrelated user/agent worktrees.

## canonical_anchors

- spec: backlog/pending_review/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
- reviews: backlog/reviews/2026-07-15-136-echo-context-canonical-repository-release-substrate/
