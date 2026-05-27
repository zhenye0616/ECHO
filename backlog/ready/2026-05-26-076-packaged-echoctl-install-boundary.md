---
id: 2026-05-26-076-packaged-echoctl-install-boundary
title: "Packaged `echoctl` install boundary — npm-pack tarball, packaged daemon, launchd plist targeting `dist/`, macOS-only V1; founder can use ECHO across all projects without dev-mode dependency on the source repo"
status: ready
priority: HIGH
estimate: 2-3d
created: 2026-05-26
blocked_by: []
task_state_ref: 2026-05-26-076-packaged-echoctl-install-boundary
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - package.json                                           # AC1 + AC7 — flip `private: false`; fix `files` allowlist; add `prepack` script; bin entry already exists from 074; daemon-script changes per AC3
  - src/cli/index.ts                                       # AC3 — register new `daemon` subcommand in the parseArgs dispatch
  - src/cli/commands/daemon.ts                             # AC3 NEW — daemon lifecycle commands: install / start / stop / restart / status / logs (uses `launchctl bootstrap|bootout|kickstart` per AC4)
  - tests/cli/daemon.test.ts                               # AC3 + AC4 NEW — unit tests for the daemon lifecycle command (test seams for launchctl calls)
  - tests/cli/shell-reachable.test.ts                      # AC5 — extend the existing pack-shape smoke to ALSO START the packaged daemon, probe /mcp, SIGTERM/cleanup; catches the AC2 SQL-migration bug + the AC1.4 coord-config bug
  - scripts/launchd/install.sh                             # AC3 — plist target changes from `npm run daemon` (PROJECT_DIR coupling) to `node <installed-package>/dist/daemon/index.js`; no `WorkingDirectory` set to source repo
  - scripts/launchd/uninstall.sh                           # AC4 — use `launchctl bootout` for clean stop; align with the AC4 upgrade-safe stop semantics
  - docs/echoctl-install.md                                # AC6 NEW — single canonical install doc: build → pack → install-globally → daemon-install → init → verify; upgrade path; uninstall; reset
spec_refs:
  - raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md  # §"What's deferred" — "Install topology (one install vs two; brew vs pkg vs Raycast Store)" was explicitly deferred to "after wizard UX is implemented; install is the wrapper around the wizard." 074 shipped the wizard; this spec answers the deferred question.
  - wiki/principles/felt-not-seen.md                       # line 32 explicitly permits install-once setup. A CLI installer is infrastructure, not a destination app. This spec stays inside that boundary — no dashboards, accounts, telemetry, or management UI.
  - backlog/complete/2026-05-25-074-echo-cli-binary.md     # AC1.1 + AC9 (075) `files` allowlist precedent — narrow extension allowed; this spec broadens it definitively.
  - backlog/complete/2026-05-25-075-first-demo-workflow.md # AC9 narrow allowlist extension for assets/echo-workflows/**; this spec generalizes the pattern to all runtime assets the daemon needs at install time.
  - package.json                                            # current state: `private: true` (line 4); daemon script uses `vite-node src/daemon/index.ts` (line 19) — dev path that will NOT survive a production install
  - scripts/launchd/install.sh                              # current launchd plist runs `npm run daemon` from `PROJECT_DIR` (lines 50, 55) — hard-coupled to the source tree
  - src/storage/sqlite.ts                                   # daemon's SQLite runtime expects SQL migration files BESIDE the built JS (line 17 region); `tsc` does NOT copy `src/storage/migrations/*.sql` into `dist/` — this is a real bug that breaks packed daemon startup
  - src/coord/roles.ts                                      # daemon hard-loads coord role config + schema from `tools/review-queue/` (line 56 region) — `coord-roles.json` and the reviewer schema MUST ship in the package
  - src/echo-home/adapters/skill-sync.ts                    # skills get overwritten into `~/.echo/skills/` (line 80 region); roles + workflows preserve user edits (072 + 075 design). This spec NAMES the asymmetry; does NOT redesign it.
  - tools/review-queue/coord-roles.json                     # ships in tarball per AC1
  - tools/review-queue/reviewers.json                       # ships in tarball per AC1
  - tools/review-queue/schemas/                             # whichever JSON schema files coord/roles.ts validates against; ship in tarball per AC1
  - CLAUDE.md                                               # operating-model file; this spec does not touch the operating model
---

# Packaged `echoctl` install boundary

## Why this spec exists

The 2026-05-25 ECHO Pro design archive (`raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md` §"What's deferred") explicitly punted the "install topology" question until after the wizard UX was built. 074 shipped the wizard. 070-075 are all in `complete/`. The deferred question is now the V1 gate, and dogfood has surfaced it cleanly:

> *"workflow isn't the important thing. i can manully trogger the spec review here and ask you to keep review until convergence. problem is that i can only use echo in this project not the rest of my project. that why i need to package it so i can actaully use it as a product instead of iterating here"* — founder, 2026-05-26

Today's reality blocks the founder from using ECHO across `NavyPowerTwin`, `PowerTwinLab_Demo`, `Statellite_Detection`, etc.:

- `package.json` is `private: true` — cannot be published or globally installed via tarball
- `scripts/launchd/install.sh:50` runs `npm run daemon` from `PROJECT_DIR` — the daemon process LITERALLY depends on the source repo being on disk
- `npm run daemon` uses `vite-node src/daemon/index.ts` — a development-time entrypoint that won't survive a production install
- Every code change requires `npm run build:cli && npm link` — the founder can never trust ECHO across other projects because the next iteration in this repo might break their daily use
- The basketball-team product story (*"ECHO is the coordination layer that turns 5 isolated AI tools into one coordinated team"*) is meaningless if the team only plays in one gym

**Codex consult (2026-05-26) reframed 076 sharply:** *"076 should create an install boundary, not a new workflow primitive. 'Use ECHO from NavyPowerTwin without touching Project_echo' is now more important than 'add spec-review fanout.'"* The parked workflow primitive becomes 077-or-later, blocked on 076.

The "all over the place" felt diagnosis from the same 2026-05-26 strategist conversation had a deeper cause that the moment-enumeration didn't surface: the felt experience IS thin because the founder is the only user, and "using" ECHO requires being a developer of ECHO. No customer can experience ECHO until packaging exists — not even the founder, in any project that isn't this one.

## Architectural sketch

```
─────────────────────────────────────────────────────────────────────────
BEFORE 076 (today)                          AFTER 076
─────────────────────────────────────────────────────────────────────────
~/Desktop/Project_echo                       ~/Desktop/Project_echo
├── (source repo — must stay on disk)        ├── (source repo — dev only;
├── npm link → ~/.npm-global/bin/echoctl     │     can move/delete without
└── npm run daemon                            │     breaking installed ECHO)
    └── vite-node src/daemon/index.ts        └── npm pack → echoctl-0.1.0.tgz
                                                  │
        ↑                                         ↓
        │                                   ──────────────────────────────
launchd plist:                              ~/.npm-global/lib/node_modules/echoctl/
  ProgramArguments:                         ├── dist/                ← packaged code
    - npm                                    │   ├── cli/index.js    ← bin target
    - run                                    │   ├── daemon/index.js ← daemon entrypoint
    - daemon                                 │   └── storage/migrations/*.sql ← AC2
  WorkingDirectory: $PROJECT_DIR            ├── skills/              ← AC1
                                            ├── assets/echo-roles/   ← AC1
                                            ├── assets/echo-workflows/ ← AC1
                                            └── tools/review-queue/  ← AC1 (coord config)
                                                ├── coord-roles.json
                                                ├── reviewers.json
                                                └── schemas/

                                            ~/.npm-global/bin/echoctl
                                              → packaged dist/cli/index.js

                                            launchd plist (rewritten by AC3):
                                              ProgramArguments:
                                                - node
                                                - ~/.npm-global/lib/node_modules/
                                                    echoctl/dist/daemon/index.js
                                              # No WorkingDirectory; no PROJECT_DIR.
                                              # KeepAlive preserved.

                                            $ echoctl daemon install   # registers plist
                                            $ echoctl daemon start     # bootstraps
                                            $ echoctl daemon status    # health check
                                            $ echoctl daemon restart   # bootout + bootstrap
                                            $ echoctl daemon stop      # bootout
                                            $ echoctl daemon logs      # tail launchd log
                                            $ echoctl daemon uninstall # bootout + plist rm

                                            # Daily use from any project:
                                            $ cd ~/Desktop/NavyPowerTwin
                                            $ echoctl run spec-review --file spec.md
                                            # Works. No source repo needed.
```

The install boundary is the difference between *"ECHO is a dev artifact I rebuild"* and *"ECHO is software I install once and rely on."* Same code; different relationship.

## Judgment calls flagged for r1 reviewer

The calls below are the spec author's picks (joint claude + codex). Reviewers should push back if any feels wrong.

- **J1. Daemon stays Node-spawned; no native binary (pkg / nexe / bun build) in V1.** Codex consult: *"Yes, the daemon can stay Node-spawned. It should run `node <installed-package>/dist/daemon/index.js`, not `npm run daemon`."* Native bundling is V1.5+ when distribution graduates beyond founder dogfood. Cost of going native now: ~3x the spec scope; cross-platform binary signing; harder upgrades. Cost of staying Node: requires Node on the user machine (founder already has it; external customers will install via brew/asdf/etc. when brew formula ships in V1.5).

- **J2. Private tarball / `npm pack` for V1, NOT public npm publish.** Codex: *"Git URL is acceptable for founder dogfood only if you add a build hook, because `dist/` is gitignored. I'd prefer tarball/pack correctness first; registry publish is a final distribution switch, not the core engineering work."* This spec ships the tarball-correctness work (the actual hard part); publishing to a registry is a single `npm publish` away once founder is happy. Public publishing also opens trademark / package-squatting concerns ("echoctl" is unclaimed on npm at time of writing); resolve those before publish.

- **J3. macOS-only (launchd). Defer Linux/systemd to V1.5+.** Codex: *"P1 'macOS + Linux' is too broad for 076. Current daemon persistence is launchd-only. Add Linux systemd after the founder proves the packaged boundary on macOS."* The founder works on a macOS laptop; the daemon's only persistence machinery today is launchd. Adding systemd is purely speculative scope until a Linux user exists.

- **J4. Skill-overwrite vs role-and-workflow-preserve asymmetry is NAMED, not redesigned.** Codex: *"Role/workflow upgrade semantics are already asymmetric: skills are overwritten into `~/.echo/skills`; roles/workflows preserve user edits. Packaging should name that, not redesign it."* 072 + 075 shipped this asymmetry on purpose (skills are ECHO-owned per `wiki` design archive; roles + workflows are user-tunable). 076 documents the upgrade semantics in `docs/echoctl-install.md` so the user knows what to expect on package upgrade; does NOT change the adapter sync behavior.

- **J5. No `postinstall` / auto-restart magic.** Codex: *"Upgrade story is explicit: reinstall/update package, then `echoctl daemon restart`. No postinstall auto-restart."* `npm install -g`'s `postinstall` hook running auto-restart is dangerous (could fight launchd's KeepAlive, could fire during package-corruption recovery, could surprise the user). Explicit `echoctl daemon restart` is the right shape — small UX cost, large safety + comprehensibility win.

- **J6. No telemetry, no cloud sync, no hosted identity, no management UI.** Per `wiki/principles/felt-not-seen.md:32`, the principle EXPLICITLY allows install-once setup as infrastructure — but turns into a "destination app" violation if packaging acquires a dashboard / accounts / phone-home / web UI. This spec stays inside the principle. `echoctl doctor --json` is the only "health reporting" surface, and it's strictly local + on-demand.

- **J7. Documentation surface kept small: ONE new install doc + README updates only.** No tutorial videos, no Discord, no Notion onboarding page in this spec. The single `docs/echoctl-install.md` covers: install / verify / use / upgrade / uninstall / reset. If the founder finds the doc inadequate during dogfood, that's a doc iteration (commits to that file), NOT a new spec.

## Acceptance Criteria

### AC1 — `npm pack` artifact contains exactly the runtime files; nothing dev-only

**AC1.1 — `files` allowlist (in `package.json`).** Replace the current allowlist (set by 074 + extended by 075 for `assets/echo-workflows/**`) with the complete runtime set:

```json
"files": [
  "dist/**/*.js",
  "dist/**/*.d.ts",
  "dist/**/*.sql",
  "skills/**",
  "assets/echo-roles/**",
  "assets/echo-workflows/**",
  "tools/review-queue/coord-roles.json",
  "tools/review-queue/reviewers.json",
  "tools/review-queue/schemas/**",
  "package.json",
  "README.md"
]
```

Each entry exists because the runtime (CLI or daemon) needs it at runtime. Specifically:

- `dist/**/*.js` + `dist/**/*.d.ts` — CLI + daemon built output (074 + this spec's AC2)
- `dist/**/*.sql` — runtime SQL migrations (AC2 builds these into `dist/`)
- `skills/**` — the ECHO skill library; `~/.echo/skills/` is populated from this on `echoctl init` per 072 (skills are ECHO-owned; overwritten on upgrade per J4)
- `assets/echo-roles/**` — default role TOMLs per 071; copied to `~/.echo/roles/` on init (preserved on upgrade per J4)
- `assets/echo-workflows/**` — default workflow TOMLs per 075; copied to `~/.echo/workflows/` on init (preserved on upgrade per J4)
- `tools/review-queue/coord-roles.json` + `reviewers.json` + `schemas/**` — the daemon's `src/coord/roles.ts` (line ~56) hard-loads coord role config + schema from these paths AT DAEMON STARTUP. Missing them = daemon crash. This is a real bug codex caught.

**AC1.2 — Tarball negative-assertion.** Verify the tarball does NOT contain: `backlog/`, `raw/`, `wiki/`, `tests/`, `src/`, `tools/review-queue/_*.{sh,py}` (the scripts are dev-only; only the config files + schemas ship), `tools/review-queue/*.py`, `tools/review-queue/*.sh`, `node_modules/`, `coverage/`, `dist/**/*.test.{js,d.ts}`. AC5's pack-shape smoke asserts presence + absence.

**AC1.3 — Tarball is self-contained.** A fresh machine with Node ≥ 22 + `npm` installed should be able to: `npm install -g <tarball-path>` → `echoctl --version` succeeds → `echoctl --help` lists commands → `echoctl doctor` runs (returns degraded because no daemon installed yet, which is correct).

**AC1.4 — Coord runtime config ships explicitly.** `tools/review-queue/coord-roles.json` + `tools/review-queue/reviewers.json` + `tools/review-queue/schemas/**` MUST be in the tarball (called out separately from AC1.1's list because they were the second bug codex caught — the daemon's `src/coord/roles.ts:56` validates against the JSON schemas at startup). AC5's pack-shape smoke includes a positive presence check for these specific paths.

### AC2 — Build artifacts are complete + runtime-correct

**AC2.1 — SQL migrations copied into `dist/`.** Today, `tsc` compiles `.ts` → `.js` into `dist/` but ignores `.sql` files. The daemon's `src/storage/sqlite.ts` (line ~17 region) reads `src/storage/migrations/*.sql` at runtime to apply schema. In a packed install, those `.sql` files don't exist relative to `dist/daemon/index.js` → daemon crashes on first DB open.

Fix: add a `prepack` script (or extend `build:cli`) that runs `tsc -p tsconfig.cli.json` AND copies `src/storage/migrations/*.sql` → `dist/storage/migrations/*.sql`. Update `src/storage/sqlite.ts` to resolve migration paths via `import.meta.url` so the lookup works against `dist/storage/migrations/` post-pack AND `src/storage/migrations/` in dev (the relative path computed from `import.meta.url` lands in different absolute roots but the same relative subdir works for both).

Concrete addition to `package.json`:

```json
"scripts": {
  "build:cli": "tsc -p tsconfig.cli.json && node scripts/copy-sql-migrations.js",
  "prepack": "npm run build:cli"
}
```

The `prepack` hook fires before `npm pack` AND before `npm publish`, so any future registry push is automatic.

**AC2.2 — Migration-copy script.** A small `scripts/copy-sql-migrations.js` (or `.mjs`) that walks `src/storage/migrations/` and writes byte-for-byte copies to `dist/storage/migrations/`. Pure Node, no extra dependencies. Idempotent. If the source dir is missing, fails with a clear error (not a silent no-op).

**AC2.3 — Resolution change in `src/storage/sqlite.ts`.** The current code (line ~17) reads migrations via a path relative to the SOURCE file. After AC2.1, the BUILT file at `dist/storage/sqlite.js` needs to find `dist/storage/migrations/*.sql`. Use `import.meta.url` + `fileURLToPath` + `path.dirname` to compute the migration directory relative to the runtime file's location. Test: existing migration tests continue to pass (they ran against `src/` historically; they'll now run against `src/` AT TEST TIME via vitest's source-resolution AND against `dist/storage/migrations/` AT PACKED-RUNTIME).

### AC3 — `echoctl daemon` subcommand (lifecycle management)

**AC3.1 — Public surface.** New subcommand `daemon` registered in `src/cli/index.ts` (extend the existing `parseArgs` dispatch + help text). The `daemon` subcommand takes a verb:

```
echoctl daemon install      # writes launchd plist + bootstraps the job
echoctl daemon start         # bootstraps if not loaded; no-op if running
echoctl daemon stop          # bootouts (clean stop; respects KeepAlive)
echoctl daemon restart       # bootout + bootstrap (atomic; safe under upgrades)
echoctl daemon status        # prints PID + uptime + plist path + port + 1-line health
echoctl daemon logs [--tail N | --follow]  # tails the launchd-configured stdout/stderr log files
echoctl daemon uninstall     # bootouts + removes plist
```

`echoctl daemon` (no verb) prints subcommand help. `--help` per verb prints verb-specific help.

**AC3.2 — Plist content.** `scripts/launchd/install.sh` is replaced (or its plist-writing portion is) so the plist targets the packaged daemon entrypoint. The plist:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.echo.daemon</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/env</string>
    <string>node</string>
    <string>{{INSTALLED_DAEMON_PATH}}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>StandardOutPath</key>
  <string>{{LOG_DIR}}/echo-daemon.out.log</string>
  <key>StandardErrorPath</key>
  <string>{{LOG_DIR}}/echo-daemon.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
  </dict>
</dict>
</plist>
```

`{{INSTALLED_DAEMON_PATH}}` resolves at install time to the absolute path of the packaged `dist/daemon/index.js` (computed via `path.resolve` from the running `echoctl` binary's location — `process.argv[1]` + `path.resolve(__dirname, '../../daemon/index.js')` or equivalent). `{{LOG_DIR}}` defaults to `~/Library/Logs/echo/` (created if absent). NO `WorkingDirectory` — the daemon must work regardless of CWD.

**AC3.3 — `install` verb mechanics.** `echoctl daemon install`:
1. Computes `{{INSTALLED_DAEMON_PATH}}` from the running binary's location
2. Computes `{{LOG_DIR}}` (default `~/Library/Logs/echo/`); creates if absent
3. Renders the plist with both substitutions
4. Writes to `~/Library/LaunchAgents/com.echo.daemon.plist` (overwrites if present — upgrade-safe)
5. If a job is already loaded (`launchctl print gui/$(id -u)/com.echo.daemon` exits 0): `launchctl bootout gui/$(id -u)/com.echo.daemon` (clean stop FIRST)
6. `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.echo.daemon.plist`
7. Verifies the job loaded; prints success + PID
8. Exit 0 on success; exit 1 on launchctl error; exit 2 on missing dependency (e.g., `launchctl` not found, which would mean non-macOS)

**AC3.4 — `start` / `stop` / `restart` semantics.** Per AC4: `launchctl bootstrap` for start; `launchctl bootout` for stop; `restart` = bootout-then-bootstrap. NEVER `kill -9` (fights launchd KeepAlive). `start` is no-op if the job is already running. `stop` exits 0 if the job is already not running.

**AC3.5 — `status` verb output.** Single block printed to stdout:

```
ECHO daemon: running
  plist:       ~/Library/LaunchAgents/com.echo.daemon.plist
  binary:      /Users/<user>/.npm-global/lib/node_modules/echoctl/dist/daemon/index.js
  pid:         12345
  port:        38478
  uptime:      4h 23m
  health:      healthy   (or degraded / broken — calls into echoctl doctor's daemon section only)
```

Exit 0 if running + healthy; exit 1 if running + degraded; exit 2 if not running.

**AC3.6 — `logs` verb.** Tails the plist's `StandardOutPath` + `StandardErrorPath` files. Default behavior: last 50 lines. `--tail N` for N lines. `--follow` for follow mode. Implementation: spawn `tail` with appropriate flags + the resolved log paths.

**AC3.7 — `uninstall` verb.** `launchctl bootout` then `rm ~/Library/LaunchAgents/com.echo.daemon.plist`. Does NOT touch `~/.echo/` (per J6 — packaging doesn't decide state-purge semantics; `echoctl uninstall` already handles state cleanup per 074 AC4). NOT to be confused with the top-level `echoctl uninstall` command from 074 — `echoctl daemon uninstall` only removes the daemon registration; `echoctl uninstall` (existing) removes adapter writes from agent configs.

### AC4 — `launchctl bootout` for clean stop/restart (KeepAlive-safe)

**AC4.1 — Never use `kill`.** Throughout `src/cli/commands/daemon.ts` and `scripts/launchd/uninstall.sh`, use `launchctl bootout gui/$(id -u)/com.echo.daemon` to stop the daemon. NEVER `kill -9 <pid>` or `kill -TERM <pid>`. The `KeepAlive: { SuccessfulExit: false }` setting will respawn a killed process within milliseconds, fighting the upgrade.

**AC4.2 — `restart` is bootout-then-bootstrap, NOT `launchctl kickstart -k`.** `kickstart -k` works for running configs but doesn't pick up plist changes (if the plist file was rewritten by AC3.3's install verb during an upgrade, kickstart would relaunch with the OLD config). The bootout-then-bootstrap sequence guarantees the new plist is picked up.

**AC4.3 — Test (in `tests/cli/daemon.test.ts`).** Inject a fake `launchctl` (via dependency injection, same shape as 074's `spawn` injection in dispatch). Drive `daemonStop()` + `daemonRestart()`; assert the fake observed `bootout` (not `kill`) and the restart observed `bootout` followed by `bootstrap` (not `kickstart -k`).

### AC5 — Packaged smoke test starts the daemon, probes MCP, cleans up

**AC5.1 — Extend `tests/cli/shell-reachable.test.ts` (074-owned; in scope here since this spec broadens its contract).** Current test (post-074 + 075): `npm pack` → install into tmp prefix → `echoctl --version` reach + asset-presence check. Extend it with a NEW assertion BLOCK:

After install + before cleanup, run:
1. `echoctl daemon install` against a tmp `ECHO_HOME` + tmp launchd-prefix (use `LAUNCHCTL_*` envs if available, or skip on CI where launchctl isn't accessible — same skip pattern AC1.5 already uses for `hasNpm`)
2. `echoctl daemon start`
3. Probe `http://127.0.0.1:<port>/mcp` with the canonical JSON-RPC initialize body (same shape as 074 AC3.2's doctor probe; reuse the helper if 074 exports one)
4. Assert: 2xx response with valid JSON-RPC body
5. `echoctl daemon stop`
6. `echoctl daemon uninstall`
7. Verify the launchd job is gone (`launchctl print` exits non-zero)

This is the ONLY test that catches the AC2.1 (SQL migrations) bug + the AC1.4 (coord config) bug end-to-end. Without it, those bugs slip through every other type-check / lint / unit test.

**AC5.2 — Test isolation.** Use a unique tmp prefix per test run (UUID-suffixed). Use a unique `ECHO_HOME` (so the test daemon doesn't fight the founder's real daemon). Use a unique port via `ECHO_MCP_PORT` (random in 40000-50000 range; avoid the canonical 38478). Cleanup runs even on test failure (`try/finally` or vitest `afterEach`).

**AC5.3 — CI gating.** If `launchctl` is unreachable in the test environment (e.g., CI Linux runner), skip this test block with a clear message ("skipped: launchctl not available — packaged-daemon smoke requires macOS"). Do NOT fail. Local dev runs on macOS will exercise it.

### AC6 — Upgrade story is explicit

**AC6.1 — `docs/echoctl-install.md` (NEW)** covers:

- **Install:** `npm pack` (from this repo) → `npm install -g ./<artifact>.tgz` → `echoctl daemon install` → `echoctl init` → verify via `echoctl doctor`.
- **Daily use:** runs from any directory; daemon serves from launchd; `echoctl run <workflow>` works in any git repo.
- **Upgrade:** rebuild + reinstall from the new tarball (`npm pack && npm install -g ./<new-artifact>.tgz`); then `echoctl daemon restart` to bounce the daemon onto the new binary. The new `dist/daemon/index.js` is loaded automatically because the plist's `ProgramArguments` references the symlink target (`~/.npm-global/lib/node_modules/echoctl/dist/...`), which npm updates atomically on `install -g`.
- **Reset (preserve daemon state):** `echoctl uninstall --yes` (strips agent config blocks) + `rm -rf ~/.echo/{skills,roles,workflows,adapters,state}` (preserves daemon state) + `echoctl init` (clean re-onboarding).
- **Full removal:** `echoctl uninstall --yes` + `echoctl daemon uninstall` + `npm uninstall -g echoctl` + optional `rm -rf ~/.echo/` (deletes everything including daemon state — destructive; warn the user).

**AC6.2 — No `postinstall` script in `package.json`.** Per J5, the package does NOT auto-restart the daemon on install. The user runs `echoctl daemon restart` explicitly. The doc is explicit about this so users don't expect magic.

**AC6.3 — Asymmetric upgrade semantics documented (per J4).** The doc has a "What changes on upgrade" subsection:

| Slot | Upgrade behavior |
|---|---|
| `dist/**` (built code) | Replaced wholesale by `npm install -g` |
| `~/.echo/skills/` | Overwritten by next `echoctl init` from the new package's `skills/` (ECHO-owned; user edits LOST — per 072 design) |
| `~/.echo/roles/` | Preserved if user-modified; copied if absent; conflict if user-modified AND new version differs (per 072 design) |
| `~/.echo/workflows/` | Same as roles (per 075 design) |
| `~/.echo/state/` + `~/.echo/adapters/` + daemon's atom store / sqlite | NEVER touched by package upgrade |
| Agent configs (`~/.codex/`, `~/.claude/`, `~/.cursor/`) | Preserved; re-running `echoctl init` is idempotent per 072 + 075 fixes |

### AC7 — `package.json` metadata changes

**AC7.1 — Flip `private`.** `"private": true` → `"private": false`. Required for `npm pack` to produce a tarball that can be `npm install -g`'d. (Without flipping, `npm pack` succeeds but `npm publish` would error — not relevant for V1 — and some CI tooling rejects `private: true` packages for global install.)

**AC7.2 — Set `name` to a globally-unique identifier.** Current `package.json` `name` is `echo-daemon`. Rename to `echoctl` (matches the `bin` name from 074). This requires:
- Confirming `echoctl` is available on the npm registry (if there's a future publish intent; trademark-clean for V1 founder dogfood)
- Updating any internal references (test fixtures, docs, CI scripts) that hardcode `echo-daemon`

If `echoctl` is taken or contested, fallback name `@echo/cli` (scoped — requires npm org claim; deferred to V1.5+); for V1 dogfood, the name doesn't matter functionally as long as it's consistent within the repo.

**AC7.3 — `version` semantic-versioning.** Bump from `0.0.0` to `0.1.0` to signal "first installable version." Future versions bump per SemVer: `0.1.x` for patches, `0.2.0` for new commands or substantive UX changes, `1.0.0` when ready for external customer.

**AC7.4 — `engines.node` requirement.** Add `"engines": { "node": ">=22.0.0" }`. The daemon uses Node 22 features (top-level await, `import.meta.url`, etc.). Without an explicit engines pin, users on older Node would hit cryptic errors. `npm install -g` warns (does not block) when engines mismatch — sufficient signal for V1.

**AC7.5 — Existing `bin` entry unchanged.** 074's `"bin": { "echoctl": "./dist/cli/index.js" }` stays as-is.

### AC8 — Test gates

**AC8.1 — Full suite passes.** `npm test` exits 0; flaky `tests/mcp/recent-calls-endpoint.test.ts` (known timeout under parallel load) still passes standalone — acceptable per the prior friction-fix rounds.

**AC8.2 — Typecheck + lint pass.** `npm run typecheck` exits 0. `npm run lint` exits 0.

**AC8.3 — Build pipeline succeeds.** `npm run build:cli` exits 0 + produces `dist/cli/`, `dist/daemon/`, `dist/storage/migrations/*.sql` (post-AC2.1).

**AC8.4 — Pack succeeds.** `npm pack` exits 0 + produces a tarball. The tarball's contents match AC1.1's allowlist (verify via `tar tf <tarball>` in AC5's smoke test).

**AC8.5 — Smoke test passes on macOS.** AC5's packaged-daemon-smoke runs end-to-end on a macOS dev machine; skips cleanly on CI Linux runners.

## Out of Scope (Don't Drift)

- **Public npm publish.** `npm publish` is the final distribution switch once the founder is happy with the packaged install for 1-2 weeks of cross-project use. Out of scope for THIS spec; trivial follow-up once 076 is shipped + dogfooded.
- **brew formula.** macOS-native distribution. V1.5+ once external customer adoption justifies the maintenance burden of a brew tap (or a homebrew-core submission). Codex consult: P2.
- **Native binary (pkg / nexe / bun build / @vercel/ncc).** Bundling Node into a single executable. V1.5+ if + when Node runtime dependency becomes a friction (founder has it; external customers usually do too via brew install node).
- **Linux service / systemd.** V1.5+ when first Linux user exists. Today's daemon persistence is launchd-only.
- **Raycast Store packaging.** Raycast extension is its own publication path (Raycast Store); cannot be bundled into this tarball. Out of scope; founder has it installed independently.
- **Workflow primitive (the parked 076-cursor-invoked-workflow).** Becomes 077-or-later; specced AFTER 076 ships so the wow moment is built on a packaged ECHO that customers can actually install. Includes: `mcp__echo__run_workflow` MCP tool, multi-reviewer parallel dispatch + combiner port of `tools/review-queue/combine.py`, in-IDE invocation path.
- **Telemetry / phone-home / cloud sync / hosted identity / accounts.** Per J6 + the felt-not-seen principle. Health reporting stays local + on-demand via `echoctl doctor --json`. ECHO does not "call home."
- **Schema-migration redesign.** AC2's SQL-migration copy is a packaging fix, not a redesign. The existing migration mechanism in `src/storage/sqlite.ts` is preserved.
- **Multi-machine sync.** Each machine has its own `~/.echo/` + local sqlite. Cross-machine identity / sync is a V2+ concern.
- **Management dashboard / web UI / accounts.** Per J6.
- **`echoctl daemon migrate` / `echoctl daemon export-state` etc.** Lifecycle commands beyond install/start/stop/restart/status/logs/uninstall. Add later if dogfood surfaces the need.
- **Auto-update on launchd boot.** No "check for new version + auto-upgrade." User explicitly upgrades.
- **Anything touching `wiki/`, `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md`.** Strategist-only surfaces per memory + `docs/AGENT_INSTRUCTIONS.md`.
- **Touching `src/echo-home/`, `src/mcp/`, `src/coord/`, `src/storage/` (except `sqlite.ts`'s migration-path resolution per AC2.3).** These are 070-073 + substrate domains; out of 076's blast radius.

## After Completion (Strategist Notes)

- **Wiki page candidate (post-shipment):** `wiki/operating-model/install-topology.md` documenting the packaged install boundary (binary location, plist target, upgrade story, asymmetric asset semantics, what's NOT in the package). Also extends `wiki/surfaces/echoctl.md` with the new `daemon` subcommand.

- **Decision-archive update:** `raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md` §"What's deferred" — strike "Install topology" from the deferred list; the V1 install topology is now: npm-pack tarball + launchd-managed daemon + macOS-only.

- **Trigger to revisit (V1.5+ graduation path):** after the founder dogfoods the packaged install across `NavyPowerTwin`, `PowerTwinLab_Demo`, `Statellite_Detection`, etc. for 1-2 weeks, the V1.5 install-topology spec opens:
  - brew formula (macOS-native distribution)
  - Linux systemd (if Linux users emerge)
  - Native binary bundling (if Node runtime becomes friction)
  - Public npm publish (with name lock + version semantics)
  - Single-installer UX (curl-pipe-bash or signed .pkg)

- **Strategist note on dogfood ordering:** 076 unblocks the founder's daily cross-project use of ECHO. Once 076 ships, the parked workflow-primitive work (was 076; becomes 077) is unblocked — and the wow moment (#13 from the 2026-05-26 moment-enumeration: Cursor chat → review with provenance) can actually be delivered to customers (and to the founder, in their other projects).

- **Two real bugs that 076 surfaces + fixes:** (a) SQL migrations not copied into `dist/` (the daemon crashes on first DB open in a packed install today); (b) `src/coord/roles.ts` hard-loads from `tools/review-queue/` (the daemon crashes on coord-config load in a packed install today). Neither was caught by 070-075 because the dev path always had `src/` on disk. Both are 076's load-bearing test surface (AC5).

- **The packaging asymmetry is intentional, not a bug:** ECHO-owned files (skills, dist) get replaced wholesale on upgrade; user-tunable files (roles, workflows) preserve user edits; state files (atoms, sqlite) are NEVER touched. This asymmetry is shipped in 072 + 075; 076 documents it per J4 + AC6.3 so users understand upgrade behavior. If dogfood surfaces a need to make roles/workflows ALSO ECHO-overwritten-by-default (e.g., critical security update to a default role), that's a NEW spec.

- **The "all over the place" diagnosis (2026-05-26 strategist conversation, codex consult) is resolved by 076.** Before 076: ECHO is a dev artifact the founder is constantly rebuilding. After 076: ECHO is software the founder installs once and relies on across all their projects. The basketball-team metaphor finally has a gym the team can take to other games.
