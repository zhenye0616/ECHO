---
item_id: 2026-06-02-086-claim-gate-spec-review-convergence
round: 3
combined_at: '2026-06-02T20:14:41Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 7d415078dcc22dad61208c91c7cb2e58d4e4f192
next_round: 4
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
| 1 | HIGH | codex | ...086...:12-13,21,95-97 | **accepted** (= #3) — F-stale-frontmatter: r2 patched body/ACs but left `files_to_modify`/`spec_refs` describing the one-marker model ⇒ a builder reads contradictory instructions. Real (Gate-4 failure). | `7d415078` — re-grepped the whole spec for old-contract vocabulary; reconciled files_to_modify L12-13, spec_refs L21, AC1/AC3/AC5, the frontmatter example, and a residual L86 `git show` clause — ALL now name the single content-anchored `converged` marker. |
| 2 | HIGH | codex-ops | ...086...:81-83,95-99 | **accepted** — F-fail-open: the r2 `waived`-for-case-(c) path has no content anchor ⇒ a post-terminal edit stays claimable. Real. **Reframe gate FIRED** (this + #1/#3 = ≥2 findings targeting the r2 patch) → per disposition discipline, REMOVED the r2 two-marker mechanism rather than patching deeper. | `7d415078` — unified: BOTH terminal paths write `spec_review: converged` + `spec_review_sha` = a **digest of normalized reviewed content** (not a git sha). Closes self-ref (r1) + case-(c) self-stale (r2) + fail-open (r3) uniformly; any later substantive edit changes the digest ⇒ re-block, including after case-(c). `waived` is founder-only again. |
| 3 | MEDIUM | codex-ops | ...086...:13,21,81-83,95 | **accepted** (= #1, same stale-frontmatter) — codex-ops independently flagged the same one-marker residue in the frontmatter guidance. | `7d415078` — see #1 (full re-grep + reconcile). |

## Convergence call

**needs R4** — reframe gate fired (≥2 findings targeting the r2 patch); resolved by **removal** (dropped the r2 two-marker split) and unification on one content-anchored `converged` marker @`7d415078`. Net simplification: also removed the r1 `git show` archaeology. Patch needs a verifying round. focus_hints for R4: confirm the single-marker content-digest model has NO residual one-marker/two-marker inconsistency anywhere (frontmatter + ACs + body all reconciled), that the digest excludes marker+agent-managed fields (no self-reference), and that case-(a) AND case-(c) both stay staleness-checked (no fail-open). This is a removal/simplification round — expect convergence unless a NEW gap exists in the unified model itself.

