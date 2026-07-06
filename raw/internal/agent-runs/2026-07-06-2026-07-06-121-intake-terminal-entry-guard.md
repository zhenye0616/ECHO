---
backlog_item: 2026-07-06-121-intake-terminal-entry-guard
agent_run_started: 2026-07-06T16:11:01Z
agent_run_ended: 2026-07-06T16:20:00Z
status: ready_for_review
test_status: passing
head_sha: 0ac5cc7d2d4761b93025a39ec7f6fe148b56b811
branch: agent/intake-terminal-entry-guard
---

# Agent Run: intake-terminal entry guard

## What I Implemented

Replaced the `process.env['VITEST'] === undefined` auto-`main()` guard in
`tools/intake-terminal.ts` with the house entry check
`process.argv[1] === fileURLToPath(import.meta.url)` (same pattern as
`src/surfaces/ceo-slack-responder/index.ts:8`). Importing any symbol from the
module now never launches the tool — the 2026-07-06 live-test foot-gun where a
vite-node script that merely imported a helper ran the real intake tool against
the prod DB. Added `fileURLToPath` import from `node:url`; deleted the old
VITEST comment + check entirely (no dual guard).

Added an AC2 regression test (`tests/tools/intake-terminal-entry-guard.test.ts`
+ fixture `tests/tools/fixtures/import-intake-terminal-entry.ts`).

## Files Modified

- `tools/intake-terminal.ts` — added `node:url` import; replaced the VITEST
  guard block with the house `import.meta` entry check + a comment documenting
  the vite-node `--script` requirement.
- `package.json` — `intake:terminal` script now `vite-node --script
  tools/intake-terminal.ts` (was plain `vite-node`). **NOT in the item's
  `files_to_modify`** — see Decision 2; this one-line change is load-bearing for
  AC1 and I judged it necessary rather than escalating. Flagged for reviewer.
- `tests/tools/intake-terminal-entry-guard.test.ts` — created (AC2 regression).
- `tests/tools/fixtures/import-intake-terminal-entry.ts` — created (fixture the
  AC2 test runs as a plain-vite-node entry that imports a helper).

## Decisions Made During Implementation

### Decision 1: the house pattern needs vite-node `--script`; plain `vite-node` cannot detect entry
- **The empirical finding (verified, not assumed):** Under plain
  `vite-node tools/intake-terminal.ts --once`, vite-node **drops the script
  name from `process.argv` entirely** — `argv` becomes `[node, <vite-node bin>,
  --once]`. So `argv[1]` is the vite-node binary, identical whether the module
  is the entry OR merely imported. From inside the module the two cases are
  byte-indistinguishable via any argv/import.meta signal (I built a 4-scenario
  probe: entry-plain, entry-`--script`, importer→child-plain, importer→child-
  `--script`, and confirmed this directly). The old comment in the file
  ("vite-node strips the script name from argv, so entry cannot be detected
  there") was correct.
- **What makes the house pattern work:** vite-node's `--script` mode
  (`node_modules/vite-node/dist/cli.mjs:41`) sets
  `process.argv[1] = resolve(files[0])` — the absolute script path. Then
  `argv[1] === fileURLToPath(import.meta.url)` is TRUE for the entry and FALSE
  for an imported module. The repo already uses `vite-node --script` for
  `eval:retrieval`.
- **Chose:** house `import.meta` check in the module + `--script` on the npm
  script. Together: `npm run intake:terminal` launches; a bare import (plain OR
  `--script` vite-node, or vitest) never does.
- **Worth founder review?** Yes — the package.json edit is out of the item's
  provisional `files_to_modify`.

### Decision 2: edit package.json rather than escalate
- **Options:** (A) apply only the house pattern to intake-terminal.ts and
  escalate BLOCKED because the npm script would break; (B) also add `--script`
  to the npm script (1 line, package.json) and document it.
- **Chose:** B. The task directive was explicit: "The npm script
  `intake:terminal` must still launch the tool; a bare import must never." With
  the house pattern under plain vite-node the npm script does NOT launch main()
  (argv[1] never equals the module path), so a package.json change is the ONLY
  way to satisfy that requirement — it is forced by vite-node's architecture,
  not a scope choice. `files_to_modify` is marked PROVISIONAL. Documented here
  and in `agent_notes` for the independent reviewer / founder to veto.
- **AC1's literal parenthetical** `npx vite-node tools/intake-terminal.ts --once`
  (plain, no `--script`) will NOT launch main() — unavoidable, since no in-file
  discriminator exists under plain vite-node. The operative requirement
  (`npm run intake:terminal` launches; bare import never) is fully met.

## Acceptance Criteria Status

- [x] **AC1 — house entry check:** VITEST check + comment deleted; single house
  `import.meta` guard. `npm run intake:terminal -- --help` prints USAGE and
  exits 0 (main ran); `-- --once` reaches brain preflight under `--script`
  (main ran; exit 1 only because I passed an invalid stub brain name in the
  smoke test). Bare import via plain vite-node imports the helper with no
  USAGE / no watch banner / no brain preflight (main did not run).
- [x] **AC2 — import-side-effect regression test:** passes against the new
  guard; **verified it FAILS against the old guard** by temporarily reverting
  the guard to the VITEST check locally (the reverted run printed the USAGE
  banner → main() ran on import → assertion failed), then re-applied the house
  check. Deterministic + side-effect-free: the fixture is run with a
  deliberately invalid CLI arg, so if main() wrongly runs, parseArgs throws
  `unknown argument` → USAGE + exit 2 BEFORE any DB open / brain call; scratch
  `ECHO_HOME` + `ECHO_DB_PATH` sandbox any accidental side effect. Child env has
  `VITEST` unset so the non-vitest path is exercised.
- [x] **AC3 — CLI still works:** existing `tests/tools/intake-terminal.test.ts`
  (8 tests) pass unchanged.

## Tests Run

```
# new + existing intake-terminal
npx vitest run tests/tools/intake-terminal.test.ts tests/tools/intake-terminal-entry-guard.test.ts
 Test Files  2 passed (2)
      Tests  9 passed (9)

# AC2 discriminates: OLD guard reverted locally
 × intake-terminal entry guard (item 121, AC2) ... expected 'Usage: npm run
   intake:terminal -- [--…' not to contain 'Usage: npm run intake:terminal'
 Test Files  1 failed (1)   # re-applied the house guard afterward

# full product suite
npm run test:product
 Test Files  163 passed | 1 skipped (164)
      Tests  1768 passed | 21 skipped | 1 todo (1790)

npm run typecheck   # tsc --noEmit -> exit 0
npm run lint        # eslint --max-warnings 0 + lint:task-state -> exit 0
```

## Open Questions for Founder

1. The `package.json` `intake:terminal` `--script` addition is outside the
   item's provisional `files_to_modify`. It is required for AC1 (no in-file
   discriminator exists under plain vite-node). Confirm you're OK with the
   one-line script change, or prefer a different invocation.

## Anything I Almost Did But Stopped Myself

- Considered auditing sibling tools (`tools/stream-watch.ts`,
  `tools/render-trace.ts`, `tools/serve-trace.ts`, `tools/validate-resolution.ts`
  — all plain `vite-node`, all likely to have the same VITEST/entry issue) and
  switching them too. Explicitly OUT OF SCOPE per the item ("No changes to any
  other tool's entry guard"). Left untouched. The item's own strategist note
  already flags a follow-up lint/check for the VITEST-guard antipattern.

## Next Suggested Backlog Items (Don't Auto-Create)

- A follow-up to audit + fix the same entry-guard antipattern across the other
  plain-`vite-node` tools (stream-watch, render-trace, serve-trace,
  validate-resolution), and/or a lint rule that flags `process.env['VITEST']`
  entry guards in `tools/`.
