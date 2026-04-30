---
topic: V1 Scope
subtopic: Bundle Decision
aliases:
  - Bundle Decision
  - V1 Tools
---

# Bundle Decision

**Locked V1 bundle:** Cursor + Claude Code + GitHub + Slack + web AI extension. Five tools. All easy-to-medium integration. Demo-end-to-end for the indie AI builder cohort.

## Selection Criteria

The bundle must satisfy all four:

1. **5–7 tools max** (founder build constraint for 10-week ship)
2. **Heavily used by the target community** (convergent stack across the cohort, not "this one person uses these")
3. **Easy ingestion paths** (extension, MCP, or open API; no hostile-to-third-party platforms)
4. **Layer-above-SaaS compatible** (the user *loves* these tools and wants them enhanced, not replaced)

## Final Five (in build order)

| # | Tool | Integration | Role | Effort |
|---|---|---|---|---|
| 1 | Cursor | MCP server | Production tool — code editor | ~3 days |
| 2 | Claude Code | MCP server | Production AI — terminal coding | ~2 days (overlap) |
| 3 | GitHub | REST + GraphQL API | Code, PRs, issues | ~5 days |
| 4 | Slack | API + Events | Team comms — per-issue context | ~5 days |
| 5 | Web AI extension | Already built | Claude.ai + ChatGPT + Gemini chat history | 0 |

## What Was Considered and Cut from V1

### Zoom — cut

Three problems compound:
- Integration cost is 5–10x what it looks like (cloud recording requires Zoom Pro+, multiple OAuth scopes, file download flow; real-time bot needs Zoom SDK)
- Episodic value, not daily (most devs don't have meeting-anchored work every day)
- A smarter path exists: ingest meeting transcripts from existing tools (Granola, Otter, Notion AI) per [[compose-not-capture]]

**Defer:** meeting transcript ingestion in V1.5 via Notion AI + Granola, not Zoom directly.

### Email (Gmail) — cut

Integration is easy but the noise problem isn't:
- ~80% of email is newsletters, calendar invites, automated notifications
- Ingesting all dilutes the context store with low-signal text
- Privacy-loaded
- Filter classification is itself a week of work

**Defer:** V1.5 with classification filter (only emails from real humans, in user's reply chain, >50 words).

### Linear / Jira — cut

Real value but redundant for V1:
- GitHub issues partially covers project tracking for small teams
- Adding Linear in V1 means another adapter without proportional demo lift
- Linear users skew larger teams; indie AI builders often live in GitHub

**Defer:** V1.5 paired with GitHub for richer project context.

### Notion — cut

High value but defer:
- Notion API is clean; integration is easy
- But docs/notes are slower-changing context; per-task signal density is lower than code/tickets/chat
- Pairs naturally with meeting transcripts (V1.5)

**Defer:** V1.5 alongside transcript ingestion.

### Discord vs Slack — Slack chosen for V1

The cohort splits. Decision rationale:
- Most paid teams use Slack (revenue signal alignment)
- Indie AI builder community heavily on Discord (Cursor, AI Engineer, Latent Space)
- Slack API is cleaner than Discord's bot-required model

**Hedge:** ship Slack for V1; Discord adapter in V1.5. Validation interviews will inform the order.

## What's NOT in V1 (Non-Goals)

See [[v1-spec]] §Non-Goals for full list. Highlights:

- ❌ Email, Linear, Notion (V1.5)
- ❌ Calendar (V2)
- ❌ Meeting transcripts (V2 via existing tools)
- ❌ Mobile app, team tier, enterprise tier (much later)
- ❌ Standalone chat UI (never)

## The Selection Principle

For the V1 cohort (devs), integration value is **proportional to per-task signal density**, not to category universality. GitHub > Slack > Linear > Notion > Email > Calendar > Zoom. A dev's typical "task" lives most densely in code + PRs + chat + issues, not in calendar + email + meeting recordings.

This is why we cut [[tier-vs-vertical-slice|tier-by-tier sequencing]] — it would have us building Tier 1 categories (universal) instead of vertical-slice depth (cohort-specific).

## Future Cohort Bundles (V2+)

Same architecture, swap production-tool slot:

| Slot | Indie AI Builder (V1) | Designer (V2) | Solo Founder (V2.5) |
|---|---|---|---|
| Communication | Slack + Gmail | Slack + Gmail | Gmail + Slack |
| Production | Cursor + Claude Code | Figma | Notion (writing) |
| Notes / docs | Notion | Notion | Notion |
| AI assistants | Claude.ai + ChatGPT + Cursor MCP | Claude.ai + ChatGPT | Claude.ai + ChatGPT |
| Project / task mgmt | Linear + GitHub | Linear | Linear |
| Storage / artifacts | GitHub | Figma + Drive | Drive + Stripe |

Same architecture, same hotkey, same MCP, same audit page. Different fill-ins per cohort.

## Related

- [[v1-spec]]
- [[target-cohort-indie-ai-builders]]
- [[narrowest-v1-scope]]
- [[tier-vs-vertical-slice]]
- [[compose-not-capture]]
