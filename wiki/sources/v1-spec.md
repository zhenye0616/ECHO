---
topic: V1 Scope
subtopic: Bundle Decision
aliases:
  - V1 Spec
  - V1 Scope
---

# V1 Spec (Locked)

**Status:** Locked 2026-04-30. Treat as source of truth; everything else gets deferred.

## Mission / Brand Promise

> *Your AI works better wherever you are — and you should never have to look at the thing that makes it work.*

Operationally: ECHO is the cross-platform context layer that lives invisibly across the user's tools and makes every AI surface they use smarter through unified memory.

## Target Cohort

**Indie AI builders / dev founders.** See [[target-cohort-indie-ai-builders]].

Wallet: $25/mo. Distribution: warm (HN, Cursor Discord, AI Engineer Discord, Latent Space, indie AI Twitter).

## Form Factor (No Destination App, Ever)

Three thin presences. See [[ambient-form-factor]] and [[felt-not-seen]].

- **Browser extension** — already built. Web AI surfaces + web SaaS context capture.
- **MCP server** (local daemon) — desktop AI clients without UI per app.
- **System-wide hotkey overlay** — Wispr Flow-style summon. See [[hotkey-overlay]].

Plus minimal **audit page** for trust. See [[audit-page]].

Architectural commitment: [[compose-not-capture]].

## V1 Bundle — 5 Tools

| # | Tool | Integration | Role | Effort |
|---|---|---|---|---|
| 1 | Cursor | MCP server | Production tool — code editor | ~3 days |
| 2 | Claude Code | MCP server | Production AI — terminal coding | ~2 days (overlap with Cursor) |
| 3 | GitHub | REST + GraphQL API | Code, PRs, issues | ~5 days |
| 4 | Slack | API + Events | Team comms — per-issue context | ~5 days |
| 5 | Web AI extension | Already built | Claude.ai + ChatGPT + Gemini chat history | 0 (upgrade only) |

See [[bundle-decision]] for why these and why not Zoom / email.

## Killer Demo

> *I'm fixing GitHub issue #234. ⌘⇧E. ECHO surfaces: the issue text, the related code from my last 3 commits, the Slack thread where the bug was reported, my prior Claude.ai conversation where I worked through the architecture. Cursor sees all of this through MCP. I never opened another tab.*

V1 ships when this demo works on a real GitHub issue in the founder's daily workflow without hand-staging. Not before.

## Sequencing (10 Weeks)

- **Weeks 1–3:** Substrate (local daemon + storage + MCP server skeleton + hotkey scaffold). No integrations yet. ✅ Shipped (items 001–009).
- **Weeks 4–5:** Cursor MCP + Claude Code MCP. End-to-end demo to founder. ✅ Shipped (items 010–015). Killer demo loop is operational.
- **Weeks 6–7:** GitHub integration via API.
- **Week 8:** Slack integration via API.
- **Week 9:** Browser extension upgrade — feeds into unified store.
- **Week 10:** Polish + hotkey overlay finalization + demo gallery + ship to 20 indie AI builders.

## Layers in V1

| Layer | In V1? | Notes |
|---|---|---|
| L1 — Passive ingestion | ✅ | Substrate + connectors |
| L2 — Ambient surfacing | ❌ | Defer to V2 — calibration is hard |
| L3 — Summoned response | ✅ | Both Q&A and assembly via [[clipboard-and-launch]]. Pull mode operational via [[mcp-search-memories]] over [[mcp-server]]. |
| L4 — Conversational dialogue | ❌ | Defer to V2 — would require destination UI |
| L5 — Reflective / audit | ✅ minimal | [[audit-page]] |

See [[interface-layers]] for full layer detail. See [[narrowest-v1-scope]] for the cut reasoning.

## Non-Goals (Tape Above Desk, Ignore Yourself When Tempted)

- ❌ Email (Gmail) — V1.5
- ❌ Linear / Jira — V1.5
- ❌ Notion — V1.5 (also unlocks transcript ingestion via Notion AI)
- ❌ Meeting transcripts (Granola/Otter) — V2
- ❌ Zoom direct — never (always via transcript tools)
- ❌ Calendar — V2
- ❌ Designer / writer / other-cohort bundles — V3+
- ❌ Mobile app — much later
- ❌ Team / enterprise tier — much later
- ❌ Connector marketplace — much later
- ❌ Skills / agent builder — much later
- ❌ Any standalone chat UI — never (form factor commitment)
- ❌ Autonomous agent action — V2+ once trust earned

## Pricing

**$25/mo, single tier.** Sits in the prosumer-dev band. Free tier = 100 cross-platform composition queries/month (enough to feel magic, not enough to live on).

## Quality Bar

- Reliability before features. Storage doesn't lose data. Hotkey responds <100ms. Sync <2s.
- Public weekly changelog from week 1 — visible velocity counters dev abandonment dynamic.
- Honest scope marketing. Never claim more than is real.
- Founder dogfoods every day; if founder workflow doesn't pull magical results, V1 doesn't ship.

## Distribution / Launch (Week 10)

- **Soft launch:** 20 hand-picked indie AI builders (paid extension users + waitlist signups + warm intros) one week before public
- **Public launch:** Show HN Tuesday morning PT + AI Engineer Discord + Cursor Discord + Latent Space
- **Demo asset:** demo gallery (5 hand-curated before/after cases identifiable in 3 seconds)
- **Pricing:** paid from day one; no "free for early users"

## Naming

Working name: **ECHO**. Hard rename deadline: before public Show HN. Two outcomes acceptable — clearly better name emerges → switch; no clearly better name → ECHO permanent, commit fully.

## Definition of Done

V1 ships when ALL true:

1. Killer demo works in founder's actual daily workflow with no hand-staging
2. ≥3 of 5 randomly-selected indie AI builders, after demo, ask "when can I pay?"
3. Hotkey response <100ms; storage no data loss across restart
4. Public weekly changelog has been running ≥4 weeks (visible velocity in place before launch)
5. Demo gallery has 5 hand-curated cases ready to ship as launch asset

If any not true at week 10, push launch one week and fix. Do not ship below the bar.

### Status (as of waves 1–3 ship)

Honest interim read against the five conditions:

1. **Killer demo works in founder's daily workflow with no hand-staging** — Mechanically operational. Manual verification through real Cursor + Claude Code sessions confirmed during item 015 review. Daily-workflow soak ongoing.
2. **≥3 of 5 indie AI builders ask "when can I pay?"** — Not yet. Needs Wave 4+ (the bundle is incomplete; GitHub + Slack haven't shipped, so the demo doesn't yet show the cross-tool magic).
3. **Hotkey <100ms; storage no data loss** — Storage durability ✅ via SQLite WAL. Hotkey ❌ — Week 10 work.
4. **Public weekly changelog ≥4 weeks** — ❌. First substantive entry pending.
5. **Demo gallery (5 hand-curated cases)** — ❌. Week 10 work.

## Risks Watched (Not Blocking)

- MCP ecosystem dependency → mitigation: per-app accessibility integration as Tier 3 fallback
- Slack ToS for personal accounts → mitigation: bias passive ingestion over active crawling
- Vendor API changes → mitigation: adapter pattern for one-day swap fixes
- Founder perfectionism → mitigation: tape this spec above desk, ignore self when tempted to widen
