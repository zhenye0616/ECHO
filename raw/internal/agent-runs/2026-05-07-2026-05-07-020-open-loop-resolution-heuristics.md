# Agent run — 2026-05-07-020-open-loop-resolution-heuristics

**Agent persona:** `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405`
**Branch:** `agent/open-loop-resolution-heuristics`
**Worktree:** `~/Desktop/Project_echo--open-loop-resolution-heuristics/`
**Run started:** 2026-05-07 23:00 PDT (2026-05-08T05:53Z)
**Run finished:** 2026-05-08 06:10 PDT (2026-05-08T06:10Z)

## Run 1

### What I implemented

R1 open-loop resolution heuristics — per-hint classification at the trace layer. Each emitted hint now carries `resolved: boolean` and (when resolved) `resolved_by_atom_id: string`. Four kind-specific rules:

| Rule | Closure signal |
|---|---|
| R1.Q (`ends_with_question`) | Later non-question turn in same conversation |
| R1.AQ (`unresolved_assistant_q`) | Later user-role turn (≥1 char post-trim) in same conversation |
| R1.TODO (`contains_todo`) | Later atom whose `state.delta.artifact_id` matches a file artifact on hint atom |
| R1.FU (`explicit_followup`) | Never auto-resolves in V1 (conservative) |

Resolution scans forward from the hint atom's index, single linear pass with early termination on first match. Hints are computed once on the full sorted atom list, then filtered per-cluster by atom membership — so resolution is cluster-agnostic (an atom's resolution status does not change based on which cluster it lands in).

### Files modified

| File | Change |
|---|---|
| `src/trace/types.ts` | Add `resolved: boolean` and `resolved_by_atom_id?: string` to `OpenLoopHintEnriched` |
| `src/trace/hints.ts` | Rewrite `enrichHints` to apply per-rule resolution scan after emission |
| `src/trace/index.ts` | Move `enrichHints` call before clustering; sort atoms ascending by `occurred_at`; filter hints per-cluster by `atom_id ∈ cluster.atom_ids` |
| `src/mcp/tools/recent-work-context.ts` | Append one-sentence note about `cluster.open_loop_hints[].resolved` to tool description |
| `tests/trace/fixtures/atoms.ts` | Extend `AtomSpec` with optional `actors` and `state` fields for resolution-rule fixtures |
| `tests/trace/hints.test.ts` | +12 new test cases for R1 rules |
| `tests/trace/build.test.ts` | +2 cases asserting `resolved` propagates into `cluster.open_loop_hints[]` |
| `tests/mcp/tools/recent-work-context.test.ts` | +2 cases (response shape boolean check + format invariance) |
| `tests/trace/rank.test.ts` | +2 inline updates: existing fixtures gained the new required `resolved` field (compile-only fix) |
| `tools/validate-resolution.ts` | New script — opens `SqliteStorage` at `resolveDbPath()`, calls `getRecentWorkContext` over the last 7 days, writes per-hint scoring sheet to `raw/internal/dogfooding/2026-05-08-resolution-validation.md` |

**Branch:** `agent/open-loop-resolution-heuristics`
**Head SHA:** `9b9449b82fd1ba57192dd3dfd02c884c8aae9ef9`

### Decisions made

1. **Hint computation moved upstream of clustering (`src/trace/index.ts` was modified despite not being listed in `files_to_modify`).** The acceptance criterion "Each rule's scan is cluster-agnostic — resolution depends only on the input atom list, not on which cluster the hint atom ends up in. (Hints are still emitted per-atom; resolution is computed before clustering.)" is unsatisfiable without moving the call site — if `enrichHints` is invoked per-cluster on `clusterAtoms`, resolution is cluster-bound by construction. The minimal-impact change is: sort atoms once, call `enrichHints(sortedAtoms)` once, then build a `Map<atom_id, hints[]>` and filter per cluster. Flagging this as an apparent oversight in `files_to_modify`; the founder may want to add `src/trace/index.ts` to the list before merge.

2. **`tests/trace/rank.test.ts` modified despite not being listed in `files_to_modify`.** Two existing test fixtures construct `OpenLoopHintEnriched` literals; adding the now-required `resolved: boolean` field is compile-only (typecheck fails otherwise). Treated as a mechanical follow-on of the type change in `src/trace/types.ts`, not new testing intent.

3. **R1.AQ "non-empty content" check accepts non-empty input OR non-empty output.** The spec parenthetical "(or `action.output` for non-conversation atoms)" is ambiguous given that the rule already requires a same-conversation match (which implies a conversation-bearing atom). Implemented as: trim input first, fall back to trimmed output. This honors the spirit ("any reply closes the loop") and tolerates edge cases where a user-role atom carries content in `output` rather than `input`.

4. **"Is a question" check (R1.Q candidate negation) tests both input and output.** The spec says "does not end with `?` after trimming"; for a candidate atom with both input and output, both must not end with `?` for it to qualify as "non-question." Mirrors the existing `lastQuestion` helper's logic.

5. **Conversation match key uses full `provider:type:id`.** Same convention as the rest of the trace layer (`artifactKey`). Two atoms share a conversation iff both carry an artifact with `type === 'conversation'` and identical `provider:type:id`.

6. **No `npm run validate:resolution` script entry added.** `package.json` is not in `files_to_modify`. The acceptance criterion permits "or `node tools/validate-resolution.ts`" as the alternate invocation; the script header documents `npx vite-node tools/validate-resolution.ts` as the canonical run path. Founder can add the npm script during merge if desired.

### Acceptance criteria status

| Criterion | Status |
|---|---|
| `OpenLoopHintEnriched` gains `resolved: boolean` + `resolved_by_atom_id?: string` | ✅ |
| `enrichHints(atoms)` populates both fields per the four rules | ✅ |
| Atoms assumed sorted ascending by `occurred_at`; forward-scan only | ✅ — `src/trace/index.ts` sorts before calling |
| R1.Q rule (later non-question in same conversation, match by conversation artifact) | ✅ |
| R1.AQ rule (later user-role turn, non-empty after trim, in same conversation) | ✅ |
| R1.TODO rule (later atom whose `state.delta.artifact_id` ∈ file artifacts on hint atom) | ✅ |
| R1.FU never auto-resolves in V1 | ✅ |
| Cluster-agnostic resolution (computed before clustering) | ✅ — see decision 1 |
| `format: 'minimal'` does NOT alter `resolved` field | ✅ — minimal mode only touches `action.input/output`; hint pass is upstream |
| `resolved_by_atom_id` is the EARLIEST qualifying atom | ✅ — covered by `tests/trace/hints.test.ts` |
| Tool description updated with one-sentence note about `resolved` semantics | ✅ |
| 12+ new cases in `tests/trace/hints.test.ts` | ✅ — 12 new cases (`R1.Q resolves…`, `R1.Q does NOT resolve…`, etc.) |
| 2+ new cases in `tests/trace/build.test.ts` | ✅ |
| 2+ new cases in `tests/mcp/tools/recent-work-context.test.ts` | ✅ |
| Validation script `tools/validate-resolution.ts` runnable | ✅ — smoke-tested against an empty SQLite via `ECHO_DB_PATH=/tmp/echo-validate-smoke.db` (output format verified; row table empty as expected) |
| `npm run typecheck` clean | ✅ |
| `npm run lint` clean | ✅ |
| `npm run test` clean | 🟡 — see "Test results" below |

### Test results (verbatim)

#### `npm run typecheck`

```
> echo-daemon@0.0.0 typecheck
> tsc --noEmit
```
Exit 0, no output. ✅

#### `npm run lint`

```
> echo-daemon@0.0.0 lint
> eslint . --max-warnings 0
```
Exit 0, no output. ✅

#### `npx vitest run tests/trace tests/mcp` (in-scope test files)

```
 RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--open-loop-resolution-heuristics

 ✓ tests/trace/role.test.ts (6 tests) 7ms
 ✓ tests/trace/labels.test.ts (9 tests) 7ms
 ✓ tests/trace/rank.test.ts (9 tests) 8ms
 ✓ tests/trace/hints.test.ts (21 tests) 16ms
 ✓ tests/trace/cluster.test.ts (20 tests) 17ms
 ✓ tests/trace/build.test.ts (16 tests) 113ms
 ✓ tests/mcp/server.test.ts (7 tests) 258ms
 ✓ tests/mcp/tools/search-memories.test.ts (20 tests) 310ms
 ✓ tests/mcp/tools/recent-work-context.test.ts (14 tests) 405ms

 Test Files  9 passed (9)
      Tests  122 passed (122)
   Start at  23:03:28
   Duration  1.47s (transform 1.36s, setup 0ms, collect 2.51s, tests 1.14s, environment 1ms, prepare 748ms)
```
**122/122 in-scope tests pass.** ✅

#### `npm run test` (full suite — includes pre-existing flaky failures)

```
 Test Files  2 failed | 28 passed (30)
      Tests  4 failed | 430 passed (434)
   Start at  23:05:39
   Duration  46.48s (transform 3.98s, setup 0ms, collect 6.76s, tests 95.87s, environment 4ms, prepare 2.79s)
```

The 4 failing tests are in `tests/capture/extractors/cursor.test.ts` and `tests/daemon/lifecycle.test.ts`:

- `tests/daemon/lifecycle.test.ts` — `waitFor` predicate timeout reading stdout (timing-dependent)
- `tests/capture/extractors/cursor.test.ts` — `populates workspace_id when the per-workspace inference index has the composer` (workspace_id missing in matched object)
- `tests/capture/extractors/cursor.test.ts` — `populates session_id as the composer_id (canonical alias for cross-source correlation)` (5s timeout)
- `tests/capture/extractors/cursor.test.ts` — `flattens turn.context paths into a deduped metadata.files_referenced array` (5s timeout)

**These are pre-existing failures unrelated to item 020.** Verified by stashing all my changes and running the same test files on the unmodified agent-base commit — observed 6 failures (same files, more timeouts; the count fluctuates run-to-run, which is itself the signal that these tests are flaky/timing-dependent). My changes touch only `src/trace/`, `src/mcp/tools/recent-work-context.ts`, `tools/`, and tests under `tests/trace/` + `tests/mcp/`; nothing in `src/capture/extractors/` or `src/daemon/`.

Calling this status 🟡 not ❌ because the in-scope work passes cleanly and the failures are pre-existing flake. Founder should decide whether to ignore for merge or quarantine the flaky tests as a follow-up item.

### Open questions for founder

1. **`src/trace/index.ts` not in `files_to_modify`.** Is the small structural change (move `enrichHints` call, add a sort, build per-cluster map) acceptable as part of this item, or should it be split? My read: the cluster-agnostic property is unsatisfiable without it, so it's effectively required.
2. **Pre-existing flaky tests in `tests/capture/extractors/cursor.test.ts` and `tests/daemon/lifecycle.test.ts`.** Worth a separate cleanup item (quarantine + investigate), or known-noise that doesn't gate merge?
3. **`tools/validate-resolution.ts` could not be smoke-tested against live storage** because reading the production SQLite was correctly denied by the harness sandbox. Tested against an empty DB instead; markdown output structure verified. Founder will want to actually run it (against `~/Library/Application Support/ECHO/echo.db`) to produce `raw/internal/dogfooding/2026-05-08-resolution-validation.md` for the manual TP/FP/TN/FN scoring pass.

### Drift events

None. Stayed within the spec's four rules and the listed `files_to_modify` (modulo `src/trace/index.ts` and `tests/trace/rank.test.ts`, both documented above as forced consequences of the type change and the cluster-agnostic acceptance criterion). Did not add a fifth hint kind, did not touch the regex emission, did not modify the normalizer/storage, did not introduce LLM disambiguation, did not change `resolved` to a richer enum.

### Reconciliation note

Not a resumed run. First attempt; clean execution.
