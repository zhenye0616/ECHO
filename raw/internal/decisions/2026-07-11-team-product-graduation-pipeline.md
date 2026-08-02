# Team-product graduation pipeline

**Date:** 2026-07-11 · **Status:** founder-locked direction; mechanism not yet built · **Decision type:** environment separation, qualification, and release

> **Terminology amendment (2026-08-02):** The promotion stage formerly named `FOUNDER LIVE` / `founder-live` is now `INTERNAL LIVE` / `internal-live`. Its criteria are unchanged except that the isolated lane runs on a team-controlled internal Mac rather than being tied to one founder machine. The founder remains the release-authority actor, including the separate authorization bound to source SHA, version, and artifact SHA-256.

## Decision

Team-product code reaches a client through one graduation path:

> **DEV -> INTERNAL LIVE -> QUALIFIED -> CLIENT LIVE**

These are four different trust states. Passing one stage does not imply the next. Code cannot move directly from a developer checkout or a successful founder demo into a client install.

The founder's phrase **CI/CD affinity matrix** is implemented here as the **release qualification matrix**: a candidate must prove that it fits the exact client contract across boundary, behavior, packaging, platform, state, failure, security, and operations. It is not a weighted score. Every required cell must be green or, only where the contract permits it, explicitly not applicable with evidence; one red cell blocks release.

This pipeline is the only route by which the Team-product wedge becomes client-facing. Machine context and Fleet orchestration stay in the lab unless a Team capability explicitly requires a narrow dependency that also passes this pipeline.

**Scoped authority note (2026-07-16):** the founder-authority cell may be
filled by the persistent Codex program coordinator only for the echo-context
sequential program named in
`raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md`.
The coordinator must commit the exact-operation authorization required there.
Every matrix, independent-review, staging, artifact-identity, backup, rollback,
and acceptance cell remains unchanged. This does not delegate any Team-product
release or client operation outside that named program.

## The four stages

| Stage | Runtime and artifact | Required evidence | What it may be called |
|---|---|---|---|
| DEV | Branch/worktree; repo checkout; scratch state; synthetic or redacted fixtures; lab composition root | Typecheck, lint, focused tests, contract tests, reviewer-ready change | Experimental code only |
| INTERNAL LIVE | Versioned candidate package built from a pinned SHA on a team-controlled internal Mac; isolated live namespace; real meetings and real failure recovery | Predeclared live-test plan, run log, output verdicts, known failure modes, recovery result | INTERNAL LIVE candidate; not QUALIFIED or client-facing |
| QUALIFIED | Qualification change under the product boundary; build-once versioned package; client runtime configuration; clean qualification environments | Every release-qualification cell green; independent review; artifact manifest and checksum; exact-artifact internal staging smoke | Qualified release candidate; not client-enabled |
| CLIENT LIVE | The exact QUALIFIED artifact and checksum installed on the client's Mac through assisted onboarding; client-local state and credentials | Install record, client-runtime health, real client meeting, useful brief, repeat use, upgrade/rollback/support path | Client-facing Team wedge |

## Current baseline

The meeting-to-brief experiment has valuable `E3` evidence from real founder meetings, but the current candidate is formally **DEV** under this new pipeline. The preserved run was retrospective rather than predeclared, did not bind an isolated runtime and rollback result to a pinned candidate, and preceded the finalized `echoctl brief` implementation. It proves the problem and informs the test plan; it does not waive the first gate.

The next maturity event is therefore a pinned, versioned candidate-package run in an isolated environment on a team-controlled internal Mac. Passing that run advances the candidate to INTERNAL LIVE. It does not reopen the founder's decision that pain and demand are proven.

## In plain English

- **Today:** useful meeting-to-brief behavior exists, but it is still entangled with the ECHO lab. The older live runs prove usefulness and inform the next test; they do not prove that the finalized candidate is isolated or recoverable.
- **Next:** package the current candidate and run it on a team-controlled internal Mac with its own state, port, service, credentials, logs, and rollback. No existing ECHO environment should be at risk.
- **Then:** carve only the wedge into a product runtime and make CI prove that exact package fits the client contract. Generic ECHO tests and the current broad npm package are useful raw material, not this proof.
- **Finally:** install the same qualified bytes on the client's Mac. Installation starts acceptance; the product becomes CLIENT LIVE only after a real meeting produces a useful brief and the client repeats the workflow.
- **Commercially:** selling, offer design, and onboarding discovery can proceed in parallel. The gates control delivery claims and client risk, not whether the company pursues the product.

## Separation invariants

1. **Separate state.** Dev, internal-live, qualification, and client environments use distinct `ECHO_HOME`, database, port, launchd label, logs, credentials, and checkpoints. No stage reads another stage's mutable state by default.
2. **Separate composition roots.** Dev may boot the full lab. Internal-live boots the candidate plus explicit observability. Qualification and client stages boot only the Team-product composition root and its allowlisted dependencies.
3. **Separate runtime configurations.** Dev, internal-live, qualification, and client-live are runtime lanes, not install-profile values. The current `dogfood | customer` profile only filters coordination assets; reserve `profile` for that legacy audience split. Productization must introduce explicit runtime/composition configuration and must not overload the retired Machine-context meaning of `customer`.
4. **Build once.** QUALIFIED creates one versioned package. CI validates that exact byte artifact, records its SHA-256, and release publishes the same artifact. Client installation never rebuilds from source.
5. **No repo on live or client machines.** INTERNAL LIVE, QUALIFIED, and CLIENT LIVE use versioned packages. No live stage requires a checkout.
6. **No founder identity in CLIENT LIVE.** Client operation uses client-scoped API keys/accounts. The founder may assist onboarding but the runtime cannot depend on the founder's machine, personal CLI login, or live database.
7. **Evidence moves forward; mutable state does not.** Each gate consumes a signed/pinned evidence bundle from the previous stage. Founder or client data is never copied into the package.
8. **No shortcut graduation.** A successful demo, green unit test, or client request cannot skip a stage. Urgency changes sequencing, not the gate.

## Stage gates

### DEV -> INTERNAL LIVE: permit an internal live test

The candidate must be a versioned package built from a pinned SHA, with an isolated live-test configuration, a rollback command, a predeclared test plan, and no known risk of corrupting existing internal-live state. Running a checkout or uncommitted working-tree code against live data does not count.

### INTERNAL LIVE -> QUALIFIED: open a graduation change

The live-test record must identify what ran, how many/which real workflows were exercised, the output verdicts, every observed failure, and the recovery result. The graduation change then moves one capability at a time into the product boundary, with behavior changes handled before the move. After G2, this change starts in `backlog/proposed/` and follows normal independent review.

### QUALIFIED -> CLIENT LIVE: release the client wedge

CI must complete every machine-executable matrix cell, an independent reviewer must complete the evidence-review cells, and the exact artifact must pass an internal staging smoke. The founder then gives a separate release authorization bound to source SHA, version, and artifact SHA-256; that final authority cell seals the fully green QUALIFIED release record. Assisted onboarding may then install and enable those bytes on the client Mac, but the candidate remains QUALIFIED during acceptance. It becomes CLIENT LIVE only after the client runtime is healthy, a real meeting produces a useful brief, the workflow is repeated, and recovery/rollback ownership is recorded.

### CLIENT LIVE steady state: keep or roll back

Client enablement is per installation. The immediate rollback is config-off or reinstalling the previous qualified artifact without destroying client-local data. Removing code from the product boundary is a later reviewed de-graduation; it is not the first incident response.

## Release qualification matrix

| Dimension | Required QUALIFIED proof | Current repo truth |
|---|---|---|
| Product source boundary | `src/product/` imports only approved kernel/product dependencies; no lab daemon, dev extractors, MCP/Fleet orchestration, or internal-only paths | Missing: `src/product/` and its fence do not exist |
| Product tests | Hermetic wedge tests live under `tests/product/`; no network, live credentials, internal-live database, or wall clock | Missing: `tests/product/` does not exist; current `test:product` is the broad non-orchestration suite |
| Product-only boot | Product composition root starts only meeting input, extraction/API-key brain, human gate, brief/delivery, state, and health | Missing: current daemon boots the larger lab worker set |
| Runtime isolation | Client runtime cannot install, boot, or enable Machine/Fleet surfaces; absence of config fails closed and is tested | Missing: current `customer` profile filters skills/roles/workflows, not runtime workers or package contents |
| Wedge behavior | Packaged end-to-end fixture proves meeting input -> extraction -> review gate -> useful brief/delivery contract | Partial: component tests and predecessor founder-regime evidence exist; no packaged product-only end-to-end gate |
| Auth and failure honesty | Client-scoped API key path; expired/missing/rate-limited credentials fail loud, bounded, and recoverable; no founder CLI | Missing for the meeting extraction path |
| Platform/runtime affinity | Product package passes declared macOS version, architecture, and supported Node-version cells; phase 1 is macOS only | Partial: generic package CI covers Node 22/24 and multiple OSes, not the Team product runtime or declared Mac/architecture set |
| Clean install | Exact artifact installs with no repo, initializes client runtime, exercises the real launchd lifecycle, reports healthy, and survives restart | Partial: generic `echoctl` selftest/foreign-install smoke exists, but it validates the wider Machine package; release CI starts Node directly |
| State affinity | Fresh database, populated database, migrations, instance-local sidecars, backup/restore, and client-local identity pass | Missing or open across A2 and T-series decisions |
| Upgrade and rollback | Upgrade from the previous qualified artifact and rollback to it preserve client state and restore health | Missing end-to-end |
| Packaging closure | Manifest contains only the deliberate product deliverable; every runtime import resolves; runtime dependencies are reproducibly locked/bundled and recorded; no unrelated active assets | Partial: generic manifest/import-closure tests exist, but the package contains lab/Fleet assets and no packed dependency lock/SBOM |
| Security and data | Secret/content/dependency scan, local bind/access boundary, retention/deletion/custody contract, no founder data in artifact | Partial/open; no CI secret/dependency gate today |
| Operations | Doctor/health covers every wedge stage; failure is observable; support owner and recovery steps are written | Partial local observability; active alerting/support path open |
| Artifact provenance and authority | Reviewed main-ancestor SHA, INTERNAL LIVE evidence, one stable aggregate required check, zero unexpected selftest skips, one build, SHA-256, dependency-lock hash, CI run, matrix result, monotonic version/tag, matching changelog, and founder authorization are bound together | Reusable build/checksum base exists; tags can currently publish without main ancestry, source-quality checks, or INTERNAL LIVE evidence |
| Distribution | Authenticated client channel, artifact retention/access policy, checksum verification, and revocation/replacement procedure are explicit | Missing: today's "private beta" is a normal prerelease in a public repository |

### Controlled not-applicable results

The following matrix cells are never not-applicable: source boundary, product tests, product-only boot, runtime isolation, wedge behavior, auth/failure honesty, at least one declared target platform/runtime, clean install, fresh and populated state, packaging closure, security/data, operations, artifact provenance/authority, and distribution.

For the first release only, the upgrade-from-a-previous-qualified-artifact subcheck may be not applicable because no predecessor exists; backup, state preservation, disable/uninstall recovery, and restoration to a healthy state still must be green. Any future not-applicable result must be permitted by the versioned matrix schema and approved with a written rationale by both the founder and independent release reviewer.

## Evidence records

The trust chain uses three records because CI cannot truthfully attest to review, release authorization, or future client use:

1. **CI qualification report (immutable).** Emitted for the build-once artifact after every machine-executable matrix job completes. It contains the capability/graduation item, source and reviewed qualification SHAs, internal-live evidence references, automated cell results, inputs for the human-authority cells, environment cells, tarball/version/SHA-256, product manifest, dependency-lock/SBOM hash, supported runtime set, migration/rollback evidence, aggregate-check result, and unexpected-skip count. Human-review and release-authorization cells remain explicitly pending here.
2. **QUALIFIED release record (sealed).** Created only after an independent reviewer accepts the CI report and completes the evidence-review cells, the same checksum passes internal staging, and the founder gives a distinct release authorization bound to `source SHA + version + artifact SHA-256`. It records the fully green matrix, reviewer verdict, ancestry, changelog/version check, distribution channel, support/data/rollback owners, and links to the immutable CI report and authorization. A protected release/tag mechanism must enforce this approval; approval to push `main` is not release approval.
3. **Client acceptance record (append-only).** Begins at assisted install and records checksum verification, health, client enablement, each acceptance run, output verdict, recovery events, and rollback/support ownership. The candidate remains QUALIFIED until this record proves one real meeting, a useful brief, repeat use, and a healthy recovery path; only then does it record CLIENT LIVE.

Runtime configuration is represented by its schema/version, nonsecret values, redacted secret references, enabled composition root, and canonical configuration hash. No record contains credential values, client secrets, or raw meeting content. These records are evidence, not alternate build artifacts.

## Relationship to the clarity halt

This decision defines the pipeline but does not implement it or lift G2. Before G2, work may refine the qualification contract and prepare the isolated internal-live plan. After G2, the first productization proposal must establish the product composition root, runtime configurations, fence, `tests/product/`, build-once artifact flow, and machine-readable evidence records before individual capabilities can graduate.

No capability is client-facing merely because it already ships in the generic npm tarball. Installing or enabling a QUALIFIED artifact starts client acceptance; CLIENT LIVE begins only after the acceptance record proves real use, useful output, repeat use, and recovery ownership.
