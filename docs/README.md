# ECHO

> *"We don't make AI smarter. We make every AI smarter about you."*

The cross-platform context layer that lives invisibly across the user's tools and makes every AI surface they use smarter through unified memory.

## Repository Structure

```
Project_echo/
├── CLAUDE.md                       # Project root convention (Claude Code reads this)
│
├── package.json, tsconfig.json,
│   vitest.config.ts, eslint.config.js,
│   .prettierrc.json, .gitignore    # Node toolchain config
│
├── src/                            # TypeScript source (the actual codebase)
├── tests/                          # Vitest test suite
│
├── docs/                           # Project rituals + canonical narrative
│   ├── README.md                   # this file — project overview
│   ├── NORTH_STAR.md               # daily founder orient (~60s)
│   ├── BACKLOG.md                  # kanban view
│   ├── STATUS.md                   # weekly tracker
│   └── AGENT_INSTRUCTIONS.md       # builder-agent operating manual
│
├── wiki/                           # Knowledge archive (post-shipment only)
│   ├── concepts/                   # Design patterns, principles, invariants
│   ├── entities/                   # Components, surfaces, cohorts
│   ├── sources/                    # Strategic decisions and spec docs
│   ├── analyses/                   # Cross-cutting synthesis
│   ├── index.md, .manifest.json
│   └── .manifest-schema.json
│
├── backlog/                        # Work coordination (kanban)
│   ├── README.md                   # backlog system + lifecycle + worktree pattern
│   ├── ready/                      # specced, agents may claim
│   ├── claimed/                    # agent owns; in flight on a feature branch
│   ├── pending_review/             # agent done; awaits founder review + merge
│   └── complete/                   # merged; wiki update may be pending
│
├── tools/                          # Scripts
│   ├── blocked.py                  # deterministic backlog selector + validator
│   └── test_blocked.py             # 17 tests for the selector
│
├── raw/                            # Source materials (interviews, decisions, logs)
│   ├── internal/  {extension, v1-spec, interviews, decisions, agent-runs}
│   └── external/  {precedents, competitor-scans}
│
└── .claude/                        # Claude Code config
    ├── SETUP.md
    └── commands/
        ├── process-backlog.md      # single-item agent loop
        └── process-backlog-batch.md  # batched agent loop with hard stops
```

## V1 Scope (Locked)

- **Target cohort:** Indie AI builders / dev founders
- **Pricing:** $25/mo (single tier)
- **Form factor:** Browser extension + MCP server + system-wide hotkey overlay (no destination app)
- **Bundle (5 tools):** Cursor + Claude Code + GitHub + Slack + web AI extension
- **Killer demo:** *"Solve GitHub issue #234"* — Cursor sees the issue, related code, Slack thread, prior Claude conversation, summoned via hotkey
- **Sequencing:** 10 weeks from substrate to public launch
- **Layers in V1:** Layer 1 (passive ingestion) + Layer 3 (summoned response, with both Q&A and assembly modes via clipboard+launch) + minimal Layer 5 (audit page). Layers 2 (ambient) and 4 (conversational) deferred to V2.

See `wiki/sources/v1-spec.md` for the full locked-in spec.

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
       └── add backlog/ready/<id>.md   (spec lives in the item until it ships)
                  │
                  ▼
          [Builder agent — runs /process-backlog or /process-backlog-batch]
                  │
                  ├── reads four mandatory context files (this README isn't one of them)
                  ├── reads spec_refs and item body
                  ├── implements per acceptance criteria in an isolated worktree
                  ├── logs to raw/internal/agent-runs/
                  └── pushes branch + moves item → backlog/pending_review/
                          │
                          ▼
                [Founder — morning review]
                          │
                          ├── reads agent run log + agent_notes
                          ├── inspects diff + runs tests locally
                          ├── merges feature branch to main
                          └── moves item to backlog/complete/
                                    │
                                    ▼
                          [Strategist — next conversation]
                                    │
                                    └── promotes the now-shipped decision into wiki/
```

## Daily / Weekly Rituals

- **`docs/NORTH_STAR.md`** — read every morning before opening code. ~60 seconds. The brand promise + V1 scope summary + drift questions to ask before any decision.
- **`docs/BACKLOG.md`** — open every morning to review `backlog/pending_review/` items the agent shipped overnight. ~30 minutes for diff inspection + approval.
- **`docs/STATUS.md`** — update every Friday afternoon. ~10 minutes. Tracks build progress, validation signals, drift audit, week-by-week sequencing.
- **`raw/internal/decisions/`** — write a note any time a decision comes up that isn't covered by the V1 spec, OR any time you catch yourself drifting. Templates included.
- **`raw/internal/agent-runs/`** — read after the agent completes work; the audit trail for what was actually done vs. specified.

## Working Conventions

- Filenames: kebab-case, globally unique across folders
- Wikilinks: `[[link]]` format, filename without `.md`
- Sources prefix: `src-` if a source page would collide with a concept/entity
- See `wiki/.manifest-schema.json` for full conventions
