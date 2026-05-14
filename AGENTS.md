# AGENTS.md - Codex Working Instructions for ECHO

This file is the Codex-facing companion to `CLAUDE.md`, which is the canonical project guide for ECHO. Codex should read `CLAUDE.md` first and treat it as the source of truth. This file exists so Codex-native sessions can pick up the same operating model, plus Codex-specific dogfooding rules.

If this file ever conflicts with `CLAUDE.md`, `docs/AGENT_INSTRUCTIONS.md`, `backlog/README.md`, or an active backlog item's acceptance criteria, stop and surface the conflict instead of guessing.

## Current operating gate (read before doing anything strategic)

**Friction-first prioritization (post-044, sharpened post-047 on 2026-05-13).** Zero new architecture / V1.5+ feature specs until BOTH of these end-state conditions hold:

- **(e1) Founder fully out of the loop.** A complete spec→ship cycle runs with zero in-queue founder activations (extends 042 AC8 metric).
- **(e2) Vendor-agnostic at every role.** ≥2 interoperable vendor bindings per role; no role's protocol depends structurally on one vendor's quirks.

Today's per-role vendor coverage (post-047 merge):

| Role | Vendor coverage | Status |
|---|---|---|
| Reviewer | codex + cursor (Claude) + codex-ops | ✓ multi-vendor |
| Builder | Claude Code + Cursor's Claude + codex (047) | ✓ multi-vendor (Anthropic + OpenAI) |
| Strategist | Claude (Claude Code only today; THIS codex session is the second-vendor test) | ✗ single-vendor — actively being tested |
| Watcher | unspecified | ✗ |
| Dispatcher | unspecified | ✗ |

Until BOTH (e1) AND (e2) hold, every new spec must directly serve (e1) or (e2) or eliminate operating-model friction enumerated in `backlog/_followups.md` or the dogfooding journal. No greenfield architecture work.

## Role-typed task-state pointers (046+)

ECHO ships a compact working-memory snapshot at `backlog/task-state/<task-id>/<role>.md` per role binding. Continuity roles (strategist, builder, watcher, dispatcher) write these; reviewer ticks DO NOT read or write them (fresh-eyes-at-SHA invariant). Full schema + read/write protocol in `skills/role-typed-task-state.md`. Cold-start primer in `skills/using-superpowers.md` (the ECHO-namespaced file at the repo root's skills directory; this is distinct from the superpowers-plugin skill of the same name).

**If you are starting a strategist or builder session and the task already has a `task_state_ref:` in its backlog item frontmatter, read your role's pointer FIRST before any broader corpus walk.** That's the load-bearing primer rule — it should cut cold-start from ~3 MCP calls + ~3-4 min down to 0-1 MCP calls + <60s.

## Memory equivalence (Codex vs Claude Code)

Claude Code auto-loads `~/.claude/projects/.../memory/MEMORY.md` (one-line hooks for project memory like timezone, friction-first gate, north star). Codex CLI has no equivalent auto-load. Until the founder wires a Codex memory mechanism:

- The founder will paste relevant MEMORY.md hooks into your session preamble at the start of any session where memory context matters.
- If a strategic question turns on a load-bearing fact you don't have (e.g., "what's the friction-first gate?", "what's the founder's timezone?"), ASK before guessing. Do not silently default to a generic answer that would have been overridden by memory.
- Today's load-bearing memory hooks: timezone is PDT (`America/Los_Angeles`); friction-first gate per `(e1)+(e2)` above; commit specs immediately on creation; log every ECHO MCP call to the journal in-the-moment.

## Project Mission

ECHO is the cross-platform context layer for AI-era knowledge work. It makes every AI surface smarter by unifying context across the user's tools, while staying invisible through the browser extension, MCP server, and hotkey overlay rather than becoming a destination app.

Brand promise from `CLAUDE.md`:

> "We don't make AI smarter. We make every AI smarter about you."

## Canonical Reads

For any strategic or implementation work in this repo, read:

1. `CLAUDE.md` - project mission, wiki/backlog discipline, role split, and pipeline.
2. `docs/AGENT_INSTRUCTIONS.md` - builder-agent execution loop.
3. `backlog/README.md` - backlog mechanics and atomic claim details.
4. The relevant backlog item and all of its `spec_refs`, if working on an item.

The wiki is readable context, but do not treat planned ideas as shipped reality. Per `CLAUDE.md`, product wiki pages document shipped or committed reality; active specs live in backlog items.

## Role Discipline

ECHO uses three roles:

- **Strategist:** talks with the founder, makes decisions, writes backlog specs, does not edit `wiki/` until shipped items move to `complete/`. **May also review and prep merges** for `pending_review/` items per the Reviewer Independence Rule.
- **Builder agent:** claims one backlog item, works in an isolated worktree, implements only acceptance criteria, logs the run, moves the item to review. **Never reviews or merges its own work; never runs `git merge` on `main` at all.**
- **Founder:** gives final approval at the two irreversible moments — (a) substantive conflict resolution, (b) `git push origin main`. Handles end-to-end review when no strategist or independent reviewer is available. Asks the strategist to promote shipped decisions to the wiki.

**Reviewer Independence Rule:** the reviewer-and-merger of any item must be a different role/agent than the builder. Preference order: strategist → second builder agent (not the one that built this item) → founder. Self-review is structurally weaker than independent review and is not allowed. Codex acting as a builder must never review its own diff into `main`; it may be asked to review a *different* builder's pending item, in which case it operates in reviewer mode (read-only on the feature branch, write-allowed on `review_notes` and merge-prep, never running `git merge`/`git push` without founder green-light).

Codex must identify which role the current user request implies. For normal coding tasks in this repo, behave like a builder agent unless the user is explicitly brainstorming strategy, asking for explanation only, or asking you to review another agent's pending work.

### Strategist speccing checklist (when you draft a new `backlog/ready/<id>.md`)

**Three artifacts in one response, all committed + pushed.** Reference the most-recent shipped spec (today: `backlog/complete/2026-05-13-047-codex-as-builder-binding-adapter.md`) as the canonical shape — copy its frontmatter pattern and body-section ordering verbatim, then adapt content.

1. **The spec file.** Frontmatter MUST include:
   - `id`, `title`, `status: ready`, `priority`, `estimate`, `created`.
   - `task_state_ref: <id>` — **self-reference** to the task-state pointer dir. Required for the cold-start primer to find the pointer. (047's pattern: `task_state_ref: 2026-05-13-047-codex-as-builder-binding-adapter`.)
   - `requested_reviewers: ["codex", "cursor"]` — cross-vendor pair is the post-047 default.
   - `files_to_modify:` — bulleted list, one-line `# why` comment per entry.
   - `spec_refs:` — bulleted list of paths the builder MUST read before code, one-line `# why` comment per entry.
   - `claimed_by`, `claimed_at`, `branch`, `head_sha`, `pr_url`, `agent_notes` — present but empty; the agent fills these on claim.

   Body sections, **in this exact order**:
   - `## Why this spec exists` — motivation + which (e1)/(e2) condition or `_followups.md` line this serves.
   - `## Acceptance Criteria` — `AC1`, `AC2`, ... as level-3 headings (`### AC1 — <one-line>`), each with file:line precision and concrete test contracts.
   - `## Out of Scope (Don't Drift)` — explicit + comprehensive bullets.
   - `## Risks` (or `## Risk Register`, matching 047) — what could go wrong; fallback; non-fix candidates.
   - `## Tests` — concrete vitest test file paths + the assertions they make. Mandatory; do not bury inside an AC.
   - `## After Completion (Strategist Notes)` — which wiki pages get created/updated post-shipment; which `_followups.md` lines this spec retires; cross-cuts to other in-flight items.

2. **The strategist.md task-state pointer** at `backlog/task-state/<id>/strategist.md`. Five required level-2 blocks (`current_thesis`, `locked_decisions`, `open_questions`, `dont_touch`, `canonical_anchors`); ≤120 body lines (target 40–60). `locked_decisions` is the load-bearing block — capture every design pick + rejected alternatives. Lint with `python3 tools/task-state/lint.py <path>` before commit. Full schema in `skills/role-typed-task-state.md` "Initial strategist.md content at spec creation."

3. **Supporting artifact updates** in the same commit (or the immediately-next commit):
   - `docs/BACKLOG.md` — append a row to the Ready table for the new item.
   - `backlog/_followups.md` — retire the line this spec resolves (annotate "→ SPECCED as `<path>`").

**Commit + push all three together.** Atomic-claim by builder agents requires specs on `origin/main` — working-tree-only specs are invisible to the claim flow. This is a load-bearing project memory hook (`feedback_commit_specs_immediately`).

**Pre-commit verifications** (run before the commit):
- `python3 tools/blocked.py` — confirm the new item is selectable.
- `tools/sync-skills.sh --check` — confirm no adapter drift if you touched `skills/`.
- `python3 tools/task-state/lint.py backlog/task-state/<id>/strategist.md` — confirm pointer schema compliance.
- `git diff --check` — confirm no conflict markers in the staged changes.

## Repo Discipline From `CLAUDE.md`

- Search existing wiki and backlog before creating new concepts.
- Capture actionable new decisions as `backlog/ready/<id>.md`, not as wiki pages.
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

## Drift Prevention

The `CLAUDE.md` drift rules apply to Codex:

- Read `spec_refs` before writing code.
- Respect every "Out of Scope (Don't Drift)" section.
- Do not implement tempting adjacent work unless it is in acceptance criteria.
- If drift appears necessary, write a drift note in `raw/internal/decisions/`, explain the question in `agent_notes`, and stop.

## V1 Scope Reminder

Keep the V1 tape-above-desk from `CLAUDE.md` in mind:

- Cohort: indie AI builders and dev founders.
- Bundle: Cursor, Claude Code, GitHub, Slack, web AI extension.
- Form: browser extension, MCP server, hotkey overlay; no destination app.
- Layers: L1 passive ingestion, L3 summoned Q&A/assembly, minimal L5 audit.
- Cut from V1: Email, Linear, Notion, meetings, Zoom, calendar.
- Cut layers: L2 ambient, L4 conversational, autonomous agent action.
- Done: killer demo works in the founder's daily workflow with no hand-staging.

## ECHO MCP Dogfooding Log

Every Codex interaction with ECHO must be logged to the canonical cross-tool journal:

`raw/internal/dogfooding/mcp-interactions-journal.md`

This applies to every call to ECHO MCP tools, including:

- `get_recent_work_context`
- `search_memories`
- `echo_ping`
- any equivalent local CLI, curl, or MCP-client call against ECHO

Log in the moment, using the journal's local-time template. Include:

- trigger: what the user or AI client was trying to do
- tool and query inputs
- returned shape: clusters/events/atoms, top label or anchors, rank reasons when present
- verdict: right, partial, or wrong
- note: what felt useful, missing, too large, stale, or surprising
- conjecture: optional follow-up idea

If one task makes several ECHO calls, one detailed journal entry is acceptable as long as it lists each call and the relevant result. Do not paste huge raw payloads into the journal; summarize them and save or link a sample file when raw data matters.
