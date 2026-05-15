---
item_id: 2026-05-14-053-reviewer-completed-at-coercion
round: 1
combined_at: '2026-05-15T08:23:28Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
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

NOTE: F1 (codex AC2 testability) and F4 (codex-ops on-disk shape) target distinct concerns at different sections but are both about "make the design choices testable and explicit." F2 (codex AC5 shell-safety) and F3 (codex-ops AC3 isolation) are independent issues. Four distinct accepted-with-patch dispositions.

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | §AC2 lines 72-78 | accepted with patch | AC2 rewritten to require the coercion logic live in a named module-level helper `_coerce_completed_at(value: datetime.datetime) -> str` with a prescribed signature (no side effects, no exception paths for documented input type) so AC3.1 can call it directly. AC3 split into AC3.1 (direct helper unit-test with four EXACT-string sub-cases: UTC tz-aware, `-07:00` tz-aware producing `23:56:42Z`-not-`16:56:42Z` — the explicit falsifier for the "implementation skipped `astimezone(UTC)`" failure mode codex F1 named, `+09:00` tz-aware crossing the day boundary, naive datetime fallthrough) + AC3.2 (end-to-end pipeline) + AC3.3 (on-disk bytes unchanged). A test that only checks `type:str` or `endsWith('Z')` is explicitly INSUFFICIENT. Patch applied inline to AC2 + AC3 in r1 disposition. |
| 2 | LOW | codex | §AC5 line 97 | accepted with patch | AC5 grep command rewritten to the shell-safe form: `missing="$(grep -L "..." files... \|\| true)"; [ -z "$missing" ] \|\| { echo "..."; exit 1; }`. Bare `grep -L ... \| <pipeline>` under `set -e` is explicitly forbidden ("MUST NOT be used") because `grep -L` exits non-zero in the desired all-files-match case. Loop-with-`grep -q` form noted as equivalently acceptable. Patch applied inline to AC5 in r1 disposition. |
| 3 | MEDIUM | codex-ops | backlog/ready/2026-05-14-053-reviewer-completed-at-coercion.md:80-84 | accepted with patch | AC3.2 rewritten with a hermetic temp-git-repo isolation contract: `mktemp -d` + `git init` + local bare `origin.git` + push-stub (either env-var override on `push-with-retry.sh` OR PATH-stubbed `push-with-retry.sh` earlier on PATH; small `--remote=<url>` flag is acceptable only if env-var path is non-viable, document decision in test header). Production-repo untouched assertion is load-bearing: capture `git rev-parse HEAD` + `git status --porcelain` pre-test, re-capture post-test, assert byte-identical, AND `git ls-remote origin` against the real github.com remote shows no new refs matching the test-fixture pattern. Patch applied inline to AC3 in r1 disposition. |
| 4 | MEDIUM | codex-ops | backlog/ready/2026-05-14-053-reviewer-completed-at-coercion.md:58-60,109-119 | accepted with patch — option (b) "explicit relax + drift detection split across layers" | Architectural Invariant section gained a second paragraph stating the in-memory-only contract explicitly: "on-disk source bytes are NEVER rewritten" by validate.py. AC3.3 added as a load-bearing assertion (capture file bytes pre-pipeline, re-capture post-pipeline, assert byte-identical) so the contract is pinned into test surface — a future change that flips to source-rewriting cannot land silently. Risk R3 rewritten with explicit two-layer defense: AC5 grep-gate covers prompt-side drift in `.claude/commands/`; on-disk shape drift in `backlog/reviews/**/r*/<reviewer>.md` is filed as **053-followup-B** (separate CI lint script, out of 053 scope). Codex-ops's option (a) "rewrite stored response to canonical quoted form" REJECTED — validate.py becoming a writer not just reader is invasive and risky; option (b) chosen. Patch applied inline to Architectural Invariant + AC3.3 + Risk R3 in r1 disposition. |

## Convergence call

`needs R2 — focus_hints: verify the AC2 _coerce_completed_at helper signature is testable in isolation and that AC3.1's four EXACT-string sub-cases are sufficient to falsify the "skipped astimezone(UTC)" implementation; verify AC3.2's temp-repo isolation contract actually prevents any write to the founder's production github.com remote under all failure modes (test crash, push-stub bypass, exception mid-pipeline) — flag any path that could leak; verify AC3.3's on-disk-bytes-unchanged assertion is byte-comparison not text-normalized comparison; verify AC5's shell-safe form is syntactically correct under bash and zsh; verify the Architectural Invariant clarification + Risk R3 rewrite are internally consistent — the in-memory-only contract is now an architectural commitment, not just an implementation detail, and the 053-followup-B handoff is unambiguous about what's out of scope.`

