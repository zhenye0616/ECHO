# ECHO Onboarding Runbook (agent-driven)

**Audience:** an AI coding agent (Claude Code, Codex, or Cursor's assistant) running on the
customer's machine, asked to install ECHO from the `echoctl-0.1.0.tgz` tarball.

**Goal:** install the ECHO daemon + MCP server, wire it into the local AI clients, and verify
that cross-tool context retrieval works — without the ECHO source repo and without any
interactive prompts.

You have shell access. Run the steps in order. After each step, check the exit code and the
JSON output before continuing. If a step fails, find it in **Known Caveats** at the bottom and
apply the fix before retrying — do not improvise around a failure.

---

## What you are installing

`echoctl` is the packaged ECHO context layer. Once installed it gives every wired AI client on
this machine cross-tool recall via MCP tools (`echo_ping`, `search_memories`, `find_clusters`,
`get_recent_work_context`, …). A local launchd daemon passively captures work from Claude Code,
Codex, Cursor, and git into a local SQLite store; nothing leaves the machine.

Supported clients: **codex, claude-code, cursor**. macOS only (the daemon is launchd-managed).

---

## Step 0 — Preconditions (check, don't assume)

Run these and confirm before installing:

```bash
node --version          # MUST be >= 22.0.0  — hard engine requirement
uname -s                # MUST be Darwin (macOS)
command -v claude || true   # which client CLIs exist
command -v codex  || true
```

- If `node` is missing or < 22: install Node 22+ (`brew install node@22` or nvm) and re-check.
- At least one of `claude` / `codex` must be installed AND logged in for auto-verification to
  pass. Cursor is verified manually (see Step 5).

---

## Step 1 — Install the CLI and daemon

```bash
npm install -g /absolute/path/to/echoctl-0.1.0.tgz
echoctl --version || echoctl --help   # confirm the binary is reachable on PATH
echoctl daemon install                 # registers the launchd job, starts the daemon
echoctl daemon status                  # expect state = running, a pid, exit code 0
```

> Install the daemon **before** `init`. `init` verifies each client by making a live MCP call,
> which needs the daemon already serving on `127.0.0.1:38478`.

If `echoctl: command not found`, see **Caveat A (PATH)**.

---

## Step 2 — Write the answer file (REQUIRED for agent-driven init)

`echoctl init` is interactive by default and will **refuse to run** without a TTY:

```
echoctl init: non-interactive — a TTY is required unless --answer-file <path> is provided.
```

Since you are an agent, you cannot answer prompts. You **must** drive init with an answer file.
Write this JSON to `/tmp/echo-init.json`, filling in the real values:

```json
{
  "confirm_setup": true,
  "selected_agents": ["claude-code", "codex"],
  "default_project_repo_root": "/Users/<user>/path/to/their/main/repo"
}
```

Field reference:

| Field | Required | Meaning |
|---|---|---|
| `confirm_setup` | yes | Must be `true` or init exits cleanly without doing anything. |
| `selected_agents` | yes | Subset to wire. Use only clients that are installed + logged in. Drop `cursor` if you can't manually verify it. |
| `default_project_repo_root` | yes | Absolute path to a real git repo to capture. May be `null`, but a real repo is what makes the demo work. |
| `repo_root` | only if asked | Add this **only** if init errors `repo_root: required because ECHO could not locate its source tree`. Set it to any real repo path. See **Caveat F**. |

---

## Step 3 — Run init non-interactively

```bash
echoctl init --json --answer-file /tmp/echo-init.json
```

Read the emitted JSON events in order: `init.detect-agents`, `init.detect-projects`,
`init.wire`, `init.probe`, `init.daemon`, `init.done`.

- `init.wire` — each selected agent should have `wire_error: null`.
- `init.probe` — `probed: true` per agent is success. A `probed: false` with a `reason` is a
  caveat, not necessarily fatal — match the `reason` against the table in **Caveat E** and fix it.
- `init.done` — onboarding state written. Init exit code `0`.

To **re-run / re-onboard** (e.g. after fixing a caveat), add `--force` so init replaces the
existing ECHO marker blocks in client configs instead of erroring:

```bash
echoctl init --json --force --answer-file /tmp/echo-init.json
```

---

## Step 4 — Verify the install

```bash
echoctl doctor --json
```

Expect all checks green: daemon up, port `38478` reachable, state/migrations OK, adapters
wired, agents probed. If doctor reports degraded, the JSON names the failing check — map it to
the caveats below.

Also confirm the onboarding record:

```bash
cat ~/.echo/state/onboarding.json   # expect "completed": true and your agents listed
```

---

## Step 5 — Prove cross-tool retrieval (the actual point)

Auto-probe only confirms the MCP wire is live. To prove the product works:

1. **Restart the AI client(s)** so they load the freshly written MCP server block. For Cursor,
   fully quit and reopen the IDE. (Init writes config; running sessions don't hot-reload it.)
2. In one client, call the MCP tool `echo_ping` — expect `{"pong": true, "ts": "..."}`.
3. Do a small piece of real work in **one** client (e.g. Codex edits + commits a file).
4. Switch to **another** client and call `search_memories` or `find_clusters` for that work.
   Recall of the other tool's work, with no hand-staging, is the success condition.

Optional: `cd <repo> && echoctl run change-review` exercises the bundled reviewer workflow,
which pulls ECHO context and reviews the current diff.

---

## Known Caveats and Fixes

### A. `echoctl: command not found` after global install
The global npm bin dir isn't on `PATH`. Find it and add it:
```bash
npm prefix -g           # e.g. /Users/<user>/.npm-global  → bin is <that>/bin
export PATH="$(npm prefix -g)/bin:$PATH"   # add to ~/.zshrc to persist
```

### B. `node` too old / wrong version
Engine requires Node ≥ 22. Even if a newer node exists, the shell may resolve an older one.
Verify `node --version` resolves to ≥ 22 in the same shell you run `echoctl` from (watch for
nvm shells / `sudo` dropping PATH).

### C. Daemon won't start / `daemon status` not running
- Re-run `echoctl daemon install`. Run it as the **logged-in GUI user**, not under `sudo`
  (launchd user agents need the user's GUI session).
- Inspect logs: `echoctl daemon logs` (tails `~/Library/Logs/echo/daemon.*.log`).
- Restart explicitly after any reinstall: `echoctl daemon restart` (there is no auto-restart).

### D. Port 38478 already in use
Pick a free port and use it **consistently** across all three commands — they don't share a
default once you override:
```bash
echoctl daemon install --port 38500
echoctl init   --port 38500 --answer-file /tmp/echo-init.json
echoctl doctor --port 38500
```

### E. `init.probe` shows `probed: false` — decode the `reason`
| `reason` | Cause | Fix |
|---|---|---|
| `cli-unavailable` | The client CLI (`claude`/`codex`) isn't on PATH | Install it / add to PATH, then re-run init `--force`. |
| `auth-required` | Client not logged in | Log in (`claude` / `codex` auth flow), re-run init `--force`. |
| `mcp-not-configured` | Claude Code didn't see the MCP block | Confirm the daemon is running and `--port` matches; re-run init `--force`. |
| `timeout` | Daemon slow or down at probe time | `echoctl daemon status`; start it; re-run init. |
| `manual-only` | Expected for **cursor** — it is never auto-probed | Not a failure. Verify Cursor manually per Step 5. |
| `unexpected-output` | Client returned non-contract output | Re-run; if persistent, verify the client can call MCP tools at all. |

### F. `repo_root: required because ECHO could not locate its source tree`
init couldn't find a tree to sync skills from. Add a `repo_root` field to the answer file
pointing at any real repo path (the customer's project repo is fine), then re-run.

### G. Client still can't see ECHO tools after a green install
The client process is using a stale config. **Restart the client** (quit + reopen the IDE for
Cursor; start a new `claude`/`codex` session). The wiring is written to `~/.claude/`,
`~/.codex/`, `~/.cursor/`; running sessions don't reload it mid-flight.

### H. Re-running init wiped customized skills
`echoctl init` overwrites `~/.echo/skills/` every run by design. Don't hand-edit those files;
they are package-owned. User-modified `~/.echo/roles/` and `~/.echo/workflows/` are preserved,
and daemon state / SQLite is never touched by init or package upgrade.

---

## Reference: reset / upgrade / remove

```bash
# Upgrade to a newer tarball (daemon does NOT auto-restart):
npm install -g /path/to/echoctl-<new>.tgz
echoctl daemon restart

# Reset onboarding, keep captured daemon state:
echoctl uninstall --yes
rm -rf ~/.echo/{skills,roles,workflows,adapters,state}
echoctl init --answer-file /tmp/echo-init.json

# Full removal (deletes all local ECHO state):
echoctl uninstall --yes
echoctl daemon uninstall
npm uninstall -g echoctl
rm -rf ~/.echo
```
