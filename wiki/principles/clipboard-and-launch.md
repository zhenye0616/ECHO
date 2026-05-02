---
status: shipped
topic: Form Factor
subtopic: Hotkey Overlay
aliases:
  - Clipboard and Launch
  - Wispr Flow Pattern
---

# Clipboard and Launch

## Definition

The Layer 3 delivery pattern for V1: ECHO assembles context, copies it to the clipboard, opens (or focuses) the target app, and the user pastes. Universal coverage with no per-app injection code. The Wispr Flow keyboard-injection pattern applied to context.

## Three Properties That Make It Strong

1. **Universal coverage with zero per-app code.** Every app supports paste. ECHO works in Cursor, Claude.ai, ChatGPT, Gemini, Notion, Slack, Discord, Apple Notes, terminal, *anything* — without app-specific delivery code.

2. **Reviewable by default.** The user sees the assembled context before pasting. Trust profile identical to a passive helper.

3. **Felt-not-seen preserved.** ECHO doesn't open a window of its own. It uses the OS clipboard (invisible) and the target app the user was going to anyway.

## The Two Layer-3 Mechanisms (V1)

| Mechanism | Triggered by | Delivery | Use case |
|---|---|---|---|
| **Push (clipboard + launch)** | User hotkey | Clipboard write + open target app | "Take this to Claude" |
| **Pull (MCP tool call)** | AI tool needs context | MCP server returns relevant fragments | Cursor asking "what does the user know about this?" |

Both are summoned (Layer 3). The difference is who's summoning — the user (Push) or the AI tool itself (Pull).

## Concrete V1 User Flow (Push)

1. ⌘⇧E summons composer
2. User types: *"Take what I know about the auth feature to Claude"*
3. ECHO assembles the context bundle
4. Composer shows the bundle for review (preview is non-negotiable for trust)
5. User confirms → bundle goes to clipboard, target app opens/focuses
6. User hits ⌘V

Total interaction time: ~5 seconds. No window from ECHO persists.

## Engineering Cost Reduction

Replaces:
- ❌ Per-app injection code
- ❌ Per-app authentication for write actions
- ❌ Brittle DOM selectors
- ❌ Format-specific context shaping

With:
- ✅ One clipboard-write call
- ✅ One URL-launch call per target
- ✅ One context-formatter (markdown that pastes well anywhere)

## The Non-Negotiable: Preview

Even with the simplification, the assembly preview matters. The user must see *what's about to be on their clipboard* before it's copied. Without the preview, the trust profile collapses — the user doesn't know what they're about to paste into someone's chat or doc.

## Wispr Flow Precedent

Wispr Flow uses keyboard injection — types transcribed text wherever the cursor is. Universal, OS-level, no per-app code. ECHO applies the same insight to context delivery: don't integrate with each AI app's quirky injection API; put the context on the clipboard and let the user paste it.

## Related

- [[hotkey-overlay]]
- [[ambient-form-factor]]
- [[mcp-server]]
- [[felt-not-seen]]
