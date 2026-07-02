---
item_id: 2026-07-02-110-packaged-daemon-brain-boundary
verdict: merge as-is
reviewed_at: '2026-07-02T21:10:20Z'
test_counts:
  passed: 1606
  failed: 1
producer: review-pending-orchestrator
---
## Verdict
All six ACs met with observed (not claimed) evidence at head_sha c94130f25e3b68465231ce615459f40d3dcc4f42. Touched-file set is exactly the 11-file files_to_modify allowlist (zero drift). Hoist is behavior-preserving: intake-seed.ts byte-identical; brain.ts verbatim except a required inlining of normalizeProjectName + TeamDecision types (keeping the value import would re-cross the 076 boundary and fail AC3; the type widening is structurally identical since EventId = string). AC5's dynamic-import catch is correctly narrow: only MODULE_NOT_FOUND naming propose-decision-tool is swallowed, so partial packaging breakage still fails loud. AC6's kickstart sits in bootstrapAndProbe, covering install/start/restart uniformly; failure paths mirror bootstrap. AC3 guard checks the real npm-pack manifest via TS AST static-import extraction and was red-verified against main (caught all 3 offenders). Verification observed: typecheck 0, lint 0, test:product 151 files passed / 1 failed with the sole failure being the AC4-carved tests/mcp/recent-calls-endpoint.test.ts timeout (item 111 still in ready/, carve applies); shell-reachable.test.ts passed including the launchd leg (36.4s). Two founder-answered escalations (AC5 conditional registration, AC6 launchd kickstart) are implemented exactly per the amended spec.

## Pre-merge fixups
- [x] none — reviewer found no pre-merge fixups

## Expected merge conflicts
- none expected — merge-base 38eec077; main's 8 commits since touch only backlog/journal/review files; overlap with branch-changed files is empty

## Follow-up items (defer, do not block merge)
- Add a non-empty assertion on shippedJs in tests/packaging/import-closure.test.ts to close the vacuous-pass window (currently mitigated by the sibling packed-manifest snapshot failing loudly on missing dist/)
- Extract the duplicated npm pack --dry-run --json parsing into a shared tests/packaging helper
- Deduplicate normalizeProjectName + TeamDecision types between src/brain/brain.ts and the responder surface (single owner in src/brain/, surface imports from it)
