---
status: shipped
topic: Cohorts
subtopic: Indie AI Builders
aliases:
  - Three Cohort Comparison
---

# Three-Cohort Comparison

## The Three Candidates

After narrowing through several rounds, three cohorts pass all V1 filters (5–7 convergent tools, easy ingestion, founder-market-fit, $20–50/mo wallet):

1. **Indie AI builders / dev founders** (chosen)
2. **Indie hackers / solo SaaS builders** (close second)
3. **Vibe coders / non-traditional builders** (contrarian, growing)

## Side-by-Side

| Dimension | Indie AI Builders | Indie Hackers | Vibe Coders |
|---|---|---|---|
| **Founder-market-fit** | Strongest (team is one of them) | Strong (overlap) | Moderate |
| **Tool stack** | Cursor + Claude Code + GitHub + Linear + Slack + Notion + ChatGPT/Claude | Cursor/VS Code + GitHub + Stripe + Linear + ChatGPT + Notion + Twitter | Lovable/Bolt/v0 + GitHub + ChatGPT/Claude + Notion + Stripe + Twitter |
| **Wallet** | $30–60/mo sustained | $30–60/mo (own P&L) | $20–40/mo |
| **Distribution** | HN, Cursor Discord, AI Engineer Discord, MCP forums, Latent Space, indie AI Twitter | Indie Hackers, IH Twitter, micro-SaaS communities | Bolt/Lovable communities, Twitter |
| **Demo richness** | Highest (code + tickets + chats + docs) | High (product + customers + revenue) | Medium-high |
| **Community concentration** | High | High | Growing |
| **Magic moment** | "Solve Linear issue X with code + Slack + prior Claude conversation" | "Switching from product to customers to revenue with full context" | "AI knows my whole product I'm building visually" |
| **Incumbent threat** | Low (devs hate vendor lock-in) | Low | Low (incumbents not paying attention yet) |
| **Tar-pit signals** | Few | Few | Few (but smaller market today) |

## Why Indie AI Builders Win V1

Three deciding factors:

### 1. Strongest founder-market-fit

The founding team ships AI tools daily. Their taste *is* the cohort's taste. This is the cohort where the per-Casetext / per-Heller wiki frame applies most strongly: *"vertical AI wins by knowing the workflow deeper than horizontal AI ever can."* Substitute "vertical workflow" for "AI-builder workflow" and the same logic holds.

### 2. Richest demo per integration

The killer demo (*"Solve issue #234 with code + chat + Slack + prior AI"*) is technically the densest cross-source composition possible. No other cohort produces a demo that lands harder in 5 seconds.

### 3. Compounding evangelism

AI-tool builders tweet about tooling constantly. One Show HN post from this audience is worth a hundred from agency-PMs. Cursor's 100K → 2M growth came almost entirely from devs evangelizing for free. Same channel, same dynamic available for ECHO.

## Why Indie Hackers Is Close

Mostly the same cohort with different focus. Many indie AI builders ARE indie hackers (running solo or two-person companies). The difference:

- Indie AI builders: AI tooling is the *building material*
- Indie hackers: AI tooling is one of many tools used to ship products

V1 bundle (code-heavy) skews the wedge toward indie AI builders specifically. V2 could expand outward to indie hackers without changing architecture (just add Stripe + Twitter slots).

## Why Vibe Coders Is the Contrarian Bet

Smaller community today. Faster-growing. Riskier (platforms like Lovable/Bolt are themselves fast-changing). Higher upside (could be the canonical context layer for the next wave of non-traditional builders before incumbents notice).

Reasonable case for vibe coders as V2, not V1. The wedge has too much execution risk for V1's primary bet.

## Cohorts Explicitly Rejected

For completeness, cohorts that *don't* satisfy V1 filters:

- **Sales reps / AEs** — Salesforce gated, LinkedIn hostile; wallet pattern $100+/seat employer-paid, wrong band
- **Customer success / recruiters** — same gating + wrong wallet pattern
- **VCs / analysts** — Pitchbook/Bloomberg gated; firm-paid pricing
- **Lawyers** — Casetext/Harvey ate this; massive incumbent threat
- **College students** — cheating optics, ChatGPT Edu incumbent, thin wallet, annual churn cliff (see prior conversation)
- **Healthcare** — HIPAA + Epic/Cerner moats + slow procurement
- **Customer support** — Decagon/Sierra/Forethought ate this with hundreds of millions in funding

## Future Cohort Roadmap (V2+)

After V1 ships and validates:

| Wave | Cohort | Bundle |
|---|---|---|
| V1 | Indie AI builders | Cursor + Claude Code + GitHub + Slack + web AI |
| V1.5 | Same cohort, deeper | + Linear + Notion + meeting transcripts |
| V2 | Indie hackers / solo SaaS | + Stripe + Twitter (substitute for some V1 dev tools) |
| V2.5 | Vibe coders | Lovable/Bolt/v0 substituted for Cursor |
| V3 | Designers | Figma substituted for Cursor; Drive substituted for GitHub |
| V3.5 | Researchers | Zotero + arXiv substituted; Notion deepened |

Same architecture, swap fill-ins. Each wave is its own launch.

## Related

- [[target-cohort-indie-ai-builders]]
- [[bundle-decision]]
- [[v1-spec]]
- [[validation-experiments]]
