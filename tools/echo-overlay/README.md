# ECHO Decisions Overlay

`tools/echo-overlay` is the desktop operator surface for ECHO delegated-work decisions. It is a summoned macOS overlay with one ambient menubar dot and two altitudes:

- **Fleet glance:** a read-only progress tree over in-flight backlog items.
- **Decision dive:** the existing daemon `DecisionCard`, rendered unchanged with SEE+JUMP source buttons.

Idle means nothing is on screen and the menubar dot is dark. The overlay does not auto-pop, post OS notifications, show a feed, or write under `backlog/`.

## Stack Decision

The chosen stack is **Tauri**: a Rust shell plus a React/TypeScript web UI.

Tauri was chosen because it gives the overlay native macOS behavior at a small felt-not-seen footprint: menubar residency, a transparent always-on-top window, global hotkey summon, and no Dock-first app posture. The web UI lets the surface reuse the repo's TypeScript/React patterns and leaves a path to share daemon-facing types. Swift/SwiftUI would be the most native option, but it would introduce a new language and no straightforward type-sharing path with the daemon. Electron matches the repo language better, but its runtime weight works against the "felt, not seen" contract for a small always-available operator surface.

## Data Model

The overlay is a thin consumer of the same daemon endpoint the Raycast extension uses:

- MCP URL: `http://127.0.0.1:38478/mcp`
- MCP tools: `pending_decisions(repo_path)` and `coord_status()`
- Repo read: a bounded Tauri command reads only `backlog/ready`, `backlog/claimed`, `backlog/pending_review`, and each in-flight item's own `backlog/reviews/<item-id>/r*/request.md`.

Fleet glance is composed client-side from those reads. No new daemon tool, coord event, ledger write, watcher change, or `pending_decisions` duplication is introduced.

## Configuration

The repo path defaults to `~/Desktop/Project_echo`. The UI resolves `~` through Tauri's home directory API and calls `pending_decisions` only with an absolute path. Relative or empty repo paths are surfaced as a distinct repo-path error, not as daemon-down.

Development:

```bash
cd tools/echo-overlay
npm install
npm run dev
```

Checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run smoke:static
```

## Overlay Runtime Contract

Summon is handled by the Tauri shell:

- Default hotkey: `CommandOrControl+Shift+D`
- Override: `ECHO_OVERLAY_HOTKEY`
- Dismissal: hotkey toggle, Esc, or blur
- Menubar dot states: `●` lit when at least one pending decision exists, `○` dark when a fresh read returns zero decisions, `◌` unknown on stale/unreachable reads

The concrete Tauri config and shell settings that make the overlay transparent and always-on-top are:

- `src-tauri/tauri.conf.json`: `app.macOSPrivateApi: true`
- `src-tauri/tauri.conf.json`: main window `transparent: true`
- `src-tauri/tauri.conf.json`: main window `alwaysOnTop: true`
- `src-tauri/tauri.conf.json`: main window `decorations: false`, `skipTaskbar: true`, `visible: false`
- `src-tauri/src/main.rs`: `app.set_activation_policy(tauri::ActivationPolicy::Accessory)`
- `src-tauri/src/main.rs`: `window.set_always_on_top(true)` on setup and summon
- `src-tauri/src/main.rs`: macOS private API sets `NSWindow` opaque false, clear background, and `NSFloatingWindowLevel`
- `src-tauri/tauri.conf.json` CSP allows `connect-src ... http://127.0.0.1:38478`

`npm run smoke:static` asserts these build-graph and config facts.

## Packaged-App Smoke

Automated static smoke covers the config and capability checks that can be verified without driving a packaged macOS UI. The remaining checks must be run against the built `.app` before merge because they verify real OS behavior.

Build the app:

```bash
cd tools/echo-overlay
npm run build
open "src-tauri/target/release/bundle/macos/ECHO Decisions Overlay.app"
```

Manual packaged-app checklist:

- [ ] Idle has no visible overlay window and no Dock-first app presence.
- [ ] The ECHO menubar item exists and shows the ambient dot.
- [ ] The global hotkey summons the overlay; Esc, blur, and the hotkey dismiss it.
- [ ] A real local MCP call to `http://127.0.0.1:38478/mcp` succeeds under the packaged app CSP.
- [ ] Repo reads are allowed through the in-flight snapshot command.
- [ ] SEE+JUMP opens a local review round, backlog item, or source target.
- [ ] The summoned window renders transparent, stays above other app windows, and keeps its stacking level after focus changes.

Recorded pre-merge smoke:

```markdown
Date:
Build artifact:
Static smoke: <pass/fail, command output summary>
Manual packaged-app smoke: <pass/fail/not-run-with-reason>
Notes:
```

## Dogfooding

Overlay usage should be logged to `raw/internal/dogfooding/mcp-interactions-journal-YYYY-MM.md` with this template:

```markdown
**Surface:** Overlay
**Trigger:**
**Repo:** <absolute repo path>
**Tool and query inputs:** pending_decisions(repo_path=<path>); coord_status(); in_flight_snapshot(repo_path=<path>)
**Returned shape:** cards=<count>; fleet_nodes=<count>; needs_you=<count>; dot=<lit|dark|unknown>; source_state.behind=<n>; upstream_stale=<true|false>; dirty=<true|false>; partial=<true|false>
**Sources:** <source_breakdown, card source labels/paths, scanned in-flight review roots>
**Verdict:** <right|partial|wrong>
**Note:**
**Conjecture:**
```

AC8 is a post-merge founder dogfooding gate: at least three Overlay sessions across at least two calendar days, including one where the dot lit on a real awaiting-you decision and the founder summoned the overlay and dove into the card.
