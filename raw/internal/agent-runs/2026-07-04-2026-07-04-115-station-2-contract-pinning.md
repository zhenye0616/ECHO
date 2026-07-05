# Agent run — 2026-07-04-115-station-2-contract-pinning

- **Builder:** builder-115
- **Branch:** agent/station-2-contract-pinning
- **Head SHA:** ab39e06a31fc41267cdc1fb4e9e00541318ace06
- **Claimed at:** 2026-07-05T00:51:36Z

## What was built

Shape + infra only, zero new capability, per the lock-in scope refinement. Four files touched — exactly `files_to_modify`, no new source module.

- **AC1** — added the pure exported helper `filterToCurrentSignalRuns(candidateEvents, manifestEvents)` in `src/enrich/granola-signals.ts`, composing the untouched `resolveCurrentGranolaSignalRuns`. Order-preserving; non-signal events pass through unconditionally (the same asymmetric filter search-memories has always applied). 13 unit cases pin every semantic: current-run pass-through, superseded exclusion, chain >=2 -> newest, supersedes cycle -> nothing (terminates via superseded-set construction), inert dangling supersedes ref, duplicate manifests (hardcoded `run-b` winner), completed_at tie (hardcoded lexicographic `run-b`), retry-orphan exclusion, no-manifest exclusion, multi-note independence, exact output id sequence (array equality), mixed-window passthrough.
- **AC2** — replaced the inline `restrictToCurrentGranolaSignals` composition block in `src/mcp/tools/search-memories.ts` (formerly ~lines 389–398) with a single `filterToCurrentSignalRuns(candidates, manifestEvents)` call. Existing tests untouched and green; added one orphan-exclusion parity case through the tool path.
- **AC3** — added `GranolaSignalObservability` on the worker `ok` result: `skipped_notes {missing_summary, missing_transcript, missing_dedupe_key}` with exclusive first-match precedence (summary -> transcript -> dedupe), `malformed_events` (both missing `note_id` and invalid `granola_atom_type`), `unparsable_updated_at` (counts-as-settled behavior PINNED unchanged). Each skip/malformed/unparsable emits exactly one structured warn log carrying a machine-readable `reason` + `note_id` where known. 7 cases including the mixed-defect worker tick asserting the FULL observability object by exact `toEqual` plus reason-line logger-spy assertions.
- **AC4** — wire-contract conformance test with hardcoded signal-atom / manifest-atom field lists, `signal_type` enum, full metadata key-set equality, and the transcript-span-quote-enforced vs summary-span-not-guaranteed asymmetry.
- **AC5** — no new source file; the helper lives in the already-packed `granola-signals.ts`. Packaging invariants green with zero snapshot delta.

`resolveCurrentGranolaSignalRuns` internals were NOT modified (its semantics are pinned by tests, not redesigned).

## Test results (real output)

- `npx vitest run tests/enrich/granola-signals.test.ts tests/mcp/tools/search-memories.test.ts` — 2 files, **99 passed** (enrich 31, search-memories 68).
- `npx vitest run tests/packaging/import-closure.test.ts tests/packaging/packed-manifest.test.ts` — **2 passed**, zero snapshot delta.
- `npm run test:product` (product gate, vitest.product.config.ts) — **158 files passed, 1 skipped; 1694 tests passed, 21 skipped, 1 todo, 0 failed.** The known load-flaky tests (cli/shell-reachable, cli/doctor) passed inline under full load.
- `npx tsc --noEmit` — clean.
- `npx eslint --max-warnings 0` on the four changed files — clean.
- `npx prettier --check` on the four changed files — clean (two files were `prettier --write` formatted after the heredoc append).

## Flags for the reviewer

- **Claim-commit contamination (process deviation, no data loss):** the atomic-claim commit `7bc368b5` unintentionally included an untracked `raw/internal/pitch/yc-2026-07/**` directory (founder's YC pitch drafts) that was sitting in the shared checkout when `git add -A` ran. The files are preserved on disk and in git; I deliberately did NOT try to surgically un-commit them from already-pushed shared `main` (destructive-git risk across worktrees). Surfacing for the founder to decide whether those drafts belong in that commit.
- **Helper param name:** the spec's working name is `filterToCurrentSignalRuns(signalEvents, manifestEvents)`; the first param is named `candidateEvents` in code because it faithfully accepts a mixed candidate window and passes non-signal rows through (required to preserve search-memories behavior — the 112 cross-source-join test asserts a non-signal team-decision atom survives the restriction). Function name matches the spec exactly.
