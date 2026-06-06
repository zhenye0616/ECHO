---
task_id: 2026-06-05-094-ci-burn-reduction-paths-ignore
role: builder
binding: codex
claim_branch: agent/ci-burn-reduction-paths-ignore
last_updated: 2026-06-06T00:56:52Z
---

## current_thesis
Claimed 094 as codex builder. Implement only trigger-level path filters that stop bookkeeping-only pushes from firing CI/release rehearsal matrices while preserving all non-bookkeeping CI and the unfiltered `v*` release-tag path.

## locked_decisions
- AC1: `.github/workflows/ci.yml` `on.push` for `main` and `on.pull_request` gain `paths-ignore` for `backlog/**`, `raw/**`, `docs/**`, and `wiki/**`; `workflow_dispatch` remains unchanged.
- AC2: `.github/workflows/release.yml` `agent/**` rehearsal pushes and `pull_request` gain the same `paths-ignore`; `workflow_dispatch` remains unchanged.
- AC2b: required-check safety is a spec-recorded decision; do not add builder-side GitHub protection verification.
- AC3: prove or cite that `v*` tag pushes remain unfiltered. If trigger-level filtering can suppress tag runs, apply only the minimal sanctioned tag-safety exception.
- AC4: run YAML/static workflow verification plus `npm test`, `npm run lint`, and `npm run typecheck`; live CI is not a builder gate while billing is failing.
- AC5: touch only the two workflow trigger blocks unless AC3 requires the sanctioned minimal tag-safety exception; lifecycle edits and run log are allowed.

## open_questions
- None blocking at claim. Escalate if implementation needs non-trigger workflow changes beyond AC3's explicit exception, a new dependency, files outside `files_to_modify`, or branch-protection/account-billing verification.

## dont_touch
- Do not implement the aggregate `all-green` required-status job.
- Do not split test suites or alter job/matrix/step bodies beyond AC3's sanctioned minimal exception if needed.
- Do not change repo visibility, account billing, or GitHub plan settings.
- Do not redesign bookkeeping commits onto another branch or state store.
- Do not edit `wiki/**`, founder-owned status/backlog docs, backlog item bodies, or files outside the spec's `files_to_modify`.

## canonical_anchors
- spec: backlog/claimed/2026-06-05-094-ci-burn-reduction-paths-ignore.md
