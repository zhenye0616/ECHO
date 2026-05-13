---
title: ECHO skills are the cross-tool collaboration protocol (not Claude-specific helpers)
date: 2026-05-13
type: strategic / architectural decision
status: enacted
---

## Decision

The slash-command skills that drive ECHO's multi-agent workflows — `process-backlog`, `process-backlog-batch`, `review-pending`, `merge-and-cleanup`, `review-queue-codex`, `review-queue-cursor`, `review-queue-codex-ops`, `review-queue-watch` — are **ECHO skills**, not Claude skills. The canonical content lives under `skills/` at the repo root (vendor-neutral, ECHO-namespaced). Each AI client has a per-client adapter directory; for Claude Code that's `.claude/commands/<name>.md`, maintained as a real-file copy by `tools/sync-skills.sh`.

## Why this matters (and why now)

The original ECHO wedge had multiple pillars (cross-vendor neutrality, user-owned context, felt-not-seen surface, etc.), but the framing that Anthropic could most easily erode was "one interface for all tools." Anthropic is now actively expanding into every industry/domain/market and combining tools internally — the simple "interface aggregator" pitch is structurally weak.

In a brainstorm pass on 2026-05-13, the wedge analysis converged on **cross-vendor neutrality as the strongest STRUCTURAL gap** in Anthropic's offering. Anthropic structurally can't be vendor-neutral because they ARE a vendor; making Claude one option among many would undermine their core business.

The user then surfaced the operational expression of that wedge: **the operating-model skills aren't Claude-specific helpers, they're the inter-tool collaboration protocol.** Claude Code is one of several AI clients that speaks the protocol — alongside Cursor's Claude (as builder), Codex (as headless reviewer), web ChatGPT or other clients (future adapters). The skills define the *grammar* by which these tools coordinate as peers; ECHO is the substrate (storage, MCP, capture, atomic-claim, queue-errors logging) that hosts the protocol.

> "the code is the harness that allows the cross tools/vendor collaboration, skills is the mutual understanding"
> — founder, 2026-05-13 ~16:00 PDT

The implication: putting the skills under `.claude/commands/` as the source of truth perpetuates the (incorrect) framing that they're Claude artifacts. Moving them to `skills/` re-frames them as ECHO artifacts that *Claude Code happens to consume*, alongside other clients that will be added.

## Architecture (as enacted)

**Canonical location:** `skills/<name>.md` (real files, vendor-neutral).

**Per-client adapter directories:**
- **Claude Code:** `.claude/commands/<name>.md` (real-file copies, maintained by sync script). Symlinks were tested first and rejected — Claude Code's skill-discovery mechanism does NOT follow file-level symlinks; ECHO skills disappear from the available-skills list when symlinked. Sync script + identity check is the durable substitute.
- **Cursor's Claude:** TBD. Likely `.cursor/commands/` (if Cursor follows the same convention as Claude Code) or via Cursor MCP. Pattern: same sync recipe, different adapter directory. Add when first Cursor-driven skill invocation is needed.
- **Codex (headless):** TBD. Codex's `codex exec` reads the prompt from stdin; the existing `_run_reviewer.sh` wrapper passes a single skill file via `< "$PROMPT"`. Generalizing: a per-skill loader that resolves to `skills/<name>.md`. Already implicitly works today because the launchd plist hardcodes the path; future generalization will explicitly reference `skills/` rather than `.claude/commands/`.
- **Web ChatGPT / OpenAI / etc.:** TBD. Likely a new MCP tool `echo_skill(name)` that returns the canonical content. Each non-Anthropic client invokes the tool to load the skill into context before executing the protocol step.

**Sync mechanism:** `tools/sync-skills.sh`
- `tools/sync-skills.sh` — copy canonical content from `skills/` to `.claude/commands/`
- `tools/sync-skills.sh --check` — verify identity; exit non-zero on drift (suitable for pre-commit hook or CI)

**Drift prevention:** the `--check` mode is the durable invariant. A pre-commit hook (or CI step) calling `tools/sync-skills.sh --check` rejects commits that touch `skills/` without re-running the sync.

## What was rejected and why

- **File-level symlinks (`.claude/commands/<name>.md` → `../../skills/<name>.md`):** Tested first. Filesystem and Read tool follow the symlinks correctly, but Claude Code's skill-discovery walks `.claude/commands/` looking for real files; symlinks make the ECHO skills disappear from the available-skills list at session start. Verified empirically on 2026-05-13 ~16:01 PDT.
- **Directory-level symlink (`.claude/commands` → `../skills`):** Not tested, but the per-file failure suggests Claude Code's discovery may have similar quirks at the directory level. The sync-script approach avoids the gamble.
- **`.claude/commands/` as the canonical source:** This is the path of least resistance (no sync needed) but perpetuates the "Claude owns the protocol" framing the decision is explicitly trying to undo. Rejected on semantics, not technicals.
- **A separate `protocol/` directory:** Was considered as more explicit than `skills/`. Rejected because `skills/` matches the Claude Code / Anthropic SDK / Copilot CLI vocabulary already in use — semantic friction.

## Consequences

- **Forward-compatible with new AI clients.** Adding Cursor's Claude or Codex as a first-class skill consumer means adding a per-client adapter directory + extending `tools/sync-skills.sh`. The canonical content stays in one place.
- **Skill editing workflow:** edit `skills/<name>.md`, then run `tools/sync-skills.sh`. Pre-commit hook (TBD as a follow-up) enforces this at commit time.
- **`.claude/commands/` is no longer hand-edited.** It's a derived artifact, like compiled output. Documentation in CLAUDE.md should reflect this.
- **The cross-vendor wedge has a concrete operational expression.** ECHO's protocol is in a location that explicitly does NOT belong to Anthropic. Cursor users opening the repo find `skills/` naturally; Claude Code users find `.claude/commands/` as an implementation detail.

## Related

- `wiki/principles/context-as-moat.md` — pre-existing pillar; this decision extends "context-as-moat" to "protocol-as-moat" for inter-tool collaboration.
- `wiki/principles/layer-above-saas.md` — related framing; the skills are part of the layer-above-SaaS surface.
- `backlog/complete/2026-05-13-043-per-round-reviewer-roster.md` — 043's "Adding a Reviewer Changelist" foreshadowed this: adding a new reviewer was already 5 files + 1 slash command, treating slash commands as protocol artifacts.
- `~/.claude/projects/-Users-zhenye-Desktop-Project-echo/memory/project_friction_first_prioritization.md` — friction-first directive. This decision is architectural and was directed explicitly by the founder; not a violation of the directive.

## Next steps (deferred, not in this commit)

- **Pre-commit hook calling `tools/sync-skills.sh --check`.** Closes drift at commit time. Tiny scope; defer to 046 friction-fix bundle.
- **Cursor's Claude adapter directory** when first needed. Probably `.cursor/commands/` or via Cursor's MCP/rules surface.
- **MCP `echo_skill(name)` tool** for non-Anthropic clients (Codex, web ChatGPT, etc.). Returns canonical content from `skills/`. Lives in the ECHO MCP server.
- **Wiki promotion:** after the friction queue is empty (per friction-first directive), promote this decision into `wiki/architecture/cross-tool-protocol.md` and update `wiki/principles/context-as-moat.md` to reference it.
