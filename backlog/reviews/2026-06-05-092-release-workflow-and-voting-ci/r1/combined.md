---
item_id: 2026-06-05-092-release-workflow-and-voting-ci
round: 1
combined_at: '2026-06-05T21:01:46Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 2
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | Acceptance Criteria / AC1-AC2 | accepted — patched | `a87c3524` — AC1 now mandates a single `build` job that `npm pack`s once, computes SHA-256, and uploads tarball+checksum as a workflow artifact; AC2 makes validation jobs download/verify that exact artifact and the `publish` job consume it only after all validation passes. Build-once handoff is now an explicit contract. |
| 2 | MEDIUM | codex | Acceptance Criteria / AC2 and files_to_modify / package.json | accepted — patched | `a87c3524` — AC2 "version-identity gate": workflow asserts `${GITHUB_REF_NAME#v}` == `package.json` `version` before publish; mismatch fails the job. Closes tag/version/tarball-name drift. |
| 3 | MEDIUM | codex | Acceptance Criteria / AC3 | accepted — patched (convergent w/ #6) | `a87c3524` — AC3 rewritten: in-file mechanism = existing required/aggregate job `needs:` the onboarding/windows-compat job (transitive requiredness); branch-protection/ruleset toggle is an explicit founder/manual follow-up OUTSIDE the file list, verified via `gh api .../branches/main/protection`. No invented required-checks surface. |
| 4 | MEDIUM | codex | Acceptance Criteria / AC4 and files_to_modify / tests/packaging/packed-manifest.test.ts | accepted — patched | `a87c3524` — AC4 now specifies parse `npm pack --dry-run --json` → sorted `files[].path` (path-only, normalized) asserted against an INLINE snapshot in the test file. Inline choice keeps `files_to_modify` unchanged (no external snapshot artifact). |
| 5 | MEDIUM | codex | Acceptance Criteria / AC6 | accepted — patched | `a87c3524` — AC6 scoped to impl/product files with an explicit carve-out for REQUIRED builder-protocol lifecycle edits (claim ready→claimed, move to pending_review, agent_notes/head_sha, run-log under raw/internal/agent-runs/). Resolves the AC6-vs-builder-protocol contradiction. |
| 6 | MEDIUM | codex-ops | backlog/proposed/2026-06-05-092-release-workflow-and-voting-ci.md:AC3 | accepted — patched (convergent w/ #3) | `a87c3524` — same disposition as #3. codex F3 and codex-ops F1 are the SAME finding (required-checks not settable from workflow YAML); combine.py split them on textual `where` difference. AC3 now carries the operator-verifiable branch-protection contract + `gh api` verification both reviewers asked for. |
| 7 | MEDIUM | codex-ops | backlog/proposed/2026-06-05-092-release-workflow-and-voting-ci.md:AC2 | accepted — patched | `a87c3524` — AC2 "least-privilege token": explicit `permissions:` — validation jobs `contents: read`, only `publish` gets `contents: write`. Prevents silent publish failure under a read-only default `GITHUB_TOKEN`. |
| 8 | MEDIUM | codex-ops | backlog/proposed/2026-06-05-092-release-workflow-and-voting-ci.md:AC2 and AC5 | accepted — patched | `a87c3524` — new AC2b: `workflow_dispatch` rehearsal runs the same build-once + OS-matrix validate steps but SKIPS publish (no tag/release created); only a real `v*` tag publishes. AC5 now points at this runnable rehearsal. |

## Convergence call

needs R2 — proposed-artifact verification round (forced for proposed specs per dispatch-next-round routing). All 8 r1 findings were `proceed_after_patches` spec-tightening (no scope expansion, no convergent-bug surface); patches landed in `a87c3524`. focus_hints: verify AC1 build-once artifact+checksum upload / AC2 download-verify-exact-artifact + version-identity gate + least-privilege `permissions:` split / AC2b workflow_dispatch skips publish / AC3 in-file `needs:` mechanism + founder-manual branch-protection carve-out / AC4 inline `npm pack --dry-run --json` sorted-path snapshot keeping files_to_modify unchanged / AC6 lifecycle carve-out. Reframe gate: NOT FIRED — r1 has no prior-round patches, so zero patch-introduced findings.

