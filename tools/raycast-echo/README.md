# ECHO Context Raycast Extension

## Install

1. `cd tools/raycast-echo && npm install && npx ray develop`
2. In Raycast, bind hotkeys via Preferences -> Extensions -> ECHO Context.
   Suggested bindings: Search ECHO Context -> Cmd+Shift+E; Ask ECHO -> Cmd+Shift+A.

## Hotkey Binding

The extension is a local dogfooding tool, not a Raycast Store package. It registers Search ECHO Context and Ask ECHO, and relies on Raycast for the hotkey and window chrome.

## Ask ECHO

Ask ECHO is a single-shot Q&A command. It opens a Form for one question, then streams the answer from a configured local agent into a Detail view. The extension does not store questions, answers, transcripts, or follow-up state; to vary the question, cancel and re-fire the command.

Preferences:

- Agent: `codex`, `claude`, or `custom`. The `codex` and `claude` binaries must already be on `PATH`, with the founder's MCP config wiring ECHO into each agent.
- Custom Command: used only when Agent is `custom`. Supports `{question}` and `{repoPath}` placeholders. Without `{question}`, the prompt is written to stdin.
- Repository Path: defaults to `~/Desktop/Project_echo`; passed to the agent profile as its working repo context.

If a Raycast crash leaves an agent running, clean it up from a terminal with `ps -ef | grep '<binary>'`, then `kill <pid>`; for a broad one-off cleanup use `pkill -f '<binary>'`.

Ask ECHO dogfooding journal template:

```markdown
**Surface:** Ask ECHO
**Trigger:**
**Tool and query inputs:** agent=<codex|claude|custom>; question=<summary or length>; repo_path_present=<true|false>
**Returned shape:** tool_call_count=<count>; answer_streamed=<yes|no>
**Sources:** <copy the sidebar rows, e.g. search_memories · 42ms · ok>
**Verdict:** <right|partial|wrong>
**Note:**
**Conjecture:**
```

## Dogfooding (v0 contract)

> Every invocation of ⌘⇧E should be logged to `raw/internal/dogfooding/mcp-interactions-journal.md` using the 7-field template (Trigger / Query inputs / Returned / Sources / **Repo** / Verdict / Note). The **Repo** field (R2 claude F2 — LOW) captures the active repo at hotkey-fire time — typically the frontmost Cursor/VS Code/terminal repo root, or `none` if invoked from a non-repo context. This disambiguates "wrong retrieval" verdicts that are actually "wrong repo scope" — feeds AC8/AC9 below with cleaner V1-spec inputs. The v0 is "done" when the journal contains ≥10 entries across ≥3 calendar days AND the founder can articulate the top-3 retrieval-quality issues to fix in V1. AC8/AC9 below are the gate.

This is not a multi-user installable. Do not publish it to the Raycast Store. Do not add Sentry, analytics, telemetry, or other phone-home behavior.
