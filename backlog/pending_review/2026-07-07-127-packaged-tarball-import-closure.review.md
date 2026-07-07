---
item_id: 2026-07-07-127-packaged-tarball-import-closure
verdict: merge as-is
reviewed_at: '2026-07-07T08:37:23Z'
test_counts:
  passed: 2076
  failed: 3
producer: review-pending-orchestrator
---
## Verdict
Merge as-is. Ground-truth HEAD matches (b366d758c8a846be26f9a3c916604eee53987a74). AC1 Met and independently verified: the reviewer recomputed the transitive closure from the built dist import graph — exactly the 11 re-included responder modules ship, index.js provably outside the closure stays excluded (076 boundary preserved); zero src/ edits (diff = package.json + 3 tests/packaging files). AC2 Met: import-closure.test.ts fails loudly on an empty shipped-JS set. AC3 Met and red-verify REPRODUCED by the reviewer: reverse-applying only the package.json hunk leaves the static-walk test and the boot test's first two assertions green on macOS — only the propose_decision_skipped assertion catches the regression, exactly as the builder claimed; restored cleanly. Root cause verified at source (src/mcp/server.ts:82-101): the optional-module guard matches with a forward slash while Windows ERR_MODULE_NOT_FOUND carries backslashes — guard misses, rethrows, daemon dies pre-health on Windows while macOS swallows; this fix makes the guard's absent-path unreachable in packaged installs. The guard bug itself correctly stays unfixed (locked scope) and is filed as a follow-up. AC4 (Windows CI green) is the founder/watcher post-merge gate. The 3 recorded full-suite failures are all load-flakes that isolation-pass (shell-reachable, ceo-slack-brain, and NEW: packaged-boot itself — npm-pack rebuild race under parallel suite load); lint + typecheck clean. Merge preview clean: main's advance (124/125 merges) has zero overlap with the 4 diffed files.

## Pre-merge fixups
- [ ] none

## Expected merge conflicts
- none: git diff claim-base..origin/main over the 4 diffed files is empty

## Follow-up items (defer, do not block merge)
- backslash-tolerant guard match in src/mcp/server.ts:87 (separator-agnostic regex) — any future partial-install on Windows still hard-crashes the daemon through this guard
- serialize or fixture-share the npm-pack-based packaging tests (shared tarball per run or single-thread the tests/packaging pool) — packaged-boot joins the full-suite flake set via concurrent prepack rebuild races
- AC4 founder/watcher gate: after merge, confirm onboarding·windows-latest (CI) and validate-package·windows-latest (release) go green on real runs
