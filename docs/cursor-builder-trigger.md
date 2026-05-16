# Cursor builder trigger

Operator-facing recipe for invoking the **Cursor's Claude** builder binding. Sibling shape to `docs/review-queue-setup.md` (reviewer triggers). The full protocol body lives in `skills/process-backlog.md`; the "Binding-specific notes — Cursor's Claude (IDE-mode)" section at the bottom of that file is the prose contract this doc operationalizes.

There is no headless wrapper for Cursor (no `codex exec`-equivalent today). The trigger is founder-paste-driven, same shape as the Cursor reviewer binding.

## Pre-flight

Verify all four before the founder pastes:

1. **ECHO daemon running.** Local MCP server reachable on its standard port.
2. **ECHO MCP registered in Cursor's MCP config** (typically `~/.cursor/mcp.json`). Inside the Cursor chat, `mcp__echo__echo_ping` must return OK before the builder claims; if it doesn't, abort and fix MCP registration first. Cursor's Claude is NOT a read-only consultee — it journals its own MCP calls in-the-moment per the standard `CLAUDE.md` discipline.
3. **`~/.echo/agent-id` file exists** OR Cursor's Claude is allowed to create it on first run. The protocol's Step 0 auto-generates the UUID if absent.
4. **No other active builder on this machine under the same `ECHO_AGENT_ID`.** Rule from the skill: at most **one active Cursor builder per ECHO_AGENT_ID** at a time. If a Claude Code or codex builder is mid-claim on the same machine under the default `~/.echo/agent-id` UUID, do not start a Cursor builder — they will silently attach to each other's claim. For genuinely parallel runs on the same machine, set distinct `ECHO_AGENT_ID=<uuid4>` env vars per chat.

## Step-by-step paste-trigger

1. Open Cursor IDE on the founder's `Project_echo` repo.
2. Open a fresh chat with Cursor's Claude — **no prior context** in the chat history. (Stale conversation state can short-circuit the mandatory reads in Step 1 of the protocol.)
3. Either paste the contents of `skills/process-backlog.md` into the chat, OR send the one-line instruction `Follow the protocol in skills/process-backlog.md`. Cursor's Claude reads `skills/` directly via its native file tools — no adapter copy is consulted from inside Cursor.
4. Observe the agent: it announces the persona ID it resolved, the item it is claiming (via `tools/blocked.py`), and the atomic-claim commit it pushes. From there, the worktree creation, implementation loop, and move-to-pending_review proceed exactly as documented in `skills/process-backlog.md`.

## What success looks like

The atomic-claim commit is visible on `origin/main`, and the moved spec file lists `claimed_by: <ECHO_AGENT_ID>`:

```bash
git fetch origin main
git show "origin/main:backlog/claimed/<id>.md" | head -20            # spec present in claimed/, claimed_by populated
git log origin/main --oneline --grep "claim: <id>"                   # matching commit exists
```

Do **not** rely on `git log --oneline -1 origin/main` to verify — `origin/main` can advance from a sibling reviewer or journal commit immediately after the claim, false-failing the tip-commit check.

Within a few seconds of the claim commit, `~/Desktop/Project_echo--<slug>/` exists as a sibling worktree on the `agent/<slug>` branch. Cursor's Claude proceeds from there until it reaches `pending_review/`.

## Failure modes the founder should look for

- **ECHO MCP unreachable from Cursor.** Cursor's Claude cannot journal; it aborts before claiming and emits a one-line note in the chat. Fix MCP registration, then retry.
- **Atomic-claim race lost** to another binding (Claude Code or codex builder on a different machine, or a same-machine binding with a distinct `ECHO_AGENT_ID`). Cursor's Claude reports the conflict, exits cleanly — no work lost; pick a different item by re-pasting, or wait for the race winner to finish.
- **Test or lint failures on the worktree.** Founder reads the run log under `raw/internal/agent-runs/` and decides whether to push to `pending_review/` with `agent_notes` framed as the BLOCKED escalation, or rework in-chat.

## What NOT to do

- **Do not open two Cursor chats claiming concurrently** under the same `ECHO_AGENT_ID` — they will silently attach to the same claim and race the worktree + `builder.md` writes. If a second chat is opened by mistake while the first is mid-claim, stop the second immediately; do not let it proceed past Step A.
- **Do not skip the journal discipline.** Every `mcp__echo__*` call from inside the Cursor chat must land in `raw/internal/dogfooding/mcp-interactions-journal.md` in-the-moment, with the 6-field template. The merge-time review depends on this.
- **Do not paste in-progress modifications to `skills/process-backlog.md`.** Paste only the version on `main` (run `git pull --rebase origin main` first if uncertain). Pasting a working-tree copy can silently introduce protocol drift.
