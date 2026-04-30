# Claude Code Setup for the ECHO Builder Agent

How to wire Claude Code to run as the autonomous builder agent on a routine schedule.

## What You Need

- Claude Code installed and authenticated
- This repo (`Project_echo/`) opened in Claude Code at least once
- A scheduling mechanism (Claude Code's built-in scheduled tasks, or system cron/launchd)
- Git initialized in the repo (recommended; see "Git Setup" below)

## The Slash Command

The repo ships with `/process-backlog` already defined in `.claude/commands/process-backlog.md`. That's the entry point — running it executes the full builder agent loop on the next ready item.

To invoke manually inside Claude Code:

```
/process-backlog
```

The command will:
1. Read `docs/AGENT_INSTRUCTIONS.md`
2. Pick the next ready item (HIGH priority, oldest first)
3. Run through the implementation loop
4. Stop after exactly one item

## Scheduling Options

### Option 1: Claude Code Scheduled Tasks (recommended if available)

If your Claude Code build includes the scheduled-tasks plugin, use it directly:

```
/schedule create "Process next backlog item" --interval 6h --command "/process-backlog"
```

This runs `/process-backlog` every 6 hours. Each run picks one item and stops. Adjust interval based on how fast you want the queue to drain (overnight-only = run once at 2 AM; aggressive = every 4 hours during work hours).

### Option 2: System Cron (macOS / Linux)

If Claude Code's scheduled tasks aren't available or you want more control, use cron:

```bash
# Edit crontab
crontab -e

# Run /process-backlog every night at 2 AM
0 2 * * * cd ~/Desktop/Project_echo && claude --command "/process-backlog" --non-interactive >> .claude/logs/agent.log 2>&1
```

Adjust the path and timing to your needs. Make sure Claude Code is in your PATH.

### Option 3: launchd (macOS-native, more reliable than cron)

Create `~/Library/LaunchAgents/com.echo.agent.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.echo.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd ~/Desktop/Project_echo && claude --command "/process-backlog" --non-interactive</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/echo-agent.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/echo-agent.error.log</string>
</dict>
</plist>
```

Load it:

```bash
launchctl load ~/Library/LaunchAgents/com.echo.agent.plist
```

### Option 4: Manual Trigger Only (start here)

For the first week, recommend running `/process-backlog` manually a few times to validate the loop before scheduling. This catches setup issues without waking up to a broken overnight run.

## Recommended Schedule

For V1 build (10 weeks):

- **Week 1:** Manual triggers only. Run `/process-backlog` ~3x in the first few days. Watch the agent's behavior. Refine `docs/AGENT_INSTRUCTIONS.md` and the slash command if needed.
- **Week 2+:** Schedule for overnight runs. One run at 2 AM is enough for one item per day; the founder reviews in the morning.
- **Week 6+:** If the founder's morning review is fast, scale up to two runs (e.g., 11 PM and 4 AM) so two items land in `needs_review/` per morning.

Don't go faster than one item per ~6 hours. Faster cadence means less founder time per review, which means missed drift.

## Permissions Setup

`.claude/settings.json` (also in this repo) ships with a permission allowlist. Adjust based on your stack — the defaults assume git, npm, cargo, pytest. The deny list specifically blocks `git push` (founder-only), recursive deletes, and external network calls.

## Git Setup (Recommended)

Initialize the repo:

```bash
cd ~/Desktop/Project_echo
git init
git add -A
git commit -m "Initial commit: V1 spec + skeleton"
```

Then update `.claude/commands/process-backlog.md` (already references `git mv`) and add a convention:

- Each agent run commits locally with message: `agent: <item-id> — <title>`
- Founder reviews via `git diff HEAD~1` before approving
- Founder pushes to remote only after approval

## Founder Morning Review Workflow

Each morning:

1. Open the repo
2. `git log --oneline -10` to see what the agent did overnight
3. Open `docs/BACKLOG.md` — see items in `needs_review/`
4. For each item:
   - Open the item file → read `agent_notes`
   - Open the corresponding `raw/internal/agent-runs/` log
   - `git show <commit>` to inspect the diff
   - Run tests yourself if you don't trust the agent's output
5. Decide:
   - **Approve** → fill `review_notes` in item, `git mv` to `backlog/done/`, push to remote
   - **Rework** → fill `review_notes` with what's wrong, `git mv` back to `backlog/ready/`, optionally `git revert` the agent's commit
   - **Cancel** → fill `review_notes`, `git mv` to `done/` with note explaining cancellation

Time budget: ~30 minutes if 1–2 items came through overnight.

## Troubleshooting

**Agent keeps stopping with the same question** → spec is unclear; update the item body in `backlog/ready/` and the relevant `wiki/` page

**Agent shipped something that violates the V1 spec** → drift event happened. Read `raw/internal/decisions/<date>-DRIFT-*.md` if logged. Revert. Add the missed pattern to `docs/AGENT_INSTRUCTIONS.md` Drift-Prevention Rules.

**Agent didn't run at scheduled time** → check `.claude/logs/agent.log` (cron) or `/tmp/echo-agent.log` (launchd). Common cause: Claude Code auth expired.

**Tests are passing locally but not for the agent** → environment difference. Make sure the test command in acceptance criteria is the exact one the agent runs.

## Open Questions to Resolve Before First Scheduled Run

1. **What language / stack?** The first backlog item (`backlog/ready/2026-04-30-001-storage-architecture.md`) doesn't pick one. The agent will likely escalate. Decide before scheduling: probably Rust (matches AIE patterns) or TypeScript/Node (matches extension stack).
2. **What test framework?** Pick before the agent picks for you.
3. **Branch convention?** Suggest: agent commits to `main` directly; founder reviews via diff. Branches add overhead without much benefit at solo-founder scale.
4. **Git remote?** Set up GitHub repo (private) so you have a backup + can review on a different device.
