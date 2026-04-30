---
id: 2026-04-30-003-hotkey-overlay-scaffold
title: Hotkey overlay scaffold (native macOS)
status: ready
priority: HIGH
estimate: 2d
created: 2026-04-30
spec_refs:
  - echo-wiki/entities/hotkey-overlay.md
  - echo-wiki/concepts/clipboard-and-launch.md
  - echo-wiki/concepts/felt-not-seen.md
acceptance:
  - Native macOS app (Swift/AppKit), not Electron
  - Registers global hotkey ⌘⇧E (configurable later)
  - Pressing hotkey opens floating composer window centered on screen
  - Composer has text input + "Send" button
  - Pressing Escape closes composer with no action
  - Composer cold-start to visible <100ms
  - Memory footprint negligible when idle (<20 MB)
  - On Send: composer disappears (action handler is stubbed for now)
files_to_modify:
  - mac-app/* (new)
  - mac-app/HotkeyOverlay.swift
  - mac-app/Info.plist
agent_notes: ""
review_notes: ""
---

# Hotkey Overlay Scaffold (Native macOS)

## What

The Wispr Flow Fn-key analog. System-wide hotkey opens a small floating composer anywhere on the OS. This item builds only the *scaffold* — the composer appears, accepts input, disappears. The actual context assembly + clipboard write + target launch happens in a later item.

## Why

This is THE Layer 3 Push mechanism. See [[hotkey-overlay]] for full spec and [[felt-not-seen]] for why this form factor matters. Cold-start performance is critical — anything >200ms feels broken to dev users.

## Acceptance Criteria

- [ ] Native macOS app (Swift/AppKit/SwiftUI as appropriate)
- [ ] Registers global hotkey ⌘⇧E using NSEvent / Carbon
- [ ] Pressing hotkey opens floating window centered on active screen
- [ ] Window is borderless, semi-transparent background
- [ ] Window is always-on-top, non-activating (doesn't steal focus from other apps for activation)
- [ ] Text input field with placeholder "What do you need?"
- [ ] "Send" button (or Cmd+Return)
- [ ] Escape key dismisses without action
- [ ] Cold-start measurement: hotkey-press to window-visible <100ms (instrument and test)
- [ ] Memory footprint when idle <20 MB
- [ ] On Send: window dismisses, prints input to stdout (stub)

## Constraints

- Native, not Electron (per [[hotkey-overlay]] — Electron's startup latency violates the <100ms bar)
- macOS first; Windows/Linux later (per V1 sequencing)
- No persistent UI elements when not summoned (felt-not-seen)
- Don't request accessibility permissions yet — that's a later item

## Out of Scope (Don't Drift)

- ❌ Actual context retrieval (depends on storage + composition engine)
- ❌ Clipboard writing (separate item: clipboard-and-launch implementation)
- ❌ Target app routing logic (separate item)
- ❌ Voice input (V2)
- ❌ Multi-turn dialogue inside the composer (V2 — that's Layer 4)
- ❌ Custom hotkey configuration UI (V1.5)
- ❌ Visual polish beyond functional (V1.5 polish week)

## Definition of Done

Founder can press ⌘⇧E anywhere on macOS, the composer appears in <100ms, accepts text input, sends on Cmd+Return (or Send button), prints input to console, and disappears. Pressing Escape dismisses cleanly. Memory footprint stable across many opens.
