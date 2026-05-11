---
item_id: 2026-05-10-033-full-atom-recovery
verdict: merge as-is
reviewed_at: 2026-05-10T23:55:00Z
test_counts: { passed: 633, failed: 0, skipped: 21 }
head_sha_verified: a713cac7078494f12d60b552646428079a8c82f0
---

## Verdict

**merge as-is.** The implementation matches the post-R2 spec precisely. All five acceptance criteria are met; the R2 Finding 1 load-bearing truncations-cleanup (filter `"content"` after verbatim override) is correctly implemented at `src/mcp/tools/get-atom.ts:131` and asserted in three separate tests (`tests/mcp/get-atom.test.ts:65`, `:108`, `:187`). All 633 tests pass, lint and typecheck clean, no out-of-scope drift, and `main` has not modified any code files this branch touches since merge-base (zero predicted merge conflict). The only non-functional observation is incidental Prettier reformatting in `tests/mcp/tools/recent-work-context.test.ts` and one line in `src/mcp/server.ts` — whitespace only, no semantic change.

## Acceptance status

| AC | Status | Evidence |
|---|---|---|
| AC1 tool name + input schema (id only) | Met | `get-atom.ts:196`, `:199-201` |
| AC1 success shape (content verbatim, metadata projected, embedding excluded) | Met | `get-atom.ts:130-142` |
| AC1 `atom_too_large_for_wire` with `source` populated | Met | `get-atom.ts:160-169` |
| AC1 `atom_not_found` distinct shape, short-circuits before projection | Met | `get-atom.ts:110-123` |
| AC2 envelope ceiling 25_000 + pre-flight check on success envelope | Met | `get-atom.ts:37`, `:153-155` |
| AC3 description (cost class HIGH + canonical recovery pattern) | Met | `get-atom.ts:39-54` |
| AC4 #1 verbatim + metadata projected + truncations cleanup | Met | `tests/mcp/get-atom.test.ts:21-70` |
| AC4 #2 Codex-realistic 10KB + 130KB tool_calls | Met | `get-atom.test.ts:72-113` |
| AC4 #3 content-too-large → atom_too_large_for_wire | Met | `get-atom.test.ts:115-132` |
| AC4 #4 22KB content just-fits | Met | `get-atom.test.ts:134-149` |
| AC4 #5 missing ID → atom_not_found | Met | `get-atom.test.ts:151-163` |
| AC4 #6 integration round-trip from `truncations: ["content"]` | Met | `get-atom.test.ts:165-188` |
| AC5 smoke 7→8 + presence check + round-trip | Met | `tools/mcp-integration-smoke.sh:95, 140-148, 527-665` |

## Pre-merge fixups

_None — verdict is merge as-is._

## Expected merge conflicts

_None._ `git diff merge-base..main` shows zero modifications to any of the five files this branch touches (`src/mcp/server.ts`, `src/mcp/tools/get-atom.ts`, `tests/mcp/get-atom.test.ts`, `tests/mcp/tools/recent-work-context.test.ts`, `tools/mcp-integration-smoke.sh`). Predicted clean merge.

## Follow-up items (defer, do not block merge)

- Prettier-style reformatting of `tests/mcp/tools/recent-work-context.test.ts` and `src/mcp/server.ts:36-38` is incidental but bloats the historical diff. Consider enabling pre-commit Prettier so this isn't a recurring side-effect of touching shared files.
- Dead-code manual `id` validation at `get-atom.ts:103-107` is redundant with the zod schema's `min(1)`. Could be removed if direct (non-MCP) callers of `getAtom` rely on the caller for validation. Defer.
- Strategist post-merge wiki tasks (already captured in spec's "After Completion"): create `wiki/surfaces/mcp-get-atom.md`, bump tool counts (7→8) in `wiki/surfaces/mcp-server.md` and `wiki/architecture/system-architecture.md`, update `wiki/operating-model/cross-tool-spec-review.md` "Findings classes" to reference `get_atom` as the in-MCP recovery primitive.

## Open questions for founder

_None. Verdict is unambiguous merge as-is._
