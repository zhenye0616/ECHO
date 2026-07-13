---
id: 2026-07-13-132-product-graduation-foundation
title: "Product graduation foundation: additive echo-brain composition boundary, product-only tests, and build-once qualification evidence"
status: proposed
priority: HIGH
estimate: 5d
created: 2026-07-13
blocked_by: []
task_state_ref: 2026-07-13-132-product-graduation-foundation
requested_reviewers: ["codex", "cursor"]
files_to_modify:
  - src/product/                                      # NEW: isolated product composition, config, runtime, CLI, health, and evidence types
  - src/capture/granola-source-policy.ts              # NEW: Granola-only API/derived allowlist with no Machine-capture constants
  - src/capture/pipeline-core.ts                      # NEW: policy-injected candidate validation/storage core with no lab registry import
  - src/capture/pipeline.ts                           # preserve the generic lab pipeline through the new policy-injected core
  - src/capture/surfaces/granola-poller.ts            # route Granola through the narrow policy instead of the Machine-capture registry
  - src/enrich/granola-signals.ts                     # remove the static founder-CLI brain dependency from the reusable extraction core
  - src/enrich/granola-signals-cli-adapter.ts         # NEW: preserve the current lab-only Claude/Codex CLI brain binding outside product closure
  - src/enrich/dispatch.ts                            # inject the lab CLI adapter without changing current daemon behavior
  - src/enrich/worker-heartbeat.ts                    # allow the product runtime to inject an installation-local heartbeat path
  - src/cli/commands/brief.ts                         # preserve the founder CLI by injecting the same explicit lab brain adapter
  - product/source-boundary.v1.json                   # NEW: versioned product roots, allowlist, forbidden roots, and external dependencies
  - product/package.template.json                     # NEW: private echo-brain artifact metadata, bin, engine, and runtime dependencies
  - product/README.md                                 # NEW: DEV-only boundary and local artifact commands; no client-ready claim
  - schemas/product/                                  # NEW: runtime-config and qualification-report JSON schemas
  - tools/product/                                    # NEW: import-fence, artifact build, checksum, manifest, and report validators
  - tests/product/                                    # NEW: hermetic product boundary, runtime, package, and qualification tests
  - tests/capture/pipeline.test.ts                    # prove generic capture behavior is unchanged through the policy seam
  - tests/capture/granola-poller.test.ts              # prove Granola accepts only the narrow API source without lab constants
  - tests/enrich/granola-signals.test.ts              # preserve current lab extraction behavior across the dependency-injection change
  - tests/cli/brief-command.test.ts                   # prove real non-fixture brief CLI still receives the lab adapter
  - vitest.product.config.ts                          # narrow test:product to tests/product only
  - vitest.repo.config.ts                             # NEW: preserve the current broad non-orchestration suite under an honest name
  - package.json                                      # expose test:repo and product build/check/qualification commands
  - .github/workflows/ci.yml                          # run the renamed broad suite without calling it product qualification
  - .github/workflows/product-qualification.yml       # NEW: build once, verify one exact product artifact on the phase-1 Mac target
spec_refs:
  - raw/internal/decisions/2026-07-11-acceptance-outlines-pre-lift.md                 # rank-1 required outcome and evidence; this is its authorized conversion
  - raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md             # canonical DEV -> FOUNDER LIVE -> QUALIFIED -> CLIENT LIVE contract
  - raw/internal/decisions/2026-07-12-g2-terminal-dispositions-and-repository-topology.md # T1/T2/T5/X5 boundary and extraction ordering
  - raw/internal/decisions/2026-07-12-clarity-halt-lift.md                            # exact post-G2 authorization and maturity constraints
  - raw/internal/decisions/2026-07-10-client-machine-trap-map.md                     # fresh-machine, identity, runtime, state, platform, and CI traps
  - raw/internal/decisions/2026-07-12-clarity-phase3-readiness-baseline.md            # inherited package/Windows/macOS failures that this item must not waive
  - src/daemon/index.ts                                                              # current all-in-one lab boot; product root must not import or emulate it
  - src/capture/surfaces/granola-poller.ts                                            # meeting input and local checkpoint behavior reused by the wedge
  - src/enrich/granola-signals.ts                                                     # extraction core and current static founder-CLI dependency to split
  - src/enrich/post-meeting-brief.ts                                                  # canonical local brief object and render path
  - package.json                                                                      # current generic echoctl package; product artifact must remain separate
  - vitest.product.config.ts                                                          # current misleading broad-suite semantics to correct
  - .github/workflows/ci.yml                                                          # current quality job that depends on the broad-suite semantics
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
agent_notes: ""
---

## Why this spec exists

G2 is lifted, but the commercial product is still only a useful experiment inside the full ECHO lab. The current daemon starts filesystem and git watchers, Claude/Codex/Cursor extractors, enrichment workers, MCP, and Fleet-adjacent intake together (`src/daemon/index.ts:1-120`). The current `test:product` label is also inaccurate: `vitest.product.config.ts:1-19` runs nearly every non-orchestration test in the repository. Finally, the generic `echoctl` tarball still packages the lab rather than a product-only install.

This is the rank-1 post-G2 foundation authorized by `2026-07-12-clarity-halt-lift.md`. It creates an additive, in-repo `echo-brain` composition boundary before repository extraction. It makes that boundary independently bootable with injected dependencies, gives product tests an honest home, and makes CI build one product-only artifact whose exact bytes and evidence can later move through `DEV -> FOUNDER LIVE -> QUALIFIED -> CLIENT LIVE`.

This item does not make the product client-ready. In particular, the real API-key brain adapter, first-run cutoff/newest-first behavior, install/launchd flow, and live founder evidence remain later ranked items. The output of this item is a trustworthy DEV foundation that those capabilities can enter without re-entangling with Machine context or Fleet orchestration.

## Acceptance Criteria

### AC1 — Versioned additive product boundary and transitive import fence

`product/source-boundary.v1.json:1` defines a versioned, machine-readable boundary with: product entry points, allowed internal source paths, forbidden internal roots, allowed external runtime packages, and the declared phase-1 platform/runtime. The allowlist covers only T1's meeting input/configuration, signal extraction seam, manual human gate, local brief generation, installation-local state/health, and qualification support. The forbidden set includes at minimum `src/daemon/`, `src/mcp/`, `src/coord/`, `src/trace/`, developer capture extractors/watchers, Slack/Linear responders, autonomous actions, and orchestration/review tooling.

`tools/product/check-boundary.mjs:1` resolves the transitive internal module graph from every `src/product/` entry point using a structured JavaScript/TypeScript parser or the TypeScript compiler API. It checks static imports, re-exports, literal dynamic imports, CommonJS `require`, and `createRequire`; rejects unresolved or non-literal internal loading; rejects any path outside the explicit allowlist; and rejects any external runtime dependency absent from the manifest. It writes a sorted closure manifest on success. `tests/product/import-fence.test.ts:1` includes both a green real graph and red fixtures for a forbidden import, an unlisted internal import, an unlisted package, an opaque dynamic import, `require`, and `createRequire`.

The maximum initial internal allowlist is explicit: `src/product/**`; `src/capture/{granola-source-policy,pipeline-core}.ts`; `src/capture/surfaces/granola-poller.ts`; `src/enrich/{granola-signals,post-meeting-brief,worker-heartbeat}.ts`; `src/storage/{interface,sqlite,migrate,source-match}.ts`; `src/storage/migrations/**`; `src/echo-home/paths.ts`; `src/echo-home/adapters/atomic-write.ts`; `src/logging/index.ts`; `src/guards.ts`; and `src/util/{json,subject,timestamp}.ts`. The builder must reduce this list when the real closure is smaller and may not add another internal path without a spec-review amendment. A listed file is not automatically safe: the fence also rejects an import edge into any forbidden root.

`src/capture/granola-source-policy.ts:1` contains only the `api:granola`, `derived:granola-signals`, and `derived:granola-signals-index` policy. It contains no filesystem, git, Cursor, Claude, Codex, Slack, Linear, or founder-path constant. `src/capture/pipeline-core.ts:1` owns policy-injected candidate validation, timestamp canonicalization, and storage append without importing `src/capture/sources.ts`. `src/capture/pipeline.ts:1` remains the generic lab wrapper, while `src/capture/surfaces/granola-poller.ts:10` uses the Granola policy/core directly and `src/enrich/granola-signals.ts:4` uses its derived-source predicate. Compatibility tests prove the generic pipeline still behaves identically. The real product graph must not contain `src/capture/sources.ts`, including its `~/Desktop/Project_echo/` and developer-app defaults.

No existing product-relevant source file is moved. The builder may add the `src/product/` composition and the one lab-only adapter named in `files_to_modify`, but may not perform mass `git mv`, rename existing public imports, or extract a repository.

### AC2 — Product runtime owns only the wedge and fails closed

`src/product/config.ts:1` loads and validates `schemas/product/runtime-config.v1.schema.json:1`. The schema requires `schema_version: 1`, an explicit `lane: "team-product"`, an absolute installation-local state directory with no `..` traversal, Granola workspace/input configuration, a secret *reference* for each credential, an explicit brain-adapter identifier, and `approval_mode: "manual"`. It rejects unknown fields, inline credential values, the retired `profile: dogfood|customer` vocabulary, relative/traversing state paths, and missing wedge dependencies. `validate-config` and `selftest` perform a read-only filesystem-type probe against the closest existing ancestor and fail closed for known network/shared types (`nfs`, `smbfs`, `afpfs`, and WebDAV); the probe is injectable in tests and an unclassifiable target is reported explicitly rather than silently called local. Logs, health records, checkpoints, manifests, drafts, and the database resolve underneath the configured product state directory; credentials never enter those records.

`src/product/runtime.ts:1` exports an injectable `startProductRuntime(config, dependencies)` and a deterministic shutdown handle. It starts only the Granola meeting input, signal extraction dependency, local brief generation/manual approval surface, product-local state, and health. It injects explicit poll, signal-checkpoint, brief-output, database, and heartbeat paths under the configured state directory; `src/enrich/worker-heartbeat.ts:48-68` accepts the heartbeat destination instead of forcing the lab default. It does not import or start the generic daemon, MCP, Machine capture, developer extractors, decision-drift/intake workers, Slack/Linear, Fleet coordination, or remote delivery. Missing or invalid config and a missing production brain adapter return a typed nonzero `run` failure before polling, state mutation, or network access. `src/product/cli.ts:1` exposes product-only `validate-config`, `selftest`, and `run` commands over this root; it never delegates to generic `echoctl daemon`. Offline `selftest` succeeds without the rank-3 brain adapter while reporting that adapter/maturity cell as pending/unavailable; it must not pretend the real wedge ran.

Until rank 3 supplies the real API-key adapter, a production `run` with no registered API-key adapter must fail loudly as unavailable. Tests may inject a deterministic in-memory extractor through the runtime API; the fixture adapter is test code and is excluded from the tarball. No founder CLI credential or `codex`/`claude` child process is an allowed fallback.

### AC3 — Shared signal core no longer drags founder CLI identity into the product

`src/enrich/granola-signals.ts:10,116-137` is refactored so its reusable worker core has no static or dynamic import of `src/brain/brain.ts`, no default `codex`/`claude` selection, and no context-repository/MCP assumption. The core consumes an explicit `GranolaSignalExtractor` and an adapter health/preflight dependency. Missing dependencies fail closed with an observable reason.

`src/enrich/granola-signals-cli-adapter.ts:1` owns the existing lab-only brain parsing, preflight, prompt execution, timeout behavior, and a shared `createLabGranolaSignalOptions(env)` composition helper. `src/enrich/dispatch.ts:1-45` explicitly injects that adapter for the generic lab daemon. `src/cli/commands/brief.ts:139-147` uses the same helper when `BriefCommandOptions.extractFn` is absent, while retaining explicit fixture injection for tests. `tests/enrich/granola-signals.test.ts:1` proves the lab dispatch still selects the configured CLI brain, preserves timeout/error behavior, and does not silently switch adapters. `tests/cli/brief-command.test.ts:1` adds a non-fixture-extractor path that proves real `echoctl brief` selects the configured lab adapter rather than failing closed. The product import-closure test proves `src/cli/commands/brief.ts`, `src/brain/brain.ts`, and `@anthropic-ai/claude-agent-sdk` do not enter the rank-1 product artifact accidentally.

### AC4 — `test:product` becomes a real hermetic product suite

`vitest.product.config.ts:1` includes only `tests/product/**/*.test.ts`. The current broad non-orchestration semantics move unchanged to `vitest.repo.config.ts:1`, excluding `tests/product/**` so CI does not double-run the product suite. `package.json:scripts` exposes `test:product` for the true product suite and `test:repo` for the renamed broad suite; `test:orchestration` remains unchanged.

All `tests/product/**` run with network disabled and with temporary state, injected clocks, injected extractor fixtures, and synthetic meeting content. They may not read the founder database, HOME credentials, live Granola, a live MCP server, or wall-clock time. `vitest.product.config.ts:1` registers a shared `setupFiles` guard for every product test file; it snapshots/clears relevant environment variables and intercepts outbound sockets/fetch and uncontrolled clock reads so a leaked credential or unexpected attempt fails any file, not only a dedicated guard test. A guard test proves the shared setup is active. `.github/workflows/ci.yml:1` runs `test:repo` under the existing quality matrix and does not call that job product qualification. The default `npm test` may continue to run the aggregate suite locally, including product tests; it is not a CI qualification command.

### AC5 — Product-only artifact is built once and is installable without the repo

`product/package.template.json:1` defines a private, unpublished `echo-brain` package with its own bin, Node engine, product runtime dependencies, and product README. It is not derived by renaming the generic `echoctl` tarball, and it contains no generic daemon, MCP, Machine capture, Fleet/review assets, wiki/backlog/raw content, test fixture, credential, or absolute repository path.

`tools/product/build-artifact.mjs:1` accepts an explicit valid prerelease version and source SHA, builds from a clean tracked tree, runs the AC1 fence, stages only the compiled transitive product closure plus required package metadata/schema/migrations, and invokes `npm pack` exactly once per requested artifact lineage. It emits: one `.tgz`, one SHA-256 file, and one sorted artifact manifest containing package paths, sizes, per-file SHA-256 values, product-boundary version, source SHA, version, dependency-lock hash, and build command. The exactly-once rule binds the CI artifact uploaded for qualification: no downstream job may pack or rebuild it. A local `tests/product/packaged-product.test.ts` invocation may create its own isolated scratch lineage through this same tool when `ECHO_PRODUCT_ARTIFACT_DIR` is absent; in CI it must consume the already-built directory and must not pack.

`tests/product/packaged-product.test.ts:1` installs that tarball into an empty temporary prefix, outside the repository, verifies the checksum before install, confirms the package file set matches the manifest, runs `echo-brain validate-config` and the offline `selftest`, and proves neither command resolves a repository-relative file. The artifact is DEV evidence only; this item neither publishes it nor claims a monotonic public release version.

### AC6 — Machine-readable qualification evidence is honest about incomplete maturity

`schemas/product/qualification-report.v1.schema.json:1` and `tools/product/validate-qualification.mjs:1` implement the matrix vocabulary from `2026-07-11-team-product-graduation-pipeline.md:69-100`. A report binds capability/spec id, product-boundary version, source SHA, reviewed qualification SHA when available, artifact version and SHA-256, artifact-manifest hash, dependency-lock hash, CI run identity, declared platform/runtime, unexpected-skip count, and every matrix cell. Each cell carries authority (`machine`, `independent-reviewer`, or `founder`), status (`pass`, `fail`, `pending`, or schema-permitted `not_applicable`), evidence references, and a reason when not passing.

The validator rejects missing mandatory cells, a mandatory cell marked `not_applicable`, a human-authority cell passed by CI, artifact/source identity disagreement, unexpected skips, and an overall `qualified` result while any required cell is not green. Upgrade-from-previous is the only schema-permitted first-release `not_applicable` subcheck, and only with both founder and independent-reviewer rationale; this proposal leaves it `pending` and does not decide the exception. The rank-1 CI report must label the candidate `DEV` and `incomplete`, with future capability, founder-live, review, and release-authority cells visibly pending rather than omitted or waived.

### AC7 — CI qualifies the same bytes on the declared phase-1 target

`.github/workflows/product-qualification.yml:1` triggers only on relevant `pull_request` paths, relevant pushes to `main`, and `workflow_dispatch`; it has no tag or release trigger and this item does not add it to branch protection. Its single build job runs typecheck/lint, invokes AC5's artifact builder once, exports the output as `ECHO_PRODUCT_ARTIFACT_DIR`, then runs `test:product` and the boundary/manifest checks against that already-built lineage. It uploads the tarball, checksum, artifact manifest, draft qualification report, and a qualification-support directory as one immutable CI artifact. The support directory is outside the tarball/manifest and contains only synthetic seed data plus checksum/evidence/aggregation scripts needed on a no-checkout runner. Every downstream job downloads those exact files, verifies the checksum and manifest before use, and is forbidden from checking out, packing, or rebuilding product bytes.

The initial target cell is macOS with Node 22, matching the phase-1 client contract; no Windows support claim is made. The macOS no-checkout job installs into a clean temporary prefix, runs the packaged offline selftest, exercises fresh and populated synthetic local state, and defines restart/state isolation as repeated packaged-CLI invocation over one persisted state root plus proof that a second prefix/state root cannot read it. It uploads a separate immutable evidence artifact. A final no-checkout aggregation job downloads the original bundle plus target evidence, composes a completed DEV draft report with the bundled support script, re-runs `validate-qualification.mjs`, and uploads a new immutable final-report artifact; it never mutates the original artifact. The workflow fails if any implemented rank-1 machine cell is red, if the tarball identity changes, or if an unexpected test is skipped. Pending later-rank and human-authority cells keep the report incomplete but do not make this foundation workflow dishonest or falsely QUALIFIED.

### AC8 — Inherited generic-package and platform failures remain explicit debt

The product workflow and report must not absorb, relabel, or waive failures in the generic `echoctl` package. The builder records these exact dispositions in `product/README.md:1` and workflow comments:

- Generic release-doctor omission of `tools/install-echo-codex-skills.sh`: owned by the dev-platform package maintainer; must be fixed before the next generic `echoctl` tag or the `echo-dev-platform` extraction, whichever comes first.
- Windows onboarding/validation EBUSY and filesystem-event failures: owned by the platform maintainer; must be green before any Windows product support claim. Phase 1 remains macOS-only.
- The macOS Node 22 PID-lock/selftest and packaging-cleanup races: owned by QA; if either reproduces in the product-only qualification job, it is a blocking red cell rather than a retry-based waiver.

`backlog/_followups.md` remains the owner of the generic-package debts. This item may isolate the new product workflow from unrelated generic jobs, but it may not delete a failing generic check, change branch protection, or describe the repo as globally green.

### AC9 — No maturity, release, data, or repository transition occurs

The merged code, tests, tarball, and incomplete DEV report do not advance the candidate to FOUNDER LIVE, QUALIFIED, or CLIENT LIVE. There is no tag, GitHub Release, package publication, protected-environment approval, client install, real meeting, credential change, or release authorization in this item. The `echo-brain` repository is not created and no current path becomes authoritative outside this repository.

The handoff record in `product/README.md:1` names the next gates in order: rank 2 first-run cutoff/newest-first; rank 3 API-key brain; V2 auth probes and A2 cold-state grading; exact-artifact isolated FOUNDER LIVE; then repository extraction/cutover before full qualification, per `2026-07-12-g2-terminal-dispositions-and-repository-topology.md:61-69`.

## Out of Scope (Don't Drift)

- Moving existing wedge modules into `src/product/` or performing a source-history rewrite.
- Creating, transferring, renaming, or making authoritative either `echo-brain` or `echo-dev-platform` on GitHub.
- Implementing the Anthropic/API-key brain adapter, credential custody, payment/economics, or keychain storage (rank 3 / A3).
- Implementing the seven-day first-run cutoff, newest-first extraction, historical-backfill command, `brief --wait`, delivery adapter, launchd installer, upgrade, rollback, backup, or restore drill (ranks 2, 4, and 5).
- Bundling MCP retrieval, context capture, Fleet/review orchestration, Slack/Linear, autonomous action, embeddings, or a destination app.
- Remote delivery or any remote write. Manual approval produces local brief artifacts only.
- Real Granola/API calls, real transcripts, founder/client credentials, live client data, or real-data fixtures.
- Publishing an npm package, creating a tag/release, modifying repository security/rulesets, or advancing maturity.
- Fixing or deleting the inherited generic `echoctl` packaging/Windows/macOS failures listed in AC8.
- Editing `wiki/`, `.manifest.json`, or product marketing/offer/pricing materials.

## Risks

- **The additive root could become a second daemon.** Mitigation: AC1's transitive allowlist and AC2's explicit dependencies make the product root small; no generic dispatch or catch-all registry is allowed.
- **Refactoring signal extraction could regress the lab.** Mitigation: the CLI adapter remains explicit in `src/enrich/dispatch.ts`, existing tests remain in `test:repo`, and AC3 adds focused compatibility assertions.
- **A source allowlist can be cosmetically green while the package leaks code.** Mitigation: the fence checks the source graph, the build stages from that closure, and the installed tarball file set is checked independently against per-file hashes.
- **An incomplete qualification report could be mistaken for a release record.** Mitigation: schemas reject `qualified` with pending/red cells, the report says DEV/incomplete, and no release workflow or publication is added.
- **Build-once CI can be undermined by native dependencies.** Mitigation: the tarball carries JavaScript/package metadata, target install resolves native dependencies on macOS, and no downstream job rebuilds product source bytes.
- **The first proposal is broad.** This breadth is intentional because every later capability needs the same boundary, test lane, artifact identity, and evidence grammar. Review should split an AC only if the remainder still leaves one usable graduation foundation; do not split it into disconnected packaging and runtime tracks.

## Tests

- `tests/product/import-fence.test.ts`: real closure green; forbidden root, undeclared internal path, undeclared package, and opaque dynamic import red; sorted closure stable.
- `tests/product/runtime-config.test.ts`: explicit `team-product` lane green; retired profile, inline secret, relative/shared state, unknown field, and absent dependency red; no state/network side effect on validation failure.
- `tests/product/runtime-isolation.test.ts`: only the wedge dependencies start; deterministic reverse shutdown; injected extractor works; absent production adapter fails before poll/state/network; forbidden services never start.
- `tests/product/hermeticity.test.ts`: product suite rejects HOME credentials, founder DB/path access, wall clock, and outbound network; synthetic fixture content only.
- `tests/product/packaged-product.test.ts`: one checksum-verified tarball installs outside the repo; manifest and file hashes match; offline config/selftest run; forbidden paths and test fixtures absent.
- `tests/product/qualification-report.test.ts`: complete machine-cell draft validates; missing mandatory cell, false human pass, illegal N/A, identity mismatch, unexpected skip, and premature QUALIFIED result fail.
- `tests/product/build-once-contract.test.ts`: workflow has one pack producer; downstream jobs consume the uploaded artifact and verify SHA-256 before install; no downstream checkout/build step.
- `tests/capture/pipeline.test.ts` and `tests/capture/granola-poller.test.ts`: generic source gating remains unchanged; the Granola path uses only its API/derived policy and cannot reach `capture/sources.ts` or founder paths.
- `tests/enrich/granola-signals.test.ts`: lab CLI adapter injection preserves brain selection, timeout, error, and shutdown behavior while the shared core has no founder-CLI fallback.
- `tests/cli/brief-command.test.ts`: a real non-injected `echoctl brief` path receives the explicit lab CLI adapter; fixture injection still overrides it.
- Commands: `npm run typecheck`, `npm run lint`, `npm run test:repo`, `npm run test:product`, `npm run test:orchestration`, product boundary check, product artifact build, installed-artifact selftest, and `git diff --check`.

## After Completion (Strategist Notes)

- Keep maturity at DEV. Record the exact merged SHA and draft qualification artifact, but do not create a release record.
- Promote the shipped boundary to a new `wiki/architecture/product-composition-boundary.md` and update the current product/graduation page only after this item reaches `complete/`; then update `.manifest.json` and regenerate the wiki index.
- Mark the true product-suite semantic correction on the existing CI-noise follow-up as shipped. Leave the AC8 generic package/Windows/macOS debts open with their owners and triggers.
- Convert rank 2 (seven-day cutoff + newest-first) next, then rank 3 (API-key brain). Do not start repository extraction until an exact artifact from this boundary passes isolated FOUNDER LIVE.
