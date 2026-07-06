---
id: 2026-07-06-121-intake-terminal-entry-guard
title: "intake-terminal entry guard: replace VITEST env check with the house import.meta entry check — importing the module must never run the tool"
status: claimed
priority: HIGH
estimate: 0.5h
created: 2026-07-06
blocked_by: []
claimed_by: "builder-121-88a8a68b"
claimed_at: "2026-07-06T16:11:01Z"
branch: "agent/intake-terminal-entry-guard"
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
