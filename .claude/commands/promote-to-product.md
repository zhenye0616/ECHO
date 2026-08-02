---
description: Four-stage qualification and release gate for Team-product code — DEV to INTERNAL LIVE to QUALIFIED to CLIENT LIVE. One capability per graduation, build once, controlled release matrix, exact-artifact client acceptance.
---

# Promote to Product — qualify and release the Team wedge

Canonical decision: `raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md`.

**Scoped authority:** only for the echo-context sequential program named in `raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md`, the persistent Codex coordinator may fill a founder approval/execute cell through the required committed exact-operation authorization. This substitutes the approval actor, not the qualification matrix, independent review, exact-artifact staging, backup, rollback, acceptance, or client-safety evidence. Ordinary Team-product promotion remains founder-gated.

This skill governs the only path from ECHO's lab into the client-facing Team product:

> **DEV -> INTERNAL LIVE -> QUALIFIED -> CLIENT LIVE**

It is **not executable yet**. `src/product/`, `tests/product/`, the product composition root, runtime isolation, and the qualification runner do not exist. The original 132/133 carve specs were withdrawn, and G2 still blocks product specs/code. Until the founder signs G2 and the successor carve lands, this file is the operating contract for the future mechanism.

## Vocabulary — do not overload promotion

- **Advance a spec:** `proposed/ -> ready/` through the review watcher.
- **Document shipped work:** update the wiki after merge.
- **Qualify code:** move one live-proven capability into the product boundary and pass the release matrix.
- **Release/accept:** install the exact qualified artifact on a client machine, then close acceptance through real and repeat use.

Moving code under `src/product/` makes it a **qualification candidate**, not automatically client-live. Packaging it, merging it, or demonstrating it on a team-controlled internal Mac also does not release it.

## Four stages

| Stage | Meaning | Gate evidence |
|---|---|---|
| DEV | Lab code in a branch/worktree, scratch state, fixtures, behavior still changing | Typed contract, focused hermetic tests, review-ready change, live-test plan |
| INTERNAL LIVE | Versioned candidate package built from a pinned SHA runs in an isolated internal-live environment on real meetings | Predeclared run count/regime, verdicts, failure inventory, recovery evidence |
| QUALIFIED | Product-boundary change and build-once artifact pass every required release-matrix cell | Matrix report, independent review, manifest, source SHA, artifact checksum, exact-artifact staging smoke |
| CLIENT LIVE | The same QUALIFIED bytes run on the client's Mac with client-local state/credentials | Assisted-install record, healthy client runtime, real meeting, useful brief, repeat use, rollback/support proof |

Operating mode (`automated | concierge`), repo state (`merged | packaged`), lifecycle (`active | deferred | retired`), and evidence grade are separate attributes. Do not use them as substitutes for the four-stage maturity axis.

## Separation invariants

1. Dev, internal-live, qualification, and client-live use distinct home, db, port, launchd label, logs, credentials, and checkpoints.
2. Dev may boot the lab. QUALIFIED and CLIENT LIVE boot only the Team composition root and explicit dependencies.
3. `customer | dogfood` remains the legacy install-audience profile. It does not select runtime workers and cannot represent product isolation.
4. Qualification builds once. Every check, release, and client install uses the exact artifact identified by SHA-256.
5. INTERNAL LIVE, QUALIFIED, and CLIENT LIVE use versioned packages and never require a repo checkout. CLIENT LIVE never requires founder-machine state, founder CLI auth, or founder credentials.
6. Evidence advances; mutable live data never enters the artifact.
7. No demo, test, or deadline skips a stage.

## DEV -> INTERNAL LIVE gate

Before live data is touched, the candidate must have:

- a versioned candidate package built from a pinned SHA;
- an isolated internal-live configuration that cannot read/write dev or client state;
- a predeclared live-test plan and output rubric;
- a rollback/disable command;
- focused tests and no known state-corruption risk.

A checkout or uncommitted working-tree code running against live state does not count as INTERNAL LIVE evidence.

## INTERNAL LIVE -> QUALIFIED gate

One capability graduates at a time. The internal-live record must cite real workflows, output verdicts, observed failures, and recovery. The post-G2 graduation proposal then verifies:

1. **Boundary-clean.** The capability imports only approved product/kernel dependencies; no lab daemon, dev extractors, MCP/Fleet orchestration, trace/reasoning surface, or internal-only path.
2. **Fail-closed.** Missing configuration cannot accidentally run or act.
3. **Fail-honest.** Empty input, expired auth, vendor errors, and missing manual steps are explicit and bounded.
4. **Typed/versioned contracts.** No vendor nouns leak into core stage artifacts.
5. **Persisted semantics registered.** Sources, identities, sidecars, migrations, backup, and rollback are classified.
6. **Hermetic product tests.** Tests move under `tests/product/`; no live credentials, network, internal-live db, or wall clock.
7. **Packaging deliberate.** Product manifest, import closure, entry point, and active worker list are pinned.
8. **Unknowns swept.** Relevant A/B/T/C/X closure rows are resolved or explicitly accepted/deferred by the governing decision.
9. **Behavior already stable.** Graduation is primarily a move/wiring change; behavior changes happen and return to INTERNAL LIVE before qualification.

## Release qualification matrix — every required row green

- product source/import fence;
- product-only composition root and active-worker allowlist;
- hermetic `tests/product/` plus packaged meeting-to-brief end-to-end fixture;
- client-scoped API-key auth and bounded failure behavior;
- declared macOS version/architecture/Node runtime matrix;
- clean no-repo install plus the real launchd start, doctor, restart, and uninstall path;
- cold/fresh db plus populated-db migration and sidecar classification;
- upgrade from and rollback to the previous qualified artifact without client-state loss;
- product-only package manifest, runtime import closure, and reproducible dependency lock/SBOM;
- secret/content/dependency/data-contract checks;
- health, recovery, alert/support ownership;
- reviewed-main ancestry, INTERNAL LIVE evidence, aggregate required check, zero unexpected skips, monotonic version/changelog, build-once SHA-256, authenticated distribution channel, and founder release authorization.

This matrix is not a score. A red or missing cell blocks release. Source boundary, product tests, product-only boot, runtime isolation, wedge behavior, auth/failure honesty, at least one declared platform/runtime cell, clean install, fresh/populated state, packaging, security/data, operations, provenance/authority, and distribution can never be `not-applicable`.

For the first release only, upgrade-from-a-previous-qualified-artifact may be `not-applicable`; backup, state preservation, disable/uninstall recovery, and healthy restoration remain required. Any later `not-applicable` result must be allowed by the versioned matrix schema and approved with rationale by both the founder and independent release reviewer.

## Mechanical flow after G2

1. Stabilize behavior in DEV through an ordinary reviewed lab item.
2. Build a versioned candidate package from the pinned SHA, run it in the isolated INTERNAL LIVE lane, and commit the redacted evidence record.
3. Create one `backlog/proposed/` graduation item naming the exact move, boundary, live evidence, matrix rows, and rollback.
4. Builder moves/wires the capability into `src/product/`, moves/adds hermetic tests under `tests/product/`, and updates the product manifest/composition root. No unrelated capabilities or behavior changes.
5. After reviewed code reaches `main`, CI builds the package once, runs every machine-executable matrix cell against those bytes, and emits an immutable qualification report plus checksum. Human-review and release-authorization cells remain explicitly pending.
6. An independent release reviewer verifies the report and completes the evidence-review cells, and the exact artifact passes internal staging. Seal a fully green QUALIFIED release record only after a separate founder authorization bound to `source SHA + version + artifact SHA-256`; enforce it through the protected tag/release mechanism. Approval to push `main` is not release approval.
7. Assisted onboarding installs the same artifact on the client Mac, verifies its checksum, and enables only the client runtime. Its maturity remains QUALIFIED while acceptance is pending.
8. Append client acceptance evidence for health, a real meeting, a useful brief, repeat use, and recovery/rollback ownership. Mark CLIENT LIVE only when all are present.

The three records are separate: CI qualification report, sealed QUALIFIED release record, and append-only client acceptance record. Store only configuration schema/version, nonsecret values, redacted secret references, enabled composition root, and a canonical configuration hash; never store credentials or raw meeting content.

## Rollback and de-graduation

- **INTERNAL LIVE:** disable the candidate and restore the prior pinned internal-live version.
- **QUALIFIED:** a red matrix blocks release; nothing reaches a client.
- **CLIENT LIVE:** config-off or reinstall the previous qualified artifact first, preserving client-local data under the written rollback contract.
- **Repo de-graduation:** if code must leave `src/product/`, reverse the move in a separate reviewed item. Do not make a client incident wait on that code move.

## Current wedge state (2026-07-11)

| Capability | Maturity | Honest status |
|---|---|---|
| Granola meeting -> signal -> brief core | DEV; predecessor has founder-regime evidence | Current candidate package has not completed a versioned, pinned, isolated run; full-lab/CLI-auth regime is not the internal-live lane |
| Client API-key brain | No candidate | Direction decided; meeting extraction binding unbuilt |
| Client meeting/delivery adapters | No candidate | Zoom/Mattermost access and code absent |
| Product boundary/composition root | No candidate | `src/product/` absent; successor carve waits for G2 |
| Release qualification mechanism | No candidate | Contract defined; runner/reports and product-only gates unbuilt |
| Client installation | No candidate | Generic package install evidence is diagnostic, not CLIENT LIVE evidence |

`No candidate` is not a fifth maturity stage. It means there is nothing to place on the four-stage axis yet.
