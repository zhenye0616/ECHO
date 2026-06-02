# echoctl Install

ECHO V1 installs as an npm-packed `echoctl` CLI plus a macOS launchd daemon. The daemon runs from the installed package's `dist/daemon/index.js`; it does not depend on the source repo being present.

## Install

From the ECHO repo:

```bash
npm pack
npm install -g ./echoctl-0.1.0.tgz
echoctl daemon install
echoctl init
echoctl doctor
```

`npm pack` runs `npm run build:cli` first, which builds `dist/` and copies SQL migrations into `dist/storage/migrations/`.
`echoctl init` wires selected agents and registers Claude Code's ECHO MCP server at user scope with `claude mcp add --transport http --scope user echo http://127.0.0.1:<port>/mcp`.

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
npm install -g ./echoctl-0.1.0.tgz
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
