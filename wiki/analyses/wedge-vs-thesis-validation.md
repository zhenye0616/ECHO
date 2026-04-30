---
topic: Validation
subtopic: Wedge Validation
aliases:
  - Wedge vs Thesis Validation
---

# Wedge vs Thesis Validation

## The Question

If the extension is already validating the cross-platform context thesis, doesn't that validate V1?

## Short Answer

No. The extension validates the **thesis level**. V1 needs to separately validate the **wedge level**. They're different experiments at different layers.

## The Distinction

| | Validated by extension? |
|---|---|
| **Thesis-level**: "unified AI session context is wanted; users feel the pain of repeating themselves" | **Yes** — extension installs + use + paid conversion prove this |
| **Wedge-level**: "devs specifically will pay $25/mo for a unified context layer over Cursor + Claude Code + GitHub + Slack + web AIs" | **No** — extension users are general AI users, not specifically devs in V1 wedge |

## Why the Extension Can't Validate the Wedge

Three reasons:

1. **Different cohort.** Extension users are anyone using multiple AI platforms (broad). V1 cohort is indie AI builders (narrow). Overlap exists but is partial.
2. **Different scope.** Extension solves chat-to-chat context portability. V1 solves work-wide unification across code, tickets, chat, docs, AI. The deeper scope hasn't been tested.
3. **Different price point.** Extension paid tier is $X/mo. V1 is $25/mo. The 5x (or whatever the multiple is) step-up needs its own willingness-to-pay validation.

## Why the Distinction Matters Strategically

If we conflate "extension is growing" with "V1 will work," we ship V1 against a wedge we haven't actually tested. By the time real wedge data arrives (V1 sales), we've spent 10 weeks building the wrong specifics.

The fix isn't to delay V1 building. It's to run wedge-specific validation in parallel — see [[validation-experiments]].

## What Each Validation Layer Tells Us

**Extension (already running):**
- Demand for cross-platform AI session context portability ✓
- Willingness to pay for the thesis at the chat-only depth ✓ (freemium conversion)
- Product-market pull at the thesis level ✓ (organic growth, feature requests)

**V1 wedge experiments (to run):**
- Indie AI builders specifically feel acute work-wide pain
- They will pay $25/mo for the full bundle
- The killer demo (Solve GitHub issue #234 with cross-source context) lands in 5 seconds for this audience
- The 5-tool bundle is the right cut for them

## How They Compose for the Launch

By V1 launch (week 10), the strongest possible position is:

1. Extension has been live for ~12 months with a paid tier (continuous thesis validation)
2. V1 wedge has been validated through 20 user interviews + landing-page paid conversion + 3–5 concierge users (continuous wedge validation)
3. Substrate has been built in parallel (no wedge dependency)
4. V1 launches into a market that already knows the team, has paid for the thesis once, and includes a pre-warmed alpha pool of paid extension users tagged as devs

That's a vastly stronger launch position than "we have an idea." It's also a much more credible story for an investor or for the first 100 V1 users. The team is not pivoting to AI infrastructure from a cold start — they're deepening a product family they've already shipped, against a thesis users have already paid for.

## What Failed Validation Looks Like (and How to Respond)

If wedge validation comes back weak by week 4:

- Don't conclude "the thesis is wrong" (extension data already disproves that)
- Conclude "the wedge cut is wrong" — wrong cohort, wrong tools, wrong price, wrong demo
- Refine and re-validate before week 4–9 integration work
- Substrate (already built) is reusable for whatever wedge emerges

## Related

- [[validation-experiments]]
- [[extension-funnel-logic]]
- [[browser-extension]]
- [[target-cohort-indie-ai-builders]]
- [[v1-spec]]
