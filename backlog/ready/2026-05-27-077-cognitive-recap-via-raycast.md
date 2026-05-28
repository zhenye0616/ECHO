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
  - tools/raycast-echo/src/recap-context.tsx  # AC2 — new command entry point. Form (optional `since` window text + dropdown {"since last session" (default), "last 24h", "last 4h", "custom ISO"}) → Detail (streaming markdown answer, same shape as ask-context.tsx). Cancellation via tree-kill on view dismount, identical to ask-context's pattern.
  - tools/raycast-echo/src/lib/recap-system-prompt.ts  # AC3 — pinned single-shot system prompt teaching the agent to read combined.md + task-state + agent-runs + git log + recent dogfooding journal entries + MCP find_clusters/get_atoms, then render A/B/D-organized narrative. Snapshot-tested to prevent accidental edits.
  - tools/raycast-echo/src/lib/since-resolver.ts  # AC4 — pure function `resolveSinceWindow(prefs, sessions, nowMs): { sinceIso: string, source: "user" | "last_session" | "fallback_24h" }`. Precedence: (a) explicit user input, (b) most recent Session row with status ∈ {done, cancelled, errored} → use its `completedAt ?? startedAt`, (c) 24h fallback if no qualifying session exists.
  - tools/raycast-echo/src/lib/sessions.ts  # AC2.5 — additive ONLY: add `recapWindow?: { sinceIso: string; source: "user" | "last_session" | "fallback_24h" }` to the Session interface. `normalizeSession` round-trips the optional field through every write path. NO other Session-shape changes are permitted per OoS #9.
  - tools/raycast-echo/test/recap-system-prompt.test.ts  # AC5 — vitest snapshot test on the system prompt body string; intentionally fragile so any edit forces an explicit snapshot refresh (same defense as system-prompt.test.ts).
  - tools/raycast-echo/test/since-resolver.test.ts  # AC5 — vitest cases pinning all three precedence branches: user-input wins, last-session wins when no user input, 24h fallback when no qualifying session, and the status-filter (a `running` session is NOT a qualifying "last session" — only terminal-state sessions count).
  - tools/raycast-echo/test/recap-context.test.tsx  # AC5 — vitest cases covering the Form → spawn → Detail wiring (mock agent-runner). At minimum: prompt-construction includes the resolved since, agent-profile selection is honored, cancellation kills subprocess tree.
  - tools/raycast-echo/README.md  # AC6 — new "Recap" section: install assumptions (same agent CLIs as Ask ECHO — codex/claude/custom on PATH), preferences walkthrough (defaultSinceWindow), the A/B/D output shape, dogfooding template (7-field with `**Surface:** Recap` marker line for gate-checkable journal entries).

spec_refs:
  - backlog/complete/2026-05-18-062-ask-echo-raycast-llm-qa.md  # Ask ECHO architectural precedent this spec mirrors: subprocess agent, pinned prompt, audit endpoint, single-shot by design. Recap inherits ALL of Ask ECHO's "what it does not do" defenses (no threading, no follow-ups, no daemon-side LLM).
  - tools/raycast-echo/src/ask-context.tsx  # sibling command structure — Form → Detail → tree-kill cancellation. Recap-context.tsx mirrors this file's shape; do NOT modify ask-context.tsx.
  - tools/raycast-echo/src/lib/agent-profiles.ts  # agent-invocation contract (reused unchanged). The recap command uses the SAME profile-selection logic; vendor-agnosticism stays at the agent-profile registry, not at an LLM SDK layer.
  - tools/raycast-echo/src/lib/agent-runner.ts  # subprocess spawn + stream contract (reused unchanged).
  - tools/raycast-echo/src/lib/system-prompt.ts  # the existing Ask ECHO system prompt — referenced as a style/length model for recap-system-prompt.ts; do NOT modify.
  - tools/raycast-echo/src/lib/sessions.ts  # Session shape (lines 8-24, 85-98) — `since-resolver.ts` reads sessions via the existing `LocalStorage.allItems()` + key-prefix iteration pattern. The resolver does NOT modify session storage.
  - tools/raycast-echo/src/lib/audit.ts  # existing /mcp/recent-calls fetcher — recap reuses it for the Detail.Metadata sidebar (no daemon changes; sidebar inherits Ask ECHO's audit shape verbatim).
  - wiki/architecture/coord-substrate-and-observability.md  # 057a lifecycle substrate — recap does NOT add a coord event type. Receipt-shape thinking is rejected; the coord ledger stays health/deadline only.
  - wiki/architecture/coord-active-trigger-and-role-emission.md  # 057b active emission — confirmed reviewer-only; builder/merger/watcher emission deferred. Recap reads coord atoms via existing MCP, does NOT emit any.
  - wiki/principles/drift-prevention.md  # Pattern 5 (chat UI trap) — single-shot constraint. The five-question test must pass at spec write AND at every reviewer round.
  - wiki/principles/context-as-moat.md  # "never ship a chat UI" — explicit. Recap is single-shot Q&A, NOT chat. Re-asking is a NEW recap session (fork-style, mirroring 063's "ask again from this" pattern).
  - wiki/principles/felt-not-seen.md  # L3 summoned overlay is explicitly allowed daily-use; "few minutes a month" applies to L5 (audit page) only.
  - wiki/principles/compose-not-capture.md  # 064 scope clarification: consumer-side projection of substrate data is allowed. Recap is projection, not capture.
  - wiki/surfaces/hotkey-overlay-raycast.md  # V0 surface this extends. Recap adds a SECOND command (parallel to `echo`); does NOT replace or override the existing landing-state behavior.
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
- Extension `preferences` array gains one optional entry:
  - `name: "defaultSinceWindow"`, `type: "dropdown"`, `title: "Default Recap Window"`, `default: "last_session"`, `data: [{title: "Since last session", value: "last_session"}, {title: "Last 24 hours", value: "24h"}, {title: "Last 4 hours", value: "4h"}]`.
- Extension version bumped (semver minor).

Existing `echo` command preferences (`agentKind`, `customCommand`, `repoPath`) are UNCHANGED and REUSED by the recap command at runtime. Adding the `recap` command MUST NOT cause Raycast to lose existing user-set `agentKind` / `customCommand` preferences (verified by reviewer: any preference-namespace change is rejected).

### AC2 — Recap command entry point + UI flow

`tools/raycast-echo/src/recap-context.tsx` is the new command's entry point. It mirrors `ask-context.tsx`'s structure exactly:

1. **Form view** (initial): one optional `Form.TextField` "Since (ISO timestamp or empty for default)", one `Form.Dropdown` "Window" pre-populated from preferences, and one `Form.SubmitFormAction` "Recap".
2. **Resolve `since`** via `resolveSinceWindow()` (AC4) on submit. The resolved ISO timestamp + source label (`user | last_session | fallback_24h`) are passed forward.
3. **Detail view** (post-submit): identical to Ask ECHO's Detail rendering — streaming markdown answer (throttled `setMarkdown` per 80ms or on subprocess exit), `Detail.Metadata` sidebar populated from `GET /mcp/recent-calls` (reusing `lib/audit.ts` verbatim), header label includes the resolved since + source.
4. **Cancellation**: dismounting the Detail view triggers `tree-kill` on the subprocess, identical to Ask ECHO.
5. **Persistence**: the Recap session is written to LocalStorage as a regular `Session` row (see 063's sessions-as-objects model), with a NEW field `recapWindow: { sinceIso: string, source: "user" | "last_session" | "fallback_24h" }` added to the Session interface. Recap sessions appear in the existing `SessionsList` view; ⌘R "Ask again from this" forks a NEW recap session (does not thread).

Single-shot is the structural defense against drift-prevention Pattern 5. The Recap command MUST NOT support follow-up turns, in-session continuation, or re-prompting. Re-asking = a new Recap invocation.

### AC3 — Pinned recap system prompt

`tools/raycast-echo/src/lib/recap-system-prompt.ts` exports a single constant string `RECAP_SYSTEM_PROMPT` that:

1. Tells the agent it is a **single-shot recap renderer** for the founder of ECHO, who has been out of the loop since `${SINCE_ISO}`. The agent must compose a strategist-grade narrative organized by three drift axes.
2. Instructs the agent to read these SIX input sources (in order):
   - `backlog/reviews/**/r*/combined.md` files with `mtime > since` (decision artifacts; each `combined.md` carries verdicts, severity-tagged findings, and dispositions — the canonical B-axis evidence).
   - `backlog/task-state/<task-id>/*.md` files with `mtime > since` (current_thesis + open_questions + dont_touch — canonical D-axis evidence).
   - `raw/internal/agent-runs/*.md` files with `mtime > since` (builder's "Decisions Made During Implementation" sections — B-axis evidence for non-spec-round work).
   - `git log --oneline --stat ${SINCE_ISO}..HEAD` + selective `git diff` on the highest-impact commits (A-axis evidence).
   - `raw/internal/dogfooding/mcp-interactions-journal-*.md` entries with timestamp `> since` (cross-tool MCP activity; verifies what ECHO knew when).
   - MCP `find_clusters({since: ${SINCE_ISO}, repo_path: "${REPO_ROOT}"})` followed by `get_atoms({atom_ids: <top cluster>, prefer: "newest_first"})` ONLY if the four file-based sources above leave gaps (raw cross-tool conversation context).
3. Pins the output format to three markdown sections, in this order: `## A — Code changed`, `## B — Decisions`, `## D — Direction`. Each section ≤200 words. A final `## Sources` line lists which inputs were used.
4. Forbids: producing the recap without reading the actual artifacts; inventing decisions not present in `combined.md` or run logs; recommending changes the founder didn't ask for; following up or asking clarifying questions (single-shot).
5. Total prompt body MUST be < 4096 characters (vendor-portable upper bound) and snapshot-tested.

### AC4 — `since-resolver.ts`

`tools/raycast-echo/src/lib/since-resolver.ts` exports a pure function:

```ts
export type SinceSource = "user" | "last_session" | "fallback_24h";
export interface ResolvedSince { sinceIso: string; source: SinceSource; }

export function resolveSinceWindow(
  userInput: string | undefined,    // raw Form TextField value
  windowPref: "last_session" | "24h" | "4h",  // dropdown value
  sessions: readonly Session[],     // LocalStorage-loaded sessions
  nowMs: number = Date.now(),
): ResolvedSince;
```

Precedence (deterministic, easy to test):

1. **`userInput`** parses as a valid ISO timestamp (with `Z` or `+HH:MM`) → `source: "user"`.
2. **`windowPref === "last_session"`** → find the most recent `Session` with `status ∈ {"done", "cancelled", "errored"}`; use `completedAt ?? startedAt`. **`status: "running"` sessions are NOT qualifying** (the founder isn't trying to recap their currently-open session). If no qualifying session exists → fall through to (3).
3. **Fallback** → `now - 24h`, `source: "fallback_24h"`.

`windowPref === "24h"` → `now - 24h`. `windowPref === "4h"` → `now - 4h`. Both bypass the session lookup.

Returns ISO-8601 with explicit `Z` suffix (UTC canonical), matching `src/capture/pipeline.ts:17-44`'s timestamp canonicalization.

### AC5 — Tests

Three vitest test files added under `tools/raycast-echo/test/`:

- **`recap-system-prompt.test.ts`** — snapshot test on the full prompt body string. Intentionally fragile — any edit to the prompt content fails this test until the snapshot is explicitly refreshed (`vitest --update`). Same defense pattern as `system-prompt.test.ts`. Additionally asserts: prompt body < 4096 chars; mentions all six input sources; mentions all three drift axes by name.

- **`since-resolver.test.ts`** — eight cases minimum:
  1. user-input ISO wins over windowPref
  2. user-input invalid → falls through to windowPref
  3. windowPref=`last_session` + qualifying session present → uses `completedAt`
  4. windowPref=`last_session` + qualifying session has null `completedAt` → uses `startedAt`
  5. windowPref=`last_session` + only `running` sessions present → falls through to 24h
  6. windowPref=`last_session` + zero sessions → 24h
  7. windowPref=`24h` → `now - 24h` regardless of sessions
  8. windowPref=`4h` → `now - 4h` regardless of sessions
  All ISO outputs end with `Z` (UTC canonical).

- **`recap-context.test.tsx`** — three cases minimum:
  1. Form-submit constructs the prompt with the resolved since interpolated into `${SINCE_ISO}`.
  2. Agent profile selection honors `preferences.agentKind` (mocked profile registry).
  3. Detail view unmount calls `tree-kill` on the subprocess PID (mocked agent-runner).

All tests must pass under root `npm test` AND `tools/raycast-echo/` `npm test`. Typecheck (`tsc --noEmit`) must pass in both roots.

### AC6 — README + dogfooding contract

`tools/raycast-echo/README.md` gains a new "Recap" section AFTER the existing "Ask ECHO" section. Contents:

- Install assumptions (codex and/or claude on PATH — same as Ask ECHO).
- The three preference fields (existing `agentKind`/`customCommand` reused + new `defaultSinceWindow`).
- The three output sections (A/B/D) and the ≤500-word total budget.
- **Dogfooding template** — 7-field shape (the standard 6 + `Repo` field per item 060) with REQUIRED marker line `**Surface:** Recap` for grep-checkable journal-gate accounting.

### AC7 — Founder-gate via dogfooding journal

This item is "shipped" (in the V1-learning sense) only when dogfooding evidence accumulates. **Gate**: ≥3 founder-flagged journal entries containing the marker `**Surface:** Recap` across ≥2 calendar days in `raw/internal/dogfooding/mcp-interactions-journal-2026-05.md` (or the then-current month's shard). Mechanically checkable: `grep -c "^**Surface:** Recap" raw/internal/dogfooding/mcp-interactions-journal-*.md`. At least one ✅ (right) and at least one 🟡/❌ (partial/wrong) verdict must appear, demonstrating real dogfooding rather than rubber-stamp logs.

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

### #7 — No modification to existing `ask-context.tsx`, `system-prompt.ts`, or the Continue hero
The recap is ADDITIVE. The shipped Ask ECHO command and the Continue hero are preserved byte-identically. Reviewers should reject any diff that touches `ask-context.tsx`, `src/components/EmptyState.tsx`, or `src/lib/system-prompt.ts`.

### #8 — Strategist-only files
`docs/BACKLOG.md`, `wiki/**`, `docs/STATUS.md`, `docs/NORTH_STAR.md` are out of scope per `docs/AGENT_INSTRUCTIONS.md` — builders MUST NOT write to them. The strategist will add the Ready-table row separately at spec commit; the strategist will update `wiki/surfaces/hotkey-overlay-raycast.md` post-shipment with the recap command documentation.

### #9 — No widening of the `Session` interface beyond `recapWindow`
The one additive Session field documented in AC2 (`recapWindow?: { sinceIso, source }`) is the ONLY allowed Session-shape change. Adding `recapHistory`, `recapVersion`, `recapAggregations`, etc. is drift. Builders feeling the urge — STOP.

### #10 — No telemetry / phone-home
Following Ask ECHO's "single-user dogfooding, zero phone-home" stance per 062's contract. The recap command logs locally via the dogfooding journal discipline; no remote telemetry endpoint is added.

## After Completion (Strategist Notes)

When this item lands in `backlog/complete/`, the strategist updates:

1. **`wiki/surfaces/hotkey-overlay-raycast.md`** — add a new section "Recap (077)" documenting the command, the system prompt sources, and the dogfooding contract gate. Cross-link to this item from the "Commands Shipped" subsection.
2. **`wiki/principles/drift-prevention.md`** — add a worked-example callout: "Recap (077) is the explicit-action complement to Continue hero, NOT a chat companion." This reinforces Pattern 5's structural defense across future surfaces.
3. **No new wiki page is created for the recap as a separate surface** — it is one feature inside the existing `hotkey-overlay-raycast` v0 surface.
4. **`.manifest.json`** updated only if a new wiki page is created (none expected per (3)); regenerate `wiki/index.md` via `tools/wiki_index.py`.

## Expected merge conflicts

- `tools/raycast-echo/package.json` — version field and commands array; conflict-resolvable by accepting both: keep existing `echo` command, add `recap` command, take higher version.
- `tools/raycast-echo/src/lib/sessions.ts` — if the `Session` interface is touched by a parallel item, the additive `recapWindow?` field reconciles cleanly.
- `tools/raycast-echo/README.md` — if a sibling item adds a different new section, append-only resolution.

## Cross-vendor consult log (brainstorming round)

Five codex consults during the 2026-05-27 brainstorming session (claude strategist, codex consultee, founder orchestrator). All read-only; no MCP-call-by-proxy escalations beyond two `search_memories` queries (both 0 matches, journaled inline).

1. Push vs pull architecture — converged on hybrid, pull-dominant.
2. Org-management lens (advisor↔PhD-students) — converged on hub-and-spoke, three human-facing surfaces (overlay + escalation + audit page), routing-policy as load-bearing.
3. Reuse audit — converged on minimum-viable Raycast prompt variant; cut decision-receipt event, cut OS notifications, cut severity classifier as component.
4. Deep-dive on 5 gaps — converged on principle compliance ("needs care"), scope grows by one input source (`raw/internal/agent-runs/*.md`), rejected empty-Enter hijack.
5. Final locks — converged 3-for-3 on (a) new explicit command, (i) since-last-session default, (β) `backlog/ready/` location.

Full transcripts preserved in `/tmp/codex-*-output.md` (founder-orchestrator workspace; not committed to repo).
