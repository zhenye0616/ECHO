# ECHO beta — Windows install (context layer only)

> **RETIRED (2026-07-11) — do not send to any client or lab.** This describes the Phase-1 *Windows dev-capture context-layer beta*, a passive cross-tool capture install that is **not** the Team decision product and **not** the meeting→brief wedge. Superseded by the current install contracts (`docs/install-contracts.md`). The commercial product is the Team wedge; its client endpoint (Contract B) is not yet shipped. Kept for historical reference only.

Thanks for testing ECHO. This installs a **local, private context layer**: a small daemon
passively captures your work across Claude Code, Codex, and git into a local SQLite store on your
own machine (nothing leaves it), so any of your AI tools can recall what you did in the others.

> This build is the **context layer only**. The multi-agent coordination/orchestration features
> are intentionally not included in this phase.

## What's in this bundle

| File | What it is |
|---|---|
| `echoctl-0.1.0.tgz` | The ECHO package (install with npm). |
| `echoctl-agent-onboard-runbook.md` | **The install instructions.** Written for an AI coding agent to follow. |
| `echo-init.windows.example.json` | The install answer file template (fill in one repo path). |

## How to install (you'll let your own agent drive it)

**Requirements:** Windows **x64**, Node **≥ 22**, `git`, and Claude Code + Codex CLIs installed and
logged in.

1. Open Claude Code (or Codex) in a terminal on this machine.
2. Hand it this whole folder and say:

   > "Follow `echoctl-agent-onboard-runbook.md` to install ECHO from `echoctl-0.1.0.tgz`. I'm on
   > Windows x64 — use the Windows (manual-daemon) branch in each step. Use
   > `echo-init.windows.example.json` as the answer file; my repo is `<path-to-your-git-repo>`."

3. The agent runs the steps. The two Windows things it must do that differ from macOS: **start the
   daemon by hand** (no Windows service in this phase — it leaves a terminal window open) and, if
   wiring Claude Code throws a spawn error, **run one `claude mcp add` command manually** (the
   runbook spells both out — Step 1 and Caveat W2).

## How you know it worked

Do a small piece of real work in Codex (edit + commit a file), then ask Claude Code to recall it
via its `search_memories` / `find_clusters` tools — and the reverse. **That cross-tool recall,
with nothing hand-staged, is the whole point.**

Questions or anything breaks: send me the terminal output and I'll jump in.
