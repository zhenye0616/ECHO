---
item_id: 2026-05-14-053-reviewer-completed-at-coercion
round: 3
combined_at: '2026-05-15T08:39:54Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

NOTE: codex-ops r3 = `proceed` (zero findings). All three remaining findings are codex-side narrow mechanics on AC3.2.

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC3.2 Push-stub contract, lines 114-116; commit-reviewer-response.sh lines 42-44 and 90-92 | accepted with patch | Push-stub contract rewritten: PATH-stub option EXPLICITLY FORBIDDEN (verified `commit-reviewer-response.sh` resolves `PUSH_HELPER` via `git rev-parse --show-toplevel` to an absolute path, so PATH-shadowing has no effect). Required mechanism: replace `$CHECKOUT/tools/review-queue/push-with-retry.sh` with a local-push stub file (with `chmod +x`). Acceptable alternative: additive `--remote=<url>` flag on real `push-with-retry.sh` with a github.com-rejection test. Patch applied inline to AC3.2 in r3 disposition. |
| 2 | MEDIUM | codex | AC3.2 Test repo setup and Pipeline assertions, lines 111-123; combine.py lines 34-36 and 273-287 | accepted with patch | AC3.2 setup step 7 rewritten to enumerate ALL required helpers including `reviewers.json` (combine.py imports `_reviewers.py` at module load → reads `reviewers.json`; without it combine.py crashes before exercising timestamp behavior). Setup step 8 rewritten with `requested_reviewers` eligibility contract: either (a) set to exactly `[<emitted-reviewer>]` for single-reviewer eligibility, OR (b) multi-reviewer with stub `<other-reviewer>.md` responses pre-created before combine.py runs. Without this, combine.py exits 0 with no `combined.md` produced and the pipeline assertion becomes vacuous. Patch applied inline to AC3.2 in r3 disposition. |
| 3 | LOW | codex | AC3.2 Production-repo untouched assertion, lines 118-120 | accepted with patch | Pre-test snapshot step 1 rewritten: after `PROD_REMOTE_MAIN_PRE` is captured, immediately assert it matches `^[a-f0-9]{40}$` (non-empty 40-character lowercase hex). If empty (network failure, silent ls-remote failure, dropped awk pipeline value), ABORT test setup with "AC3.2 cannot verify production-remote safety — pre-snapshot ls-remote returned empty; refusing to run". Without this, a transient ls-remote failure produces `empty == empty` in the post-test guard and silently passes the test even if a real push leaked. Alternative implementation specified: `execFileSync(['git', '-C', ..., 'ls-remote', 'origin', 'refs/heads/main'])` (no shell pipeline). Patch applied inline to AC3.2 in r3 disposition. |

## Convergence call

`needs R4 — focus_hints: verify the AC3.2 Push-stub contract now explicitly forbids the PATH-stub option (verified non-viable against current commit-reviewer-response.sh source) and prescribes file-replacement-at-checkout-path as the required default; verify the AC3.2 setup step 7 lists ALL combine.py prerequisites (reviewers.json + _reviewers.py + _lib.py + dispatch-next-round.py + schemas + request.py) so combine.py can import cleanly; verify the AC3.2 setup step 8 requested_reviewers eligibility contract is unambiguous about which combine.py code paths fire under shape (a) vs shape (b); verify the AC3.2 pre-test snapshot non-empty-40-hex validation forbids empty ls-remote results from passing silently. Flag if any remaining AC3.2 prose path produces a silent test-pass on a real failure mode.`

