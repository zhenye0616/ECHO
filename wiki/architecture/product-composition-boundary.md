---
status: shipped
topic: Architecture
subtopic: Product Boundary
aliases:
  - Product Composition Boundary
  - echo-brain Boundary
  - Product Source Fence
  - Import Fence
---

# Product Composition Boundary (echo-brain)

**Shipped 2026-07-13** (item `2026-07-13-132-product-graduation-foundation`, merge `f316d565`). The rank-1 post-G2 foundation: an additive, in-repo composition boundary that makes the Team-product wedge (meeting → brief) independently bootable, testable, and packageable without carrying the lab. Maturity: **DEV** — this boundary makes graduation *possible*; it does not advance it.

## What it is

Three enforced layers, all additive (no existing wedge module moved):

1. **A versioned, machine-readable boundary** — `product/source-boundary.v1.json` names product entry points, the allowed internal source paths, forbidden roots (`src/daemon/`, `src/mcp/`, `src/coord/`, `src/trace/`, developer extractors, Slack/Linear responders, orchestration tooling), allowed external runtime packages, and the declared phase-1 platform (macOS / Node 22, arm64 target).
2. **A transitive import fence** — `tools/product/check-boundary.mjs` resolves the real module graph from every `src/product/` entry point (static imports, re-exports, literal dynamic imports, `require`, `createRequire`), rejects any edge outside the allowlist or into a forbidden root, bans `child_process` inside the shipped closure except the single `spawnSanitizedChild` owner, and emits a sorted closure manifest. Shipped closure at merge: **23 internal modules, 2 external packages (`ajv`, `better-sqlite3`), 0 forbidden edges.**
3. **A fail-closed product runtime** — `src/product/` composes only the wedge: Granola meeting input, injected signal-extraction dependency, manual-approval brief generation, installation-local state/health. Schema-validated config (`lane: "team-product"`, `approval_mode: "manual"`, secret references only), transactional startup with reverse rollback and deadlines, deepest-match filesystem probe that fails closed on network/unknown state volumes, and a hard `run` failure when no production brain adapter is registered — the founder-CLI brain is structurally outside the closure (extracted to the lab-only `granola-signals-cli-adapter`, injected by the lab daemon and `echoctl brief`).

## Test lane and artifact identity

- `test:product` now means only `tests/product/**` (hermetic: in-worker network interception, sanitized-child enforcement, injected clocks, synthetic content). The former broad suite runs honestly as `test:repo`; ci.yml runs both unconditionally.
- `tools/product/build-artifact.mjs` builds the private, unpublished `echo-brain` tarball **from Git objects at the supplied source SHA** (bytes bound by construction), packs exactly once per lineage with atomic publication, and emits per-file SHA-256 manifests. `prepare-offline-deps.mjs` materializes the exact-lock npm cache + Node headers so target installs run fully offline, including a source-built `better-sqlite3`.
- `.github/workflows/product-qualification.yml` qualifies the same bytes on the declared phase-1 target with exact-head checkout, `if: always()` evidence uploads, and an always-running terminal gate; current reports use `schemas/product/qualification-report.v2.schema.json` and must say `DEV`/`incomplete` until human-authority cells are genuinely green.

## What it is not

Not client-ready. The API-key brain adapter (rank 3), first-run cutoff/newest-first (rank 2), install/launchd/delivery (ranks 4–5), and all INTERNAL LIVE / QUALIFIED / CLIENT LIVE evidence remain open. The `echo-brain` repository does not exist; extraction waits until an exact artifact from this boundary passes isolated INTERNAL LIVE. Graduation vocabulary and matrix live in `raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md`.

## Related

- [[system-architecture]] — the lab substrate this boundary carves from
- [[artifact-identity]] — the cross-source join-key contract (distinct from product artifact identity above)
- [[capture-gate]], [[storage]] — shared substrate modules inside the allowlist
- Spec + review chain: `backlog/complete/2026-07-13-132-product-graduation-foundation.md` (5 review rounds, 32 findings; independent code review: merge as-is)
