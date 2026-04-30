---
topic: Form Factor
subtopic: Ambient Surfaces
aliases:
  - Ambient Form Factor
---

# Ambient Form Factor

## Definition

Three thin presences instead of one destination app. The architectural commitment that no traditional app UI exists in V1. The user works in their existing tools; ECHO is the ambient layer that makes those tools smarter.

## The Three Surfaces (V1)

1. **Browser extension** — covers web AI surfaces (Claude.ai, ChatGPT, Gemini) and web SaaS context capture. *Already shipped.*
2. **MCP server** (local daemon) — covers desktop AI clients without ECHO building UI for any of them.
3. **System-wide hotkey overlay** — the Wispr Flow Fn-key analog. Appears anywhere, ingests selection/clipboard/active-window context, queries the unified store, returns result inline, disappears. Never persists on screen.

Plus a minimal **inspector / audit page** — exists for trust ([[felt-not-seen]] refinement), used rarely.

## What Ambient Form Buys You

- **Universal coverage with zero per-app UI work.** Each of the three surfaces serves many destinations.
- **Structural defensibility.** Foundation model incumbents can't credibly ship ambient because their revenue model requires destinations.
- **Brand promise alignment.** Every product decision flows from "the disappearance of ourselves in service of the user's work."

## What "No Destination App" Means in Practice

Test: if your eventual landing page can credibly say *"ECHO has no app to download. It's already wherever you work,"* the form factor is right. If you find yourself writing *"Download ECHO for Mac,"* you've drifted back into Claude Desktop's category and lost the differentiation.

## Why Not Just Build a Native App?

Claude Desktop and ChatGPT desktop have functionally similar plumbing (connectors, MCP, memory). They're still destinations. Brand-level distinction:

- *Claude Desktop = come to Claude.* User goes to it. Connectors live inside Claude.
- *ECHO = ambient layer.* User stays in their work. Context flows wherever they are.

## Related

- [[felt-not-seen]]
- [[compose-not-capture]]
- [[clipboard-and-launch]]
- [[browser-extension]]
- [[mcp-server]]
- [[hotkey-overlay]]
