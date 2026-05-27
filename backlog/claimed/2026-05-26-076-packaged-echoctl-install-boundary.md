---
id: 2026-05-26-076-packaged-echoctl-install-boundary
title: "Packaged `echoctl` install boundary — npm-pack tarball, packaged daemon, launchd plist targeting `dist/`, macOS-only V1; founder can use ECHO across all projects without dev-mode dependency on the source repo"
status: claimed
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
  - scripts/copy-sql-migrations.js                         # AC2.2 (r1 codex F4) — NEW; pure-Node walk of src/storage/migrations/ → dist/storage/migrations/ byte-copy; idempotent; fails loudly if source dir missing
  - tests/cli/daemon.test.ts                               # AC3 + AC4 NEW — unit tests for the daemon lifecycle command (test seams for launchctl calls); also covers AC3.3 preflight (r1 codex-ops F4), AC3.3 absolute-Node-path resolution (r1 codex-ops F3), AC3.3 post-bootstrap health-probe wait (r2 codex-ops F1), AC3.3 step 6+7 XML-safe + atomic plist write + plutil -lint (r5 codex-ops F2), AC3.3 step 10 / AC3.4.1 bootout-on-probe-timeout + loaded-but-unhealthy short-circuit refuses no-op (r5 codex-ops F1), AC3.4.1 restart + recovery-load start preflight + probe-wait parity (r3 codex-ops F1), AC3.8 install-time override flags (r1 codex F3 / codex-ops F2), and AC3.8 restart + logs override plumbing (r2 codex-ops F2)
  - tests/cli/shell-reachable.test.ts                      # AC5 — extend the existing pack-shape smoke to ALSO START the packaged daemon, probe /mcp, then clean up via `daemon stop $OVERRIDES` + `daemon uninstall $OVERRIDES` (NOT SIGTERM — the launchd-path cleanup is what proves the test job is removed without touching production); catches the AC2 SQL-migration bug + the AC1.4 coord-config bug
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
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-27T06:10:32Z"
branch: "agent/packaged-echoctl-install-boundary"
worktree: "/Users/zhenye/Desktop/Project_echo--packaged-echoctl-install-boundary"
head_sha: ""
pr_url: ""
agent_notes: ""
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

**AC1.3 — Tarball is self-contained.** A fresh machine with Node ≥ 22 + `npm` installed should be able to: `npm install -g <tarball-path>` → `echoctl --version` succeeds → `echoctl --help` lists commands → `echoctl doctor` runs (returns `broken` because `~/.echo` is absent / the daemon is not installed yet — this matches current `src/cli/commands/doctor.ts` semantics; per r2 codex F4 LOW, the spec does not change doctor's health vocabulary, only asserts the no-daemon-yet case lands on `broken`).

**AC1.4 — Coord runtime config ships explicitly.** `tools/review-queue/coord-roles.json` + `tools/review-queue/reviewers.json` + `tools/review-queue/schemas/**` MUST be in the tarball (called out separately from AC1.1's list because they were the second bug codex caught — the daemon's `src/coord/roles.ts:56` validates against the JSON schemas at startup). AC5's pack-shape smoke includes a positive presence check for these specific paths.

**AC1.5 — `coord_invoke` is implicitly de-scoped in packaged installs (no code change required) (r1 codex F1 HIGH; r2 codex F2 HIGH — removal over deeper patching).** AC1.2 excludes `tools/review-queue/*.sh` from the tarball as dev-only. The daemon's `coord_invoke` tool resolves `tools/review-queue/run-<role>-reviewer.sh` via `src/coord/paths.ts:63-146` and requires the wrapper to exist + be executable before spawning a reviewer. In a packaged install those wrappers are absent.

The packaged daemon already handles this correctly without any code change: `src/coord/paths.ts` raises `CoordPathError` when the wrapper resolves to a non-existent path; `src/mcp/tools/coord-invoke.ts` catches `CoordPathError` and returns a text-only `isError` JSON-RPC response. From the caller's perspective, `coord_invoke` cleanly rejects in a packaged install — the daemon stays up, no crash, no silent failure. This IS the de-scope mechanism.

(r2 codex F2 caught r1's overreach: r1 added a code-change AC requiring a structured machine-readable code `ECHO_COORD_INVOKE_PACKAGED_UNAVAILABLE`, which contradicts this spec's §Out-of-Scope ban on touching `src/coord/` and `src/mcp/`. Removal — relying on existing CoordPathError → isError behavior — is the cleaner disposition. V1 has no customer surface that depends on machine-readable rejection codes; the existing text response is sufficient.)

Rationale (unchanged): the V1 cross-project use case (founder using `echoctl` in `NavyPowerTwin`, `PowerTwinLab_Demo`, etc.) never invokes the operating-model review queue — those wrappers are infrastructure for THIS repo's strategist/reviewer protocol, not for end-user echoctl. De-scoping is the correct boundary; shipping all 4 `run-<role>-reviewer.sh` wrappers + their `_lib.py`/`coord-emit.sh`/`reviewers.json`/launchd plumbing would push the tarball outside its V1 purpose.

Test surface: AC5.1 step 4 adds a positive assertion that a packaged-install `coord_invoke` call for any role returns `isError: true` with a CoordPathError-shaped message (proves the de-scope mechanism is intact end-to-end against the real packaged daemon). No new unit-test file or `src/coord/`/`src/mcp/` code change is in scope.

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

**AC2.3 — Verify `src/storage/sqlite.ts` migration-path resolution is runtime-correct after pack (r3 codex F3 LOW — verification, not required code change).** The current pinned source already resolves `MIGRATIONS_DIR` via `import.meta.url` + `fileURLToPath` + `path.dirname` next to the runtime file, which means the existing lookup naturally points at `dist/storage/migrations/` post-pack (after AC2.1 copies the SQL files there) AND at `src/storage/migrations/` in dev (vitest source-resolution). No code change is required UNLESS the builder discovers a failing test or a packed-runtime path mismatch. The load-bearing fix in this spec is AC2.2's `scripts/copy-sql-migrations.js` (puts the `.sql` files into `dist/` so the existing resolver finds them); `src/storage/sqlite.ts` is a verification point, not mandatory churn. If the resolver IS found broken in some way that AC5.1's smoke surfaces, the fix is the minimal `import.meta.url` patch described above — and AC5.1 is what catches the regression, so no separate test is needed.

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
  <string>{{LABEL}}</string>
  <key>ProgramArguments</key>
  <array>
    <string>{{NODE_EXEC_PATH}}</string>
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
    <key>ECHO_HOME</key>
    <string>{{ECHO_HOME}}</string>
    <key>ECHO_MCP_PORT</key>
    <string>{{ECHO_MCP_PORT}}</string>
    <key>ECHO_DATA_DIR</key>
    <string>{{ECHO_DATA_DIR}}</string>
    <key>ECHO_DB_PATH</key>
    <string>{{ECHO_DB_PATH}}</string>
  </dict>
</dict>
</plist>
```

Substitution semantics (resolved at install time, persisted into the plist; launchd does NOT inherit caller env after bootstrap, so EVERY runtime variable the daemon needs MUST be persisted here — r1 codex F2 / codex-ops F1 HIGH; r2 codex F1 HIGH extends this to ECHO_DATA_DIR + ECHO_DB_PATH):

- `{{LABEL}}` — defaults to `com.echo.daemon`; install-time override via `--label <id>` (used by AC5's smoke for test isolation per AC3.8).
- `{{NODE_EXEC_PATH}}` (r1 codex-ops F3 MED) — absolute path to the Node binary, captured at install time via `process.execPath`. Replaces `/usr/bin/env node` because launchd's restricted `PATH` does not see nvm/asdf/mise/Volta-managed Node installs; `/usr/bin/env node` would either fail or boot the wrong Node major version. After resolving `process.execPath`, the installer MUST execute `<NODE_EXEC_PATH> --version` and assert the major version satisfies AC7.4 (`>=22`); if not, abort install with a clear error (do NOT overwrite the plist + do NOT bootout).
- `{{INSTALLED_DAEMON_PATH}}` — absolute path of the packaged `dist/daemon/index.js`, computed via `path.resolve` from the running `echoctl` binary's location (`process.argv[1]` + `path.resolve(__dirname, '../../daemon/index.js')` or equivalent).
- `{{LOG_DIR}}` — defaults to `~/Library/Logs/echo/`; install-time override via `--log-dir <path>` (created if absent).
- `{{ECHO_HOME}}` — defaults to `~/.echo`; install-time override via `--home <path>` (used by AC5's smoke).
- `{{ECHO_MCP_PORT}}` — defaults to `38478` (the canonical port); install-time override via `--port <N>` (used by AC5's smoke to avoid fighting the founder's real daemon).
- `{{ECHO_DATA_DIR}}` (r2 codex F1 HIGH) — defaults to `~/Library/Application Support/ECHO/` (the current daemon default in `src/daemon/lifecycle.ts`); install-time override via `--data-dir <path>`. Controls the daemon's pid lock + per-runtime working directory. Without persisting this into the plist, a launchd-started smoke daemon would contend with the founder's production pid lock even when `--home` and `--port` are isolated.
- `{{ECHO_DB_PATH}}` (r2 codex F1 HIGH) — defaults to `<ECHO_DATA_DIR>/echo.db`; install-time override via `--db-path <path>`. Without persisting this, a smoke daemon would write into the production sqlite file. When `--data-dir` is overridden but `--db-path` is not, the installer derives `{{ECHO_DB_PATH}}` as `<resolved-data-dir>/echo.db` so a single `--data-dir` override is sufficient for full isolation (the most common case).

NO `WorkingDirectory` — the daemon must work regardless of CWD.

**AC3.3 — `install` verb mechanics.** `echoctl daemon install [--label <id>] [--home <path>] [--port <N>] [--data-dir <path>] [--db-path <path>] [--log-dir <path>] [--plist-path <path>]`:
1. Parses optional override flags (all default to the production values listed in AC3.2; AC5 uses non-default values for test isolation per AC3.8). `--data-dir` and `--db-path` added per r2 codex F1 HIGH; if `--data-dir` is set and `--db-path` is not, `{{ECHO_DB_PATH}}` is derived as `<resolved-data-dir>/echo.db`.
2. Computes `{{INSTALLED_DAEMON_PATH}}` from the running binary's location.
3. Resolves `{{NODE_EXEC_PATH}}` via `process.execPath` AND runs `<NODE_EXEC_PATH> --version` to verify it satisfies AC7.4 (Node ≥ 22). On version mismatch: abort BEFORE any plist write or bootout, exit non-zero with a clear error naming the resolved binary + observed version.
4. Computes `{{LOG_DIR}}` (default `~/Library/Logs/echo/`); creates if absent.
5. **Preflight (r1 codex-ops F4 MED)** — BEFORE any bootout, verify that all runtime dependencies the new daemon will need are present + readable on the packaged path:
   - `{{INSTALLED_DAEMON_PATH}}` exists and is a regular file
   - SQL migrations: `<installed-package>/dist/storage/migrations/*.sql` glob non-empty (AC2.1 contract)
   - Coord config: `<installed-package>/tools/review-queue/coord-roles.json` + `reviewers.json` + `schemas/` exist (AC1.4 contract)
   - `{{LOG_DIR}}` is writable
   - `{{ECHO_DATA_DIR}}` parent directory is writable (so the daemon can create its pid lock + working files); `{{ECHO_DB_PATH}}` parent directory is writable
   If any preflight check fails, abort BEFORE bootout with a structured error naming the missing artifact + a recovery hint ("re-run `npm install -g <tarball>`; the package appears incomplete"). The currently-running daemon stays up — preflight failure NEVER converts an upgrade into an outage.
6. **Renders the plist with all substitutions (LABEL + NODE_EXEC_PATH + INSTALLED_DAEMON_PATH + LOG_DIR + ECHO_HOME + ECHO_MCP_PORT + ECHO_DATA_DIR + ECHO_DB_PATH) using XML-safe serialization** (r5 codex-ops F2 MED). Every substituted value MUST be passed through XML-character-escaping (`&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`, `'` → `&apos;`) before insertion into the `<string>...</string>` body. Implementation MUST use either Node's `plist` library (or equivalent structured plist serializer) OR a centralized escape helper used uniformly across every substitution site — string-template concatenation with raw operator-provided paths is NOT acceptable, since a path containing `&`/`<`/`>`/`"`/`'` (legal on macOS) would silently corrupt the plist and only surface after bootout. The renderer produces the plist as an in-memory string; no disk write yet.
7. **Atomic plist write + post-write validation (r5 codex-ops F2 MED).** Write the rendered plist to a sibling tmp path (`<plist-path>.tmp-<pid>-<uuid>`); then run `plutil -lint <tmp-path>` and verify exit 0. If `plutil -lint` fails, delete the tmp file and abort BEFORE bootout with a structured error reporting the lint failure + the resolved label (the existing daemon stays up — `bootout` has not happened). On `plutil -lint` success, `rename(tmp, resolved-path)` to atomically replace any prior plist; on rename failure, delete the tmp file and abort BEFORE bootout (same recovery path). The persisted LaunchAgent file is NEVER left in a partial / unlinted state on disk. Reason this is load-bearing: step 8's bootout happens AFTER step 7; a write-then-corrupt-then-bootout sequence converts an upgrade into an outage AND leaves a broken plist on disk that poisons the next `launchctl bootstrap` attempt.
8. If a job with the resolved label is already loaded (`launchctl print gui/$(id -u)/<label>` exits 0): `launchctl bootout gui/$(id -u)/<label>` (clean stop FIRST). **Preflight (step 5) + plist-lint (step 7) have already verified the replacement is loadable, so this bootout is safe.**
9. `launchctl bootstrap gui/$(id -u) <plist-path>`
10. **Post-bootstrap health-probe wait (r2 codex-ops F1 MED; r5 codex-ops F1 MED — failed-replacement bootout).** `launchctl bootstrap` returning success means the LaunchAgent was loaded, NOT that the daemon is actually serving. A crash-looping daemon, a bad import, a DB-open failure, an occupied port, or a bad persisted env all let `bootstrap` return 0 while leaving the operator with a broken replacement (especially dangerous during an upgrade where step 8 already booted out the working previous daemon). The installer MUST wait for the resolved daemon to answer the same MCP/doctor health probe used by `status` (default deadline: 10s, with exponential backoff starting at 200ms). **On probe-timeout (r5 codex-ops F1 MED): bootout the just-loaded failed label BEFORE exiting** (`launchctl bootout gui/$(id -u)/<label>`) — under launchd `KeepAlive: SuccessfulExit: false`, an unhealthy job will crash-loop unattended; leaving it loaded poisons the next operator `start`/`restart` (the recovery-load `start` short-circuit at AC3.4.1 would no-op on the broken label). Bootout-on-timeout converts an upgrade outage into a clean "no daemon installed" state, which `start` will then preflight + bootstrap correctly. THEN exit non-zero with a structured error naming the resolved label + port + a one-line `daemon logs --tail 50` suggestion + the recovery path (re-install / inspect / rollback). Do NOT treat a merely-loaded LaunchAgent as healthy.
11. On probe-success: prints success + PID + the resolved label/port/home/data-dir/db-path (so the operator can confirm the test daemon used the isolated values, and so an unattended-upgrade log captures the post-upgrade state).
12. Exit 0 on success; exit 1 on launchctl error or post-bootstrap probe timeout (with the recovery hint); exit 2 on missing dependency or preflight failure or non-macOS `launchctl`.

**AC3.4 — `start` / `stop` / `restart` semantics.** Per AC4: `launchctl bootstrap` for start; `launchctl bootout` for stop; `restart` = bootout-then-bootstrap. NEVER `kill -9` (fights launchd KeepAlive). `stop` exits 0 if the job is already not running.

**AC3.4.1 — `restart` and recovery-load `start` MUST share `install`'s preflight + post-bootstrap probe-wait (r3 codex-ops F1 HIGH).** The AC6 documented upgrade path is `npm install -g <new-tarball>` followed by `echoctl daemon restart`. Without parity, `restart` would bootout the working daemon, `bootstrap` a broken replacement, and exit 0 because launchd loaded the plist — exactly the upgrade-to-outage failure mode that AC3.3 step 10 closes for the `install`-driven path. To close the gap:

- `restart`: before bootout, run the SAME runtime-dependencies preflight as AC3.3 step 5 (read the resolved plist's `ProgramArguments` + `EnvironmentVariables` so the checks target the artifacts the bootstrapped daemon will actually use; verify `dist/storage/migrations/*.sql`, coord config, log-dir writability, `ECHO_DATA_DIR`/`ECHO_DB_PATH` parent writability). After bootstrap, wait for the resolved daemon to answer the same MCP/doctor health probe (default deadline 10s; exponential backoff starting at 200ms). **On probe-timeout: bootout the failed label BEFORE exiting** (same rule as AC3.3 step 10 per r5 codex-ops F1 MED — never leave a crash-looping replacement loaded). Then exit non-zero with the recovery hint (`daemon logs --tail 50` + the resolved label/port). If preflight fails, abort BEFORE bootout — the previous daemon stays up.
- Recovery-load `start` (when the resolved label is NOT loaded): same preflight + post-bootstrap probe-wait + bootout-on-timeout as `restart`. When the label IS already loaded, `start` checks `status`'s health field FIRST (r5 codex-ops F1 MED — must not no-op on a loaded-but-unhealthy job); if `status` reports `healthy`, `start` is a no-op (exit 0); if `status` reports `degraded` or `broken`, `start` REFUSES the no-op and exits non-zero with a recovery path ("daemon is loaded but unhealthy; run `echoctl daemon restart` to rebuild it from the current plist, or `echoctl daemon uninstall && echoctl daemon install` for a full reset; see `echoctl daemon logs --tail 50`"). This closes the loaded-but-unhealthy short-circuit gap.
- `status` itself: when the label is loaded but the MCP/doctor health probe fails, MUST report `health: broken` (not "running") and exit 2 (matching the not-running exit code) so an operator script that branches on `status` exit code treats loaded-but-unhealthy the same as not-loaded — both need repair, not "everything fine."
- The preflight + probe-wait + bootout-on-timeout implementation is a single shared helper used by `install`, `restart`, and recovery-load `start` — no duplication across verbs.

`tests/cli/daemon.test.ts` MUST cover the negative paths for both verbs (r4 codex F2 MED — neg-paths split cleanly into preflight-failure vs post-bootstrap probe-timeout per AC3.3 step 12's exit-code contract):

- (a) **Preflight-failure on restart** — restart against a plist whose resolved `INSTALLED_DAEMON_PATH` does NOT exist (or whose `dist/storage/migrations/*.sql` glob is empty, or whose data-dir parent is not writable). Expected: preflight aborts → **exit 2**, recovery hint printed naming the missing artifact, **no `launchctl bootout` invoked**, **no `launchctl bootstrap` invoked**, no probe attempted. The previous daemon stays up.
- (b) **Post-bootstrap probe-timeout on restart** — restart against a preflight-clean plist whose resolved daemon binary actually crashes on startup (or never opens the resolved port). Expected: preflight passes → `launchctl bootout` of the previous instance → `launchctl bootstrap` returns 0 → probe-wait times out → **`launchctl bootout` of the failed replacement label** (r5 codex-ops F1 MED) → **exit 1**, recovery hint printed (label + port + `daemon logs --tail 50` suggestion). The label is NOT left loaded; the daemon state is "no daemon installed" so the next `start` preflights + bootstraps cleanly.
- (c) **Preflight-failure on recovery-load start** — same shape as (a) but driven via `start` against a label that is NOT loaded: preflight aborts → exit 2 → no bootstrap → no probe.
- (d) **Loaded-but-unhealthy short-circuit on `start`** (r5 codex-ops F1 MED) — `start $OVERRIDES` against a label that IS loaded but whose status-probe reports `degraded`/`broken`. Expected: `start` REFUSES the no-op and exits non-zero with the loaded-but-unhealthy recovery path message; the fake `launchctl` is NOT called (no bootout, no bootstrap — only the status-probe and stderr write). A separate positive-path test covers `start` no-op-on-healthy (label loaded + status healthy → exit 0, no launchctl calls).
- (e) **`status` exit code on loaded-but-unhealthy** (r5 codex-ops F1 MED) — `status $OVERRIDES` against a loaded label whose probe fails. Expected: exit 2 (matching not-running semantics so operator scripts treat both as "needs repair"), `health: broken` printed in the block.

**AC3.5 — `status` verb output (r4 codex F1 MED — includes the AC3.8 isolation-override fields so AC5.1's positive override-proof can hold when production mtime check is conditionally deferred).** Single block printed to stdout:

```
ECHO daemon: running
  plist:       ~/Library/LaunchAgents/com.echo.daemon.plist
  binary:      /Users/<user>/.npm-global/lib/node_modules/echoctl/dist/daemon/index.js
  pid:         12345
  port:        38478
  home:        ~/.echo
  data-dir:    ~/Library/Application Support/ECHO
  db-path:     ~/Library/Application Support/ECHO/echo.db
  uptime:      4h 23m
  health:      healthy   (or degraded / broken — calls into echoctl doctor's daemon section only)
```

The `home`, `data-dir`, `db-path` fields are required output (not optional) — AC5.1 step 4's isolation assertion reads `status` output to prove the launchd-started daemon actually saw the test ECHO_HOME / ECHO_DATA_DIR / ECHO_DB_PATH from the plist, NOT defaults. Without these fields the AC5.1 assertion cannot run and the r3 conditional-mtime disposition loses its positive-proof leg.

Exit 0 if running + healthy; exit 1 if running + degraded; exit 2 if not running.

**AC3.6 — `logs` verb.** Tails the plist's `StandardOutPath` + `StandardErrorPath` files. Default behavior: last 50 lines. `--tail N` for N lines. `--follow` for follow mode. Implementation: spawn `tail` with appropriate flags + the resolved log paths.

**AC3.7 — `uninstall` verb.** `launchctl bootout` (against the resolved label per AC3.8) then `rm <plist-path>` (resolved label/path per AC3.8). Does NOT touch `~/.echo/` (per J6 — packaging doesn't decide state-purge semantics; `echoctl uninstall` already handles state cleanup per 074 AC4). NOT to be confused with the top-level `echoctl uninstall` command from 074 — `echoctl daemon uninstall` only removes the daemon registration; `echoctl uninstall` (existing) removes adapter writes from agent configs.

**AC3.8 — Test-isolation seam (r1 codex F3 / codex-ops F2 HIGH; r2 codex F1 HIGH + codex-ops F2 MED extend).** Every `echoctl daemon <verb>` MUST accept `--label`, `--plist-path`, `--log-dir`, `--home`, `--port`, `--data-dir`, and `--db-path` overrides. Same flag surface applies to ALL verbs: `install`, `start`, `stop`, `restart`, `status`, `logs`, `uninstall`. Overrides default to the production values (`com.echo.daemon`, `~/Library/LaunchAgents/com.echo.daemon.plist`, `~/Library/Logs/echo/`, `~/.echo`, `38478`, `~/Library/Application Support/ECHO/`, `<data-dir>/echo.db`).

Why this is load-bearing: AC5's packaged smoke runs `daemon install` → `stop` → `start` → probe → `status` → `logs` → `stop` → `uninstall` against a real `launchctl`. Without per-test overrides, those calls would bootout the founder's live `com.echo.daemon`, overwrite the production plist with the temp tarball's daemon path, `rm` the production plist during cleanup, AND contend with the production pid lock + sqlite at `~/Library/Application Support/ECHO/echo.db`. The smoke must be safe to run on a machine where the founder has the real daemon installed.

Production-job-safety assertion: the `daemon install` implementation MUST NOT mutate a label/plist other than the one resolved from CLI flags. In particular, an `install --label com.echo.daemon.test-<uuid>` invocation MUST NEVER call `launchctl bootout gui/$(id -u)/com.echo.daemon` (without the test suffix). Test: `tests/cli/daemon.test.ts` injects a fake `launchctl` and asserts that an install with a non-default `--label` only touches that label's job.

**r2 codex F3 / codex-ops F2 — full-override test plumbing for the recovery verbs.** `tests/cli/daemon.test.ts` MUST drive `restart` and `logs` with non-default `--label`, `--plist-path`, `--log-dir`, `--home`, `--port`, `--data-dir`, `--db-path`, and assert every launchctl/file-IO operation those verbs perform resolves from the override values (NEVER from the production defaults). Specifically: `restart --label X --plist-path Y` issues `launchctl bootout gui/$(id -u)/X` followed by `launchctl bootstrap gui/$(id -u) Y` — never touching `com.echo.daemon` or the production plist; `logs --log-dir Z` tails `Z/echo-daemon.{out,err}.log`, never `~/Library/Logs/echo/`. These are the verbs an operator reaches for during a failed upgrade; defaults-leak in either would silently hurt the production daemon during recovery.

Implementation note: the overrides flow through the same config-resolution path as the daemon's own startup (no duplicated default constants between CLI and plist rendering). This keeps "what the operator typed" and "what the daemon sees at boot" in lockstep.

### AC4 — `launchctl bootout` for clean stop/restart (KeepAlive-safe)

**AC4.1 — Never use `kill`.** Throughout `src/cli/commands/daemon.ts` and `scripts/launchd/uninstall.sh`, use `launchctl bootout gui/$(id -u)/com.echo.daemon` to stop the daemon. NEVER `kill -9 <pid>` or `kill -TERM <pid>`. The `KeepAlive: { SuccessfulExit: false }` setting will respawn a killed process within milliseconds, fighting the upgrade.

**AC4.2 — `restart` is bootout-then-bootstrap, NOT `launchctl kickstart -k`.** `kickstart -k` works for running configs but doesn't pick up plist changes (if the plist file was rewritten by AC3.3's install verb during an upgrade, kickstart would relaunch with the OLD config). The bootout-then-bootstrap sequence guarantees the new plist is picked up.

**AC4.3 — Test (in `tests/cli/daemon.test.ts`).** Inject a fake `launchctl` (via dependency injection, same shape as 074's `spawn` injection in dispatch). Drive `daemonStop()` + `daemonRestart()`; assert the fake observed `bootout` (not `kill`) and the restart observed `bootout` followed by `bootstrap` (not `kickstart -k`).

### AC5 — Packaged smoke test starts the daemon, probes MCP, cleans up

**AC5.1 — Extend `tests/cli/shell-reachable.test.ts` (074-owned; in scope here since this spec broadens its contract).** Current test (post-074 + 075): `npm pack` → install into tmp prefix → `echoctl --version` reach + asset-presence check. Extend it with a NEW assertion BLOCK:

After install + before cleanup, run (using the AC3.8 isolation flags so the smoke NEVER touches the founder's production `com.echo.daemon` job; per r2 codex F3 every `daemon <verb>` invocation in the smoke passes the FULL override set so any verb that ignores an override surfaces as a test failure):

Let `OVERRIDES = --label com.echo.daemon.test-<uuid> --plist-path <tmp>/test-<uuid>.plist --home <tmp-echo-home> --port <random:40000-50000> --log-dir <tmp-log-dir> --data-dir <tmp-data-dir> --db-path <tmp-data-dir>/echo.db`.

1. `echoctl daemon install $OVERRIDES` — every value is unique per test run; the production label/plist/log-dir/home/port/data-dir/db-path are NEVER passed.
2. **Stop-then-start (r2 codex F3 MED).** `echoctl daemon stop $OVERRIDES` then `echoctl daemon start $OVERRIDES` — exercises the real `start` path against a stopped job rather than treating `start` as a no-op after `install` already bootstrapped. (Or skip on CI Linux per AC5.3.)
3. Probe `http://127.0.0.1:<random-port>/mcp` with the canonical JSON-RPC initialize body (same shape as 074 AC3.2's doctor probe; reuse the helper if 074 exports one).
4. Assert (proves AC3.2's plist envs actually reached the launchd-started daemon, NOT defaults — closes r1 codex F2 / codex-ops F1 HIGH AND r2 codex F1 HIGH):
   - 2xx response with valid JSON-RPC body
   - `echoctl daemon status $OVERRIDES` reports the test ECHO_HOME + the random port + the test data-dir + the test db-path
   - `echoctl daemon logs $OVERRIDES --tail 5` tails `<tmp-log-dir>/echo-daemon.{out,err}.log` (NOT `~/Library/Logs/echo/`) — proves `logs` actually honors `--log-dir` end-to-end against the real packaged daemon
   - A `coord_invoke` MCP call for a **known headless role** (`codex`) with a **syntactically valid** `request_path` + `correlation_id` returns `isError: true` AND the error text mentions the wrapper-not-found CoordPathError naming `run-codex-reviewer.sh` specifically (r3 codex F1 MED). Using a known headless role with valid arguments forces the resolver past the roster/headless/argument-shape checks and into the file-stat path — only then does AC1.5's wrapper-absent de-scope mechanism get exercised. A non-headless role (e.g., `cursor`) or a malformed request would `isError` for the wrong reason and pass the assertion vacuously, so the spec pins the role + payload + error string.
5. `echoctl daemon stop $OVERRIDES`
6. `echoctl daemon uninstall $OVERRIDES`
7. Verify the test launchd job is gone (`launchctl print gui/$(id -u)/com.echo.daemon.test-<uuid>` exits non-zero) AND — critically — the founder's production `com.echo.daemon` job (if present) is untouched. The test snapshots `launchctl print gui/$(id -u)/com.echo.daemon` before + after the test block; if pre-existing, the after-state PID must equal the before-state PID; if not pre-existing, both states must be "not loaded."
   **Production data-dir/db-path stability assertion (r3 codex F2 / codex-ops F2 MED — conditional).** The mtime + size snapshot of `~/Library/Application Support/ECHO/` + `~/Library/Application Support/ECHO/echo.db` is ONLY required to be stable when the production daemon is either NOT loaded OR has been explicitly quiesced (via an out-of-band `echoctl daemon stop` not part of this smoke). If the production daemon is loaded and serving, normal background ingestion (Codex/Claude/git captures from other live AI clients) can legitimately mutate the production sqlite/WAL files independently of the smoke; treating those background writes as a smoke failure would make the test flaky on the exact machine it is meant to protect. Instead, the smoke proves production-untouchedness positively by combining (i) the label/PID/plist-path snapshot above (production launchd job unchanged), (ii) the test-daemon positive-override assertions in step 4 (status reports the test data-dir + db-path; logs tails the test log-dir), and (iii) the AC3.8 production-job-safety assertion (the daemon-install fake-launchctl test asserts no override-non-default invocation ever issues a command against the production label). When production IS quiesced/absent, the mtime+size stability assertion runs additionally as a defense-in-depth check.

This is the ONLY test that catches the AC2.1 (SQL migrations) bug + the AC1.4 (coord config) bug end-to-end. Without it, those bugs slip through every other type-check / lint / unit test.

**AC5.2 — Test isolation (r1 codex F3 / codex-ops F2 HIGH; r2 codex F1 HIGH extend).** Production-safety contract:

- **Label** — unique `com.echo.daemon.test-<uuid>`; production `com.echo.daemon` is NEVER passed to any `echoctl daemon <verb>` invocation in the test.
- **Plist path** — tmp file under the test prefix; the production `~/Library/LaunchAgents/com.echo.daemon.plist` is NEVER written, overwritten, or removed by the test.
- **Log dir** — unique tmp dir per test run; cleanup deletes only this dir.
- **ECHO_HOME** — unique tmp dir per test run; the founder's real `~/.echo/` is NEVER read or written.
- **Port** — random in 40000-50000 range; the canonical 38478 is NEVER used (so a passing probe cannot be a false positive from the founder's real daemon answering on 38478).
- **Data dir + db path (r2 codex F1 HIGH; r3 codex F2 / codex-ops F2 MED conditional)** — the test daemon uses a unique tmp data dir + db path per run; it NEVER writes to production. Production-untouchedness is proven positively (test-daemon's status reports test data-dir + db-path; AC3.8 production-job-safety assertion holds; install fake-launchctl test pins no production-label commands ever issue). The mtime + size of `~/Library/Application Support/ECHO/` + its `echo.db` is asserted stable ONLY when production daemon is not-loaded or has been explicitly quiesced — when production is live and serving, background ingestion legitimately mutates production sqlite/WAL independently of the smoke, so the stability assertion would be flaky.
- **Cleanup** — runs even on test failure (`try/finally` or vitest `afterEach`). Cleanup MUST verify production-job untouched (snapshot diff per AC5.1 step 7) AND production-data-dir-mtime untouched WHEN PRODUCTION IS QUIESCED OR ABSENT; a cleanup that finds production was mutated under the applicable conditions MUST surface a TEST FAILURE (not a cleanup error swallowed in logs).
- **Pre-flight skip** — if the production label `com.echo.daemon` exists AND the test environment cannot snapshot+verify it (e.g., permission denied on `launchctl print`), the test SKIPS rather than runs with a poisoned safety net. The production-data-dir mtime snapshot is best-effort: if the production daemon is live, the mtime check is deferred (per the conditional rule above); if production is quiesced/absent and the snapshot cannot be taken, the test SKIPS (same rule as the launchctl snapshot).

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
