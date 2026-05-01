---
status: shipped
topic: Form Factor
subtopic: Ambient Surfaces
aliases:
  - Form Factor Decision
---

# Form Factor Decision

**Decided:** No destination app. Three ambient surfaces. See [[ambient-form-factor]].

## The Question

Should ECHO be a desktop chat app (like Claude Desktop or ChatGPT app) with similar architecture under the hood — connectors, MCP, memory — but a familiar app shell?

## The Answer

No. The form factor IS the differentiation.

## Why Architecture Parity Isn't Differentiation

Claude Desktop and ECHO can have functionally identical plumbing — connectors, MCP, memory, context injection — and still be entirely different products to the user, because the *form* communicates a different brand promise:

| | Claude Desktop | ECHO |
|---|---|---|
| Mental model | Destination | Ambient layer |
| User behavior | Goes *to* Claude | Stays in their work |
| Connectors live | *Inside* Claude | In ECHO, accessed by every AI |
| Context belongs to | Claude | The user |
| Wiki anchor | Field's "chat as MS-DOS" — the wrong destination | Karpathy's "build for agents as a new consumer" — the protocol surface |

## Why Foundation Model Providers Can't Match the Ambient Form

Innovator's dilemma applied to form factor. Anthropic / OpenAI / Google / Microsoft cannot credibly ship a felt-not-seen product because their revenue model requires destinations. Each needs the user *in their app* — paying them, viewing their UI, building habit with their brand.

Ambient = structural moat. It's the position incumbents cannot take without cannibalizing their own business model.

## The Three Surfaces (Final)

1. **Browser extension** — primary surface for web AI + web SaaS. Already shipped.
2. **MCP server** (local daemon) — desktop AI clients via Pull pattern.
3. **System-wide hotkey overlay** — Push pattern. The Wispr Flow analog.

Plus minimal audit page (Layer 5 only) for trust.

## The Test

If the eventual landing page can credibly say *"ECHO has no app to download. It's already wherever you work,"* the form factor is right.

If the team finds itself writing *"Download ECHO for Mac,"* the form has drifted into Claude Desktop's category and the differentiation is lost.

## What This Decision Forecloses

- ❌ A standalone chat UI (this is the central commitment)
- ❌ A persistent window the user alt-tabs to
- ❌ A "ECHO conversation history" surface (memory lives below; conversations happen in the user's existing AI tools)
- ❌ A primary brand expression that looks like a software application

## What This Decision Enables

- ✅ Foundation-model-incumbent-proof positioning
- ✅ Universal coverage (extension reaches web, MCP reaches desktop, hotkey reaches OS-wide)
- ✅ Low surface area to maintain
- ✅ The brand promise is testable: presence without window

## Related

- [[ambient-form-factor]]
- [[felt-not-seen]]
- [[clipboard-and-launch]]
- [[brand-promise]]
- [[browser-extension]]
- [[mcp-server]]
- [[hotkey-overlay]]
