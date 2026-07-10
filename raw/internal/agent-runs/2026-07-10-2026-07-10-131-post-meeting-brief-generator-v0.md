---
backlog_item: 2026-07-10-131-post-meeting-brief-generator-v0
agent_run_started: 2026-07-10T05:47:26Z
agent_run_ended: 2026-07-10T06:16:12Z
status: ready_for_review
test_status: passing
branch: agent/post-meeting-brief-generator-v0
head_sha: b58f558ebebd0bcbf6893c8fea5dcda5404f3ef0
---

# Agent Run: Post-meeting brief generator v0

## What I Implemented

Built `echoctl brief` as the post-meeting brief fast path: it polls Granola, resolves an explicit or freshness-gated target note, runs note-scoped signal extraction, compiles a canonical brief JSON object, writes JSON + Markdown artifacts, and prints the Markdown render.

Hardened the supporting Granola paths called out by the spec: current-note resolution for superseded atoms, re-ingest on newer `updated_at`, content-hash extraction fingerprints, current-run signal filtering, lock-directory checkpoint writes, retry-after bounded extraction failures, fenced-JSON salvage, single-transcript prompt embedding, prompt-size timeout scaling, and chat-safe Markdown rendering.

## Files Modified

- `src/cli/commands/brief.ts` — new `echoctl brief` command implementation.
- `src/cli/index.ts` — registered `brief` in top-level CLI dispatch/help. This is outside the provisional list but required for the named command to exist.
- `src/enrich/post-meeting-brief.ts` — canonical brief object, target resolution, compile/render/write helpers, sanitizer, parity comparator.
- `src/capture/surfaces/granola-poller.ts` — checkpoint lock helper and current Granola note resolver; re-ingest current API note when `updated_at` is newer than stored current atoms.
- `src/enrich/granola-signals.ts` — current raw-note selection, lock-protected checkpoint updates, retry-after extraction failures, note-scoped worker mode, content-hash fingerprints, parse salvage, single-embed prompt, scaled timeouts.
- `tests/enrich/post-meeting-brief.test.ts` — target/current-run/render/parser/lock/parity coverage.
- `tests/cli/brief-command.test.ts` — command success, stale argv-less target failure, `--force`, and top-level help registration coverage.
- `tests/packaging/packed-manifest.test.ts` — updated shipped-file snapshot for the new packaged command/module. This is outside the provisional list but required by the package-manifest gate.
- `backlog/_followups.md` — appended the required AC3 item-130 RC3 residual line only.

## Decisions Made During Implementation

### Decision 1: Register `brief` in the top-level CLI

- **Options considered:** implement only `src/cli/commands/brief.ts`; or wire it through `src/cli/index.ts`.
- **Chose:** wire it through `src/cli/index.ts`.
- **Why:** AC1 names the user-facing command as `echoctl brief`; without top-level dispatch, the command file is unreachable.
- **Worth founder review?** No. The spec marked `files_to_modify` as provisional and invited builder refinement without scope expansion.

### Decision 2: Update the packaging manifest snapshot

- **Options considered:** leave the snapshot failing; or update the package file list for the emitted `dist/cli/commands/brief.*` and `dist/enrich/post-meeting-brief.*` files.
- **Chose:** update the snapshot.
- **Why:** `npm run test:product` builds the package and correctly found the new shipped dist files.
- **Worth founder review?** No. This is a structural test update required by the new packaged command/module.

### Decision 3: Keep AC6's exact U+2019 sanitizer transform

- **Options considered:** replace inline backticks with ASCII apostrophe; or follow AC6 exactly and use typographic apostrophe U+2019.
- **Chose:** U+2019.
- **Why:** AC6 says "EXACTLY these transforms"; the non-ASCII character is intentional spec behavior here.
- **Worth founder review?** No. It follows the written acceptance criterion.

## Acceptance Criteria Status

- [x] AC1 target contract — `echoctl brief` supports `--note`, freshness-gated argv-less selection, extraction-ok/current-manifest failure modes, identity line, and review banner.
- [x] AC2 re-ingest — poller re-ingests newer `updated_at`, exports current Granola note resolution, and signal extraction fingerprints include content hash.
- [x] AC3 current-run reads — brief compiler reads signals through `filterToCurrentSignalRuns()` and the required item-130 residual follow-up is filed.
- [x] AC4 shared-state coordination — shared checkpoint lock-directory protocol is implemented for poller and signals, with bounded failure retry and `--force` clearing target failures.
- [x] AC5 brain I/O — fenced JSON salvage, parse-failure non-retry, single transcript embed, and prompt-size timeout scaling are implemented and covered.
- [x] AC6 render integrity — fence lines removed/content indented, inline backticks become U+2019, wide mentions get U+200B, local date guard, per-action owners, and `unassigned` fallback are implemented.
- [x] AC7 canonical brief object — JSON and Markdown artifacts are emitted with the specified shape and stable render.
- [x] AC8 prototype parity — parity normalizer/set helper implements the spec's normalization contract; local-real-note fixtures skip when absent.

## Tests Run

```text
$ npx vitest run tests/enrich/post-meeting-brief.test.ts tests/cli/brief-command.test.ts

 Test Files  2 passed (2)
      Tests  10 passed (10)
   Start at  23:14:42
   Duration  1.58s (transform 730ms, setup 0ms, collect 1.14s, tests 65ms, environment 0ms, prepare 359ms)
```

```text
$ npm run typecheck -- --pretty false

> echoctl@0.1.0-beta.1 typecheck
> tsc --noEmit --pretty false
```

```text
$ npm run lint

> echoctl@0.1.0-beta.1 lint
> eslint . --max-warnings 0 && npm run lint:task-state

> echoctl@0.1.0-beta.1 lint:task-state
> python3 tools/task-state/lint.py
```

```text
$ npx vitest run tests/packaging/packed-manifest.test.ts tests/packaging/packaged-boot.test.ts

 Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  23:10:05
   Duration  15.07s (transform 201ms, setup 0ms, collect 484ms, tests 18.76s, environment 0ms, prepare 310ms)
```

```text
$ npm run test:product

 Test Files  175 passed | 1 skipped (176)
      Tests  1848 passed | 21 skipped | 1 todo (1870)
   Start at  23:15:14
   Duration  50.79s (transform 7.37s, setup 0ms, collect 43.72s, tests 344.15s, environment 25ms, prepare 20.48s)
```

## Open Questions for Founder

None.

## Drift Events

None. I stayed within the spec's root-cause fixes and used the provisional file-surface note only for direct command reachability and package-test fallout.

## Next Suggested Backlog Items (Don't Auto-Create)

- The AC3 residual is filed in `backlog/_followups.md`: item-130 bridge should read signals through `filterToCurrentSignalRuns()`.
