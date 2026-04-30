# NORTH_STAR

**Read this every morning before opening any code.** ~60 seconds.

---

## The Brand Promise (the obsession)

> *We don't make AI smarter. We make every AI smarter about you.*

## What We're Building (V1)

A cross-platform context layer for **indie AI builders** that makes Cursor + Claude Code + GitHub + Slack + web AI conversations all share unified memory. Felt-not-seen. No destination app.

## The Five Tools

1. Cursor (MCP)
2. Claude Code (MCP)
3. GitHub (API)
4. Slack (API)
5. Web AI extension (already shipped)

## The Three Surfaces

1. Browser extension (already shipped)
2. MCP server (local daemon)
3. System-wide hotkey overlay

Plus a minimal audit page for trust. **No standalone chat UI. Ever.**

## The Killer Demo (definition of done)

> *I'm fixing GitHub issue #234. ⌘⇧E. ECHO surfaces: the issue text, the related code from my last 3 commits, the Slack thread where the bug was reported, my prior Claude conversation about the architecture. Cursor sees all of this through MCP. I never opened another tab.*

V1 ships when this works in MY actual daily workflow with no hand-staging. Not before.

---

## Drift Check — Ask Before Any Decision Today

Five questions. If you answer "yes" to any, you're drifting.

1. **Am I building a destination?** (a window the user "goes to," a chat thread that persists, a dashboard) → STOP. Felt-not-seen is the form-factor commitment.

2. **Am I capturing what another tool already captures?** (recording meetings, writing notes, managing tickets) → STOP. Compose, don't capture.

3. **Am I about to add a 6th integration before V1 ships?** → STOP. The V1 bundle is locked at five.

4. **Am I building for a cohort that isn't indie AI builders?** (designers, writers, sales, students) → STOP. Those are V2+ bundles.

5. **Am I building anything in Layer 2 (ambient surfacing) or Layer 4 (conversational dialogue)?** → STOP. Both are V2.

If all five answers are "no," proceed.

---

## Top 5 Non-Goals (the things you'll be tempted by)

These are NOT in V1. Tape above desk. Re-read when tempted.

- ❌ Email integration (V1.5)
- ❌ Linear integration (V1.5)
- ❌ Notion integration (V1.5)
- ❌ Meeting transcripts / Zoom (V2)
- ❌ Any UI surface that isn't the audit page or the hotkey overlay (never)

## Top 5 Drift Patterns (the rationalizations to watch)

These are how you'll talk yourself into building the wrong thing. Catch yourself:

1. *"It's just one more integration..."* — Each one is 5–7 days. Five integrations is 25–35 days, half of V1.
2. *"Users will need a place to manage X..."* — That's the audit page. Don't build a second admin surface.
3. *"What if we also supported [adjacent cohort]?"* — Ship indie AI builders first. Other cohorts are parallel V2 bundles, not V1 stretch.
4. *"It would be nice to surface this proactively..."* — That's Layer 2. V2.
5. *"Users could chat with ECHO about their week..."* — That's Layer 4. V2. Also: makes ECHO a destination, which is the central commitment to never break.

---

## The Source of Truth

When in doubt, the V1 spec wins:
- [V1 Spec (Locked)](./wiki/sources/v1-spec.md)
- [Bundle Decision](./wiki/sources/bundle-decision.md)
- [Form Factor Decision](./wiki/sources/form-factor-decision.md)
- [Narrowest V1 Scope](./wiki/analyses/narrowest-v1-scope.md)

When deciding something not covered by these, write it down in `raw/internal/decisions/` so you don't re-litigate.

---

## Today's Question

> *What is the one thing I will ship today that moves V1 toward the killer demo?*

Answer it before you open Cursor. If you can't answer it, you're not building V1 — you're noodling.
