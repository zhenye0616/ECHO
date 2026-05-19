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
  - tools/raycast-echo/src/lib/audit.ts  # AC3 — fetcher for GET http://127.0.0.1:38478/mcp/recent-calls?since=<launch_ts>; returns typed array per AC5; surfaces "audit unavailable" on error without blocking answer pane. (Port is 38478, the daemon's MCP HTTP listener — NOT 38479, which is the trace viewer per item 060.)
  - tools/raycast-echo/src/lib/system-prompt.ts  # AC1 — exports the single-shot system prompt string; pinned content (changing it should require an explicit edit + snapshot test refresh)
  - tools/raycast-echo/test/agent-profiles.test.ts  # AC6 — vitest, pure Node; assertions for codex profile shape, claude profile shape, custom-template substitution, custom shell-arg split correctness, repoPath substitution
  - tools/raycast-echo/test/system-prompt.test.ts  # AC6 — vitest snapshot test on the system prompt body; intentionally fragile to prevent accidental edits
  - tools/raycast-echo/README.md  # AC7 — add "Ask ECHO" section: install assumptions (codex and/or claude on PATH), preferences walkthrough, dogfooding template adapted for ⌘⇧A (Trigger / Query inputs incl. agent kind / Returned incl. tool-call count / Sources from sidebar / Verdict / Note)
  - src/mcp/server.ts  # AC5 — (a) introduce a `registerTool(server, name, schema, handler)` wrapper that intercepts every tool call to record start/end/status/duration into the ring buffer below; (b) refactor existing per-tool `server.registerTool(...)` call sites (find_clusters, search_memories, get_atoms, get_atom, echo_ping, plus any others) to go through the wrapper; (c) add path dispatch for `GET /mcp/recent-calls` BEFORE the existing `methodNotAllowed` branch, preserving the POST `/mcp` JSON-RPC behavior verbatim; loopback-only inherited from existing bind. Confirmed 2026-05-18 by codex reviewer: no existing request log exists; this wrapper IS the new mechanism, not an exposure of existing state.
  - src/mcp/request-log.ts  # AC5 — REQUIRED (not conditional; codex reviewer confirmed no existing log). In-memory ring buffer (cap 1000) of recent MCP tool invocations. Pure module, no external deps. Records `{ ts, tool, args_shape, result_shape, duration_ms, status: "pending" | "ok" | "error" }`. Updated in-place when a tool call transitions pending → ok/error. Redaction posture per AC5 redaction allowlist (no raw atom content, no full queries, no full paths, no arbitrary result JSON).
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
15. **Persisted transcripts / prompts / answers.** Neither the Raycast extension nor the daemon writes the question text or the answer text to disk, to `LocalStorage`, or to any cache. Each invocation is an in-memory transaction; closing the Detail view drops everything except the journal entry the founder writes by hand. (Codex arch reviewer 2026-05-18: closing the chat-drift door fully requires this lock, not just thread-suppression.)
16. **Follow-up affordances inside the Detail view.** No "ask follow-up" action, no prefilled re-ask flow, no input control (TextField/TextArea/Form) rendered in the Detail view after the question is submitted. The only way to ask a second question is to dismiss the Detail and invoke ⌘⇧A again. If the founder wants to vary the original question, they cancel + re-fire. (Closes the chat-bubble drift path.)
17. **Chat-bubble / message-list / conversation-thread UI.** The Detail view renders one continuous markdown answer, not a sequence of user/assistant bubbles. No avatars, no role labels, no "You / Assistant" framing — those affordances are precisely the chat-product drift `context-as-moat` forbids.
18. **`args_summary` / `result_summary` as free-form natural-language strings.** The audit endpoint MUST emit deterministic projections only (see AC5 redaction allowlist). The field names are `args_shape` and `result_shape` specifically because "summary" would invite synthesis-by-daemon, which collides with OoS#5. (Codex arch reviewer 2026-05-18.)

## Risks

- **R1 — `codex exec` cold-start latency.** Several seconds before any stdout. Detail will show `isLoading=true` blank state during this window. Acceptable v0 risk; log as journal observation if it feels broken; V1 may consider a long-running daemonized agent process.
- **R2 — Stdout pipe buffering.** Some CLIs line-buffer to a TTY but block-buffer to pipes, making "streaming" appear chunky or all-at-once. Each profile may need a workaround (`unbuffer`, `script -q`, env var like `PYTHONUNBUFFERED`). Builder detects during manual integration; if needed, codifies the workaround in the profile definition. If neither agent has a clean fix, document the constraint in README rather than block.
- **R3 — Daemon has no in-process MCP request log; the ring buffer is new mechanism, not exposure.** Codex reviewer confirmed 2026-05-18: `src/mcp/server.ts` creates a fresh `McpServer` per POST and registers tools via decentralized `server.registerTool(...)` calls — there is no central tool-dispatch module to hook. Builder MUST (a) introduce a `registerTool(server, name, schema, handler)` wrapper that logs every invocation's start/end/status/duration into `src/mcp/request-log.ts`, (b) refactor every existing call site (find_clusters, search_memories, get_atoms, get_atom, echo_ping, plus any others discovered during grep) to go through the wrapper, (c) add the `GET /mcp/recent-calls` path dispatch in `server.ts` BEFORE the existing `methodNotAllowed` branch so the POST `/mcp` JSON-RPC behavior is preserved verbatim. Estimate: ~80 LoC of new code + a sweep of existing registrations (mechanical). The wrapper pattern keeps the JSON-RPC handler clean.
- **R4 — `/mcp/recent-calls` lacks per-caller attribution.** Filtering by `since=<launch_ts>` is best-effort; if a background process (e.g., a Codex review-queue tick) also fires during the Ask-ECHO window, its calls will show up in the sidebar. Single-user dogfooding posture accepts this; the journal-entry "Sources" field can note the ambiguity if it bites.
- **R5 — Custom profile is a shell-injection foot-gun.** The `customCommand` textbox accepts arbitrary text. Single-user dogfooding tool, not in threat model. README will note the constraint.
- **R6 — System prompt drift across agents.** Codex tends to terse; Claude tends to verbose; the same prompt produces different shapes. Acceptable — vendor-agnosticism explicitly lets founder pick which behavior they want. The snapshot test on `system-prompt.ts` prevents accidental edits; it does NOT try to normalize across agents.
- **R7 — Founder forgets to journal Ask-ECHO invocations.** AC9's gate is journal-discipline-dependent. The ⌘J "Copy journal entry template" action is the structural reminder. The template pre-fills `**Surface:** Ask ECHO` as a mechanical marker so AC9 can be verified by a small grep script (`grep -c '^**Surface:** Ask ECHO' raw/internal/dogfooding/mcp-interactions-journal.md` and date-spread check), not human judgement. If the founder still forgets, AC9 can't fire, and we wait. Same posture as item 060's AC8.
- **R8 — Subprocess lifecycle edge cases.** Per codex-ops reviewer 2026-05-18: stdio plumbing, EPIPE on early exit, stderr unbounded growth, interactive-auth hangs (codex first-run login flow), and Raycast itself crashing mid-stream all need explicit handling — see AC2 / AC4 contract below. Builder MUST NOT treat `spawn` + `tree-kill` as sufficient.
- **R9 — Cancellation race for in-flight MCP calls.** If the agent is killed while a tool call is in flight, the ring-buffer entry stays at `status: "pending"` indefinitely (the wrapper never receives the completion callback). Acceptable: the sidebar shows the pending entry verbatim (per AC5 `status` field), which is honest about the partial state. The wrapper does NOT need to detect agent death to retroactively close out pending entries; that's a v0.1 concern if it bites.
- **R10 — Streaming render perf.** Naïve `setMarkdown(buf += chunk)` on every stdout chunk is O(n²) string churn and forces Raycast to re-render markdown on each token. AC3 mandates batched/throttled flushes — see contract below.

## Tests

- **`tools/raycast-echo/test/agent-profiles.test.ts`** (Vitest, pure Node): assertions for (a) codex profile produces `binary="codex"`, args contain `exec`, `--sandbox`, `read-only`, `-`; (b) claude profile produces `binary="claude"`; (c) custom template substitutes `{question}` correctly; (d) custom template with quoted args splits via shell-style (not naive whitespace) — concrete case: `"echo --flag \"foo bar\" {question}"` → `["echo", "--flag", "foo bar", "<q>"]`; (e) `repoPath` containing spaces flows verbatim into the `-C` slot for codex — concrete case: `/Users/x/Project echo` → `["-C", "/Users/x/Project echo"]` (no shell-escaping inside argv array); (f) absent agent kind defaults to `codex`; (g) custom template containing a literal `{question}` substring inside a single-quoted segment — concrete case: `"echo 'literal {question}' {question}"` substitutes only the unquoted occurrence (or, if the implementation chooses to substitute both, the test pins that behavior explicitly); (h) custom template with `{question}` as the only argument (stdin-vs-arg placement) — concrete case: a profile where `stdinFormat: "raw"` uses stdin and `stdinFormat: "template"` uses argv substitution; both shapes covered.
- **`tools/raycast-echo/test/system-prompt.test.ts`** (Vitest, pure Node): snapshot of the prompt body; assertion that the prompt names all four MCP tool names verbatim; assertion of the single-shot / no-clarifying-questions constraint string.
- **`tools/raycast-echo/test/audit.test.ts`** (NEW, Vitest, pure Node): asserts the typed shape of an `audit.ts` parsed response: `{ calls: [{ ts: number, tool: string, args_shape: object, result_shape: object, duration_ms: number, status: "pending" | "ok" | "error" }] }`. One case for each `status` value. Uses a fixture JSON blob; no live daemon needed.
- **No new daemon-side unit tests for the route.** The `/mcp/recent-calls` endpoint is small enough to verify with `curl http://127.0.0.1:38478/mcp/recent-calls?since=0 | jq` against a running daemon; the existing `tools/mcp-integration-smoke.sh` may grow an optional case once the endpoint exists, but it is not blocking for this item. Note: port `38478` (not 38479).
- **One new daemon-side unit test for the ring buffer.** `tests/mcp/request-log.test.ts` covers: (a) append + read-back ordering; (b) `pending → ok` transition updates in place (same entry, not a duplicate); (c) `pending → error` likewise; (d) cap at 1000 entries (oldest evicted); (e) `since`/`until`/`status` filters return correct subsets.
- **Manual integration (builder-verified before pending_review):** for each of the two known profiles, fire ⌘⇧A with a real question (e.g. "what did I work on yesterday morning?"), confirm (1) the answer streams smoothly (no second-long stalls between chunks once the agent's first token lands; this is the throttle-sanity check, not a SLO); (2) the sidebar populates with at least one real MCP call AND each entry has a non-pending terminal status by the time the agent has exited cleanly; (3) cancellation kills the subprocess (`ps -ef | grep <binary>` shows no leak after 5s); (4) restart of daemon mid-run produces the documented error path; (5) deliberately misconfigure `customCommand` to a non-existent binary and verify the AC4 toast appears within 2s with the "Open Raycast preferences" action.

## Definition of Done

- **AC1** — extension manifest registers a second command `ask-context` (title "Ask ECHO") with preferences `agentKind` (dropdown: codex | claude | custom), `customCommand` (textfield, visible only for custom), `repoPath` (textfield, default `~/Desktop/Project_echo`). The existing `search-context` command and its UX are unchanged.

- **AC2** — Form view accepts a multi-line question; on submit, a Detail view is pushed and a subprocess is spawned with the active profile's resolved `(binary, args, stdin)`. **Subprocess lifecycle contract** (per codex-ops reviewer 2026-05-18):
  - `child_process.spawn(binary, args, { stdio: ["pipe", "pipe", "pipe"], detached: false })` — pipe shape explicit for portability.
  - Stdin write is non-blocking with an `error` listener; an `EPIPE` (agent exited before reading stdin) is caught and folded into the AC4 non-zero-exit path, NOT thrown unhandled.
  - Stdout chunks consumed via `for await` async iterator.
  - Stderr captured into a bounded buffer (last 4KB only — discard older bytes); the tail is shown in the AC4 non-zero footer.
  - **Idle timeout: 30 s of no stdout activity → emit "Agent appears stalled (likely interactive auth prompt). Cancel and check terminal for `<binary> login`." in the Detail footer, but do NOT auto-kill.** This is the codex-first-run-login signature.
  - **Max wall-clock runtime: 5 min hard ceiling → tree-kill + "Exceeded 5-minute ceiling" footer.** v0 conservative cap; if a real question needs longer, founder logs it as a journal observation.
  - Best-effort cleanup: an `unmount`/dismount handler in the Detail view kills the subprocess tree. If Raycast itself crashes, OS will reap the child eventually; README notes this as a known v0 limitation.

- **AC3** — agent stdout streams to the Detail markdown state during the run via a **throttled flush** (codex-ops reviewer 2026-05-18): chunks are appended to a `useRef` buffer; `setMarkdown` is called at most once every 80 ms OR immediately on subprocess exit, whichever comes first. The buffer growth is unbounded for v0 (a 5-min ceiling × any plausible token rate keeps it well under 1 MB; no truncation needed). On subprocess exit, the `Detail.Metadata` sidebar populates from `GET /mcp/recent-calls?since=<launch_ts>` with one row per MCP call rendered as `<tool name> · <duration_ms>ms · <status>`. **Sidebar data MUST come from `audit.ts` typed records only** — stdout-parsing for tool calls is forbidden (closes the model-authored-sidebar hole; codex arch reviewer 2026-05-18 promoted from OoS to AC).

- **AC4** — error paths handled (preflight + runtime):
  - **Preflight (BEFORE spawn):** (a) loopback probe `HEAD http://127.0.0.1:38478/mcp` with 1s timeout → if unreachable, toast `"ECHO daemon unreachable at 38478"` + no spawn; (b) `which <binary>` (or equivalent existence check) → if missing, toast `"Agent '<binary>' not found"` with "Open Raycast preferences" action + no spawn.
  - **Runtime:** (a) agent non-zero exit → answer-so-far in Detail markdown + horizontal rule + `**Agent exited with code N**\n\n<stderr tail (≤4KB)>` footer; (b) user cancels (⌘W / escape / view dismount) → tree-kill subprocess + partial answer + `**Cancelled.**` footer; (c) `/mcp/recent-calls` fetch failure → `Detail.Metadata` sidebar shows `Audit unavailable` label without blocking the answer pane; (d) idle / max-runtime timeouts per AC2 lifecycle contract; (e) daemon goes down mid-run → the agent's MCP calls will fail; that surfaces as agent non-zero exit OR as agent-rendered error text — both paths land in (a) above. The extension does NOT attempt to detect daemon-death during the agent run; that's the agent's domain.

- **AC5** — daemon exposes `GET /mcp/recent-calls?since=<unix_ms>[&until=<unix_ms>][&status=pending|ok|error]` on `http://127.0.0.1:38478` (NOT 38479 — that's the trace viewer), loopback-only (inherited from existing bind). Response:
  ```json
  { "calls": [{
      "ts": <unix_ms>,
      "tool": "search_memories" | "find_clusters" | "get_atoms" | "get_atom" | "echo_ping" | <other registered tool>,
      "args_shape": { /* deterministic projection — see redaction allowlist */ },
      "result_shape": { /* deterministic projection — see redaction allowlist */ },
      "duration_ms": <number | null when status=pending>,
      "status": "pending" | "ok" | "error"
  }] }
  ```
  **Redaction allowlist (deterministic projection only, per both reviewers):**
  - `args_shape` MAY include: tool name (already a sibling field), arg-key set, `limit`, `since`/`until`, `source_app`, `repo_path` PRESENT/ABSENT flag, query string LENGTH (not content), atom-ID array LENGTH (not contents).
  - `result_shape` MAY include: result type, `cluster_count`/`atom_count`/`match_count`, atom-ID array LENGTH, total byte length, `warnings[]` count, `next_cursor` PRESENT/ABSENT.
  - **NEVER**: raw atom content, raw query text, full repo paths, full URLs, full atom-IDs (a length is fine; the IDs themselves are not), full `next_cursor` strings, any free-form natural-language string.
  - Implementation MUST be a deterministic per-tool projection function (one switch statement keyed on tool name), not a generic `JSON.stringify(args).slice(0, N)` truncation.
  - Field names are `args_shape` / `result_shape` (NOT `args_summary` / `result_summary`) — the "summary" naming was rejected because it invites synthesis; "shape" names what the projection actually is.

  **Ring-buffer entries are mutable during their lifetime:** the wrapper appends with `status: "pending"` at call start (and `duration_ms: null`), then updates in place to `ok` or `error` with finalized `duration_ms` and `result_shape` at call end. Reads must be a snapshot (clone) so a concurrent update doesn't tear.

- **AC6** — `agent-profiles.test.ts` + `system-prompt.test.ts` + `audit.test.ts` (new per Tests section) pass via `npx vitest run` from `tools/raycast-echo`; daemon-side `tests/mcp/request-log.test.ts` passes via the existing root test runner.

- **AC7** — README documents (a) Ask ECHO install assumption (codex / claude on PATH; founder's own MCP config wires ECHO into each), (b) preferences walkthrough (screenshots optional), (c) dogfooding template adapted for ⌘⇧A — explicitly the 6-field cross-tool template PLUS a fixed marker line `**Surface:** Ask ECHO` to make AC9 mechanically checkable; (d) the README explicitly notes "single-shot, no follow-ups, no transcript persistence — to vary the question, cancel and re-fire" so the constraint reaches the dogfooder, not just the spec.

- **AC8** — `npx tsc --noEmit` + `npx ray build` clean from `tools/raycast-echo`; root `tsc` still clean (extension is excluded by item 060's tsconfig fix; this item must not regress that); root test suite (which now includes `tests/mcp/request-log.test.ts`) green.

- **AC9 (post-merge, founder-gated)** — ≥5 journal entries containing the marker line `**Surface:** Ask ECHO` across ≥2 calendar days, with at least one ✅ Verdict and at least one 🟡 or ❌ Verdict recorded, BEFORE any V1 spec on this surface is written. Verification is mechanical: `grep -c '^\*\*Surface:\*\* Ask ECHO' raw/internal/dogfooding/mcp-interactions-journal.md` for the count and a small awk over the same lines for the date spread + verdict mix. Same posture as item 060's AC8 but without the "judgement on what counts as an entry" loophole.

## After Completion (Strategist Notes)

- **No wiki update on v0 ship.** Same posture as item 060 — V0 surfaces empirical signal; V1 spec is written from journal entries; wiki page is written when V1 ships. `wiki/surfaces/hotkey-overlay.md` (if it eventually covers Ask ECHO) stays `status: planned`.
- **The dogfooding journal is the V1 spec input.** After AC9 fires, the strategist reads the entries, distills "which retrieval failure modes did the LLM expose that the grid did not?", and writes a fresh V1 backlog item.
- **Update the dogfooding journal post-merge** with a "Ask ECHO ⌘⇧A shipped" entry containing the binding command, a reminder of the 6-field template adapted for this command, and the note that the **Sources** field for this command should be copied from the sidebar (not invented).
- **If dogfooding goes badly** (founder doesn't use it, journal stays empty after 3 days): write a strategist conversation note in `raw/internal/decisions/` analyzing why — wrong agent (codex too slow? claude too verbose?), wrong system prompt, wrong UI (Form-then-Detail too clicky?), wrong hypothesis (retrieval-debugging-by-LLM isn't actually useful?). Then either iterate v0 with a follow-on item or kill the surface.
- **The Codex consultation on 2026-05-18** (response captured in this brainstorm) flagged two structural risks worth restating: (a) the sidebar must not be model-authored — enforced by AC3 (promoted from OoS#6 after arch reviewer's pass), (b) vendor-agnosticism's real boundary is the agent event loop, not the model router — this spec sidesteps that risk entirely by NOT owning the event loop. Codex's own preferred architecture (Vercel AI SDK behind an internal `AnswerRunner`) is the correct V1+ answer if/when the project decides to take ownership of the loop; for v0 the borrowed-agent shape is the strategically lighter move.

- **Two parallel codex reviewers on 2026-05-18 (commit `0da03fa`)** — one architectural lens, one ops/runtime lens — produced 15 findings combined; all were accepted and folded into AC2/AC3/AC4/AC5/AC6/AC9 + new OoS items 15–18 + new R8/R9/R10. The two HIGH overlaps (port 38479→38478 confusion, R3 ring-buffer-must-be-built-not-exposed) were both blocking. Saving the raw responses to `raw/internal/decisions/2026-05-18-062-codex-arch-and-ops-reviews.md` is a post-merge strategist task so the reasoning is preserved beyond the conversation transcript.
- **Cross-tool dogfooding payoff.** This item is itself a dogfooding artifact of the cross-tool protocol — every successful Ask-ECHO invocation is one more data point for "AI clients consume ECHO MCP as peers, no special-casing per vendor." Logging that explicitly in the journal makes the artifact double-duty.

