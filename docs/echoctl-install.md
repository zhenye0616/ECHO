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

This is the one thing a brand-new install cannot self-heal — ECHO's own install + wiring + daemon formation complete without it; only cross-tool capture from that agent waits on its login.

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

This removes adapter config, the launchd job, the package, and optionally all local ECHO state:

```bash
echoctl uninstall --yes
echoctl daemon uninstall
npm uninstall -g echoctl
rm -rf ~/.echo
```

The final `rm -rf ~/.echo` deletes local state, including the user's ECHO home. Use it only for a complete removal.
