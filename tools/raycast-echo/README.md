# ECHO Context Raycast Extension

## Install

1. `cd tools/raycast-echo && npm install && npx ray develop`
2. In Raycast, bind a hotkey via Preferences -> Extensions -> ECHO Context.
   Suggested binding: ECHO -> Cmd+Shift+E.

## Hotkey Binding

The extension is a local dogfooding tool, not a Raycast Store package. It registers a single command, `ECHO`, and relies on Raycast for the hotkey and window chrome.

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

## Dogfooding (v0 contract)

> Every invocation of ⌘⇧E should be logged to `raw/internal/dogfooding/mcp-interactions-journal-YYYY-MM.md` (currently `mcp-interactions-journal-2026-05.md`) using the template above. This session model is "done" when the journal contains ≥10 entries across ≥3 calendar days, covers the four original pains, and includes explicit notes on audit-window contamination and overlapping-session durability.

This is not a multi-user installable. Do not publish it to the Raycast Store. Do not add Sentry, analytics, telemetry, or other phone-home behavior.
