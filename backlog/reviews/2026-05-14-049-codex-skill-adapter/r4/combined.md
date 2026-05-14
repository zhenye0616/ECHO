---
item_id: 2026-05-14-049-codex-skill-adapter
round: 4
combined_at: '2026-05-14T20:17:32Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
patch_commit_sha: null
next_round: 5
combined_verdict: divergent
escalated_to_founder: true
---

# Combined findings

**Divergent verdicts** — codex='proceed_after_patches', codex-ops='pushback' cross the `{proceed*, pushback}` boundary; founder escalation per §Out of Scope #7.


**Strategist disposition (auto-resolve per 046 R4 precedent extension):** Verdict divergence at proceed*/pushback boundary; all findings mechanical — strategist applies inline patches and dispatches R5 verification. Founder-authorized auto-mode (R0 prompt: "full auto mode with two codex reviewers till converge"). No design redo; no escalation needed.

## Convergent findings

Strong cross-reviewer agreement on the probe-to-install race issue (codex F1 + codex-ops F2).

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| A | MEDIUM (codex F1 + codex-ops F2) | codex+codex-ops | AC4: probe/stage/mv sequence not locked across concurrent installer processes | accept-with-patch | AC4 patched: **per-target lock** via atomic `mkdir "$HOME/.codex/.echo-locks/<name>"` around the full probe-to-finalize sequence; trap removes lock on EXIT; concurrent invocation gets "another install in progress" diagnostic and exits non-zero. AC3 patched: new test `concurrent install lock serializes probe-to-finalize`. |

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 3 | HIGH | codex-ops | AC4: staging dir `$HOME/.codex/skills/.staging-<name>-$$` lives INSIDE the live codex skill discovery root; SIGKILL/power-loss leaves valid-SKILL.md staging dirs visible to next codex startup | accept-with-patch | **Load-bearing fix.** AC4 patched: staging moved OUTSIDE the live skill root to `$HOME/.codex/.echo-staging/<name>-$$` (sibling to skills/, same filesystem so atomic `mv` still works). Stale staging cleanup added to pre-flight (`find ... -mmin +60 -exec rm -rf`). AC3 patched: new test cases `staging directory lives outside ~/.codex/skills` + `stale staging cleanup runs on pre-flight`. |
| 2 | MEDIUM | codex | AC1 --check doesn't reject UNEXPECTED `adapters/codex/skills/*` directories; stale or accidental adapter could be committed/installed with --check green | accept-with-patch | AC1 patched: `--check` enumerates all `adapters/codex/skills/*` dirs; cross-references against in-scope skill set (skills with `## Binding-specific notes — codex` section); fails on any out-of-scope adapter. AC3 patched: new test case `--check rejects unexpected adapter directories`. |

## Convergence call

**needs R5 — final verification round (narrow focus_hints):**
- Verify AC4 staging happens in `$HOME/.codex/.echo-staging/<name>-$$` (NOT in skill root); stale-staging cleanup in pre-flight covers SIGKILL/power-loss orphans.
- Verify AC4 per-target lock (`mkdir "$HOME/.codex/.echo-locks/<name>"`) wraps probe-to-finalize; concurrent invocation diagnostic.
- Verify AC1 `--check` rejects unexpected adapters by enumerating `adapters/codex/skills/*` and cross-referencing in-scope set.
- Verify AC3 tests added for: staging-location, stale-staging-cleanup, concurrent-install-lock, unexpected-adapter-rejection.

R4 decay: 4 findings → 3 unique-root (after consolidating codex F1 + codex-ops F2). The R3→R4 transition saw codex-ops escalate to `pushback` after R3 had been resolved (codex's R3 HIGH was a "spec discipline" issue; codex-ops's R3 was zero findings; codex-ops's R4 pushback HIGH is on the NEW operational-safety surface introduced in my R3 staged-rename patch). This is the "each fix introduces new surface" pattern noted in strategist.md. R5 target: codex returns `proceed` (or nit-only); codex-ops returns `proceed` (or proceed_after_patches with no HIGH). If R5 produces another HIGH on staging mechanism, that's a signal to simplify AC4 (drop --copy mode for V1, defer to followup) rather than keep iterating.

