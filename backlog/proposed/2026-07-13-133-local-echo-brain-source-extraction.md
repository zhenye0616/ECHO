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

The committed orchestrator entrypoint is `node tools/repository-extraction/echo-brain.mjs <start|resume|status|quarantine-lock|verify-handoff>`. `start` requires `--run-id <uuid> --source-sha 2971310441b69735cbe759293abd8c4d044bf347`; `quarantine-lock` requires run ID plus expected stale nonce (or ownerless inode+mtime) and reason and atomically returns `{new_nonce,resume_token,quarantine_path}`; `resume` requires run ID plus that single-use resume token. Exit codes are `0`, `64` usage, `65` corrupt evidence, `73` conflict, `74` I/O, `75` live owner, `76` handoff mismatch, and `78` preflight. Stdout is one JSON result; stderr/state hold diagnostics. `--fault-after`, `--target-root`, `--state-root`, `--staging-root`, `--record-root`, and `--source-root` are accepted only with `ECHO_EXTRACTION_TEST_MODE=1` and rejected in production; every lifecycle/concurrency test uses unique temporary roots.

Production uses one target-keyed lock `/Users/zhenye/Desktop/.echo-extractions/locks/echo-brain.lock` across all run IDs. Start/resume/quarantine transitions serialize under an OS-released `fcntl` exclusive advisory guard whose helper bytes are embedded in and hashed with `echo-brain.mjs`. While holding the guard, quarantine verifies owner and supervised PGID liveness, TERM/KILLs and probes a stale group if needed, moves old lock to immutable quarantine with `RENAME_EXCL`, fsyncs, creates the reserved replacement owner with new nonce and hashed one-use token, then returns the token; concurrent attempts yield one winner. Resume consumes that token under the guard and binds the current PID/start identity. An ownerless mkdir window is recoverable only through inode+mtime quarantine. Tests cover distinct-run simultaneous starts, two quarantiners/resumers, token replay, and crash-before-owner.

Mutable state stays at `/Users/zhenye/Desktop/.echo-extractions/133/<run-id>/state.json` with atomic/fsynced updates. Before any candidate write, the tool requires its own script/profile/helper paths clean and committed, and records orchestrator commit plus blob/SHA-256 identities; every resume, quarantine, checkpoint, reconcile, publish, and handoff rejects changed commits or bytes. Before spawning, a child wrapper waits on a parent pipe; the parent persists child PGID, leader start identity, command/input hashes, and nonce, then releases the pipe. EOF before release exits; after release, quarantine/resume must prove the entire recorded group dead and no staging/output/socket handle active. Per-command exact-hash checkpoints permit safe reuse. Unknown/mismatched state, staging, locks, targets, or control-plane identities are preserved and refused.

Before publication, the tool deterministically renders the complete migration record into the external run dir, including immutable artifact path/manifest/hash, and stores its canonical SHA-256. External `ready_to_publish` binds that record digest plus run/item/source, orchestrator identity, branch, HEAD/tree, provenance, test-evidence, dependency, and artifact hashes. `provenance/candidate.v1.json` is immutable and committed. Publication uses preflighted `renameatx_np(..., RENAME_EXCL)` plus parent fsync. Reconcile may atomically publish the pre-rendered record by temp-write/fsync/rename/parent-fsync or accept only an existing byte-identical record, then finish state/unlock only when all candidate and control hashes match. Failpoints cover every boundary through unlock and a foreign-target race. `/Users/zhenye/Desktop/echo-brain/.git:1` ends clean on the migration branch, with no remote.

### AC2 — Make echo-brain the complete and accurately named client product

`/Users/zhenye/Desktop/echo-brain/package.json:1` names the private package and binary `echo-brain`, pins Node/npm, and contains no source-path dependency; committed `package-lock.json` is the install lock. `dependency-set.v1.json` derives exact direct packages from final bare imports plus fixed dev tools. Runtime file reads, package-script executables, and literal child-process binaries are also classified: npm binaries bind exact packages, while system/compiler/native-build tools bind recorded capability preflights or require rewrite/exclusion. Missing, extra, ranged, or undeclared runtime edges fail. Before writes, Git, Node `v22.22.1`, npm `10.9.4`, Python/RENAME_EXCL, sandbox-exec, shasum, timeout supervisor, and install-script tools are recorded. `/Users/zhenye/Desktop/echo-brain/src/:1` owns the Team meeting-to-decision-card/brief product composition; internal capability names remain precise while the product is `echo-brain`.

### AC3 — Copy only the reviewed product closure with durable provenance

`/Users/zhenye/Desktop/echo-brain/provenance/source-extraction.v1.json:1` records schema version, source repository identity, exact source SHA, item 132, boundary version, extraction time, and a sorted mapping for every copied source file: original path, destination path, source blob SHA, destination SHA-256, disposition (`copied`, `relocated`, or `rewritten`), change reason, and an enumerated literal/path rewrite allowlist when rewritten. Source bytes are read only from `git show <source-sha>:<path>` or an equivalent commit-object archive, never from the dirty source worktree. It contains no meeting content or credential. Small shared utilities may be copied with no synchronization obligation; imports back into `Project_echo`, symlinks, submodules, and generated mirrors are forbidden.

### AC4 — Enforce the client-product source boundary natively

`/Users/zhenye/Desktop/echo-brain/product/source-boundary.v1.json:1` and `/Users/zhenye/Desktop/echo-brain/tools/check-boundary.mjs:1` enforce the standalone repository's full transitive import closure. They reject the internal agent loop, backlog/review assets, coordination, general context capture/retrieval, MCP, developer extractors, Slack/Linear responder, founder CLI brain, unrelated daemon workers, and any path outside the repository. The native boundary test proves zero forbidden edges and verifies that every shipped import resolves from this repository alone.

### AC5 — Own independent configuration, state, build, and artifact identity

`/Users/zhenye/Desktop/echo-brain/schemas/runtime-config.v1.schema.json:1` preserves the client-local Team-product configuration contract with secret references only. `/Users/zhenye/Desktop/echo-brain/src/runtime/paths.ts:1` resolves mutable state under an explicit install-local root. `/Users/zhenye/Desktop/echo-brain/tools/build-artifact.mjs:1` never acquires the extraction lock. Exact invocation is `npm run build:artifact -- --expected-head <sha> --run-output <dir> --artifact-lock <state-root>/133/<run-id>/artifact.lock --artifact-owner-token <nonce>`. The artifact lock is atomic-mkdir and binds run/head/input hashes, PID/start, and nonce; acquisition, live rejection, stale quarantine, exact-hash resume, output checkpoint fsync, and release occur under the same target guard, with release only after external checkpoint durability. Tests cover overlapping builds, killed owner, stale recovery, token mismatch, and resume after artifact emission. The build rejects dirty input, exports expected HEAD via `git archive`, atomically promotes run-scoped output once, and emits HEAD/tree/artifact SHA-256; candidate HEAD never changes.

### AC6 — Preserve product behavior at the pinned source boundary

`/Users/zhenye/Desktop/echo-brain/provenance/test-parity.v1.json:1` inventories exactly the eight pinned `tests/product` files. Each row records source blob/SHA-256, destination, disposition, ordered literal substitution map, LF-normalized source hash, and expected transformed hash; exclusions require rationale. Canonical evidence bytes are UTF-8 JSON with recursively sorted object keys, preserved array order, integers, and one terminal LF; their SHA-256 is bound in committed `candidate.v1.json`, external `ready_to_publish`, and the pre-rendered migration record—no signature or credential. Standalone `check-test-parity.mjs` verifies those bindings, eight rows, substitutions, and destination normalized hashes. The new synthetic test is marked `new` outside count equality.

`/Users/zhenye/Desktop/echo-brain/tests/product/:1` also adds a packaged end-to-end synthetic fixture proving `meeting input -> extraction adapter -> manual review gate -> brief artifacts` without external network, live credentials, founder state, or wall clock. Runtime behavior changes are forbidden. `selftest` remains honest: maturity `DEV`, production API brain pending, and `wedge_executed:false` until later items supply those capabilities.

### AC7 — Prove native source independence and parity

`/Users/zhenye/Desktop/echo-brain/tests/migration/source-independence.test.ts:1` enforces no source/sibling escape. Before isolation, checkpoint `dependency-cache-ready` runs `npm ci --ignore-scripts --cache <run>/npm-cache` from the candidate lock in a scratch acquisition copy, allowing registry fetch only for lockfile `resolved` URLs, verifies every integrity field, writes a sorted content-hash cache manifest, records its digest, deletes acquisition `node_modules`, and capability-checks every install-script compiler/binary edge. Sandbox preflight denies source reads, all network, and external writes while permitting declared scratch.

Under `env -i` with explicit `npm_config_cache=<run>/npm-cache`, scratch roots, and resolved PATH, the process-group supervisor runs `npm ci --offline --cache <run>/npm-cache --ignore-scripts=false --no-audit --no-fund`, checks, tests, exact `npm run build:artifact -- --expected-head <sha> --run-output <dir> --artifact-lock <state-root>/133/<run-id>/artifact.lock --artifact-owner-token <nonce>`, smoke, validate-config, and selftest. A genuinely empty operator cache succeeds from staged cache; deleting any required cache object makes offline install fail durably. Timeout/signal kills the recorded group and probes survivors.

The migration record is written only at repository-relative `raw/internal/migrations/2026-07-13-133-echo-brain.md` in the active orchestrator worktree, never through the founder's canonical checkout path. It records every command and exit code, resolved toolchain, run/staging IDs, candidate HEAD, artifact version/SHA-256, source/test inventory counts, provenance hash, and differences.

### AC8 — Stop before authority transfer

The migration record says false authority/remote and DEV, plus final path, branch, clean HEAD/tree, orchestrator/cache/provenance/test/dependency hashes, exact commands, and immutable artifact path/manifest/hash. Review runs `node tools/repository-extraction/echo-brain.mjs verify-handoff --record <record> --state <published-state> --expected-item 2026-07-13-133-local-echo-brain-source-extraction --expected-source-sha 2971310441b69735cbe759293abd8c4d044bf347 --expected-run-id <run-id>`. It compares trusted flags across external state, record, and committed identity; verifies record digest, control-plane identity, Git objects/tree/cleanliness/branch/no-remotes, reopens artifact+manifest bytes and rehashes them, and exits `76` on mismatch. Candidate/artifact are preserved through disposition.

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
- `tests/repository-extraction/echo-brain.test.ts` — commands/failpoints; live/stale/ownerless locks; no-replace/reconcile; cold-cache/offline failure; dirty-control refusal; orphan-group cleanup; distinct-run locking; isolated roots; deterministic record and artifact rehash handoff.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/test-parity.test.ts` — exact eight-file inventory and literal-only rewrite enforcement.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/dependency-set.test.ts` — bare-import-derived direct dependency set is complete, exact, and has no extras.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/source-independence.test.ts` — no symlink/submodule/path/dependency escape.
- Commands include offline `npm ci --offline --cache <run>/npm-cache --ignore-scripts=false --no-audit --no-fund`, typecheck/lint/boundary/parity/tests, exact `npm run build:artifact -- --expected-head <sha> --run-output <dir> --artifact-lock <state-root>/133/<run-id>/artifact.lock --artifact-owner-token <nonce>`, installed smoke/config/selftest, source-independence, and `git diff --check`; every command is checkpointed with non-zero failure.

## After Completion (Strategist Notes)

- Do not update the wiki or transfer authority yet; the repo is a local DEV candidate only.
- After founder accepts parity, record a separate authority-transfer/remote-publication proposal and freeze the old product paths in that later item.
- Rank 2 and rank 3 product work must land in the authoritative repository chosen by that later checkpoint, never simultaneously in both places.
