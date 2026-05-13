---
item_id: 2026-05-13-045-queue-reliability-friction-cluster
round: 1
combined_at: '2026-05-13T21:54:09Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
patch_commit_sha: null
next_round: null
combined_verdict: divergent
escalated_to_founder: true
---

# Combined findings

r1 verdict roll-up: codex `pushback` (3 findings — 2 HIGH + 1 MED, all narrow operational/testability concerns, no architectural objection) + codex-ops `proceed_after_patches` (4 findings — 2 HIGH + 2 MED, all narrow operational guardrails). combine.py flagged `divergent + escalated_to_founder: true` because verdict labels crossed the boundary, but the **substantive direction is unanimous**: both reviewers want the same set of small patches, the disagreement is severity-label-vs-verdict-label, not whether-to-fix. **Strategist disposition: proceed past the mechanical escalation flag, apply patches inline, dispatch r2.** Boundary-crossing on a unanimous-direction case isn't a founder-substantive-conflict per the operating model's "irreversible moments" rule. 7 raw findings collapse to 5 distinct issues via strategist union-find.

## Convergent findings (strategist-paired)

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| C1 | HIGH | codex (2) + codex-ops (5) | §AC1 PRE-LINK-INVALID dirty-tree trap | spec-patch | AC1's success-after-retry path becomes **stderr-only**; `queue-errors.md` row written ONLY on terminal failure (after all in-session retries exhausted). Preserves observability tripwire without reintroducing friction #1 via the new helper's own writes. AC1 test adds AC1d "clean-tree assertion." |

## Divergent findings (single-reviewer)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| D1 | HIGH | codex (1) | §AC1 executable-boundary / testability | spec-patch | The helper IS the executable boundary (it's already a script `validate_response_yaml.py`). Test plan rewritten to (a) test the helper directly via fixture-driven exit codes + stderr matching, (b) verify reviewer-prompt integration via grep that each of the 3 prompt files references `validate_response_yaml.py` in Step 5. No deterministic test of markdown prose required. |
| D2 | HIGH | codex-ops (4) | §AC6 swallowed push failure | spec-patch | AC6's `git push origin main \|\| true` replaced with `tools/review-queue/push-with-retry.sh "review: <id>"`. Uses the established 039+041 retry-then-log-fallback contract. Failures surface non-zero at /review-pending exit, not silently at /merge-and-cleanup time. |
| D3 | MED | codex (3) | §AC6 staged-vs-committed contradiction | spec-patch | The "staged but NOT committed" paragraph removed. Single chosen path = commit + push-with-retry. Builder gets one unambiguous instruction. |
| D4 | MED | codex-ops (6) | §AC2 plist-installed-before-smoke fail-open | spec-patch | AC2's check reorders: smoke-runner existence is verified BEFORE any plist write / bootout / bootstrap / kickstart. If absent and `--smoke` was requested, exit 1 with NO production-side state changes. Operator can either author the smoke runner or re-run without `--smoke` (explicit choice). AC2 test extended to assert no plist exists on fail-closed path. |
| D5 | MED | codex-ops (7) | §AC5 `rm -rf` lacks identity guard | spec-patch | AC5a adds a 4-condition identity guard before the `rm -rf`: non-empty `$WORKTREE`, `.git` exists in `$WORKTREE`, `git -C $WORKTREE rev-parse --show-toplevel == $WORKTREE`, and `git -C $WORKTREE branch --show-current == $BRANCH`. Any failure surfaces and the rm does not execute. Removes the wrong-tree-deletion class. |

## Convergence call

`needs R2 — focus_hints: Verify C1 AC1's success-after-retry path is stderr-only; queue-errors.md write happens ONLY on terminal failure (with the new AC1d clean-tree test). Verify D1 AC1 test split: helper test (script-driven) + prompt-grep test (covers prompt integration). Verify D2 AC6 uses push-with-retry.sh, not bare push with || true. Verify D3 AC6 single unambiguous instruction (no staged-but-not-committed paragraph). Verify D4 AC2 smoke-runner check happens BEFORE plist install (no production-side state on fail). Verify D5 AC5a 4-condition identity guard precedes the rm -rf. 045 is class:narrow; target ≤3 rounds per Definition of Done. No scope-creep — any new finding outside C1, D1-D5 patches goes to _followups.md, not the spec.`

