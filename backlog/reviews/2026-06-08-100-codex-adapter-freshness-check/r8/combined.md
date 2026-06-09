---
item_id: 2026-06-08-100-codex-adapter-freshness-check
round: 8
combined_at: '2026-06-09T18:35:53Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 98ce4d24e8cc894dcb8c79f67732301c55672dbf
next_round: 9
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Findings (3 MED — all real runtime-robustness gaps; none `pushback`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC3/AC5 — non-0/1 child outcomes undefined | **Accept, simplify to total mapping** | `98ce4d2` — `126`/`127` (sparse-`PATH` launchd can't resolve interpreter/`env` before the script emits `2`) or a signal weren't classified. Mapping is now **total**: only `0`→ok, `1`→drifted; **every** other outcome → `check-error`, with synthesized non-empty `detail` when stderr is empty. AC5 adds a `127`/signal case. Net-simplifying (total function), not new mechanism. |
| 2 | MEDIUM | codex-ops#1 | AC1/AC3 — missing-source remediation is non-fixing | **Accept, tighten** | `98ce4d2` — re-running the installer can't fix a deleted-`source` orphan → persistent degraded loop. `--check` now advertises **removing the orphan dir** (`rm -rf <abs>`) for that skill (prints, never executes — not auto-repair). AC5 asserts installer-rerun does NOT clear it but the removal does. |
| 3 | MEDIUM | codex-ops#2 | AC2/AC5 — unreadable ~/.codex masquerades as absent | **Accept, tighten** | `98ce4d2` — an untraversable `~/.codex/skills` / unreadable sentinel globs to zero → false `ok` on uninspectable state. AC2 is now **readable-zero only**; uninspectable → exit `2` (check-error) with stderr. AC5 adds the case. |

## Convergence call

`needs R9 — focus_hints:` verify the r8-patch (`98ce4d2`): (1) total exit mapping (0→ok, 1→drifted, all else→check-error incl. 126/127/signal, synthesized detail); (2) missing-source advertises orphan-removal (not installer-rerun); (3) uninspectable `~/.codex` → exit 2, not false-ok. **Termination plan (strategist judgment, founder-aware):** we are at r8; the **load-bearing design has been stable since ~r4** (detect drift, report in doctor, never gate merges, namespace-safe), and every round since has surfaced a real-but-finer *operator-runtime* edge case (exit codes → PATH → remediation accuracy → 127/signal → missing-source → unreadable-dir) — a stream with no natural endpoint. Per the disposition discipline (don't accumulate runtime polish a stable core doesn't need) I am treating **r9 as the intended terminal verification round**: if both reviewers `proceed`/0, converge and promote; if r9 surfaces only further *runtime-hardening* edge cases (no design/`pushback` finding), I will **converge anyway and route remaining hardening to the build-phase review** — where the same concerns are verified against *real code* rather than litigated as spec hypotheticals — and to a `_followups.md` note. Founder's r6 "accept both, one more round" + "keep driving on Opus 4.8" remain the standing authority; this records the planned stop so it isn't a silent deviation.

