---
status: shipped
lifecycle: retired
superseded_by: raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md
topic: V1 Scope
subtopic: Non-Goals
aliases:
  - Drift Prevention
  - Scope Discipline
---

# Drift Prevention

> **Superseded for product scope on 2026-07-11.** The general discipline of avoiding unapproved scope remains useful, but the locked Machine-context V1, five-tool bundle, layer bans, and indie-builder cohort below are historical. Current scope authority is the Team-product commercial-focus decision and the G2 clarity gate.

## Definition

The active discipline of preventing the V1 build from silently diverging from the V1 spec. Drift is the default failure mode of solo-founder build work — every week adds small "while I'm in here" additions that compound into a different product than what was scoped.

## Why Drift Happens (Especially for This Founder)

The same trait that makes the founder good at building for the dev cohort — *test-to-the-limit, abandon-when-insufficient* — is the trait that produces drift:

- High personal quality bar → temptation to over-polish
- Sees gaps before users do → temptation to add features users haven't asked for
- Lives in the cohort → constant exposure to new ideas
- Building solo → no one to push back on scope expansion

Without active counter-discipline, week 10 ships a different product than week 0 specified.

## The Five Drift Patterns to Catch

These are the rationalizations to watch for. Each has a specific counter-move.

### Pattern 1: "It's just one more integration..."

Each integration is 5–7 days. Adding three is half of V1. The locked bundle is five tools; until V1 ships, the answer is no.

**Counter-move:** add the integration to V1.5 in `bundle-decision.md`. Do not start work on it.

### Pattern 2: "Users need a place to manage X..."

That's the audit page. Don't build a second admin surface.

**Counter-move:** add the management capability to the audit page if essential, or defer.

### Pattern 3: "What if we also supported [adjacent cohort]?"

Indie AI builders ship V1. Other cohorts (designers, writers, founders, researchers) are *parallel V2 bundles*, not V1 stretch goals.

**Counter-move:** add the cohort to the future-cohort table in `bundle-decision.md`.

### Pattern 4: "It would be nice to surface this proactively..."

That's Layer 2 (ambient surfacing). V2.

**Counter-move:** note the idea for V2 in `raw/internal/decisions/`. Do not build.

### Pattern 5: "Users could chat with ECHO about their week..."

That's Layer 4 (conversational dialogue). Also makes ECHO a destination, which is the central commitment to never break.

**Counter-move:** note the idea for V2. Do not build.

**Worked example — Recap (077) is the explicit-action complement to Continue hero, NOT a chat companion.** Item 077 (the Raycast `recap` command) sits structurally on the Pattern 5 trap line: it summarizes recent agent activity into a streamed narrative, which could easily slide into "let me ask a follow-up about what you just said." The spec defends against this in three load-bearing ways: (a) **single-shot only** — no follow-up turns, no in-session continuation; re-asking is a fresh `Raycast → Recap` invocation; (b) **ephemeral** — not persisted to LocalStorage, no SessionsList integration, no Cmd-R cross-command fork (all cut per r8 option-F resolution); (c) **explicit action only** — invoked from the Raycast root search, NEVER hijacked from the empty-Enter cluster-list semantics that the Continue hero owns. Recap and Continue hero are siblings at L3: Continue is the cold-start "where you left off" auto-surfaced row; Recap is the on-demand "brief me on what happened" command. Neither becomes a destination. See [[hotkey-overlay-raycast]] § Recap (077) for the full structural defense.

## The Decision Test (Five Questions)

Before any new build decision, answer all five. If any is "yes," it's drift:

1. Am I building a destination?
2. Am I capturing what another tool already captures?
3. Am I about to add a 6th integration before V1 ships?
4. Am I building for a cohort that isn't indie AI builders?
5. Am I building anything in Layer 2 or Layer 4?

The test takes 30 seconds. Apply it before any new feature commit.

## The Weekly Drift Audit

Every Friday afternoon, with the week's commits open, ask:

1. Did I add anything to the V1 bundle beyond the locked 5 tools?
2. Did I build any UI beyond the hotkey overlay + audit page?
3. Did I start any Layer 2 or Layer 4 work?
4. Did I rationalize any "while I'm in here, let me also..." additions?
5. Did I defer anything that's actually on the V1 critical path?

If yes to any: write a note in `raw/internal/decisions/` capturing what was done and why. Either *rewind the work* or *update the spec to reflect a real change*. The unforgivable failure mode is letting the spec and the build silently diverge.

## The Spec is the Source of Truth

When the founder's gut says X and the spec says Y, the spec wins by default. Overriding the spec requires:

1. Writing the rationale in `raw/internal/decisions/`
2. Updating the spec page to reflect the new decision
3. Re-checking the manifest and index for consistency

This friction is intentional. Decisions made on impulse late in the build are usually drift; decisions made through this process are usually corrections.

## When Drift Is Actually a Course Correction

Sometimes validation data legitimately invalidates a V1 commitment. Real signal that the wedge is wrong, the cohort doesn't bite, the form factor isn't landing. In those cases, drift isn't drift — it's learning. The discipline is the same: write the new decision in `raw/internal/decisions/`, update the spec, communicate the change explicitly.

The bad case is silent drift driven by founder preference. The good case is loud course-correction driven by user feedback. Distinguishing them requires the audit ritual.

## The Founder's Standing Order

> *"My standard is my strength when applied to the FIXED V1 scope; my standard is my enemy when it lets me keep adding scope. The discipline isn't to lower my standard — it's to fix the surface my standard applies to."*

## Related

- [[narrowest-v1-scope]]
- [[bundle-decision]]
- [[v1-spec]]
- [[interface-layers]]
- [[felt-not-seen]]
- [[compose-not-capture]]
