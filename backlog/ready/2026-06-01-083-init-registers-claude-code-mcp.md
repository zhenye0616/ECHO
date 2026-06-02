---
id: 2026-06-01-083-init-registers-claude-code-mcp
title: "`echoctl init` registers Claude Code's MCP server (close the half-wire gap) + exact doctor remediation copy"
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-06-01
blocked_by: []
task_state_ref: 2026-06-01-083-init-registers-claude-code-mcp
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - src/echo-home/wizard/wire.ts                 # AC1 — claude-code currently gets NO mcpServer config (only Codex/Cursor do, ~line 97). Wire MUST cause Claude Code's MCP server to be registered. J1: placement (here vs a new adapter vs init.ts step).
  - src/echo-home/adapters/claude-code-mcp.ts     # AC1 (NEW, if J1 chooses the adapter shape) — spawns `claude mcp add --transport http --scope user echo <url>`, idempotent, best-effort. Parallels src/echo-home/adapters/codex-config.ts. Builder may instead fold this into wire.ts/init.ts per J1.
  - src/cli/commands/init.ts                      # AC1+AC3 — drive the registration in BOTH interactive and --answer-file paths (the smoke test + headless install must exercise it); fix the remediation string (~line 272) to the fully explicit command.
  - src/cli/commands/doctor.ts                    # AC2 — when claude-code probe == mcp-not-configured, surface the EXACT remediation line, not generic "unhealthy".
  - src/cli/io/render.ts                          # AC2 — per-agent remediation rendering (generic output today at ~lines 86/95).
  - tools/foreign-install-smoke.sh               # AC4 — assert claude-code MCP registration the way it already asserts codex's (currently only greps codex config.toml + CLAUDE.md). Use an injected fake `claude` shim on PATH that records argv (no real login in the sandbox). J2.
  - docs/echoctl-install.md                       # AC5 — remove the "manually run claude mcp add" workaround now that init does it; document the user-scope behavior + the shadowing escape hatch.
  - tests/cli/init.test.ts                        # AC6 — selecting claude-code triggers the registration spawn; claude-missing is non-fatal with remediation; idempotent re-run is non-fatal.
  - tests/cli/doctor.test.ts                      # AC6 — mcp-not-configured row prints the exact remediation command.
  - tests/echo-home/wizard/wire.test.ts           # AC6 — wire produces a claude-code MCP-registration effect (fake spawn), parallel to the codex MCP assertion.

spec_refs:
  - raw/internal/interviews/2026-06-02-coworker-n1-concierge-install.md  # the live runbook this unblocks — "Known likely fix #1 — Claude Code MCP not registered" is exactly this gap; AC5 should let the runbook drop the manual step.
  - raw/internal/decisions/2026-06-01-office-hours-n1-concierge-install.md  # the n=1 concierge decision; scope is Claude Code + Codex + git + MCP only.
  - tools/foreign-install-smoke.sh  # the isolated foreign-install test that surfaced the gap on 2026-06-01 (codex got `ok (append, add)` = real MCP registration; claude-code got `ok (append, copied, copied)` = instructions only).
  - src/echo-home/adapters/codex-config.ts  # THE PRECEDENT — how Codex's `[mcp_servers.echo]` gets registered during wire. Claude Code needs the equivalent (via the vendor CLI, not a config-file mutator — see Locked decisions).
  - src/echo-home/wizard/probe.ts  # already classifies claude-code-missing-MCP as `mcp-not-configured` (~line 150). No probe change needed; doctor/render consume this classification. Reference only.
  - src/echo-home/adapter-sync.ts  # ~line 625: claude-code path is markdown-instructions + skills only (no MCP server). Reference for J1 placement.
  - backlog/{ready,pending_review,complete}/2026-05-25-073-onboarding-wizard.md  # 073 owns wire()/probe() contracts the registration step plugs into. Shipped (complete/).
  - backlog/{ready,pending_review,complete}/2026-05-25-074-echo-cli-binary.md  # 074 owns init/doctor. Shipped.
  - backlog/{ready,pending_review,complete}/2026-05-26-076-packaged-echoctl-install-boundary.md  # 076 is the install boundary this rides on; daemon plist already bakes process.execPath + validates node>=22 (so the old "bare node" runtime worry is largely closed). Shipped.

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

## Why (the friction this closes)

The first non-founder install is happening (n=0 → n=1 concierge install, target Tue 2026-06-02; runbook in `spec_refs`). The 2026-06-01 isolated foreign-install smoke test found one live hand-staging hole: **`echoctl init` wires Codex's MCP server for real but only writes _instructions_ for Claude Code — it never registers Claude Code's actual MCP connection.**

Concretely, today:
- Codex → `init` writes `[mcp_servers.echo]` into `~/.codex/config.toml` and reports `codex: ok (append, add)`. Real connection.
- Claude Code → `init` appends a `<!-- BEGIN ECHO -->` block to `~/.claude/CLAUDE.md` and reports `claude-code: ok (append, copied, copied)`. **Instructions only — no MCP server.** Claude Code is told to use ECHO MCP tools that aren't actually connected.

So on a fresh machine, `echoctl doctor`'s probe returns `mcp-not-configured` for claude-code and the user has to manually run `claude mcp add ...`. That's a visible seam in the very first concierge demo. This item makes `init` do it, and makes `doctor` print the exact one-liner if anything is still half-wired.

## What this is — and what it deliberately is NOT

This is a **friction-fix** (per the friction-first stance): close one live hand-staging hole + sharpen one diagnostic. It is NOT a generalized adapter for arbitrary MCP clients, NOT a `~/.claude.json` mutator, NOT runtime hardening, NOT new product surface.

## Locked decisions (founder + codex consult, 2026-06-01)

1. **Register via the Claude CLI, NOT by editing `~/.claude.json` directly.** Shell out to:
   ```
   claude mcp add --transport http --scope user echo http://127.0.0.1:38478/mcp
   ```
   Rationale: `~/.claude.json` is a vendor-owned file that also holds auth/session/project state — direct mutation risks corrupting it. The CLI is the least-risky writer. (Mirrors how Codex registration shells out / writes only its own `[mcp_servers.echo]` table, never the whole config.)
2. **`--scope user`, not the default.** Claude's default `mcp add` scope is `local` — a project-cwd-keyed entry in `~/.claude.json` that won't load in the coworker's other project dirs, and a stale `local` entry **shadows** user scope (precedence is local > project > user). User scope loads across all projects. Project scope writes `.mcp.json` + needs approval → wrong for an unattended install. (Source: Claude Code MCP docs, https://code.claude.com/docs/en/mcp — builder re-verifies flag spelling against the installed `claude` CLI before locking copy.)
3. **`claude` CLI missing on PATH = non-fatal.** Registration is best-effort, exactly like 073's probe: log a clear remediation line and continue; never abort the whole `init`. (Codex/Cursor are unaffected if Claude is absent.)
4. **Idempotent.** Re-running `init` (or an "already exists" result) is non-fatal; let probe/doctor verify reachability rather than failing on a duplicate.
5. **The port/URL is the resolved `mcpServerUrl` already threaded through init** (`http://127.0.0.1:<port>/mcp`), not a hardcoded 38478 — respect `--port`/`ECHO_MCP_PORT`.

## Judgment calls (flagged for r1 reviewers)

- **J1 — placement.** Discrete step in `init.ts` (smallest, colocated with probe's spawn) vs a new `src/echo-home/adapters/claude-code-mcp.ts` invoked from `wire.ts` (consistent with the codex-config adapter; exercised by the `--answer-file` headless path AND the smoke test without going through interactive `init`). Lean: drive it from the wire path so headless/answer-file installs and `foreign-install-smoke.sh` both cover it; reviewers decide whether a named adapter module earns its keep at this size.
- **J2 — deterministic smoke-test assertion.** The sandbox has no real `claude` login. Inject a fake `claude` shim on PATH that records its argv, then assert init invoked `claude mcp add --transport http --scope user echo <url>`. (Don't assert against a real `~/.claude.json`.)
- **J3 — shadowing detection in doctor (STRETCH / likely DEFER).** Doctor could detect a `local`-scope `echo` entry shadowing the `user`-scope one and emit the `claude mcp remove echo -s local` escape hatch. Lean DEFER to After-Completion unless trivially cheap — the core fix is registration + the mcp-not-configured remediation line.

## Acceptance criteria

- **AC1 — init registers Claude Code's MCP server.** After `echoctl init` selects `claude-code` (interactive OR `--answer-file`), Claude Code's MCP server `echo` is registered at user scope pointing at the resolved `mcpServerUrl`, via the `claude` CLI (`claude mcp add --transport http --scope user echo <url>`). Codex/Cursor wiring is unchanged.
- **AC2 — exact doctor remediation.** When the claude-code probe returns `mcp-not-configured`, `echoctl doctor` prints the exact command (`claude mcp add --transport http --scope user echo <url>` then `echoctl doctor`) instead of a generic "unhealthy" line. The init-time remediation string (`init.ts` ~line 272) is updated to the same fully-explicit form (it currently omits `--transport http --scope user`).
- **AC3 — best-effort + idempotent.** `claude` missing on PATH does NOT fail `init` (clear remediation, exit success for the wire/registration step). A second `init` run, or an "already registered" outcome, is non-fatal.
- **AC4 — smoke test asserts it.** `tools/foreign-install-smoke.sh` asserts claude-code MCP registration was attempted with the correct argv (fake-`claude`-shim approach, J2), parallel to its existing codex `config.toml` assertion.
- **AC5 — runbook/doc reflects automation.** `docs/echoctl-install.md` drops the "manually run `claude mcp add`" workaround (now automatic) and documents user-scope + the `-s local` shadowing escape hatch as troubleshooting only.
- **AC6 — tests green.** New/updated tests for AC1–AC3 pass; full `npm test` + typecheck green. (Suggested focused set: `tests/cli/init.test.ts tests/cli/doctor.test.ts tests/echo-home/wizard/wire.test.ts`.)
- **AC7 — no scope drift.** No file outside `files_to_modify` is touched; the Out-of-Scope list is honored.

## Out of Scope (Don't Drift)

1. **No direct `~/.claude.json` mutator** — CLI only (Locked decision #1).
2. **No project-scope / `.mcp.json` support** — user scope only.
3. **No new MCP clients** (Cursor headless, Slack, GitHub, overlay) — claude-code only this item.
4. **No daemon runtime hardening** (nvm/asdf, vendoring Node) — 076 already bakes `process.execPath` + node>=22 validation into the plist; that's sufficient for V1. The bare-`node` in `scripts/launchd/install.sh` is the dev wrapper, not the packaged path — leave it.
5. **No probe-before-daemon reorder** in `init.ts` — the documented flow runs `echoctl daemon install` first, so the daemon is live at probe time; reorder is a non-blocker, defer.
6. **No auto-login** for `claude`/`codex` — login-wall is caught by the pre-flight gate in the runbook, not by code.
7. **No telemetry, no postinstall magic, no brew/native installer.**
8. **J3 shadowing-detection** stays a stretch — do not build a full scope-conflict resolver.

## After Completion (Strategist Notes)

- Update the n=1 runbook (`raw/internal/interviews/2026-06-02-coworker-n1-concierge-install.md`): "Known likely fix #1" becomes "verified automatic"; keep the `-s local` shadowing one-liner as a live-fallback only.
- Wiki: this is install-boundary behavior — fold into `wiki/surfaces/mcp-server.md` (or the echoctl/onboarding page) only once shipped, alongside 076's install-boundary page if/when written. Note that adapter wiring now registers MCP for BOTH Codex and Claude Code (parity).
- If J3 (shadow-scope detection) is deferred, append it to `backlog/_followups.md`, not a new spec — friction-first.

## Consult provenance

Gap found by `tools/foreign-install-smoke.sh` (2026-06-01). Fix shape from a Codex read-only consult (2026-06-01) over `init.ts` / `wire.ts` / `adapter-sync.ts` / `probe.ts` / `render.ts`; Codex's user-scope + CLI-not-JSON reasoning is the load-bearing call. Code claims verified against source by the strategist before speccing (wire.ts:97 Codex/Cursor-only MCP config; adapter-sync.ts:625 claude-code markdown+skills; init.ts:272 remediation string missing `--transport http --scope user`; daemon.ts:199/355 execPath + node>=22 — confirms OoS #4).
