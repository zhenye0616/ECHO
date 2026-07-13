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
  - tools/repository-extraction/echo-brain.mjs                 # NEW orchestrator-owned start/resume/status/publish/handoff entrypoint
  - tools/repository-extraction/profiles/echo-brain.sb.in      # NEW scoped source/network/write sandbox policy template
  - tests/repository-extraction/echo-brain.test.ts             # NEW lifecycle, failpoint, publication, and handoff tests
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

The committed orchestrator entrypoint is `node tools/repository-extraction/echo-brain.mjs <start|resume|status|quarantine-lock|verify-handoff>`. `start` requires `--run-id <uuid> --source-sha 2971310441b69735cbe759293abd8c4d044bf347`; `resume` additionally requires the prior run ID and expected stale-owner nonce; tests may use `--fault-after <named-checkpoint>`, which production rejects unless `ECHO_EXTRACTION_TEST_MODE=1`. Exit codes are fixed: `0` success, `64` usage, `65` corrupt evidence, `73` target/lock conflict, `74` I/O failure, `75` live owner, `76` handoff mismatch, and `78` failed preflight. Stdout is one JSON result; stderr and the external state file hold durable diagnostics.

All mutable lifecycle state stays outside the candidate at `/Users/zhenye/Desktop/.echo-extractions/133/<run-id>/state.json`; each update uses temp-write, file fsync, rename, and parent fsync. The target lock directory is acquired with atomic `mkdir` and records item, source SHA, run ID, cryptographic nonce, PID, and `ps` process-start identity. Children receive the nonce and may validate but never reacquire the extraction lock. A live matching owner rejects resume; a stale/ownerless lock is never auto-adopted or deleted and requires `quarantine-lock` with expected nonce—or expected inode+mtime when ownerless—and a non-empty operator reason before the same run may resume under a new nonce. Per-command checkpoints and run-scoped exact hashes permit reuse after interruption, including immediately after artifact creation. Unknown/mismatched state, staging, locks, or targets are refused and preserved.

Before publication, external state is fsynced at `ready_to_publish` with expected run/item/source, branch, HEAD, tree, provenance, test-evidence, and artifact hashes. `provenance/candidate.v1.json` is immutable and committed before verification with run/item/source identity. Publication uses a capability-preflighted macOS `renameatx_np(..., RENAME_EXCL)` helper and parent-directory fsync, never ordinary replace-capable rename. If interrupted after no-replace rename, `resume` enters reconcile-only mode and may finish report/state/unlock only when the final candidate's committed identity, HEAD/tree/hashes, cleanliness, branch, and empty remote set exactly match `ready_to_publish`; otherwise it exits `65`/`76` without mutation. Failpoints cover lock mkdir-before-owner, every build/verify checkpoint, after rename, after report, after external `published`, and before lock release, plus a foreign target created immediately before publish. `/Users/zhenye/Desktop/echo-brain/.git:1` ends clean on branch `migration/2026-07-13-133-local-echo-brain-source-extraction`, with no remote. No GitHub API, remote, tag, release, publication, or client installation is allowed.

### AC2 — Make echo-brain the complete and accurately named client product

`/Users/zhenye/Desktop/echo-brain/package.json:1` names the private package and binary `echo-brain`, sets `engines.node` to exactly `22.22.1`, sets `packageManager` to `npm@10.9.4`, and contains no workspace, `file:`, Git, tarball-path, or absolute-path dependency. A committed `/Users/zhenye/Desktop/echo-brain/package-lock.json:1` is the sole clean-install lock. `provenance/dependency-set.v1.json:1` deterministically derives direct dependencies from all bare imports in the final source/build/test closure and pins each to the exact version resolved by the source SHA's package lock; the fixed dev-tool set (`typescript`, `vitest`, `eslint`, `@types/node`) is pinned the same way. A checker fails on missing, extra, range-valued, or mismatched direct dependencies. Before writes, the extractor resolves and capability-checks Git, Node, npm, Python 3/`renameatx_np`, `/usr/bin/sandbox-exec`, `/usr/bin/shasum`, and the bounded-timeout supervisor, recording paths and versions; Node must be `v22.22.1` and npm `10.9.4`. `/Users/zhenye/Desktop/echo-brain/src/:1` owns the Team meeting-to-decision-card/brief product composition: canonical meeting input, deterministic product runtime, decision reasoning adapter seam, human approval, local state/health, brief generation, and qualification evidence. Internal symbols may use accurate capability names such as `DecisionReasoner` and `DecisionRuntime`; the whole product remains `echo-brain`.

### AC3 — Copy only the reviewed product closure with durable provenance

`/Users/zhenye/Desktop/echo-brain/provenance/source-extraction.v1.json:1` records schema version, source repository identity, exact source SHA, item 132, boundary version, extraction time, and a sorted mapping for every copied source file: original path, destination path, source blob SHA, destination SHA-256, disposition (`copied`, `relocated`, or `rewritten`), change reason, and an enumerated literal/path rewrite allowlist when rewritten. Source bytes are read only from `git show <source-sha>:<path>` or an equivalent commit-object archive, never from the dirty source worktree. It contains no meeting content or credential. Small shared utilities may be copied with no synchronization obligation; imports back into `Project_echo`, symlinks, submodules, and generated mirrors are forbidden.

### AC4 — Enforce the client-product source boundary natively

`/Users/zhenye/Desktop/echo-brain/product/source-boundary.v1.json:1` and `/Users/zhenye/Desktop/echo-brain/tools/check-boundary.mjs:1` enforce the standalone repository's full transitive import closure. They reject the internal agent loop, backlog/review assets, coordination, general context capture/retrieval, MCP, developer extractors, Slack/Linear responder, founder CLI brain, unrelated daemon workers, and any path outside the repository. The native boundary test proves zero forbidden edges and verifies that every shipped import resolves from this repository alone.

### AC5 — Own independent configuration, state, build, and artifact identity

`/Users/zhenye/Desktop/echo-brain/schemas/runtime-config.v1.schema.json:1` preserves the client-local Team-product configuration contract with secret references only. `/Users/zhenye/Desktop/echo-brain/src/runtime/paths.ts:1` resolves all mutable state under an explicit installation-local root and cannot read `Project_echo` state implicitly. `/Users/zhenye/Desktop/echo-brain/tools/build-artifact.mjs:1` never acquires the extraction lock: the nonce-owning orchestrator invokes it with `--expected-head`, `--run-output`, and a distinct run-scoped artifact-lock path. It rejects a dirty tree including untracked files except its declared ignored output root, exports the expected commit with `git archive`, and builds only from that archive. Output is written under the external run directory, checkpointed by exact input/output hashes, reused only on an exact resume match, and atomically promoted once. Its manifest contains candidate HEAD/tree and artifact SHA-256. Trap/finally cleanup removes successful scratch outputs and preserves failed paths in external state; the candidate tree and HEAD never change after verification.

### AC6 — Preserve product behavior at the pinned source boundary

`/Users/zhenye/Desktop/echo-brain/provenance/test-parity.v1.json:1` inventories exactly the eight files returned at the pinned SHA by `git ls-tree -r --name-only 2971310441b69735cbe759293abd8c4d044bf347 -- tests/product`: `build-once-contract.test.ts`, `hermeticity.test.ts`, `import-fence.test.ts`, `packaged-product.test.ts`, `qualification-report.test.ts`, `runtime-config.test.ts`, `runtime-isolation.test.ts`, and `setup.ts`. During extraction, each row records source blob/SHA-256, destination, disposition, ordered literal substitution map, LF-normalized source hash, and expected transformed hash computed by applying only that map to commit-object bytes; exclusions require boundary rationale. The extraction-time source comparison is checkpointed before isolation. Standalone `/Users/zhenye/Desktop/echo-brain/tools/check-test-parity.mjs:1` needs no source objects: it verifies the signed evidence digest, eight one-to-one rows, substitutions, and each destination's normalized hash against the expected transformed hash. Assertion, fixture-data, or expected-runtime edits fail. The additional synthetic end-to-end test is marked `new` and excluded from the eight-source/destination count equality.

`/Users/zhenye/Desktop/echo-brain/tests/product/:1` also adds a packaged end-to-end synthetic fixture proving `meeting input -> extraction adapter -> manual review gate -> brief artifacts` without external network, live credentials, founder state, or wall clock. Runtime behavior changes are forbidden. `selftest` remains honest: maturity `DEV`, production API brain pending, and `wedge_executed:false` until later items supply those capabilities.

### AC7 — Prove native source independence and parity

`/Users/zhenye/Desktop/echo-brain/tests/migration/source-independence.test.ts:1` fails on symlinks, submodules, absolute `Project_echo` paths outside the allowed provenance value, imports escaping the repository, undeclared child-process access, and forbidden dependency schemes. The orchestrator renders `tools/repository-extraction/profiles/echo-brain.sb.in` with candidate and run-scratch paths; `/usr/bin/sandbox-exec` denies source reads, all external network, and writes outside the candidate verification copy plus declared scratch. Preflight proves a source sentinel and adversarial external write fail while required scratch writes succeed; host rename/chmod/unmount is forbidden. Under `env -i` with resolved `PATH`, scratch `HOME`, `TMPDIR`, `ECHO_BRAIN_HOME`, and fixed locale/timezone, the bounded process-group supervisor runs `npm ci --ignore-scripts=false --no-audit --no-fund`, `npm run typecheck`, `npm run lint`, `npm run check:dependencies`, `npm run check:boundary`, `npm run check:test-parity`, `npm test`, `npm run build:artifact -- --expected-head ... --run-output ...`, `npm run smoke:installed`, installed `validate-config`, and installed `selftest`. It kills the whole process group on timeout/signal and records remaining PIDs before failing. Mutable diagnostics go only to external state.

The migration record is written only at repository-relative `raw/internal/migrations/2026-07-13-133-echo-brain.md` in the active orchestrator worktree, never through the founder's canonical checkout path. It records every command and exit code, resolved toolchain, run/staging IDs, candidate HEAD, artifact version/SHA-256, source/test inventory counts, provenance hash, and differences.

### AC8 — Stop before authority transfer

The migration record explicitly says `candidate_authority:false`, `remote_created:false`, and `maturity:DEV`, plus final path, branch, clean HEAD/tree, provenance/test/dependency/artifact hashes, exact commands, and porcelain output. Independent review begins with `node tools/repository-extraction/echo-brain.mjs verify-handoff --record raw/internal/migrations/2026-07-13-133-echo-brain.md`; this read-only command verifies record schema, target/object existence, committed candidate identity, HEAD/tree/hashes, branch, cleanliness including untracked files, and no remotes, emitting JSON and exit `76` on any mismatch. The candidate is preserved at that HEAD until disposition. No current product path is deleted/frozen/redirected. A later founder checkpoint may transfer authority and authorize a private remote.

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
- **False independence:** path scans can miss runtime child-process reads. Mitigation: process-scoped `sandbox-exec` denial inherited by child processes, a negative sentinel assertion, sanitized environment, and the existing child-process owner fence.
- **Behavior drift during relocation:** import/path rewrites can subtly change config or artifacts. Mitigation: port item-132 contracts first, allow only path-only assertion changes, and record every rewritten file.
- **Premature authority:** a green local clone may be mistaken for released product. Mitigation: explicit false authority/remote fields and unchanged DEV maturity.

## Tests

- `/Users/zhenye/Desktop/echo-brain/tests/product/import-fence.test.ts` — zero forbidden imports and complete native closure.
- `/Users/zhenye/Desktop/echo-brain/tests/product/runtime-isolation.test.ts` — only product components boot; local state and fail-closed behavior remain intact.
- `/Users/zhenye/Desktop/echo-brain/tests/product/packaged-product.test.ts` — the locally built artifact installs and runs config/selftest without the source repo.
- `/Users/zhenye/Desktop/echo-brain/tests/product/end-to-end-synthetic.test.ts` — synthetic meeting through manual gate to brief artifacts.
- `tests/repository-extraction/echo-brain.test.ts` — orchestrator start/resume/status/quarantine/handoff commands, all failpoints, live/stale/ownerless locks, no-replace publication, and reconcile-only recovery.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/test-parity.test.ts` — exact eight-file inventory and literal-only rewrite enforcement.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/dependency-set.test.ts` — bare-import-derived direct dependency set is complete, exact, and has no extras.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/source-independence.test.ts` — no symlink/submodule/path/dependency escape.
- Commands: `npm ci --ignore-scripts=false --no-audit --no-fund`, `npm run typecheck`, `npm run lint`, `npm run check:boundary`, `npm run check:test-parity`, `npm test`, `npm run build:artifact`, `npm run smoke:installed`, installed `echo-brain validate-config`, installed `echo-brain selftest`, `tools/verify-source-independence.sh`, and `git diff --check` in the local repository. Every command has a package script or repository-owned executable and a non-zero failure contract.

## After Completion (Strategist Notes)

- Do not update the wiki or transfer authority yet; the repo is a local DEV candidate only.
- After founder accepts parity, record a separate authority-transfer/remote-publication proposal and freeze the old product paths in that later item.
- Rank 2 and rank 3 product work must land in the authoritative repository chosen by that later checkpoint, never simultaneously in both places.
