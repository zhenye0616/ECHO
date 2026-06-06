---
item_id: 2026-06-05-094-ci-burn-reduction-paths-ignore
round: 1
combined_at: '2026-06-06T00:02:29Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

Reframe gate: bypassed — r1, no prior-round `spec-r*-patches` commits exist for this item; zero findings can be prior-patch-introduced by construction.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | backlog/proposed/2026-06-05-094-ci-burn-reduction-paths-ignore.md:70 | accepted — text_patch (real internal inconsistency: AC3's escape hatch was forbidden by Locked-3/AC5) | 6834ecc2 — Locked decision 3 now carries ONE sanctioned exception (minimal job-level `if:` for tag safety, only if the trigger-only precondition fails); AC5 cross-references it |
| 2 | MEDIUM | codex | backlog/proposed/2026-06-05-094-ci-burn-reduction-paths-ignore.md:63 | accepted — text_patch (convergent in substance with #3: PR required-check stranding) | 6834ecc2 — new AC2b records ground truth (no required checks exist; 403 free-tier, builder re-verifies at build time) + forward-guard for the future aggregate-gate spec |
| 3 | MEDIUM | codex-ops | Acceptance criteria AC1/AC2 — pull_request paths-ignore | accepted — text_patch (convergent in substance with #2) | 6834ecc2 — same AC2b patch |

## Convergence call

needs R2 — focus_hints: verify the r1 patches at 6834ecc2: (1) the Locked-3 sanctioned exception is narrow enough to keep the item diff-reviewable while resolving the AC3/AC5 inconsistency; (2) AC2b's required-checks ground-truth + build-time re-verification + forward-guard adequately closes the PR-stranding concern without adding mechanism 094 doesn't need.

