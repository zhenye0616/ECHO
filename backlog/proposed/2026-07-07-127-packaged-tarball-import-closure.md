---
id: 2026-07-07-127-packaged-tarball-import-closure
title: "Fix the packaged tarball's import closure — ship propose-decision-tool + the enrich→responder chain, close 110's vacuous-pass window; unblocks the failing Windows onboarding/release gates"
status: proposed
priority: HIGH
estimate: 0.5d
created: 2026-07-07
blocked_by: []
spec_refs:
  - package.json                                    # files/pack configuration — what the tarball ships
  - tests/packaging/                                # 110's import-closure + packed-manifest tests
  - backlog/complete/2026-07-02-110-packaged-daemon-brain-boundary.md   # the boundary model + the known vacuous-pass window
  - src/mcp/server.ts                               # registers propose_decision — the import that breaks packaged boot
  - .github/workflows/ci.yml                        # the failing windows onboarding job
  - .github/workflows/release.yml                   # the failing validate-package windows job
files_to_modify:
  # PROVISIONAL
  - package.json
  - tests/packaging/
---

## Problem

The packaged daemon cannot boot from the published tarball: `dist/mcp/server.js`
imports `propose-decision-tool.js` from the excluded
`dist/surfaces/ceo-slack-responder/` tree, producing `ERR_MODULE_NOT_FOUND`
before daemon health. This is ACTIVE breakage, not latent: CI run 28843630486
(`onboarding · windows-latest`) and release run 28843009472
(`validate package · windows-latest`) both fail on it today (2026-07-07).
The Windows path is the gate for the first beta tester (n=1), so this blocks
the concierge install.

The debt chain was fully filed but never fixed: [108] flagged the exclusion,
[109] flagged the same class on the enrich→responder import chain, and [110] —
which fixed the *brain* half of the boundary — left its own guard with a
vacuous-pass window (`import-closure.test.ts` never asserts `shippedJs` is
non-empty, so an absent `dist/` passes silently). Three consecutive merges
carried the bullets; the 2026-07-07 followup sweep's liveness audit connected
them to the live CI failures.

## Acceptance Criteria

- **AC1 — closure ships:** the packed tarball contains every `dist/` module in
  the daemon entrypoint's static import closure — specifically
  `dist/surfaces/ceo-slack-responder/propose-decision-tool.js` and any
  enrich→responder chain modules — OR the imports are restructured so the
  packaged layer no longer crosses into an excluded tree (builder judgment;
  110's boundary model is the precedent — say which and why in a comment).
  `npm pack --dry-run` manifest proves it.
- **AC2 — vacuous window closed:** `import-closure.test.ts` asserts the
  discovered shipped-JS set is non-empty (and fails loudly when `dist/` is
  absent or empty), so the guard can never pass vacuously again.
- **AC3 — packaged boot proof:** a test (or the existing onboarding self-test
  path run locally against a fresh `npm pack` install) proves the packaged
  daemon reaches health — the `ERR_MODULE_NOT_FOUND` class is exercised, not
  inferred. `tests/cli/shell-reachable.test.ts` passing against the packed
  layout counts if it genuinely exercises the packaged entrypoint.
- **AC4 — CI green on the failing jobs:** after merge, the `onboarding ·
  windows-latest` CI job and the release `validate package · windows-latest`
  job pass on a real run (founder or CI evidence linked in the run log; local
  win32 emulation is not required — the jobs themselves are the gate).
- **AC5 — gate:** full test/lint/typecheck green.

## Out of Scope (Don't Drift)

- No Windows product-code porting beyond the packaging fix (the broader
  Windows EPIC and quality-job matrix stay separate).
- No branch-protection / aggregate-gate work (092's deferral is its own item).
- No changes to propose_decision behavior, the Slack surface, or the brain
  boundary model — packaging and its guard only.
- No release/tag automation changes.

## After Completion (Strategist Notes)

- Update the mcp-server (or packaging) wiki note per 110's still-owed
  After-Completion item — fold this fix into the same boundary-invariant
  paragraph.
- Record in the drift log that the 108→109→110 packaging debt chain sat filed
  across three merges while CI failed — evidence for making the followups
  liveness sweep periodic.
- Unblocks: Windows beta-tester install path (n=1 concierge gate).
