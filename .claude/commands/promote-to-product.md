---
description: Graduation gate for client-facing code — the checklist and mechanical steps for moving a validated capability from the dev/lab tree into src/product/, mirroring the loop's own propose→confirm discipline at the repo level. One capability per graduation; each graduation is its own small backlog item through the review queue.
---

# Promote to Product — the code graduation gate

`src/product/` is the repo's ratified ledger: code there is client-facing, ships in the deploy tarball's active surface, and is protected by the product boundary fence. Everything outside it is the lab — valuable, live-tested by the founder's own loop, but *candidate*, not ratified. This skill is the confirm-leg between the two, applying the same philosophy as the decision loop's stage 3 (nothing enters the record unratified) to the codebase itself.

**Effective once the product carve ships** (the fence, composition roots, and closure tests this gate relies on). The original carve specs (items 132/133, 2026-07-10) were review-converged then WITHDRAWN by the founder the same day in favor of a full dev halt until the fresh-machine unknowns map reaches max clarity; the carve will be re-specced post-halt, inheriting the register's standing decisions (naming = `product`, kernel/fence boundary, retrieval-less brain mode, tarball deploys). Until then this file is the spec of the mechanism, not an executable protocol.

## The two levers (do not conflate them)

1. **Repo graduation (this skill):** code moves under `src/product/` — it becomes part of the product's trusted surface, subject to the fence, shipped active in the tarball.
2. **Deployment enablement (config, not code):** what actually runs on a given box is decided by credentials/config — the client profile (e.g. Granola-only) keeps graduated-but-founder-side capabilities (intake bridge, decision responder) fail-closed OFF. Graduating code does NOT auto-enable it for clients.

A capability rolls out in that order: lab → graduated (founder profile exercises it on the box) → client-enabled (config flips for a client deployment). Rollback at each level is the inverse lever: config off, or `git mv` back out.

## Graduation criteria — ALL must hold

1. **Validated in anger.** The capability ran in the founder's live loop (real meetings, real decisions — not fixtures) enough times that its failure modes are known and written down. Cite the evidence (journal entries, agent-run logs, live-fire notes) in the graduation item.
2. **Fence-clean.** With the files moved, the product import-closure test passes: imports only kernel dirs + product + declared deps; nothing from `capture/extractors/`, `mcp/`, `coord/`, `trace/`, `reasoning/`, `daemon/index.ts`.
3. **Fail-closed without config.** Absent credentials/env, the capability is silently OFF (the intake-bridge pattern) — a client profile can never accidentally run it. Fail-closed behavior has a test.
4. **Fail-honest at the contract edge.** Stage-contract invariants hold: never fabricate from empty input; failures are self-explaining (name the missing manual step or credential, per the 131/target-miss discipline). Vendor quirks are handled at the binding edge, never leaked into stage contracts or typed artifacts.
5. **Typed artifacts only between stages.** Anything the capability passes to or receives from another stage is a versioned typed object (the canonical brief JSON pattern); no vendor nouns in the core types.
6. **Persisted-semantics reviewed.** Any new `derived:*` source string, dedupe_key format, or sidecar file is added to the product source allowlist / sidecar classification (instance-local vs loop-state) in the same item — no unregistered persistence.
7. **Tests graduate with the code**, hermetic (no live creds/network/wall-clock), mirrored under `tests/product/`.
8. **Packaging is deliberate.** Packed-manifest snapshot updated; packaged-boot still resolves the CLI surface; the manifest diff is quoted in the item's notes.
9. **Register swept.** Check `raw/internal/decisions/2026-07-10-product-carve-unknowns-register.md` (and successors): does this graduation touch an open unknown (A2 cold-db, A3 brain binding, T-series)? If yes, the item must say how — or why it can proceed anyway.

## Mechanical steps (per graduation)

1. **Spec a small backlog item** (`backlog/proposed/`, normal queue review): what moves (exact `git mv` list, old→new paths), the evidence for criterion 1, and the criteria-9 sweep. Graduations are deliberately small — one capability, one item, one reviewable diff. Never batch unrelated capabilities.
2. Builder executes: `git mv` + import rewrites + composition-root wiring (product daemon/CLI if the capability gains an entry point) + fence/lint updates + test move + packaging update. Pure-move discipline where possible; behavior changes belong in a prior lab item, not the graduation diff.
3. Review verifies the criteria (the fence closure test and fail-closed test are the mechanical teeth; criterion 1's evidence is the judgment call).
4. Post-merge: version-bump, `npm pack`, deploy the new tarball to the box (deploy protocol: tagged tarballs only, no git on the box, rollback = previous tarball). The founder profile exercises the graduated capability live before any client profile enables it.

## De-graduation (rollback)

If a graduated capability proves not-ready: config-off first (instant, per-deployment). If the code itself must leave the product surface, reverse the `git mv` in a small item with the same review path. The fence makes both directions mechanical.

## Current stage map (2026-07-10 baseline)

Per the canonical five-stage loop (`raw/internal/decisions/2026-07-09-decision-loop-canonical-model.md`):

| Stage | Capability | Status |
|---|---|---|
| 1 Extract | Granola binding → poller/signals/brief | graduates in the founding carve (re-spec pending post-halt) |
| 2 Triage | reconcile-vs-ledger classifier | lab — missing its core (zero-retrieval today); farthest from graduation |
| 3 Validate | propose→confirm gate (station 4) | code graduates with the carve; founder-side profile only (Slack-bound) |
| 4 Dispatch | Linear issue creation w/ provenance | code graduates with the carve; founder-side profile only |
| 5 Backflow | done-vs-decided composition | lab/concierge — pre-meeting brief + polish-capture status atoms are its path in |
