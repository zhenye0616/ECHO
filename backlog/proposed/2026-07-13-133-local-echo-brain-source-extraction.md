---
id: 2026-07-13-133-local-echo-brain-source-extraction
title: "Local standalone echo-brain source extraction and parity proof"
status: proposed
priority: HIGH
estimate: 4d
created: 2026-07-13
blocked_by:
  - 2026-07-13-132-product-graduation-foundation
task_state_ref: 2026-07-13-133-local-echo-brain-source-extraction
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - /Users/zhenye/Desktop/echo-brain/**                         # NEW local-only standalone client-product repository; no remote
  - raw/internal/migrations/2026-07-13-133-echo-brain.md       # NEW orchestrator-owned provenance, parity, and local-head record
spec_refs:
  - raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md # locked Team product and client-machine endpoint
  - raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md # maturity and exact-artifact evidence contract
  - raw/internal/decisions/2026-07-12-g2-terminal-dispositions-and-repository-topology.md # T1 product allowlist and copied-code provenance rule
  - raw/internal/decisions/2026-07-12-clarity-halt-lift.md # post-G2 proposal gate and prior extraction ordering being explicitly superseded
  - backlog/complete/2026-07-13-132-product-graduation-foundation.md # shipped in-repo source/package boundary to extract
  - product/source-boundary.v1.json                         # current machine-readable product closure
  - product/package.template.json                          # current echo-brain runtime identity and exact runtime dependencies
  - product/npm-shrinkwrap.json                            # current pinned product runtime dependency tree
  - product/README.md                                      # current DEV-only commands, inherited debt, and handoff
  - wiki/architecture/product-composition-boundary.md      # shipped explanation of the current boundary
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Local standalone echo-brain source extraction and parity proof

## Why this spec exists

The founder has superseded the earlier extraction order: `echo-brain` must become a completely independent source repository before FOUNDER LIVE, while remaining local until parity proves that nothing broke. Item 132 already established a reviewed product-only closure inside `Project_echo`; this item copies that closure from exact committed source SHA `2971310441b69735cbe759293abd8c4d044bf347` into `/Users/zhenye/Desktop/echo-brain`, gives it independent source/build/test/package ownership, and proves it no longer needs the migration repo. `Project_echo` remains the immutable migration source and backup during this item. Authority transfer, remote creation, product feature work, and maturity advancement are separate founder checkpoints.

### AC1 — Create one local Git repository with no remote

`/Users/zhenye/Desktop/echo-brain/.git:1` exists on local branch `migration/2026-07-13-133-local-echo-brain-source-extraction`, contains at least one signed-off-by-content commit whose message names source SHA `2971310441b69735cbe759293abd8c4d044bf347`, and reports no configured remotes from `git remote -v`. The builder must fail before writing if the target directory exists at start. No GitHub API, `gh repo create`, remote URL, tag, release, package publication, or client installation is allowed.

### AC2 — Make echo-brain the complete and accurately named client product

`/Users/zhenye/Desktop/echo-brain/package.json:1` names the private package and binary `echo-brain`, pins Node `22.22.1`, owns its exact runtime and development dependencies, and contains no workspace, `file:`, Git, tarball-path, or absolute-path dependency. `/Users/zhenye/Desktop/echo-brain/src/:1` owns the Team meeting-to-decision-card/brief product composition: canonical meeting input, deterministic product runtime, decision reasoning adapter seam, human approval, local state/health, brief generation, and qualification evidence. Internal symbols may use accurate capability names such as `DecisionReasoner` and `DecisionRuntime`; the whole product remains `echo-brain`.

### AC3 — Copy only the reviewed product closure with durable provenance

`/Users/zhenye/Desktop/echo-brain/provenance/source-extraction.v1.json:1` records schema version, source repository identity, exact source SHA, item 132, boundary version, extraction time, and a sorted mapping for every copied source file: original path, destination path, source blob SHA, destination SHA-256, and disposition (`copied`, `relocated`, or `rewritten`). It contains no meeting content or credential. Small shared utilities may be copied with no synchronization obligation; imports back into `Project_echo`, symlinks, submodules, and generated mirrors are forbidden.

### AC4 — Enforce the client-product source boundary natively

`/Users/zhenye/Desktop/echo-brain/product/source-boundary.v1.json:1` and `/Users/zhenye/Desktop/echo-brain/tools/check-boundary.mjs:1` enforce the standalone repository's full transitive import closure. They reject the internal agent loop, backlog/review assets, coordination, general context capture/retrieval, MCP, developer extractors, Slack/Linear responder, founder CLI brain, unrelated daemon workers, and any path outside the repository. The native boundary test proves zero forbidden edges and verifies that every shipped import resolves from this repository alone.

### AC5 — Own independent configuration, state, build, and artifact identity

`/Users/zhenye/Desktop/echo-brain/schemas/runtime-config.v1.schema.json:1` preserves the client-local Team-product configuration contract with secret references only. `/Users/zhenye/Desktop/echo-brain/src/runtime/paths.ts:1` resolves all mutable state under an explicit installation-local root and cannot read `Project_echo` state implicitly. `/Users/zhenye/Desktop/echo-brain/tools/build-artifact.mjs:1` builds one private DEV artifact from the local repository's committed Git objects, emits manifest and SHA-256 evidence, refuses overwrite, and never shells into or reads the migration repo.

### AC6 — Preserve product behavior at the pinned source boundary

`/Users/zhenye/Desktop/echo-brain/tests/product/:1` ports every current `tests/product/**` contract that applies to the extracted closure and adds a packaged end-to-end synthetic fixture proving `meeting input -> extraction adapter -> manual review gate -> brief artifacts` without network, live credentials, founder state, or wall clock. Any intentional path-only assertion changes are documented in the provenance record; runtime behavior changes are forbidden. `selftest` remains honest: maturity `DEV`, production API brain pending, and `wedge_executed:false` until later items supply those capabilities.

### AC7 — Prove native source independence and parity

`/Users/zhenye/Desktop/echo-brain/tests/migration/source-independence.test.ts:1` fails on symlinks, submodules, absolute `Project_echo` paths outside the allowed provenance value, imports escaping the repository, and forbidden dependency schemes. The verification sequence runs from the native repository with a sanitized environment and a temporarily inaccessible source checkout path: clean dependency install from its own lock, typecheck, lint, boundary check, product tests, artifact build, installed-artifact `validate-config`, and installed-artifact `selftest`. `/Users/zhenye/Desktop/Project_echo/raw/internal/migrations/2026-07-13-133-echo-brain.md:1` records commands, exit codes, local head SHA, artifact version/SHA-256, closure counts, and any differences.

### AC8 — Stop before authority transfer

The migration record explicitly says `candidate_authority: false`, `remote_created: false`, and `maturity: DEV`. No existing `Project_echo` product path is deleted, frozen, redirected, or declared stale. A later founder checkpoint may accept the local repository, make it authoritative, and authorize a private remote; this item only produces the reviewable local candidate and parity evidence.

## Out of Scope (Don't Drift)

- Do not create or configure a remote, GitHub repository, tag, release, package publication, or deployment.
- Do not implement rank-2 cutoff/newest-first, the API-key brain, decision-card redesign, org-context retrieval, delivery, launchd, or any other product feature.
- Do not extract `echo-loop` or `echo-context`; sibling items 134 and 135 own those repositories.
- Do not import source or runtime packages from the sibling repositories.
- Do not move, delete, rename, or freeze files in `Project_echo`.
- Do not access real meetings, live databases, credentials, Keychain, or client data.
- Do not advance beyond DEV or create FOUNDER LIVE/QUALIFIED/CLIENT LIVE evidence.
- Do not touch the holdout-131 worktree or branch.

## Risks

- **Hidden dev dependency:** the shipped runtime closure is smaller than the source/test/build closure. Mitigation: native clean install plus typecheck/test/artifact build from the new lockfile; missing dev types, including `@types/node`, are blocking.
- **False independence:** path scans can miss runtime child-process reads. Mitigation: sanitized environment, source checkout made inaccessible during verification, and the existing child-process owner fence.
- **Behavior drift during relocation:** import/path rewrites can subtly change config or artifacts. Mitigation: port item-132 contracts first, allow only path-only assertion changes, and record every rewritten file.
- **Premature authority:** a green local clone may be mistaken for released product. Mitigation: explicit false authority/remote fields and unchanged DEV maturity.

## Tests

- `/Users/zhenye/Desktop/echo-brain/tests/product/import-fence.test.ts` — zero forbidden imports and complete native closure.
- `/Users/zhenye/Desktop/echo-brain/tests/product/runtime-isolation.test.ts` — only product components boot; local state and fail-closed behavior remain intact.
- `/Users/zhenye/Desktop/echo-brain/tests/product/packaged-product.test.ts` — the locally built artifact installs and runs config/selftest without the source repo.
- `/Users/zhenye/Desktop/echo-brain/tests/product/end-to-end-synthetic.test.ts` — synthetic meeting through manual gate to brief artifacts.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/source-independence.test.ts` — no symlink/submodule/path/dependency escape.
- Commands: `npm ci`, `npm run typecheck`, `npm run lint`, `npm run check:boundary`, `npm test`, `npm run build:artifact`, installed `echo-brain validate-config`, installed `echo-brain selftest`, and `git diff --check` in the local repository.

## After Completion (Strategist Notes)

- Do not update the wiki or transfer authority yet; the repo is a local DEV candidate only.
- After founder accepts parity, record a separate authority-transfer/remote-publication proposal and freeze the old product paths in that later item.
- Rank 2 and rank 3 product work must land in the authoritative repository chosen by that later checkpoint, never simultaneously in both places.
