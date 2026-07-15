# CLAUDE.md — ECHO Project Working Instructions

## Project Mission

ECHO's current commercial product is the **Team decision product**: turn meetings and team activity into decisions, follow-through, and useful briefs. Its first saleable wedge is meeting→brief. The broader cross-tool context substrate and multi-agent coordination system remain internal technical assets; they are not parallel products until they prove a standalone customer problem.

**Brand promise:** *"We don't make AI smarter. We make every AI smarter about you."*

## How to Use This Repo

This is both a **decision archive** (the wiki) and a **build coordination system** (the backlog + agent runs). Two important rules govern how the two halves stay honest:

- **The product wiki (`wiki/`) is lagging documentation of shipped or ratified reality, including historical regimes, not aspirational spec.** A page exists for X only after X has been built/reviewed or the decision was ratified. Supersession metadata determines whether it is still current. Until build work is approved, its spec lives inside `backlog/proposed/<id>.md` while under review, then `backlog/ready/<id>.md` once claimable.
- **Operating-model files** (this file, `docs/AGENT_INSTRUCTIONS.md`, `backlog/README.md`, `.claude/commands/process-backlog.md`) update *immediately* when the operating model changes. They have no shipping milestone and are not product decisions.

### When making strategic decisions

1. **Search existing wiki + backlog first, then check supersession.** A shipped wiki page (`wiki/product/`, `wiki/principles/`, `wiki/architecture/`, `wiki/capture/`, `wiki/surfaces/`, etc.) or an in-flight backlog item often already captures the principle. Some wiki pages describe retired product regimes; their banners and the current commercial-focus decision override older body text.
2. **Cite cross-project wisdom.** The `yc-wiki` (`~/Desktop/yc/yc-wiki/`) is the authoritative source for startup strategy frameworks. Reference its concept pages by `[[link]]` when applying them.
3. **Capture new decisions as backlog items, not wiki pages.** The full spec — reasoning, alternatives considered, final call, acceptance criteria — starts inside `backlog/proposed/<id>.md`. The strategist does **not** write to `wiki/` at decision time. Wiki pages are written *after* the item lands in `backlog/complete/`, and only then.
4. **Background reasoning** that doesn't correspond to an actionable build item lands in `raw/internal/decisions/`.
5. **The manifest** is updated only when (and only when) a wiki page is actually created post-shipment.

### When researching precedents

- Drop research notes into `raw/external/precedents/` (Wispr Flow, 1Password, Plaid patterns, etc.)
- Drop competitor scans into `raw/external/competitor-scans/`
- Synthesize patterns into `wiki/principles/` only after multiple raw sources point the same direction

### When running validation experiments

- Each user interview gets a markdown file in `raw/internal/interviews/`
- Aggregate signals into `wiki/research/` after 5+ interviews
- Concierge experiment notes also go in `raw/internal/interviews/`

## Folder Taxonomy

The wiki is restructured (2026-05-01) into eight folders that mirror the substrate's left-edge / middle / right-edge architecture and the `interface-layers` L1/L3/L5 vocabulary. See `raw/internal/decisions/2026-05-01-wiki-restructure-proposal.md` for the diagnosis and reasoning.

| Folder | Purpose | Examples |
|---|---|---|
| `product/` | Strategic "what" — current and historical product, cohort, offer, and brand decisions | brand-promise; retired V1 pages are historical evidence |
| `principles/` | Current and historical commitments + disciplines; check supersession banners | felt-not-seen, compose-not-capture, historical drift-prevention |
| `architecture/` | The durable middle — substrate components + canonical models | system-architecture, capture-gate, storage, interface-layers |
| `capture/` | Layer 1 capture surfaces (substrate's left edge) | fs-watcher, cursor-extractor, claude-code-extractor |
| `capture/per-app/` | Field-level reference for each connected app | cursor-collected-data |
| `surfaces/` | What users, operators, and AI clients touch | mcp-server, echoctl-cli, terminal-intake-card, historical UI surfaces |
| `research/` | Validation work | wedge-vs-thesis-validation, validation-experiments |
| `operating-model/` | Process meta — wave retros, drift audits | wave-1-2-3-retrospective |

The current schema's `status: shipped | planned` field describes delivery state, not whether a page is still strategically current. A supersession banner or `lifecycle: retired` field makes historical authority explicit. Never infer current product direction from `status: shipped` alone.

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

## Current Commercial Focus (Tape Above Desk — 2026-07-11)

- **Product:** Team decision product. Machine context and Fleet coordination are internal assets, not current offers.
- **First wedge:** meeting→brief. Pain and demand are founder-locked as proven; do not reopen product selection as a build gate.
- **Goal:** carve the working experiment from the full ECHO lab, onboard a client, install a versioned package on the client's Mac, and run without the repo, founder's machine, or founder's personal CLI session.
- **Onboarding:** assisted is acceptable in phase 1. After onboarding, the client's machine is that client's loop-of-record.
- **Commercial posture:** sell aggressively while pricing, buyer/payment mechanics, and onboarding details are refined.
- **Client package:** only meeting input/config, signal extraction + API-key brain, human gates, brief generation/delivery, local state/health, and upgrade/rollback/support/data instructions.
- **Graduation:** `DEV -> FOUNDER LIVE -> QUALIFIED -> CLIENT LIVE`. The current candidate is formally DEV, with predecessor founder-regime evidence; a versioned, pinned, isolated candidate-package run is the next gate. Qualification permits client acceptance; only useful and repeat client use earns CLIENT LIVE.
- **Keep out:** unrelated dev-tool capture, agent orchestration, autonomous action, and destination-app work unless the Team product directly requires them.
- **Current gate:** G2 was founder-lifted in `raw/internal/decisions/2026-07-12-clarity-halt-lift.md` and landed on `main` at `ea5f5631`. Product work may resume through `proposed -> ready -> claimed`; the candidate remains DEV until it passes the separate graduation gates.
- **Definition of done:** through assisted onboarding, the product is installed on the client's machine; the client then runs a real meeting, receives a useful brief, and repeats without the founder's machine participating.

## Naming

Working name: **ECHO**. Hard rename deadline: before public Show HN launch (week 10). After that, name is permanent.

---

## Operating Mode: Coordination System

This repo coordinates three roles. **Multiple builder agents may run in parallel** — each works inside its own git worktree on its own feature branch.

1. **Strategist (Claude in conversation with founder)** — produces design decisions; specs them as `backlog/proposed/<id>.md` items; does **not** write to `wiki/` until items ship; **may also review and prep merges** for items in `pending_review/` (see "Reviewer independence rule" below)
2. **Builder agents (autonomous, parallelizable)** — claim items from `backlog/ready/`, work in isolated worktrees, move items through the pipeline; **never review or merge their own work**
3. **Founder** — gives final approval at the two irreversible repository-merge moments: (a) signing off on substantive conflict resolutions surfaced by reviewer, (b) `git push origin main`. A Team-product artifact release has a separate third approval bound to `source SHA + version + artifact SHA-256`; main-push approval never counts as release approval. The founder also handles review + merge directly when no strategist or independent reviewer is available, and asks the strategist to update the wiki post-shipment.

### Cross-tool protocol lives in `skills/` (not `.claude/commands/`)

The slash-command skills that drive ECHO's multi-agent workflow — `process-backlog`, `process-backlog-batch`, `review-pending`, `merge-and-cleanup`, `review-queue-codex`, `review-queue-cursor`, `review-queue-codex-ops`, `review-queue-watch`, `promote-to-product` (the four-stage Team qualification/release gate, used only after a product boundary exists) — are **the cross-tool collaboration protocol**, not Claude-Code-specific helpers. They define the grammar by which multiple AI clients coordinate as peers.

- **Canonical source of truth:** `skills/<name>.md` — vendor-neutral, ECHO-namespaced.
- **Claude Code adapter:** `.claude/commands/<name>.md` — derived real-file copy, maintained by `tools/sync-skills.sh`. **Do not hand-edit `.claude/commands/<name>.md`**; the sync script overwrites it. Edit the canonical `skills/<name>.md` and re-run `tools/sync-skills.sh` (or `tools/sync-skills.sh --check` to verify identity post-edit).
- **Future client adapters** (Cursor's Claude, Codex, web ChatGPT, etc.): add their own directories alongside `.claude/commands/`. The sync script will extend to copy to each adapter directory. For non-filesystem clients (OpenAI's GPT, web ChatGPT, etc.), a future MCP tool `echo_skill(name)` will return canonical content from `skills/` on demand.

Why this matters internally: the Fleet coordination system must stay vendor-neutral so Claude and non-Claude tools can build the Team product as peers. This is an operating-system property, not ECHO's current commercial wedge. See `raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md` for the original reasoning.

### Narrow successor-repository lane

Items 136-139 alone follow the founder-authorized two-repository/live-execute protocol in raw/internal/decisions/2026-07-15-echo-context-successor-repository-execution.md and docs/AGENT_INSTRUCTIONS.md. Project_echo remains the claim/record root; echo-context changes use an isolated target branch with independent review and founder target-main approval; artifacts build only from canonical landed SHAs; live user paths wait for the separately named exact-artifact execute scope. This does not relax the default external-write prohibition for any other item.

### Reviewer independence rule

The reviewer-and-merger of any item must be **a different role/agent than the builder** that wrote the code. Acceptable reviewers, in preference order:

1. **Strategist** — has full design context, often more than founder for technical items
2. **A second builder agent** (not the one that built the item) — independent eyes, no spec-author conflict-of-interest
3. **Founder** — fallback when neither of the above is available, or whenever founder wants to review directly

Self-review is the bad version. The agent that drifted into wrong scope can't see its own drift. Independence is the structural check that makes the pipeline trustworthy. Whoever reviews must (a) read the diff against acceptance criteria, (b) prep `review_notes` and any reconciliation diff for conflicts, (c) pause for founder green-light at substantive-conflict and `push-to-main` checkpoints. The reviewer never skips those two checkpoints; everything else they handle end-to-end.

### Pipeline

```
backlog/proposed/  →  backlog/ready/  →  backlog/claimed/  →  backlog/pending_review/  →  backlog/complete/
   spec review          claimable          builder owns          founder reviews              │
                                                                                              ▼
                                                                                 strategist updates wiki/
```

### Strategist Responsibilities (this Claude conversation)

After any strategic conversation that lands an actionable decision:

0. **Apply the current operating gate first.** G2 is lifted. New product work must directly serve the Team-product carve and begin at DEV in `backlog/proposed/`; a merge does not advance maturity or authorize an artifact release.
1. **Create a `backlog/proposed/<id>.md` item** — full spec lives here until spec-review promotes it to `ready/`. Include an "After Completion (Strategist Notes)" section noting which wiki pages should be created/updated post-shipment.
2. **Do not hand-edit `docs/BACKLOG.md`.** It is generated from folder state by `tools/backlog_index.py`; regenerate it after merge when acting in strategist/post-shipment mode.
3. **Do NOT touch `wiki/`.** Wiki edits happen only after items land in `complete/`.

When the founder reports items have moved to `complete/`, the strategist's *next* job is to read those items' "After Completion" sections and promote the now-shipped decisions to `wiki/` — landing each page in the appropriate folder (product/, principles/, architecture/, capture/, capture/per-app/, surfaces/, research/, or operating-model/), then updating `.manifest.json` and regenerating `wiki/index.md` via `tools/wiki_index.py`.

### Builder Agent Responsibilities

G2 is lifted, so a builder may run these steps for a product item only after its reviewed proposal has been promoted to `backlog/ready/` with a fresh `ready_content_sha`:

1. **Pull `main`**, then **atomically claim** an item: a single commit on `main` that moves the file `ready/ → claimed/` and sets `claimed_by`, `claimed_at`, `branch` in frontmatter. Push immediately. If push is rejected, another agent won — pick the next ready item.
2. **Create the worktree** at `~/Desktop/Project_echo--<slug>/` on a fresh `agent/<slug>` branch.
3. **Read all `spec_refs`** in the item before writing code.
4. **Implement to acceptance criteria only.** No scope expansion (per `drift-prevention` rules).
5. **Log work** in `raw/internal/agent-runs/<date>-<item-id>.md`.
6. **If uncertainty arises that requires founder input** — STOP, move item to `pending_review/` with the question in `agent_notes`. Do not guess.
7. **When acceptance criteria pass** — push the feature branch, then in the main repo on `main` move the item to `pending_review/` with `agent_notes` summary, `head_sha`, and (if applicable) `pr_url`.
8. **One item per run.** Do not pick up a second.

The agent operates across **two directories**: backlog state changes happen in the main repo on `main` (so all agents share consistent backlog state); code work happens inside the worktree on the feature branch. The slash command handles directory switching.

### Dogfooding journal discipline (every AI client)

**Every ECHO MCP call must be logged to the current month's per-actor shard at `raw/internal/dogfooding/mcp-interactions-journal-YYYY-MM-<actor>.md` in the moment** — current shard set: `raw/internal/dogfooding/mcp-interactions-journal-2026-07-{claude,codex,codex-ops,cursor}.md`. Actor slugs are lowercase binding identities matching `^[a-z][a-z0-9-]*$`: Claude Code / strategist / watcher use `claude`; Codex uses `codex`; codex-ops uses `codex-ops`; Cursor's Claude uses `cursor`. Do not append to the frozen pre-shard shared file (`raw/internal/dogfooding/mcp-interactions-journal-2026-06.md`) or the historical archive (`raw/internal/dogfooding/mcp-interactions-journal-archive-through-2026-05-17.md`). This applies equally to Claude Code, Codex, Cursor's Claude, agent runs, and any other AI client invoking the MCP server. The journal is cross-tool and cross-item; per-actor monthly shards are the canonical write targets, and `tools/dogfooding/journal-cat.sh YYYY-MM` is the canonical read target. It informs Team-product productization and internal reliability work subject to the current gate; it does not independently reopen Machine/Fleet roadmaps. Aspirational end-of-week entries are useless, lossy in-the-moment entries are gold.

**What counts:** any `mcp__echo__*` or `mcp__echo-memory__*` invocation — `get_recent_work_context`, `search_memories`, `echo_ping`, `memory_*`, etc. Log even 0-match / error responses; those are the highest-signal entries.

**Skip-rule for zero-MCP-call entries.** If a reviewer tick (or any AI-client invocation) reads files / runs git / runs scripts but makes **zero `mcp__echo__*` calls**, do NOT journal it. The journal's signal is MCP-call discipline + surprising failures; mechanical activity without ECHO retrieval is not journal-worthy. Operational artifacts (review responses, commit messages, agent-run logs) already capture that work. Exception: a reviewer tick that *expected to* make an MCP call but *failed to* (sandbox error, transport error, etc.) IS journaled — that's a surprising failure.

**Reading the journal.** "Read the journal" means `tools/dogfooding/journal-cat.sh YYYY-MM`, which merges all per-actor shards plus the frozen legacy shared file for that month in chronological entry order. Humans, HTML regeneration, and end-of-window synthesis should read the merged stream, not a single shard.

**Required entry shape:** the canonical template lives in each shard's preamble — copy it verbatim from there (7 fields: Trigger, Query inputs, Returned, Sources, Verdict, Note, optional Conjecture).

The **Sources** field is non-optional. Source-volume bias and silent omission (e.g., a window whose git rows all got dropped by Bug A's text-compare WHERE clause) are the most-recurring failure modes; without explicit per-call source attribution, future readers can't tell whether a 1-cluster trace response is "right and narrow" or "wrong because all git rows got dropped." Codex started doing this organically at 2026-05-08 00:46 PDT and earlier; the discipline is now project-wide.

**Don't design fixes in the journal.** Observations only. Backlog items come from end-of-window synthesis. If you find yourself drafting a fix, stop — the journal's "lossy in the moment" honesty is what makes it useful for backlog planning later.

**Journal-by-proxy for read-only consultees (046 AC6).** A read-only consultee (e.g., `codex exec --sandbox read-only`, a subagent without write capability, or any future binding that lacks repo-write) MAY call ECHO MCP only if it immediately reports `tool name / inputs / returned shape / sources / verdict / note` to its orchestrator in the same turn. The orchestrator MUST journal the call in the same turn, attributed to the consultee — e.g. `Source agent: codex strategist (consulting; orchestrator-journaled by claude)`. The in-the-moment rule is NOT weakened: the consultee's report and the orchestrator's journal entry are part of the same turn, not deferred. Worked example: the journal entry at `2026-05-13 16:45 PDT — closed-loop event` (codex strategist reads prior codex strategist via ECHO; claude orchestrator journals the call) demonstrates the shape. Cross-referenced in `skills/role-typed-task-state.md` so non-Claude bindings see the same rule.

**HTML twins are no longer committed.** Local regeneration is optional — anyone who wants a styled view can run the pandoc one-liner against the merged current-month stream and view the generated HTML locally. The MD shards are the canonical authoritative format. One-liner:

```
tools/dogfooding/journal-cat.sh 2026-06 > /tmp/echo-mcp-journal-2026-06.md
pandoc -s --metadata title="ECHO MCP interactions journal (cross-tool, cross-AI)" --toc --toc-depth=3 \
  -H raw/internal/dogfooding/journal-style.html \
  /tmp/echo-mcp-journal-2026-06.md \
  -o raw/internal/dogfooding/mcp-interactions-journal-2026-06.html
```

Do not commit regenerated HTML twins. On the first MCP-call journal append by an actor in a new calendar month, create that actor's fresh `raw/internal/dogfooding/mcp-interactions-journal-YYYY-MM-<actor>.md` shard with the same preamble template and update this current-shard-set pointer.

### Drift Prevention Applies to Agents Too

Agents are more dangerous than the founder for drift, because they don't have the founder's gut. Three safeguards:

1. Every backlog item has an explicit "Out of Scope (Don't Drift)" section
2. Agents must read `spec_refs` before any code is written
3. Sandbox is enforced in code (capture-gate pattern), not by policy

If an agent finds itself wanting to do something not in acceptance criteria: STOP, log the temptation in `raw/internal/decisions/` as a drift-event, fill `agent_notes` with the question, push branch, move item to `pending_review/`.

### Strategist drift — patching deeper instead of removing

The "agents drift via scope expansion" failure mode has a strategist-side twin during review rounds: adding mechanism in response to a finding, then watching the next round find bugs in *the mechanism the patch added*. Each round's diff grows; the spec accumulates premature optimizations and observability scaffolding that the load-bearing core doesn't need.

The fix is dispositioning discipline, not better patches. See `skills/review-queue-watch.md` "Disposition discipline — prefer removal over deeper patching when findings target a recent-round patch" for the check the strategist applies mid-tick. Concrete worked examples from 057a r4 and r6 are in that skill.

See [`backlog/README.md`](./backlog/README.md) for the full system documentation including atomic-claim and worktree mechanics.
