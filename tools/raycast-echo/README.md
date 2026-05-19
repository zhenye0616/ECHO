# ECHO Context Raycast Extension

## Install

1. `cd tools/raycast-echo && npm install && npx ray develop`
2. In Raycast, bind a hotkey via Preferences -> Extensions -> ECHO Context.
   Suggested binding: ECHO -> Cmd+Shift+E.

## Hotkey Binding

The extension is a local dogfooding tool, not a Raycast Store package. It registers a single command, `ECHO`, and relies on Raycast for the hotkey and window chrome.

## ECHO (unified omnibox)

`ECHO` is a single Raycast command that fuses search and Q&A into one omnibox surface. Implements "Direction C — sticky launch footer" from the 2026-05-19 design handoff.

- **Empty input** → Open loops · Today · Recent asks (last 3, persisted via `LocalStorage`).
- **Typing** → synthetic *Ask ECHO about "<query>"* row at top + matching clusters + matching atoms beneath.
- **Ask answer** → streamed agent output (capped to 3-6 bullets via `buildUnifiedAskPrompt`) + Top recent clusters + a launch row in the `ActionPanel` (↩ autopastes into the frontmost AI tool, ⌘1 / ⌘2 send to the other two, ⌘⇧C copies the context packet).
- **Cluster inspect** → cluster detail + "Ask about this" bridge action.

The product rule is enforced structurally: ECHO assembles a context packet, then hands off to your real AI tool (Cursor / Claude / ChatGPT). ECHO never finishes the work — your AI tool does.

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
**Returned shape:** tool_call_count=<count>; answer_bullets=<count>; launched_to=<cursor|claude_web|claude_app|chatgpt|copy|cancelled>
**Sources:** <copy the audit-sidebar rows, e.g. search_memories · 42ms · ok>
**Verdict:** <right|partial|wrong>
**Note:**
**Conjecture:**
```

## Dogfooding (v0 contract)

> Every invocation of ⌘⇧E should be logged to `raw/internal/dogfooding/mcp-interactions-journal-YYYY-MM.md` (currently `mcp-interactions-journal-2026-05.md`) using the template above. The v0 is "done" when the journal contains ≥10 entries across ≥3 calendar days AND the founder can articulate the top-3 retrieval-quality + launch-completion issues to fix in V1.

This is not a multi-user installable. Do not publish it to the Raycast Store. Do not add Sentry, analytics, telemetry, or other phone-home behavior.
