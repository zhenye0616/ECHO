---
item_id: 2026-05-11-039-cross-tool-review-dispatch-queue
round: 2
combined_at: 2026-05-12T08:30:00Z
codex_response: codex.md
cursor_response: cursor.md
patch_commit_sha: <pending — RC3 patch lands in the same commit as this combined.md>
next_round: 3
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings table (14 total: 2 HIGH / 7 MED / 5 LOW)

Match key applied: section-granularity `where` per AC4 R1-M5 fix. **Live integration test of R1 M5 fix observation:** Cursor R2 H1 cites three sections (`§Implementation Notes "Strategist watcher" + §AC3 + §AC4`); Codex's R2 findings concentrate on §AC0 + §AC4. The raw `where` strings under-collapse on naïve string equality (would miss the §AC4 overlap entirely if matched literally), and the §AC4 mention in Cursor H1 + Codex M2 + Codex M3 would over-collapse on token-overlap matching (three distinct concerns at the same section). Codex's M3 finding itself names the fix: normalized `primary_where_section` + optional `related_where_sections`, with `cross_ref` as explicit override. **R3+ uses the normalized shape; this R2 combined table is hand-built using the strategist's section-granularity reading + cross-ref hints.**

| # | Severity | Source | Where (match key) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | Cursor R2 H1 (load-bearing singleton) | `§Impl Notes "Strategist watcher" / §AC3 / §AC4` | accepted — added §AC3.5 mirroring AC3 for reviewers; combine.py "manually" rewritten as autonomous-disposition-within-/loop-tick | (this commit) — NEW §AC3.5 |
| 2 | HIGH | Cursor R2 H2 (drift catch — singleton) | `§AC0 step 4` | accepted — DELETED keyboard-automation + detached-Cursor-process options; only paste-once-self-loop + manual-paste degradation remain | (this commit) — §AC0 step 3-4 |
| 3 | MED | Codex R2 M1 | `§AC0 step 2 / docs/review-queue-setup.md` | accepted — concrete `codex exec -C ... --sandbox workspace-write --ask-for-approval never -` recipe via cron/launchd | (this commit) — §AC0 step 2 |
| 4 | MED | Cursor R2 M2 | `§Architecture push-race / §AC3 step 5 / §AC4 step 3` | accepted — shared `tools/review-queue/push-with-retry.sh` helper applied to reviewer responses, strategist combined.md, and strategist patch+next-request | (this commit) — §Architecture push-race + 3 AC sections |
| 5 | MED | Cursor R2 M3 | `§Architecture push-race FALLBACK / §Impl Notes JOURNAL-AS-QUEUE PROHIBITION` | accepted — option (b): queue error logs go to `raw/internal/queue-errors.log` (NOT the journal); invariant preserved absolutely | (this commit) — §Architecture push-race, §Impl Notes carve-out |
| 6 | MED | Codex R2 M2 | `§AC4 combine.py polling semantics` | accepted — explicit "exit 0, no commit, status line for scheduler" step added | (this commit) — §AC4 step 4 |
| 7 | MED | Codex R2 M3 | `§AC4 combine logic — convergent match key` | accepted — normalized `primary_where_section` + `related_where_sections` shape; `cross_ref` is canonical override | (this commit) — §AC4 combine logic |
| 8 | MED | Cursor R2 M4 | `§AC6a (synthetic e2e test)` | accepted (option a) — added orphan-tmp-cleanup × combine.py interaction test inline | (this commit) — §AC6a steps 4-5 + step 9 |
| 9 | MED | Cursor R2 M6 | `§AC1 verdict-enum context-awareness` | accepted (option a) — three separate JSON Schemas at `tools/review-queue/schemas/{request,reviewer,combined}.schema.json` | (this commit) — §AC1 |
| 10 | LOW | Codex R2 L4 (cross-ref R1 H3) | `§AC2 / §AC5 race-loser` | accepted — explicit same-SHA idempotency check after `FileExistsError`; assertion in AC5 test | (this commit) — §AC2 race-loser path + §AC5 test |
| 11 | LOW | Cursor R2 L1 | `§request.md frontmatter prior_round_atoms` | accepted (option c) — DROPPED the field entirely; `# What to review` body section + §Review History are canonical embed pattern | (this commit) — §request.md frontmatter + §Impl Notes |
| 12 | LOW | Cursor R2 L2 | `§AC4 verdict roll-up table` | accepted — commutative note added | (this commit) — §AC4 verdict roll-up |
| 13 | LOW | Cursor R2 L3 | `§AC4 verdict roll-up — both-missing case` | accepted — `(missing) | (missing) → no_responses` row + escalated_to_founder: true | (this commit) — §AC4 verdict roll-up, §AC1 combined.md enum |
| 14 | LOW | Cursor R2 L4 | `§request.md requested_reviewers vs reviewer enum extensibility` | accepted — schema rule + request.py test | (this commit) — §AC1, §AC2 tests |

## Convergence call

**Needs R3 — focus_hints below.** Both verdicts within `{proceed*}` boundary; no founder escalation. The RC3 patch closed all 14 R2 findings inline (no deferred-to-followup items). Expected R3 yield per 038 decay curve (10→14→5): 3-6 findings, mostly disambiguation polish; if both R3 verdicts are `proceed` or `proceed_after_patches` with only LOW findings, **declare convergence and the spec is claim-ready**.

**R3 focus_hints:**

1. **Verify §AC3.5 watcher slash-command body is implementable end-to-end** (strategist `/loop` tick: pull → combine.py → disposition → patch → next-request → exit). Especially: the "strategist agent autonomously dispositions findings" step — does it work as a `/loop` body in CC's harness without a founder turn?
2. **Verify the §AC4 normalized `primary_where_section` + `related_where_sections` match key** against R2's own findings (live integration test continues — R2 produced multi-section `where` values; R3 dispositions should land cleanly under the normalized shape).
3. **Verify `raw/internal/queue-errors.log` is a real, non-journal file** with no existing collision (and that the §Implementation Notes carve-out is unambiguous).
4. **Drift watch:** did RC3 reintroduce any of the surface area R1+R2 cut? Cursor R2's drift watch found one item — keyboard automation — fixed in RC3; R3 should run the same check.

## Convergent vs divergent breakdown (for the queue's own observation)

**Convergent on `where` (section overlap, applying the new normalized shape):**
- §AC0: Codex R2 M1 + Cursor R2 H2 — both flagged the polling-primitive layer, different concerns (concrete Codex command vs drift removal); convergent on section, divergent on prescription.
- §AC4: Cursor R2 H1 (combine.py "manually") + Codex R2 M2 (no-rounds path) + Codex R2 M3 (where match key) — three distinct concerns all in §AC4. The normalized match key (R2 M3 fix) would correctly distinguish them via cross_ref or via differentiated `primary_where_section` sub-anchors.
- §Architecture push-race + §AC3 + §AC4: Cursor R2 M2 (push-race asymmetry) + Cursor R2 M3 (journal-as-queue tension) — overlap on push-race; M3's primary anchor is §Impl Notes invariant.

**Divergent (one reviewer only):**
- Cursor caught 9 of 14 findings (H1, H2, M2, M3, M4, M6, L1, L2, L3, L4 — note: L1+L2+L3+L4 are Cursor's M-class shifted to L by R2 strategist re-categorization in §Review History).
- Codex caught 5 of 14 findings (M1, M2, M3, L4 + the cross-ref to R1 H3).

**Convergent-on-direction at R2: 100%** — both reviewers agreed the queue is the right primitive and that RC2 patches closed the R1 atomicity gap cleanly. The remaining work is buildability gaps (Codex's lens) + scope/role-split sharpening (Cursor's lens).

## Live observations for the queue's design

**Bootstrap-write success:** Both R2 reviewers wrote their response files at the canonical queue path (`backlog/reviews/.../r2/{codex,cursor}.md`) without the queue's helper scripts existing yet. The file shape was ergonomic enough that reviewers used it spontaneously — strong signal for the queue's V1 design.

**Conservative push behavior:** Both reviewers committed locally but did not push to `origin/main` (Cursor explicit: "no-push-without-explicit-ask"; Codex implicit). Per §"Out of Scope" #4 (R1 patch — Codex L6), reviewer queue commits ARE operational and don't need founder approval. The conservative call is correct safety-first behavior pre-queue-shipping; once 039 ships and AC3 step 5 wires `push-with-retry.sh` into the reviewer prompts, pushes will be automatic.

**Zero-ECHO-call held for both reviewers at R2** (per Cursor's own report and Codex's metadata). The §Review History block carried the R1 context inline; reviewers read it directly without ECHO recovery. This is the property that makes the queue's reviewer-prompt-size discipline (10-min loop tick, single artifact in context) viable.
