---
id: 2026-07-06-121-intake-terminal-entry-guard
title: "intake-terminal entry guard: replace VITEST env check with the house import.meta entry check — importing the module must never run the tool"
status: pending_review
priority: HIGH
estimate: 0.5h
created: 2026-07-06
blocked_by: []
claimed_by: "builder-121-88a8a68b"
claimed_at: "2026-07-06T16:11:01Z"
branch: "agent/intake-terminal-entry-guard"
head_sha: "0ac5cc7d2d4761b93025a39ec7f6fe148b56b811"
pr_url: ""
agent_notes: |
  Done. Replaced the VITEST auto-main guard in tools/intake-terminal.ts with the
  house `process.argv[1] === fileURLToPath(import.meta.url)` entry check
  (ceo-slack-responder pattern); deleted the VITEST comment + check entirely.
  AC2 regression test + fixture added under tests/tools/; verified it FAILS
  against the old guard (reverted locally, saw main() run on import → USAGE
  banner) and passes against the new guard. AC3: existing 8 intake-terminal
  tests pass unchanged. Full suite: 1768 passed / 21 skipped; typecheck + lint
  clean.

  REVIEWER FLAG — one out-of-scope file: package.json. The house pattern's
  argv[1] equality holds under vite-node ONLY in `--script` mode; plain
  `vite-node <file>` drops the script name from argv (argv[1] stays the
  vite-node binary), so entry is byte-indistinguishable from import and the npm
  script would NOT launch the tool. I verified this empirically (vite-node
  cli.mjs:41 sets argv[1]=resolve(file) only under --script). To keep
  `npm run intake:terminal` launching (a hard task requirement), I changed the
  script to `vite-node --script tools/intake-terminal.ts` (1 line; matches the
  repo's existing eval:retrieval invocation). This is forced by vite-node's
  architecture, not scope creep, but package.json is outside the item's
  PROVISIONAL files_to_modify — flagging for your call. Consequence: AC1's
  literal `npx vite-node tools/intake-terminal.ts --once` (plain, no --script)
  won't launch; no in-file discriminator can fix that. Full rationale in the run
  log.
fast_track: |
  Founder-authorized fast-track 2026-07-06 (spec-review rounds waived for a
  one-line safety fix discovered live). Provenance: during the 07-06 live test,
  a vite-node script that merely IMPORTED a helper from tools/intake-terminal.ts
  silently launched the real tool against the prod DB with the real brain,
  because the auto-main guard is `process.env.VITEST === undefined`
  (tools/intake-terminal.ts:523-524) and vite-node outside vitest leaves VITEST
  unset. Contained (bridge is storage-read-only; one stray state file cleaned),
  but it is a live silent-action foot-gun of exactly the class items 117-120
  eliminated. Build + independent review + founder merge gates all still apply.
review_notes: |
  Merged on 2026-07-06 via founder reconciliation.

  Conflicts resolved:
  - none — merge --no-ff was clean; merge-tree matched the sidecar's "none"
    prediction (package.json untouched on main since the branch point). Exactly
    4 files landed: package.json, tools/intake-terminal.ts,
    tests/tools/intake-terminal-entry-guard.test.ts, and
    tests/tools/fixtures/import-intake-terminal-entry.ts.

  C3.5 cross-vendor consult: none invoked

  Fixups applied:
  - none

  Fixups deferred to follow-up items:
  - none

  Founder ratification: the one flagged package.json line
  (intake:terminal -> "vite-node --script tools/intake-terminal.ts") is
  pre-ratified via this merge, per the sidecar verdict. It is forced by
  vite-node's architecture (argv[1] only carries the script path under
  --script), not scope creep; repo precedent is eval:retrieval.

  Verify: 2037 tests pass / 21 skipped / 1 todo (193 files pass / 1 skipped);
  lint, typecheck, coupled-invariants, and sync-skills --check all clean
  post-merge. Count exceeds the sidecar's 1768 because the merge base is a newer
  origin/main tip, not because of this branch.

  Follow-up items (non-blocking):
  - docs-awareness: canonical invocation is `npm run intake:terminal` (or
    `vite-node --script tools/intake-terminal.ts`); bare `vite-node` no longer
    launches, by design — fold into the 116 wiki note at promotion.
  - optional: audit sibling tools/ entry guards for the VITEST antipattern
    (only if it recurs).
spec_refs:
  - tools/intake-terminal.ts                         # the guard at :523-524
  - src/surfaces/ceo-slack-responder/index.ts        # house entry-check pattern (:8)
files_to_modify:
  # PROVISIONAL
  - tools/intake-terminal.ts
  - tests/tools/                                     # regression test
---

## Problem

`tools/intake-terminal.ts` auto-runs `main()` at import time whenever
`process.env.VITEST` is unset. Any script executed via vite-node (or node)
that imports ANY symbol from the module fires the real intake tool — real
brain calls, real seed-store writes — as a side effect of the import.
Demonstrated against prod during the 2026-07-06 live test.

## Acceptance Criteria

- **AC1 — house entry check:** replace the `VITEST` guard with the existing
  house pattern: `if (process.argv[1] === fileURLToPath(import.meta.url))`
  (see `src/surfaces/ceo-slack-responder/index.ts:8`). Direct CLI invocation
  (`npm run intake:terminal`, `npx vite-node tools/intake-terminal.ts --once`)
  still runs; importing the module never does. Delete the VITEST comment/check
  entirely — no dual guard.
- **AC2 — import-side-effect regression test:** a test imports one or more
  exported helpers from `tools/intake-terminal.ts` and asserts the tool did
  not start (no bridge invocation / no seed-store write / no process side
  effect — implement via an observable module-level flag or by asserting the
  scratch seed-store path is untouched). This test must FAIL against the old
  guard.
- **AC3 — CLI still works:** existing intake-terminal tests pass unchanged;
  `--once` invocation path verified by the existing suite (no behavior change
  beyond the entry condition).

## Out of Scope (Don't Drift)

- No other changes to intake-terminal behavior, flags, config, or seed-store
  semantics.
- No changes to any other tool's entry guard (audit of siblings is a separate
  concern; `tools/stream-watch.ts` etc. untouched).

## After Completion (Strategist Notes)

- Fold into the 116 wiki note when the 116-120 promotion pass runs.
- Consider a follow-up lint/check for the VITEST-guard antipattern across
  tools/ (only if it recurs).
