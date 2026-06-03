---
item_id: 2026-06-02-087b-reviewer-child-readonly-migration
round: 1
combined_at: '2026-06-03T06:18:14Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 2
combined_verdict: pushback
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | ...087b...md:63-68 (AC1/AC2/AC3 capture vs read-only) | accepted — patched (convergent with #5) | e14c677f — AC2 rewritten: read-only child can't write `committed_file`; wrapper redirects child **stdout → `capture.stdout_path`** (wrapper-owned, outside the child sandbox) and publishes from it. AC5(iii)/(iv) assert valid-publish + no-content/malformed → durable queue-error. Wiring this 087-enum-defined kind is explicitly in-scope per AC6 (not a "new kind"). |
| 2 | HIGH | codex | ...087b...md:65 (sandbox flip is metadata-only) | accepted — patched | e14c677f — AC3 now flips the binding **argv** `--sandbox danger-full-access` → `read-only` (the real runtime control 087's gate resolves verbatim), not just the descriptive `agent_sandbox`. AC5(i) asserts the **resolved argv** carries `--sandbox read-only` and not `danger-full-access`; gate SHOULD reject argv/metadata mismatch. |
| 3 | MEDIUM | codex | ...087b...md:65-73 (Claude scope contradiction) | accepted — patched | e14c677f — AC3 + AC6 narrow the `danger-full-access` ban to **codex/codex-ops ONLY**; claude/cursor bindings + the 056 required-flag decision stay OoS, so the builder no longer must choose between failing AC3 and touching out-of-scope Claude. |
| 4 | MEDIUM | codex | ...087b...md:27-29 (stale parent spec_ref) | accepted — patched | e14c677f — parent `spec_ref` repointed to `backlog/complete/…087….md` (the lifecycle path the builder will have, since `blocked_by` 087 ⇒ 087 in complete/ before 087b is claimable) + an explicit pending_review fallback note. |
| 5 | HIGH | codex-ops | ...087b...md:56,63-68 + 087:69-71,85-88 (no durable content channel) | accepted — patched (same root as #1) | e14c677f — see #1: stdout capture channel named + wired, durable queue-error on rc≠0/empty/malformed (AC2 + AC5(iv)); resolves the unattended-launchd content-loss path. |
| 6 | HIGH | codex-ops | ...087b...md:56-64,16-19 (lifecycle in wrong actor) | accepted — patched | e14c677f — AC1 + Locked-1: the **wrapper** now owns `tick_start`/`tick_end`-outcome + post-response journaling (content-only child can't know if publish succeeded). AC5(v) tests tick_end outcome on validation-fail / push-fail / duplicate / success and no orphaned-open tick_start on successful publish. |

## Convergence call

needs R2 — both reviewers `pushback` (convergent on pushback, NOT a `{proceed*, pushback}` boundary cross, so not founder-escalated; watcher auto-dispositioned). All 6 findings accepted-and-patched at spec SHA `e14c677f` (path (b), verification round). The pushback was right: the spec was not implementable as written (a read-only child can't satisfy 087's `committed_file` capture, and the sandbox "flip" was metadata-only theater). #1≡#5 (capture channel) and the rest are distinct; none are prior-patch artifacts (r1 vs original text) → all must-patch. focus_hints for r2: verify (1) AC2 stdout capture channel is coherent for a read-only child (wrapper-owned path outside sandbox; rc≠0/empty/malformed → durable queue-error); (2) AC3 flips the resolved ARGV (not just metadata) + AC5(i) asserts it; (3) AC1 wrapper owns tick_start/tick_end + journaling + AC5(v) outcome tests; (4) Claude-narrowing is internally consistent (AC3/AC6 vs the `danger-full-access` ban); (5) parent spec_ref lifecycle path; (6) migration ORDER (commit-move before sandbox-flip) still holds and no intermediate read-only-but-still-self-committing state.

