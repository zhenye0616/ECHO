# Design handoff — Unified ECHO Overlay (Raycast)

**For:** Claude Design
**Date:** 2026-05-19
**Outcome of:** brainstorm between strategist (Claude) and codex on 2026-05-19, in response to founder's question "can the two Raycast commands be combined into one workflow surface for full consistent memory?"

---

## What ECHO is

ECHO is the cross-platform context layer for AI-era knowledge work. It captures everything happening across the user's AI tools (Cursor edits, Claude Code sessions, Codex CLI calls, git commits) into a unified personal memory, and exposes that memory back to *other* AI surfaces so they get smarter about the user.

**Brand promise:** *"We don't make AI smarter. We make every AI smarter about you."*

**Form factor:** Browser extension + MCP server + hotkey overlay. **Explicitly not a destination app.** Capture is invisible (Layer 1). Context is summoned via hotkey, consumed, and dismissed (Layer 3). The user does not "go to" ECHO — ECHO comes to them.

**Target cohort:** Indie AI builders / dev founders. Bundle: Cursor + Claude Code + GitHub + Slack + web AI extension.

---

## What we're designing

A **unified Raycast overlay** that replaces today's two separate commands:

| Today (two commands) | Tomorrow (one omnibox) |
|---|---|
| **Search ECHO Context** — retrieval-only. Time-bucketed clusters, source filter, Copy bundle / Paste / Open repo. No LLM. | **One ⌘⇧E surface.** Type natural language → memory retrieves underneath as evidence → user can inspect, ask, or launch into their other AI tool. |
| **Ask ECHO** — separate form → headless agent → streamed answer Detail + audit sidebar. | |

The split today is an implementation artifact. Users have one thing in their head ("I want to do something with my memory"); the UI shouldn't make them pick a door first.

---

## The product rule (load-bearing — please read carefully)

The brand promise commits ECHO to making **other AI tools** smarter. The wedge is clipboard+launch: ECHO assembles relevant memory + a working prompt, then the user pastes/launches into Cursor / Claude.ai / ChatGPT and continues there.

**So Ask ECHO must not become a destination chatbot.** Even inside a Raycast modal, if the user can finish their work in ECHO, we've become a destination AI — and we've cannibalized the launch-other-AI move that IS the product.

The product rule we landed on:

> **ECHO is allowed to be smart, but not allowed to be the place where the work finishes.**

Concretely: when Ask ECHO produces an answer, the answer view has three structural parts:
1. **Short answer** — 3–6 bullets max. Enough to orient, not enough to finish work.
2. **Evidence used** — the clusters/atoms that fed the synthesis, visible.
3. **Primary CTA: launch.** "Send to Cursor" / "Send to Claude.ai" / "Send to ChatGPT" / "Copy context + prompt"

Ask compresses ambiguity *before launch*. It's a packet-builder with a thin preview, not a chat surface.

---

## States to design

Please design these four states. They are one surface (a Raycast `List` with detail panel + action menu), shifting based on input.

### State 1 — Empty / initial (overlay just summoned, nothing typed)

- A focused input at the top with a placeholder like *"Ask anything, or search your memory…"*
- Below it: orienting suggestions. Some mix of:
  - Recent open loops (rank_reason includes `has_open_loop`)
  - Latest clusters (last hour / today)
  - 2–3 most recent asks (so user can re-launch a prior packet)
- The user can type immediately, or arrow-down to scan.

### State 2 — Typing (query in progress)

- As the user types, clusters/matches retrieve underneath the input — same time-bucketed list as today's Search ECHO.
- **Crucially: the top row is always a synthetic "Ask ECHO about \"<query>\"" row** — visually distinct from the cluster rows below it, so the user sees "ask" as a peer action, not a hidden one.
- Arrow-down lets the user pick a specific cluster instead.

### State 3 — Ask answer (after `Enter` on the synthetic ask row)

This is the load-bearing state — it must structurally enforce "ECHO ≠ destination."

Three required regions, in order:
1. **Short answer** — 3–6 bullet markdown block. Visually constrained so it can't grow into a wall of text.
2. **Evidence panel** — which clusters/atoms ECHO synthesized from. Each evidence chip is clickable (opens that cluster's detail).
3. **Launch row (primary CTA)** — prominent. Buttons or pill row: `Send to Cursor` · `Send to Claude.ai` · `Send to ChatGPT` · `Copy context + prompt`. The user's *intended next step* should be visually obvious here.

Secondary actions (in action menu, not visually primary): copy the answer text, copy as journal entry, see the agent's MCP audit trail.

### State 4 — Cluster inspect (after arrow-down + `Enter` on a specific cluster)

This is closest to today's Search ECHO detail view — show cluster metadata (atoms, time range, source breakdown, rank reasons) and the bundle-copy actions. Preserve the existing pattern; don't redesign this.

---

## Constraints

- **Raycast primitives only.** This ships as a Raycast extension. You have `List`, `List.Item.Detail`, `Grid`, `Form`, `ActionPanel`, `Detail` (markdown view). No custom HTML. No persistent window outside Raycast.
- **Keyboard-first.** Every action reachable without mouse. Standard Raycast shortcut conventions (`⌘C` copy, `⌘O` open, `⌘⇧⏎` paste in frontmost, etc.).
- **Source-app palette is already established** (today's Search ECHO):
  - Claude Code: `#d97757` · Icon.Stars
  - Cursor: `#3b82f6` · Icon.Code
  - Codex: `#a855f7` · Icon.Terminal
  - Git: `#f1502f` · Icon.CodeBlock
- **No persistence beyond Raycast modal lifecycle.** "Recent asks" can survive sessions via `LocalStorage`, but the surface is summoned-and-dismissed, never always-open.

---

## Directions to explore (please give us 2–3 distinct ones)

This is where you have latitude. Some axes we'd like to see explored:

1. **How "ask" announces itself in the typing state.** Is the synthetic top row a full-width row with an `Icon.Stars` chip? An inset hint inside the input field itself ("press ⏎ to ask")? A visually elevated "ask card" floating above the cluster results? Show different takes — we want to feel which one makes the ask-action feel *inevitable* without overwhelming the retrieval results.

2. **How the answer view structurally prevents "finish your work here" drift.** Show how you'd visually constrain the short-answer region. Show how the launch CTA row gets enough visual weight to be the user's natural next move. Could the launch row be sticky/footer-pinned? Could the answer area collapse after the user copies/launches?

3. **The evidence panel.** Should evidence be a sidebar (Raycast `Detail.Metadata` style)? Inline chips above the launch CTA? Foldable section? We want users to see *which memory ECHO used* without it being a wall of source-chips.

---

## Open variables — please propose answers as part of the design

- **"Send to Cursor / Claude.ai / ChatGPT" — how does ECHO know which is the user's primary?** Recent app focus? Raycast preference dropdown? Suggest a UX answer.
- **What does "Send to Cursor" actually do?** Probably: copy the packet (memory + prompt) to clipboard, then `open -a Cursor`. Confirm in the design how this is communicated to the user — a toast? A brief inline confirmation in the answer view?
- **Recent-asks history.** Where does it live? A section in the empty state? Foldable section in the cluster list? Its own keyboard shortcut?
- **Empty state suggestion algorithm.** What gets shown when the user has typed nothing — open loops first? Most-recent clusters? Recent asks? A blend? Pick something opinionated.

---

## Anti-patterns (please do not propose these)

- **Persistent companion window** alongside Cursor/Claude. We rejected this in brainstorm — it's a destination app in disguise.
- **Chat-thread UI** with multi-turn conversation history visible. We're shipping single-shot ask, not a chatbot.
- **"Newline = ask, no newline = retrieve" magic.** Modal behavior on Enter based on character class is too easy to misfire. The ask action should be an explicit row the user picks.
- **Top-level tabs ("Search" / "Ask")** at the top of the overlay. That preserves the split we're trying to dissolve.
- **Anything that requires leaving Raycast** (a popout window, an in-app preview pane, etc.).

---

## Deliverable

2–3 distinct visual directions, each covering states 1–4. Static mockups are fine — Raycast-faithful styling, but you have freedom on the details Raycast doesn't constrain (typography weight, color emphasis, region weights, micro-interactions you'd describe in notes).

If you want to produce Raycast-compatible TSX as a reference (as the prior Search ECHO handoff did), great — but visual mockups are the primary ask. We'll do the code adaptation on our side.

---

## Reference: what currently ships

- `tools/raycast-echo/src/search-context.tsx` — today's retrieval surface (Direction C from prior handoff)
- `tools/raycast-echo/src/ask-context.tsx` — today's ask form + streamed answer
- The prior design handoff URL: `api.anthropic.com/v1/design/h/91GV5Hxa5Yxb3hUu2j2vtw` (for visual continuity reference)
