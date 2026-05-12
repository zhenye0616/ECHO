---
item_id: 2026-05-11-039-cross-tool-review-dispatch-queue
round: 3
reviewer: cursor
artifact_sha: e45a97bc6bea2fd0abde68113fe140a9e82943b9
completed_at: 2026-05-12T08:22:00Z
verdict: proceed_after_patches
findings:
  - severity: low
    where: §Architecture `combined.md` file-shape example, l.156-158
    finding: |
      The frontmatter comment on `escalated_to_founder` lists only “{proceed*, pushback} boundary” and
      `single_reviewer_timeout`. AC3.5 step 324 and AC4 already treat `no_responses` as
      `escalated_to_founder: true`. Align the canonical template comment so implementers and schema
      docs do not miss the third escalation trigger.

  - severity: low
    where: §AC6b, l.421-423
    finding: |
      The AC6b narrative still reads “Strategist `/loop` invokes `combine.py`, dispositions findings,
      patches spec…” — which describes combine-only flow, not the full AC3.5 tick (pull → combine.py →
      per-round disposition + patch + optional `request.py` + push-with-retry). Patch the AC6b bullet
      to cite `/review-queue-watch` / AC3.5 so post-merge dogfooding instructions match the shipped
      protocol.

  - severity: low
    where: §AC3.5, step 3 “For each fresh `combined.md`” vs step 4 “One round per tick”
    finding: |
      Step 3 allows multiple fresh `combined.md` files in one tick; step 4 says one round per tick.
      If `combine.py` is ever extended to draft-combine more than one round per invocation, the two
      clauses conflict. Either: (a) spec that `combine.py` processes at most one newly eligible round
      per run when driven from `/review-queue-watch`, or (b) explicitly allow multiple rounds per tick
      and drop “one round per tick” wording. Today’s likely implementation is (a); one sentence
      closes the ambiguity for the builder.

  - severity: low
    where: §Goal + §AC6b success criteria (dispatch vs session bootstrap)
    finding: |
      R3 focus asked whether residual “implicit dispatches” (e.g. founder “ack” between rounds) remain.
      AC3.5 closes the RC2 “manually disposition” gap: autonomous disposition inside the tick when not
      escalated is coherent with “0 dispatch messages” for the cycle. **Session bootstrap is still
      implicit:** AC6b assumes the founder pre-starts three polling primitives (AC0) — not counted
      in the success criteria table. Worth one explicit sentence in AC6b: *“One-time loop/session
      setup per reviewer + strategist is out of scope for the dispatch-message count; the counted
      interval starts at `r1/request.md` land.”* Prevents a reviewer later arguing that pasting the
      Cursor self-loop prompt is a “dispatch message.”

  - severity: low
    where: §Architecture push-race, l.229 (journal carve-out)
    finding: |
      Optional daily one-line journal pointer (“see queue-errors.log…”) remains observation-only and
      outside the handshake; consistent with the invariant. Flag only so RC4 does not delete it
      thinking it violates journal-as-queue — it does not, but it is easy to misread as a second log
      surface; a parenthetical “not a queue artifact” next to that sentence would preempt confusion.

---

# Reviewer notes

## Focus angles (R3 polish)

**(1) AC3.5 vs AC6b “0 dispatch messages”** — R2 H1 is closed at spec level: AC3.5 binds disposition + patch + next-request (or convergence) to the strategist agent inside the `/loop` tick; founder-only-in-the-loop when `escalated_to_founder: true`, matching §Goal (a) and AC6b’s “≤ 2 judgment messages.” No HIGH/MED residual on coherence; one LOW on clarifying session bootstrap vs counted cycle (above).

**(2) §AC0 keyboard-automation drift** — Stuck. Step 4 explicitly rejects keyboard automation and detached Cursor auto-paste with ❌ and cites §Out of Scope #1. R2 H2 fully landed.

**(3) `queue-errors.log` vs JOURNAL-AS-QUEUE PROHIBITION** — Carve-out is unambiguous: push-race fallback and related failure lines go to `raw/internal/queue-errors.log`; journal remains observation; AC3 step 6 still “AFTER response committed.” The Implementation Notes block (purpose, format, read protocol, conflict-free append) preserves the invariant. No MED/HIGH.

**(4) AC3.5 new coupling / race surface** — New surface is expected: second commit on `combined.md` after draft (disposition fill) + patch + `request.py` commits each need `push-with-retry.sh`; same pattern as reviewers. **Coupling note (not a finding, observation):** one tick does a lot (LLM judgment + multi-file edits + git); that is an execution-risk for the builder/harness, not a spec contradiction — AC3.5 is clear enough to implement and dogfood.

## Normalized `where` / live integration

R2 dispositioned Codex M3 into `primary_where_section` + `related_where_sections`; this R3 review’s findings use only `§…` section tokens in `where`, so they exercise the parser without cross-ref overrides. Good fit for schema tests.

## Drift watch (RC3)

No reintroduction of keyboard automation. Surface area grew only as necessary: AC3.5, `push-with-retry.sh`, `queue-errors.log`, combine `where` normalization, AC6a failure injection — all trace to R2 dispositions. No out-of-scope feature creep detected.

## Convergence call

**Verdict `proceed_after_patches`:** five LOW documentation/clarity patches; no structural rework. If strategist accepts these as R4-only nits, both reviewers could still sign `proceed` next round; listing as `proceed_after_patches` matches dispatch instructions (“only LOWs → proceed_after_patches”).

**Claim-readiness:** After R4 applies the LOWs (or explicitly defers AC6b wording to builder README), spec is ready for a builder claim from a process perspective; builder still must implement AC0–AC6a.
