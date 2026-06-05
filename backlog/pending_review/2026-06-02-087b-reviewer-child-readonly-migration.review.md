---
item_id: 2026-06-02-087b-reviewer-child-readonly-migration
verdict: merge as-is
reviewed_at: 2026-06-05T03:37:43Z
test_counts: { passed: 1540, failed: 0 }
producer: review-pending-orchestrator
---

## Verdict

`merge as-is` at `head_sha: 6c95b171218bf946889662f8db5ffc71c866ec5f`. 087b moves the codex/codex-ops reviewer-artifact write+commit out of the AI child into the wrapper and flips the child to `--sandbox read-only` — closing the R1 fabrication surface (an AI child that both judged a diff and had full-access self-commit). An independent fresh-context review found 4 findings (2 HIGH, 2 MED); all were driven to **root-cause** across 5 fixer passes, each re-confirmed by a separate read-only reviewer, ending in an explicit **CONFIRM (root-cause across 087b scope, merge-ready)**. Final state: (①) a GATE-OWNED exact-argv allowlist for codex/codex-ops — `codex exec -C <WT> --sandbox read-only --json -`, argv[0] pinned, rejecting every sandbox-bypass form (glued/duplicate/`--dangerously-bypass…`/`-c`/`--profile`/poisoned default bindings), replacing the original whack-a-mole denylist; (②) capture-failure non-reselection via an anchor-dir terminal registry written pre-push and consulted by the selector on both pinned + scan paths, with `tick_end` always emitted even on push failure; (③) request-binding validation (reviewer/item_id/round/exact artifact_sha) before publish; (④) AC5 regressions for all of the above. Full `npm test` green (1540 passed / 21 skipped) at the fix passes; isolated trial merge of `6c95b171` into `origin/main` is clean. Reviewer-independence satisfied (builder = codex build session; reviewers + fixers = separate fresh sessions; final confirm independent).

## Pre-merge fixups

- [x] None — all 4 review findings were root-cause-fixed on-branch (passes 1–5) and independently re-confirmed; no outstanding code fixups. The only pre-merge edits were bookkeeping (head_sha bump 05a7ef3a→6c95b171, agent_notes fix-history, builder.md handoff_head_sha, 056 files_to_modify authorization), applied in the reconciliation commit.

## Expected merge conflicts

- None. Isolated trial merge of `6c95b171` into current `origin/main` succeeded with zero conflicts. The branch touches `tools/review-queue/**`, `tests/review-queue/**`, `skills/review-queue-*.md` + `.claude/commands/*` adapters, and `docs/review-queue-setup.md`; `main`'s commits since the merge-base (`5c748845`) are backlog state-moves + journal appends + 088 review artifacts — zero file overlap.

## Follow-up items (defer, do not block merge)

- **Binary provenance / PATH hardening** (NEW, from the fix review): the gate validates invocation *shape*, not the `codex` binary's *provenance* (PATH resolution / signing). Explicitly documented out of 087b scope; file as a host-trust hardening successor if desired.
- **combine.py / watcher native `capture-failed` classification** (087b OoS, r7 codex-ops): terminal capture-failures currently degrade through the generic `partial_responses`→founder path; teaching the orchestration layer to render an explicit `capture-failed` row is a successor (tracked in `backlog/_followups.md`).
- **claude / cursor read-only migration** — gated on the `056-claude-required-flag-gate` decision; 087b is codex/codex-ops only.
- **`NormalizedReviewIntermediate`, evidence byte-cap/redaction, schema enum-sync codegen, per-binding preflight/smoke, headless watcher** — 087b OoS successors.
- **Ops (unrelated to this diff):** a stale `ECHO_COORD_REQUEST_PATH` pinned to the deleted `2026-05-16-057b/r1/request.md` misfired ~24 reviewer ticks today (`bind_failed`); a reviewer-loop/launchd env-config cleanup, not a code change here.
