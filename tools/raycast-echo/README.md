# ECHO Context Raycast Extension

## Install

1. `cd tools/raycast-echo && npm install && npx ray develop`
2. In Raycast, bind a hotkey via Preferences -> Extensions -> ECHO Context.
   Suggested binding: ECHO -> Cmd+Shift+E.

## Hotkey Binding

The extension is a local dogfooding tool, not a Raycast Store package. It registers a small command set and relies on Raycast for the hotkey and window chrome.

## ECHO (sessions as objects)

`ECHO` is a single Raycast command with one object model: every ask becomes a durable session. Search results and open loops still appear in the omnibox, but answers now persist as inspectable packets with an audit timeline and launch actions.

- **Empty** -> Resume latest session, Open loops · Today, Today's sessions, Yesterday, This week.
- **Typing** -> synthetic *Ask ECHO about "<query>"* row at top, followed by matching clusters and atoms.
- **Live** -> streamed agent output plus per-call audit detail from `/mcp/recent-calls`.
- **Session detail** -> full answer, audit timeline, log path, evidence summary, and launch actions for Cursor / Claude.ai / ChatGPT / copy.
- **Sessions browse** -> Cmd+S opens all sessions grouped by Today / Yesterday / This week / Older, filterable by agent kind.

Sessions are packets, not chat threads. Cmd+R **Ask again from this** forks a new ask from the selected session's question and answer; it does not append a turn to the original session or create a row until the forked ask is submitted.

Preferences:

- **Agent:** `codex`, `claude`, or `custom`. The `codex` and `claude` binaries must already be on `PATH`, with your MCP config wiring ECHO into each agent.
- **Custom Command:** used only when Agent is `custom`. Supports `{question}` and `{repoPath}` placeholders. Without `{question}`, the prompt is written to stdin.
- **Repository Path:** defaults to `~/Desktop/Project_echo`; passed to the agent profile as its working repo context.
- **Claude OAuth Token:** used only when Agent is `claude`. Generate via `claude setup-token` in a Terminal. Lets Raycast's spawned subprocess reuse your subscription without prompting for `/login` (Raycast cannot access the Keychain item Terminal uses).

If a Raycast crash leaves an agent subprocess running, clean it up from a terminal with `ps -ef | grep '<binary>'`, then `kill <pid>`; for a broad one-off cleanup use `pkill -f '<binary>'`.

ECHO dogfooding journal template:

```markdown
**Surface:** ECHO
**Trigger:**
**Tool and query inputs:** agent=<codex|claude|custom>; query=<summary or length>; primary=<cursor|claude_app|chatgpt|none>; repo_path_present=<true|false>
**Returned shape:** session_id=<id>; status=<running|done|cancelled|errored>; tool_call_count=<count>; answer_bullets=<count>; launched_to=<cursor|claude_web|claude_app|chatgpt|copy|cancelled>
**Sources:** <copy the Session Detail audit rows>
**Verdict:** <right|partial|wrong>
**Note:**
**Conjecture:**
```

## Recap

`Recap` is a second command in the same extension. It produces one ephemeral A/B/D project recap by spawning the selected local agent over existing artifacts: review `combined.md`, task-state pointers, agent-run logs, git history, the dogfooding journal, and best-effort MCP clusters. It does not write a session row, does not add follow-up turns, and does not change the ECHO command.

Install assumptions match ECHO: `codex`, `claude`, or your custom agent command must already be on `PATH`, and that agent must already be configured to use the local ECHO MCP server when it chooses the MCP fallback.

Recap preferences are command-scoped. Raycast does not copy the ECHO command's saved values into Recap, so configure Recap explicitly on first run:

1. Search Raycast for `Recap`, then open the command preferences.
2. Set **Agent**, **Custom Command** if Agent is custom, **Repository Path**, and **Claude OAuth Token** if Agent is Claude.
3. Set **Default Recap Window** to `Since last session`, `Last 24 hours`, or `Last 4 hours`.
4. Run `Recap` after the Recap preference panel shows the intended values.

Output shape:

- `## A - Code changed`
- `## B - Decisions`
- `## D - Direction`
- `## Sources`

The answer is capped to a compact recap, roughly 500 words. If the daemon is down, Recap still runs from file and git evidence; verify this path by stopping the daemon and confirming A/B/D still renders. The audit sidebar may show `Audit unavailable` in that mode.

Recap dogfooding journal template:

```markdown
**Surface:** Recap
**Trigger:**
**Repo:** <absolute repo path>
**Tool and query inputs:** agent=<codex|claude|custom>; since=<ISO>; source=<user|last_session|window_24h|window_4h|fallback_24h>; daemon=<up|down|unknown>
**Returned shape:** status=<done|cancelled|errored|empty>; sections=<A/B/D/Sources present?>; words=<approx>
**Sources:** <copy the Recap Sources section and any audit rows>
**Verdict:** <right|partial|wrong>
**Note:**
**Conjecture:**
```

## Decisions

`Decisions` is a read-only board of DecisionCards for the configured repo. A DecisionCard is a current delegated-work decision that needs the founder's attention, projected from the daemon `pending_decisions` MCP tool. The first source adapter reads ECHO's own review queue artifacts (`combined.md` plus active backlog stage), while the card type stays playbook-agnostic.

The command uses SEE+JUMP only. Rows show the decision, why it is pending now, source freshness warnings, and A1 runaway-churn signals when a review has churned several rounds without a founder touch. Actions only open the underlying review round, combined review, or backlog item; the board does not write under `backlog/`.

Decisions preferences are command-scoped. Set **Repository Path** to the repo whose active backlog should feed cards; the default is `~/Desktop/Project_echo`.

Decisions dogfooding journal template:

```markdown
**Surface:** Decisions
**Trigger:**
**Repo:** <absolute repo path>
**Tool and query inputs:** pending_decisions(repo_path=<path>)
**Returned shape:** cards=<count>; signals=<count>; source_state.behind=<n>; upstream_stale=<true|false>; dirty=<true|false>; partial=<true|false>
**Sources:** <source_breakdown and card source labels/paths>
**Verdict:** <right|partial|wrong>
**Note:**
**Conjecture:**
```

## Dogfooding (v0 contract)

> Every invocation of ⌘⇧E should be logged to `raw/internal/dogfooding/mcp-interactions-journal-YYYY-MM.md` (currently `mcp-interactions-journal-2026-05.md`) using the template above. This session model is "done" when the journal contains ≥10 entries across ≥3 calendar days, covers the four original pains, and includes explicit notes on audit-window contamination and overlapping-session durability.

This is not a multi-user installable. Do not publish it to the Raycast Store. Do not add Sentry, analytics, telemetry, or other phone-home behavior.
