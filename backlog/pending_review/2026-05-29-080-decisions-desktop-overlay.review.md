---
item_id: 2026-05-29-080-decisions-desktop-overlay
verdict: merge as-is
reviewed_at: 2026-05-29T21:03:03Z
test_counts:
  passed: 17
  failed: 0
producer: claude-code-subagent
---

# Review — 2026-05-29-080-decisions-desktop-overlay

Reviewer: Claude (independent; Codex built it). head_sha `23c5ab5d57c375558c7c8430c53a7050c1d31198`.

## Verdict

APPROVE — merge as-is. Every AC (AC1–AC7) is met in code; AC8 is an explicit post-merge founder gate (instrumentation present and merge-ready). No Out-of-Scope violation. The diff is confined to `tools/echo-overlay/` plus the single expected one-line root `tsconfig.json` exclude that AC2 itself mandates. No `src/mcp/**` change, no additive daemon tool, no Raycast removal, no echo/recap fold, no SEE+ACT / backlog write, no new coord event.

## Verification (re-run by the reviewer in a throwaway worktree at head_sha)

Worktree: `git worktree add /tmp/echo-080-review origin/agent/decisions-desktop-overlay` (removed after).

Root checks (worktree, after `npm install`):
- `npm run typecheck` — GREEN (overlay correctly excluded via the tsconfig change).
- `npm run lint` — GREEN (eslint + task-state lint).
- `npm test` — 1475 passed / 21 skipped / 1 failed. The single failure is `tests/mcp/recent-calls-endpoint.test.ts` timing out at 15s under full-suite parallel load. It is a FLAKE unrelated to this branch: the branch touches zero `src/` files and did not touch that test; re-running it in isolation PASSES in 7.07s (2/2). Root is effectively green.

Overlay package checks (`tools/echo-overlay/`, after `npm install`):
- `npm run typecheck` — GREEN.
- `npm run lint` — GREEN (exit 0).
- `npm test` — GREEN: 5 test files, 17 tests passed, 0 failed.
- `npm run smoke:static` — GREEN ("Tauri overlay config, CSP, capabilities, and shell invariants are present").

AC7 packaged-app smoke: the automatable static portion (config / CSP allowing `http://127.0.0.1:38478` / capabilities / Rust shell invariants incl. the AC7(vii) transparent + always-on-top + accessory + NSFloatingWindowLevel facts) is in `scripts/static-smoke.mjs` and passes. The genuinely-OS-dependent packaged `.app` checklist (build via Tauri/Rust toolchain + drive a live macOS menu-bar UI) cannot be automated in this sandbox; it is documented as the accepted manual fallback in `tools/echo-overlay/README.md` and includes the (vii) transparency + always-on-top verification. See Pre-merge fixups.

Merge cleanliness: `git merge-tree` (base `a68fb200`) shows only additions, zero conflict markers; `comm` of both sides' changed-file lists since the merge base shows zero overlapping files. Clean merge.

## Per-AC check

- AC1 (thin daemon-read consumer; one source): MET. `src/lib/mcp.ts` mirrors the Raycast `mcp.ts` pattern (`ECHO_MCP_URL` = `http://127.0.0.1:38478/mcp`, `callTool` with SSE-or-JSON `parseMcpResponse`, `AbortController` + 2s timeout, `EchoDaemonError`, structuredContent-first `unwrapToolResult`). Calls existing `pending_decisions(repo_path)` + `coord_status()` only. repoPath normalization in `src/lib/repo-path.ts`: defaults `~/Desktop/Project_echo`, expands `~`, passes absolute through, rejects relative/empty as DISTINCT errors. No daemon tool/adapter/combine.py/watcher/ledger change.
- AC2 (overlay shell + summon): MET. `src-tauri/src/main.rs` — `ActivationPolicy::Accessory` (no Dock), transparent (`setOpaque(false)` + `NSColor::clearColor()`), always-on-top + `NSFloatingWindowLevel`, decorations off, hidden at launch; configurable global hotkey (`ECHO_OVERLAY_HOTKEY`, default `Cmd+Shift+D`) toggles; blur → hide; tray menu. Self-contained package with own manifest/tsconfig/scripts; root tsconfig excludes `tools/echo-overlay/**/*` (the one expected root edit). J1=Tauri recorded with reasoning in README.
- AC3 (ambient dot, one calm nudge): MET. `ambientDotState` in `fleet.ts` is three-state: `unknown` on error/null/source-warning, `lit` iff >=1 awaiting card, `dark` only on a fresh successful zero read. Rust tray renders lit/dark/unknown glyphs. No auto-pop, no OS notification, no badge feed. Stale/unreachable -> unknown, never confident-dark.
- AC4 (fleet-glance, client-side composition): MET. `composeFleetGlance` derives state deterministically (zero LLM, zero writes) from `pending_decisions` + `coord_status` + bounded in-flight backlog read. The load-bearing `correlation_id -> item_id` join: `buildCorrelationItemMap` builds the map from each in-flight item's OWN `reviews/<item-id>/r*/request.md` (Rust `read_in_flight_snapshot` scans only `ready`/`claimed`/`pending_review` + each item's own review root — no wildcard history scan); `attachHealth` drops coord rows whose correlation_id matches no in-flight item. No additive daemon tool taken (default client-side path), correctly justified.
- AC5 (decision-dive SEE+JUMP): MET. `components.tsx` `DecisionDive` renders the existing DecisionCard fields unchanged (decision/whyNow/options/default/deadline/blocking/agents/sources/signals); every source action calls `bridge.openTarget(href)` -> Rust `open_target` (system open). No write path anywhere; no playbook knowledge; card model consumed unchanged.
- AC6 (freshness + cleanup): MET. `sourceWarnings` emits behind/upstream_stale/dirty/partial banners; never renders silent "no decisions" over a stale read. `poller.ts` `startSingleFlightPoller` is single-flight (`inFlight` guard), backs off on `EchoDaemonError`, and the `stopped` flag suppresses late results. `App.tsx` starts/stops on summon/hide events + Esc, tears down on unmount; ambient poller falls back to `unknown` on error.
- AC7 (tests + checks green): MET. 17 overlay tests cover (a) MCP arg shape/typing/unreachable, (b) dot predicate incl. unknown-on-stale, (c) fleet join over fixtures bounded to in-flight items + drop-unmatched, (d) decision-dive SEE+JUMP target + zero act/write buttons, (e) poller single-flight/teardown. Overlay typecheck/lint/test/static-smoke green; root green (modulo the unrelated flake). Packaged-app smoke = documented manual fallback per the AC (see fixups).
- AC8 (founder dogfooding gate): N/A at handoff (explicitly post-merge per the AC). Builder obligation = instrumentation merge-ready: the `**Surface:** Overlay` journal template and README dogfooding section are present in `tools/echo-overlay/README.md`. MET.

Out-of-Scope: all 10 respected. No Raycast removal (raycast-echo untouched), no echo/recap fold, no SEE+ACT/backlog writes, no auto-pop/feed/notification, no coord-ledger/combine.py/watcher/adapter change, no pending_decisions duplication, no A2 alarm, single-repo only, no brand/positioning flip, no LLM/subprocess.

## Expected merge conflicts

None. `git merge-tree` against base `a68fb200` shows additions only with no conflict markers; zero files were modified by both origin/main and the branch since the merge base. The lone shared-namespace file (`tsconfig.json`) was not touched on main since base, so its 1-line additive exclude merges cleanly.

## Pre-merge fixups

1. (Founder, before final merge) Run the AC7 packaged-app manual smoke checklist documented in `tools/echo-overlay/README.md` against a `npm run build` artifact and fill the currently-blank "Recorded pre-merge smoke" block (Date / Build artifact / Static smoke / Manual packaged-app smoke / Notes), explicitly recording the (vii) transparency + always-on-top observation. The automatable static smoke already passes; only the live `.app` checklist needs a recorded human run. This is the documented stack-specific fallback and the only AC7 item not mechanically verifiable in CI/sandbox. Not a code change; does not block code correctness.

## Follow-up items (defer, do not block merge)

1. Root suite flake: `tests/mcp/recent-calls-endpoint.test.ts` times out at 15s under full-suite parallel load (passes at ~7s isolated). Pre-existing, unrelated to 080. Consider raising that test's timeout or de-parallelizing it in a separate hygiene item.
2. Per the spec's After-Completion notes (strategist, post-merge): file item 081 (Raycast removal, gated on 080 AC8), amend `wiki/principles/felt-not-seen.md`, create `wiki/surfaces/decisions-overlay.md`, record the surface decision in `raw/internal/decisions/`.
