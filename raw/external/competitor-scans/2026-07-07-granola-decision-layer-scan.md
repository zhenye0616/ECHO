# Granola decision-layer scan (2026-07-07)

> Produced by a Claude research subagent (granola-decision-scout) on behalf of the strategist session;
> commissioned to answer: **does Granola have — or is it visibly building — its own decision layer?**
> Context: founder is considering building ECHO's pilot (meeting decisions → Confirm/Dismiss Slack cards →
> ratified ledger) on top of Granola's public API / team folders.

## Verdict — PARTIAL, and trending toward it fast

Granola does **not** have a decision *layer* in ECHO's sense: no persistent ratified decision ledger, no
human confirm/approve gate on AI output, no "decisions" as a first-class tracked object. What it does have:

1. **"Decisions Made" auto-extracted as a section inside each meeting summary** (template-driven text,
   alongside Action Items / Next Steps) — shipped.
2. **Granola Chat** answering "what did we decide about X and why?" across folder/workspace with inline
   citations — shipped, but **ephemeral** (no saved doc, no ledger, no confirm step).

Decision *extraction* = shipped and commoditized. Decision *ratification + durable ledger* = absent.

## Findings

### Shipped features
- Default/enhanced summaries auto-extract a "Decisions Made" section; framed in their marketing as
  "decisions with context — what was decided, who weighed in, what alternatives were considered."
- **Slack auto-posting** (Granola 2.0): per-folder rule auto-posts the summary — including the Decisions
  section — to a channel after note enhancement. **No review/confirm step; fires automatically.**
- No decision log, no cross-meeting decision tracking over time, no versioned/superseded decisions.

### Granola Chat
- Scopes: single meeting, multi-select, folder, workspace-wide. Explicitly good at extracting decisions +
  rationale across meetings. Answers are ephemeral Q&A, not a system of record.
- **Recipes**: saved prompts to automate extraction on a schedule — adjacent, still produces text.

### Ratification-shaped mechanisms — NONE FOUND
No confirm/approve/sign-off on AI output anywhere. Slack posting is auto, not reviewed. No decision-log
positioning. Cleanest gap vs ECHO; confirmed absent across changelog, Series C coverage, Slack docs.

### Roadmap signals (the concerning part)
- **Series C, March 2026: $125M at $1.5B (Index / Danny Rimer).** Repositioned from notetaker to
  "**enterprise AI context layer**" / "second brain for your team" — the central store of team meeting
  data other AI tools query via API + MCP.
- **"Passive documentation → active assistance"** on the record from founder interviews: schedule
  follow-ups, create tickets from calls, route feedback, draft emails; "deep research mode" over meeting
  history; "personal coach." Direction, not shipped.
- Founder: Chris Pedregal (ex-Gmail PM, sold Socratic to Google 2018).

### Category context
Fellow, Otter, Fireflies, Avoma, tl;dv all ship structured summaries separating action items / decisions /
follow-ups; Fellow does cross-meeting decision/accountability tracking + task sync to Jira/Linear/Asana.
"Extract a decisions section" is table stakes. **None ship a ratification gate + durable cross-tool
decision ledger.**

### API surface
Endpoints (docs.granola.ai/llms.txt): Get Note, List Notes (`?include=transcript`), List Folders, Chat,
Recipes, MCP. **No structured decisions or action-items endpoint** (text-only inside summaries). **No
webhooks** — poll List Notes. Only summarized notes returned (unprocessed → 404). Rate limits raised
April 2026 to 25 API keys per workspace/user.

## Three strongest directional signals
1. The "context layer" repositioning is now the whole company thesis — queryable source-of-truth for team
   meeting knowledge that Claude/ChatGPT/Cursor pull from. Same real estate as ECHO's meetings slice.
2. "Passive → active assistance" is on the record; decision → confirmed → routed is a natural increment.
3. The two raw ingredients of ECHO's pilot flow — extract decisions + push to Slack — **already exist in
   Granola today**; only the ratification gate and durable ledger are missing.

## Implications for ECHO's build-on-Granola bet (honest read)

**Where the API helps:** clean notes + transcripts + folders for meeting-sourced decisions. Shape mismatch:
API returns unstructured summary text, no webhooks → ECHO re-derives decisions from notes and polls. ECHO
owns extraction quality either way.

**Defensible for ECHO:**
- **Cross-tool decisions** (Cursor / Claude Code / GitHub / Slack threads — decisions never spoken in a
  meeting). Granola structurally can't see these.
- **Ratification posture** — Granola's product identity is frictionless/auto (auto-post the summary);
  a confirm-before-record gate is the opposite default.
- **Durable ledger over time** (supersession, preserved "why") is a different data model than
  notes-per-meeting + ephemeral chat.

**Not defensible / the risk:**
- The **meetings-only slice is directly in Granola's expansion path**. They have the data, the Slack pipe,
  $125M, distribution, and a roadmap pointed there.
- **Realistic window: ~2–4 quarters** before Granola could ship a first-class decision-log /
  lightweight-ratification feature for meetings if they prioritize it. The window exists only for the
  meetings slice.

**Recommendation implied by evidence:** treat Granola as an upstream capture source consumed via API, not
a layer to compete for. Lead demos with cross-tool decisions + the ratified ledger/confirm gate — the two
things absent from Granola and awkward for its identity to add. A decision layer built *only* on Granola's
meeting data sits squarely inside their expansion path with the shorter end of the funding.

## Primary sources
- https://www.granola.ai/blog/two-dot-zero
- https://docs.granola.ai/help-center/getting-more-from-your-notes/chatting-with-your-meetings
- https://docs.granola.ai/llms.txt
- https://docs.granola.ai/help-center/sharing/integrations/slack
- https://www.reworked.co/digital-workplace/granola-raises-125m-launches-enterprise-context-tools/
- https://thenextweb.com/news/granola-series-c-meeting-ai-enterprise-context
- https://www.granola.ai/updates
- https://fellow.ai/blog/fellow-vs-fireflies-ai/
- https://fireflies.ai/blog/fireflies-vs-otter/

**Dating caveats:** Series C + context-layer pivot firmly March 2026; Granola 2.0 / team folders / Slack
auto-post ~Q1–Q2 2026; passive→active, deep-research mode, personal coach are ANNOUNCED/roadmap from
founder interviews, not shipped. Some confirmations lean on third-party 2026 reviews + Granola marketing,
cross-checked against docs where possible.
