# `tools/echo-overlay/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 22 files.

### `tools/echo-overlay/eslint.config.js` — ESLint flat config for the overlay package

**Purpose:** Configures ESLint for the Tauri overlay's TS/TSX sources, using the TypeScript parser/plugin with type-aware recommended rules and disabling stylistic rules that conflict with Prettier.

**Depends on:** `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-config-prettier`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `export default [...]` | config array | `tools/echo-overlay/eslint.config.js:5` | Flat ESLint config: ignores `node_modules/`, `dist/`, `src-tauri/target/`; applies typed lint rules to `src/**` and `test/**` `.ts`/`.tsx` files; appends `eslint-config-prettier` last to disable formatting-conflicting rules. |

### `tools/echo-overlay/scripts/static-smoke.mjs` — static invariant checker for the Tauri shell config

**Purpose:** Node script run as a CI/pre-flight smoke check that reads `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, and `src-tauri/src/main.rs` and asserts a fixed set of window/CSP/capability/Rust-shell invariants (transparency, always-on-top, hidden-at-launch, CSP allow of the local MCP daemon, accessory activation policy, bounded in-flight snapshot command, absolute repo-path guard, SEE+JUMP open-target command) required for the overlay to behave correctly; exits 1 and prints failures if any assertion fails.

**Depends on:** `node:fs`, `node:path`, `node:process`; reads `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `src-tauri/src/main.rs` (Rust shell, out of scope here).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `readJson(relativePath)` | function | `tools/echo-overlay/scripts/static-smoke.mjs:7` | Reads and JSON-parses a file relative to `process.cwd()`. |
| `readText(relativePath)` | function | `tools/echo-overlay/scripts/static-smoke.mjs:8` | Reads a file relative to `process.cwd()` as UTF-8 text. |
| `assert(condition, message)` | function | `tools/echo-overlay/scripts/static-smoke.mjs:12` | Pushes `message` onto the shared `failures` array when `condition` is falsy. |
| entrypoint flow | script body | `tools/echo-overlay/scripts/static-smoke.mjs:16` | Loads config/capabilities/Rust source, asserts macOS private API + main-window transparency/always-on-top/no-decorations/skip-taskbar/hidden-at-launch, CSP allows `http://127.0.0.1:38478`, capabilities include `main`/`core:default`/`opener:default`, Rust shell uses `ActivationPolicy::Accessory`, restores always-on-top, sets clear/transparent NSWindow with floating level, exposes `read_in_flight_snapshot` bounded to `ready`/`claimed`/`pending_review`, scans only each item's own review-request root, rejects non-absolute repo paths, and exposes `open_target`; prints and exits 1 on any failure, else prints a pass message. |

### `tools/echo-overlay/src/App.tsx` — root overlay React component wiring bridge, polling, and panes

**Purpose:** Top-level component for the desktop overlay: resolves config/services from the injected `OverlayBridge`, drives a foreground single-flight poller for full overlay data plus a background poller for the ambient tray dot, wires show/hide/dismiss events and keyboard shortcuts (Cmd/Ctrl+Shift+D/E to toggle in browser dev, Escape to dismiss), and renders `SourceBanner`, `FleetGlanceView`, and `DecisionDive`.

**Depends on:** `./components` (`DecisionDive`, `FleetGlanceView`, `SourceBanner`, `warningsForGlance`), `./lib/fleet` (`FleetNode`), `./lib/model` (`classifyOverlayError`, `loadAmbientDot`, `loadOverlayData`, `readOverlayConfig`, `servicesFromBridge`, `OverlayData`, `OverlayErrorView`), `./lib/poller` (`startSingleFlightPoller`, `PollerHandle`), `./lib/types` (`DecisionSourceLink`), `./lib/bridge` (`hasTauriRuntime`, `tauriBridge`, `OverlayBridge`); `react`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `AppProps` | interface | `tools/echo-overlay/src/App.tsx:17` | Optional-`bridge` props type for `App`, defaulting to the real Tauri bridge. |
| `App({ bridge })` | function (component) | `tools/echo-overlay/src/App.tsx:21` | Root component: manages open/loading/data/error/ambientError/selectedId state; `startOverlayPolling`/`stopOverlayPolling` control the foreground poller; a background effect polls `loadAmbientDot` and pushes it to `bridge.setAmbientDot`; effects wire `bridge.onOverlayShown/onOverlayHidden` (falling back to an immediate start when not running under Tauri) and keyboard toggling/Escape-dismiss; computes `selectedCard` (falls back to first card with a decision) and `sourceError`, and renders `SourceBanner` + either an empty/loading fleet placeholder or `FleetGlanceView` + `DecisionDive`. |
| `selectStableDecision(existing, data)` | function | `tools/echo-overlay/src/App.tsx:173` | Keeps the currently-selected decision id stable across polls if it still has a card, otherwise falls back to the first node with a `card`. |

### `tools/echo-overlay/src/components.tsx` — presentational overlay panes (banner, fleet list, decision dive)

**Purpose:** Pure presentational React components for the overlay UI: the source-warning banner, the read-only fleet glance list, and the read-only decision-dive detail pane with SEE/JUMP source-open buttons.

**Depends on:** `./lib/fleet` (`FleetGlance`, `FleetNode`, `sourceWarnings`), `./lib/types` (`DecisionCard`, `DecisionSourceLink`); `react` (JSX).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `SourceBanner({ warnings, error })` | function (component) | `tools/echo-overlay/src/components.tsx:5` | Renders a banner listing any daemon `error` plus `warnings` strings; renders nothing when both are empty. |
| `FleetGlanceView({ glance, selectedId, onSelect })` | function (component) | `tools/echo-overlay/src/components.tsx:19` | Renders the list of `FleetNode`s as clickable rows (disabled unless `needsYou`), showing state dot, title/itemId, "needs you"/state label, and health counts; shows an empty-row message when there are no nodes and a footnote of scanned review roots count. |
| `DecisionDive({ card, onOpenSource })` | function (component) | `tools/echo-overlay/src/components.tsx:63` | Renders the read-only decision detail: title/whyNow header (with an "A1" signal pill if signals exist), decision/default/deadline fields, `SectionList`s for options/blocking/agents/signals, and per-source "Open <label>" buttons invoking `onOpenSource`; renders an empty-state message when `card` is null. |
| `warningsForGlance(glance)` | function | `tools/echo-overlay/src/components.tsx:124` | Returns `sourceWarnings(glance.source_state)` or `[]` when `glance` is null. |
| `SectionList({ title, values })` | function (component) | `tools/echo-overlay/src/components.tsx:128` | Renders a titled `<ul>` of `values`; renders nothing when `values` is empty. |

### `tools/echo-overlay/src/lib/bridge.ts` — Tauri IPC bridge with browser-dev fallback

**Purpose:** Defines the `OverlayBridge` contract used by the overlay UI to talk to the native Tauri shell (invoke commands, listen for show/hide events) and provides both the real `tauriBridge` (guarded by runtime detection) and a no-op `browserBridge` used when running outside the desktop shell (e.g. `vite dev`).

**Depends on:** `@tauri-apps/api/core` (`invoke`), `@tauri-apps/api/event` (`listen`, `UnlistenFn`), `@tauri-apps/api/path` (`homeDir`), `./fleet` (`DotState`), `./types` (`InFlightSnapshot`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `OVERLAY_SHOWN_EVENT` | const | `tools/echo-overlay/src/lib/bridge.ts:7` | Tauri event name `"overlay:shown"`. |
| `OVERLAY_HIDDEN_EVENT` | const | `tools/echo-overlay/src/lib/bridge.ts:8` | Tauri event name `"overlay:hidden"`. |
| `OverlayBridge` | interface | `tools/echo-overlay/src/lib/bridge.ts:10` | Contract: `readInFlightSnapshot`, `setAmbientDot`, `openTarget`, `dismissOverlay`, `homeDir`, `onOverlayShown`, `onOverlayHidden`. |
| `TauriInternals` | interface | `tools/echo-overlay/src/lib/bridge.ts:20` | Shape of `window.__TAURI_INTERNALS__` used to detect runtime presence. |
| `hasTauriRuntime()` | function | `tools/echo-overlay/src/lib/bridge.ts:25` | Returns true only if `__TAURI_INTERNALS__.invoke` and `.transformCallback` are both functions. |
| `tauriInternals()` | function | `tools/echo-overlay/src/lib/bridge.ts:30` | Safely reads `window.__TAURI_INTERNALS__`, returning null outside a DOM/window context or when not an object. |
| `emptyInFlightSnapshot()` | function | `tools/echo-overlay/src/lib/bridge.ts:36` | Returns an empty `InFlightSnapshot` (`items`, `reviewRequests`, `scannedReviewRoots` all `[]`). |
| `noopUnlisten` | const | `tools/echo-overlay/src/lib/bridge.ts:42` | No-op `UnlistenFn` used by the browser bridge's event listeners. |
| `browserBridge` | const (OverlayBridge) | `tools/echo-overlay/src/lib/bridge.ts:44` | Fallback bridge for non-Tauri (browser dev) contexts: snapshot reads return empty, dot/openTarget/dismiss are no-ops, `homeDir` resolves `VITE_ECHO_HOME_DIR` or throws, listeners resolve to `noopUnlisten`. |
| `tauriBridge` | const (OverlayBridge) | `tools/echo-overlay/src/lib/bridge.ts:58` | Real bridge: each method calls the corresponding Tauri `invoke`/`listen`/`homeDir` API when `hasTauriRuntime()` is true, else delegates to `browserBridge`. |

### `tools/echo-overlay/src/lib/fleet.ts` — fleet glance composition and source-warning derivation

**Purpose:** Pure business logic joining `pending_decisions` cards, `coord_status` health rows, and the bounded in-flight backlog snapshot into a single `FleetGlance` view model, plus deriving the ambient tray-dot state and human-readable source-freshness warnings.

**Depends on:** `./types` (`CoordStatusOpenDeadline`, `CoordStatusRecentMiss`, `CoordStatusResult`, `DecisionCard`, `InFlightItem`, `PendingDecisionsResult`, `PendingDecisionsSourceState`, `ReviewRequestSummary`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DotState` | type | `tools/echo-overlay/src/lib/fleet.ts:12` | `"lit" \| "dark" \| "unknown"` ambient tray-dot states. |
| `FleetNodeState` | type | `tools/echo-overlay/src/lib/fleet.ts:13` | `"running" \| "reviewing" \| "blocked" \| "needs_you" \| "merged"` per-item fleet states. |
| `FleetNode` | interface | `tools/echo-overlay/src/lib/fleet.ts:15` | View model for one in-flight backlog item: id/title/state/needsYou/signals plus optional health counts and optional attached `DecisionCard`. |
| `FleetGlance` | interface | `tools/echo-overlay/src/lib/fleet.ts:25` | Composed view: `nodes`, `source_state`, `scannedReviewRoots`. |
| `FleetInputs` | interface | `tools/echo-overlay/src/lib/fleet.ts:31` | Inputs to `composeFleetGlance`: `pending`, `coord`, `inFlightItems`, `reviewRequests`, optional `scannedReviewRoots`. |
| `ambientDotState(result, error)` | function | `tools/echo-overlay/src/lib/fleet.ts:39` | Returns `"unknown"` on error/null/source-warning, else `"lit"` iff `decisions.length > 0`, else `"dark"`. |
| `sourceWarnings(state)` | function | `tools/echo-overlay/src/lib/fleet.ts:44` | Builds human-readable warning strings for behind-origin count, stale/never-seen upstream, dirty backlog, and partial scan. |
| `composeFleetGlance(inputs)` | function | `tools/echo-overlay/src/lib/fleet.ts:61` | Maps decision cards by extracted item id, builds a correlation-id→item-id map from review requests, builds per-item health counts from coord_status deadlines/misses, then maps each in-flight item to a `FleetNode` with derived state/needsYou/signals/health/card. |
| `buildCorrelationItemMap(requests)` | function | `tools/echo-overlay/src/lib/fleet.ts:93` | Builds a `Map<correlationId, itemId>` from the bounded review-request list. |
| `buildHealthByItem(coord, correlationToItem)` | function | `tools/echo-overlay/src/lib/fleet.ts:101` | Aggregates `open_deadlines` and `recent_missed` coord rows into per-item `{open_deadlines, recent_misses}` counts via the correlation map, dropping unmapped rows. |
| `attachHealth(out, correlationToItem, row, key)` | function | `tools/echo-overlay/src/lib/fleet.ts:115` | Increments the named health counter for the item mapped from `row.key`'s correlation id, no-op if unmapped. |
| `deriveState(item, needsYou, health)` | function | `tools/echo-overlay/src/lib/fleet.ts:128` | Precedence: `needsYou` → `"needs_you"`; else any open health issue → `"blocked"`; else `stage === "claimed"` → `"running"`; else `"reviewing"`. |
| `itemIdFromDecisionCard(card)` | function | `tools/echo-overlay/src/lib/fleet.ts:139` | Extracts the `YYYY-MM-DD-NNN-slug` item id prefix from a decision card's `id` (which may include a `#round` suffix) via regex. |
| `hasSourceWarning(state)` | function | `tools/echo-overlay/src/lib/fleet.ts:144` | True if behind>0, upstream_stale, dirty, or partial. |
| `formatAge(thenMs, nowMs)` | function | `tools/echo-overlay/src/lib/fleet.ts:148` | Formats an age in minutes/hours (`"<1m"`, `"Nm"`, `"Nh"`), `"unknown"` if `thenMs` is not finite. |

### `tools/echo-overlay/src/lib/mcp.ts` — JSON-RPC/MCP HTTP client for the local ECHO daemon

**Purpose:** Minimal MCP client used by the overlay to call `pending_decisions` and `coord_status` tools on the local ECHO daemon over HTTP JSON-RPC (with SSE-response support), normalizing daemon-unreachable failures into `EchoDaemonError`.

**Depends on:** `./types` (`CoordStatusResult`, `PendingDecisionsResult`); browser `fetch`/`AbortController`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ECHO_MCP_URL` | const | `tools/echo-overlay/src/lib/mcp.ts:3` | `"http://127.0.0.1:38478/mcp"` — the local daemon's MCP endpoint. |
| `JsonRpcEnvelope` | interface | `tools/echo-overlay/src/lib/mcp.ts:5` | Shape of a parsed JSON-RPC 2.0 response (`result`/`error`). |
| `McpTextContent` | interface | `tools/echo-overlay/src/lib/mcp.ts:12` | `{type: "text", text: string}` MCP content item. |
| `McpToolResult` | interface | `tools/echo-overlay/src/lib/mcp.ts:17` | Shape of an MCP tool-call result: optional `content`, `structuredContent`, `isError`. |
| `EchoDaemonError` | class | `tools/echo-overlay/src/lib/mcp.ts:23` | Error subclass (`name = "EchoDaemonError"`) signaling the local daemon is unreachable/timed out. |
| `pendingDecisions(repoPath)` | function | `tools/echo-overlay/src/lib/mcp.ts:30` | Calls the `pending_decisions` tool with `{repo_path: repoPath}`. |
| `coordStatus()` | function | `tools/echo-overlay/src/lib/mcp.ts:34` | Calls the `coord_status` tool with no arguments. |
| `callTool(name, args, timeoutMs=2000)` | function | `tools/echo-overlay/src/lib/mcp.ts:38` | POSTs a JSON-RPC `tools/call` request to `ECHO_MCP_URL` with a 2s abort timeout by default; throws `EchoDaemonError` on non-OK HTTP, fetch `TypeError`, or abort; parses the response via `parseMcpResponse` and unwraps via `unwrapToolResult`. |
| `parseMcpResponse(raw)` | function | `tools/echo-overlay/src/lib/mcp.ts:82` | Parses either a plain JSON body or an SSE `data:` line (ignoring `data: [DONE]`) into a `JsonRpcEnvelope`; throws if an SSE body has no usable data line. |
| `unwrapToolResult(result)` | function | `tools/echo-overlay/src/lib/mcp.ts:95` | Extracts the tool payload: throws on missing result or `isError: true` (using the first text content as the message), prefers `structuredContent`, else JSON-parses the first text content, else returns the raw result. |

### `tools/echo-overlay/src/lib/model.ts` — overlay data-loading orchestration and config/error normalization

**Purpose:** Glue layer between the bridge, the MCP client, and `composeFleetGlance`: resolves the configured repo path, loads full overlay data (pending decisions + coord status + in-flight snapshot) and the lightweight ambient-dot data, and classifies thrown errors into a UI-facing `OverlayErrorView`.

**Depends on:** `./bridge` (`OverlayBridge`), `./fleet` (`ambientDotState`, `composeFleetGlance`, `DotState`, `FleetGlance`), `./mcp` (`coordStatus`, `EchoDaemonError`, `pendingDecisions`), `./repo-path` (`InvalidRepoPathError`, `normalizeRepoPath`), `./types` (`CoordStatusResult`, `PendingDecisionsResult`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `REPO_PATH_STORAGE_KEY` | const | `tools/echo-overlay/src/lib/model.ts:7` | `"echo.overlay.repoPath"` localStorage key. |
| `OverlayConfig` | interface | `tools/echo-overlay/src/lib/model.ts:9` | `{repoPath?: string}` configured repo path. |
| `OverlayData` | interface | `tools/echo-overlay/src/lib/model.ts:13` | Full loaded overlay state: `repoPath`, `pending`, `coord`, `glance`. |
| `OverlayServices` | interface | `tools/echo-overlay/src/lib/model.ts:20` | Injectable service functions: `homeDir`, `pendingDecisions`, `coordStatus`, `readInFlightSnapshot`. |
| `OverlayErrorKind` | type | `tools/echo-overlay/src/lib/model.ts:27` | `"repo_path" \| "daemon" \| "unknown"`. |
| `OverlayErrorView` | interface | `tools/echo-overlay/src/lib/model.ts:29` | `{kind, message}` UI-facing error shape. |
| `servicesFromBridge(bridge)` | function | `tools/echo-overlay/src/lib/model.ts:34` | Builds `OverlayServices` wiring `bridge.homeDir`/`readInFlightSnapshot` and the real `pendingDecisions`/`coordStatus` MCP calls. |
| `resolveRepoPath(config, services)` | function | `tools/echo-overlay/src/lib/model.ts:43` | Resolves `~`-relative or unset repo paths against `services.homeDir()` (only calling it when needed) via `normalizeRepoPath`, throwing `InvalidRepoPathError` on failure. |
| `repoPathNeedsHome(repoPath)` | function | `tools/echo-overlay/src/lib/model.ts:50` | True when `repoPath` is unset/blank/`"~"`/starts with `"~/"`. |
| `loadOverlayData(config, services)` | function | `tools/echo-overlay/src/lib/model.ts:55` | Resolves the repo path, fetches `pendingDecisions`, `coordStatus`, and `readInFlightSnapshot` in parallel, and composes them into `OverlayData` via `composeFleetGlance`. |
| `loadAmbientDot(config, services)` | function | `tools/echo-overlay/src/lib/model.ts:76` | Resolves the repo path, fetches pending decisions only, and returns `ambientDotState(pending)`. |
| `classifyOverlayError(err)` | function | `tools/echo-overlay/src/lib/model.ts:82` | Maps `InvalidRepoPathError`→`"repo_path"`, `EchoDaemonError`→`"daemon"`, else `"unknown"` (stringifying non-Error values). |
| `readOverlayConfig(storage)` | function | `tools/echo-overlay/src/lib/model.ts:92` | Reads the configured repo path from `localStorage` (falling back to `VITE_ECHO_REPO_PATH` env var), tolerating storage access errors. |

### `tools/echo-overlay/src/lib/poller.ts` — single-flight polling with error backoff

**Purpose:** Generic reusable poller used by both the foreground overlay-data poll and the background ambient-dot poll: runs `load()` immediately then on an interval, ensures only one in-flight call at a time, suppresses results/errors after `stop()`, and backs off further polling for a period after an `EchoDaemonError`.

**Depends on:** `./mcp` (`EchoDaemonError`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `PollerTimers` | interface | `tools/echo-overlay/src/lib/poller.ts:3` | Injectable timer abstraction: `setInterval`, `clearInterval`, `now`. |
| `PollerOptions<T>` | interface | `tools/echo-overlay/src/lib/poller.ts:9` | `load`, `onResult`, `onError`, optional `intervalMs`/`backoffMs`/`timers`. |
| `PollerHandle` | interface | `tools/echo-overlay/src/lib/poller.ts:18` | `{stop, tick}` control handle returned by the poller. |
| `DEFAULT_POLL_INTERVAL_MS` | const | `tools/echo-overlay/src/lib/poller.ts:23` | `5_000` ms default poll interval. |
| `DEFAULT_BACKOFF_MS` | const | `tools/echo-overlay/src/lib/poller.ts:24` | `15_000` ms default backoff after a daemon-unreachable error. |
| `startSingleFlightPoller(options)` | function | `tools/echo-overlay/src/lib/poller.ts:26` | Immediately invokes `tick()` then schedules further ticks via `timers.setInterval`; `tick` is a no-op while stopped, already in-flight, or within the backoff window; on success clears backoff and calls `onResult`; on `EchoDaemonError` sets `backoffUntil = now() + backoffMs` before calling `onError`; returns `{stop, tick}` where `stop` sets `stopped` and clears the interval. |

### `tools/echo-overlay/src/lib/repo-path.ts` — repo path normalization/validation

**Purpose:** Validates and normalizes the user-configured repo path (expanding `~`/`~/` against a supplied home directory, requiring an absolute result) before it is passed to `pending_decisions`.

**Depends on:** none (pure logic).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DEFAULT_REPO_PATH` | const | `tools/echo-overlay/src/lib/repo-path.ts:1` | `"~/Desktop/Project_echo"` default configured path. |
| `RepoPathErrorCode` | type | `tools/echo-overlay/src/lib/repo-path.ts:3` | `"relative" \| "empty"`. |
| `RepoPathOk` | interface | `tools/echo-overlay/src/lib/repo-path.ts:5` | `{ok: true, path}`. |
| `RepoPathError` | interface | `tools/echo-overlay/src/lib/repo-path.ts:10` | `{ok: false, code, message}`. |
| `RepoPathResult` | type | `tools/echo-overlay/src/lib/repo-path.ts:16` | `RepoPathOk \| RepoPathError`. |
| `InvalidRepoPathError` | class | `tools/echo-overlay/src/lib/repo-path.ts:18` | Error subclass carrying a `code: RepoPathErrorCode`. |
| `normalizeRepoPath(input, homeDir)` | function | `tools/echo-overlay/src/lib/repo-path.ts:28` | Trims input (defaulting to `DEFAULT_REPO_PATH`), rejects empty as `"empty"`, expands `~`/`~/` via `homeDir`, rejects non-absolute as `"relative"`, else strips trailing slashes and returns `{ok:true, path}`. |
| `requireRepoPath(input, homeDir)` | function | `tools/echo-overlay/src/lib/repo-path.ts:44` | Calls `normalizeRepoPath` and throws `InvalidRepoPathError` on failure, else returns the path. |
| `expandHome(path, homeDir)` | function | `tools/echo-overlay/src/lib/repo-path.ts:50` | Replaces a leading `~` or `~/` with `homeDir`. |
| `isAbsolutePath(path)` | function | `tools/echo-overlay/src/lib/repo-path.ts:56` | True for POSIX-absolute (`/...`) or Windows drive-letter-absolute (`C:\...`/`C:/...`) paths. |
| `normalizeSlashes(path)` | function | `tools/echo-overlay/src/lib/repo-path.ts:60` | Strips trailing slashes, falling back to `"/"` if the result would be empty. |

### `tools/echo-overlay/src/lib/types.ts` — wire-contract type definitions mirrored from the MCP server

**Purpose:** TypeScript type definitions for the `pending_decisions`/`coord_status` MCP tool payloads and the Tauri-provided bounded in-flight backlog snapshot; intentionally duplicated from `src/mcp/tools/internal/decision-card-types.ts` to keep the overlay package isolated/self-contained.

**Depends on:** none (type-only; mirrors `src/mcp/tools/internal/decision-card-types.ts`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DecisionSignal` | interface | `tools/echo-overlay/src/lib/types.ts:5` | `{kind: "runaway_churn", detail}` signal on a decision card. |
| `DecisionSourceLink` | interface | `tools/echo-overlay/src/lib/types.ts:10` | `{label, href}` SEE/JUMP source target. |
| `DecisionCard` | interface | `tools/echo-overlay/src/lib/types.ts:15` | Full pending-decision card: id/title/decision/whyNow/options/default/deadline?/blocking?/agents/sources/signals. |
| `PendingDecisionsSourceState` | interface | `tools/echo-overlay/src/lib/types.ts:29` | Freshness metadata: local/upstream head, `behind` count, upstream staleness, dirty/partial flags, scanned item count. |
| `PendingDecisionsResult` | interface | `tools/echo-overlay/src/lib/types.ts:40` | `pending_decisions` tool result: `decisions`, `source_breakdown`, `source_state`, optional `result_caps`. |
| `CoordStatusOpenDeadline` | interface | `tools/echo-overlay/src/lib/types.ts:54` | An open coordination deadline row: tier/subject_role/event_type/key/expected_by/age_sec. |
| `CoordStatusRecentMiss` | interface | `tools/echo-overlay/src/lib/types.ts:63` | A recently-missed coordination event row. |
| `CoordStatusLastMissSlot` | interface | `tools/echo-overlay/src/lib/types.ts:71` | Last-miss-per-role-per-event-type slot. |
| `CoordStatusPerRoleLastTick` | interface | `tools/echo-overlay/src/lib/types.ts:80` | Per-role last tick timing/health metadata. |
| `CoordStatusResult` | interface | `tools/echo-overlay/src/lib/types.ts:89` | `coord_status` tool result aggregating the above plus daemon uptime and reconstruction watermark. |
| `InFlightStage` | type | `tools/echo-overlay/src/lib/types.ts:101` | `"ready" \| "claimed" \| "pending_review"` bounded backlog stages the Tauri shell scans. |
| `InFlightItem` | interface | `tools/echo-overlay/src/lib/types.ts:103` | `{itemId, title, stage, path}` one in-flight backlog item. |
| `ReviewRequestSummary` | interface | `tools/echo-overlay/src/lib/types.ts:110` | `{itemId, round, correlationId, path}` one bounded review request. |
| `InFlightSnapshot` | interface | `tools/echo-overlay/src/lib/types.ts:117` | `{items, reviewRequests, scannedReviewRoots}` shape returned by `read_in_flight_snapshot`. |

### `tools/echo-overlay/src/main.tsx` — React app entrypoint

**Purpose:** Mounts the `App` component into the `#root` DOM element inside `StrictMode`, importing global styles; throws if the root element is missing.

**Depends on:** `react`, `react-dom/client`, `./App`, `./styles.css`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint flow | script body | `tools/echo-overlay/src/main.tsx:1` | Looks up `#root`, throws `"ECHO overlay root element missing"` if absent, else calls `createRoot(root).render(<StrictMode><App/></StrictMode>)`. |

### `tools/echo-overlay/test/bridge.test.ts` — tests for the Tauri bridge browser fallback

**Purpose:** Exercises `src/lib/bridge.ts`, verifying that outside a Tauri runtime (`hasTauriRuntime() === false`) all bridge methods resolve to safe no-op/empty values, event listeners resolve to no-op unlisten functions, and a partial `__TAURI_INTERNALS__` object (missing IPC functions) is still treated as "no runtime."

**Depends on:** `../src/lib/bridge` (`hasTauriRuntime`, `tauriBridge`); `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "tauriBridge browser fallback"` | describe block | `tools/echo-overlay/test/bridge.test.ts:4` | Covers: no Tauri-internals calls outside the desktop shell (snapshot/dot/dismiss resolve to empty/undefined defaults); no-op show/hide listeners; falling back correctly when `__TAURI_INTERNALS__` exists but lacks `invoke`/`transformCallback`. |

### `tools/echo-overlay/test/decision-dive.test.tsx` — tests for the `DecisionDive` component

**Purpose:** Exercises `src/components.tsx`'s `DecisionDive`, verifying it renders all `DecisionCard` fields (title, decision, whyNow, default shown twice, an option, a blocking item, a formatted signal), that clicking a source button invokes `onOpenSource` with the right source, that no write-action buttons (approve/pushback/write/act) are ever rendered, and that a null card renders the empty read-only state with no buttons.

**Depends on:** `@testing-library/react`, `../src/components` (`DecisionDive`), `./fixtures` (`decisionCard`); `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "DecisionDive"` | describe block | `tools/echo-overlay/test/decision-dive.test.tsx:6` | Covers rendering of full card fields + SEE/JUMP source click behavior + absence of write-action buttons, and the empty-selection read-only state. |

### `tools/echo-overlay/test/fixtures.ts` — shared test fixtures for overlay tests

**Purpose:** Provides reusable builder functions and a base fixture for `PendingDecisionsSourceState`, `DecisionCard`, `PendingDecisionsResult`, and `CoordStatusResult`, used across the overlay's test suite.

**Depends on:** `../src/lib/types` (`CoordStatusResult`, `DecisionCard`, `PendingDecisionsResult`, `PendingDecisionsSourceState`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `freshSourceState` | const | `tools/echo-overlay/test/fixtures.ts:8` | A fresh (not behind, not stale/dirty/partial) `PendingDecisionsSourceState` fixture. |
| `decisionCard(overrides)` | function | `tools/echo-overlay/test/fixtures.ts:19` | Builds a full `DecisionCard` fixture (item `080 · decisions overlay`, r2, with sources/signals/blocking), merging in `overrides`. |
| `pendingResult(decisions, sourceState)` | function | `tools/echo-overlay/test/fixtures.ts:45` | Builds a `PendingDecisionsResult` fixture wrapping given `decisions` and `sourceState` (default `freshSourceState`). |
| `coordStatus(overrides)` | function | `tools/echo-overlay/test/fixtures.ts:55` | Builds a `CoordStatusResult` fixture with empty deadline/miss lists by default, merging in `overrides`. |

### `tools/echo-overlay/test/fleet.test.ts` — tests for fleet glance composition

**Purpose:** Exercises `src/lib/fleet.ts`'s `composeFleetGlance` and `buildCorrelationItemMap`, verifying correct joining of coord_status correlation-id rows to bounded in-flight review requests (health attached only for mapped items), correct state derivation (`needs_you`/`blocked`/`reviewing`), and that unmapped correlation ids are dropped rather than silently misattributed.

**Depends on:** `../src/lib/fleet` (`buildCorrelationItemMap`, `composeFleetGlance`), `./fixtures` (`coordStatus`, `decisionCard`, `pendingResult`); `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "fleet glance composition"` | describe block | `tools/echo-overlay/test/fleet.test.ts:5` | Covers joining coord_status deadlines/misses to in-flight items via correlation id (asserting `needs_you`/`blocked`/`reviewing` states and health-count aggregation, and `scannedReviewRoots` passthrough), and that `buildCorrelationItemMap` drops unmapped correlation ids. |

### `tools/echo-overlay/test/mcp.test.ts` — tests for the MCP HTTP client

**Purpose:** Exercises `src/lib/mcp.ts`, verifying `pending_decisions`/`coord_status` build the correct JSON-RPC request bodies/headers, correctly unwrap both `structuredContent` and text-content JSON responses, correctly parse SSE-framed JSON-RPC responses, and convert fetch-level failures into `EchoDaemonError`.

**Depends on:** `../src/lib/mcp` (`EchoDaemonError`, `callTool`, `coordStatus`, `parseMcpResponse`, `pendingDecisions`), `./fixtures` (`coordStatus as coordFixture`, `decisionCard`, `pendingResult`); `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "MCP client"` | describe block | `tools/echo-overlay/test/mcp.test.ts:5` | Covers correct `tools/call` request shape/headers for `pending_decisions`, `structuredContent`/text-content unwrapping for `coord_status`, SSE JSON-RPC parsing, and daemon-unreachable → `EchoDaemonError` conversion on fetch `TypeError`. |
| `jsonResponse(body, init)` | function | `tools/echo-overlay/test/mcp.test.ts:75` | Builds a `Response` object with a JSON body and `Content-Type: application/json` for mocking `fetch`. |

### `tools/echo-overlay/test/poller.test.ts` — tests for the single-flight poller

**Purpose:** Exercises `src/lib/poller.ts`'s `startSingleFlightPoller`, verifying single-flight suppression of overlapping ticks, interval teardown and suppression of late results/errors after `stop()`, and the backoff-after-`EchoDaemonError` window (no re-fetch until `backoffMs` has elapsed).

**Depends on:** `../src/lib/mcp` (`EchoDaemonError`), `../src/lib/poller` (`startSingleFlightPoller`, `PollerTimers`); `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "startSingleFlightPoller"` | describe block | `tools/echo-overlay/test/poller.test.ts:5` | Covers single-flight behavior + stop suppressing late results, and backoff timing that blocks re-fetch until `backoffMs` elapses after an `EchoDaemonError`. |
| `fakeTimers()` | function | `tools/echo-overlay/test/poller.test.ts:66` | Builds an injectable `PollerTimers` fake with a manually advanceable clock (`advanceTo`) and a fixed `"interval-1"` handle. |
| `defer<T>()` | function | `tools/echo-overlay/test/poller.test.ts:79` | Returns `{promise, resolve}` for manually controlling when a mocked `load()` promise settles. |
| `flushMicrotasks()` | function | `tools/echo-overlay/test/poller.test.ts:87` | Awaits two resolved promises to flush pending microtasks in tests. |

### `tools/echo-overlay/test/repo-path-and-dot.test.ts` — tests for repo-path normalization and ambient-dot classification

**Purpose:** Exercises `src/lib/repo-path.ts` (`normalizeRepoPath`, `requireRepoPath`) and the repo-path/error-classification paths of `src/lib/model.ts` (`resolveRepoPath`, `classifyOverlayError`, `loadAmbientDot`) and `src/lib/fleet.ts` (`ambientDotState`); covers default-path resolution against home dir, absolute-path passthrough (skipping `homeDir()` entirely), relative-path rejection before any daemon call, and dot-state classification across lit/dark/unknown (stale/dirty/partial/error) cases.

**Depends on:** `../src/lib/fleet` (`ambientDotState`), `../src/lib/model` (`classifyOverlayError`, `loadAmbientDot`, `resolveRepoPath`), `../src/lib/repo-path` (`InvalidRepoPathError`, `normalizeRepoPath`, `requireRepoPath`), `./fixtures` (`decisionCard`, `freshSourceState`, `pendingResult`); `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "repoPath resolution"` | describe block | `tools/echo-overlay/test/repo-path-and-dot.test.ts:7` | Covers default-path expansion against home dir, absolute-path passthrough without calling `homeDir`, relative-path rejection (both `normalizeRepoPath` and `requireRepoPath` throwing `InvalidRepoPathError`), and that `classifyOverlayError`/`ambientDotState` treat an invalid repo path distinctly from a daemon-down error while leaving the dot `"unknown"`. |
| `describe: "ambient dot predicate"` | describe block | `tools/echo-overlay/test/repo-path-and-dot.test.ts:55` | Covers `ambientDotState` returning `"lit"` for at least one card, `"dark"` for a fresh zero-card read, and `"unknown"` for behind/stale/dirty/partial source states or a thrown daemon error. |

### `tools/echo-overlay/test/setup.ts` — vitest global test setup

**Purpose:** Global vitest setup file (registered via `vitest.config.ts`) that installs `jest-dom` matchers and runs Testing Library's `cleanup()` after each test to unmount rendered components.

**Depends on:** `@testing-library/jest-dom/vitest`, `@testing-library/react` (`cleanup`); `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `afterEach(cleanup)` | hook registration | `tools/echo-overlay/test/setup.ts:5` | Registers a global `afterEach` that calls Testing Library's `cleanup()` to unmount components between tests. |

### `tools/echo-overlay/vite.config.ts` — Vite dev/build config for the overlay

**Purpose:** Configures Vite for the Tauri overlay frontend: enables the React plugin, defaults `VITE_ECHO_REPO_PATH` to the repo root two levels up when unset, fixes the dev server to `127.0.0.1:1420` (required by Tauri), and whitelists `VITE_`/`TAURI_` env prefixes.

**Depends on:** `node:path`, `node:url`, `@vitejs/plugin-react`, `vite`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `overlayDir` | const | `tools/echo-overlay/vite.config.ts:6` | Directory of this config file, derived from `import.meta.url`. |
| module-level env default | script body | `tools/echo-overlay/vite.config.ts:7` | Sets `process.env.VITE_ECHO_REPO_PATH` to `path.resolve(overlayDir, "../..")` (the repo root) if not already set. |
| `export default defineConfig({...})` | config | `tools/echo-overlay/vite.config.ts:9` | Vite config: React plugin, `clearScreen: false`, dev server bound to `127.0.0.1:1420` with `strictPort: true`, `envPrefix: ["VITE_", "TAURI_"]`. |

### `tools/echo-overlay/vitest.config.ts` — Vitest test-runner config for the overlay

**Purpose:** Configures Vitest for the overlay package: React plugin support, jsdom test environment, and the shared `test/setup.ts` setup file.

**Depends on:** `@vitejs/plugin-react`, `vitest/config`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `export default defineConfig({...})` | config | `tools/echo-overlay/vitest.config.ts:4` | Vitest config: React plugin, `environment: "jsdom"`, `setupFiles: ["./test/setup.ts"]`. |
