---
item_id: 2026-05-14-049-codex-skill-adapter
round: 1
combined_at: '2026-05-14T19:53:24Z'
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

Note: codex F3 (R2/AC4 copy fallback missing) and codex-ops F4 (R2 mitigation not promoted) both target the same root cause — `--copy` fallback omission. Consolidated as one disposition.

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| A | MEDIUM | codex F3 + codex-ops F4 | R2 / AC4: `--copy` fallback for symlink-discovery failure not in-spec | accept-with-patch | AC4 patched: install script REQUIRED to support `--symlink` (default) + `--copy` modes; mode switch supported; idempotent. R2 risk updated: copy mode is in-AC, not just documented mitigation. DoD accepts either mode landing cleanly. |

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC1/AC3: YAML-unsafe description passthrough breaks on real canonicals | accept-with-patch | AC1 patched: `description` + `metadata.short-description` MUST be YAML-safe-serialized via `yaml.safe_dump` or equivalent quoting. AC3 patched: new test case `YAML-safe serialization for tricky descriptions` (colon+apostrophe fixture, round-trip assert). |
| 2 | MEDIUM | codex | AC4/Tests: install helper has no automated test contract; could mutate ~/.codex/skills | accept-with-patch | AC3 patched: new `tests/sync-skills/install-codex-adapters.test.ts` with 8 cases (HOME=$TMPDIR, clean install, idempotent rerun, --copy mode, mode-switch, --dry-run, non-managed conflict refuses, unwritable HOME). |
| 4 | HIGH | codex-ops | AC1/AC5 materialize ALL skills but Out of Scope defers vendor-neutralization for most; codex would discover Claude-coupled skills | accept-with-patch | **Load-bearing scope tightening.** AC1 patched: adapter materialization restricted to canonicals WITH documented codex binding-specific notes section. Today exactly 2 skills qualify (process-backlog from 047, review-pending after AC2). Others land in per-skill followups AFTER their codex notes section is added. New Out of Scope item added. R6 risk added (review-queue-watch may need in-scope addition mid-build IF dogfooding shows codex strategist commonly invokes it — gated on builder also adding codex notes to review-queue-watch in same commit). |
| 5 | MEDIUM | codex-ops | AC2 codex fan-out unsafe (shared writable checkout, plain wait, no per-item status, JSON parse failures unbounded) | accept-with-patch | AC2 patched: codex binding-specific notes for review-pending now prescribe **operationally-safe fan-out**: per-child temp files for stdout/stderr/rc; worktree-safety via prompt language (children write-disciplined; orchestrator does final sidecar write); JSON parse failure = hard per-item failure; bounded cleanup via `trap rm EXIT`; concurrency cap N≤4 with counting semaphore. |
| 6 | MEDIUM | codex-ops | AC4 install helper missing `mkdir -p "$HOME/.codex/skills"` pre-flight; breaks clean-machine first run | accept-with-patch | AC4 patched: install script MUST `mkdir -p` pre-flight; unwritable HOME exits non-zero with clear diagnostic. AC3 patched: test case `pre-flight creates ~/.codex/skills if absent` added. |

## Convergence call

**needs R2 — focus_hints (narrow):**
- Verify AC1 scope tightening: adapter materialization restricted to skills with documented codex binding-specific notes (today: `process-backlog` + `review-pending`); Out of Scope explicitly forbids other skills.
- Verify AC1 YAML-safe serialization for `description` and `metadata.short-description` (colons/quotes/brackets handled).
- Verify AC2 codex binding-specific notes for `review-pending` describe operationally-safe fan-out (per-child temp files, prompt-based worktree-safety, JSON parse failure semantics, bounded cleanup, concurrency cap).
- Verify AC4 supports both `--symlink` (default) + `--copy` modes; `mkdir -p` pre-flight; refuses overwriting non-managed paths; idempotent.
- Verify AC3 new test cases land in both `install-codex-adapters.test.ts` (8 cases) AND `codex-adapter.test.ts` (YAML-safe + scope-skip cases).

R1 decay: 7 findings (3 codex + 4 codex-ops; 1 HIGH from codex-ops + 6 MEDIUM); 6 unique-root after consolidating codex F3 ∪ codex-ops F4. All mechanical, all accepted with patch. **Both reviewers converged to `proceed_after_patches` at R1 — no verdict divergence.** R2 target: both reviewers converge to `proceed` or `proceed_after_patches` with no HIGH and ≤3 minor findings.

