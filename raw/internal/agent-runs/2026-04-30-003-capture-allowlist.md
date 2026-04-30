---
item: 2026-04-30-003-capture-allowlist
agent: MacBook-Pro.local-zhenye
branch: agent/capture-allowlist
head_sha: 076ddbf08abc153bac5ef6ccd2a5127b63ed0d9b
status: ready_for_review
---

# Run Log — 2026-04-30-003-capture-allowlist

## What I implemented

`src/capture/sources.ts` (75 lines):

- `CAPTURED_SOURCES` constant, `as const` so adding entries widens the
  `Source` union automatically. All four categories (`apps`, `domains`,
  `fs_paths`, `apis`) start empty.
- `Source` discriminated union per spec.
- Public predicates `isAllowedApp` / `isAllowedDomain` / `isAllowedPath` /
  `isAllowedApi` matching the spec signatures.
- Internal pure helpers `_isAllowedAppIn` / `_isAllowedDomainIn` /
  `_isAllowedPathIn` / `_isAllowedApiIn` that take the allowlist as a
  parameter — exposed so tests can verify positive-match behavior with a
  fixture allowlist (acceptance criterion explicitly permits this:
  "test the helper logic against a parameterized sample").
- Defensive runtime guards: every predicate accepts `unknown` and returns
  `false` for non-string / empty-string inputs (boundary defense even
  when the static type says `string`).
- `isAllowedPath` expands leading `~` to `os.homedir()` on both the input
  path and each allowlist entry before doing a prefix match.

`tests/capture/sources.test.ts` (165 lines, 20 cases):

- Empty-allowlist negative: each predicate returns `false` against
  plausible inputs (Cursor bundle id, slack.com, common file paths,
  github/slack api names).
- Malformed-input rejection: `null`, `undefined`, numbers, empty string,
  plain objects/arrays, booleans — all → `false` from each predicate.
- Fixture-allowlist positive: bundle id, exact domain, api name match.
- Domain exact-match enforced: subdomain (`foo.app.slack.com`) and
  parent (`slack.com`) both rejected.
- Path prefix-match with `~` expansion: both directions
  (input has `~`, allowlist entry has `~`, both expanded, bare `~`).
- Type-only assertion: a fixture object built `as const` yields literal
  key types so `Source` discriminated union narrows correctly.

## Files modified

| File | Lines | Status |
|---|---|---|
| `src/capture/sources.ts` | +75 | new |
| `tests/capture/sources.test.ts` | +165 | new |

Branch: `agent/capture-allowlist` @ `076ddbf08abc153bac5ef6ccd2a5127b63ed0d9b`.

## Decisions made during implementation

- **Internal helpers (`_isAllowed*In`) exported.** The acceptance text
  permits "test the helper logic against a parameterized sample"; rather
  than mocking the module to inject a fixture, the predicates are layered
  on top of pure helpers that accept the allowlist as an argument. The
  public predicates (with the spec signatures) just bind to
  `CAPTURED_SOURCES`. This keeps the public surface exactly as specified
  and makes the test of fixture-extended behavior trivially pure.
- **`unknown` runtime guard, `string` static type.** Spec example shows
  `isAllowedApp(bundleId: string): boolean`, but the behavior section
  says "accept unknown and return false for malformed". Idiomatic TS
  resolution: accept `string` statically (so callers get type help) but
  defensively check `typeof === 'string' && length > 0` at runtime
  (so JS callers cannot bypass the boundary). The internal helpers
  accept `unknown` so malformed-input tests can exercise them directly.
- **`~` expansion on both sides.** Spec says "after `~` expansion to
  the user's home". I expand both the input path and each allowlist
  entry, since the example allowlist entry shown in the spec body uses
  `~/Library/Application Support/Cursor/...`. This makes prefix-matching
  work regardless of which side carries the `~`.
- **No subdomain wildcarding.** Spec is explicit: "exact match against
  keys of `domains` (no subdomain wildcarding for V1)". Verified by
  test (`foo.app.slack.com` and `slack.com` both rejected against a
  fixture containing `app.slack.com`).

## Acceptance status

| Criterion | Status |
|---|---|
| `src/capture/sources.ts` exports `CAPTURED_SOURCES` (`as const`), `Source`, four `isAllowed*` predicates | ✅ |
| Initial allowlist empty for all four categories | ✅ |
| `Source` derives from `CAPTURED_SOURCES` so adding entries widens the union | ✅ (verified by type-only assertion test) |
| Predicates return `false` (not throw) for non-string / empty / unknown | ✅ |
| `isAllowedPath` expands leading `~` to `os.homedir()` | ✅ |
| Tests cover empty-allowlist negatives, fixture-extended positives, malformed rejection, `~` paths | ✅ |
| `npm run test`, `npm run lint`, `npm run typecheck` all clean | ✅ |

## Test results (verbatim)

```
> echo-daemon@0.0.0 typecheck
> tsc --noEmit
(no output — clean)
```

```
> echo-daemon@0.0.0 lint
> eslint . --max-warnings 0
(no output — clean)
```

```
> echo-daemon@0.0.0 test
> vitest run

 RUN  v2.1.9 /Users/zhenye/Desktop/echo_wiki--capture-allowlist

 ✓ tests/smoke.test.ts (1 test) 2ms
 ✓ tests/capture/sources.test.ts (20 tests) 8ms
 ✓ tests/logging/index.test.ts (9 tests) 36ms

 Test Files  3 passed (3)
      Tests  30 passed (30)
```

## Open questions

None.

## Drift events

None caught. Strict adherence to `files_to_modify` list; no new
dependencies; nothing from "Out of Scope" attempted.

One minor lint-driven refactor: my first draft of the type-only
assertion test had a `fixture` const that ESLint flagged as
"only used as a type". I added two `expect(...)` lines that read the
runtime value, satisfying the lint rule without weakening the type
assertion. This is in-scope (the criterion already required type
derivation to be assertable).
