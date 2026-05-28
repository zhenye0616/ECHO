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
  - tools/raycast-echo/src/echo.tsx  # AC2.6 — minimal additive change ONLY: in the existing fork-action path, detect when the source session carries `recapWindow` and route the fork through the Recap prompt + new Recap session (instead of the Ask follow-up prompt). Recap forks must NOT call the Ask system prompt. See AC2 #5 + AC5 (recap-context.test.tsx) for the test requirement. NO other echo.tsx changes are permitted (system prompt, empty-state hero, sessions list rendering — all unchanged).
  - tools/raycast-echo/src/lib/recap-system-prompt.ts  # AC3 — pinned single-shot system prompt teaching the agent to read combined.md + task-state + agent-runs + git log + recent dogfooding journal entries + MCP find_clusters/get_atoms, then render A/B/D-organized narrative. Snapshot-tested to prevent accidental edits.
  - tools/raycast-echo/src/lib/since-resolver.ts  # AC4 — pure function `resolveSinceWindow(prefs, sessions, nowMs): { sinceIso: string, source: "user" | "last_session" | "fallback_24h" }`. Precedence: (a) explicit user input, (b) most recent Session row with status ∈ {done, cancelled, errored} → use its `completedAt ?? startedAt`, (c) 24h fallback if no qualifying session exists.
  - tools/raycast-echo/src/lib/sessions.ts  # AC2.5 — additive ONLY: add `recapWindow?: { sinceIso: string; source: "user" | "last_session" | "fallback_24h" }` to the Session interface. `normalizeSession` round-trips the optional field through every write path. NO other Session-shape changes are permitted per OoS #9.
  - tools/raycast-echo/test/recap-system-prompt.test.ts  # AC5 — vitest snapshot test on the system prompt body string; intentionally fragile so any edit forces an explicit snapshot refresh (same defense as system-prompt.test.ts).
  - tools/raycast-echo/test/since-resolver.test.ts  # AC5 — vitest cases pinning all three precedence branches: user-input wins, last-session wins when no user input, 24h fallback when no qualifying session, and the status-filter (a `running` session is NOT a qualifying "last session" — only terminal-state sessions count).
  - tools/raycast-echo/test/recap.test.tsx  # AC5 — vitest cases covering the Form → spawn → Detail wiring (mock agent-runner). At minimum: prompt-construction includes the resolved since, agent-profile selection is honored, cancellation kills subprocess tree, AND a recap-session fork constructs a NEW Recap session (NOT an Ask follow-up) — see AC2 #5. Tests import through `tools/raycast-echo/test/raycast-api-mock.ts`; if that mock lacks `Form` namespace and `Action.SubmitForm` exports, extend it minimally (r2 codex F2 patch — extending the mock is allowed; it is test-support infrastructure, NOT a production-API change).
  - tools/raycast-echo/test/raycast-api-mock.ts  # AC5 (r2 codex F2 patch) — additive-only: extend the existing Raycast API mock to export the `Form` namespace (TextField, Dropdown components used by Form view) AND `Action.SubmitForm`. The mock must remain a faithful shadow of `@raycast/api@1.104.17`'s actual surface — verified by importing from this mock in recap.test.tsx and asserting the form renders + onSubmit fires.
  - tools/raycast-echo/README.md  # AC6 — new "Recap" section: install assumptions (same agent CLIs as Ask ECHO — codex/claude/custom on PATH), preferences walkthrough (defaultSinceWindow), the A/B/D output shape, dogfooding template (7-field with `**Surface:** Recap` marker line for gate-checkable journal entries).

spec_refs:
  - backlog/complete/2026-05-18-062-ask-echo-raycast-llm-qa.md  # Ask ECHO architectural precedent this spec mirrors: subprocess agent, pinned prompt, audit endpoint, single-shot by design. Recap inherits ALL of Ask ECHO's "what it does not do" defenses (no threading, no follow-ups, no daemon-side LLM).
  - tools/raycast-echo/src/echo.tsx  # current single unified Raycast command (per item 063's unification, which removed the earlier `ask-context.tsx`). Structurally the model for recap.tsx (Form → Detail → tree-kill cancellation). Recap reads echo.tsx as a pattern reference AND adds the minimal AC2.6 fork-routing branch; no other modifications permitted.
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
- Extension `preferences` array gains one optional entry:
  - `name: "defaultSinceWindow"`, `type: "dropdown"`, `title: "Default Recap Window"`, `default: "last_session"`, `data: [{title: "Since last session", value: "last_session"}, {title: "Last 24 hours", value: "24h"}, {title: "Last 4 hours", value: "4h"}]`.
- Extension version bumped (semver minor).

**Preference scoping (r1 codex F2 / codex-ops F2 patch):** in Raycast, preferences declared under a command are command-scoped — they are NOT visible to a sibling command. Since the existing `echo` command owns `agentKind`, `customCommand`, `repoPath`, and `claudeOauthToken` at command-scope, the new `recap` command MUST **duplicate** these four preference entries under its own command block in `package.json` (NOT migrate them to extension-level — migration would reset existing user-set values for ECHO). The duplicate entries MUST use identical `name` / `type` / `title` / `description` / `data` shapes so the Recap command's `getPreferenceValues()` returns the same TypeScript-typed object as Ask ECHO's. Test requirement (AC5 / recap.test.tsx): a vitest case loading the package.json and asserting that the `recap` command's `preferences` array contains entries for all four duplicated names plus the new `defaultSinceWindow`. Existing user-set ECHO preferences MUST survive the upgrade — verified by a dogfooding step in the README install walkthrough (manual reviewer check: `agentKind` value present in Raycast preferences before+after extension reload).

### AC2 — Recap command entry point + UI flow

`tools/raycast-echo/src/recap.tsx` is the new command's entry point. The filename matches the manifest convention (`name: "recap"` → `src/recap.tsx`, mirroring `name: "echo"` → `src/echo.tsx`). It mirrors `echo.tsx`'s shape:

1. **Form view** (initial): one optional `Form.TextField` "Since (ISO timestamp or empty for default)", one `Form.Dropdown` "Window" pre-populated from preferences, and one `Action.SubmitForm` "Recap" (r2 codex F2 patch — verified against `@raycast/api@1.104.17` exports; the API surface ships `Action.SubmitForm`, NOT a `Form.SubmitFormAction` export). Reviewers should reject any diff that references `Form.SubmitFormAction`.
2. **Resolve `since`** via `resolveSinceWindow()` (AC4) on submit. The resolved ISO timestamp + source label (`user | last_session | fallback_24h`) are passed forward.
3. **Detail view** (post-submit): identical to Ask ECHO's Detail rendering — streaming markdown answer (throttled `setMarkdown` per 80ms or on subprocess exit), `Detail.Metadata` sidebar populated from `GET /mcp/recent-calls` (reusing `lib/audit.ts` verbatim), header label includes the resolved since + source.

3a. **Daemon-down non-blocking contract (r3 codex-ops F2 patch):** Recap's evidence sources are filesystem-first (combined.md / task-state / agent-runs / git log / journal); MCP is only the optional final fallback. Therefore the existing Ask ECHO `probeEchoDaemon()` hard-fail preflight MUST NOT gate Recap. Recap-context.tsx EITHER (a) skips the daemon probe entirely, OR (b) calls it non-blockingly (timeout + ignore failure). The agent subprocess spawns regardless of daemon state; the `Detail.Metadata` sidebar shows "audit unavailable" when `/mcp/recent-calls` fails, but the streaming markdown answer is not blocked. Test pinned in `recap.test.tsx` (AC5 case 7 below): daemon-mocked-down → recap still spawns and streams; sidebar reports unavailable.
4. **Cancellation**: dismounting the Detail view triggers `tree-kill` on the subprocess, identical to Ask ECHO.
5. **Persistence**: the Recap session is written to LocalStorage as a regular `Session` row (see 063's sessions-as-objects model), with a NEW field `recapWindow: { sinceIso: string, source: "user" | "last_session" | "fallback_24h" }` added to the Session interface. Recap sessions appear in the existing `SessionsList` view.

6. **Cmd-R routing for Recap sessions (r1 codex F4 / codex-ops F4 patch):** the existing ⌘R "Ask again from this" action in `echo.tsx` currently builds an Ask follow-up prompt from the source session's question. For Recap sessions (identified by `session.recapWindow !== undefined`), ⌘R MUST instead construct a NEW Recap session — same `recapWindow` (or a fresh one derived from the current resolver call), same Recap system prompt, same agent profile. ⌘R on a Recap session MUST NOT route through the Ask follow-up path; doing so would silently violate single-shot via Ask-vs-Recap prompt mismatch. The branch lives in echo.tsx's fork-action handler (AC2.6 files_to_modify entry); test pinned in `recap.test.tsx` (AC5).

7. **Custom-agent cwd contract (r2 codex-ops F1 patch):** the recap prompt instructs the spawned agent to read repo-relative paths (`backlog/...`, `raw/...`) and run `git log` against the project repo. For `agentKind: "codex"` and `agentKind: "claude"`, the existing `agent-profiles.ts` invocation already sets the subprocess `cwd` to the repo root (verified by reviewer at `src/lib/agent-profiles.ts:36-69`). For `agentKind: "custom"`, the recap-context entry point MUST either (a) explicitly set `spawn({cwd: repoPath, ...})` for the subprocess, OR (b) refuse to spawn if the user-configured `customCommand` template lacks a `{repoPath}` interpolation token. Recommendation: (a) — set `cwd: repoPath` unconditionally for custom recap invocations; it is structurally less brittle than depending on template content. Test pinned in `recap.test.tsx` (AC5): a custom-command recap spawn passes through the recap prompt via stdin AND the resulting `child_process.spawn` options include `cwd: <mocked repoPath>`.

Single-shot is the structural defense against drift-prevention Pattern 5. The Recap command MUST NOT support follow-up turns, in-session continuation, or re-prompting. Re-asking = a NEW Recap session (either ⌘R on a prior recap, or a fresh Raycast → "Recap" invocation).

### AC3 — Pinned recap system prompt

`tools/raycast-echo/src/lib/recap-system-prompt.ts` exports a single constant string `RECAP_SYSTEM_PROMPT` that:

1. Tells the agent it is a **single-shot recap renderer** for the founder of ECHO, who has been out of the loop since `${SINCE_ISO}`. The agent must compose a strategist-grade narrative organized by three drift axes.
2. Instructs the agent to read these SIX input sources (in order), filtering by **stable embedded timestamps** rather than filesystem `mtime` (r1 codex-ops F3 patch — mtime reflects checkout/touch time, not artifact authorship; a fresh clone or rebase would over-include old files):
   - `backlog/reviews/**/r*/combined.md` is the **ONLY authoritative B-axis source** (r4 codex-ops F1 patch). The recap MUST treat a round as having a final disposition ONLY if its `combined.md` exists. Reviewer response files (`r*/codex.md` / `r*/codex-ops.md` / `r*/claude.md` / `r*/cursor.md`) MAY be read for context BUT MUST be reported in the recap as "in-flight (round rN, no convergence yet)" when no sibling `combined.md` exists. Reporting reviewer findings as decisions during the race window where reviewers have landed but the watcher hasn't combined yet would create false continuity — the exact failure the feature is designed to prevent. Filtering by **canonical frontmatter timestamp field per file kind** (r2 codex F1 patch): `combined.md` uses `combined_at`, reviewer response files use `completed_at`, request files use `requested_at`. Each file is included iff its canonical field parses as ISO and is `> ${SINCE_ISO}`. Each `combined.md` carries verdicts, severity-tagged findings, and dispositions — the canonical B-axis evidence.
   - `backlog/task-state/<task-id>/*.md` files enumerated via `git log --since="${SINCE_ISO}" --name-only --pretty=format: -- 'backlog/task-state/**'` (touched-since-window via git, NOT mtime). Read current_thesis + open_questions + dont_touch — canonical D-axis evidence.
   - `raw/internal/agent-runs/*.md` files enumerated via `git log --since="${SINCE_ISO}" --name-only --pretty=format: -- 'raw/internal/agent-runs/**'`. Read each file's "Decisions Made During Implementation" section (and adjacent sections) — B-axis evidence for non-spec-round work.
   - `git log --since="${SINCE_ISO}" --oneline --stat HEAD` (NOT `${SINCE_ISO}..HEAD` — Git treats the ISO timestamp as a revision name and fails with `fatal: invalid object name`; r1 codex F3 / codex-ops F1 patch). Followed by selective `git diff <sha>~..<sha>` on the highest-impact commits the log surfaces. A-axis evidence.
   - `raw/internal/dogfooding/mcp-interactions-journal-*.md` — parse `### YYYY-MM-DD HH:MM PDT` headers and include entries whose timestamp is `> ${SINCE_ISO}` (header-embedded timestamp, NOT mtime). Cross-tool MCP activity; verifies what ECHO knew when.
   - MCP `find_clusters({since: <SINCE_ISO>, repo_path: <REPO_PATH>})` followed by `get_atoms({atom_ids: <top cluster>, prefer: "newest_first"})` ONLY if the four file-based sources above leave gaps (raw cross-tool conversation context). **Both `<SINCE_ISO>` and `<REPO_PATH>` are template placeholders substituted at prompt construction time** (r4 codex F1 patch). The `repo_path` MUST be an absolute filesystem path (the MCP validator at `src/mcp/util/repo-path.ts:35-38` rejects non-absolute strings). The substitution is performed by `buildRecapPrompt({ sinceIso, repoPath })` — see AC4a below.
3. Pins the output format to three markdown sections, in this order: `## A — Code changed`, `## B — Decisions`, `## D — Direction`. Each section ≤200 words. A final `## Sources` line lists which inputs were used.
4. Forbids: producing the recap without reading the actual artifacts; inventing decisions not present in `combined.md` or run logs; recommending changes the founder didn't ask for; following up or asking clarifying questions (single-shot).
5. Total prompt body MUST be < 4096 characters (vendor-portable upper bound) and snapshot-tested. The snapshot test runs against the TEMPLATE constant `RECAP_SYSTEM_PROMPT_TEMPLATE` (with placeholders), NOT against `buildRecapPrompt()` output (which would be path-dependent and break in CI). The snapshot test (AC5 / recap-system-prompt.test.ts) additionally asserts the verbatim presence of: (a) the corrected `git log --since="<SINCE_ISO>" ... HEAD` command form (not `<SINCE_ISO>..HEAD`), (b) the `git log --since ... --name-only` enumeration pattern for task-state and agent-runs, (c) the no-mtime constraint, (d) the journal-entry header parser for timestamp filtering, (e) **the per-file-kind canonical timestamp field**: `combined_at` for `combined.md`, `completed_at` for reviewer response files, `requested_at` for request files (r2 codex F1 patch), (f) **the in-flight labeling rule** (r4 codex-ops F1 patch): the prompt verbatim states `combined.md` is the ONLY authoritative B-axis source and reviewer-only rounds without combined.md MUST be reported as "in-flight," and (g) **the placeholder tokens** `<SINCE_ISO>` and `<REPO_PATH>` are present in the TEMPLATE constant (r4 codex F1 patch). These seven assertions structurally prevent regression back to the r1/r2/r3/r4-broken forms.

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

1. **`userInput` non-empty AND valid** (parses as ISO 8601 with explicit `Z` or `+HH:MM` timezone) → `source: "user"`.
2. **`userInput` non-empty AND invalid** → **throw `InvalidSinceInputError`** (r4 codex-ops F2 patch). The Form caller in recap.tsx MUST catch this and render a visible Form error (`Form.TextField.error` or `showToast({style: Failure})`); the recap MUST NOT silently fall through to a different window when the user explicitly typed something. Silent-fallback would produce a recap over a window the user did not intend, with no operator-visible signal that the input was wrong.
3. **`userInput` empty AND `windowPref === "last_session"`** → find the most recent `Session` with **`status === "done"`** AND (if the session carries `recapWindow`, additionally requiring a non-empty `answer` field — i.e., the recap actually produced output). Use `completedAt ?? startedAt`. **`status ∈ {"running", "cancelled", "errored"}` sessions are NOT qualifying** (r3 codex-ops F1 patch): `running` because the founder isn't trying to recap their currently-open session; `cancelled`/`errored` because a failed/aborted attempt would poison the next default window — the next Recap would start AFTER the failed timestamp, silently excluding the artifacts the founder was trying to recover. If no qualifying session exists → fall through to (6) with `source: "fallback_24h"`.
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

`buildRecapPrompt` performs string substitution of `<SINCE_ISO>` → `args.sinceIso` and `<REPO_PATH>` → `args.repoPath`. Pre-condition: `args.repoPath` MUST be an absolute path (matches the MCP `find_clusters` `repo_path` validator at `src/mcp/util/repo-path.ts:35-38`); non-absolute → throw. Post-condition: the returned string MUST NOT contain any of `<SINCE_ISO>`, `<REPO_PATH>`, `${SINCE_ISO}`, `${REPO_ROOT}` literals — fully-substituted prompt only. Recap.tsx is the SOLE call site; it MUST call `buildRecapPrompt({sinceIso: resolved.sinceIso, repoPath: prefs.repoPath})` and pass the result to `agentRunner`.

`windowPref === "24h"` → `now - 24h`. `windowPref === "4h"` → `now - 4h`. Both bypass the session lookup.

Returns ISO-8601 with explicit `Z` suffix (UTC canonical), matching `src/capture/pipeline.ts:17-44`'s timestamp canonicalization.

### AC5 — Tests

Three vitest test files added under `tools/raycast-echo/test/`:

- **`recap-system-prompt.test.ts`** — snapshot test on the full prompt body string. Intentionally fragile — any edit to the prompt content fails this test until the snapshot is explicitly refreshed (`vitest --update`). Same defense pattern as `system-prompt.test.ts`. Additionally asserts: prompt body < 4096 chars; mentions all six input sources; mentions all three drift axes by name.

- **`since-resolver.test.ts`** — twelve cases minimum:
  1. user-input valid ISO → `source: "user"`
  2. **(r4 codex-ops F2 patch)** user-input non-empty AND invalid → **throws `InvalidSinceInputError`** (NOT silent fall-through)
  3. windowPref=`last_session` + qualifying `done` session present → uses `completedAt`, `source: "last_session"`
  4. windowPref=`last_session` + qualifying `done` session has null `completedAt` → uses `startedAt`, `source: "last_session"`
  5. windowPref=`last_session` + only `running` sessions present → falls through to 24h, `source: "fallback_24h"`
  6. windowPref=`last_session` + zero sessions → 24h, `source: "fallback_24h"`
  7. **(r4 codex-ops F2 patch)** windowPref=`24h` → `now - 24h`, `source: "window_24h"` (NOT `"fallback_24h"`)
  8. **(r4 codex-ops F2 patch)** windowPref=`4h` → `now - 4h`, `source: "window_4h"`
  9. **(r3 codex-ops F1 patch)** windowPref=`last_session` + most recent session is `cancelled` Recap → resolver SKIPS it, uses the next older `done` session OR falls through to 24h (`source: "fallback_24h"`).
  10. **(r3 codex-ops F1 patch)** windowPref=`last_session` + most recent session is `errored` Recap → same: resolver SKIPS, picks next older `done` or falls through to 24h.
  11. **(r4 codex F1 patch — buildRecapPrompt absolute-path validator)** `buildRecapPrompt({sinceIso, repoPath: "relative/path"})` THROWS (non-absolute rejected).
  12. **(r4 codex F1 patch — buildRecapPrompt full substitution)** `buildRecapPrompt({sinceIso, repoPath: "/Users/test/repo"})` returns a string where neither `<SINCE_ISO>`, `<REPO_PATH>`, `${SINCE_ISO}`, nor `${REPO_ROOT}` appears as a literal substring.
  All ISO outputs end with `Z` (UTC canonical).

- **`recap.test.tsx`** — eight cases minimum:
  1. Form-submit constructs the prompt with the resolved since interpolated into `${SINCE_ISO}`.
  2. Agent profile selection honors `preferences.agentKind` (mocked profile registry).
  3. Detail view unmount calls `tree-kill` on the subprocess PID (mocked agent-runner).
  4. **(r1 F2 patch)** `package.json`'s `recap` command preferences include `agentKind`, `customCommand`, `repoPath`, `claudeOauthToken`, and `defaultSinceWindow` — duplicated under the recap command, not migrated to extension-level.
  5. **(r1 F4 patch)** A Recap session (where `session.recapWindow !== undefined`) passed to the fork action constructs a NEW Recap session (asserted via the resulting prompt-construction call using the Recap system prompt, NOT the Ask system prompt).
  6. **(r2 codex-ops F1 patch)** A custom-agent recap spawn (mocked `agentKind: "custom"` with a stdin-template `customCommand`) passes through the recap prompt via stdin AND the resulting `child_process.spawn` options include `cwd: <mocked repoPath>`. Asserts the cwd contract for custom commands so relative-path reads in the recap prompt resolve against the project repo.
  7. **(r3 codex-ops F2 patch)** Daemon-down non-blocking contract: with `probeEchoDaemon()` mocked to fail, the recap subprocess still spawns and streams its markdown answer. The `Detail.Metadata` sidebar reports "audit unavailable" but does NOT prevent the answer from rendering.
  8. **(r4 codex-ops F2 patch)** Form-level validation on invalid `userInput`: a non-empty TextField value that doesn't parse as ISO with explicit timezone causes the resolver to throw `InvalidSinceInputError`; recap.tsx catches it and renders a visible Form error or failure toast. The subprocess MUST NOT spawn in this case (silent-fallback rejected). Asserted via mocked Form submit + assertion the agent-runner was NOT invoked.

All tests must pass under root `npm test` AND `tools/raycast-echo/` `npm test`. Typecheck (`tsc --noEmit`) must pass in both roots.

### AC6 — README + dogfooding contract

`tools/raycast-echo/README.md` gains a new "Recap" section AFTER the existing "Ask ECHO" section. Contents:

- Install assumptions (codex and/or claude on PATH — same as Ask ECHO).
- The three preference fields (existing `agentKind`/`customCommand` reused + new `defaultSinceWindow`).
- The three output sections (A/B/D) and the ≤500-word total budget.
- **Dogfooding template** — 7-field shape (the standard 6 + `Repo` field per item 060) with REQUIRED marker line `**Surface:** Recap` for grep-checkable journal-gate accounting.

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

### #7 — No modification to existing `echo.tsx` (beyond AC2.6), `system-prompt.ts`, or the Continue hero
The recap is mostly ADDITIVE. The shipped Ask ECHO command and the Continue hero are preserved byte-identically EXCEPT for the single AC2.6 fork-routing branch in `echo.tsx`'s fork-action handler — that branch dispatches to the Recap prompt when the source session carries `recapWindow`. Reviewers should reject any diff that touches `src/components/EmptyState.tsx` or `src/lib/system-prompt.ts`, and any `echo.tsx` change beyond the AC2.6 fork-routing branch. (Note: prior `ask-context.tsx` was unified into `echo.tsx` per item 063; this OoS reflects the current shipped layout.)

### #8 — Strategist-only files
`docs/BACKLOG.md`, `wiki/**`, `docs/STATUS.md`, `docs/NORTH_STAR.md` are out of scope per `docs/AGENT_INSTRUCTIONS.md` — builders MUST NOT write to them. The strategist will add the Ready-table row separately at spec commit; the strategist will update the relevant hotkey-overlay wiki page (today `wiki/surfaces/hotkey-overlay.md`; will be `hotkey-overlay-raycast.md` once that page is committed as part of the in-flight Raycast v0 post-shipment wiki work) post-shipment with the recap command documentation.

### #9 — No widening of the `Session` interface beyond `recapWindow`
The one additive Session field documented in AC2 (`recapWindow?: { sinceIso, source }`) is the ONLY allowed Session-shape change. Adding `recapHistory`, `recapVersion`, `recapAggregations`, etc. is drift. Builders feeling the urge — STOP.

### #10 — No telemetry / phone-home
Following Ask ECHO's "single-user dogfooding, zero phone-home" stance per 062's contract. The recap command logs locally via the dogfooding journal discipline; no remote telemetry endpoint is added.

## After Completion (Strategist Notes)

When this item lands in `backlog/complete/`, the strategist updates:

1. **`wiki/surfaces/hotkey-overlay-raycast.md`** (if then-committed as part of Raycast v0 post-shipment work) **OR `wiki/surfaces/hotkey-overlay.md`** — add a new section "Recap (077)" documenting the command, the system prompt sources, and the dogfooding contract gate. Cross-link to this item from the "Commands Shipped" subsection.
2. **`wiki/principles/drift-prevention.md`** — add a worked-example callout: "Recap (077) is the explicit-action complement to Continue hero, NOT a chat companion." This reinforces Pattern 5's structural defense across future surfaces.
3. **No new wiki page is created for the recap as a separate surface** — it is one feature inside the existing hotkey-overlay surface.
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
