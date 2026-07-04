---
item_id: 2026-07-04-114-drift-sweep-v0
round: 2
combined_at: '2026-07-04T19:34:45Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 3
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
| 1 | MEDIUM | codex | Acceptance Criteria AC1/AC3 | accepted — patched (propagation completion) | AC1's terminal set was incomplete: the common case (valid verdict, `contradicts: false`) had no terminal state, so the watermark could never advance for non-contradicting pairs. Added terminal `judged-no-contradiction` and made the terminal set total. |
| 2 | MEDIUM | codex | Acceptance Criteria AC4 | accepted — patched (propagation completion) | AC4 now bounds quote rejection: after bounded re-judge retries at the same judge version, a persistently non-verbatim quote is a terminal judge failure (AC3 terminal class + operator-visible evidence). Cannot loop every tick or block the watermark. Test added. |
| 3 | MEDIUM | codex | Acceptance Criteria AC5 | accepted — patched (propagation completion) | AC5 now defines the exact intent-written/no-outcome crash-recovery transition: next tick promotes to `delivery-failed` without re-calling Slack, which is the terminal state that permits watermark advance. Reprocessing test added. |
| 4 | MEDIUM | codex | Acceptance Criteria AC6 | accepted — patched (propagation completion) | AC6 overflow now recorded as `delivery-deferred` (non-terminal per AC1), holding the watermark and draining on later ticks — not silently dropped, not stalling forever. cap=3 over >3 contradictions drain test added. |
| 5 | MEDIUM | codex-ops | AC4 (:35) | accepted — patched (convergent with row 2) | Same AC4 quote-rejection terminal/retryable gap; resolved by the AC4 bounded-terminal patch with pair keys + judge version + reason + non-loop rerun test. |
| 6 | MEDIUM | codex-ops | AC5 (:36) | accepted — patched (convergent with row 3) | Same AC5 intent-no-outcome crash-recovery test gap; resolved by the AC5 recovery-transition patch (no second Slack call, operator-visible delivery-failed, reaches terminal for watermark advance). |
| 7 | MEDIUM | codex-ops | AC6 (:37) | accepted — patched (convergent with row 4) | Same AC6 overflow watermark gap; resolved by the `delivery-deferred` non-terminal + cursor-blocking + drain-without-repost patch (codex-ops' deferred-drain posture, not silent terminal drop). |

## Reframe gate

Triggered: ≥2 r2 findings (rows 1, 3, 6 at minimum) target mechanism the r1 patch introduced (the per-pair terminal-state model in AC1/AC3/AC5). Not bypassable — findings are AC-semantics/state effects, not mechanical. Ran the mandatory fresh-context `codex exec --sandbox read-only` investigator (r1 patch commit under review: `48a2834f`). Investigator verdict: **`propagation_completion`** — the r1 per-pair-state mechanism is correct in shape but its state enumeration is not total; complete it, do not cut it (cutting reintroduces r1's spam/drop/watermark risks) and do not patch each AC in isolation (hides the shared invariant). Diagnostic check: every joined-pair outcome path must be explicitly terminal or explicitly deferred/cursor-blocking. The outcome set is finite and closed {no-match, contradicts=false, malformed verdict, quote rejection, delivered, post-failure, intent-written/no-outcome crash, overflow}, so a total enumeration converges rather than looping.

Strategist validate-and-apply (not rubber-stamp): adopted `propagation_completion`. **Partial override of `patch_shape`:** applied the completion inline in existing AC prose (total terminal-state enumeration + the missing transitions) rather than adding the investigator-suggested standalone formal state-table artifact — a heavyweight named-enum state machine is more scaffolding than a 2-3d v0 spec needs and would risk the exact observability-accretion this gate guards against. Rejected the investigator's stated risk ("v0's real tolerance is lossy best-effort alerting") on founder-context grounds: this item is the YC demo hero scene, where double-delivery (on-camera spam) and silent drop (losing the demo contradiction) are both unacceptable — reliable single-alert is the v0 contract, so the r1 mechanism stays.

## Convergence call

`needs R3` — propagation-completion patch applied across AC1 (total terminal set incl. `judged-no-contradiction`), AC4 (bounded terminal quote-rejection), AC5 (intent-no-outcome → delivery-failed recovery transition), AC6 (overflow → `delivery-deferred` non-terminal drain). r3 is a verification round.

focus_hints: verify the terminal-state enumeration is now TOTAL (every joined-pair outcome is explicitly terminal or deferred/cursor-blocking) and that (a) `judged-no-contradiction` lets the watermark advance with no delivery; (b) AC4 persistently-fabricated quote reaches terminal after bounded retries without looping or stalling; (c) AC5 intent-written/no-outcome crash promotes to delivery-failed with zero additional Slack posts; (d) AC6 overflow defers + drains across ticks without re-posting delivered cards and without advancing the watermark past undelivered deferred pairs. Confirm out-of-scope wall still holds (no persisted verdict atoms, Granola-only supply, no decision-store schema change).

