# echoctl Install

> **SCOPE (2026-07-11): this is the CURRENT full-lab / diagnostic install (Contract A).** It boots the entire ECHO lab daemon and is intended for founder-operated lab use and clean-machine rehearsal, **not** for client delivery. The client product install (Contract B: versioned product package + `ANTHROPIC_API_KEY` + product-only composition root) is not yet built. See `docs/install-contracts.md` for the two-contract separation before using this for anything client-facing.

ECHO V1 installs as an npm-packed `echoctl` CLI plus a macOS launchd daemon. The daemon runs from the installed package's `dist/daemon/index.js`; it does not depend on the source repo being present.

## Install

From the ECHO repo:

```bash
npm pack
npm install -g "./$(npm pack | tail -1)"   # tarball name tracks the package version
echoctl daemon install
echoctl init
echoctl doctor
```

`npm pack` runs `npm run build:cli` first, which builds `dist/` and copies SQL migrations into `dist/storage/migrations/`.
`echoctl init` wires selected agents and registers Claude Code's ECHO MCP server at user scope with `claude mcp add --transport http --scope user echo http://127.0.0.1:<port>/mcp`.

### Vendor login (required for a green `doctor`)

ECHO wires the agent CLIs but cannot log into them for you. On a fresh machine `echoctl doctor` reports `degraded` with `agent codex: auth-required` (or the same for any agent) until you authenticate the vendor CLI itself:

```bash
codex login      # and/or the login command for whichever agents you selected
echoctl doctor   # should now report healthy
```

This is the one thing a brand-new install cannot self-heal — ECHO's own install + wiring + daemon formation complete without it. It gates more than cross-tool capture: the Granola signals brain extracts meeting signals by spawning the `codex` (or `claude`) CLI as a subprocess, so until that CLI is authenticated there is **no signal extraction and therefore no brief**. Vendor login gates both cross-tool capture from that agent *and* the meeting→brief path.

## Daily Use

After install, `echoctl` can run from any directory:

```bash
cd ~/Desktop/SomeProject
echoctl run change-review
```

The daemon is managed by launchd and serves MCP on `127.0.0.1:38478` unless installed with `--port`.

## Claude Code MCP Troubleshooting

Claude Code registration is best-effort because it uses the vendor CLI. If `echoctl doctor` reports `claude-code: mcp-not-configured`, run:

```bash
claude mcp add --transport http --scope user echo http://127.0.0.1:38478/mcp
echoctl doctor
```

If it is still degraded, remove any old local-scope entry that may shadow the user-scope server, then re-check:

```bash
claude mcp remove echo -s local
echoctl doctor
```

## Upgrade

Rebuild and reinstall the new tarball, then restart the daemon explicitly:

```bash
npm pack
npm install -g "./$(npm pack | tail -1)"
echoctl daemon restart
```

There is no `postinstall` auto-restart. The launchd plist points at the global package path, so `daemon restart` loads the newly installed `dist/daemon/index.js`.

## What Changes on Upgrade

| Slot | Upgrade behavior |
|---|---|
| `dist/**` | Replaced by `npm install -g` |
| `~/.echo/skills/` | Overwritten by the next `echoctl init`; user edits are lost |
| `~/.echo/roles/` | Preserved if user-modified; copied if absent |
| `~/.echo/workflows/` | Same as roles |
| `~/.echo/state/`, `~/.echo/adapters/`, daemon sqlite | Never touched by package upgrade |
| Agent configs in `~/.codex/`, `~/.claude/`, `~/.cursor/` | Preserved; `echoctl init` is idempotent |

## Reset

Reset onboarding while preserving daemon state:

```bash
echoctl uninstall --yes
rm -rf ~/.echo/{skills,roles,workflows,adapters,state}
echoctl init
```

## Full Removal

This removes adapter config, the launchd job, the package, and optionally all local ECHO state. Note the capture database does NOT live under `~/.echo` — removing only `~/.echo` leaves all captured data on disk.

First enumerate **every** loaded ECHO launchd job and boot each one out before deleting any data — a machine may carry more than the default daemon (a secondary or `com.echo.selftest.*` daemon has its own label, ECHO_HOME, database, and logs, and can still be running). Stopping first is mandatory or WAL checkpointing recreates files mid-delete:

```bash
launchctl list | grep -i echo          # every loaded job whose label matches echo
# for EACH label found, stop it (default label shown; repeat per custom --label):
echoctl daemon uninstall --label com.echo.daemon
# for a label echoctl does not manage, boot it out directly:
launchctl bootout gui/$(id -u)/<label>
```

Then remove config, package, and state (default paths shown):

```bash
echoctl uninstall --yes
npm uninstall -g echoctl
rm -rf ~/.echo                                            # state sidecars + config (or the custom ECHO_HOME / --home if one was set)
rm -rf ~/Library/Application\ Support/ECHO                # echo.db + echo.db-wal + echo.db-shm
rm -rf ~/Library/Logs/echo                                # daemon/worker logs (echo-daemon.out.log / .err.log)
```

Delete the locations **actually in use**, not the defaults, wherever the install customized them:

- **Database:** a custom `--db-path` / `ECHO_DB_PATH` or `--data-dir` / `ECHO_DATA_DIR` moves `echo.db` (+ `-wal` / `-shm`) — delete that location instead of the Application Support path.
- **ECHO_HOME:** a custom `--home` / `ECHO_HOME` moves the state sidecars out of `~/.echo` — delete that path instead.
- **Logs / plist / label:** a custom `--log-dir` moves the daemon logs; a custom `--plist-path` / `--label` moves the launchd plist (default `~/Library/LaunchAgents/<label>.plist`). Check the label, plist path, and log dir actually passed at install time and delete those, not the defaults.
- **Generated briefs:** `echoctl brief` writes `brief-<note_id>.json` and `brief-<note_id>.md` into its `--out-dir`, which defaults to the directory the command was run from — there is no single canonical brief location. Delete every directory where briefs were generated; the operator must track those.
- **Manual copies/backups** of `echo.db` are not touched by any of this — chase them separately.

Use only for a complete removal.
