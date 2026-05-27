---
task_id: 2026-05-26-076-packaged-echoctl-install-boundary
role: builder
last_updated: 2026-05-27T06:10:32Z
claim_branch: agent/packaged-echoctl-install-boundary
claim_sha: 4a0d6d7
---

## current_thesis
Claimed for implementation. The task is an install-boundary spec: make `echoctl` usable as a packaged global CLI/launchd daemon from projects outside `Project_echo`, without turning ECHO into a destination app or broadening operating-model workflow scope.

## locked_decisions
- AC1: `npm pack` must ship only runtime files: built JS/d.ts/SQL, skills, role/workflow assets, and the coord config JSON/schema files; it must exclude source, backlog, raw, wiki, tests, review queue scripts, node_modules, coverage, and dist test artifacts.
- AC2: `build:cli` plus `prepack` must produce complete runtime artifacts, including byte-copying `src/storage/migrations/*.sql` into `dist/storage/migrations/` via a pure Node copy script.
- AC3: add `echoctl daemon` verbs: install, start, stop, restart, status, logs, uninstall; all verbs share override flags for label, plist, logs, home, port, data dir, and db path.
- AC3 install/restart/start must preflight packaged daemon artifacts, XML-safe plist rendering, atomic plist write with `plutil -lint`, launchctl bootstrap/bootout semantics, and post-bootstrap health probing with bootout-on-timeout.
- AC4: daemon stop/restart must use `launchctl bootout`; never use `kill` or `kickstart -k`.
- AC5: extend the package smoke test to install globally from `npm pack`, start a launchd-managed isolated daemon, probe `/mcp`, assert override isolation including `coord_invoke` de-scope behavior, then stop/uninstall without touching production.
- AC6: add `docs/echoctl-install.md` covering install, daily use, upgrade, reset, full removal, and asymmetric upgrade semantics.
- AC7: package metadata becomes installable: `private: false`, package name `echoctl`, version `0.1.0`, Node engine `>=22.0.0`, existing bin entry preserved.
- AC8: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build:cli`, `npm pack`, and the macOS smoke gate must pass or skip only where the spec allows.
- Judgment calls are locked: Node-spawned daemon, private tarball first, macOS-only launchd V1, no postinstall auto-restart, no telemetry/cloud/accounts/UI, one install doc.

## open_questions
- None blocking at claim time.

## dont_touch
- Do not publish to npm, add a brew formula, build a native binary, add Linux/systemd support, package Raycast, or implement the parked workflow primitive.
- Do not add telemetry, phone-home, cloud sync, hosted identity, accounts, management dashboards, auto-update, multi-machine sync, daemon migrate/export commands, or any destination-app surface.
- Do not edit `wiki/`, `docs/BACKLOG.md`, `docs/STATUS.md`, or `docs/NORTH_STAR.md`.
- Do not touch `src/echo-home/`, `src/mcp/`, `src/coord/`, or `src/storage/` except a minimal `src/storage/sqlite.ts` migration-path fix only if AC5 proves it necessary.

## canonical_anchors
- spec: backlog/claimed/2026-05-26-076-packaged-echoctl-install-boundary.md
