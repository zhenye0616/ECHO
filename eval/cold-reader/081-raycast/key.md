# Key — 081-raycast

**Decision:** 2026-05-29-081-raycast-command-disposition-and-removal · age @ run: ~2 days (freshest rung)
**Committed record:** `backlog/complete/2026-05-29-081-raycast-command-disposition-and-removal.md` · merge commit `3d5e3d9e` ("merge: 081-raycast-removal (all-REMOVE, founder-overridden)") · post-merge wiki reconcile `7c3cccf8`
**Query mode:** exact literal token "Raycast" (easy substring path)

## Pre-registered ground-truth (4 facts)

| # | Fact | Truth |
|---|---|---|
| 1 | Decision | Remove/retire the Raycast extension **entirely** (`tools/raycast-echo/` — all commands), overriding the earlier cautious per-command/parity-gated plan (all-REMOVE, founder-overridden) |
| 2 | Reasoning | Overlay (080) is now the operator surface; reusability check found the Raycast code Raycast-specific (coupled to `@raycast/api`), the Tauri overlay reused none of it — nothing worth porting |
| 3 | Dissent | r1: **codex + codex-ops both `pushback`**, 2 HIGH findings on review *mechanics* (not substance): (a) spec sat in claimable `backlog/ready/` while claiming parked; (b) inline-commented `blocked_by: []` broke `tools/blocked.py`. r2: proceeded clean |
| 4 | Disposition | Shipped — merged to `main` as `3d5e3d9e`; post-merge wiki reconciliation retired the Raycast surface; item moved to `backlog/complete/` |

## Confabulation traps
- Two-phase history (earlier parity-gated per-command plan → later founder override after reusability check). A weak reader may report only the initial plan as "the decision."
- **NOTE (Fact 4 lesson):** the strategist's first key cited `9bf44cea` (the feature-branch commit), but the real merge commit is `3d5e3d9e`. The cold reader was *more correct than the human key*. → always verify the SHA against git at scoring time.

## Results log
| Date | A (on) | B (off) | A−B | Failure mode | Notes |
|---|---|---|---|---|---|
| 2026-05-31 | 4/4 | 0/4 | 4 | none (beat the human key on Facts 2 & 4) | Codex gpt-5.5, ECHO-only audit clean (6 calls); nailed the r1 cross-vendor dissent; corrected the merge SHA |
