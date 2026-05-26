---
task_id: 2026-05-25-073-onboarding-wizard
role: builder
writer: codex-builder
last_updated: 2026-05-26T04:20:55Z
---

## current_thesis

Claimed 073 as Codex builder. Implement the UX-free onboarding wizard library for steps 2-5: detect agents, detect projects, manage adapter cache, render marker sections, wire selected agents through the 072 sync engine, probe agent CLIs, and expose the staged `createWizard()` API for 074.

## locked_decisions

- AC1: `detect-agents.ts` returns one layered-confidence result per `AgentKind`, using config-file probes plus prefix-matched atom-store activity through the read-only production opener.
- AC2: `detect-projects.ts` groups recent atom-store rows by `metadata.repo_root`, ranks by 7-day activity, and reports source breakdowns.
- AC3: `adapter-cache.ts` owns per-agent `~/.echo/adapters/<agent>.json` read/write with schema validation and secret-sensitive atomic writes.
- AC4: `render-echo-section.ts` is a pure renderer for non-cursor agent marker bodies consumed by 072's marker splice logic.
- AC5: `wire.ts` loads previous cache, builds `AdapterSyncProfile[]`, calls 072 `syncAll`, persists successful cache updates, and mutates onboarding state without flipping `completed`.
- AC6: `probe.ts` best-effort probes codex and claude-code by spawning their CLIs, maps typed failure reasons, and returns cursor as manual-only.
- AC7: `run-wizard.ts` exposes a staged `Wizard` via `createWizard()` and `index.ts` re-exports only the public surface.
- AC8: add the seven specified wizard test files with 53 new cases and keep existing tests passing.

## open_questions

- None blocking at claim. Escalate if AC implementation requires files outside `files_to_modify`, a new dependency, or spec ambiguity not resolved by `spec_refs`.

## dont_touch

- No UI, TUI, Raycast surface, welcome screen, or done screen.
- No `echo doctor`, `echo uninstall`, daemon endpoint introspection, running-process detection, or atom-store backfill.
- No auto-resolving 072 conflicts, per-agent MCP URL templating, role-runtime matching, multi-machine onboarding state, schema migrations, cursor auto-probe, or separate wizard-level concurrency lock.
- Do not edit wiki pages, docs backlog/status/north-star files, backlog item bodies, or 074-side CLI/UX surfaces.

## canonical_anchors

- spec: backlog/claimed/2026-05-25-073-onboarding-wizard.md
