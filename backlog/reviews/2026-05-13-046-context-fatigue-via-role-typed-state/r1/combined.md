---
item_id: 2026-05-13-046-context-fatigue-via-role-typed-state
round: 1
combined_at: '2026-05-14T00:36:05Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
patch_commit_sha: null
next_round: null
combined_verdict: pushback
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

Note: codex #1 and codex-ops #6 are textually divergent but semantically convergent on the AC4/AC5 read-contract gap (no ref param + no snapshot). Dispositioned jointly via the AC4 `ref?` parameter + ref-pinned byte-identity contract patches.

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC4/AC5, lines 70-86 | accept-with-patch | Added `ref?: string` parameter to `get_role_state` + `list_task_states`. Reads via `git show <ref>:<path>` (or HEAD if omitted; resolved-SHA echoed in response). Working-tree reads removed from V1 contract. AC5 byte-identity contract rewritten as ref-pinned. Tests assert byte-identical FS-vs-MCP at same ref. |
| 2 | MEDIUM | codex | AC2, lines 54-59 | accept-with-patch | Lint test (e) flipped: frontmatter-only files now FAIL with `missing-required-block` diagnostic. Required-blocks contract has no exception; empty placeholders must include skeleton blocks (empty bodies OK). |
| 3 | MEDIUM | codex | AC1/AC4, lines 44-49 and 73 | accept-with-patch | Pinned `canonical_anchors` body syntax as `- key: value` bulleted list under `## canonical_anchors`. Allowed keys for V1: `spec` (required), `reviews` (optional). New `_lib.parse_anchors` parser + `tests/task-state/anchors.test.ts` byte-round-trip test. AC4 `list_task_states` response shape pinned to parsed `{ spec, reviews? }`. Malformed anchors → `_parse_error` in response (degraded discovery preserved). |
| 4 | MEDIUM | codex | AC4/tests, lines 70-78 and src/mcp/server.ts:23-105 | accept-with-patch | Added explicit repo-root resolution contract to AC4: `startMcpServer({ repo_root })` option > `ECHO_REPO_ROOT` env > `cwd()` fallback. Resolved at server-start; no per-call `cwd()` reads. Tests inject tmpdir via option (1); production checkout never touched. |
| 5 | HIGH | codex-ops | AC7 plus reviewer invariant, lines 38, 65, 96-101, and 113 | accept-with-patch | AC7 narrowed: "read pointer first" applies to strategist/builder/watcher/dispatcher bindings ONLY. Explicit exclusion for reviewer-tick bindings (codex/codex-ops/cursor-in-reviewer-mode) added inline. Counter-example added: reviewer-tick seeing `task_state_ref:` in `request.md` MUST ignore. AC3's hard-fail lint (per finding #8) provides structural backstop. |
| 6 | HIGH | codex-ops | AC4/AC5, lines 70-87 | accept-with-patch | See finding #1 disposition (semantically convergent). AC4 now reads via `git show <ref>:<path>` exclusively (no working-tree reads); dirty-tree-mid-pull-rebase and partial-content hazards eliminated. Both `get_role_state` and `list_task_states` read from a single committed snapshot per call. |
| 7 | MEDIUM | codex-ops | AC1 round evolution and writer responsibilities, lines 48-49 | accept-with-patch | Added `round-state.md` ownership + write protocol to AC1: watcher owns boundary rewrites (in `review-queue-watch.md` post-combine flow); strategist between-round edits use freshness-check (read SHA → write → abort + queue-errors.md on stale). Atomic FS via `os.replace`. Reviewer ticks NEVER write. New writer-responsibilities table covers all three pointer types. |
| 8 | MEDIUM | codex-ops | AC3/R2 reviewer contamination lint, lines 65 and 145 | accept-with-patch | Upgraded from warning to **hard-fail** in `validate.py reviewer <path>`: any reviewer response body/frontmatter referencing `task_state_ref:` / `backlog/task-state/` / `task-state/<id>/<role>.md` exits non-zero with `REVIEWER_FRESH_EYES_VIOLATION`. `commit-reviewer-response.sh` quarantines via 041 AC4 `.invalid.<ts>` rename. `queue-errors.md` gets the trace. Fresh-eyes invariant now structurally enforced. |
| 9 | MEDIUM | codex-ops | AC8 and Definition of Done, lines 103-108 and 122-128 | accept-with-patch | Split AC8 into pre-merge (REQUIRED) + post-merge (follow-up). Pre-merge: recursive dogfooding writes `task-state/<046-id>/strategist.md` during cycle; review_notes notes whether subsequent strategist re-engagements used it (qualitative). Post-merge 1-week A/B measurement moved to "After Completion" #4 — no longer a merge prerequisite. Definition of Done updated to remove the deadlock; 1-week target preserved temporally. |

## Convergence call

**needs R2 — focus_hints:** Patches address all 9 R1 findings via inline spec edits at the next spec_commit_sha. R2 reviewer focus:
- Verify AC4 `ref?` parameter contract is implementable as written (codex implementability lens).
- Verify AC4 repo-root resolution contract has no remaining test-isolation hazard (codex implementability + codex-ops ops lens).
- Verify AC1 `round-state.md` write protocol's freshness-check has no race window between read-SHA and commit (codex-ops ops lens — TOCTOU window).
- Verify AC3 hard-fail lint correctly detects `task_state_ref:` references in reviewer responses without false-positives on legitimate cross-references in finding text (codex implementability — string-match precision).
- Verify AC8 pre-merge / post-merge split is operationally complete; no remaining "merge cannot complete because post-merge follow-up not done" deadlock (codex-ops ops lens).
- AC2 / AC5 / AC7 patches are mechanical; quick re-read sufficient.

Same roster `[codex, codex-ops]`. Target convergence at R2 (`proceed` or `proceed_after_patches`).

