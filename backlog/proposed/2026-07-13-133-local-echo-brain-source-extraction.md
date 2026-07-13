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
  - tools/repository-extraction/echo-brain.mjs                 # NEW orchestrator-owned one-shot extract/status/discard/handoff entrypoint
  - tools/repository-extraction/profiles/echo-brain.sb.in      # NEW scoped source/network/write sandbox policy template
  - tests/repository-extraction/echo-brain.test.ts             # NEW lifecycle, failpoint, publication, and handoff tests
  - raw/internal/migrations/2026-07-13-133-echo-brain.md       # NEW orchestrator-owned provenance, parity, and local-head record
spec_refs:
  - raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md # reviewed lifecycle simplification shared by all three lanes
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

The committed entrypoint is `node tools/repository-extraction/echo-brain.mjs <extract|status|verify-handoff|discard>`. `extract --run-id <uuid> --source-sha 2971310441b69735cbe759293abd8c4d044bf347` is one-shot and human-monitored; exit codes are `0` success, `64` usage, `73` existing-state/target conflict, `76` handoff mismatch, and `78` preflight. Fault and root-injection flags are test-only behind `ECHO_EXTRACTION_TEST_MODE=1`; tests use unique temporary roots. Before candidate writes, the tool opens committed script/profile/helper inputs once, hashes immutable byte snapshots, records source commit/blob IDs, and consumes only those snapshots. A later evidence-only commit may add the migration record but cannot change the bound control blobs.

Lifecycle is only `ABSENT -> RUNNING -> PUBLISHED | FAILED`. Atomic `mkdir /Users/zhenye/Desktop/.echo-extractions/133` is the per-target claim; state records run ID, owner PID/start identity, child process-group IDs, staging, control hashes, and command outcomes. There is no resume, quarantine, nonce rotation, takeover, artifact lock, or checkpoint reuse. Normal signals terminate the active process group and mark `FAILED`; after a hard kill, later commands never signal recorded IDs. `discard --expected-run-id <id> --reason <text>` is the sole recovery: it refuses if the final target exists or any recorded process may still be live, then RENAME_EXCL-archives state, staging, pre-rendered record, cache, and outputs without deletion. The human kills/verifies any ambiguous process first; a fresh `extract` starts from pinned source objects.

The candidate commits immutable `provenance/candidate.v1.json`. After verification, `extract` deterministically renders the full migration record, publishes it in the active orchestrator worktree with same-directory `renameatx_np(RENAME_EXCL)` (on EEXIST accept only byte-identical bytes), then publishes staging to `/Users/zhenye/Desktop/echo-brain` with RENAME_EXCL and parent fsync. Final target + byte-identical record + committed identity are the durable `PUBLISHED` fact even if external state was not updated; `status` and `verify-handoff` derive it read-only. A pre-target crash requires `discard`; a post-target run is never discarded or resumed. Tests cover every boundary and concurrent foreign target/record creation. Final repo is clean on its migration branch with no remote.

### AC2 — Make echo-brain the complete and accurately named client product

`/Users/zhenye/Desktop/echo-brain/package.json:1` names the private package and binary `echo-brain`, pins Node/npm, and contains no source-path dependency; committed `package-lock.json` is the install lock. `dependency-set.v1.json` derives exact direct packages from final bare imports plus fixed dev tools. Runtime file reads, package-script executables, and literal child-process binaries are also classified: npm binaries bind exact packages, while system/compiler/native-build tools bind recorded capability preflights or require rewrite/exclusion. Missing, extra, ranged, or undeclared runtime edges fail. Before writes, Git, Node `v22.22.1`, npm `10.9.4`, Python/RENAME_EXCL, sandbox-exec, shasum, timeout supervisor, and install-script tools are recorded. `/Users/zhenye/Desktop/echo-brain/src/:1` owns the Team meeting-to-decision-card/brief product composition; internal capability names remain precise while the product is `echo-brain`.

### AC3 — Copy only the reviewed product closure with durable provenance

`/Users/zhenye/Desktop/echo-brain/provenance/source-extraction.v1.json:1` records schema version, source repository identity, exact source SHA, item 132, boundary version, extraction time, and a sorted mapping for every copied source file: original path, destination path, source blob SHA, destination SHA-256, disposition (`copied`, `relocated`, or `rewritten`), change reason, and an enumerated literal/path rewrite allowlist when rewritten. Source bytes are read only from `git show <source-sha>:<path>` or an equivalent commit-object archive, never from the dirty source worktree. It contains no meeting content or credential. Small shared utilities may be copied with no synchronization obligation; imports back into `Project_echo`, symlinks, submodules, and generated mirrors are forbidden.

### AC4 — Enforce the client-product source boundary natively

`/Users/zhenye/Desktop/echo-brain/product/source-boundary.v1.json:1` and `/Users/zhenye/Desktop/echo-brain/tools/check-boundary.mjs:1` enforce the standalone repository's full transitive import closure. They reject the internal agent loop, backlog/review assets, coordination, general context capture/retrieval, MCP, developer extractors, Slack/Linear responder, founder CLI brain, unrelated daemon workers, and any path outside the repository. The native boundary test proves zero forbidden edges and verifies that every shipped import resolves from this repository alone.

### AC5 — Own independent configuration, state, build, and artifact identity

`/Users/zhenye/Desktop/echo-brain/schemas/runtime-config.v1.schema.json:1` preserves the client-local configuration contract and `src/runtime/paths.ts:1` owns install-local state. The sole extraction process invokes `npm run build:artifact -- --expected-head <sha> --run-output <unique-run-dir>` exactly once. The build refuses pre-existing output, rejects dirty input, exports expected HEAD with `git archive`, emits HEAD/tree/artifact SHA-256, and never changes candidate HEAD. A failed/interrupted build is not reused; `discard` archives its run output before a fresh extraction.

### AC6 — Preserve product behavior at the pinned source boundary

`/Users/zhenye/Desktop/echo-brain/provenance/test-parity.v1.json:1` inventories exactly the eight pinned `tests/product` files. Each row records source blob/SHA-256, destination, disposition, ordered literal substitution map, LF-normalized source hash, and expected transformed hash; exclusions require rationale. Canonical evidence bytes are UTF-8 JSON with recursively sorted object keys, preserved array order, integers, and one terminal LF; their SHA-256 is bound in committed `candidate.v1.json`, external `ready_to_publish`, and the pre-rendered migration record—no signature or credential. Standalone `check-test-parity.mjs` verifies those bindings, eight rows, substitutions, and destination normalized hashes. The new synthetic test is marked `new` outside count equality.

`/Users/zhenye/Desktop/echo-brain/tests/product/:1` also adds a packaged end-to-end synthetic fixture proving `meeting input -> extraction adapter -> manual review gate -> brief artifacts` without external network, live credentials, founder state, or wall clock. Runtime behavior changes are forbidden. `selftest` remains honest: maturity `DEV`, production API brain pending, and `wedge_executed:false` until later items supply those capabilities.

### AC7 — Prove native source independence and parity

`/Users/zhenye/Desktop/echo-brain/tests/migration/source-independence.test.ts:1` enforces no source/sibling escape. Before isolation, `dependency-cache-ready` runs `npm ci --ignore-scripts --no-audit --no-fund --cache <run>/npm-cache` in a scratch acquisition copy. Network transport need not prove URL/redirect allowlisting; cache admission is authorized only when every fetched package matches the source lock's cryptographic integrity, and a sorted cache content-hash manifest is recorded. Acquisition `node_modules` is deleted and install-script compiler/binary edges are preflighted. All later npm/install-script execution has network denied.

Under `env -i` with explicit cache, scratch roots, and allowlisted absolute tools, the active supervisor runs offline `npm ci`, checks, tests, exact `npm run build:artifact -- --expected-head <sha> --run-output <unique-run-dir>`, smoke, validate-config, and selftest. Empty operator cache succeeds; deleting a required cache object fails. Normal timeout/signal terminates the active group; a hard-kill survivor makes later `discard` refuse until the human proves it gone.

The migration record is written only at repository-relative `raw/internal/migrations/2026-07-13-133-echo-brain.md` in the active orchestrator worktree, never through the founder's canonical checkout path. It records every command and exit code, resolved toolchain, run/staging IDs, candidate HEAD, artifact version/SHA-256, source/test inventory counts, provenance hash, and differences.

### AC8 — Stop before authority transfer

The record binds false authority/remote, DEV, final Git identity, control/cache/provenance/test/dependency hashes, and immutable artifact path/manifest/hash. `verify-handoff --expected-run-id <id>` derives canonical non-symlink record/state paths from the production roots and rejects caller-selected alternates. It verifies the originally bound control commit/blobs even if current Project_echo HEAD advanced only by the generated record commit, checks record/candidate/artifact digests, opens artifact and manifest as regular no-follow files with stable pre/post identity, and exits `76` on mismatch. Candidate/artifact remain preserved.

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
- **Interrupted one-shot work:** a crash can discard completed local work. Mitigation: attended execution, immutable cache/evidence archives, and a fresh deterministic run; never trade safety for automatic takeover.

## Tests

- `/Users/zhenye/Desktop/echo-brain/tests/product/import-fence.test.ts` — zero forbidden imports and complete native closure.
- `/Users/zhenye/Desktop/echo-brain/tests/product/runtime-isolation.test.ts` — only product components boot; local state and fail-closed behavior remain intact.
- `/Users/zhenye/Desktop/echo-brain/tests/product/packaged-product.test.ts` — the locally built artifact installs and runs config/selftest without the source repo.
- `/Users/zhenye/Desktop/echo-brain/tests/product/end-to-end-synthetic.test.ts` — synthetic meeting through manual gate to brief artifacts.
- `tests/repository-extraction/echo-brain.test.ts` — one-shot claim/fail/discard/fresh-run; publication boundaries; cold-cache/offline failure; control snapshots; hard-kill refusal; isolated roots; deterministic record and artifact handoff.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/test-parity.test.ts` — exact eight-file inventory and literal-only rewrite enforcement.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/dependency-set.test.ts` — bare-import-derived direct dependency set is complete, exact, and has no extras.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/source-independence.test.ts` — no symlink/submodule/path/dependency escape.
- Commands include offline `npm ci --offline --cache <run>/npm-cache --ignore-scripts=false --no-audit --no-fund`, typecheck/lint/boundary/parity/tests, exact one-shot `npm run build:artifact -- --expected-head <sha> --run-output <unique-run-dir>`, installed smoke/config/selftest, source-independence, and `git diff --check`; any failure ends the run and requires discard + fresh extract.

## After Completion (Strategist Notes)

- Do not update the wiki or transfer authority yet; the repo is a local DEV candidate only.
- After founder accepts parity, record a separate authority-transfer/remote-publication proposal and freeze the old product paths in that later item.
- Rank 2 and rank 3 product work must land in the authoritative repository chosen by that later checkpoint, never simultaneously in both places.
