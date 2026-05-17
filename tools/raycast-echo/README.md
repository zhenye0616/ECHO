# ECHO Context Raycast Extension

## Install

1. `cd tools/raycast-echo && npm install && npx ray develop`
2. In Raycast, bind a hotkey via Preferences -> Extensions -> ECHO Context -> Search ECHO Context -> Hotkey. Suggested binding: Cmd+Shift+E.

## Hotkey Binding

The extension is a local dogfooding tool, not a Raycast Store package. It registers one command, Search ECHO Context, and relies on Raycast for the hotkey and window chrome.

## Dogfooding (v0 contract)

> Every invocation of ⌘⇧E should be logged to `raw/internal/dogfooding/mcp-interactions-journal.md` using the 7-field template (Trigger / Query inputs / Returned / Sources / **Repo** / Verdict / Note). The **Repo** field (R2 claude F2 — LOW) captures the active repo at hotkey-fire time — typically the frontmost Cursor/VS Code/terminal repo root, or `none` if invoked from a non-repo context. This disambiguates "wrong retrieval" verdicts that are actually "wrong repo scope" — feeds AC8/AC9 below with cleaner V1-spec inputs. The v0 is "done" when the journal contains ≥10 entries across ≥3 calendar days AND the founder can articulate the top-3 retrieval-quality issues to fix in V1. AC8/AC9 below are the gate.

This is not a multi-user installable. Do not publish it to the Raycast Store. Do not add Sentry, analytics, telemetry, or other phone-home behavior.
