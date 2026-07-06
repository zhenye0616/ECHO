---
item_id: 2026-07-06-121-intake-terminal-entry-guard
verdict: merge as-is
reviewed_at: '2026-07-06T16:27:44Z'
test_counts:
  passed: 1768
  failed: 0
producer: review-pending-orchestrator
---
## Verdict
Merge as-is; founder ratifies the one flagged package.json line at merge. Ground-truth HEAD matches (0ac5cc7d). AC1 PASS: VITEST guard fully deleted, house import.meta entry check in place. AC2 PASS with the fail-against-old-guard property reproduced independently by the reviewer (reverted guard -> test fails on the USAGE banner -> restored). AC3 PASS: existing 8 tool tests unchanged. Load-bearing finding verified at source and empirically: bare vite-node drops the script path from argv (argv[1] stays the vite-node bin), so the guard is only distinguishable under vite-node --script — forcing the npm-script edit intake:terminal -> 'vite-node --script tools/intake-terminal.ts' (repo precedent: eval:retrieval already uses --script). Preserving both import-safety and bare-vite-node launch is architecturally impossible; builder chose safety. Packaged path is a non-issue (tool not in the pack; direct node invocation fires the guard in the safe direction). No other importer relied on the old side effect. Zero drift beyond the flagged line; 4 files exactly.

## Pre-merge fixups
- [ ] none — founder ratification of the package.json line happens via the merge itself

## Expected merge conflicts
- none: merge-tree clean against current main; package.json untouched on main since the branch point

## Follow-up items (defer, do not block merge)
- docs-awareness: canonical invocation is npm run intake:terminal (or vite-node --script); bare vite-node no longer launches, by design — fold into the 116 wiki note at promotion
- optional: audit sibling tools/ entry guards for the VITEST antipattern (only if it recurs)
