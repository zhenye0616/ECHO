---
backlog_item: 2026-06-08-098-per-actor-journal-shards
agent_run_started: 2026-06-08T22:48:08Z
agent_run_ended: 2026-06-08T23:01:30Z
status: ready_for_review
test_status: passing
branch: agent/per-actor-journal-shards
head_sha: daa80b41d6506079f839ad25f74f6e6a50b2c8ef
---

# Agent Run: Per-actor dogfooding-journal shards

## What I Implemented

Implemented per-actor dogfooding journal shards for the automated reviewer wrapper and added the canonical read/merge helper.

- `_run_reviewer.sh` now validates `REVIEWER_NAME` against `^[a-z][a-z0-9-]*$` before doing any repo/worktree work, writes reviewer journal entries to `mcp-interactions-journal-<month>-<REVIEWER_NAME>.md`, bootstraps a self-describing shard preamble, and keeps the existing journal commit/push message flow.
- `tools/dogfooding/journal-cat.sh` merges legacy shared files plus actor shards for a month, emits one merged preamble, sorts entries chronologically with actor/source-line tie breaks, and fails loudly on malformed entry blocks.
- `tests/dogfooding/journal-cat.test.ts` covers merge ordering, preamble collapse, deterministic equal timestamps, wrapper path shape, invalid reviewer slug rejection, and malformed-block failure.
- `CLAUDE.md` and `AGENTS.md` now direct writers to per-actor shards and readers to `journal-cat.sh`.
- `raw/internal/dogfooding/mcp-interactions-journal-2026-06.md` has only the LD4 cutover note; no history was split, rewritten, or backfilled.

## Files Modified

- `tools/review-queue/_run_reviewer.sh`
- `tools/dogfooding/journal-cat.sh`
- `tests/dogfooding/journal-cat.test.ts`
- `CLAUDE.md`
- `AGENTS.md`
- `raw/internal/dogfooding/mcp-interactions-journal-2026-06.md`

## Decisions Made During Implementation

### Decision 1: `journal-cat.sh` reports repo-relative source paths

- **Options considered:** absolute source paths vs. paths relative to the repo root.
- **Chose:** repo-relative paths after the helper normalizes to the git toplevel.
- **Why:** matches existing repo-facing diagnostics and keeps error output stable across temp checkouts and machines while still citing the source path + line.
- **Worth founder review?** No; the acceptance contract requires source path + line, not absolute paths.

### Decision 2: wrapper slug validation runs at script entry

- **Options considered:** validate only inside `append_wrapper_journal()` vs. validate immediately after `REVIEWER_NAME` is required.
- **Chose:** validate immediately at script entry.
- **Why:** it fails before any repo/worktree setup and before any possible shard path construction, satisfying AC1's fail-loud namespace guard.
- **Worth founder review?** No; this is the narrowest way to enforce the specified regex.

## Acceptance Criteria Status

- [x] AC1: wrapper writes per-actor shards and validates `REVIEWER_NAME` before path construction.
- [x] AC2: new actor shards bootstrap with a self-describing preamble and Quick-Fill Template.
- [x] AC3: `journal-cat.sh <month>` merges shards + legacy shared file chronologically, strips duplicate preambles, and fails loudly on malformed entry blocks.
- [x] AC4: `CLAUDE.md` and `AGENTS.md` dogfooding-journal discipline now point to per-actor shards and `journal-cat.sh` while preserving the entry discipline.
- [x] AC5: focused tests and required verification commands pass.
- [x] LD4 cutover: existing June shared file received only the frozen-file cutover note; no split/rewrite/backfill.

## Tests Run

Initial focused test attempt before installing locked dependencies:

```text
> echoctl@0.1.0-beta.1 test
> vitest run tests/dogfooding/journal-cat.test.ts

sh: vitest: command not found
```

Dependency install precondition:

```text
npm warn deprecated prebuild-install@7.1.3: No longer maintained. Please contact the author of the relevant native addon; alternatives are available.

added 283 packages, and audited 284 packages in 3s

92 packages are looking for funding
  run `npm fund` for details

5 vulnerabilities (4 moderate, 1 critical)

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
```

Focused test:

```text
> echoctl@0.1.0-beta.1 test
> vitest run tests/dogfooding/journal-cat.test.ts


 RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--per-actor-journal-shards

 ✓ tests/dogfooding/journal-cat.test.ts (3 tests) 545ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  15:55:46
   Duration  1.69s (transform 88ms, setup 0ms, collect 68ms, tests 545ms, environment 0ms, prepare 73ms)
```

Typecheck:

```text
> echoctl@0.1.0-beta.1 typecheck
> tsc --noEmit
```

Lint:

```text
> echoctl@0.1.0-beta.1 lint
> eslint . --max-warnings 0 && npm run lint:task-state


> echoctl@0.1.0-beta.1 lint:task-state
> python3 tools/task-state/lint.py
```

Shell syntax checks:

```text
$ bash -n tools/review-queue/_run_reviewer.sh
$ bash -n tools/dogfooding/journal-cat.sh
```

Both exited 0 with no output.

Real-data journal merge smoke:

```text
$ tools/dogfooding/journal-cat.sh 2026-06 >/tmp/echo-journal-cat-2026-06.md
```

Exited 0 with no stderr.

Whitespace check:

```text
$ git diff --check
```

Exited 0 with no output.

## Open Questions for Founder

None.

## Anything I Almost Did But Stopped Myself

- I noticed the frozen June shared file still has old rotation wording in its preamble, but LD4 allows only the one-line cutover note and forbids rewriting the shared file. I left the existing preamble/history untouched.
- I did not update `skills/*.md` or generated command/cache copies; the item explicitly assigns that realignment to strategist post-merge and excludes it from builder `files_to_modify`.

## Drift Events

None.
