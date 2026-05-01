# STATUS

Living progress tracker. **Update every Friday afternoon.** ~10 minutes.

---

## Current Week

**Week 0 of 10** · Phase: Pre-build (extension launching, validation experiments starting, substrate planning)

## Build Stream — Substrate (Layer 1 + Layer 3 scaffold)

- [ ] Storage architecture (append-only ledger schema)
- [ ] Indexing approach decided (semantic + structured)
- [ ] Retrieval engine v0
- [ ] Composition engine v0
- [ ] MCP server skeleton
- [ ] Hotkey overlay scaffold (native macOS)
- [ ] Audit page skeleton
- [ ] CI / packaging set up

## Validation Stream

- [ ] Landing page live
- [ ] Paid waitlist live ($5 deposit)
- [ ] Demo gallery v0 (5 hand-curated cases)
- [ ] User interviews booked (target: 5/week)
- [ ] Concierge candidates identified (target: 5)

## Extension Stream

- [ ] Chrome Web Store approval received
- [ ] Onboarding question shipped (skippable, post-first-action)
- [ ] V1 ambient banner shipped in extension UI
- [ ] V1 waitlist signup linked from extension
- [ ] First analytics review (week 1 retention, paid conversion, organic growth)

---

## What I Shipped This Week

*[fill in every Friday — 1 line per item]*

-

## What I Learned This Week

*[from validation: interview themes, landing page conversion, concierge feedback]*

-

## What's at Risk

*[anything blocking the week-10 launch — engineering issues, validation gaps, scope drift]*

-

## Next Week's Ship Target

*[the ONE thing that has to be true at next Friday's review]*

-

---

## Drift Audit (every Friday — be honest)

Ask yourself, with this week's commits open:

1. Did I add anything to the V1 bundle beyond the locked 5 tools?
2. Did I build any UI beyond the hotkey overlay + audit page?
3. Did I start any Layer 2 or Layer 4 work?
4. Did I rationalize any "while I'm in here, let me also..." additions?
5. Did I defer anything that's actually on the V1 critical path?

If yes to any: write a note in `raw/internal/decisions/` with date, what you did, why it felt necessary. Either rewind the work, or update the spec to reflect a real change. **Do not let the spec and the build silently diverge.**

---

## Validation Signal Tracker

Update with each batch of interviews / new landing page data / concierge week.

### User Interviews

| Date | Name | Cohort | Pain Acuity (1-5) | Asked About Cross-Platform | Quote |
|---|---|---|---|---|---|
| | | | | | |

### Landing Page

| Date | Visits | Free Waitlist | Paid Waitlist | Conversion % |
|---|---|---|---|---|
| | | | | |

### Concierge

| Week | User | Paid? | Asked for week 2? | Key Feedback |
|---|---|---|---|---|
| | | | | |

### Extension

| Date | Installs | DAU | Paid Conversion | Coding-Tagged % | Waitlist Signups |
|---|---|---|---|---|---|
| | | | | | |

---

## Week-by-Week Sequencing (per [V1 Spec](./wiki/product/v1-spec.md))

| Week | Build Target | Validation Target |
|---|---|---|
| 1 | Storage architecture + ingestion framework | Landing page live + 3 interviews + 1 concierge candidate |
| 2 | Composition engine v0 | 5 interviews + 1st concierge week starts |
| 3 | MCP server skeleton + hotkey scaffold; **substrate done** | 5 interviews + 2nd concierge user |
| **4** | **Wedge gate: synthesize validation, lock integration choices** | 5 interviews + 3rd concierge user |
| 4 | Cursor MCP + Claude Code MCP | (continue interviews) |
| 5 | Cursor MCP polish + first end-to-end demo (founder dogfood) | (continue interviews) |
| 6 | GitHub integration v0 | |
| 7 | GitHub integration polish | |
| 8 | Slack integration | |
| 9 | Browser extension upgrade for unified store | |
| 10 | Polish + hotkey finalization + demo gallery + soft launch to 20 users | Public launch (Show HN Tuesday morning PT) |

---

## Definition of Done (don't ship until ALL true)

1. Killer demo works in my actual daily workflow with no hand-staging
2. ≥3 of 5 randomly-selected indie AI builders, after demo, ask "when can I pay?"
3. Hotkey response <100ms; storage no data loss across restart
4. Public weekly changelog has been running ≥4 weeks
5. Demo gallery has 5 hand-curated cases ready

If any not true at week 10 — push the launch one week and fix. Do not ship below the bar.
