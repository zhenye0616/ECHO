---
item_id: 2026-05-11-039-cross-tool-review-dispatch-queue
round: 3
combined_at: 2026-05-12T08:10:00Z
codex_response: codex.md
cursor_response: cursor.md
patch_commit_sha: <pending — RC4 patch lands in same commit as this combined.md>
next_round: 4
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings table (8 total: 2 MED / 6 LOW)

Match key: section-granularity `where` per the RC3 normalized shape (`primary_where_section` + `related_where_sections`). **None of R3's findings exercise the multi-section path** — all 8 findings have a single `primary_where_section`, so R3 cannot fully validate the parser's multi-section behavior. The R2 fixture (Cursor R2 H1's 3-section `where`) remains the canonical guard test; Codex R3 M2 demands it be a non-collapse-assertion in AC4 test suite (accepted in RC4).

| # | Severity | Source | Where (primary_where_section) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MED | Codex R3 M1 (load-bearing) | `§AC3.5 step 3 — convergence branch / next_round` | accepted — split into (a) zero-patches → convergence, (b) patches applied → verification round DEFAULT, (c) explicit waiver (rare); accepted-without-follow-ups orthogonal to verification | (this commit) — §AC3.5 step 3 |
| 2 | MED | Codex R3 M2 (cross-ref R2 M3) | `§AC4 combine logic — primary_where_section / related_where_sections` | accepted — exact full-sub-anchor match; `related_where_sections` observational-only; `cross_ref` canonical override; R2 fixture test | (this commit) — §AC4 combine logic |
| 3 | LOW | Codex R3 L3 | `§Architecture push-race / §Impl Notes raw/internal/queue-errors.log` | accepted — renamed `.log` → `.md` throughout; builder seeds the file so it's tracked | (this commit) — global rename + Impl Notes update + seed commit |
| 4 | LOW | Cursor R3 L1 | `§combined.md frontmatter — escalated_to_founder triggers` | accepted — comment lists all 3 triggers ({proceed*, pushback} boundary, single_reviewer_timeout, no_responses) | (this commit) — §combined.md frontmatter |
| 5 | LOW | Cursor R3 L2 | `§AC6b — narrative cites combine-only flow not full AC3.5` | accepted — AC6b body rewritten to cite `/review-queue-watch` + AC3.5 step 3 (b)/(c) | (this commit) — §AC6b |
| 6 | LOW | Cursor R3 L3 | `§AC3.5 step 4 — one round per tick vs for each fresh combined.md` | accepted (option a) — explicit one-round-per-tick when driven from `/review-queue-watch`; `--all` noted as out-of-band batch | (this commit) — §AC3.5 step 4 |
| 7 | LOW | Cursor R3 L4 | `§AC6b — session bootstrap implicit in dispatch-message count` | accepted — explicit clause: session bootstrap out of scope; counted interval starts at r1/request.md land | (this commit) — §AC6b success criteria |
| 8 | LOW | Cursor R3 L5 | `§Architecture push-race — journal pointer parenthetical` | accepted — "not a queue artifact; observation-only pointer outside the handshake" parenthetical added | (this commit) — §Architecture push-race |

## Convergence call

**Needs R4 — verification round per AC3.5 step 3 case (b) (the new default branch).** Codex R3 M1 itself catches the bug this round produces: R3 transition from RC2 was correctly `next_round: 3` despite all R2 findings accepted inline, and R4 is correctly needed now despite all R3 findings accepted inline. The RC4 patch lands a structural change to AC3.5; R4 must verify it before claim-readiness.

**R4 focus_hints:**
1. **Verify AC3.5 step 3 (a)/(b)/(c) branch split mechanics.** The (b) "DEFAULT for any spec change" must be plain enough that builders don't collapse it back to "patches + no follow-ups → convergence" (the bug Codex R3 M1 caught).
2. **Verify AC4 exact-sub-anchor match + R2 fixture test implementability.** Walk through the fixture: Cursor R2 H1's `primary: §Implementation Notes "Strategist watcher"` + `related: [§AC3, §AC4]` MUST NOT converge with Codex R2 M2's `primary: §AC4 combine.py polling semantics` (no exact sub-anchor match; no `cross_ref` between them).
3. **Verify `raw/internal/queue-errors.md` seed commit** is reasonable; no collision with other repo machinery (manifest, wiki index, blocked.py).
4. **Drift watch (RC4):** any prior-round cut reintroduced? Particularly: any path in AC3.5 (b) where convergence-without-verification can happen unintentionally?

**Convergence prediction:** R4 should yield ≤ 3 findings, only LOW. **If both R4 verdicts are `proceed`, OR both `proceed_after_patches` with only LOWs → declare convergence; 039 is claim-ready.**

## Convergent vs divergent breakdown

**Convergent on `where` (exact sub-anchor):** None at R3. Codex's findings concentrate on AC3.5/AC4 mechanics; Cursor's on combined.md frontmatter/AC6b narrative/AC3.5 step 4/Architecture parenthetical. **No two R3 findings share `primary_where_section` at the new exact-sub-anchor specificity** — this is the cleanest divergent-prescription round in the cycle, and exercises the new match-key rule's UNDER-collapse property (no false-convergence). Compare R2 where Cursor H1 + Codex M2 + Codex M3 all overlapped on §AC4 broadly but were distinct concerns — R3's narrower findings are easier to keep distinct.

**Cross-ref overrides used:** Codex R3 M2 has `cross_ref: { round: 2, reviewer: codex, finding_index: 3 }` — Codex's R3 M2 is the R2 M3 follow-up, the only explicit cross-round cross-ref in the cycle so far. Strong demonstration of the cross_ref field's value when reviewers want to chain findings across rounds.

**Verdicts:** Codex `proceed_after_patches` + Cursor `proceed_after_patches` → combined `proceed_after_patches`. Within `{proceed*}` boundary; no founder escalation. Both reviewers explicitly noted convergence-imminent.

## Live observations for the queue's design

**Reviewer push behavior evolved at R3:** R2 reviewers committed locally but conservatively did not push (per Cursor's explicit "no-push-without-explicit-ask"). R3 reviewers pushed directly to `origin/main` — the canonical pattern from R2's commits is now empirically established as "queue commits are operational" (§"Out of Scope" #4). This is exactly the maturation curve a builder should follow: cautious until canonical patterns are observed, then automatic. Good design-validation signal.

**Recursive review-history-as-evolutionary-record property fired:** Codex R3 M1 was found by reading prior rounds' history (the §Review History block) and noticing that the RC3 watcher's logic would have skipped the very round catching the bug. This is the queue's "review history is the canonical context, no ECHO needed" property firing recursively — a finding from reading prior rounds proves prior rounds were necessary. Promote to §Implementation Notes as a positive design property in future iterations.

**Drift watch confirms no surface-area reintroduction:** Both reviewers ran drift checks against R1+R2's cuts (keyboard automation, prior_round_atoms, journal-as-normal-queue). All cuts held in RC3. The added surface area (AC3.5, push-with-retry.sh, queue-errors.md carve-out, where match key normalization) traces exclusively to R1+R2 dispositions — no out-of-scope feature creep.
