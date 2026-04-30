# CLAUDE.md — ECHO Project Working Instructions

## Project Mission

ECHO is the cross-platform context layer for AI-era knowledge work. The product makes every AI surface smarter by unifying context across the user's tools, lives invisibly via browser extension + MCP server + hotkey overlay, and never becomes a destination app.

**Brand promise:** *"We don't make AI smarter. We make every AI smarter about you."*

## How to Use This Repo

This is both a **decision archive** (the wiki) and a **build coordination system** (the backlog + agent runs). Two important rules govern how the two halves stay honest:

- **The product wiki (`wiki/`) is lagging documentation of shipped reality, not aspirational spec.** A page exists for X only after X has been built, reviewed, and merged. Until then, X's spec lives inside its `backlog/ready/<id>.md` item.
- **Operating-model files** (this file, `docs/AGENT_INSTRUCTIONS.md`, `backlog/README.md`, `.claude/commands/process-backlog.md`) update *immediately* when the operating model changes. They have no shipping milestone and are not product decisions.

### When making strategic decisions

1. **Search existing wiki + backlog first.** A shipped wiki page (`wiki/concepts/`, `sources/`, etc.) or an in-flight backlog item often already captures the principle. Reuse before creating.
2. **Cite cross-project wisdom.** The `yc-wiki` (`~/Desktop/yc/yc-wiki/`) is the authoritative source for startup strategy frameworks. Reference its concept pages by `[[link]]` when applying them.
3. **Capture new decisions as backlog items, not wiki pages.** The full spec — reasoning, alternatives considered, final call, acceptance criteria — lives inside `backlog/ready/<id>.md`. The strategist does **not** write to `wiki/` at decision time. Wiki pages are written *after* the item lands in `backlog/complete/`, and only then.
4. **Background reasoning** that doesn't correspond to an actionable build item lands in `raw/internal/decisions/`.
5. **The manifest** is updated only when (and only when) a wiki page is actually created post-shipment.

### When researching precedents

- Drop research notes into `raw/external/precedents/` (Wispr Flow, 1Password, Plaid patterns, etc.)
- Drop competitor scans into `raw/external/competitor-scans/`
- Synthesize patterns into `wiki/concepts/` only after multiple raw sources point the same direction

### When running validation experiments

- Each user interview gets a markdown file in `raw/internal/interviews/`
- Aggregate signals into `wiki/analyses/` after 5+ interviews
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

This repo coordinates three roles. **Multiple builder agents may run in parallel** — each works inside its own git worktree on its own feature branch.

1. **Strategist (Claude in conversation with founder)** — produces design decisions; specs them as `backlog/ready/<id>.md` items; does **not** write to `wiki/` until items ship
2. **Builder agents (autonomous, parallelizable)** — claim items from `backlog/ready/`, work in isolated worktrees, move items through the pipeline
3. **Founder (morning review)** — reviews `backlog/pending_review/`, merges branches (handling conflicts manually), moves items to `complete/`, then asks the strategist to update the wiki

### Pipeline

```
backlog/ready/  →  backlog/claimed/  →  backlog/pending_review/  →  backlog/complete/
                                                                         │
                                                                         ▼
                                                            strategist updates wiki/
```

### Strategist Responsibilities (this Claude conversation)

After any strategic conversation that lands an actionable decision:

1. **Create a `backlog/ready/<id>.md` item** — full spec lives here (this is the authoritative spec until the item ships). Include an "After Completion (Strategist Notes)" section noting which wiki pages should be created/updated post-shipment.
2. **Add a row to `docs/BACKLOG.md`'s Ready table.**
3. **Do NOT touch `wiki/`.** Wiki edits happen only after items land in `complete/`.

When the founder reports items have moved to `complete/`, the strategist's *next* job is to read those items' "After Completion" sections and promote the now-shipped decisions to `wiki/` (sources/, concepts/, entities/, analyses/, manifest, index).

### Builder Agent Responsibilities

When a builder agent runs:

1. **Pull `main`**, then **atomically claim** an item: a single commit on `main` that moves the file `ready/ → claimed/` and sets `claimed_by`, `claimed_at`, `branch` in frontmatter. Push immediately. If push is rejected, another agent won — pick the next ready item.
2. **Create the worktree** at `~/Desktop/Project_echo--<slug>/` on a fresh `agent/<slug>` branch.
3. **Read all `spec_refs`** in the item before writing code.
4. **Implement to acceptance criteria only.** No scope expansion (per `drift-prevention` rules).
5. **Log work** in `raw/internal/agent-runs/<date>-<item-id>.md`.
6. **If uncertainty arises that requires founder input** — STOP, move item to `pending_review/` with the question in `agent_notes`. Do not guess.
7. **When acceptance criteria pass** — push the feature branch, then in the main repo on `main` move the item to `pending_review/` with `agent_notes` summary, `head_sha`, and (if applicable) `pr_url`.
8. **One item per run.** Do not pick up a second.

The agent operates across **two directories**: backlog state changes happen in the main repo on `main` (so all agents share consistent backlog state); code work happens inside the worktree on the feature branch. The slash command handles directory switching.

### Drift Prevention Applies to Agents Too

Agents are more dangerous than the founder for drift, because they don't have the founder's gut. Three safeguards:

1. Every backlog item has an explicit "Out of Scope (Don't Drift)" section
2. Agents must read `spec_refs` before any code is written
3. Sandbox is enforced in code (capture-gate pattern), not by policy

If an agent finds itself wanting to do something not in acceptance criteria: STOP, log the temptation in `raw/internal/decisions/` as a drift-event, fill `agent_notes` with the question, push branch, move item to `pending_review/`.

See [`backlog/README.md`](./backlog/README.md) for the full system documentation including atomic-claim and worktree mechanics.
