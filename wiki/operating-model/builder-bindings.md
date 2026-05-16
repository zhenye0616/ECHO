---
status: shipped
topic: Process
subtopic: Builder Bindings
aliases:
  - Builder Bindings
  - Builder Binding Matrix
  - Vendor-Agnostic Builder
---

# Builder Bindings

ECHO's builder role — the agent that claims a spec from `backlog/ready/`, works it inside an isolated worktree, and walks it to `backlog/pending_review/` — is **vendor-agnostic**. The same canonical protocol body in `skills/process-backlog.md` runs under three independent bindings; each has its own trigger mode but shares the same atomic-claim, worktree, and move-to-pending_review semantics. This page is the matrix; per-binding mechanics live at the bottom of `skills/process-backlog.md` and in dedicated operator-facing docs under `docs/`.

The matrix matters because vendor-agnosticism at the builder role is one of the (b)-gate-lift criteria in the friction-first directive (every role bound to ≥2 vendors so a single vendor outage or pricing shift cannot stall the pipeline). After item 055 shipped (2026-05-15), builder is bound to three independent vendors.

## The three bindings

| Binding | Trigger mode | Wrapper | Spec-of-record | Operator doc |
|---|---|---|---|---|
| **Claude Code** in-session | conversational — founder asks Claude Code (this session) to claim | none — implicit default | implicit since project start | `skills/process-backlog.md` (used directly via `/process-backlog`) |
| **codex** | headless (launchd / on-demand `codex exec`) | `tools/run-codex-builder.sh` | item 047 | `docs/codex-builder-setup.md` |
| **Cursor's Claude** (IDE-mode) | founder paste-driven inside Cursor IDE chat | none — paste skill prose | item 055 | `docs/cursor-builder-trigger.md` |

All three bindings:

- Read the canonical protocol from `skills/process-backlog.md` (Cursor reads it directly from the open repo; Claude Code reads its synced `.claude/commands/` copy; codex reads its synced `adapters/codex/skills/process-backlog/SKILL.md` adapter — all three kept in sync by `tools/sync-skills.sh`).
- Perform the atomic-claim commit (`ready/<id>.md → claimed/<id>.md` with `claimed_by`, `claimed_at`, `branch` populated in frontmatter) on `main`, push, and lose-or-win.
- Create the worktree at `~/Desktop/Project_echo--<slug>/` on a fresh `agent/<slug>` branch.
- Write `backlog/task-state/<id>/builder.md` via direct commit (single-owner invariant; no CAS) per item 046 AC1's writer-responsibilities table.
- Journal every `mcp__echo__*` call in-the-moment to `raw/internal/dogfooding/mcp-interactions-journal.md` with the 6-field template.
- Move the item to `pending_review/` with `agent_notes`, `head_sha`, and (where applicable) `pr_url` when acceptance criteria pass.

What differs is **only** the trigger mode and the wrapper plumbing; the protocol body itself is unchanged.

## Why three bindings, not one wrapper-per-binding

A natural-but-wrong instinct is to wrap every binding behind an identical shell driver. ECHO deliberately doesn't:

- **Claude Code** runs the protocol in-session as part of an ongoing strategist conversation — wrapping it would force a separate process and discard the contextual benefits of the live session.
- **codex** is headless-capable (`codex exec --sandbox workspace-write`) so a 5-line wrapper (`tools/run-codex-builder.sh`) is enough to fire it from launchd or on demand.
- **Cursor's Claude** has no headless mode today; Cursor IDE is interactive. The trigger is therefore a paste-into-chat ritual mirroring the existing reviewer binding (`skills/review-queue-cursor.md`). No wrapper is necessary or useful.

If Cursor (or any future vendor) ships a headless builder mode, the matrix grows with a new wrapper; the protocol body stays untouched. Adding a fourth binding is a small spec — one new "Binding-specific notes" section in `skills/process-backlog.md`, one operator doc, and (if headless) a 5-line driver.

## Cross-binding race semantics

The **atomic-claim git op is the only synchronization primitive**. There is no lock file, no daemon, no central queue. Two consequences:

- **Cross-machine concurrency is naturally serialized by git.** If two bindings on different machines race the same `ready/<id>.md`, only one push succeeds; the loser observes the conflict on next `git pull` and silently picks a different ready item.
- **Same-machine concurrency is operator-serialized.** All bindings on one machine share `~/.echo/agent-id` (the default `ECHO_AGENT_ID` source) by default, so a concurrent run would look like a resume of the first claim rather than a race — silently attaching a second writer to the same `builder.md` and breaking the single-owner invariant the no-CAS direct-commit contract assumes. **Rule:** at most one builder per `ECHO_AGENT_ID` per machine at a time. For genuinely parallel runs on one machine, set distinct `ECHO_AGENT_ID=<uuid4>` env vars per binding session.

These rules live verbatim in the "Binding-specific notes — Cursor's Claude (IDE-mode)" section of `skills/process-backlog.md` (item 055 AC1) and apply equally to all three bindings.

## Reviewer independence still applies

Per CLAUDE.md's reviewer-independence rule, the builder of an item is never its reviewer. The matrix above expands *who can build*; the merge-and-cleanup gate still requires that the reviewer be a different role/agent (strategist, a second builder agent on a different binding, or founder). See [[review-queue-protocol]] for the reviewer-side matrix and [[cross-tool-spec-review]] for the load-bearing rationale.

## Adding a new binding

If a future AI client (e.g., Gemini CLI, a Replit Agent, a different self-hosted Llama harness) earns a builder binding, the change set is small:

1. Append a "Binding-specific notes — `<name>`" section at the bottom of `skills/process-backlog.md`, mirroring the shape of the codex and Cursor sections.
2. Re-run `tools/sync-skills.sh` to propagate to `.claude/commands/process-backlog.md` and `adapters/codex/skills/process-backlog/SKILL.md`.
3. Add an operator doc under `docs/<binding>-builder-trigger.md` (paste-driven) or `docs/<binding>-builder-setup.md` (headless wrapper).
4. If headless, add a 5-line wrapper under `tools/run-<binding>-builder.sh` mirroring `tools/run-codex-builder.sh`.
5. Update this page's matrix.

No protocol body changes, no schema changes, no `reviewers.json`-style roster file for builders (the builder role is identified by which binding executes `skills/process-backlog.md`, not by config).

## Related

- [[review-queue-protocol]] — the reviewer-side matrix and full pipeline diagram
- [[cross-tool-spec-review]] — why vendor diversity at peer-role positions catches what no single tool catches
