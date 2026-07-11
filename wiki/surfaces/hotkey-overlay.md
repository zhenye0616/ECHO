---
status: planned
lifecycle: deferred
topic: Form Factor
subtopic: Hotkey Overlay
aliases:
  - Hotkey Overlay
  - Hotkey Composer
---

# Hotkey Overlay

> Shipped v0 dogfood (retired): see [[hotkey-overlay-raycast]]. This page describes the V1 vision (still `planned`). The v0 shipped as a Raycast extension at `tools/raycast-echo/` but was **removed on 2026-05-31 (item 081)** once the Tauri desktop overlay (`tools/echo-overlay/`) became the shipped operator surface; the `decisions` job moved to that overlay, and the Raycast-only `echo`/`recap` jobs were retired without a replacement.

## Definition

The system-wide summoned composer. Pressing a global hotkey (default ⌘⇧E) opens a small floating composer anywhere on the OS. The user types intent + target, ECHO assembles context, composer shows the bundle for review, user confirms, target app opens with context on the clipboard.

The Wispr Flow Fn-key analog applied to context.

## Why a Hotkey Instead of a Window

- **Felt-not-seen alignment** ([[felt-not-seen]]) — appears only when summoned, disappears after action
- **Universal availability** — works anywhere on OS, regardless of focused app
- **No habit shift required** — user doesn't "go to ECHO"; ECHO comes to them
- **Trust-friendly** — no persistent UI watching the user

## V1 Behavior

1. **Summon** — ⌘⇧E (or user-configured hotkey) opens the composer
2. **Input** — text input; user types intent + target ("brief me on auth feature for Claude")
3. **Retrieval** — daemon retrieves relevant context (~500ms target)
4. **Preview** — composer shows the assembled bundle; user can edit, truncate, or skip
5. **Action** — user confirms; bundle goes to clipboard, target app opens/focuses
6. **Disappear** — composer closes; nothing persists

## Performance Bar

- Response from summon to preview: <100ms
- Retrieval latency to bundle: <500ms (perceived as instant)
- Memory footprint of the overlay process: negligible (native, not Electron)

## What the Overlay Doesn't Do (V1)

- ❌ Multi-turn conversation (defer to V2 — that's [[interface-layers|Layer 4]])
- ❌ Voice input (defer to V2)
- ❌ Show ambient suggestions ([[interface-layers|Layer 2]] — defer to V2)
- ❌ Persist a "history" UI (the audit page handles this)

## Implementation Notes

Native macOS first (Swift/AppKit). Windows/Linux later. Reuses OS native input handling (Spotlight pattern), not a browser shell. Fast cold-start critical — anything >200ms feels broken.

Inspirations: Raycast, Spotlight, Wispr Flow, Alfred. None are direct copies — closest is Wispr Flow's Fn-key model with composer surface added.

## Related

- [[clipboard-and-launch]]
- [[ambient-form-factor]]
- [[local-daemon]]
- [[interface-layers]]
