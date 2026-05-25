# 2026-05-25 — ECHO Pro paid coord layer: product design

**Status:** Brainstormed 2026-05-25 ~14:30 PDT during Claude Code strategist conversation. Founder approved high-level design (*"lgtm for now"*). Decomposition into backlog items deferred to founder's next strategist conversation; the candidate slate is in the "Implied backlog decomposition" section below.

**Why this lives in `raw/internal/decisions/` and not in `backlog/`:** the design spans 5-6 independent subsystems. Per CLAUDE.md + brainstorming-skill decomposition rules, the right move is to archive the strategic design here, then spec each subsystem as its own `backlog/ready/<id>.md` after the founder picks which to ship first. Single backlog items get scoped specs; this is the meta.

**Trigger to act on this design:** founder's next strategist conversation that says *"let's spec subsystem X"*. Until then, treat as background reasoning.

**Cross-references:**
- `wiki/product/v1-spec.md` — locked 2026-04-30 V1 (browser ext + MCP + hotkey overlay + audit). This decision EXTENDS V1 with a paid tier on top, not replaces.
- `raw/internal/decisions/2026-05-10-multi-agent-dev-template-and-product-thesis.md` — the May 10 hold pattern (extract / productize after 030 + dogfooding). Today's decision REOPENS the productization line; 069 shipping + 4 weeks of dogfooding produced the empirical evidence.
- `raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md` — "ECHO's wedge is hosting the protocol that lets Claude AND non-Claude tools work as peers." Today's design operationalizes that wedge as the paid tier.
- MEMORY note `project_substrate_is_scaffolding_not_product.md` (2026-05-17) — "Defer team-shape/agent-assignment vision to V2+." Today's design does NOT include team/multi-human coordination; that remains V2+.

## TL;DR

ECHO is packaged as two tiers:

- **Free**: substrate (daemon, atom store, MCP) + Raycast extension (Ask + audit). Distributed via Raycast Store.
- **Paid (ECHO Pro)**: coordination layer = skills + roles + agent adapters + cross-vendor protocol + `echo` CLI. Subscription.

**Unit of paid product:** roles. Each role (strategist / reviewer / builder) bundles a skill set + MCP wiring requirement + capability requirements. Workflows are emergent — connect roles to run multi-agent dev.

**Buying trigger:** "I want my multi-agent patterns to be portable + repeatable." Skills + role templates are the value.

**Day-1 user:** solo indie AI builder (V1 cohort, unchanged) — uses Cursor + Claude Code + codex + ChatGPT, some days single-agent, some days multi-agent.

**Install posture:** global, not project-local. Substrate is already global on the machine; coord layer extends that.

**Scoping rule (codex consult, 2026-05-25):** "D as product model, A as CLI default" — global install, unified context retrieval feels global; project workflows resolve via `repo_path`/`--project` arg first, then nearest git root walking up from cwd. The substrate's existing `repo_path` MCP arg (already supported across find_clusters, get_recent_work_context, echo_resolve_mru, search_memories per `src/mcp/cursor-workspace-resolver.ts` + `src/mcp/request-log.ts`) is the canonical scoping field.

**First-session demo:** deferred. Founder will dogfood the onboarding end-to-end as a customer and let the demo question resolve itself based on what they actually want to do in their first session. Codex's preliminary recommendation (cross-vendor change review, reformulated from PR-only to any-diff with priority `PR > unpushed > uncommitted > HEAD~1..HEAD`) is archived here for when the founder reopens the question.

## Coord layer architecture

```
~/.echo/
├── skills/              # canonical, vendor-neutral skill library (.md)
├── roles/               # role definitions (.toml) — strategist, reviewer, builder
├── state/
│   ├── onboarding.json  # what was wired, when, agent capability profile
│   └── projects.json    # known projects (auto-populated from atom store)
└── adapters/            # cached per-agent adapter outputs (for re-sync diff)

/usr/local/bin/echo      # CLI binary (commands: init, review, run, doctor, uninstall)
```

Synced from `~/.echo/skills/` to each agent's adapter location during wiring:

| Agent | Adapter location(s) | Merge strategy |
|---|---|---|
| Codex | `~/.codex/AGENTS.md` (markdown), `~/.codex/config.toml` (`[mcp_servers.echo]`) | Markdown: ECHO-owned section between `<!-- BEGIN ECHO --> ... <!-- END ECHO -->` markers; everything outside preserved. TOML: parse + mutate `[mcp_servers.echo]` only. |
| Claude Code | `~/.claude/CLAUDE.md` (markdown), `~/.claude/commands/*.md` (one file per skill) | CLAUDE.md uses the BEGIN/END markers. Each command file is fully ECHO-owned (overwritten on re-sync). |
| Cursor | `~/.cursor/mcp.json` (or equiv) | JSON parse + mutate `mcpServers.echo` only. |
| Future / web-only agents | MCP `get_skill(name)` tool on the daemon | No filesystem writes needed — agent fetches at runtime. Deferred to V1.5+. |

**Merge-with-markers rationale:** preserves the user's hand-written instructions; ECHO only owns its delimited region. Re-running onboarding is idempotent — marked region is replaced; everything else untouched. Conflict mode: if user edited *inside* the markers, wizard refuses to overwrite and surfaces the diff.

## Role definition format

Each `~/.echo/roles/<name>.toml`:

```toml
[role]
name = "reviewer"
description = "Read-only code review. Surfaces correctness, style, and scope issues."
skills = ["review-pending", "review-queue-codex"]
sandbox = "read-only"

[role.requires]
mcp_servers = ["echo"]
capabilities = ["fs.read", "git.read"]

[role.output]
format = "yaml-header + markdown"
required_fields = ["verdict", "reviewer", "findings"]
```

Bundled defaults V1: `strategist.toml`, `reviewer.toml`, `builder.toml`. Users can hand-write more; no editor shipped in V1.

**Role-plugging at runtime:** `echo run <workflow>` matches role requirements against onboarded agent capabilities and picks. e.g., if codex and claude both satisfy "reviewer", default picked during onboarding; per-invocation override supported.

## Onboarding wizard — 6 steps

| # | Step | What ECHO does | What user does |
|---|---|---|---|
| 1 | Welcome | 1-sentence pitch + estimated wizard time (~2 min) | Continue |
| 2 | Detect agents | Layered scan: config files + running processes + atom-store `source_breakdown` (last 30d) | Confirm or edit list |
| 3 | Detect projects | Query atom store for distinct `metadata.repo_root` over last 7d, ranked by activity | Pick one as default `--project`; others stored for later |
| 4 | Wire | Per agent: write/merge MCP block + write/merge BEGIN/END section in AGENTS.md/CLAUDE.md + sync Claude Code skills to `~/.claude/commands/` | Passive; conflicts surfaced with diff preview before write |
| 5 | Probe | Per agent: invoke 1-sec hello calling `mcp__echo__echo_ping`. Confirm round-trip | Passive |
| 6 | Done | "You're ready" + suggested first action (TBD) + uninstall instructions + path to `~/.echo/state/onboarding.json` for transparency | Finish |

**Failure modes (all surface, none silent):**
- Agent detected but wiring fails → skip-this-agent + continue option, partial state recorded
- Probe times out → surface stderr, allow retry or skip
- Daemon not running at wiring time → refuse to wire, offer `echo doctor` one-liner
- User edited inside BEGIN/END markers → refuse overwrite, surface diff, ask to move content outside markers

## What's deferred

| Deferred | Triggered when |
|---|---|
| First-session demo workflow | Founder dogfoods onboarding end-to-end as a customer; observation produces the answer |
| Install topology (one install vs two; brew vs pkg vs Raycast Store) | After wizard UX is implemented; install is the wrapper around the wizard |
| Pricing point | After first 5+ external users complete onboarding and report perceived value |
| Brand / rename | Before public Show HN launch (week 10 deadline per V1 spec) |
| Open-source posture (which pieces MIT vs commercial) | When licensing is needed for distribution — likely tied to install topology decision |
| `.echo/config.toml` per-project overrides | V1.5+ when 2+ data points emerge of users needing different skill sets per project |
| `mcp__echo__get_skill(name)` dynamic skill serving | V1.5+ once filesystem adapter drift telemetry justifies the simplification |
| Multi-human / team coordination | V2+ per 2026-05-17 memory |

## Implied backlog decomposition

This design implies the following backlog items, in suggested build order. The founder picks which to spec first in their next strategist conversation; each gets its own `backlog/ready/<id>.md` with full acceptance criteria.

| Tentative id | Subsystem | One-line scope |
|---|---|---|
| 070 | ECHO global home (`~/.echo/`) scaffold | Establish the directory layout, state file schemas, daemon-aware paths. Foundation for all other items. |
| 071 | Role definition format + 3 default roles | TOML schema for `~/.echo/roles/<name>.toml`; ship `strategist.toml`, `reviewer.toml`, `builder.toml`. |
| 072 | Adapter sync engine | Merge-with-markers logic for AGENTS.md/CLAUDE.md; TOML/JSON mutators for config files; idempotent re-sync; conflict detection. |
| 073 | Onboarding wizard (steps 2-5) | Auto-detect agents + projects, wire with confirmation gate, probe with round-trip MCP call. |
| 074 | `echo` CLI binary | Commands: `init`, `run`, `doctor`, `uninstall`. `review` and other workflow commands come from role-plugging at runtime. |
| 075 | First demo workflow | Deferred — specced after founder dogfoods onboarding. Codex's preliminary candidate (cross-vendor change review) is the lead hypothesis. |

**Order rationale:** 070 must precede everything (storage layout). 071 + 072 are independent and can run parallel. 073 depends on 070 + 071 + 072. 074 depends on 070 + 071 + 072 + 073. 075 depends on 074 + founder dogfooding.

**Estimated total scope:** ~3-4 weeks of single-builder time, or ~2 weeks with the multi-builder parallel pipeline already dogfooded.

## After Completion (Strategist Notes)

- **Wiki page candidates (post-shipment):** `wiki/product/echo-pro.md` (paid-tier scope, what's in/out), `wiki/architecture/coord-layer.md` (the `~/.echo/` layout + role format + adapter sync), `wiki/surfaces/onboarding-wizard.md` (the 6-step arc).
- **Update `wiki/product/v1-spec.md`** with a note that V1 ships with the substrate + Raycast (free); ECHO Pro is a separate paid tier on the same substrate.
- **Trigger to reopen the deferred questions:** after 073 + 074 ship and founder completes the onboarding wizard themselves as a customer, surface the first-demo question + install-topology question in the strategist conversation that follows.
