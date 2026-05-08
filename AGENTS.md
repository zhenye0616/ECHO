# AGENTS.md - Codex Working Instructions for ECHO

This file is the Codex-facing companion to `claude.md`, which is the canonical project guide for ECHO. Codex should read `claude.md` first and treat it as the source of truth. This file exists so Codex-native sessions can pick up the same operating model, plus Codex-specific dogfooding rules.

If this file ever conflicts with `claude.md`, `docs/AGENT_INSTRUCTIONS.md`, `backlog/README.md`, or an active backlog item's acceptance criteria, stop and surface the conflict instead of guessing.

## Project Mission

ECHO is the cross-platform context layer for AI-era knowledge work. It makes every AI surface smarter by unifying context across the user's tools, while staying invisible through the browser extension, MCP server, and hotkey overlay rather than becoming a destination app.

Brand promise from `claude.md`:

> "We don't make AI smarter. We make every AI smarter about you."

## Canonical Reads

For any strategic or implementation work in this repo, read:

1. `claude.md` - project mission, wiki/backlog discipline, role split, and pipeline.
2. `docs/AGENT_INSTRUCTIONS.md` - builder-agent execution loop.
3. `backlog/README.md` - backlog mechanics and atomic claim details.
4. The relevant backlog item and all of its `spec_refs`, if working on an item.

The wiki is readable context, but do not treat planned ideas as shipped reality. Per `claude.md`, product wiki pages document shipped or committed reality; active specs live in backlog items.

## Role Discipline

ECHO uses three roles:

- **Strategist:** talks with the founder, makes decisions, writes backlog specs, does not edit `wiki/` until shipped items move to `complete/`. **May also review and prep merges** for `pending_review/` items per the Reviewer Independence Rule.
- **Builder agent:** claims one backlog item, works in an isolated worktree, implements only acceptance criteria, logs the run, moves the item to review. **Never reviews or merges its own work; never runs `git merge` on `main` at all.**
- **Founder:** gives final approval at the two irreversible moments — (a) substantive conflict resolution, (b) `git push origin main`. Handles end-to-end review when no strategist or independent reviewer is available. Asks the strategist to promote shipped decisions to the wiki.

**Reviewer Independence Rule:** the reviewer-and-merger of any item must be a different role/agent than the builder. Preference order: strategist → second builder agent (not the one that built this item) → founder. Self-review is structurally weaker than independent review and is not allowed. Codex acting as a builder must never review its own diff into `main`; it may be asked to review a *different* builder's pending item, in which case it operates in reviewer mode (read-only on the feature branch, write-allowed on `review_notes` and merge-prep, never running `git merge`/`git push` without founder green-light).

Codex must identify which role the current user request implies. For normal coding tasks in this repo, behave like a builder agent unless the user is explicitly brainstorming strategy, asking for explanation only, or asking you to review another agent's pending work.

## Repo Discipline From `claude.md`

- Search existing wiki and backlog before creating new concepts.
- Capture actionable new decisions as `backlog/ready/<id>.md`, not as wiki pages.
- Put non-actionable background reasoning in `raw/internal/decisions/`.
- Put research notes in `raw/external/precedents/` or `raw/external/competitor-scans/`.
- Put validation and interview notes in `raw/internal/interviews/`.
- Do not update `.manifest.json` unless a wiki page is actually created post-shipment.

## Wiki Discipline

Do not edit `wiki/` during implementation unless the user explicitly asks for a strategist/wiki-promotion task and the relevant item has shipped. If a backlog spec asks a builder to edit `wiki/` but repo instructions or hooks forbid it, stop and surface the conflict.

The wiki taxonomy from `claude.md` is:

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

The `claude.md` drift rules apply to Codex:

- Read `spec_refs` before writing code.
- Respect every "Out of Scope (Don't Drift)" section.
- Do not implement tempting adjacent work unless it is in acceptance criteria.
- If drift appears necessary, write a drift note in `raw/internal/decisions/`, explain the question in `agent_notes`, and stop.

## V1 Scope Reminder

Keep the V1 tape-above-desk from `claude.md` in mind:

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
