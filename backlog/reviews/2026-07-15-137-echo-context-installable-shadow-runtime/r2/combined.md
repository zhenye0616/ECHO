---
item_id: 2026-07-15-137-echo-context-installable-shadow-runtime
round: 2
combined_at: '2026-07-16T02:54:32Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 8e73045f4a3a19b4dd619596f56f316c84480fc4
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

Reframe gate: NOT TRIGGERED — r1 was an immutable no-response timeout with no patch commit; the spec history contains no prior `spec-r*-patches` commits for this item, so zero findings are prior-patch-introduced. All five findings target original spec text and are dispositioned as completion patches.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC3 / AC7 clean-home lifecycle | accepted — patched | 8e73045f — AC3 no longer hard-codes the bearer-token path: the secret/support root is configuration-derived, resolving under AC7's temporary HOME/support prefix for the clean-home smoke (no real user state written) and to the founder Application Support path for the real shadow install, with the same resolution code path in both |
| 2 | MEDIUM | codex | AC4 / AC7 release sequencing | accepted — patched | 8e73045f — AC4 gains an explicit two-phase ownership contract: phase one (builder, pre-review) delivers implementation + green tests + clean-home smoke against a locally built candidate artifact (marked non-release, never published/real-installed/recorded); phase two (founder execute, post-review) seals the successor SHA, builds the single release artifact from the detached clone of the landed SHA, re-runs the smoke on release bytes, publishes, installs, records. AC7 restates the smoke as running in both phases; build-exactly-once binds to the release artifact |
| 3 | MEDIUM | codex | AC4 Darwin x64 runtime / AC7 founder shadow install | accepted — patched | 8e73045f — AC5 adds an installer architecture preflight (pre-extraction host x64/Rosetta-2 availability detection with clear remediation failure; post-extraction bounded version/arch probe of the bundled node before plist creation or start), explicitly governing the AC7 founder-Mac install; AC6 doctor schema gains process architecture + Rosetta/translation status and fails on incompatible architecture/missing translation; lifecycle tests cover preflight failure modes |
| 4 | MEDIUM | codex-ops | AC5/AC6 launchd lifecycle and logs | accepted — patched | 8e73045f — AC5 now requires installer-owned log directory creation with current-user ownership and owner-only-write modes plus a documented maximum retained size for stdout/stderr via rotation or truncation of installer-owned log files (crash/output loops cannot grow logs without limit); AC6 doctor reports log ownership/modes/bounded-retention and fails on misowned/unbounded log paths; launchd/lifecycle tests assert bounded retention under a repeated crash/output loop |
| 5 | MEDIUM | codex-ops | AC1 startup lease / AC6 doctor | accepted — patched | 8e73045f — AC1 defines lease owner identity (PID, process start time, executable realpath, runtime artifact hash), safe stale-lease reclaim so launchd restart after crash/SIGKILL never deadlocks, and distinct refusal before opening storage when a live matching or foreign process owns the lease, with durable status/doctor evidence; AC6 schema gains startup-lease holder identity/state and fails on lease-blocked startup; composition tests cover reclaim + refusal |

## Convergence call

needs R3 — focus_hints: Verify the r2 patches at 8e73045f: (1) AC3 configuration-derived secret/support root — clean-home smoke writes under the temporary prefix only, real shadow install resolves to the founder Application Support path, same resolution code path; (2) AC4/AC7 two-phase ownership contract — candidate-artifact scope (never published/real-installed/recorded) vs founder-execute release phase (seal, detached-clone build-once, smoke re-run on release bytes, publish, install, record) is complete and non-contradictory with build-exactly-once and the existing AC7 founder-checkpoint text; (3) AC5/AC6 architecture preflight — pre-extraction Rosetta detection + post-extraction bundled-node probe ordering, doctor architecture/translation fields and failure; (4) AC5/AC6 bounded installer-owned logs — creation/ownership/modes, documented retention cap, doctor failure on misowned/unbounded paths, crash-loop test; (5) AC1/AC6 lease semantics — owner identity tuple, stale reclaim without deadlock, live/foreign-owner refusal before storage open, doctor lease evidence; and that no patch introduced a new mechanism beyond these completions.

