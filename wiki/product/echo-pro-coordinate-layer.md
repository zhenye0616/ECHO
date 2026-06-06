---
status: shipped
topic: V1 Scope
subtopic: Bundle Decision
aliases:
  - ECHO Pro
  - Coordinate Layer
  - ECHO Pro Tier
  - Customer Install Boundary
---

# ECHO Pro — Coordinate Layer

## Definition

The **coordinate layer** is the customer-facing install boundary that turns ECHO from a developer-only artifact in this repo into software a user installs once and uses across every project. It is the first artifact in the project lifecycle whose authoritative form is a packed tarball (`echoctl-X.Y.Z.tgz`) and a global home directory at `~/.echo/`, rather than a worktree checked out under `~/Desktop/Project_echo/`.

The layer is framed in the parent design archive (`raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md`) as the paid coordination tier sitting on top of the free [[local-daemon|substrate]] — roles + skills + adapter sync + workflows live above the daemon, not inside it. Implementation items 070-076 ship the install + lifecycle mechanics; no billing, licensing, or pricing code shipped with them. References to a "paid tier" are design intent; the shipped artifact is reachable by anyone who runs `npm install -g echoctl-*.tgz`.

The motivating diagnosis came from founder dogfood on 2026-05-26:

> *"i can only use echo in this project not the rest of my project. that why i need to package it so i can actually use it as a product instead of iterating here"*

Before this layer existed, the daemon launchd plist ran `npm run daemon` from `PROJECT_DIR`, meaning the ECHO process *literally* depended on the source repo being on disk. The coordinate layer cuts that dependency.

## What ships in the install

Seven items, all shipped 2026-05-25 to 2026-05-26, compose the install:

- **Global home scaffold ([[2026-05-25-070-echo-global-home-scaffold|070]]).** The `~/.echo/` directory tree (`skills/`, `roles/`, `adapters/`, `state/`, `workflows/`) + the JSON schemas for `state/onboarding.json` and `state/projects.json`. Created idempotently on every daemon start; never clobbers existing state. Implementation: `src/echo-home/paths.ts`, `src/echo-home/scaffold.ts`. `ECHO_HOME` env overrides the default.
- **Role definition format ([[2026-05-25-071-role-definition-format-and-defaults|071]]).** Vendor-neutral TOML schema for `~/.echo/roles/<name>.toml` with a controlled capability vocabulary (`fs.read`, `fs.write`, `git.read`, `git.write`, `network`, `mcp.echo.read`, `mcp.echo.write`). Three canonical defaults ship at `assets/echo-roles/strategist.toml`, `assets/echo-roles/reviewer.toml`, `assets/echo-roles/builder.toml`. Loader at `src/echo-home/roles.ts`. The format is the contract every downstream subsystem reads against.
- **Adapter sync engine ([[2026-05-25-072-adapter-sync-engine|072]]).** The merge-with-markers and config-mutation engine that wires the user's chosen agents to the daemon. Writes `<!-- BEGIN ECHO --> ... <!-- END ECHO -->` blocks into `~/.codex/AGENTS.md` and `~/.claude/CLAUDE.md`; mutates only `[mcp_servers.echo]` in `~/.codex/config.toml` and `mcpServers.echo` in `~/.cursor/mcp.json`. Copies the packaged `assets/echo-skills/` library into `~/.echo/skills/` and onward into `~/.claude/commands/`, filtered by each skill's `audience` frontmatter against the active install profile (item 084) so a customer install receives only customer-audience skills (`using-echo-mcp`), not dogfood-only ones (`using-echo-coord`). Copies default role TOMLs into `~/.echo/roles/` on first install only — user edits to roles + workflows are preserved across upgrades; skills are ECHO-owned and overwritten. Conflict-detecting; never silently overwrites. Implementation: `src/echo-home/adapter-sync.ts` + `src/echo-home/adapters/*.ts`.
- **Onboarding wizard ([[2026-05-25-073-onboarding-wizard|073]]).** A UX-free staged library API — `detectAgents()`, `detectProjects()`, `wire()`, `probe()`, `summary()` — that the CLI drives. Agent detection layers config-file presence against atom-store activity over the last 30 days; project detection groups by `repo_root` in the atom store. Implementation: `src/echo-home/wizard/`. Cursor's probe is manual-only because there is no headless Cursor CLI.
- **The `echoctl` binary ([[2026-05-25-074-echo-cli-binary|074]]).** The user-facing surface. See [[echoctl-cli]] for full subcommand reference. Originally specced as `echo`; renamed pre-merge because `echo` is a POSIX shell builtin that hijacks PATH lookup.
- **First demo workflow ([[2026-05-25-075-first-demo-workflow|075]]).** The `change-review` workflow at `assets/echo-workflows/change-review.toml` validates the role-plugging-at-runtime thesis — the workflow file is just a prompt; the reviewer agent (codex / claude-code) does the diff resolution itself (`PR > unpushed > uncommitted > HEAD~1..HEAD`) using its `fs.read` + `git.read` capabilities. New code is the workflow-sync helper that mirrors the role-sync pattern; zero new runtime mechanism.
- **Packaged install boundary ([[2026-05-26-076-packaged-echoctl-install-boundary|076]]).** Flips `package.json` to non-private; fixes the `files` allowlist so every runtime asset ships (`dist/**`, `assets/echo-skills/**`, `assets/echo-roles/**`, `assets/echo-workflows/**`, `tools/review-queue/coord-roles.json`, `tools/review-queue/reviewer-bindings.json`, `tools/review-queue/reviewers.json`, `tools/review-queue/schemas/**`, `docs/echoctl-install.md`); the customer skill set was later curated (commit 8bf323b1) so only customer-audience skills ship from `assets/echo-skills/` (`using-echo-mcp`), not the full dev-process `skills/` library; adds a `prepack` script + `scripts/copy-sql-migrations.js` so the daemon's SQL migrations make it into `dist/storage/migrations/`; replaces `scripts/launchd/install.sh`'s `npm run daemon` plist target with `node <installed-package>/dist/daemon/index.js` so the source repo can move or be deleted without breaking the installed daemon; adds the `echoctl daemon` lifecycle verb (install / start / stop / restart / status / logs / uninstall) wrapping `launchctl bootstrap | bootout | kickstart | print`. macOS-only in V1; Linux/systemd is deferred per design J3.

## The install boundary

```
~/Desktop/Project_echo                  ~/.npm-global/lib/node_modules/echoctl/
├── source tree (dev only)              ├── dist/cli/index.js   ← bin target
└── npm pack                            ├── dist/daemon/index.js ← daemon entrypoint
    └── echoctl-X.Y.Z.tgz               ├── dist/storage/migrations/*.sql
                                        ├── assets/echo-skills/
                                        ├── assets/echo-roles/
                                        ├── assets/echo-workflows/
                                        └── tools/review-queue/

                                        ~/.echo/
                                        ├── skills/      ← ECHO-owned (overwritten)
                                        ├── roles/       ← user-tunable (preserved)
                                        ├── workflows/   ← user-tunable (preserved)
                                        ├── adapters/    ← per-agent cache
                                        └── state/
                                            ├── onboarding.json
                                            ├── projects.json
                                            └── capture-sources.json
```

Customer flow on a fresh machine: `npm install -g <tarball>` → `echoctl daemon install` → `echoctl init` → `echoctl run change-review` in any project. No source repo required, no `npm link`, no `vite-node`.

## Relationship to the V1 substrate

The substrate ([[local-daemon|local daemon]] + [[capture-pipeline|capture]] + [[storage|atom store]] + [[mcp-server|MCP server]]) is unchanged by the coordinate layer. The daemon still owns capture, gating, and persistence; `~/Library/Application Support/ECHO/` still holds the SQLite atom store and the PID lock; the MCP endpoint is still loopback-only on `127.0.0.1:38478`.

The coordinate layer is strictly *additive*. It lives at a sibling path (`~/.echo/`), reads the substrate via the same MCP tools any user binding does (`mcp__echo__*`), and never reaches into the substrate's data directory. A daemon running without the coordinate layer present continues to capture + serve MCP normally; the substrate-only path is the V1 free tier surface. The coordinate layer adds the role TOMLs, adapter sync, workflows, and the `echoctl` CLI on top.

The ownership classes 072 enforces formalize the boundary:

| Class | Files | On upgrade |
|---|---|---|
| ECHO-section-only (markers) | `~/.codex/AGENTS.md`, `~/.claude/CLAUDE.md` | Replace inside markers, preserve outside |
| ECHO-key-only | `~/.codex/config.toml [mcp_servers.echo]`, `~/.cursor/mcp.json mcpServers.echo` | Mutate target key only |
| ECHO-fully-owned | `~/.claude/commands/*.md`, `~/.echo/skills/*` | Overwritten |
| User-owned after first copy | `~/.echo/roles/*.toml`, `~/.echo/workflows/*.toml` | Preserved |

The asymmetry is intentional: skills are protocol artifacts and version with the package; roles and workflows are user-tunable content that survives upgrades.

## Cross-tool protocol grounding

The coordinate layer is the substrate that makes the [[builder-bindings|builder-bindings]] cross-tool protocol real for customers. Inside this repo the protocol runs against `skills/` directly; in a customer install the customer-audience skills are at `~/.echo/skills/` (copied by 072's sync engine from `assets/echo-skills/`, profile-filtered by 084) and onward at `~/.claude/commands/` (fanned out by the skill-sync adapter). Codex's binding reads from `~/.codex/AGENTS.md`'s ECHO marker block; Claude Code's reads from `~/.claude/CLAUDE.md`'s marker block; Cursor reads `~/.cursor/mcp.json`. Each binding is wired by the same `syncAll()` call, so a single `echoctl init` produces the same protocol surface across vendors.

## Open questions and next steps

- **Linux + systemd.** macOS-only is locked for V1 per [[2026-05-26-076-packaged-echoctl-install-boundary|076]] J3. The packaged daemon stays Node-spawned; cross-platform support waits until a non-macOS user enters the validation loop.
- **Native binary distribution.** Daemon stays Node-spawned per 076 J1; `pkg` / `nexe` / `bun build` is V1.5+ work, gated on distribution graduating beyond founder dogfood.
- **Public registry publish.** `npm publish` is one command away once the founder is satisfied with tarball correctness and the `echoctl` name is reserved upstream. Item 076 ships the tarball-correctness work, not the registry push.
- **Customer-tier validation experiments.** No customer has run `echoctl init` end-to-end on a non-founder machine yet. The dogfooding-revisit gate on `change-review` (075 §"Dogfooding-revisit gate") triggers the first iteration cycle.
- **Workflow inventory.** Only `change-review` ships. The next workflow (spec review fanout, parked during 076) is 077-or-later, blocked on the install boundary it now sits on top of.
