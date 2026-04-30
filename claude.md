# CLAUDE.md — ECHO Project Working Instructions

## Project Mission

ECHO is the cross-platform context layer for AI-era knowledge work. The product makes every AI surface smarter by unifying context across the user's tools, lives invisibly via browser extension + MCP server + hotkey overlay, and never becomes a destination app.

**Brand promise:** *"We don't make AI smarter. We make every AI smarter about you."*

## How to Use This Repo

This is a **decision and reasoning archive**, not a codebase. Every strategic call, scoping decision, form-factor commitment, and architectural principle gets captured here as a source/concept/entity/analysis page so future-you (and future contributors, and future LLMs) can reconstruct the *why* behind every choice.

### When making strategic decisions

1. **Search the wiki first.** Existing concepts (`echo-wiki/concepts/`) often already capture the principle. Reuse before creating.
2. **Cite cross-project wisdom.** The `yc-wiki` (`~/Desktop/yc/yc-wiki/`) is the authoritative source for startup strategy frameworks. Reference its concept pages by `[[link]]` when applying them.
3. **Capture new decisions as source pages.** Anything substantive — pricing, scope, form factor, branding, sequencing — becomes a `sources/` page with the reasoning, alternatives considered, and final call.
4. **Update the manifest.** Every new file goes into `.manifest.json` so the index stays consistent.

### When researching precedents

- Drop research notes into `raw/external/precedents/` (Wispr Flow, 1Password, Plaid patterns, etc.)
- Drop competitor scans into `raw/external/competitor-scans/`
- Synthesize patterns into `echo-wiki/concepts/` only after multiple raw sources point the same direction

### When running validation experiments

- Each user interview gets a markdown file in `raw/internal/interviews/`
- Aggregate signals into `echo-wiki/analyses/` after 5+ interviews
- Concierge experiment notes also go in `raw/internal/interviews/`

## Folder Taxonomy

| Folder | Purpose | Examples |
|---|---|---|
| `concepts/` | Design patterns, principles, invariants | compose-not-capture, felt-not-seen |
| `entities/` | Components, surfaces, cohorts | local-daemon, mcp-server, target-cohort-indie-ai-builders |
| `sources/` | Strategic decisions and spec docs | v1-spec, brand-promise, bundle-decision |
| `analyses/` | Cross-cutting synthesis | wedge-vs-thesis-validation, narrowest-v1-scope |

## Filename + Link Conventions

- **Filenames:** kebab-case, globally unique across folders. Prefix with `src-` if a source would collide with a concept/entity.
- **Wikilinks:** `[[link]]` format. Use the filename only — no folder prefix, no `.md` extension.
- **Topic taxonomy:** see `.manifest-schema.json`. Reuse existing topics before creating new ones.

## Cross-Project References

When citing the YC wiki:
```markdown
Per [[ai-moats-debate|the moats analysis]] in the YC wiki, brand is a clearly-stated obsession...
```

When citing the AIE / ECHO research wiki (architecture, memory system internals):
```markdown
Per [[append-only-ledger]] in the Claude wiki, the storage substrate is...
```

For external wiki references that don't exist locally as wikilinks, use markdown links with the full path:
```markdown
See [Aravind Srinivas on agentic search](/Users/zhenye/Desktop/yc/yc-wiki/sources/aravind-agentic-search.md).
```

## V1 Scope Reminder (Tape Above Desk)

- **Cohort:** Indie AI builders / dev founders
- **Bundle:** Cursor + Claude Code + GitHub + Slack + web AI extension
- **Form:** Browser extension + MCP server + hotkey overlay (no destination app)
- **Pricing:** $25/mo
- **Layers:** L1 (passive ingestion) + L3 (summoned, Q&A + assembly via clipboard+launch) + minimal L5 (audit)
- **Cut from V1:** Email, Linear, Notion, meeting transcripts, Zoom, calendar — all V1.5+
- **Cut layers:** L2 (ambient), L4 (conversational), all autonomous agent action — all V2+
- **Definition of done:** killer demo works in founder's daily workflow with no hand-staging; ≥3/5 randomly-selected indie AI builders ask "when can I pay?"

## Naming

Working name: **ECHO**. Hard rename deadline: before public Show HN launch (week 10). After that, name is permanent.

---

## Operating Mode: Coordination System

This repo is a coordination system across three roles:

1. **Strategist (Claude in conversation with founder)** — produces design decisions; updates `echo-wiki/` with canonical decisions; produces `backlog/ready/` items as actionable work emerges
2. **Builder agent (autonomous, overnight)** — picks items from `backlog/ready/`, implements them, logs work, moves through pipeline
3. **Founder (morning review)** — reviews `backlog/needs_review/` items, approves to `done/` or sends back to `ready/`

### Strategist Responsibilities (this Claude conversation)

After any strategic conversation that lands an actionable decision:

1. **Update `echo-wiki/`** — canonical decision lives here (sources/, concepts/, entities/, analyses/). Update manifest + index.
2. **Add backlog items to `backlog/ready/`** — implementation work derived from the decision. Use the standard item format (frontmatter + body).
3. **Update `BACKLOG.md`** — add row to the Ready table with link to item.

The wiki is for *what was decided*. The backlog is for *what will be built*. They connect via `spec_refs`.

### Builder Agent Responsibilities

When picking up a backlog item:

1. **Read all `spec_refs` first** — load wiki context before writing any code
2. **Move item from `ready/` to `in_progress/`** — atomic, one item at a time
3. **Implement to acceptance criteria** — no scope expansion (per [[drift-prevention]])
4. **Log work** in `raw/internal/agent-runs/<date>-<item-id>.md` with what was implemented, decisions made, files modified, test results, open questions
5. **If uncertainty arises** that requires founder input — STOP, move item to `needs_review/` with question in `agent_notes`. Do not guess.
6. **When acceptance criteria pass** — move item to `needs_review/`, fill `agent_notes` with summary

### Drift Prevention Applies to Agent Too

The agent is more dangerous than the founder for drift, because it doesn't have the founder's gut. Two safeguards built in:

1. Every backlog item has explicit "Out of Scope (Don't Drift)" section
2. Agent must read `spec_refs` (which include drift-prevention concept) before acting

If the agent finds itself wanting to do something not in acceptance criteria: STOP, log the temptation in `raw/internal/decisions/` with type `drift-event`, leave item in `in_progress/` with question for founder.

See [`backlog/README.md`](./backlog/README.md) for the full system documentation.
