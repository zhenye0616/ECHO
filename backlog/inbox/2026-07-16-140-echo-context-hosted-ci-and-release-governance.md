---
id: 2026-07-16-140-echo-context-hosted-ci-and-release-governance
title: "echo-context hosted CI, server-enforced protection, and GitHub Release publication"
status: proposed
priority: LOW
estimate: 2d
created: 2026-07-16
blocked_by: []
requested_reviewers: ["codex", "codex-ops"]
files_to_modify: []
spec_refs:
  - raw/internal/decisions/2026-07-16-136-defer-github-hosted-gates.md # deferral decision and activation gate
  - backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.review.md # cycle-one implementation review fixup list
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# echo-context hosted CI, server-enforced protection, and GitHub Release publication

## Parked — activation gate (why this is in inbox/)

This item is gated on a non-item condition (parked-spec inbox convention): it activates only when **(a)** the founder fixes the GitHub org/plan-tier topology for `echo-context`, or **(b)** anything echo-context-shaped becomes client-facing. At activation, the founder chooses the enforcement shape:

| Plan tier (private repo) | Branch protection | Environment required reviewers | Release-approval shape |
|---|---|---|---|
| Free (current) | ✗ | ✗ | not enforceable — stay parked |
| Pro / org Team | ✓ | ✗ | dispatch-as-approval (founder-triggered `workflow_dispatch` publish) |
| org Enterprise | ✓ | ✓ | protected-environment required-reviewer gate |

Do not promote this item until that choice is recorded. `git mv` from `backlog/inbox/` to `backlog/proposed/` at activation, then spec-review as usual.

## Scope (deferred from item 136 per the 2026-07-16 founder decision)

1. Reintroduce, under review, the hosted workflows removed from item 136 cycle two: `ci.yml` (quality-macos, quality-ubuntu), `secret-scan.yml`, and a source-release build workflow, with least-privilege permissions, pinned actions, and workflow-policy tests.
2. Server-enforced `main` protection and (per chosen tier) release-approval gating.
3. GitHub Release publication of the AC5 source artifact, incorporating the cycle-one implementation-review fixups for `tools/release-publication-controller.mjs`: exact release/asset-ID final readback with re-download/re-hash, full mutation-response-body validation including publish PATCH, and preserved `git push --porcelain` created-by-this-run proof.

## Historical design evidence (read, don't rebuild from scratch)

- Spec SHA `f130ba6f` — the r14-converged GitHub-native design (branch protection + protected environment). Correct if Enterprise is chosen.
- Spec SHA `98250a76` — the r18 delegated-authorization design (operation host, plan/authorization records). Historical risk evidence of over-mechanization; do not resurrect wholesale. The r15–r19 review lineage documents why.
- `77c5e0c3` — cycle-one implementation review with the concrete controller fixup list.

## Out of Scope (Don't Drift)

- No install, runtime, or state-authority change; no public visibility change without an explicit founder decision.
- No re-litigation of item 136's landed local landing/seal protocol.
