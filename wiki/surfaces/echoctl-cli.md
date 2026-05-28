---
status: shipped
topic: Form Factor
subtopic: MCP Server
aliases:
  - echoctl
  - ECHO CLI
  - echo cli
---

# `echoctl` CLI

`echoctl` is the customer-facing command-line surface for the [[echo-pro-coordinate-layer|coordinate layer]]. It wraps the [[2026-05-25-073-onboarding-wizard|onboarding wizard]], the [[2026-05-25-072-adapter-sync-engine|adapter sync engine]], the daemon lifecycle, and the workflow runtime behind a single binary the user types. Specced as item [[2026-05-25-074-echo-cli-binary|074]] (the CLI itself) plus [[2026-05-26-076-packaged-echoctl-install-boundary|076]] (the packaged install boundary and `daemon` subcommand).

Implementation: `src/cli/index.ts` is the entry point. Subcommand modules live under `src/cli/commands/`. No third-party CLI framework — `node:util` `parseArgs` for argv, `node:readline/promises` for prompts, raw ANSI gated on `process.stdout.isTTY` for color.

## Why the binary is named `echoctl`, not `echo`

The 2026-05-25 design archive originally specced the binary as `echo`. That was wrong: `echo` is a POSIX shell builtin in bash, zsh, and dash, so `echo init` would print the literal string `init`, never reaching the CLI on PATH. The rename to `echoctl` (following the `kubectl` / `systemctl` / `launchctl` convention) was the r2 codex-ops disposition during review of 074. The product name "ECHO" is unchanged — only the verb the user types moves.

## Subcommands

```
echoctl init                            # run the onboarding wizard
echoctl doctor                          # health check (read-only)
echoctl uninstall                       # remove ECHO blocks from agent configs
echoctl run <workflow> [--project P]    # dispatch a workflow

echoctl daemon install                  # write launchd plist + bootstrap
echoctl daemon start                    # bootstrap the daemon if not loaded
echoctl daemon stop                     # bootout
echoctl daemon restart                  # bootout + bootstrap
echoctl daemon status                   # PID + uptime + plist path + 1-line health
echoctl daemon logs [--tail N | --follow]
echoctl daemon uninstall                # bootout + remove plist

echoctl project add|list|remove         # manage the git-capture allowlist
                                        # (~/.echo/state/capture-sources.json)

echoctl --version                       # version from package.json
echoctl --help                          # subcommand list
```

Global flags: `--quiet` suppresses progress stdout; `--json` switches all stdout to newline-delimited JSON events. Both can stack. Errors always go to stderr as plain text.

Exit codes follow UNIX convention: `0` success, `1` runtime error, `2` usage error, `130` / `143` for SIGINT / SIGTERM forwarded to dispatched child processes.

### `init`

Drives the [[2026-05-25-073-onboarding-wizard|wizard]] end-to-end with TTY prompts. The flow:

1. **Welcome** — 1-sentence pitch + ETA, `[Y/n]` confirm.
2. **Detect agents** — calls `wizard.detectAgents()`, renders the `DetectedAgent[]` with confidence buckets, prompts for the subset to wire (default = all `high` + `medium` confidence).
3. **Detect projects** — calls `wizard.detectProjects()`, prompts for the default project (or skip).
4. **Wire** — calls `wizard.wire()` which invokes the [[2026-05-25-072-adapter-sync-engine|adapter sync engine]]; renders per-agent actions (added / updated / conflict / error). Conflict diffs are surfaced verbatim — the wizard never silently overwrites a user edit. As of commit `36b9287a`, `echoctl init` also installs and starts the daemon if missing, closing the previous gap where the wizard would wire agents to a non-running MCP endpoint.
5. **Probe** — calls `wizard.probe()` which spawns each agent with a minimal `mcp__echo__echo_ping` round-trip. Cursor is manual-only because there is no headless CLI; the user is given an instruction string.
6. **Done** — calls `wizard.markCompleted()`; prints next-action hint + paths.

A non-TTY guard at the top of `runInit` exits `2` if `process.stdin.isTTY` is false, to prevent pipe-driven invocations from silently mutating `~/.codex`, `~/.claude`, `~/.cursor`, and `~/.echo` via prompt-default cascade. An `--answer-file` non-interactive path landed post-076 (commit `9070af7c`) for the headless install case.

### `doctor`

Read-only health check. Probes:

- daemon reachability via the MCP `/mcp` endpoint
- `~/.echo/state/` integrity (schema-version checks against [[2026-05-25-070-echo-global-home-scaffold|070]]'s validators)
- presence of any orphaned `adapter-sync.lock`
- per-agent re-probe (same spawn shape as wizard step 5)

Reports `ok` / `degraded` / `broken` per the truth table in [[2026-05-25-074-echo-cli-binary|074]] AC3.6. Never mutates state — a `--fix` flag is explicitly out of scope. Orphan lock removal is the user's `rm`, surfaced with mtime + suggested command. As of commit `27e44b0f`, probes pass `--skip-git-repo-check` + `--allowedTools` so doctor returns truthful results outside the source repo.

### `uninstall`

The inverse of 072's writes. For each wired agent:

- strips the `<!-- BEGIN ECHO --> ... <!-- END ECHO -->` block from `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`, preserving everything outside;
- removes `mcp_servers.echo` from `~/.codex/config.toml` and `mcpServers.echo` from `~/.cursor/mcp.json` via the same secret-sensitive atomic write 072 uses;
- removes `~/.claude/commands/*.md` files whose contents byte-equal their `~/.echo/skills/<name>.md` counterpart (the byte-equality proof of ECHO ownership).

`--purge-state` additionally removes `~/.echo/`. Both modes require interactive `y/N` confirmation unless `--yes` is passed; the prompt enumerates exactly which files will be touched.

### `run`

Runtime role-plugging primitive.

1. Loads `~/.echo/workflows/<name>.toml` via `src/cli/workflow/load.ts`.
2. Matches each step's `role` against onboarded agents' capabilities via `src/cli/workflow/match.ts` — the matcher picks the agent whose `OnboardedAgentProfile.capabilities ⊇ role.requires.capabilities`, breaking ties by earliest `wired_at`. `--agent <role>=<id>` overrides the pick.
3. Dispatches the step via `src/cli/workflow/dispatch.ts` — `spawn` the agent's CLI with the workflow's prompt, capture stdout / stderr / exit code, surface findings in the human-mode renderer.

`--project P` resolution: explicit flag > nearest `.git/` above `cwd` > `default_project` from `projects.json` > error. The CLI ships the mechanism; the [[2026-05-25-075-first-demo-workflow|change-review workflow]] is the first content (and the only one as of 076).

### `daemon`

Lifecycle management for the packaged daemon, added in [[2026-05-26-076-packaged-echoctl-install-boundary|076]] AC3. Each verb wraps a `launchctl` invocation against the user-scoped plist (`gui/<uid>/com.echo.daemon` by default; override with `--label`).

- `install` — writes the plist (`~/Library/LaunchAgents/com.echo.daemon.plist` by default) targeting `node <installed-package>/dist/daemon/index.js`, then `launchctl bootstrap`. No `WorkingDirectory` is set, so the daemon does not depend on the source repo. `KeepAlive=true` survives crashes; `--port`, `--db-path`, `--label`, `--log-dir` overrides supported at install time.
- `start` / `stop` — `bootstrap` / `bootout` with idempotent semantics.
- `restart` — `bootout` followed by `bootstrap`, with a post-bootstrap health probe wait so callers can rely on the daemon being live before proceeding.
- `status` — prints PID, uptime (real, parsed from `launchctl print` since commit `32e07e13`), plist path, port, and a 1-line health string.
- `logs` — tails the plist-configured stdout/stderr log paths.
- `uninstall` — `bootout` followed by plist removal.

### `project`

Added in commit `583f71fd`. Manages `~/.echo/state/capture-sources.json` — the allowlist that controls which repos the daemon's [[git-capture|git-watcher]] reads from. Subcommands:

- `project add <path>` — appends a repo root, deduped + normalized.
- `project list` — prints the allowlist.
- `project remove <path>` — removes the entry.

Edits are atomic-write through the same helper as the rest of `~/.echo/`.

## Daemon lifecycle integration

The CLI does not run the daemon in-process — the daemon is a separate Node process under launchd. Before 076 the launchd plist ran `npm run daemon` from `PROJECT_DIR`, hard-coupling the daemon to the source repo. 076 replaced the plist's `ProgramArguments` with `["node", "<installed-package>/dist/daemon/index.js"]`, and `scripts/launchd/install.sh` is now invoked through `echoctl daemon install` (the shell script remains as a thin wrapper).

`echoctl init` calls `echoctl daemon install` + `echoctl daemon start` if the daemon is not already loaded (commit `36b9287a`); previously the wizard would wire agents to an MCP endpoint that nothing was listening on. The doctor's `daemon unreachable` truth table case is what catches a degraded post-install state.

## Install boundary

The packed tarball contents are pinned by `package.json`'s `files` allowlist:

```
dist/**/*.js
dist/**/*.d.ts
dist/**/*.sql
skills/**
assets/echo-roles/**
assets/echo-workflows/**
tools/review-queue/coord-roles.json
tools/review-queue/reviewers.json
tools/review-queue/schemas/**
package.json
README.md
```

Each line carries the load — `dist/**/*.sql` ships SQLite migrations (the daemon resolves them via `import.meta.url`, so the lookup works against `dist/storage/migrations/` post-pack and `src/storage/migrations/` in dev); `tools/review-queue/coord-roles.json` + schemas ship because the daemon's `src/coord/roles.ts` validates against them at startup; `skills/**` ships because 072 copies into `~/.echo/skills/`. Removing any entry produces a daemon-crash or wizard-failure regression that the shell-reachability smoke test (`tests/cli/shell-reachable.test.ts`) catches.

Negative assertions also enforced: the tarball does NOT contain `backlog/`, `raw/`, `wiki/`, `tests/`, `src/`, `node_modules/`, `coverage/`, `tools/review-queue/*.sh`, `tools/review-queue/*.py`, or `dist/**/*.test.{js,d.ts}`. The dev-only review-queue wrappers are excluded; `coord_invoke` cleanly rejects with a `CoordPathError`-shaped response in a packaged install rather than crashing the daemon (the de-scope is implicit in the absence of the wrappers, not a code path).

## Tarball and docs in the package

`npm pack` produces `echoctl-X.Y.Z.tgz` in the repo root (current ship: `echoctl-0.1.0.tgz`). Commit `77c5d363` added a README + MIT LICENSE + CHANGELOG, and started shipping `docs/echoctl-install.md` inside the tarball so a fresh-install user has the install / verify / use / upgrade / uninstall guide co-located with the package.

The single canonical install doc is `docs/echoctl-install.md`. Per design J7 in [[2026-05-26-076-packaged-echoctl-install-boundary|076]], no tutorial videos, Discord, or onboarding pages live alongside it — the doc iterates as commits, not new specs.

## What `echoctl` does not do

Per [[felt-not-seen|felt-not-seen]], the CLI is infrastructure, not a destination:

- No telemetry, no phone-home, no cloud sync.
- No hosted identity, no accounts, no licensing check.
- No dashboard, no management UI, no web surface.
- No `postinstall` auto-restart magic — upgrades are explicit `npm install -g <newer.tgz>` + `echoctl daemon restart`.
- No `doctor --fix` — the read-only contract is preserved so the user always sees what is about to change before it changes.
