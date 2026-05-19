---
id: 2026-05-18-062-ask-echo-raycast-llm-qa
title: Ask ECHO — Raycast Q&A command backed by a vendor-agnostic headless agent (codex / claude / custom) consuming ECHO MCP
status: ready
priority: MED
estimate: 1-2d
created: 2026-05-18
blocked_by: []
task_state_ref: 2026-05-18-062-ask-echo-raycast-llm-qa
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - tools/raycast-echo/package.json  # AC1 — add second command `ask-context` (title "Ask ECHO"), add `preferences` section with agentKind dropdown + customCommand + repoPath; bump version
  - tools/raycast-echo/src/ask-context.tsx  # AC2 + AC3 — new command entry point: Form (question textarea) → Detail (streaming markdown answer + Detail.Metadata sidebar populated from daemon audit endpoint); cancellation via tree-kill on view dismount
  - tools/raycast-echo/src/lib/agent-profiles.ts  # AC1 — profile registry: known-good defaults for codex and claude, custom path with {question} substitution and shell-arg split; pure function from (kind, prefs, repoPath, prompt) → { binary, args, stdin }
  - tools/raycast-echo/src/lib/agent-runner.ts  # AC2 + AC4 — spawn subprocess via child_process.spawn, stream stdout chunks via async iterator, capture stderr tail, cancellation kills subprocess tree (use `tree-kill` or equivalent npm dep)
  - tools/raycast-echo/src/lib/audit.ts  # AC3 — fetcher for GET http://127.0.0.1:38479/mcp/recent-calls?since=<ts>; returns typed array; surfaces "audit unavailable" on error without blocking answer pane
  - tools/raycast-echo/src/lib/system-prompt.ts  # AC1 — exports the single-shot system prompt string; pinned content (changing it should require an explicit edit + snapshot test refresh)
  - tools/raycast-echo/test/agent-profiles.test.ts  # AC6 — vitest, pure Node; assertions for codex profile shape, claude profile shape, custom-template substitution, custom shell-arg split correctness, repoPath substitution
  - tools/raycast-echo/test/system-prompt.test.ts  # AC6 — vitest snapshot test on the system prompt body; intentionally fragile to prevent accidental edits
  - tools/raycast-echo/README.md  # AC7 — add "Ask ECHO" section: install assumptions (codex and/or claude on PATH), preferences walkthrough, dogfooding template adapted for ⌘⇧A (Trigger / Query inputs incl. agent kind / Returned incl. tool-call count / Sources from sidebar / Verdict / Note)
  - src/mcp/server.ts  # AC5 — register new HTTP route `GET /mcp/recent-calls`; loopback-only; reads from the daemon's in-process MCP request log (or, per R3, adds the ring buffer if missing); response is `{ calls: [{ ts, tool, args_summary, result_summary, duration_ms }] }`
  - src/mcp/request-log.ts  # AC5 (conditional per R3) — new in-memory ring buffer (cap ~1000) of recent MCP requests; wired from the existing tool-dispatch path; pure module, no external deps
  - docs/BACKLOG.md  # add Ready-table row pointing at this item
spec_refs:
  - tools/raycast-echo/src/search-context.tsx  # sibling command; preserves the existing UI/UX conventions (APP_META palette, toast patterns); Ask ECHO does NOT modify this file — purely additive
  - tools/raycast-echo/src/lib/mcp.ts  # existing MCP client wrapper — Ask ECHO does NOT call MCP directly; it spawns an agent which calls MCP. mcp.ts is only consulted as a reference pattern.
  - tools/raycast-echo/package.json  # existing manifest — AC1 extends it (new command + preferences) without renaming or removing the existing command
  - src/mcp/server.ts  # daemon's existing StreamableHTTPServerTransport at http://127.0.0.1:38478/mcp; AC5 adds a sibling HTTP route on the same listener (NOT the MCP JSON-RPC endpoint)
  - wiki/surfaces/hotkey-overlay.md  # planned V1 surface; Ask ECHO is a v0 EXPERIMENT in the LLM-mediated retrieval shape, not the V1; the V1 spec is still gated on journal entries from item 060 + this item
  - wiki/surfaces/mcp-server.md  # the substrate this depends on; all four tools the agent uses (`find_clusters`, `search_memories`, `get_atoms`, `get_atom`) are existing and unchanged
  - wiki/principles/felt-not-seen.md  # Raycast's chrome compromise applies here too — v0 lives inside Raycast's frame; V1 may revisit
  - wiki/principles/compose-not-capture.md  # the architectural commitment Ask ECHO honors: no new capture, no new MCP tools, no daemon-side LLM logic — borrow an existing agent binary that already speaks MCP
  - wiki/principles/context-as-moat.md  # "never ship a chat UI" — Ask ECHO is single-shot Q&A, NOT a chat product; the AC9 founder-gate enforces this
  - wiki/principles/drift-prevention.md  # Pattern 5 ("Users could chat with ECHO about their week") is the trap this item walks near; the single-shot constraint + the dogfooding-only framing is the structural defense
  - wiki/product/v1-spec.md  # V1 scope locked 2026-04-30; this item is NOT a V1 commitment — it's a dogfooding tool to inform V1
  - raw/internal/dogfooding/mcp-interactions-journal.md  # journaling sink; AC9's ≥5 entries / ≥2 days bar references this file
  - https://developers.raycast.com/api-reference/user-interface/form  # external; Form component docs
  - https://developers.raycast.com/api-reference/user-interface/detail  # external; Detail + Detail.Metadata docs (key for the sidebar)
  - https://developers.raycast.com/api-reference/preferences  # external; per-extension preferences API for the agentKind dropdown + customCommand textfield

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
review_notes: |
agent_notes: |
---

## Summary

Add a second Raycast command, **Ask ECHO** (suggested binding ⌘⇧A), that turns a typed question into a streaming Q&A view. The founder submits a question in a Form, then the extension spawns a headless agent subprocess (codex / claude / configurable) with a short system prompt + the question on stdin. The agent runs its own tool-use loop against ECHO's existing MCP server. Stdout streams into a Raycast `Detail` view as markdown; on exit, a sidebar (`Detail.Metadata`) populates from a new daemon introspection endpoint that returns the real MCP calls the agent made during the run.

**Architectural posture:** ECHO does NOT host the LLM loop. The agent binary (codex / claude / a custom CLI) owns provider auth, streaming, retries, and tool-use. ECHO's contribution is (a) the MCP tools the agent calls, (b) the daemon's audit endpoint that exposes what was called, (c) the Raycast UI that summons the agent and renders the result. This is the structural payoff of ECHO's "AI clients consume ECHO MCP as peers" thesis — we borrow agents that already do this, instead of rebuilding the loop.

**Vendor-agnosticism** lives at the agent-profile registry, not at an LLM SDK layer. A dropdown selects `codex` (default), `claude`, or `custom`; the custom path exposes a command-template textbox so any CLI that takes a prompt on stdin and emits stdout can be plugged in. Adding a third agent is a profile entry, not new TypeScript.

**Single-shot, by design.** Codex's strategist consult explicitly flagged the failure mode: "treating this as a persistent ECHO chat product." The Q&A is one question → one answer → close. No threading, no history, no follow-ups. The structural enforcement is OoS items 1–3 + the AC9 founder-gate.

## Why now

- Item 060 (v0 hotkey overlay, Raycast `search-context` command) shipped on 2026-05-17. It exposed clusters/atoms as a grid; the founder asked "can we wire an LLM so this is more like Q&A?" on 2026-05-18.
- The friction-first prioritization rule (memory `project_friction_first_prioritization.md`) is satisfied: this is a retrieval-debugging surface, not new architecture; it dogfoods two existing protocol commitments (MCP-as-substrate + vendor-neutral consultee pattern) simultaneously.
- The substrate-is-scaffolding stance (memory `project_substrate_is_scaffolding_not_product.md`) is respected: this item ships a *dogfooding tool* for retrieval-quality debugging, not a V1 product surface. The V1 spec for any LLM-mediated retrieval UI is deferred pending journal entries from this item + 060.

## Out of Scope (Don't Drift)

1. **Multi-turn / threaded / follow-up conversation.** Single-shot Q&A only. If the founder wants to ask a follow-up, they invoke ⌘⇧A again. Threading is a V1+ design question; introducing it in v0 collapses this into "another chat product" (the explicit `context-as-moat` violation).
2. **Persistent question history across sessions.** Raycast remembers nothing across invocations.
3. **Multiple concurrent Q&A windows.** One Detail view at a time per the Raycast view-mode lifecycle. No multiplexing.
4. **CLI / browser-tab / native-app Q&A surfaces.** Each is a future spec if dogfooding shows demand.
5. **Daemon-side synthesis / summarization endpoints.** The agent is the LLM. The daemon stays a pure retrieval substrate.
6. **Model-authored sidebar.** The `Detail.Metadata` sidebar comes from `/mcp/recent-calls` (daemon truth), NOT from parsing the agent's stdout for "I called searchMemories." Models hallucinate tool calls; this defends against that.
7. **Auto-detect repo scoping from the frontmost app.** Repo path is a Raycast preference; defaults to `~/Desktop/Project_echo`. Frontmost-app detection is V1-overlay territory.
8. **Telemetry, error reporting, analytics.** Single-user dogfooding tool.
9. **Raycast Store submission, multi-user installer.** Continues `ray develop` only, per item 060's posture.
10. **Per-agent capability detection.** We assume codex and claude both stream stdout, support stdin prompts, and have MCP tools wired in their respective configs (the founder's machine already meets these conditions per recent operating-model state).
11. **Modifying the existing `search-context` command.** Ask ECHO is additive. Touching `search-context.tsx` is out of scope.
12. **New ECHO MCP tools.** The agent uses the existing four (`search_memories`, `find_clusters`, `get_atoms`, `get_atom`). If the builder thinks a fifth is needed for v0, stop and re-read this OoS item.
13. **Bundling / installing the agent binary.** Founder installs codex and/or claude themselves; the extension assumes their presence on PATH. If the configured binary is missing, AC4's toast handles it.
14. **Wiki page creation.** No `wiki/surfaces/ask-echo.md`. Per CLAUDE.md, wiki updates wait for post-V1 shipment. The V1 spec for this surface is deferred to a future backlog item informed by AC9's journal entries.

## Risks

- **R1 — `codex exec` cold-start latency.** Several seconds before any stdout. Detail will show `isLoading=true` blank state during this window. Acceptable v0 risk; log as journal observation if it feels broken; V1 may consider a long-running daemonized agent process.
- **R2 — Stdout pipe buffering.** Some CLIs line-buffer to a TTY but block-buffer to pipes, making "streaming" appear chunky or all-at-once. Each profile may need a workaround (`unbuffer`, `script -q`, env var like `PYTHONUNBUFFERED`). Builder detects during manual integration; if needed, codifies the workaround in the profile definition. If neither agent has a clean fix, document the constraint in README rather than block.
- **R3 — Daemon may not have an in-process MCP request log today.** Builder spike (15 min): grep `src/mcp/server.ts` and the tool-dispatch path for any existing log/buffer. If present and addressable, just add the HTTP route. If absent, add the ring buffer (~30 LoC, in `src/mcp/request-log.ts`) wired from the existing tool-dispatch site.
- **R4 — `/mcp/recent-calls` lacks per-caller attribution.** Filtering by `since=<launch_ts>` is best-effort; if a background process (e.g., a Codex review-queue tick) also fires during the Ask-ECHO window, its calls will show up in the sidebar. Single-user dogfooding posture accepts this; the journal-entry "Sources" field can note the ambiguity if it bites.
- **R5 — Custom profile is a shell-injection foot-gun.** The `customCommand` textbox accepts arbitrary text. Single-user dogfooding tool, not in threat model. README will note the constraint.
- **R6 — System prompt drift across agents.** Codex tends to terse; Claude tends to verbose; the same prompt produces different shapes. Acceptable — vendor-agnosticism explicitly lets founder pick which behavior they want. The snapshot test on `system-prompt.ts` prevents accidental edits; it does NOT try to normalize across agents.
- **R7 — Founder forgets to journal Ask-ECHO invocations.** AC9's gate is journal-discipline-dependent. The ⌘J "Copy journal entry template" action is the structural reminder. If the founder still forgets, AC9 can't fire, and we wait. Same posture as item 060's AC8.

## Tests

- **`tools/raycast-echo/test/agent-profiles.test.ts`** (Vitest, pure Node): cases for (a) codex profile produces `binary="codex"`, args contain `exec`, `--sandbox`, `read-only`, `-`; (b) claude profile produces `binary="claude"`; (c) custom template substitutes `{question}` correctly; (d) custom template with quoted args splits via shell-style (not naive whitespace); (e) `repoPath` substitution into the `-C` slot for codex; (f) absent agent kind defaults to `codex`.
- **`tools/raycast-echo/test/system-prompt.test.ts`** (Vitest, pure Node): snapshot of the prompt body; assertion that the prompt names all four MCP tool names verbatim; assertion of the single-shot / no-clarifying-questions constraint string.
- **No new daemon-side unit tests.** The `/mcp/recent-calls` endpoint is small enough to verify with `curl http://127.0.0.1:38479/mcp/recent-calls?since=0 | jq` against a running daemon; the existing `tools/mcp-integration-smoke.sh` may grow an optional case once the endpoint exists, but it is not blocking for this item.
- **Manual integration (builder-verified before pending_review):** for each of the two known profiles, fire ⌘⇧A with a real question (e.g. "what did I work on yesterday morning?"), confirm (1) the answer streams, (2) the sidebar populates with at least one real MCP call, (3) cancellation kills the subprocess (`ps -ef | grep <binary>` shows no leak), (4) restart of daemon mid-run produces the documented error path.

## Definition of Done

- **AC1** — extension manifest registers a second command `ask-context` (title "Ask ECHO") with preferences `agentKind` (dropdown: codex | claude | custom), `customCommand` (textfield, visible only for custom), `repoPath` (textfield, default `~/Desktop/Project_echo`).
- **AC2** — Form view accepts a multi-line question; submit pushes a Detail view; subprocess spawns with the active profile's resolved `(binary, args, stdin)`.
- **AC3** — agent stdout streams to the Detail markdown state during the run; on subprocess exit, Detail.Metadata sidebar populates from `GET /mcp/recent-calls?since=<launch_ts>` with one row per MCP call (tool name, args summary, duration).
- **AC4** — error paths handled per Part 2 of the spec: binary missing → toast + preferences action; daemon unreachable → toast; agent non-zero exit → answer-so-far + inline error footer; user cancels (⌘W / escape) → subprocess tree-killed, partial answer + "Cancelled." footer; `/mcp/recent-calls` failure → sidebar shows "Audit unavailable" without blocking the answer.
- **AC5** — daemon exposes `GET /mcp/recent-calls?since=<unix_ms>[&until=<unix_ms>]` on its existing HTTP listener, loopback-only, returning `{ calls: Array<{ ts, tool, args_summary, result_summary, duration_ms }> }`. If the in-process MCP request log does not exist, the builder adds the ring-buffer module per R3.
- **AC6** — `agent-profiles.test.ts` + `system-prompt.test.ts` pass via `npx vitest run` from `tools/raycast-echo`.
- **AC7** — README documents (a) Ask ECHO install assumption (codex / claude on PATH), (b) preferences walkthrough, (c) dogfooding template adapted for ⌘⇧A (the 6-field cross-tool template, with Query inputs noting agent kind, Returned noting tool-call count, Sources copied from the sidebar).
- **AC8** — `npx tsc --noEmit` + `npx ray build` clean from `tools/raycast-echo`; root `tsc` still clean (extension is excluded by item 060's tsconfig fix; this item must not regress that).
- **AC9 (post-merge, founder-gated)** — ≥5 Ask-ECHO journal entries across ≥2 calendar days, with at least one ✅ and at least one 🟡 or ❌ recorded, BEFORE any V1 spec on this surface is written. This gate is identical in spirit to item 060's AC8.

## After Completion (Strategist Notes)

- **No wiki update on v0 ship.** Same posture as item 060 — V0 surfaces empirical signal; V1 spec is written from journal entries; wiki page is written when V1 ships. `wiki/surfaces/hotkey-overlay.md` (if it eventually covers Ask ECHO) stays `status: planned`.
- **The dogfooding journal is the V1 spec input.** After AC9 fires, the strategist reads the entries, distills "which retrieval failure modes did the LLM expose that the grid did not?", and writes a fresh V1 backlog item.
- **Update the dogfooding journal post-merge** with a "Ask ECHO ⌘⇧A shipped" entry containing the binding command, a reminder of the 6-field template adapted for this command, and the note that the **Sources** field for this command should be copied from the sidebar (not invented).
- **If dogfooding goes badly** (founder doesn't use it, journal stays empty after 3 days): write a strategist conversation note in `raw/internal/decisions/` analyzing why — wrong agent (codex too slow? claude too verbose?), wrong system prompt, wrong UI (Form-then-Detail too clicky?), wrong hypothesis (retrieval-debugging-by-LLM isn't actually useful?). Then either iterate v0 with a follow-on item or kill the surface.
- **The Codex consultation on 2026-05-18** (response captured in this brainstorm) flagged two structural risks worth restating: (a) the sidebar must not be model-authored — enforced by AC3 + OoS#6, (b) vendor-agnosticism's real boundary is the agent event loop, not the model router — this spec sidesteps that risk entirely by NOT owning the event loop. Codex's own preferred architecture (Vercel AI SDK behind an internal `AnswerRunner`) is the correct V1+ answer if/when the project decides to take ownership of the loop; for v0 the borrowed-agent shape is the strategically lighter move.
- **Cross-tool dogfooding payoff.** This item is itself a dogfooding artifact of the cross-tool protocol — every successful Ask-ECHO invocation is one more data point for "AI clients consume ECHO MCP as peers, no special-casing per vendor." Logging that explicitly in the journal makes the artifact double-duty.

