---
item_id: 2026-05-27-077-cognitive-recap-via-raycast
verdict: merge as-is
reviewed_at: 2026-05-28T07:55:00Z
test_counts: { raycast_passed: 140, raycast_failed: 0, raycast_skipped: 0, root_passed: 1464, root_failed: 0, root_skipped: 21, typecheck: pass, lint: pass }
---

## Verdict

Merge as-is. All 7 ACs + AC4a + all 3 r11 builder pre-claim fixups are Met with file:line evidence. All 10 OoS sections respected — six OoS-protected source files (`echo.tsx`, `sessions.ts`, `system-prompt.ts`, `EmptyState.tsx`, `SessionsList.tsx`, `SessionDetail.tsx`) are byte-identical to main. Tests pass cleanly (raycast: 140/140, root: 1464 pass + 21 skipped). Typecheck + lint green at both roots. Merge-base is the current `origin/main` tip — clean fast-forward, no conflicts predicted.

One observation: `tools/raycast-echo/src/lib/agent-runner.ts` was modified but is not listed in `files_to_modify` (it appears under `spec_refs` as "reused unchanged"). The change is strictly additive — an opt-out `sessionLogEnabled` flag plus a `formatDuration()` helper to label the 30s ceiling correctly. Required to honor the ephemeral contract (OoS #9 family) and the r11 F2 timeout fixup. Matches the additive-only pattern the spec explicitly authorized for `audit.ts` (r9 F1). Judged necessary, non-blocking drift. Document the pattern as a follow-up.

## Acceptance status

| AC | Status | Evidence |
|---|---|---|
| AC1 — package.json recap command + duplicated prefs + defaultSinceWindow | Met | `tools/raycast-echo/package.json:62-115` (5 prefs), version 0.2.0→0.3.0 at `:3` |
| AC2 — recap.tsx Form→Detail entry point | Met | `tools/raycast-echo/src/recap.tsx:68-122,191-322` |
| AC2.3a — 5s AbortController, one-shot audit | Met | `tools/raycast-echo/src/recap.tsx:201-218`; `audit.ts:29,49` (additive `signal?`) |
| AC2.5 — no LocalStorage write, ephemeral | Met | 0 LocalStorage/setItem matches in new code; 5 OoS-protected files = 0-line diff |
| AC2.6 — cwd contract for custom agents | Met | `recap.tsx:153`; test at `recap.test.tsx:91-104` |
| AC3 — pinned prompt with all 10 load-bearing substrings | Met | `recap-system-prompt.ts:3-21`; snapshot test at `recap-system-prompt.test.ts:49-63` |
| AC4 — resolveSinceWindow + full SinceSource union + InvalidSinceInputError | Met | `since-resolver.ts:5-22,27-53`; 14 vitest cases |
| AC4a — buildRecapPrompt absolute-path validator + home-expand at call site | Met | `recap-system-prompt.ts:23-30`; `recap.tsx:160-182` |
| AC5 — three test files, all required cases | Met | 14 + 5 + 10 = 29 focused tests across since-resolver/system-prompt/recap |
| AC6 — README Recap section + Surface marker | Met | `tools/raycast-echo/README.md:47-82` |
| AC7 — dogfooding gate | N/A at merge time | Founder-side post-merge acceptance gate |
| r11 F1 — package-lock.json bumped | Met | In diff (4 lines, version field) |
| r11 F2 — subprocess timeout | Met | `recap.tsx:37,184-189` (`RECAP_MAX_RUNTIME_MS=30_000`); test at `recap.test.tsx:106-119` |
| r11 F3 — repo preflight + 2 tests | Met | `recap.tsx:160-176`; tests at `recap.test.tsx:155-166` |

## Drift findings

- `tools/raycast-echo/src/lib/agent-runner.ts` modified outside `files_to_modify`. Change is strictly additive (opt-out flag + duration formatter); preserves byte-identical behavior for Ask ECHO callers. Same additive-only pattern explicitly authorized for `audit.ts` (r9 F1). **Judgment: acceptable necessary drift, not blocking.**
- `test/agent-runner.test.ts` + `test/audit.test.ts` extended in parallel — consistent with lib changes. Acceptable.
- No OoS section crossed. All six OoS-protected source files byte-identical to main.

## Design-choice judgments

1. **Recap timeout via existing `maxRuntimeMs` knob** (recap.tsx:37,185-188). **Stand.** r11 F2 explicitly authorized either path; reusing the existing knob avoids divergence.
2. **`sessionLogEnabled: false` opt-out** (agent-runner.ts:24,144-150). **Stand.** Additive flag is the minimum-mechanism path to honor the no-persistence contract; alternative would have duplicated `startAgent`.

## Bugs/risks

- `recap.tsx:115` — `Form.Dropdown error={repoError}` displays the repo-path error under the Window dropdown, not under a repoPath field. UX nit; error is still visible. Not blocking.
- `recap.tsx:165-174` — sync `fs.existsSync` + `lstatSync` on the submit handler. ~microseconds for a single path check; acceptable.
- `recap.tsx:194,231` — when agent exits with zero output, status flips to `"empty"` but the markdown body keeps the `"Waiting for agent output..."` placeholder because `flushNow()` doesn't replace it. The metadata sidebar's Status="empty" disambiguates. Cosmetic, not blocking.
- No security risks observed (no shell interpolation, no eval, audit endpoint stays localhost).

## Merge-conflict preview

Merge-base is `911cf885` (current `origin/main` tip). Single feature commit ahead. **Expected: clean fast-forward, no conflicts.**

- `tools/raycast-echo/package.json` — no commits on main since merge-base → no conflict.
- `tools/raycast-echo/package-lock.json` — same → no conflict.
- `tools/raycast-echo/README.md` — same → no conflict.
- `tools/raycast-echo/src/lib/audit.ts` — same → no conflict.
- `tools/raycast-echo/src/lib/agent-runner.ts` — same → no conflict.
- `tools/raycast-echo/test/raycast-api-mock.ts`, `test/agent-runner.test.ts`, `test/audit.test.ts` — same → no conflict.

Recommended: standard `--no-ff` merge per the merge-and-cleanup skill.

## Suggested fixups

### Pre-merge punch list

(none — merge as-is)

### Non-blocking follow-ups

1. **File a tiny backlog item** documenting the additive-only extension pattern (`audit.ts` r9 F1, `agent-runner.ts` here) so future agents recognize the idiom and don't trip the drift heuristic. Use 077's `agent-runner.ts` change as the worked example.
2. **Cosmetic `recap.tsx` polish (post-merge):** (a) when `status === "empty"`, replace the markdown body's `"Waiting for agent output..."` with `"_Agent exited with no output._"`; (b) split repoPath into its own visible Form.TextField OR move the error display to a top-level failure toast (currently piggybacks on the Window dropdown's `error` slot).
3. **Founder-side AC7 gate tracking:** start counting `**Surface:** Recap` entries in `raw/internal/dogfooding/mcp-interactions-journal-2026-05.md` from first dogfooding session. Gate flips this from "merged" to "validated" at ≥3 entries / ≥2 calendar days / ≥1 ✅ + ≥1 🟡 or ❌.
