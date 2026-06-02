---
item_id: 2026-06-02-084-install-profile-split
verdict: block
reviewed_at: 2026-06-02T17:24:32Z
test_counts: { passed: 1503, failed: 2 }
---

## Verdict
block

The Codex child review did not emit the required final markdown review file, so this is a parse-failure block sidecar rather than a merge recommendation. Durable evidence is preserved at `raw/internal/queue-errors/2026-06-02T17-01-54Z-review-pending-2026-06-02-084-install-profile-split/`. Partial evidence from the child is still useful: `npm test` failed in the full suite with 2 failures, `npm run lint` passed, `npm run typecheck` passed, and both failed tests passed when rerun in isolation.

## Pre-merge fixups
- [ ] Produce a parseable independent review for `2026-06-02-084-install-profile-split` with all required `##` sections before merging; the current child review is missing `Verdict`, `Acceptance status`, `Drift findings`, `Design-choice judgments`, `Bugs/risks`, `Merge-conflict preview`, `Suggested fixups`, and `Test counts observed`.
- [ ] Decide whether the full-suite `npm test` failure is acceptable as environmental/full-suite load flake evidence, or rerun full `npm test` until green before merge. Observed failures were `tests/mcp/recent-calls-endpoint.test.ts` timeout and `tests/cli/shell-reachable.test.ts` daemon-health timeout; both passed in focused reruns.

## Expected merge conflicts
- None expected from the child transcript: final diff/status checks showed the branch touched only the 15 files listed in `files_to_modify`, and there were no main-side changes in those files since the merge base.

## Follow-up items (defer, do not block merge)
- Codex `/review-pending` adapter friction: the first sandboxed child failed during Codex app-server initialization with `Operation not permitted`.
- Codex `/review-pending` adapter friction: the escalated child reached the end of verification but hung after final status/diff checks and never wrote the `--output-last-message` review file.
- Codex `/review-pending` adapter friction: process inspection required escalation; the default sandbox rejected `ps`.
- Test-suite friction: the full suite reported 2 failures under load while focused reruns passed, making merge review depend on flake classification.

## Open questions for founder
- Should I rerun `/review-pending 084` now to obtain a normal parseable review, or should this item go back to the builder/reviewer queue because the required review artifact failed?
