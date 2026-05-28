# echoctl

ECHO is the cross-platform context layer for AI-era knowledge work.

## Install

Build and install the npm tarball, then install the daemon:

```bash
npm pack
npm install -g ./echoctl-0.1.0.tgz
echoctl daemon install
echoctl init
echoctl doctor
```

See [docs/echoctl-install.md](docs/echoctl-install.md) for full install, upgrade, reset, and removal instructions.

## What Ships

- A local daemon and MCP server that run from the installed package, plus adapter wiring for Claude Code, Cursor, and Codex.
- The `echoctl` CLI for install, daemon lifecycle, `init`, `doctor`, `run`, and `project` workflows.

## License

MIT. See [LICENSE](LICENSE).
