---
topic: Validation
subtopic: Extension Funnel
aliases:
  - Extension Funnel Logic
---

# Extension Funnel Logic

## The Wrong Word: "Funnel"

The extension is **not a strict funnel** for V1. The word "funnel" implies linear conversion: top → middle → bottom. That metaphor breaks here because:

- Most top-of-funnel extension users (general AI users) aren't supposed to convert. They're not the V1 target cohort.
- The conversion that matters is the *cohort overlap subset* — the devs who happen to be using the extension *and* feel the bigger pain.
- Treating the extension as a strict funnel would push toward optimizing it for V1 conversion, which would dilute its value to the audience that loves it for what it is.

## The Right Frame: Family + Filter + Secondary Distribution

Extension and V1 share an underlying thesis (cross-platform context matters) but operate at different depths and serve different cohorts:

| | Extension | V1 |
|---|---|---|
| Same thesis | Unified context is wanted | Same |
| Cohort | General AI users (broad) | Indie AI builders (narrow) |
| Scope | Chat-to-chat AI sessions only | Work-wide unification across tools |
| Wallet | Freemium | $25/mo |
| Role | Validates thesis, builds brand, captures wide audience | Captures value, targets the wedge |

## What the Extension Does for V1

Three things, none requiring a hard funnel:

### 1. Brand carrier

Every install is a touchpoint. Every Twitter mention, every Show HN comment, every "I use this and it's great" reinforces *"the team that makes intelligence portable across AI."* When V1 launches, you launch into a market that already knows the name.

### 2. Self-filter for V1 leads

Some extension users will *self-identify* as having the bigger pain. They'll write you ("hey, do you also support Cursor?" or "is there a paid version that does more?"). These are pre-qualified V1 alpha candidates — they came to you, you didn't have to find them.

This is the only "funnel" mechanism that matters, and it's *pull*, not *push*. Per Field's wiki line — *"don't grind for feedback; when people are pulling the product out of you, double down."*

### 3. Distribution + validation engine

Extension growth = SEO presence, social proof, founder credibility for V1's launch. Even without conversion, the existence and growth of the extension makes V1 launch more credible.

## Tactical Implications

- ❌ **Don't make the extension push V1.** No popups, no nags, no upsell modals. Devs hate this; it would damage the extension's standalone value.
- ✅ **Do make V1 discoverable from inside the extension.** A small persistent menu item: *"Works with AI sessions today. ECHO Pro will unify your code, tickets, and Slack too — coming soon."* with a link to a waitlist page. Inviting, not pushy.
- ✅ **Do let extension users self-select for V1 alpha.** Optional "be the first to try ECHO Pro" sign-up.
- ✅ **Do treat extension feedback as research.** When users tell you what they wish the extension did, some wishes overlap with V1 scope (validating ideas) and some don't (informing future extension features).

## Onboarding Question Design

After first successful action, skippable one-question prompt (not modal):

> *Quick question — what do you mostly use AI for?*
>
> Coding · Writing · Research · [Skip]

- One question, captures cohort tag without identity-framing friction
- "Coding" answer = strong V1 wedge candidate
- Behavior question, not identity question — captures vibe coders, technical PMs, AI builders, not just "professional developers"

After ~2nd or 3rd successful action, ambient banner appears: *"Building the deeper version. See what's coming →"*

## V1 Alpha Pool (the high-value funnel mechanism)

By V1 launch (target week 10), the pre-qualified alpha pool is the intersection of:

- Paid extension users (revealed willingness to pay)
- + Tagged "Coding" in onboarding (cohort match)
- + Signed up for V1 waitlist (interest signal)

Target size: 50–200 users. This is your launch list. Conversion rate from this list to V1 paid is your hardest wedge signal — much stronger than cold outreach metrics.

## The Strategic Position This Builds

Three ingredients most early-stage founders never get together:

1. A shipped product with paying users (extension)
2. A defensible thesis sentence that's hard to copy structurally ([[context-as-moat]])
3. A specific cohort to wedge into with strong founder-market-fit ([[target-cohort-indie-ai-builders]])

## Related

- [[browser-extension]]
- [[validation-experiments]]
- [[wedge-vs-thesis-validation]]
- [[v1-spec]]
