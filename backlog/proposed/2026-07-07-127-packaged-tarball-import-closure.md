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

- **AC1 — closure ships (packaging fix):** the packed tarball contains every
  `dist/` module in the daemon entrypoint's static import closure —
  specifically `dist/surfaces/ceo-slack-responder/propose-decision-tool.js` and
  any enrich→responder chain modules — by adjusting the `package.json`
  `files`/pack configuration so the excluded tree's still-imported modules are
  shipped. `npm pack --dry-run` manifest proves it. The import-RESTRUCTURE
  alternative (moving imports so the packaged layer no longer crosses into the
  excluded tree) is explicitly NOT taken here: it would edit source surfaces
  (`src/mcp/server.ts` / the responder tree) and risks the propose_decision /
  Slack-surface / brain-boundary contracts this item's Out of Scope locks. The
  fix is packaging-config only (`package.json` + the guard tests), consistent
  with files_to_modify.
- **AC2 — vacuous window closed:** `import-closure.test.ts` asserts the
  discovered shipped-JS set is non-empty (and fails loudly when `dist/` is
  absent or empty), so the guard can never pass vacuously again.
- **AC3 — packaged boot proof (real, no mocks):** a new test at
  `tests/packaging/packaged-boot.test.ts` (a permitted path) proves the
  packaged daemon reaches health from the packed layout. It MUST: run
  `npm pack` to produce the real tarball, extract/install it into a temp
  directory OUTSIDE the repo tree (no reliance on repo `node_modules` symlinks
  or dev layout), launch the packaged daemon entrypoint/bin from that installed
  layout under production-style module resolution with NO mocks, and FAIL on
  any real `ERR_MODULE_NOT_FOUND`-class import error rather than inferred or
  mocked reachability. Run via `npx vitest run tests/packaging/packaged-boot.test.ts`.
  (This supersedes the earlier "shell-reachable counts if it genuinely
  exercises the entrypoint" judgment call — the proof is now a pinned,
  self-contained packaging test.)
- **AC4 — post-merge Windows CI validation (NOT a builder AC):** the `onboarding
  · windows-latest` CI job and the release `validate package · windows-latest`
  job must pass on a real post-merge run. This is a founder/watcher
  merge-validation gate, NOT part of the builder's pending_review handoff — a
  builder finishing on the feature branch cannot produce post-merge CI evidence,
  so it is not a completion criterion for moving the item to pending_review. The
  builder's pre-review gate is AC3 (real packaged-boot test green on the feature
  branch) plus AC5; the real Windows jobs are verified by founder/watcher after
  merge (evidence linked in the run log; local win32 emulation not required).
- **AC5 — gate (builder completion):** full local `npm run test && npm run lint
  && npm run typecheck` green on the feature branch — this plus AC3's
  packaged-boot test is the builder's pending_review handoff gate.

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
- Post-merge (founder/watcher validation, per AC4): confirm the `onboarding ·
  windows-latest` CI job and the release `validate package · windows-latest`
  job go green on a real run, and link the run evidence in the run log.
- Unblocks: Windows beta-tester install path (n=1 concierge gate).
