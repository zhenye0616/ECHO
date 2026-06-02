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

> **This install ships the context layer only.** The default `customer` profile installs
> the substrate + cross-tool retrieval surface (`using-echo-mcp`) and **deliberately withholds
> the multi-agent coordination/orchestration layer** — no `using-echo-coord` command, no
> strategist/reviewer/builder roles, no `change-review` workflow land on the machine. That
> coordination surface is dogfood-only (`--profile dogfood`) and is out of scope for this phase.

Supported clients: **codex, claude-code, cursor**.

**Platform:** macOS (launchd-managed daemon) **and Windows x64 (today's stop-gap: manual-daemon
mode).** There is no launchd on Windows, so on Windows you do NOT run `echoctl daemon install` —
you start the daemon process by hand (Step 1 branches by OS; everything else is shared). Windows
**x64 only** for now — on ARM64 the native SQLite module may need a compiler and is not validated.
**First detect your OS in Step 0 and follow the matching branch in each step.**

---

## Step 0 — Preconditions (check, don't assume)

**First determine your OS** — every later step that differs has an *On macOS* / *On Windows* branch.

**On macOS** (bash/zsh):

```bash
node --version          # MUST be >= 22.0.0  — hard engine requirement
uname -s                # expect Darwin (macOS)
command -v claude || true   # which client CLIs exist
command -v codex  || true
```

**On Windows** (PowerShell):

```powershell
node --version                       # MUST be >= 22
echo $env:PROCESSOR_ARCHITECTURE     # MUST be AMD64 (x64). ARM64 => STOP, native SQLite not validated.
where.exe git                        # git must be on PATH (powers git capture)
where.exe claude                     # which client CLIs exist + are logged in
where.exe codex
```

- If `node` is missing or < 22: install Node 22+ (`brew install node@22` / nvm on macOS;
  winget/nvm-windows on Windows) and re-check.
- At least one of `claude` / `codex` must be installed AND logged in for auto-verification to
  pass. Cursor is verified manually (see Step 5).
- **Windows:** if `PROCESSOR_ARCHITECTURE` is `ARM64`, do not proceed today — the `better-sqlite3`
  native binary has no assured ARM64 prebuild and would require Visual Studio Build Tools.

---

## Step 1 — Install the CLI and bring up the daemon

Install the CLI the same way on both platforms:

```bash
npm install -g /absolute/path/to/echoctl-0.1.0.tgz   # Windows: use the real C:\...\echoctl-0.1.0.tgz path
echoctl --version || echoctl --help                  # confirm the binary is reachable on PATH
```

If `echoctl: command not found`, see **Caveat A (PATH)**.

Then bring up the daemon — **this step differs by OS.**

> The daemon must be up **before** `init`. `init` verifies each client with a live MCP call,
> which needs the daemon already serving on `127.0.0.1:38478`.

### On macOS — launchd-managed (normal path)

```bash
echoctl daemon install                 # registers the launchd job, starts the daemon
echoctl daemon status                  # expect state = running, a pid, exit code 0
```

### On Windows (x64) — manual-daemon mode (today's stop-gap)

There is no launchd, so **do NOT run `echoctl daemon install`** (it requires `launchctl` and will
fail). Instead start the daemon process directly and **leave the window open** for the session
(PowerShell):

```powershell
$env:ECHO_MCP_PORT = "38478"
node "$(npm root -g)\echoctl\dist\daemon\index.js"
```

> **Do NOT set `ECHO_DATA_DIR`.** Leave it unset so the daemon, `init`, and `doctor` all resolve
> the **same** default data dir (under the user profile) and agree on one SQLite store. If you
> override it for the daemon only, `doctor` checks a different DB and reports a false failure.
> Port 38478 is the default; setting `ECHO_MCP_PORT` just makes it explicit.

It should print that the MCP server is listening on `127.0.0.1:38478`. Confirm from a **second**
PowerShell window before continuing:

```powershell
curl.exe http://127.0.0.1:38478/mcp   # any HTTP response (even an error body) = daemon is up
```

Keep the daemon window running for all remaining steps. Run Steps 3–4 (`init`, `doctor`) in a
**separate** PowerShell window. (To survive reboots later, put those two lines in a `.cmd` and add
a shortcut to it in `shell:startup` — not needed today.) See **Caveat W1** if `node ... index.js`
can't find the entry path.

---

## Step 2 — Write the answer file (REQUIRED for agent-driven init)

`echoctl init` is interactive by default and will **refuse to run** without a TTY:

```
echoctl init: non-interactive — a TTY is required unless --answer-file <path> is provided.
```

Since you are an agent, you cannot answer prompts. You **must** drive init with an answer file.
Write this JSON to a temp path — `/tmp/echo-init.json` on macOS, e.g.
`%TEMP%\echo-init.json` on Windows — filling in the real values:

```json
{
  "confirm_setup": true,
  "profile": "customer",
  "selected_agents": ["claude-code", "codex"],
  "default_project_repo_root": "/Users/<user>/path/to/their/main/repo"
}
```

> **Windows path escaping:** in JSON, write Windows paths with **doubled backslashes**, e.g.
> `"default_project_repo_root": "C:\\Users\\<user>\\path\\to\\their\\repo"` (and likewise for
> `repo_root` if you add it). A single backslash is a JSON escape char and will corrupt the file.

Field reference:

| Field | Required | Meaning |
|---|---|---|
| `confirm_setup` | yes | Must be `true` or init exits cleanly without doing anything. |
| `profile` | recommended | `customer` (default) installs the context layer only — substrate + retrieval, no coordination surface. Set it explicitly so the install is unambiguous. Use `dogfood` ONLY on the founder's own machine to get the full multi-agent coordination surface. If omitted, init defaults to `customer` and prints a one-line warning. |
| `selected_agents` | yes | Subset to wire. Use only clients that are installed + logged in. Drop `cursor` if you can't manually verify it. |
| `default_project_repo_root` | yes | Absolute path to a real git repo to capture. May be `null`, but a real repo is what makes the demo work. |
| `repo_root` | only if asked | Add this **only** if init errors `repo_root: required because ECHO could not locate its source tree`. Set it to any real repo path. See **Caveat F**. |

---

## Step 3 — Run init non-interactively

```bash
echoctl init --json --answer-file /tmp/echo-init.json   # Windows: --answer-file %TEMP%\echo-init.json
```

Read the emitted JSON events in order: `init.detect-agents`, `init.detect-projects`,
`init.wire`, `init.probe`, `init.daemon`, `init.done`.

- `init.wire` — each selected agent should have `wire_error: null`. **On Windows**, the
  `claude-code` wire shells out to `claude mcp add`; if that returns a spawn/`ENOENT` error,
  the Codex wire (a file edit) still succeeds — finish init, then apply **Caveat W2** to register
  Claude Code by hand.
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

> **On Windows (manual-daemon mode):** `doctor` may report the daemon's *launchd job* as not
> installed even though the daemon is running — that check assumes macOS. **Ignore the
> job/launchd check**; the checks that matter are **port `38478` reachable** and a successful
> `echo_ping` in Step 5. As long as `curl.exe http://127.0.0.1:38478/mcp` answered in Step 1,
> the daemon is healthy. See **Caveat W4**.

Also confirm the onboarding record (`~/.echo/state/onboarding.json` on macOS;
`%USERPROFILE%\.echo\state\onboarding.json` on Windows):

```bash
cat ~/.echo/state/onboarding.json   # expect "completed": true, "profile": "customer", agents listed
```
```powershell
Get-Content "$env:USERPROFILE\.echo\state\onboarding.json"   # Windows equivalent
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
5. Do the reverse to prove it is bidirectional: do real work in the **second** client, then
   recall it from the **first**.

**This cross-tool recall — Claude Code ↔ Codex, with no hand-staging — IS the success
condition for this phase.** There is nothing else to "run."

> **Do NOT run `echoctl run change-review` (or any `echoctl run <workflow>`) on this install.**
> Workflows are part of the coordination/orchestration layer, which a `customer` profile
> deliberately does not install — the command will find no workflow and fail. The `init` "done"
> message may still suggest `echoctl run <workflow>`; ignore that line on a customer install.

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

## Windows Caveats (manual-daemon mode — today's stop-gap)

### W1. `node ... index.js` can't find the daemon entry
`npm root -g` should resolve the global module dir; the entry is then
`<that>\echoctl\dist\daemon\index.js`. If the path is wrong, find it explicitly:
```powershell
npm root -g                                  # e.g. C:\Users\<u>\AppData\Roaming\npm\node_modules
Get-ChildItem "$(npm root -g)\echoctl\dist\daemon\index.js"   # confirm the file exists
node "$(npm root -g)\echoctl\dist\daemon\index.js"
```

### W2. Claude Code wire failed with a spawn / `ENOENT` error
On Windows, Node spawning the `claude.cmd` shim (what `echoctl init` does to register the MCP
server with Claude Code) can throw `ENOENT`. The Codex wire is a file edit and is unaffected.
**Register Claude Code yourself** in PowerShell, where `claude` resolves interactively:
```powershell
claude mcp add --transport http --scope user echo http://127.0.0.1:38478/mcp
```
Then restart Claude Code (Step 5). Re-running `echoctl init --force` is NOT required — the manual
`mcp add` is the wire.

### W3. Daemon must stay running
`echoctl daemon status` / `start` / `restart` / `stop` all require `launchctl` and do **not**
work on Windows. The daemon lives only as long as the `node ... index.js` window you opened in
Step 1. If it closes, recall stops working — reopen the window and re-run the launch command.

### W4. `doctor` reports the daemon job missing / degraded
Expected in manual-daemon mode — `doctor`'s daemon-lifecycle check assumes a launchd job. Trust
**port `38478` reachable** (`curl.exe http://127.0.0.1:38478/mcp`) and a successful `echo_ping`
instead. Adapter-wiring and migration checks in `doctor` are still meaningful.

### W5. `npm install -g` tries to compile `better-sqlite3` (node-gyp)
The prebuilt binary download failed — almost always because the machine is **ARM64**, not x64
(`echo $env:PROCESSOR_ARCHITECTURE`). x64 should download a prebuilt binary with no compiler.
On ARM64 you'd need Visual Studio Build Tools — out of scope for today; use an x64 machine.

### W6. Port 38478 already in use
Override consistently — the manual daemon reads `ECHO_MCP_PORT`; `init`/`doctor` take `--port`:
```powershell
$env:ECHO_MCP_PORT = "38500"; node "$(npm root -g)\echoctl\dist\daemon\index.js"   # window 1
echoctl init   --port 38500 --json --answer-file $env:TEMP\echo-init.json          # window 2
echoctl doctor --port 38500 --json
claude mcp add --transport http --scope user echo http://127.0.0.1:38500/mcp       # if W2 applies
```

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

**On Windows (manual-daemon mode)** — there is no launchd job to install/uninstall:

```powershell
# Stop the daemon: close its PowerShell window (or Ctrl-C in it). No `daemon uninstall`.
echoctl uninstall --yes                       # removes client wiring
npm uninstall -g echoctl                       # removes the CLI
Remove-Item -Recurse -Force "$env:USERPROFILE\.echo"                              # onboarding/skills/state
Remove-Item -Recurse -Force "$env:USERPROFILE\Library\Application Support\ECHO"   # captured SQLite store (default data dir)
```
