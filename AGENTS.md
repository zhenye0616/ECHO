# AGENTS.md - Codex Working Instructions for ECHO

This file is the Codex-facing companion to `CLAUDE.md`, which is the canonical project guide for ECHO. Codex should read `CLAUDE.md` first and treat it as the source of truth. This file exists so Codex-native sessions can pick up the same operating model, plus Codex-specific dogfooding rules.

If this file ever conflicts with `CLAUDE.md`, `docs/AGENT_INSTRUCTIONS.md`, `backlog/README.md`, or an active backlog item's acceptance criteria, stop and surface the conflict instead of guessing.

## Current operating gate (read before doing anything strategic)

**Team-product carve + post-lift proposal gate (founder-locked 2026-07-12).** ECHO is going all in on the Team decision product; meeting→brief is the first saleable wedge and its pain/demand are considered proven. Machine context and Fleet orchestration remain internal assets, not parallel commercial roadmaps.

- **Halt status:** G2 was founder-lifted in `raw/internal/decisions/2026-07-12-clarity-halt-lift.md` and landed on `main` at `ea5f5631`.
- **Current proposal gate:** every product spec begins in `backlog/proposed/`, passes cross-vendor review, and is promoted to `ready/` before a builder may claim it.
- **Product priority:** every product spec must directly serve the Team-product carve, assisted onboarding, client-machine install/operation, delivery, or the commercial/support/data boundary.
- **Client endpoint:** after onboarding, the versioned package runs on the client's Mac without a repo checkout, founder's machine, or founder's personal CLI session.
- **Graduation:** `DEV -> FOUNDER LIVE -> QUALIFIED -> CLIENT LIVE`; a demo, merge, or generic package never skips the qualification matrix.
- **Scope guard:** do not build standalone Machine/Fleet features unless the Team product or current ECHO development workflow requires them.

The older e1/e2 friction-first gate remains useful operating-model history, but it no longer controls product prioritization.

G2 is lifted. Every new product spec starts in `backlog/proposed/` and follows normal cross-vendor review before becoming claimable. A merge leaves the product at DEV unless separate graduation evidence advances it.

## Role-typed task-state pointers (046+)

ECHO ships a compact working-memory snapshot at `backlog/task-state/<task-id>/<role>.md` per role binding. Continuity roles (strategist, builder, watcher, dispatcher) write these; reviewer ticks DO NOT read or write them (fresh-eyes-at-SHA invariant). Full schema + read/write protocol in `skills/role-typed-task-state.md`.

**If you are starting a strategist or builder session and the task already has a `task_state_ref:` in its backlog item frontmatter, read your role's pointer FIRST before any broader corpus walk.** That's the load-bearing primer rule — it should cut cold-start from ~3 MCP calls + ~3-4 min down to 0-1 MCP calls + <60s.

## Memory equivalence (Codex vs Claude Code)

Claude Code auto-loads `~/.claude/projects/.../memory/MEMORY.md` (one-line hooks for project memory like timezone, commercial focus, and north star). Codex CLI has no equivalent auto-load. Until the founder wires a Codex memory mechanism:

- The founder will paste relevant MEMORY.md hooks into your session preamble at the start of any session where memory context matters.
- If a strategic question turns on a load-bearing fact you don't have (e.g., "which ECHO system is the product?", "what's the founder's timezone?"), ASK before guessing. Do not silently default to a generic answer that would have been overridden by memory.
- Today's load-bearing hooks: timezone is PDT (`America/Los_Angeles`); Team product + meeting→brief commercial focus; client-machine endpoint after assisted onboarding; G2 lifted with the post-lift proposed-review gate active; commit approved specs immediately; log every ECHO MCP call in the moment.

## Project Mission

ECHO's current commercial product is the Team decision product: meetings and team activity become decisions, follow-through, and useful briefs. Meeting→brief is the first wedge. The cross-tool context layer and agent-orchestration system remain internal assets.

Brand promise from `CLAUDE.md`:

> "We don't make AI smarter. We make every AI smarter about you."

## Canonical Reads

For any strategic or implementation work in this repo, read:

1. `CLAUDE.md` - project mission, wiki/backlog discipline, role split, and pipeline.
2. `raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md` - locked product/commercial direction.
3. `raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md` - four-stage maturity and qualification contract.
4. `raw/internal/decisions/2026-07-10-project-echo-orientation-and-closure.md` - current halt and productization gates.
5. `docs/AGENT_INSTRUCTIONS.md` - builder-agent execution loop.
6. `backlog/README.md` - backlog mechanics and atomic claim details.
7. The relevant backlog item and all of its `spec_refs`, if working on an item.

The wiki is readable context, but it mixes current and historical shipped regimes. Check supersession banners and current decisions before treating any page as authority; active specs live in backlog items.

### Codex skill discovery

If you are running as a codex binding and want ECHO's protocol skills to appear in Codex skill discovery, run `tools/install-echo-codex-skills.sh` from the repo root. It renders every canonical `skills/*.md` file into `~/.codex/skills/ECHO:<skill-name>/SKILL.md` with Codex-shaped frontmatter and an `.echo-managed` sentinel. Use `--dry-run` to inspect, `--namespace NAME` to change the prefix, or `--underscore-names` if a Codex UI needs names like `ECHO:process_backlog` instead of `ECHO:process-backlog`. Re-run the installer after canonical `skills/*.md` changes; `tools/sync-skills.sh` only maintains Claude Code command copies.

## Role Discipline

ECHO uses three roles:

- **Strategist:** talks with the founder, makes decisions, writes backlog specs, does not edit `wiki/` until shipped items move to `complete/`. **May also review and prep merges** for `pending_review/` items per the Reviewer Independence Rule.
- **Builder agent:** claims one backlog item, works in an isolated worktree, implements only acceptance criteria, logs the run, moves the item to review. **Never reviews or merges its own work; never runs `git merge` on `main` at all.**
- **Founder:** gives final approval at the two irreversible repository-merge moments — (a) substantive conflict resolution, (b) `git push origin main`. A Team-product artifact release has a separate third approval bound to `source SHA + version + artifact SHA-256`; main-push approval never counts as release approval. Handles end-to-end review when no strategist or independent reviewer is available. Asks the strategist to promote shipped decisions to the wiki.

**Reviewer Independence Rule:** the reviewer-and-merger of any item must be a different role/agent than the builder. Preference order: strategist → second builder agent (not the one that built this item) → founder. Self-review is structurally weaker than independent review and is not allowed. Codex acting as a builder must never review its own diff into `main`; it may be asked to review a *different* builder's pending item, in which case it operates in reviewer mode (read-only on the feature branch, write-allowed on `review_notes` and merge-prep, never running `git merge`/`git push` without founder green-light).

Codex must identify which role the current user request implies. Product specification and boundary work remains strategist work until a proposal is reviewed and promoted to `ready/`. Normal coding tasks against a ready item use builder mode unless the user is brainstorming strategy, asking for explanation only, or asking for review of another agent's work.

### Strategist speccing checklist (after G2, when drafting `backlog/proposed/<id>.md`)

**Create the proposal set in one response, then commit + push it together.** Use `backlog/README.md` for the current schema and the most recently reviewed comparable spec for content shape. Do not copy an older ready-stage spec around the proposed-review gate.

1. **The spec file.** Frontmatter MUST include:
   - `id`, `title`, `status: proposed`, `priority`, `estimate`, `created`, `blocked_by`.
   - Omit `ready_content_sha`; the watcher/founder stamps it only when review convergence promotes the item to `ready/`.
   - `task_state_ref: <id>` — **self-reference** to the task-state pointer dir. Required for the cold-start primer to find the pointer. (047's pattern: `task_state_ref: 2026-05-13-047-codex-as-builder-binding-adapter`.)
   - `requested_reviewers: ["codex", "cursor"]` — cross-vendor pair is the post-047 default.
   - `files_to_modify:` — bulleted list, one-line `# why` comment per entry.
   - `spec_refs:` — bulleted list of paths the builder MUST read before code, one-line `# why` comment per entry.
   - `claimed_by`, `claimed_at`, `branch`, `head_sha`, `pr_url`, `agent_notes` — present but empty; the agent fills these on claim.

   Body sections, **in this exact order**:
   - `## Why this spec exists` — motivation + which Team-product carve/closure outcome or `_followups.md` line this serves.
   - `## Acceptance Criteria` — `AC1`, `AC2`, ... as level-3 headings (`### AC1 — <one-line>`), each with file:line precision and concrete test contracts.
   - `## Out of Scope (Don't Drift)` — explicit + comprehensive bullets.
   - `## Risks` (or `## Risk Register`, matching 047) — what could go wrong; fallback; non-fix candidates.
   - `## Tests` — concrete vitest test file paths + the assertions they make. Mandatory; do not bury inside an AC.
   - `## After Completion (Strategist Notes)` — which wiki pages get created/updated post-shipment; which `_followups.md` lines this spec retires; cross-cuts to other in-flight items.

2. **The strategist.md task-state pointer** at `backlog/task-state/<id>/strategist.md`. Five required level-2 blocks (`current_thesis`, `locked_decisions`, `open_questions`, `dont_touch`, `canonical_anchors`); ≤120 body lines (target 40–60). `locked_decisions` is the load-bearing block — capture every design pick + rejected alternatives. Lint with `python3 tools/task-state/lint.py <path>` before commit. Full schema in `skills/role-typed-task-state.md` "Initial strategist.md content at spec creation."

3. **Supporting artifact updates** in the same commit (or the immediately-next commit):
   - `backlog/_followups.md` — retire the line this spec resolves (annotate "→ SPECCED as `<path>`").
   - Regenerate `docs/BACKLOG.md` with `python3 tools/backlog_index.py`; never hand-edit the generated index.

**Commit + push the proposed spec, task-state pointer, and followup disposition together.** Reviewers need the proposal on `origin/main`; it is not claimable until the watcher/founder promotes it with a fresh `ready_content_sha`.

**Pre-commit verifications** (run before the commit):
- `python3 tools/backlog_index.py` — regenerate the stage-derived index; the proposal must not be selectable yet.
- `tools/sync-skills.sh --check` — confirm no adapter drift if you touched `skills/`.
- `python3 tools/task-state/lint.py backlog/task-state/<id>/strategist.md` — confirm pointer schema compliance.
- `git diff --check` — confirm no conflict markers in the staged changes.

## Repo Discipline From `CLAUDE.md`

- Search existing wiki and backlog before creating new concepts.
- G2 is lifted. Actionable build decisions begin as `backlog/proposed/<id>.md`, not wiki pages or direct-to-ready items.
- Put non-actionable background reasoning in `raw/internal/decisions/`.
- Put research notes in `raw/external/precedents/` or `raw/external/competitor-scans/`.
- Put validation and interview notes in `raw/internal/interviews/`.
- Do not update `.manifest.json` unless a wiki page is actually created post-shipment.

## Wiki Discipline

Do not edit `wiki/` during implementation unless the user explicitly asks for a strategist/wiki-promotion task and the relevant item has shipped. If a backlog spec asks a builder to edit `wiki/` but repo instructions or hooks forbid it, stop and surface the conflict.

The wiki taxonomy from `CLAUDE.md` is:

- `product/` - strategic what
- `principles/` - active commitments
- `architecture/` - durable substrate
- `capture/` and `capture/per-app/` - L1 capture surfaces
- `surfaces/` - user and AI-client touchpoints
- `research/` - validation
- `operating-model/` - process meta

Use kebab-case filenames and filename-only wikilinks when wiki work is explicitly in scope.

## Builder-Agent Loop

When acting as a builder agent, follow `docs/AGENT_INSTRUCTIONS.md` exactly:

1. Resolve persona ID.
2. Pull main.
3. Reconcile any existing claim.
4. Run `python3 tools/blocked.py`.
5. Atomically claim one item.
6. Create or reuse the isolated worktree.
7. Read every `spec_ref`.
8. Implement acceptance criteria only.
9. Run relevant tests.
10. Commit and push the feature branch.
11. Append `raw/internal/agent-runs/<date>-<item-id>.md`.
12. Move the item to `pending_review/` with `agent_notes`.

One item per run unless the user explicitly invokes the documented batch workflow. If uncertainty needs founder input, stop and move the item to review with the question. Do not silently expand scope.

Items 136-139 have one narrow founder-authorized successor-repository exception recorded in raw/internal/decisions/2026-07-15-echo-context-successor-repository-execution.md. For those items only, follow the two-repository and external-execute protocol in docs/AGENT_INSTRUCTIONS.md. Target fields are mandatory only for items 136-138, which modify echo-context source; item 139 consumes their canonical landed SHAs and has no target-source lane. Missing applicable fields, independent review, canonical-main readback, or exact-artifact founder approval is a hard stop. The default no-external-write rule remains unchanged for every other item.

## Drift Prevention

The `CLAUDE.md` drift rules apply to Codex:

- Read `spec_refs` before writing code.
- Respect every "Out of Scope (Don't Drift)" section.
- Do not implement tempting adjacent work unless it is in acceptance criteria.
- If drift appears necessary, write a drift note in `raw/internal/decisions/`, explain the question in `agent_notes`, and stop.

## Current Product Reminder

- Commercial product: Team decision product.
- First wedge: meeting→brief; pain/demand are closed.
- Graduation: DEV -> FOUNDER LIVE -> QUALIFIED -> CLIENT LIVE; the current candidate is formally DEV with predecessor founder-regime evidence, and a versioned, pinned, isolated candidate-package run is the next gate. Qualification permits client acceptance; useful and repeat client use earns CLIENT LIVE.
- Goal: assisted onboarding, then install/use on the client's Mac without founder-machine or repo dependency.
- Internal only unless required: Machine context and Fleet orchestration.
- Keep out: unrelated lab workers, destination-app work, and autonomous external action.
- Done: after assisted installation on the client machine, the client runs a real meeting, receives a useful brief, and repeats independently.

## ECHO MCP Dogfooding Log

Every Codex interaction with ECHO must be logged to Codex's canonical current-month cross-tool journal shard:

`raw/internal/dogfooding/mcp-interactions-journal-YYYY-MM-codex.md` (currently `raw/internal/dogfooding/mcp-interactions-journal-2026-07-codex.md`)

The journal is now a per-actor shard set, not one shared monthly file. Actor slugs are lowercase binding identities matching `^[a-z][a-z0-9-]*$`; Codex writes `codex`, codex-ops writes `codex-ops`, Claude Code / strategist / watcher write `claude`, and Cursor's Claude writes `cursor`. To read the full month, run `tools/dogfooding/journal-cat.sh YYYY-MM`; it merges per-actor shards plus any frozen legacy shared file in chronological order. Do not append new entries to `raw/internal/dogfooding/mcp-interactions-journal-YYYY-MM.md`; the June 2026 shared file is pre-shard history only.

This applies to every call to ECHO MCP tools, including:

- `get_recent_work_context`
- `search_memories`
- `echo_ping`
- any equivalent local CLI, curl, or MCP-client call against ECHO

If a Codex invocation reads files / runs git / runs scripts but makes zero ECHO MCP calls, do not journal it. Mechanical activity belongs in review responses, commits, and run logs; the journal is for MCP-call discipline and surprising ECHO retrieval failures.

Log in the moment, using the journal's local-time template. Include:

- trigger: what the user or AI client was trying to do
- tool and query inputs
- returned shape: clusters/events/atoms, top label or anchors, rank reasons when present
- verdict: right, partial, or wrong
- note: what felt useful, missing, too large, stale, or surprising
- conjecture: optional follow-up idea

If one task makes several ECHO calls, one detailed journal entry is acceptable as long as it lists each call and the relevant result. Do not paste huge raw payloads into the journal; summarize them and save or link a sample file when raw data matters.
