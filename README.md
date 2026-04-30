# ECHO

> *"We don't make AI smarter. We make every AI smarter about you."*

The cross-platform context layer that lives invisibly across the user's tools and makes every AI surface they use smarter through unified memory.

## Repository Structure

```
echo_wiki/
├── NORTH_STAR.md                # Daily orient — read every morning (~60s)
├── STATUS.md                    # Weekly tracker — update every Friday (~10min)
├── BACKLOG.md                   # Kanban board — current work coordination
├── backlog/                     # Work items by status (kanban folders)
│   ├── ready/                   # Specced, agent can pick up
│   ├── in_progress/             # Agent currently working
│   ├── needs_review/            # Founder reviews each morning
│   └── done/                    # Reviewed and merged
├── raw/                         # Source materials
│   ├── internal/
│   │   ├── extension/           # Chrome extension decisions, behavior data
│   │   ├── v1-spec/             # V1 build spec, sequencing, scope decisions
│   │   ├── interviews/          # User interview notes (live folder)
│   │   ├── decisions/           # Build-time decision log + drift events
│   │   └── agent-runs/          # Agent execution logs for founder review
│   └── external/
│       ├── precedents/          # Wispr Flow, 1Password, Plaid, Cursor, etc.
│       └── competitor-scans/    # Granola, Mem.ai, Rewind, etc.
└── echo-wiki/                   # Curated knowledge synthesis (canonical truth)
    ├── concepts/                # Design patterns, principles
    ├── entities/                # Components, surfaces, target cohorts
    ├── sources/                 # Strategic decisions captured as source docs
    ├── analyses/                # Cross-cutting synthesis
    ├── index.md                 # Auto-generated overview
    ├── .manifest.json           # Machine-readable entry catalog
    └── .manifest-schema.json    # Manifest format reference
```

## V1 Scope (Locked)

- **Target cohort:** Indie AI builders / dev founders
- **Pricing:** $25/mo (single tier)
- **Form factor:** Browser extension + MCP server + system-wide hotkey overlay (no destination app)
- **Bundle (5 tools):** Cursor + Claude Code + GitHub + Slack + web AI extension
- **Killer demo:** *"Solve GitHub issue #234"* — Cursor sees the issue, related code, Slack thread, prior Claude conversation, summoned via hotkey
- **Sequencing:** 10 weeks from substrate to public launch
- **Layers in V1:** Layer 1 (passive ingestion) + Layer 3 (summoned response, with both Q&A and assembly modes via clipboard+launch) + minimal Layer 5 (audit page). Layers 2 (ambient) and 4 (conversational) deferred to V2.

See `echo-wiki/sources/v1-spec.md` for the full locked-in spec.

## Architectural Commitments

- **Compose, don't capture.** ECHO never replicates features integrated tools already provide.
- **Felt, not seen.** No destination app. Ambient by default; visible only on demand for trust.
- **Layer above SaaS.** Additive to existing tools, never a replacement.
- **Compound on context, not capability.** Adjacent to foundation models, not in competition.

## Related Projects

- `~/Desktop/AIE/` — ECHO research and architecture (memory, guardrails, API specs, LoCoMo results)
- `~/Desktop/yc/` — YC Startup School wiki (strategic frameworks this project draws from)

## Operating Loop

```
[Strategic conversation]
       │
       ├── update echo-wiki/   (canonical decision)
       └── add backlog/ready/  (implementation work)
                  │
                  ▼
          [Builder agent — overnight]
                  │
                  ├── reads spec_refs from wiki
                  ├── implements per acceptance criteria
                  ├── logs to raw/internal/agent-runs/
                  └── moves item → backlog/needs_review/
                          │
                          ▼
                [Founder — morning review]
                          │
                          ├── reads agent run log
                          ├── inspects diff + tests
                          └── moves to done/ or back to ready/
```

## Daily / Weekly Rituals

- **`NORTH_STAR.md`** — read every morning before opening code. ~60 seconds. The brand promise + V1 scope summary + drift questions to ask before any decision.
- **`BACKLOG.md`** — open every morning to review `needs_review/` items the agent completed overnight. ~30 minutes for diff inspection + approval.
- **`STATUS.md`** — update every Friday afternoon. ~10 minutes. Tracks build progress, validation signals, drift audit, week-by-week sequencing.
- **`raw/internal/decisions/`** — write a note any time a decision comes up that isn't covered by the V1 spec, OR any time you catch yourself drifting. Templates included.
- **`raw/internal/agent-runs/`** — read after the agent completes work; the audit trail for what was actually done vs. specified.

## Working Conventions

- Filenames: kebab-case, globally unique across folders
- Wikilinks: `[[link]]` format, filename without `.md`
- Sources prefix: `src-` if a source page would collide with a concept/entity
- See `echo-wiki/.manifest-schema.json` for full conventions
