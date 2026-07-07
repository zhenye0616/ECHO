---
id: 2026-07-07-127-packaged-tarball-import-closure
title: "Fix the packaged tarball's import closure — ship propose-decision-tool + the enrich→responder chain, close 110's vacuous-pass window; unblocks the failing Windows onboarding/release gates"
status: proposed
priority: HIGH
estimate: 0.5d
created: 2026-07-07
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-07-07T08:08:18Z"
branch: "agent/packaged-tarball-import-closure"
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
ready_content_sha: 4e1f6278c7e77ddbd633d175305e9c5f431ff869ba36a0d591d17b72e020f968
head_sha: "b366d758c8a846be26f9a3c916604eee53987a74"
pr_url: ""
review_notes: |
  Merged on 2026-07-07 via founder reconciliation (clean-path, pre-approved).

  Conflicts resolved:
  - none — merge --no-ff was conflict-free; the 4 diffed files (package.json,
    tests/packaging/import-closure.test.ts, tests/packaging/packaged-boot.test.ts,
    tests/packaging/packed-manifest.test.ts) have zero overlap with main's 124/125
    advance.

  C3.5 cross-vendor consult: none invoked

  Fixups applied:
  - none (sidecar verdict "merge as-is", zero pre-merge fixups)

  Fixups deferred to follow-up items:
  - none

  Root cause (verified at source): the packaged daemon crashed pre-health on
  Windows because dist/mcp/server.js's guarded dynamic import of
  propose-decision-tool.js resolves into the excluded ceo-slack-responder tree,
  and the optional-module guard at src/mcp/server.ts:82-101 matches the missing
  path with a forward slash while Windows ERR_MODULE_NOT_FOUND carries
  backslashes — the guard misses, rethrows, daemon dies. This fix is
  packaging-config only: re-including the 11-module transitive closure makes the
  import resolve on every platform so the guard's absent-path branch is never
  reached in a packaged install. The guard's backslash bug is DELIBERATELY left
  unfixed (locked scope) and filed as a follow-up (backslash-tolerant guard match
  in src/mcp/server.ts).

  Verify: npm test = 2094 passed / 1 failed full-suite; sole failure
  tests/cli/shell-reachable.test.ts (known full-suite-load flake) PASSES in
  isolation (founder-authorized flaky rule; re-run green). lint clean, typecheck
  clean, check-coupled-invariants OK, sync-skills --check OK.

  AC4 (onboarding·windows-latest CI + validate-package·windows-latest release
  green on real post-merge runs) remains an OPEN founder/watcher gate — not
  satisfiable from the feature-branch handoff; verify post-merge.

  Follow-up items (non-blocking, see backlog/_followups.md):
  - backslash-tolerant guard match in src/mcp/server.ts (separator-agnostic).
  - serialize/fixture-share the npm-pack-based packaging tests to remove the
    packaged-boot full-suite prepack-race flake.
  - AC4 founder/watcher gate: confirm the two Windows jobs go green on real runs.
agent_notes: |
  Done on agent/packaged-tarball-import-closure @ b366d758c8a846be26f9a3c916604eee53987a74.

  AC1: package.json `files` re-includes the 11-module transitive static closure
  of the daemon's dynamic import of ceo-slack-responder/propose-decision-tool.js
  (propose-decision-tool, responder, brain, intake-seed, intake-agent,
  intake-draft-store, draft-store, decision-store, identity, issue-render,
  linear-client). index.js (the Slack poller surface) stays excluded to preserve
  the 076 boundary; it is not in the closure. npm pack --dry-run manifest proves
  the 11 ship and index.js does not. No src/mcp/server.ts or responder-tree edits
  (import-restructure was removed in r1). AC2: import-closure.test.ts asserts
  shippedJs non-empty. AC3: new tests/packaging/packaged-boot.test.ts — real
  no-mocks pack -> install -g into a temp prefix OUTSIDE the repo -> launch
  dist/daemon/index.js -> health via the daemon.lifecycle "started" stdout line;
  fails on ERR_MODULE_NOT_FOUND on stderr AND on a swallowed
  propose_decision_skipped (assertion 3 makes it non-vacuous on macOS/Linux where
  the server.ts guard's forward-slash check catches the error — the Windows crash
  is that guard missing a backslash path).

  Root cause note for reviewer: 110 already made the crossing a *guarded dynamic*
  import, so there is NO static crossing and import-closure.test.ts (static-only)
  cannot flag it — by design. The live Windows failure is the guard's
  forward-slash path check missing Windows backslash messages; the packaging fix
  makes the import resolve on every platform so the guard's absent-path is never
  hit in a packaged install.

  Red-verified (blind-holdout): reverting only the 11 re-includes leaves
  import-closure green (dynamic import invisible to static walk) and left
  packaged-boot green on macOS until assertion 3 was added; with assertion 3 the
  pre-fix boot test fails on propose_decision_skipped, restored fix -> green.

  Gate (AC5): typecheck + lint clean; npm run test = 2078 passed, sole failure
  tests/cli/shell-reachable.test.ts (launchd leg) which PASSES in isolation — the
  known full-suite-load flake. AC4 (post-merge Windows CI) is the founder/watcher
  gate, not this handoff.
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
