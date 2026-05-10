# 2026-05-10 — Multi-agent dev template + product thesis: hold pending 030 + dogfooding

**Status:** Decision recorded 2026-05-10 ~01:30 PDT during strategist conversation (Claude Code session `71b36548-cf1d-4fe5-9370-b0317f9c4ac0`). **Decision: hold both (a) template extraction for founder's other projects AND (b) the multi-agent-dev-as-product thesis until item 030 ships and gets ~1–2 weeks of live dogfooding.** Same hold-pattern as the coordination-layer note from the same evening (`raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md`); the same dogfooding window will produce the empirical data both decisions need to reopen rationally.

**Why this lives in `raw/internal/decisions/` and not in `backlog/`:** founder explicitly held both lines of work; no actionable build item until trigger fires. Per CLAUDE.md, deferred reasoning of this shape archives here. `backlog/_followups.md` carries a pointer entry for discoverability.

**Cross-references:**
- `raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md` — same evening, same hold pattern, sister decision
- `backlog/ready/2026-05-09-030-mcp-toolkit-reshape-and-group-session.md` — the V1.6 ship that gates both reopenings
- `backlog/_followups.md` "Multi-agent dev template + product thesis — held pending 030 live test" — pointer entry

## TL;DR

Today's cross-tool spec review of item 030 organically demonstrated a **4-role multi-agent development pattern** (strategist + 2 peer reviewers + implementer + founder-as-principal). Founder recognized the pattern is (a) extractable as a reusable template for their other projects AND (b) a credible product seed in its own right. Strategist proposed a minimal extraction shape (a `templates/` subfolder OR a separate companion repo) and a 3-layer product framing (substrate + orchestration pattern + discipline scaffolds). **Founder's call: hold both — extract / productize only after 030 ships and ~1–2 weeks of dogfooding generates more data on what's actually load-bearing vs what was convenience-of-the-day.** This note archives the option space; trigger conditions specified for reopening.

## The 4-role pattern (formalized)

Today's spec review cycle (commits `f0b9ae2 → a66f468 → 6f165ce → 17cd821 → 25e7a11 → 3a4fd3c → 85172e2`) demonstrated the following role decomposition working organically:

| Role | Today's instance | What's structurally load-bearing |
|---|---|---|
| **Strategist / brainstormer** | Long-running CC session `71b36548-cf1d-4fe5-9370-b0317f9c4ac0` (this conversation) | Holds the whole conversation context across multiple days; produces specs; orchestrates the cross-tool review loop; synthesizes peer-reviewer findings; commits final artifacts. Long context = sees evolution of decisions; needed to maintain coherence across reframes. |
| **Peer reviewer (text)** | Cursor's Claude (composer `c15c2eca-...`) | Fresh context per spec review; no contamination from the strategist's reasoning trail; reasons about spec language, internal consistency, contradiction detection. Read-time review style. |
| **Peer reviewer (code)** | Codex (session `019e10a5-...`) | Fresh context per spec review; probes the codebase live (38 `exec_command`s on R1, 12 on R2); catches contract gaps the text reviewer misses (storage API gaps, parameter semantic conflations, shipped-constant-name typos). Probe-time review style. |
| **Implementer** | Separate CC agent (claims via atomic-claim, works in worktree) | Isolated execution per backlog item; no scope drift; commits review-ready diffs; stops at acceptance criteria boundary. Bounded context = bounded blast radius. (Item 029's claimer was an instance.) |
| **Principal** | Founder | Makes strategic calls; the only role with continuity across all conversations + all parallel agents. Holds the why-we-are-doing-this thread. |

**Why this works (the load-bearing observation):**

1. **Role separation is structural, not just labels.** Each role's *vantage point* is what produces its unique value. Mixing roles loses the coverage.
   - Strategist sees evolution → catches when an earlier decision is being inadvertently undone
   - Reviewers see snapshots → fresh-eye coverage that's blind to the strategist's "but I considered that" reasoning trail
   - Implementer sees the world bounded by acceptance criteria → no scope creep
   - Principal sees the meta → catches when the system is optimizing for the wrong thing

2. **Two reviewers > one because the perspectives differ structurally.** Today's R1 had 14 findings with **1 overlap** between Cursor and Codex. Single reviewer would have missed half. The diversity that matters is text-reasoning vs code-probing — same diversity that makes good PR review pairs in human teams.

3. **The substrate enables the orchestration.** Without ECHO MCP capturing all four sessions, the strategist couldn't tail Cursor's review or read Codex's findings without manual pasting. **The dogfooding loop IS the product loop** — founder uses ECHO to coordinate the agents that build ECHO. That gives the strategist evidence (`tail_session` + SQLite/JSONL fallback) that wouldn't otherwise exist.

4. **The persistence layer is split correctly.** Backlog (work pipeline) ≠ followups (working-memory queue) ≠ decisions (background reasoning archive) ≠ wiki (shipped SOT). Each layer has different write semantics, read audiences, decay rates. The founder + agent system can navigate without colliding because the layers don't overlap.

## Generic vs ECHO-specific decomposition

| Component | Generic? | Notes |
|---|---|---|
| `backlog/` kanban (ready/claimed/pending_review/complete) + atomic-claim mechanics | ✅ | Pure git pattern. `tools/blocked.py` already generic. |
| `backlog/_followups.md` working-memory queue | ✅ | Generic convention. |
| `raw/internal/decisions/` archive convention | ✅ | Generic. |
| `wiki/` as shipped-only SOT (not aspirational spec) | ✅ | Generic discipline. Folder taxonomy (product/principles/architecture/...) is project-specific but the SOT principle is portable. |
| 4-role orchestration (strategist + 2 reviewers + implementer) | ✅ | Generic; today proved it works on a real spec cycle. |
| Cross-tool review pattern (text + code reviewer, complementary coverage) | ✅ | Generic; the reviewer pair (Cursor + Codex) is convenience-of-the-day; any text-strong + code-strong pair works. |
| `CLAUDE.md` operating instructions | 🟡 | Structure generic; content needs project-specific filling (mission, V1 scope, target cohort). Template would have placeholders. |
| Slash commands (`/process-backlog`, `/merge-and-cleanup`) | ✅ | Generic; no ECHO-specific assumptions. |
| Dogfooding journal discipline (`raw/internal/dogfooding/mcp-interactions-journal.md`) | ❌ | ECHO-specific — the journal makes sense because ECHO IS the dogfooding target. Other projects may dogfood different tools; the *concept* of an in-the-moment journal is portable but the implementation isn't a copy-paste. |
| ECHO MCP capture substrate itself | ❌ | This IS ECHO; not part of the template per se. The template is *enabled by* ECHO running in the background; without it, the cross-tool review loop reverts to manual pasting and degrades severely. |

## Extraction shape (when reopened)

Two viable structures:

**A. Template subfolder in this repo** — `templates/echo-dev-template/`:
```
templates/echo-dev-template/
├── CLAUDE.md.template                    # placeholders for mission, cohort, scope
├── backlog/
│   ├── README.md                         # atomic-claim mechanics, role definitions
│   ├── _followups.md                     # empty queue
│   ├── ready/.gitkeep
│   ├── claimed/.gitkeep
│   ├── pending_review/.gitkeep
│   └── complete/.gitkeep
├── docs/
│   └── BACKLOG.md.template               # kanban view template
├── raw/internal/
│   ├── decisions/.gitkeep
│   └── interviews/.gitkeep               # if validation work applies
├── wiki/
│   └── (project-specific folder taxonomy)
├── tools/
│   └── blocked.py                        # already generic; copy as-is
├── scripts/
│   └── init.sh                           # scaffold + interactive placeholder fill
└── README.md                             # explains the pattern + 4-role model
```

**B. Separate companion repo** — `founder/multi-agent-dev-template`. Keeps ECHO-the-product separate from "the way to develop with ECHO." Better positioned for the eventual product angle; more setup work today.

**Strategist's lean: A first.** Lighter weight, in-repo, founder can copy to other projects manually. Migrate to B if/when product angle is validated.

## Product thesis

What's been built isn't just an operating model — it's a thesis about how AI-augmented software development *should* work. **Three layers:**

1. **Substrate** (ECHO V1) — captures all agent activity; one shared memory across tools.
2. **Orchestration pattern** (the 4-role model) — strategist + reviewers + implementer + principal, mediated by the substrate.
3. **Discipline + scaffolds** (backlog/wiki/decisions/followups + atomic-claim + dogfooding journal) — the operating habits that make the pattern compoundable.

A product version sells (1) + (2) + (3) as a bundle: *"the operating environment for multi-agent software development."* Distinct from ECHO V1 which is just (1).

**Three viable productization paths:**

- **V2 brand extension** — "ECHO Studio" / "ECHO Workspace" — adds (2) + (3) as a higher tier on top of V1.
- **Separate higher-tier SKU** — $100/mo team tier or $200/mo studio tier — for indie devs running ≥2 agents in parallel.
- **Open-source layer** — release (2) + (3) as MIT-licensed scaffolds; pull users into ECHO V1 ($25/mo individual) as the substrate.

**Brand promise upgrade** (the pitch for this layer): *"your AI agents work as a team, not as separate tools you have to manage."* Distinct from V1's *"every AI smarter about you"* because it's about *coordination across agents*, not just *context per agent*.

The 1:n vs multiple 1:1 reframe (founder, 2026-05-09 afternoon) IS the conceptual seed for this product angle. Worth holding for the demo brainstorm post-V1.6.

## Decision: hold both lines of work

**Decision (founder, ~01:30 PDT 2026-05-10):** *"hold like the coordination after more dogfooding"* — same hold-pattern as the coordination-layer note from the same evening. Both:
- (a) template extraction for founder's other projects, AND
- (b) the multi-agent-dev-as-product thesis

…wait until item 030 ships and gets ~1–2 weeks of live dogfooding.

**Reasoning:**
- 030 is the load-bearing V1.6 ship; splitting attention to template / product work now would dilute it.
- The 4-role pattern was demonstrated on ONE spec cycle today. One data point isn't enough to extract a template — the next spec cycle (post-030) will reveal what's load-bearing vs what was convenience-of-the-day.
- The product angle requires market validation that doesn't exist yet; founder is still the only user. Cohort dogfooding (post-V1 ship) is the natural validation moment.
- Same dogfooding window will surface the coordination layer triggers (per sister decision note); both decisions reopen on the same data.

## Trigger conditions to revisit

Reopen the template-extraction OR product-thesis conversation when AT LEAST ONE of these fires post-030-merge:

**For template extraction:**
1. **Founder applies the pattern to a second project** and finds themselves manually copying files between projects. The friction of manual copy = the trigger to extract a template.
2. **A third party asks "how do you set up a project to work this way?"** — market-pull signal that the pattern is teachable / desirable beyond the founder.
3. **The 4-role pattern fires on a second spec cycle** and produces clear differential value vs no-pattern (or single-reviewer pattern). Two confirmation cycles = enough evidence to extract.

**For product thesis:**
4. **Cohort feedback (post-V1 ship) validates the multi-agent dev workflow as differentiated.** Indie AI builders specifically asking "how do you make these agents work together?" = the product hypothesis is real.
5. **A paying-customer signal:** ≥1 prospective customer flags the orchestration pattern (vs just the substrate) as their reason to buy.
6. **Competitive landscape shifts** — if a competitor (Cursor, Cline, Continue, AutoGen, CrewAI, etc.) ships an explicit multi-agent orchestration product, founder may need to either differentiate or co-position. Defensive trigger.
7. **Brand-promise upgrade lands in a launch artifact** (Show HN tagline, demo video script, landing page hero). If the "agents work as a team" framing tests well in marketing, the product follows.

## Open questions for revisit time

When triggers fire:

**For template:**
- **What was load-bearing vs convenience-of-the-day in today's pattern?** (Empirical question; the next spec cycle's data will answer.)
- **Does the dogfooding journal discipline survive into other projects, or is it an ECHO-specific artifact?** (If founder's other project doesn't have a substrate to dogfood against, what replaces the journal?)
- **Does the 4-role pattern hold at higher parallelism?** (Today was 4 agents max; what about 8? 16? When does the strategist become the bottleneck?)

**For product:**
- **Is the pattern teachable, or does it require strategist-level meta-cognition that not all founders have?** (If the latter, the product is more "consultancy + tooling" than "self-serve SaaS.")
- **Does the orchestration pattern compose with non-Claude agents?** (Cursor is Anthropic-flavored today; what about Cline + GPT-4? Continue + local Llama? If pattern only works with Claude, market is narrower.)
- **What's the smallest unit of value?** (Is it the template scaffolds alone? The substrate + scaffolds? The full bundle? Different price points → different SKUs.)

## What stays untouched until trigger fires

- The current ad-hoc operating practice continues — strategist, reviewers, implementer roles operated in this repo per founder's day-to-day routing. No formalization needed.
- The 4-role naming stays informal in this conversation; not promoted to wiki yet.
- Templates not extracted; founder copies manually if applying to another project pre-trigger.
- Product angle not productized; ECHO V1 continues to ship as the bundle described in `wiki/product/v1-spec.md`.
- `_followups.md` carries a pointer entry to this decision note so the deferral is discoverable from the working-memory queue.

## What this note explicitly does NOT decide

- The shape of the eventual template extraction (in-repo subfolder vs separate companion repo). Empirical data from the next spec cycle should drive that.
- The shape of the eventual product (V2 brand extension vs separate SKU vs OSS+SaaS). Market validation should drive that.
- Whether ECHO V1's brand promise gets upgraded to "agents work as a team" before V1 ships, or stays as "every AI smarter about you" until V2. (The current V1 promise is already locked; the upgrade is V2-territory.)
- Whether the dogfooding-journal discipline is part of the template or stays ECHO-specific.
- Naming of the eventual product / brand (the founder has the "ECHO" rename deadline at week 10 per `wiki/product/v1-spec.md`; product naming for the orchestration layer is downstream of that).

## References

- `raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md` — sister decision from the same evening; same hold pattern; same trigger window
- `raw/internal/dogfooding/mcp-interactions-journal.md` "2026-05-10 — dogfooding day 4" — captures the cross-tool spec review that demonstrated the 4-role pattern in action
- `backlog/ready/2026-05-09-030-mcp-toolkit-reshape-and-group-session.md` — the V1.6 ship that gates this reopening
- `backlog/_followups.md` "Multi-agent dev template + product thesis — held pending 030 live test" — pointer entry
- `wiki/product/v1-spec.md` — the V1 product surface that the eventual product layer would extend
- `wiki/principles/felt-not-seen.md` — brand-promise principle that the "agents work as a team" upgrade respects (the orchestration is felt by the founder via reduced cognitive load, not seen as a destination UI)
