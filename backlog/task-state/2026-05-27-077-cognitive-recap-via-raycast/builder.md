---
task_id: 2026-05-27-077-cognitive-recap-via-raycast
role: builder
writer: codex-builder
last_updated: 2026-05-28T07:21:00Z
---

## current_thesis

Claimed 077 as Codex builder. Implement the Raycast Recap command as an explicit, ephemeral, single-shot project recap surface over existing artifacts, reusing Ask ECHO's agent profile and subprocess patterns while keeping Ask ECHO's shipped command/components byte-identical.

## locked_decisions

- AC1: add a second Raycast command `recap`, duplicate the four command-scoped Ask ECHO preferences under it, add `defaultSinceWindow`, and bump extension package metadata.
- AC2: implement `src/recap.tsx` as Form -> Detail streaming flow with invalid-since validation, non-blocking daemon/audit behavior, 5s abort-bounded one-shot audit fetch, tree-kill cancellation, no persistence, and custom-agent cwd set to the repo path.
- AC3: add `recap-system-prompt.ts` exporting `RECAP_SYSTEM_PROMPT_TEMPLATE` plus `buildRecapPrompt`, with placeholder substitution, absolute repo-path validation, six artifact sources, A/B/D sections, best-effort MCP fallback, and prompt body under 4096 chars.
- AC4: add pure `resolveSinceWindow(userInput, windowPref, sessions, nowMs)` with explicit-timezone ISO validation, last done Ask-session lookup, 24h/4h explicit windows, and UTC `Z` outputs.
- AC5: add prompt, resolver, and Recap UI tests including package command preferences, custom cwd, daemon-down/audit-timeout behavior, invalid input, no LocalStorage writes, repo-path validation, and r11 repo preflight cases.
- AC6: extend the Raycast README with the Recap section, per-command preference setup, A/B/D output shape, dogfooding template marker, and daemon-down dogfooding step.
- AC7: no builder-side gating beyond implementation/tests; dogfooding evidence gate is post-merge validation input.
- R11 founder accept-and-ship fixups are in scope: update `tools/raycast-echo/package-lock.json` with the version bump, add runtime protection against wedged MCP fallback using the cleaner path available in `recap.tsx`, and reject nonexistent/non-git repo paths before spawning.

## open_questions

- None blocking at claim. Escalate if implementation requires files outside the spec body plus r11 fixup table, a new dependency, edits to Ask ECHO's protected files, or a choice between incompatible runtime contracts.

## dont_touch

- No new MCP tool, no new `coord_emit` event type, no daemon-side LLM call, no OS notification, and no empty-Enter hijack.
- No threading, follow-ups, re-prompt input, Recap session persistence, `Session` interface changes, `recapWindow`, SessionsList integration, Cmd-R Recap fork, or LocalStorage writes.
- Do not modify existing `src/echo.tsx`, `src/lib/system-prompt.ts`, `src/components/EmptyState.tsx`, `src/components/SessionsList.tsx`, `src/components/SessionDetail.tsx`, `src/lib/sessions.ts`, or other Ask ECHO components.
- Do not edit `docs/BACKLOG.md`, `wiki/**`, `docs/STATUS.md`, `docs/NORTH_STAR.md`, backlog item bodies, telemetry/phone-home behavior, or unrelated Raycast extension surfaces.

## canonical_anchors

- spec: backlog/claimed/2026-05-27-077-cognitive-recap-via-raycast.md
- reviews: backlog/reviews/2026-05-27-077-cognitive-recap-via-raycast/
