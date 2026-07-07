# Agent run — 2026-07-07-127-packaged-tarball-import-closure

- **Item:** `2026-07-07-127-packaged-tarball-import-closure`
- **Branch:** `agent/packaged-tarball-import-closure`
- **Worktree:** `~/Desktop/Project_echo--packaged-tarball-import-closure`
- **Claim commit (main):** `b75d00d24060b74f1fd6a311557066f188db76d3`
- **head_sha (branch):** `b366d758c8a846be26f9a3c916604eee53987a74`
- **Agent persona:** `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405`

## What implemented

The packaging-config fix (AC1) plus the two guard changes (AC2, AC3). No source
surfaces touched — `src/mcp/server.ts` and the responder tree are unchanged,
consistent with the r1 spec decision that removed the import-restructure
alternative.

### Root cause reconciled with 110

110 already made `server.ts` load `propose-decision-tool.js` via a *guarded
dynamic* `import()` that tolerates `ERR_MODULE_NOT_FOUND` for the missing
optional module. So there is **no static** boundary-crossing import left, and
`import-closure.test.ts` (a static-only walk) never flags it — by design.

The live Windows failure is a platform bug in that guard, not a new static
crossing: `isOptionalProposeDecisionMissing` matches
`err.message.includes('ceo-slack-responder/propose-decision-tool')` with a
**forward slash**. On Windows the `ERR_MODULE_NOT_FOUND` message carries a
**backslash** path, so the guard returns false, the error is re-thrown, and the
daemon dies before health. On macOS/Linux the same guard matches and the daemon
boots (module silently skipped).

Per the 127 spec (AC1, import-restructure removed in review), the sanctioned fix
is packaging-only: **ship** the dynamic-import target and its transitive chain so
the `import()` resolves on every platform and the guard's absent-path is never
taken in a packaged install.

### AC1 — closure ships

Computed the transitive static closure of
`dist/surfaces/ceo-slack-responder/propose-decision-tool.js` (TypeScript AST walk
over the built dist). It is 11 responder modules — everything in the tree except
`index.js` (the Slack poller deployment surface, which is NOT in the closure).
Re-included exactly those 11 `.js` files in `package.json` `files` after the
`!dist/surfaces/ceo-slack-responder/**` exclusion, keeping `index.js` excluded to
preserve the 076 boundary as much as possible. `npm pack --dry-run` manifest
confirms all 11 ship and `index.js` does not.

### AC2 — vacuous window closed

`import-closure.test.ts` now asserts `shippedJs.length > 0` before the closure
walk, so an unbuilt/empty `dist/` fails loudly instead of passing silently.

### AC3 — real packaged-boot test

New `tests/packaging/packaged-boot.test.ts`: `npm pack` → `npm install -g
--prefix <temp-outside-repo>` (own `node_modules`, production module resolution,
no dev symlinks) → launch `dist/daemon/index.js` with `node`, watch structured
stdout for the `daemon.lifecycle` `started` line (platform-independent health,
no launchd). Assertions: (1) no `ERR_MODULE_NOT_FOUND`-class text on stderr,
(2) daemon reached `started`, (3) **no `propose_decision_skipped`** in stdout —
i.e. the closure actually loaded. Assertion (3) is what makes the test
non-vacuous on macOS/Linux, where the guard would otherwise swallow the missing
module and still reach health.

## Files modified

- `package.json` — 11 re-include lines in `files` (AC1)
- `tests/packaging/import-closure.test.ts` — non-empty `shippedJs` assertion (AC2)
- `tests/packaging/packed-manifest.test.ts` — snapshot ripple for the 11 modules
- `tests/packaging/packaged-boot.test.ts` — NEW real boot test (AC3)

## Design decisions / calls flagged

- **Ship exactly the 11-module closure, keep `index.js` out.** Faithful to
  AC1's "the excluded tree's still-imported modules are shipped" and preserves
  the 076 poller-surface exclusion maximally. The alternative (drop the
  exclusion entirely, ship the whole tree incl. the poller) is simpler config
  but reverses more of 076 than necessary. The `import-closure` guard backstops
  the explicit list: if a future edit adds a responder module to the closure and
  it isn't shipped, the guard fails loudly.
- **AC3 test asserts absence of `propose_decision_skipped`.** Without it the
  test is vacuous on the builder's macOS platform (red-verified — see below).
  This assertion is the real proof the closure shipped and resolved on every
  platform, complementing the Windows-specific crash path.

## Acceptance per criterion

- **AC1 ✅** — `npm pack --dry-run` ships the 11 closure modules, excludes `index.js`.
- **AC2 ✅** — non-empty `shippedJs` assertion added; guard can't pass vacuously.
- **AC3 ✅** — real no-mocks packaged-boot test green; red-verified pre-fix.
- **AC4 (not a builder AC)** — post-merge Windows CI (`onboarding · windows-latest`,
  release `validate package · windows-latest`) is a founder/watcher gate.
- **AC5 ✅** — full `npm run typecheck` + `npm run lint` clean; `npm run test`
  = 2078 passed, only failure `tests/cli/shell-reachable.test.ts` (the launchd
  leg), which PASSES in isolation — the known full-suite-load flake the dispatch
  flagged.

## Red-verification (blind-holdout discipline)

Reverted only the 11 `package.json` re-includes (pre-fix state) and re-ran:

- `import-closure.test.ts` — **still passed** (expected: the crossing is a
  *dynamic* import, invisible to the static closure walk per 110 AC3).
- `packaged-boot.test.ts` (before adding assertion 3) — **still passed** on macOS
  (guard swallows the missing module; daemon reaches `started`). This exposed a
  vacuous test.
- After adding assertion 3, `packaged-boot.test.ts` pre-fix — **failed** on
  `propose_decision_skipped` present. Restored the fix → green. Guard is now
  genuinely non-vacuous on macOS and catches the Windows crash path too.

## Verbatim test output

```
=== packaging (post-fix, green) ===
 ✓ tests/packaging/packed-manifest.test.ts (1 test) 4939ms
 ✓ tests/packaging/import-closure.test.ts (1 test) 5301ms
 ✓ tests/packaging/packaged-boot.test.ts (1 test) 13279ms
 Test Files  3 passed (3)

=== full suite (npm run test) ===
 Test Files  1 failed | 199 passed | 1 skipped (201)
      Tests  1 failed | 2078 passed | 21 skipped | 1 todo (2101)
 FAIL tests/cli/shell-reachable.test.ts (daemon health-probe timeout on port 40001 under full-suite load)

=== shell-reachable isolation re-run ===
 ✓ tests/cli/shell-reachable.test.ts (1 test) 23987ms
 Test Files  1 passed (1)

=== typecheck / lint ===
 tsc --noEmit  (clean)
 eslint . --max-warnings 0 && lint:task-state  (clean)
```

## Open questions

None.

## Drift events

None. Stayed within `files_to_modify` (`package.json`, `tests/packaging/`); did
not touch `src/mcp/server.ts` or the responder tree per the r1-locked spec.

## ECHO MCP calls

None this run (no journal entry owed).
