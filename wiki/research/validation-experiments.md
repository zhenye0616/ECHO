---
status: shipped
topic: Validation
subtopic: Wedge Validation
aliases:
  - Validation Experiments
---

# Validation Experiments

## Premise

Validation work has a natural ceiling (~20 hrs/week before it stops generating new signal); build work doesn't. So validation runs **in parallel** with substrate build, not sequentially before it.

Three concurrent experiments validate the V1 wedge:

## Experiment 1 — User Interviews (5/week × 4 weeks)

**Goal:** validate that indie AI builders feel the cross-platform context pain *specifically for the V1 bundle*.

**Method:**
- Reach out via warm channels (AI Engineer Discord, Cursor Discord, MCP forums, Latent Space community, indie AI Twitter)
- 5 interviews per week, ~30–45 min each
- Open questions, past-behavior focused (per [[/Users/zhenye/Desktop/yc/yc-wiki/sources/talking-to-users.md|the YC talking-to-users discipline]])
- *Walk me through your last week of work* (not "would you use a tool that...")
- Capture in `raw/internal/interviews/<date>-<name>.md`

**Signal to extract:**
- Does the cross-platform context pain show up unprompted?
- Which specific cross-source compositions matter most? (informs the silent middle's retrieval logic)
- What tools are conspicuously absent that V1 should add to V1.5?

**Quantity:** 20 total interviews by week 4. Synthesize into `analyses/` after 10 and 20.

## Experiment 2 — Landing Page + Paid Waitlist

**Goal:** measure pre-build willingness to pay at the V1 price point.

**Method:**
- Landing page describes V1 vision, bundle, demo, pricing ($25/mo)
- Brand promise prominent
- Demo gallery embedded (5 hand-curated cases)
- $5 alpha waitlist deposit (refundable when V1 ships) — strongest pre-build signal
- Free waitlist as fallback for hesitant signups

**Signal to extract:**
- Conversion rate visit → free waitlist (interest signal)
- Conversion rate visit → paid waitlist (commitment signal)
- ≥5% paid conversion = strong wedge signal
- ≥10% paid conversion = exceptional

**Quantity:** ship landing page in week 1; let it run.

## Experiment 3 — Concierge Version (3–5 hand-picked devs × 1 week each)

**Goal:** reveal true willingness to pay before product exists.

**Method:**
- Pick 5 indie AI builders the founder has warm access to
- For one week each, *manually* assemble unified context for them
- Founder copy-pastes between tools, sends synthesized briefings, pre-loads AI sessions
- Charge $50 for the week
- See if they ask for more

**Signal to extract:**
- Do they actually pay the $50? (revealed willingness)
- Do they ask for the second week? (retention signal at human scale)
- What specific compositions do they find most useful? (sharpens V1 design)
- Do they refer other devs? (organic-growth seed)

**Quantity:** 3–5 by week 4.

## Concurrent Schedule

| Week | User Interviews | Landing Page | Concierge | Substrate Build |
|---|---|---|---|---|
| 1 | 3 first contacts | Ship landing page | Reach out to candidates | Storage architecture |
| 2 | 5 interviews | Iterate copy based on data | Begin 1 concierge user | Ingestion framework |
| 3 | 5 interviews | A/B test demo gallery | 2nd concierge user | Composition engine |
| 4 | 5 interviews; **synthesize** | Read conversion data | 3rd concierge user | Begin Cursor MCP |
| **Gate** | **Wedge decision** based on all 4 streams |

## Gate Decision (Week 4)

Three possible outcomes:

- **Strong validation** (interviews show acute pain + landing page converts ≥5% paid + concierge users want more) → proceed with V1 integration work as locked
- **Mixed validation** → talk to 10 more users; refine bundle (maybe substitute one tool); substrate continues unchanged
- **Weak validation** → stop integration; spend 2–4 more weeks on wedge refinement; substrate is reusable for whatever wedge emerges

## What Validation Cannot Do

These four experiments validate the *wedge* but cannot validate:

- That MCP adoption keeps growing (technology bet, not validatable by user research)
- That foundation models won't ship competing memory features (competitor bet)
- That the bigger thesis (compound on context, not capability) holds long-term (multi-year secular bet)

These are bets, not validatable hypotheses. Acceptable risks per Altman's "build now, defend later" frame.

## Related

- [[wedge-vs-thesis-validation]]
- [[extension-funnel-logic]]
- [[browser-extension]]
- [[v1-spec]]
- [[target-cohort-indie-ai-builders]]
