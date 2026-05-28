---
id: 2026-05-27-077-cognitive-recap-via-raycast
title: "Cognitive recap — Raycast 'Recap' command + pinned system prompt over existing artifacts (combined.md + task-state + agent-runs + git log + clusters)"
status: ready
priority: HIGH
estimate: 1-2d
created: 2026-05-27
blocked_by: []
task_state_ref: 2026-05-27-077-cognitive-recap-via-raycast
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - tools/raycast-echo/package.json  # AC1 — add second top-level command "recap" alongside existing "echo"; add `preferences` entry for `defaultSinceWindow` (optional override of the resolver default). Bump extension version.
  - tools/raycast-echo/src/recap.tsx  # AC2 — new command entry point. Raycast's manifest convention maps command `name: "recap"` to source file `src/recap.tsx` (mirroring the shipped `name: "echo"` → `src/echo.tsx` mapping from item 063's unification). Form (optional `since` window text + dropdown {"since last session" (default), "last 24h", "last 4h", "custom ISO"}) → Detail (streaming markdown answer, structurally identical to echo.tsx's Detail rendering). Cancellation via tree-kill on view dismount, mirroring echo.tsx's pattern.
  # NOTE: `tools/raycast-echo/src/echo.tsx` is NOT modified (r7 codex F1 option-D resolution). The earlier r1 patch added a fork-action branch in echo.tsx that would dispatch Recap-session forks to the Recap prompt, but r7 codex F1 surfaced that echo.tsx cannot reach Recap's command-scoped preferences (agentKind/repoPath/customCommand/claudeOauthToken). Per option-D (remove, don't deeper-patch), the cross-command Cmd-R fork is CUT entirely for V1. Cmd-R on a Recap session viewed from echo's SessionsList is disabled — see AC2 step 6 below. Users re-run a recap by opening the Recap command directly (Raycast → "Recap" → submit Form).
  - tools/raycast-echo/src/lib/recap-system-prompt.ts  # AC3 — pinned single-shot system prompt teaching the agent to read combined.md + task-state + agent-runs + git log + recent dogfooding journal entries + MCP find_clusters/get_atoms, then render A/B/D-organized narrative. Snapshot-tested to prevent accidental edits.
  - tools/raycast-echo/src/lib/since-resolver.ts  # AC4 — pure function `resolveSinceWindow(prefs, sessions, nowMs): { sinceIso: string, source: SinceSource }` where `SinceSource = "user" | "last_session" | "window_24h" | "window_4h" | "fallback_24h"` (r5 patches). Precedence per AC4 body: (a) explicit user input (throws on non-empty invalid), (b) most recent Session with `status === "done"` only — `cancelled`/`errored` are NOT qualifying per r3 codex-ops F1, (c) explicit `window_24h`/`window_4h` for dropdown selections (distinct from fallback), (d) `fallback_24h` only when last_session lookup yields nothing.
  # NOTE: `tools/raycast-echo/src/lib/sessions.ts` is NOT modified (r8 option-F resolution). Earlier patches required adding `recapWindow?` to the Session interface AND a fork-action branch in echo.tsx AND a disable branch in SessionsList.tsx + SessionDetail.tsx. r8 surfaced this as deeper-patch in disguise: more files, more tests, same architectural tension between command-scoped prefs and cross-command actions. Per option-F (founder direction 2026-05-27), Recap session **persistence is dropped entirely from V1**. Recap is ephemeral: summoned via the Recap command → answer streams in Detail → dismissed when user leaves the view. No LocalStorage write, no SessionsList integration, no Cmd-R contract. Dogfooding journal (AC7) is the durable audit trail. SessionsList persistence + Cmd-R fork is deferred to a V1.5+ follow-up spec (gated on dogfooding showing demand).
  - tools/raycast-echo/test/recap-system-prompt.test.ts  # AC5 — vitest snapshot test on the system prompt body string; intentionally fragile so any edit forces an explicit snapshot refresh (same defense as system-prompt.test.ts).
  - tools/raycast-echo/test/since-resolver.test.ts  # AC5 — vitest cases pinning all three precedence branches: user-input wins, last-session wins when no user input, 24h fallback when no qualifying session, and the status-filter (a `running` session is NOT a qualifying "last session" — only terminal-state sessions count).
  - tools/raycast-echo/test/recap.test.tsx  # AC5 — vitest cases covering the Form → spawn → Detail wiring (mock agent-runner). At minimum: prompt-construction includes the resolved since, agent-profile selection is honored, cancellation kills subprocess tree. (r7 option-D removed the prior "recap-session fork" test case along with the echo.tsx fork-routing feature itself.) Tests import through `tools/raycast-echo/test/raycast-api-mock.ts`; if that mock lacks `Form` namespace and `Action.SubmitForm` exports, extend it minimally (r2 codex F2 patch — extending the mock is allowed; it is test-support infrastructure, NOT a production-API change).
  - tools/raycast-echo/test/raycast-api-mock.ts  # AC5 (r2 codex F2 patch) — additive-only: extend the existing Raycast API mock to export the `Form` namespace (TextField, Dropdown components used by Form view) AND `Action.SubmitForm`. The mock must remain a faithful shadow of `@raycast/api@1.104.17`'s actual surface — verified by importing from this mock in recap.test.tsx and asserting the form renders + onSubmit fires.
  - tools/raycast-echo/README.md  # AC6 — new "Recap" section: install assumptions (same agent CLIs as Ask ECHO — codex/claude/custom on PATH), preferences walkthrough (defaultSinceWindow), the A/B/D output shape, dogfooding template (7-field with `**Surface:** Recap` marker line for gate-checkable journal entries).
  - tools/raycast-echo/src/lib/audit.ts  # AC2.3a (r9 codex F1 patch) — additive ONLY: extend `fetchRecentCalls(options)` to accept an optional `signal?: AbortSignal` parameter and forward it to the underlying `fetch(url, {signal})` call. NO other audit.ts changes are permitted (signal is optional, defaults to undefined — preserves byte-identical behavior for existing Ask ECHO callers). Recap.tsx creates an `AbortController` with 5s timeout and passes `controller.signal` to the audit fetch. AC5 case 6 asserts the abort-fires-at-5s path. This minimal extension is the alternative to duplicating the audit fetch in recap.tsx (which would diverge over time).

spec_refs:
  - backlog/complete/2026-05-18-062-ask-echo-raycast-llm-qa.md  # Ask ECHO architectural precedent this spec mirrors: subprocess agent, pinned prompt, audit endpoint, single-shot by design. Recap inherits ALL of Ask ECHO's "what it does not do" defenses (no threading, no follow-ups, no daemon-side LLM).
  - tools/raycast-echo/src/echo.tsx  # current single unified Raycast command (per item 063's unification, which removed the earlier `ask-context.tsx`). READ-ONLY reference for recap.tsx (Form → Detail → tree-kill cancellation pattern). Per r7 option-D, recap does NOT modify echo.tsx — see OoS #7.
  - tools/raycast-echo/src/lib/agent-profiles.ts  # agent-invocation contract (reused unchanged). The recap command uses the SAME profile-selection logic; vendor-agnosticism stays at the agent-profile registry, not at an LLM SDK layer.
  - tools/raycast-echo/src/lib/agent-runner.ts  # subprocess spawn + stream contract (reused unchanged).
  - tools/raycast-echo/src/lib/system-prompt.ts  # the existing Ask ECHO system prompt — referenced as a style/length model for recap-system-prompt.ts; do NOT modify.
  - tools/raycast-echo/src/lib/sessions.ts  # Session shape (lines 8-24, 85-98) — READ-ONLY reference. **`recap.tsx` (NOT `since-resolver.ts`) owns LocalStorage IO** (r10 codex F1 patch): `recap.tsx` calls the existing session-loader helper to obtain `Session[]`, then PASSES the array to the pure `resolveSinceWindow(userInput, windowPref, sessions, nowMs)`. The resolver is a pure function — no side effects, no LocalStorage access. This split keeps the resolver unit-testable without mocking storage. The Session interface itself is NOT modified per r8 option-F (no `recapWindow` field).
  - wiki/architecture/coord-substrate-and-observability.md  # 057a lifecycle substrate — recap does NOT add a coord event type. Receipt-shape thinking is rejected; the coord ledger stays health/deadline only.
  - wiki/architecture/coord-active-trigger-and-role-emission.md  # 057b active emission — confirmed reviewer-only; builder/merger/watcher emission deferred. Recap reads coord atoms via existing MCP, does NOT emit any.
  - wiki/principles/drift-prevention.md  # Pattern 5 (chat UI trap) — single-shot constraint. The five-question test must pass at spec write AND at every reviewer round.
  - wiki/principles/context-as-moat.md  # "never ship a chat UI" — explicit. Recap is single-shot Q&A, NOT chat. Re-asking is a NEW recap session (fork-style, mirroring 063's "ask again from this" pattern).
  - wiki/principles/felt-not-seen.md  # L3 summoned overlay is explicitly allowed daily-use; "few minutes a month" applies to L5 (audit page) only.
  - wiki/principles/compose-not-capture.md  # 064 scope clarification: consumer-side projection of substrate data is allowed. Recap is projection, not capture.
  - wiki/surfaces/hotkey-overlay.md  # V1 planned hotkey overlay surface (tracked at the pinned SHA). Recap adds a SECOND command (parallel to `echo`); does NOT replace or override the existing landing-state behavior. The Raycast v0 adapter documentation (`hotkey-overlay-raycast.md`) is currently untracked strategist post-shipment work for items 060/062/063/065/069; this spec references the tracked V1 page to preserve builder-readability (r3 codex F1 patch).
  - raw/internal/decisions/2026-05-06-v15-trace-layer-design.md  # rejected "LLM natural-language brief on the daemon read path due trust/hallucination risk." Recap is consumer-side agent composition, NOT daemon-side rendering. This decision is load-bearing for the architecture choice.
  - backlog/complete/2026-05-22-069-raycast-cold-start-continuity-hero.md  # Continue hero — read-only reference. Recap does NOT modify the hero or the empty-state. The empty-Enter contract (find_clusters list + Continue hero) is preserved verbatim.
  - backlog/complete/2026-05-21-067-mcp-request-log-shutdown-flush.md  # /mcp/recent-calls audit endpoint reliability — recap inherits the same audit-availability semantics ("audit unavailable" sidebar message on error, does NOT block the answer pane).
  - docs/AGENT_INSTRUCTIONS.md  # builder contract — agent must update task-state pointer via patch-builder-state.py at handoff; recap is a typical Raycast-extension item, no special-case workflow.
  - raw/internal/dogfooding/mcp-interactions-journal-2026-05.md  # journaling sink — AC7 ≥3 founder-flagged entries / ≥2 calendar days with `**Surface:** Recap` marker; mechanically checkable via `grep -c`.

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
review_notes: ""
agent_notes: ""
---

# Cognitive recap — Raycast Recap command

## Why this spec exists

ECHO's multi-agent loop has closed: cross-vendor review queues (codex / codex-ops / claude / cursor) run autonomously, builder agents claim items, reviewers iterate r1→rN, and items merge to `main` — all without founder intervention between brainstorm and sign-off. The 2026-05-26 dogfooding journal documents an entire r3→r6 sequence on item 076 running unattended. Speed is up. But the founder pays in **cognitive debt**: the codebase, the decisions, and the project direction all drift away from the founder's mental model. The founder's own framing in the May journal (line 140): *"loss of continuity and inspectability, not absence of chat."*

The pain has been localized to three axes (ordered by bite):
- **A — Codebase drift:** "I don't know what the code looks like now; too many diffs landed without me reading them."
- **B — Decision drift:** "I don't know WHY agents made the choices they made; reasoning never crossed my eyes."
- **D — Direction drift:** "I've lost the thread of where the project is going; brainstorming the next thing starts from cold."

C (capability drift) is minimum — dogfooding-on-self surfaces functional issues naturally.

Two cross-vendor architectural consults (claude + codex) converged on the minimum-viable fix: **a Raycast "Recap" command** that spawns the user's existing CLI agent (codex / claude / custom — same agent-profiles as Ask ECHO) with a pinned system prompt teaching it to read the artifacts that already exist (review `combined.md`, task-state pointers, agent run logs, git log, dogfooding journal, MCP clusters) and produce an A/B/D-organized narrative in ≤500 words.

The audit deliberately CUT:
- A new `coord_emit` decision-receipt event type (the receipts already exist as `combined.md` + agent-run "Decisions Made During Implementation" sections).
- A daemon-side OS notification channel (continuation already lives in the Continue hero + escalation atoms; push-interrupts violate `felt-not-seen` and are unjustified by current pain).
- A new severity classifier component (review findings already carry `severity: high/medium/low/nit`; the agent's recap prompt reads those directly).
- A new synthesizer LLM (Ask ECHO's agent-profile registry already covers this; recap reuses the same pattern verbatim).
- Daemon-side LLM rendering (explicitly rejected in `raw/internal/decisions/2026-05-06-v15-trace-layer-design.md` for trust/hallucination reasons).
- Empty-Enter hijack (would conflict with the shipped Continue-hero + cluster-list landing semantics; drift-prevention Pattern 5 risk).

The net feature is ≤3 new files + 1 README section + a pinned prompt — sitting entirely on top of shipped Ask ECHO infrastructure.

## Acceptance Criteria

### AC1 — Raycast command registration

`tools/raycast-echo/package.json` gains a SECOND top-level command entry "recap" alongside the existing "echo" command:

- `name: "recap"`, `title: "Recap"`, `subtitle: "ECHO Context"`, `description: "Recap recent agent activity across the project."`, `mode: "view"`.
- The `recap` command's `preferences` array (NOT extension-scope — r9 codex F2 patch) gains one optional entry IN ADDITION to the four duplicated entries (agentKind, customCommand, repoPath, claudeOauthToken):
  - `name: "defaultSinceWindow"`, `type: "dropdown"`, `title: "Default Recap Window"`, `default: "last_session"`, `data: [{title: "Since last session", value: "last_session"}, {title: "Last 24 hours", value: "24h"}, {title: "Last 4 hours", value: "4h"}]`.
- Extension version bumped (semver minor).

**Preference scoping (r1 codex F2 / codex-ops F2 patch):** in Raycast, preferences declared under a command are command-scoped — they are NOT visible to a sibling command. Since the existing `echo` command owns `agentKind`, `customCommand`, `repoPath`, and `claudeOauthToken` at command-scope, the new `recap` command MUST **duplicate** these four preference entries under its own command block in `package.json` (NOT migrate them to extension-level — migration would reset existing user-set values for ECHO). The duplicate entries MUST use identical `name` / `type` / `title` / `description` / `data` shapes so the Recap command's `getPreferenceValues()` returns the same TypeScript-typed object as Ask ECHO's. Test requirement (AC5 / recap.test.tsx): a vitest case loading the package.json and asserting that the `recap` command's `preferences` array contains entries for all four duplicated names plus the new `defaultSinceWindow`. Existing user-set ECHO preferences MUST survive the upgrade — verified by a dogfooding step in the README install walkthrough (manual reviewer check: `agentKind` value present in Raycast preferences before+after extension reload).

### AC2 — Recap command entry point + UI flow

`tools/raycast-echo/src/recap.tsx` is the new command's entry point. The filename matches the manifest convention (`name: "recap"` → `src/recap.tsx`, mirroring `name: "echo"` → `src/echo.tsx`). It mirrors `echo.tsx`'s shape:

1. **Form view** (initial): one optional `Form.TextField` "Since (ISO timestamp or empty for default)", one `Form.Dropdown` "Window" pre-populated from preferences, and one `Action.SubmitForm` "Recap" (r2 codex F2 patch — verified against `@raycast/api@1.104.17` exports; the API surface ships `Action.SubmitForm`, NOT a `Form.SubmitFormAction` export). Reviewers should reject any diff that references `Form.SubmitFormAction`.
2. **Resolve `since`** via `resolveSinceWindow()` (AC4) on submit. The resolved ISO timestamp + source label (the full `SinceSource` union from AC4: `"user" | "last_session" | "window_24h" | "window_4h" | "fallback_24h"` — r5 codex F2 / codex-ops F1 patch) are passed forward. The resolver may throw `InvalidSinceInputError` on non-empty invalid `userInput`; recap.tsx catches it and surfaces a visible Form error WITHOUT spawning the agent.
3. **Detail view** (post-submit): identical to Ask ECHO's Detail rendering — streaming markdown answer (throttled `setMarkdown` per 80ms or on subprocess exit), `Detail.Metadata` sidebar populated from `GET /mcp/recent-calls` (via the **extended** `lib/audit.ts` — see files_to_modify entry; the extension is the optional `signal?: AbortSignal` parameter, additive only), header label includes the resolved since + source.

3a. **Daemon-down non-blocking contract (r3 codex-ops F2 patch + r8 codex-ops F2 timeout patch):** Recap's evidence sources are filesystem-first (combined.md / task-state / agent-runs / git log / journal); MCP is only the optional final fallback. Therefore the existing Ask ECHO `probeEchoDaemon()` hard-fail preflight MUST NOT gate Recap. Recap-context.tsx EITHER (a) skips the daemon probe entirely, OR (b) calls it non-blockingly (timeout + ignore failure). The agent subprocess spawns regardless of daemon state. **The `Detail.Metadata` sidebar audit-poll for `/mcp/recent-calls` MUST use an `AbortController` with a bounded timeout (5s max), and MUST NOT poll on a repeating interval (r8 codex-ops F2 patch).** The inherited Ask ECHO audit poll (at `tools/raycast-echo/src/components/AnswerView.tsx:201-203,229`) re-fetches every 600ms with no `AbortController` — that pattern would let a wedged daemon accumulate pending fetches and never surface "audit unavailable." For Recap, the contract is: ONE best-effort fetch at Detail-view mount, with `AbortController` + 5s timeout; on timeout OR error, the sidebar shows "audit unavailable" and does NOT retry. The streaming markdown answer is never blocked by audit state. Test pinned in `recap.test.tsx` (AC5 case 7 below): mock a never-resolving `/mcp/recent-calls` fetch → assert the `AbortController` fires at 5s, the sidebar transitions to "audit unavailable," and the markdown answer continues streaming without interruption.
4. **Cancellation**: dismounting the Detail view triggers `tree-kill` on the subprocess, identical to Ask ECHO.
5. **Persistence: NONE for V1 (r8 option-F resolution).** Recap is **ephemeral**. The session is NOT written to LocalStorage. The Detail view streams the markdown answer; when the user dismisses the view, the recap is gone. The Detail header label shows the resolved since + source (full `SinceSource` union from AC4) for the founder's in-view comprehension. **No `recapWindow` field is added to the Session interface.** **No SessionsList integration.** **No Cmd-R contract** (no Recap session row exists in any list to fork from). The dogfooding journal (AC7) is the durable audit trail of past recaps; the founder copies relevant lines from the streamed Detail into the journal entry in-the-moment per the journal discipline. If V1 dogfooding shows demand for persistent recap history, a V1.5+ spec adds Session persistence + a launchCommand-based Cmd-R contract; that spec is explicitly out-of-scope here.

6. **Custom-agent cwd contract (r2 codex-ops F1 patch):** the recap prompt instructs the spawned agent to read repo-relative paths (`backlog/...`, `raw/...`) and run `git log` against the project repo. For `agentKind: "codex"` and `agentKind: "claude"`, the existing `agent-profiles.ts` invocation already sets the subprocess `cwd` to the repo root (verified by reviewer at `src/lib/agent-profiles.ts:36-69`). For `agentKind: "custom"`, the recap-context entry point MUST either (a) explicitly set `spawn({cwd: repoPath, ...})` for the subprocess, OR (b) refuse to spawn if the user-configured `customCommand` template lacks a `{repoPath}` interpolation token. Recommendation: (a) — set `cwd: repoPath` unconditionally for custom recap invocations; it is structurally less brittle than depending on template content. Test pinned in `recap.test.tsx` (AC5): a custom-command recap spawn passes through the recap prompt via stdin AND the resulting `child_process.spawn` options include `cwd: <mocked repoPath>`.

Single-shot is the structural defense against drift-prevention Pattern 5. The Recap command MUST NOT support follow-up turns, in-session continuation, or re-prompting. Re-asking = **a fresh Raycast → "Recap" invocation** (r9 codex F3 patch — the Cmd-R-on-prior-recap clause was cut per option-F; no Recap session row exists to fork from).

### AC3 — Pinned recap system prompt

`tools/raycast-echo/src/lib/recap-system-prompt.ts` exports `RECAP_SYSTEM_PROMPT_TEMPLATE` (the template constant with placeholder tokens) AND `buildRecapPrompt({sinceIso, repoPath})` (the substitution function — see AC4a). r10 codex F2 patch: the module does NOT export a `RECAP_SYSTEM_PROMPT` constant; the consumer always calls `buildRecapPrompt()` to obtain a fully-substituted prompt. The TEMPLATE constant uses `<SINCE_ISO>` and `<REPO_PATH>` placeholders (angle-bracket form — NOT `${...}` shell-style which would conflict with template-literal syntax in TS). The template:

1. Tells the agent it is a **single-shot recap renderer** for the founder of ECHO, who has been out of the loop since `<SINCE_ISO>`. The agent must compose a strategist-grade narrative organized by three drift axes.
2. Instructs the agent to read these SIX input sources (in order), filtering by **stable embedded timestamps** rather than filesystem `mtime` (r1 codex-ops F3 patch — mtime reflects checkout/touch time, not artifact authorship; a fresh clone or rebase would over-include old files):
   - `backlog/reviews/**/r*/combined.md` is the **ONLY authoritative B-axis source** (r4 codex-ops F1 patch). The recap MUST treat a round as having a final disposition ONLY if its `combined.md` exists. Reviewer response files (`r*/codex.md` / `r*/codex-ops.md` / `r*/claude.md` / `r*/cursor.md`) MAY be read for context BUT MUST be reported in the recap as "in-flight (round rN, no convergence yet)" when no sibling `combined.md` exists. Reporting reviewer findings as decisions during the race window where reviewers have landed but the watcher hasn't combined yet would create false continuity — the exact failure the feature is designed to prevent. Filtering by **canonical frontmatter timestamp field per file kind** (r2 codex F1 patch): `combined.md` uses `combined_at`, reviewer response files use `completed_at`, request files use `requested_at`. Each file is included iff its canonical field parses as ISO and is `> <SINCE_ISO>`. Each `combined.md` carries verdicts, severity-tagged findings, and dispositions — the canonical B-axis evidence.
   - `backlog/task-state/<task-id>/*.md` files enumerated via `git log --since="<SINCE_ISO>" --name-only --pretty=format: -- 'backlog/task-state/**'` (touched-since-window via git, NOT mtime). Read current_thesis + open_questions + dont_touch — canonical D-axis evidence.
   - `raw/internal/agent-runs/*.md` files enumerated via `git log --since="<SINCE_ISO>" --name-only --pretty=format: -- 'raw/internal/agent-runs/**'`. Read each file's "Decisions Made During Implementation" section (and adjacent sections) — B-axis evidence for non-spec-round work.
   - `git log --since="<SINCE_ISO>" --oneline --stat HEAD` (NOT `<SINCE_ISO>..HEAD` — Git treats the ISO timestamp as a revision name and fails with `fatal: invalid object name`; r1 codex F3 / codex-ops F1 patch). Followed by selective `git diff <sha>~..<sha>` on the highest-impact commits the log surfaces. A-axis evidence.
   - `raw/internal/dogfooding/mcp-interactions-journal-*.md` — parse `### YYYY-MM-DD HH:MM PDT` headers and include entries whose timestamp is `> <SINCE_ISO>` (header-embedded timestamp, NOT mtime). Cross-tool MCP activity; verifies what ECHO knew when.
   - MCP `find_clusters({since: <SINCE_ISO>, repo_path: <REPO_PATH>})` followed by `get_atoms({atom_ids: <bounded subset>, prefer: "newest_first"})` ONLY if the four file-based sources above leave gaps (raw cross-tool conversation context). **`get_atoms` rejects more than 50 atom_ids per call (r7 codex F2 patch).** **`find_clusters.atom_ids` ordering is lexicographic UUID, NOT chronological (r8 codex F1 patch).** `get_atoms(prefer:"newest_first")` only re-sorts the IDs it receives — it cannot recover atoms that were excluded from the bounded subset. Therefore taking the first 50 lexicographically may EXCLUDE newest atoms when a cluster carries >50 IDs. The prompt MUST instruct the agent verbatim: "If the top cluster has ≤50 atom_ids, pass them all to `get_atoms({prefer:'newest_first'})`. If it has >50, take a bounded subset of 50 by lexicographic order (the cheapest stable cut) and pass them to `get_atoms`; mark the MCP-derived context as 'best-effort sample (capped at 50/N atoms; ordering not chronological)' in the `## Sources` line. Do not call `get_atoms` more than once per recap. The bounded subset is not guaranteed to contain the newest atoms; rely on file + git evidence as the chronological backbone." **MCP fallback is best-effort (r6 codex-ops F2 patch).** If the daemon is unavailable, the call errors, or the response is slow (>5s), the agent MUST continue from file + git sources and still produce the recap. The prompt MUST verbatim instruct: "If the MCP call fails or times out, render the recap from the file-based sources without retrying, and add a note in the `## Sources` section: '_MCP fallback unavailable; recap composed from file + git only._'" — this matches the AC2.3a Raycast-side non-blocking contract but at the agent layer. **Both `<SINCE_ISO>` and `<REPO_PATH>` are template placeholders substituted at prompt construction time** (r4 codex F1 patch). The `repo_path` MUST be an absolute filesystem path (the MCP validator at `src/mcp/util/repo-path.ts:35-38` rejects non-absolute strings). The substitution is performed by `buildRecapPrompt({ sinceIso, repoPath })` — see AC4a below.
3. Pins the output format to three markdown sections, in this order: `## A — Code changed`, `## B — Decisions`, `## D — Direction`. Each section ≤200 words. A final `## Sources` line lists which inputs were used.
4. Forbids: producing the recap without reading the actual artifacts; inventing decisions not present in `combined.md` or run logs; recommending changes the founder didn't ask for; following up or asking clarifying questions (single-shot).
5. Total prompt body MUST be < 4096 characters (vendor-portable upper bound) and snapshot-tested. The snapshot test runs against the TEMPLATE constant `RECAP_SYSTEM_PROMPT_TEMPLATE` (with placeholders), NOT against `buildRecapPrompt()` output (which would be path-dependent and break in CI). The snapshot test (AC5 / recap-system-prompt.test.ts) additionally asserts the verbatim presence of: (a) the corrected `git log --since="<SINCE_ISO>" ... HEAD` command form (not `<SINCE_ISO>..HEAD`), (b) the `git log --since ... --name-only` enumeration pattern for task-state and agent-runs, (c) the no-mtime constraint, (d) the journal-entry header parser for timestamp filtering, (e) **the per-file-kind canonical timestamp field**: `combined_at` for `combined.md`, `completed_at` for reviewer response files, `requested_at` for request files (r2 codex F1 patch), (f) **the in-flight labeling rule** (r4 codex-ops F1 patch): the prompt verbatim states `combined.md` is the ONLY authoritative B-axis source and reviewer-only rounds without combined.md MUST be reported as "in-flight," (g) **the placeholder tokens** `<SINCE_ISO>` and `<REPO_PATH>` are present in the TEMPLATE constant (r4 codex F1 patch), (h) **the MCP-fallback-best-effort wording** (r6 codex-ops F2 patch): the prompt verbatim contains "If the MCP call fails or times out, render the recap from the file-based sources without retrying" and the `## Sources` note shape "_MCP fallback unavailable; recap composed from file + git only._", (i) **the get_atoms 50-cap + ordering-honest instruction** (r7 codex F2 + r8 codex F1 patches): the prompt verbatim contains "If the top cluster has ≤50 atom_ids, pass them all to `get_atoms`. If it has >50, take a bounded subset of 50 by lexicographic order... not guaranteed to contain the newest atoms; rely on file + git evidence as the chronological backbone." (the test asserts a substring match — the snapshot does not need to be byte-exact on every word but must contain the load-bearing clauses about 50-cap, lexicographic-not-chronological, and file+git-as-chronological-backbone), and (j) **the no-Recap-persistence statement** (r8 option-F): the prompt verbatim contains "Recap is single-shot and not persisted; produce a complete answer in one response. The founder copies relevant lines to the dogfooding journal in-the-moment." These ten assertions structurally prevent regression back to the r1-r8-broken forms.

### AC4 — `since-resolver.ts` + `buildRecapPrompt`

`tools/raycast-echo/src/lib/since-resolver.ts` exports a pure function:

```ts
export type SinceSource =
  | "user"           // explicit valid ISO input from the Form TextField
  | "last_session"   // dropdown=last_session, qualifying session found
  | "window_24h"     // dropdown=24h, explicit operator choice (r4 codex-ops F2 patch)
  | "window_4h"      // dropdown=4h, explicit operator choice (r4 codex-ops F2 patch)
  | "fallback_24h";  // dropdown=last_session but no qualifying session existed

export interface ResolvedSince { sinceIso: string; source: SinceSource; }

export function resolveSinceWindow(
  userInput: string | undefined,    // raw Form TextField value
  windowPref: "last_session" | "24h" | "4h",  // dropdown value
  sessions: readonly Session[],     // LocalStorage-loaded sessions
  nowMs: number = Date.now(),
): ResolvedSince;

export class InvalidSinceInputError extends Error {
  constructor(public readonly rawInput: string) { super(`Invalid since input: "${rawInput}" — expected ISO 8601 timestamp with explicit timezone (Z or ±HH:MM).`); }
}
```

Precedence (deterministic, easy to test):

1. **`userInput` non-empty AND valid** (parses as ISO 8601 with explicit `Z` or `±HH:MM` timezone — both positive AND negative offsets accepted; PDT founder uses `-07:00`, r10 codex-ops F1 patch) → `source: "user"`.
2. **`userInput` non-empty AND invalid** → **throw `InvalidSinceInputError`** (r4 codex-ops F2 patch). The Form caller in recap.tsx MUST catch this and render a visible Form error (`Form.TextField.error` or `showToast({style: Failure})`); the recap MUST NOT silently fall through to a different window when the user explicitly typed something. Silent-fallback would produce a recap over a window the user did not intend, with no operator-visible signal that the input was wrong.
3. **`userInput` empty AND `windowPref === "last_session"`** → find the most recent **Ask ECHO** `Session` with `status === "done"`, and use `completedAt ?? startedAt`. **`status ∈ {"running", "cancelled", "errored"}` sessions are NOT qualifying**: `running` because the founder isn't trying to recap their currently-open session; `cancelled`/`errored` because a failed/aborted attempt would silently shift the next default window. **(r9 codex F4 patch)** Per r8 option-F, Recap is ephemeral — Recap results are NOT written to LocalStorage and CANNOT appear in this lookup. The resolver searches only over existing Ask ECHO Session rows. If no qualifying Session exists → fall through to (6) with `source: "fallback_24h"`.
4. **`userInput` empty AND `windowPref === "24h"`** → `now - 24h`, `source: "window_24h"` (NOT `fallback_24h` — operator explicitly chose this; r4 codex-ops F2 patch).
5. **`userInput` empty AND `windowPref === "4h"`** → `now - 4h`, `source: "window_4h"`.
6. **`windowPref === "last_session"` + no qualifying session** → `now - 24h`, `source: "fallback_24h"` (default window when last-session lookup found nothing).

Returns ISO-8601 with explicit `Z` suffix (UTC canonical), matching `src/capture/pipeline.ts:17-44`'s timestamp canonicalization.

### AC4a — `buildRecapPrompt({ sinceIso, repoPath })` (r4 codex F1 patch)

`tools/raycast-echo/src/lib/recap-system-prompt.ts` exports BOTH the pinned template constant `RECAP_SYSTEM_PROMPT_TEMPLATE` (which contains `<SINCE_ISO>` and `<REPO_PATH>` placeholder tokens) AND a pure function:

```ts
export function buildRecapPrompt(args: {
  sinceIso: string;     // result of resolveSinceWindow().sinceIso
  repoPath: string;     // absolute filesystem path (REJECT non-absolute → throw)
}): string;
```

`buildRecapPrompt` performs string substitution of `<SINCE_ISO>` → `args.sinceIso` and `<REPO_PATH>` → `args.repoPath`. Pre-condition: `args.repoPath` MUST be an absolute path (matches the MCP `find_clusters` `repo_path` validator at `src/mcp/util/repo-path.ts:35-38`); non-absolute → throw. Post-condition: the returned string MUST NOT contain any of `<SINCE_ISO>`, `<REPO_PATH>` (the canonical placeholder forms) nor any `${SINCE_ISO}` / `${REPO_ROOT}` legacy-form literals — fully-substituted prompt only.

**`repoPath` normalization at the call site (r5 codex F1 patch):** the Raycast preference default for `repoPath` is `~/Desktop/Project_echo` (literal tilde — the same shipped default as the `echo` command), so the raw preference value is NOT an absolute path. Recap.tsx is the SOLE call site, and BEFORE calling `buildRecapPrompt` it MUST home-expand the preference using the same helper `echo.tsx` already uses (see `tools/raycast-echo/src/echo.tsx:76,729-733` — `expandHome(prefs.repoPath)` or equivalent). The contract: `recap.tsx` resolves the preference → absolute path → passes to `buildRecapPrompt`. If `expandHome` fails or returns a non-absolute path, recap.tsx surfaces a visible Form error and does NOT spawn the agent. Reviewers should reject any diff where recap.tsx passes `prefs.repoPath` directly to `buildRecapPrompt` without going through home expansion.

`windowPref === "24h"` → `now - 24h`. `windowPref === "4h"` → `now - 4h`. Both bypass the session lookup.

Returns ISO-8601 with explicit `Z` suffix (UTC canonical), matching `src/capture/pipeline.ts:17-44`'s timestamp canonicalization.

### AC5 — Tests

Three vitest test files added under `tools/raycast-echo/test/`:

- **`recap-system-prompt.test.ts`** — snapshot test on the full prompt body string. Intentionally fragile — any edit to the prompt content fails this test until the snapshot is explicitly refreshed (`vitest --update`). Same defense pattern as `system-prompt.test.ts`. Additionally asserts: prompt body < 4096 chars; mentions all six input sources; mentions all three drift axes by name.

- **`since-resolver.test.ts`** — twelve cases minimum:
  1. user-input valid ISO → `source: "user"`
  2. **(r4 codex-ops F2 patch)** user-input non-empty AND invalid → **throws `InvalidSinceInputError`** (NOT silent fall-through)
  2a. **(r10 codex-ops F1 patch)** user-input `2026-05-27T23:00:00-07:00` (NEGATIVE offset, PDT-shaped) → `source: "user"`. Test pins that negative-offset ISO is NOT rejected as invalid.
  3. windowPref=`last_session` + qualifying `done` session present → uses `completedAt`, `source: "last_session"`
  4. windowPref=`last_session` + qualifying `done` session has null `completedAt` → uses `startedAt`, `source: "last_session"`
  5. windowPref=`last_session` + only `running` sessions present → falls through to 24h, `source: "fallback_24h"`
  6. windowPref=`last_session` + zero sessions → 24h, `source: "fallback_24h"`
  7. **(r4 codex-ops F2 patch)** windowPref=`24h` → `now - 24h`, `source: "window_24h"` (NOT `"fallback_24h"`)
  8. **(r4 codex-ops F2 patch)** windowPref=`4h` → `now - 4h`, `source: "window_4h"`
  9. **(r3 codex-ops F1 patch)** windowPref=`last_session` + most recent Ask Session has `status === "cancelled"` → resolver SKIPS it, uses the next older `done` Ask Session OR falls through to 24h (`source: "fallback_24h"`). (Recap sessions are ephemeral per r8 option-F; this case applies only to Ask Sessions.)
  10. **(r3 codex-ops F1 patch)** windowPref=`last_session` + most recent Ask Session has `status === "errored"` → same: resolver SKIPS, picks next older `done` or falls through to 24h.
  11. **(r4 codex F1 patch — buildRecapPrompt absolute-path validator)** `buildRecapPrompt({sinceIso, repoPath: "relative/path"})` THROWS (non-absolute rejected).
  12. **(r4 codex F1 patch — buildRecapPrompt full substitution)** `buildRecapPrompt({sinceIso, repoPath: "/Users/test/repo"})` returns a string where none of the placeholder/legacy forms (`<SINCE_ISO>`, `<REPO_PATH>`, `${SINCE_ISO}`, `${REPO_ROOT}`) appear as literal substrings.
  13. **(r5 codex F1 patch — `~/...` default preference home expansion)** When `prefs.repoPath = "~/Desktop/Project_echo"` (the shipped Raycast default), recap.tsx home-expands BEFORE calling `buildRecapPrompt`; the resulting `buildRecapPrompt` call receives the absolute expanded form (e.g., `/Users/<user>/Desktop/Project_echo`) and returns successfully. Test mocks `os.homedir()` and `expandHome()` to verify the chain.
  All ISO outputs end with `Z` (UTC canonical).

- **`recap.test.tsx`** — eight cases minimum (renumbered post-r7/r8 cuts):
  1. Form-submit constructs the prompt with the resolved since interpolated.
  2. Agent profile selection honors `preferences.agentKind` (mocked profile registry).
  3. Detail view unmount calls `tree-kill` on the subprocess PID (mocked agent-runner).
  4. **(r1 F2 patch)** `package.json`'s `recap` command preferences include `agentKind`, `customCommand`, `repoPath`, `claudeOauthToken`, and `defaultSinceWindow` — duplicated under the recap command, not migrated to extension-level.
  5. **(r2 codex-ops F1 patch)** A custom-agent recap spawn (mocked `agentKind: "custom"` with a stdin-template `customCommand`) passes through the recap prompt via stdin AND the resulting `child_process.spawn` options include `cwd: <mocked repoPath>`. Asserts the cwd contract for custom commands so relative-path reads in the recap prompt resolve against the project repo.
  6. **(r3 + r8 codex-ops F2 patches — combined)** Daemon-down non-blocking + audit timeout: (a) with `probeEchoDaemon()` mocked to fail, the recap subprocess still spawns and streams; (b) with `/mcp/recent-calls` mocked to NEVER resolve, the `AbortController` fires at the 5s timeout, the sidebar transitions to "audit unavailable," AND the markdown answer continues streaming uninterrupted. The audit fetch is ONE shot at Detail-view mount; the test asserts NO repeating-poll fetch occurs.
  7. **(r4 codex-ops F2 patch)** Form-level validation on invalid `userInput`: a non-empty TextField value that doesn't parse as ISO with explicit timezone causes the resolver to throw `InvalidSinceInputError`; recap.tsx catches it and renders a visible Form error or failure toast. The subprocess MUST NOT spawn in this case (silent-fallback rejected). Asserted via mocked Form submit + assertion the agent-runner was NOT invoked.
  8. **(r8 option-F resolution)** No LocalStorage write: the test mocks a full recap flow (Form → spawn → stream → Detail unmount) and asserts that NO `LocalStorage.setItem` call was made under any `echo.sessions.v1.row.*` key. Recap is ephemeral; persistence is structurally absent.

All tests must pass under root `npm test` AND `tools/raycast-echo/` `npm test`. Typecheck (`tsc --noEmit`) must pass in both roots.

### AC6 — README + dogfooding contract

`tools/raycast-echo/README.md` gains a new "Recap" section AFTER the existing "Ask ECHO" section. Contents:

- Install assumptions (codex and/or claude on PATH — same as Ask ECHO).
- **Per-command preference configuration (r6 codex-ops F1 patch).** Raycast preferences are command-scoped, NOT extension-scoped. The Recap command ships with its OWN duplicated `agentKind` / `customCommand` / `repoPath` / `claudeOauthToken` preference entries (per AC1 r1 codex F2 patch), each with the SAME defaults as the Ask ECHO command but a separately-persisted user value. **Operators upgrading from Ask-ECHO-only MUST configure the Recap command's preference panel explicitly on first run** — the values do NOT inherit from the Ask command. README provides a step-by-step: (1) Run Raycast → search for "Recap" → press ⌘, → configure agentKind, customCommand (if any), repoPath, claudeOauthToken (if Claude); (2) verify the recap command's own preference panel shows the values; (3) then run "Recap". Plus the new `defaultSinceWindow` dropdown (Recap-only) with default "Since last session".
- The three output sections (A/B/D) and the ≤500-word total budget.
- **Dogfooding template** — 7-field shape (the standard 6 + `Repo` field per item 060) with REQUIRED marker line `**Surface:** Recap` for grep-checkable journal-gate accounting.
- **Daemon-down dogfooding step (r6 codex-ops F2 patch link).** Recap is filesystem-first; verify a recap completes successfully with `echoctl daemon stop` running. The agent-side MCP fallback is best-effort per AC3; the daemon being down MUST NOT prevent A/B/D rendering from file + git sources.

### AC7 — Founder-gate via dogfooding journal

This item is "shipped" (in the V1-learning sense) only when dogfooding evidence accumulates. **Gate**: ≥3 founder-flagged journal entries containing the marker `**Surface:** Recap` across ≥2 calendar days in `raw/internal/dogfooding/mcp-interactions-journal-2026-05.md` (or the then-current month's shard). Mechanically checkable via fixed-string match (r2 codex F3 / codex-ops F2 patch — leading `**` regex repetition operator fails BSD grep): `grep -Fc '**Surface:** Recap' raw/internal/dogfooding/mcp-interactions-journal-*.md`. Equivalent escaped-regex form for documentation: `grep -c '^\*\*Surface:\*\* Recap' ...`. At least one ✅ (right) and at least one 🟡/❌ (partial/wrong) verdict must appear, demonstrating real dogfooding rather than rubber-stamp logs.

The gate does NOT block merge — merge is gated on AC1–AC6 + reviewer convergence. The gate determines when this v0 surface is considered "validated by dogfooding" and the data is ready to inform any V1 hotkey-overlay redesign that intersects.

## Out of Scope (Don't Drift)

### #1 — No new MCP tool
The recap reads via `find_clusters` + `get_atoms` + `read_file` (the agent's own filesystem read). NO new MCP tool is added. The MCP surface stays unchanged.

### #2 — No new `coord_emit` event type
The receipt-shape thinking surveyed during brainstorming is REJECTED. `combined.md` + task-state + agent-runs already cover the use case. The coord ledger stays lifecycle/deadline only. If a builder is tempted to add `decision_receipt` to `src/coord/types.ts`, STOP — that's drift.

### #3 — No daemon-side LLM call
Per `raw/internal/decisions/2026-05-06-v15-trace-layer-design.md:48-53`, "LLM natural-language brief on the daemon read path" is REJECTED for trust/hallucination reasons. The recap is consumer-side agent composition only. NO daemon endpoint that returns synthesized prose is added.

### #4 — No OS notification / push interrupt
The audit explicitly cut this for V1. The Continue hero + escalation atoms in `combined.md` already provide visibility on next-session-open. Push interrupts would violate `felt-not-seen` and are unjustified by current pain. If V1.5+ dogfooding shows missed-critical signal, that's a NEW spec.

### #5 — No empty-Enter hijack
The existing landing-state (empty input → `find_clusters` list → Continue hero confidence-gated row) is preserved verbatim. The recap is invoked via an EXPLICIT command path (Raycast root-search → "Recap" → press Enter). Adding silent recap-on-empty-Enter is REJECTED.

### #6 — No threading, no follow-ups
Single-shot is the structural defense against drift-prevention Pattern 5 ("chat with ECHO"). Re-asking is a NEW recap session. The Detail view does NOT render an input field for follow-up turns. If a builder is tempted to add "ask follow-up" to the Detail view — STOP.

### #7 — No modification to existing `echo.tsx`, `system-prompt.ts`, `EmptyState.tsx`, `SessionsList.tsx`, `SessionDetail.tsx`, or any other Ask ECHO component
The recap is fully additive AT THE EXTENSION LEVEL but is also fully **isolated** from Ask ECHO's surfaces. The shipped Ask ECHO command, the Continue hero, and the SessionsList/SessionDetail components are preserved BYTE-IDENTICALLY. Reviewers MUST reject any diff that touches `src/echo.tsx`, `src/components/EmptyState.tsx`, `src/components/SessionsList.tsx`, `src/components/SessionDetail.tsx`, `src/lib/system-prompt.ts`, or `src/lib/sessions.ts`. The r1-r7 attempts to add cross-command fork routing or recap-session-disable branches in these components were all CUT per r8 option-F — recap is ephemeral, never persisted to a Session row, never appearing in any Ask-side list. (Note: prior `ask-context.tsx` was unified into `echo.tsx` per item 063; this OoS reflects the current shipped layout.)

### #8 — Strategist-only files
`docs/BACKLOG.md`, `wiki/**`, `docs/STATUS.md`, `docs/NORTH_STAR.md` are out of scope per `docs/AGENT_INSTRUCTIONS.md` — builders MUST NOT write to them. The strategist will add the Ready-table row separately at spec commit; the strategist will update the relevant hotkey-overlay wiki page (today `wiki/surfaces/hotkey-overlay.md`; will be `hotkey-overlay-raycast.md` once that page is committed as part of the in-flight Raycast v0 post-shipment wiki work) post-shipment with the recap command documentation.

### #9 — No modification to the `Session` interface or any LocalStorage write
Per r8 option-F resolution, Recap session persistence is DROPPED ENTIRELY for V1. `tools/raycast-echo/src/lib/sessions.ts` is NOT in files_to_modify. No `recapWindow` field. No `Session.normalize` round-trip. No LocalStorage write under any `echo.sessions.v1.row.*` key. Reviewers MUST reject any diff that touches `sessions.ts` or that writes a Recap result to LocalStorage. Recap is ephemeral by design; persistence is V1.5+ scope (see V1.5+ Followup section below).

### #10 — No telemetry / phone-home
Following Ask ECHO's "single-user dogfooding, zero phone-home" stance per 062's contract. The recap command logs locally via the dogfooding journal discipline; no remote telemetry endpoint is added.

## V1.5+ Followup — deferred from this spec

The following capabilities were considered and **explicitly deferred** to V1.5+ as part of the r8 option-F resolution. If V1 dogfooding shows demand, the strategist files these as new backlog items:

1. **Recap session persistence + SessionsList integration.** Recap is ephemeral in V1. V1.5+ may add Session-row write + filtered display in SessionsList + read-only inspection. Gate: ≥3 founder-flagged journal entries explicitly asking "where's the recap I ran yesterday?" or "show me past recaps."
2. **Cmd-R Recap fork from the Ask command's surface.** Requires Raycast `launchCommand` API integration to cross command-scoped preference boundaries. Gate: same as (1) + concrete UX evidence that "open Recap manually" is too high-friction.
3. **Multi-call `get_atoms` chunking for large clusters.** V1 caps at 50 atoms (bounded-subset, best-effort). V1.5+ could fetch full cluster contents via multiple chunked calls, then sort by timestamp on the consumer side. Gate: dogfooding journal showing the bounded-subset misses important atoms.
4. **Per-cluster timestamp sort before bounded-subset selection.** Today `find_clusters.atom_ids` is lexicographic UUID order. A daemon-side change to return newest-first ordering directly (or a sibling MCP tool that does) would let the bounded subset actually be the newest 50. Out of scope here.

## After Completion (Strategist Notes)

When this item lands in `backlog/complete/`, the strategist updates:

1. **`wiki/surfaces/hotkey-overlay-raycast.md`** (if then-committed as part of Raycast v0 post-shipment work) **OR `wiki/surfaces/hotkey-overlay.md`** — add a new section "Recap (077)" documenting the command, the system prompt sources, and the dogfooding contract gate. Cross-link to this item from the "Commands Shipped" subsection.
2. **`wiki/principles/drift-prevention.md`** — add a worked-example callout: "Recap (077) is the explicit-action complement to Continue hero, NOT a chat companion." This reinforces Pattern 5's structural defense across future surfaces.
3. **No new wiki page is created for the recap as a separate surface** — it is one feature inside the existing hotkey-overlay surface.
4. **`.manifest.json`** updated only if a new wiki page is created (none expected per (3)); regenerate `wiki/index.md` via `tools/wiki_index.py`.

## Expected merge conflicts

- `tools/raycast-echo/package.json` — version field and commands array; conflict-resolvable by accepting both: keep existing `echo` command, add `recap` command, take higher version.
- `tools/raycast-echo/src/lib/sessions.ts` — NOT modified per r8 option-F; no conflict expected.
- `tools/raycast-echo/README.md` — if a sibling item adds a different new section, append-only resolution.

## Cross-vendor consult log (brainstorming round)

Five codex consults during the 2026-05-27 brainstorming session (claude strategist, codex consultee, founder orchestrator). All read-only; no MCP-call-by-proxy escalations beyond two `search_memories` queries (both 0 matches, journaled inline).

1. Push vs pull architecture — converged on hybrid, pull-dominant.
2. Org-management lens (advisor↔PhD-students) — converged on hub-and-spoke, three human-facing surfaces (overlay + escalation + audit page), routing-policy as load-bearing.
3. Reuse audit — converged on minimum-viable Raycast prompt variant; cut decision-receipt event, cut OS notifications, cut severity classifier as component.
4. Deep-dive on 5 gaps — converged on principle compliance ("needs care"), scope grows by one input source (`raw/internal/agent-runs/*.md`), rejected empty-Enter hijack.
5. Final locks — converged 3-for-3 on (a) new explicit command, (i) since-last-session default, (β) `backlog/ready/` location.

Full transcripts preserved in `/tmp/codex-*-output.md` (founder-orchestrator workspace; not committed to repo).
