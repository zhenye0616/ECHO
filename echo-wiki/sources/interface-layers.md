---
topic: Architecture
subtopic: Layer Stack
aliases:
  - Interface Layers
  - Communication Stack
---

# Interface Layers (1–5)

The full stack of communication modes between user and ECHO. V1 ships layers 1, 3, and minimal 5. Layers 2 and 4 deferred to V2.

## The Five Layers

### Layer 1 — Passive Ingestion (the substrate)

The user *is* the input, just by working. ECHO continuously absorbs:
- What's on screen, what's clicked, what's typed (within consented sources)
- Which tools are open, which file is focused
- AI conversations across surfaces (via browser extension)
- Code activity, ticket activity, message activity (via API adapters)

User does nothing for this layer. It just runs. **Required for V1.** See [[local-daemon]].

### Layer 2 — Ambient Surfacing (deferred to V2)

ECHO whispers, never shouts. Proactive surfacing with restraint:
- Open Cursor on yesterday's file → peripheral panel pre-loads relevant Linear issue + Slack thread + prior Claude conversation
- Type a Slack reply → subtle indicator "you discussed something similar 3 months ago"
- Status pill shifts when ECHO has something time-sensitive

**Cut from V1** because calibration is the hardest layer to get right. Wrong calibration is worse than not having the feature. Build with post-launch behavior data, not assumptions.

### Layer 3 — Summoned Response (the magic moment)

User reaches for ECHO explicitly. Multi-modal:
- Hotkey (⌘⇧E) summons composer anywhere
- Voice (V2)
- MCP tool calls from AI clients (Pull mode)

Two delivery mechanisms ([[clipboard-and-launch]]):

- **Push:** user → composer → assembled bundle → clipboard + open target → user pastes
- **Pull:** AI tool → MCP request → ECHO returns context → AI uses it transparently

**Required for V1.** Both Q&A and assembly modes ship; autonomous agent action does not.

### Layer 4 — Conversational Dialogue (deferred to V2)

Extended dialogue with ECHO as thought partner:
- *"Tell me what I've been working on this week"*
- *"Where am I contradicting myself across conversations?"*
- *"What am I avoiding?"*
- *"Find the through-line in everything I've shipped this quarter"*

**Cut from V1** because sustained conversation implies a UI for the dialogue (chat thread, conversation history, multi-turn state) — which contradicts the felt-not-seen commitment. Build once Layer 3 is bulletproof.

### Layer 5 — Reflective / Audit (rare, but trust-critical)

The inspector. Used a few minutes a month:
- See memories with source attribution
- Forget specific memories
- Manage permissions
- See what connectors are reading what

**Required for V1, minimal version.** A memory product without an inspector is uninstallable. See [[audit-page]].

## What "User Reviews Before External Effect" Means for V1

A Layer 3 action belongs in V1 if and only if **the user reviews the output before any external system is affected**:

- Q&A passes (user reads; nothing changes externally)
- Assembly passes (user inspects and applies the artifact themselves via clipboard)
- Autonomous send/write/update fails — V2+ once trust is earned

This is Karpathy's autonomy slider applied: V1 sits at "user reviews everything"; V2 starts unlocking higher slider positions for specific high-confidence actions.

## V1 Layer Map (Reference)

| Layer | In V1? | Mechanism |
|---|---|---|
| L1 — Passive ingestion | ✅ | [[local-daemon]] + adapters |
| L2 — Ambient surfacing | ❌ | V2 |
| L3 — Summoned (Push + Pull) | ✅ | [[hotkey-overlay]] + [[mcp-server]] |
| L4 — Conversational | ❌ | V2 |
| L5 — Reflective / audit | ✅ minimal | [[audit-page]] |

## The Single Test for Whether V1 Is Cut Correctly

If a user could in principle do everything ECHO offers them in V1 with **only the hotkey**, **the MCP-injected context in their AI tools**, and **the audit page they visit twice**, the cut is right.

If they would need to "open ECHO and look at it" for any reason other than auditing memory, the cut has drifted.

## Related

- [[narrowest-v1-scope]]
- [[clipboard-and-launch]]
- [[hotkey-overlay]]
- [[mcp-server]]
- [[audit-page]]
- [[local-daemon]]
- [[felt-not-seen]]
