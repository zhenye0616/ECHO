---
item_id: 2026-06-05-094-ci-burn-reduction-paths-ignore
verdict: merge as-is
reviewed_at: 2026-06-06T05:22:42Z
test_counts: { passed: 1592, failed: 0 }
producer: review-pending-orchestrator
---

## Verdict

`merge as-is`. This is the path-filter half of tonight's CI-billing fix (130/138 recent pushes were bookkeeping-only, burning the macOS 10× quota). The one load-bearing risk — AC3, whether `paths-ignore` co-located with `tags: [v*]` in `release.yml`'s `on.push` block could silently suppress a release tag on a bookkeeping commit — **resolves cleanly**: GitHub's official semantics are that **path filters are NOT evaluated for tag pushes**, independently confirmed against the GitHub workflow-syntax docs and a staff-answered community discussion (#165354). So a `v*` tag still fires build→validate→publish regardless of paths, the spec's mandated structural restructure was correctly NOT needed, and the diff stays at 20 trigger-only insertions ("reviewable in seconds"). All ACs Met; zero drift (no job/step/matrix/permission/`if` changes); full suite green (1592 passed) with the known `recent-calls-endpoint` concurrency flake not recurring; no merge conflict against current main (092/093's workflow edits already landed and this applies cleanly). The PR-level `paths-ignore` carries no "required-check-never-reports" hang risk because the plan returns a 403 for branch-protection and rulesets — no required check exists or can be created.

## Pre-merge fixups

- (none) — merge as-is.

## Expected merge conflicts

- None. Branch is 1 commit behind main (`13c97993`, a review sidecar touching no workflow files); `git merge-tree` produced no conflict markers; the `on:` blocks 092/093 landed apply cleanly under this diff.

## Follow-up items (defer, do not block merge)

- **Forward obligation (strategist-owned, already in the item's After Completion):** the successor aggregate `all-green` required-check item (092 AC3) MUST handle path-skipped runs — skipped-counts-as-success aggregate, or a no-op status job — or a bookkeeping push will leave a required check pending forever. 094's filters are a direct input to that design.
- **Documented residual (accepted in the spec):** a code change bundled into a >300-file bookkeeping push can evade GitHub's bounded-diff path evaluation and silently skip CI; operators in that abnormal case trigger `workflow_dispatch` manually.
- **Process nit:** future builders should paste the docs citation directly into `agent_notes`/run log when an AC turns on documented platform semantics (AC3 asked for it; the work was correct but uncited — the reviewer supplied the citation).
- **Operational note:** this only takes effect once GitHub Actions billing is restored (the spending-limit block is still live); until then no workflow runs at all, filtered or not. 094 reduces future burn; it does not un-block the current account gate.
