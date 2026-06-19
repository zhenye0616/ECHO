---
id: 2026-06-18-103-ceo-context-loop-n2
title: "eng→CEO context loop — capture decision rationale (the 'why') + a minimal scoped read-view; validate the one-directional read loop (Slack/meetings split to 104)"
status: proposed
priority: HIGH
estimate: 1-2d (engineering MVP) + multi-day validation observation
created: 2026-06-18
blocked_by: []
task_state_ref: 2026-06-18-103-ceo-context-loop-n2
requested_reviewers: ["codex", "codex-ops"]
ready_content_sha: dd4c967fa78fbb1ccd7b2deebf690768eaaf93a576ea53cae8df46c215c6fd82
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-06-19T19:30:22Z"
branch: "agent/ceo-context-loop-n2"
worktree: "/Users/zhenye/Desktop/Project_echo--ceo-context-loop-n2"
head_sha: "4ab9b08f4888e07b314faccbf846c1a6ae64b126"
pr_url: ""
agent_notes: |
  Implemented AC2 as a dependency-free Slack Socket Mode responder under `src/surfaces/ceo-slack-responder/`: outbound Slack connection, scoped ECHO `search_memories` query gated by required absolute `ECHO_CEO_CONTEXT_REPO_PATH`, Slack reply posting, and the minimal one-line AC4 usage record. Tests/typecheck/lint pass; AC1/AC3 live validation remains founder-run as specified.
review_notes: ""
---

> **STRIPPED 2026-06-19 (disposition discipline) — re-opened to `proposed/`.** The two-Codex auto-review
> converged (5 rounds, both `proceed`) but via **patch-deeper drift**: the reframe gate fired R2/R3/R4 —
> each round found bugs in the *previous round's patches*, and the watcher patched instead of removing.
> The result hardened a *cheap n=2 validation* into a production access-control + audit system
> (pre-shared-secret auth, fail-closed startup, ngrok tunnel + child-PID revocation, a UUID/session/
> intent-enum event schema). Strategist + founder removed it per CLAUDE.md "prefer removal over deeper
> patching." This is the restored validation MVP. **Reviewers: the removed scaffolding is out of scope by
> founder decision (see Out of Scope) — do NOT re-add; escalate to founder if you believe one item is
> load-bearing *for the n=2 validation specifically*.**

## Why

_(Created 2026-06-18; realigned 2026-06-19 with the reasoning-layer fidelity test; trimmed to eng→CEO;
**stripped 2026-06-19** back to the validation MVP after the auto-review over-built it.)_

The 2026-06-18 office-hours (session 2) interrogation narrowed last session's federated-ecosystem
direction into the *actual* next sprint. Headline finding: **the thing that closes the CEO loop is
captured decision *rationale* (the "why"), not shared data.**

**REFINEMENT (2026-06-19 fidelity test):** a reasoning layer over already-unified context + a thin
captured rationale (the Linear JUS-17 line + funnel numbers) **produced a faithful CEO-grade "why" —
founder-confirmed (positive n=1).** Validates the context-layer→reasoning-layer architecture. **The real
failure mode is not "no answer" — it's a *fluent, confident, possibly-confabulated* answer.** Fluency ≠
fidelity; the fix is one-line rationale capture at decision time, orthogonal to capture-breadth.

**This is the eng→CEO half of the loop — the validated direction with the observed pain.** The CEO
questioned why observability was a priority; the founder had to manually translate it to a business
"why." The CEO is the **consumer**; the founder is the **producer** of context he *already generates*
(eng exhaust + Linear, both already in ECHO — no new capture surface). The reciprocal meetings→founder
leg is **item 104** (Slack capture), split out so it can't block this validated half.

**The wedge it tests:** *will one human self-serve another's context instead of interrupting them* — and,
in its sharpest form, *does a sync skip the "what happened" recap because a party arrived pre-loaded?*

## Locked decisions

- **Premise #1 (founder accepted):** the gap is *capturing the why*, not *sharing the data*.
- **Architecture endorsed:** context-layer-first + reasoning-layer-on-top; captured rationale makes the
  why *faithful*, not merely *fluent*.
- **The AC1 fidelity fix is the one-line "why" habit, not capture-breadth.**
- **No federation, no CEO install.** The CEO only *queries* the founder's ECHO over a scoped slice.
- **Build the MINIMUM that lets the n=2 test run honestly.** This is a validation experiment with one
  trusted cofounder on a local machine — not a product. No production access-control/observability.

## Acceptance criteria

1. **AC1 — Faithful-why proof (the solo pre-flight; gates everything after it). Bar = FIDELITY, not production.**
   The 06-19 test showed the reasoning layer *can* produce a fluent CEO-grade why, founder-confirmed
   faithful (positive n=1). AC1 asks: *does it produce a why the author would stand behind, across
   decisions, rather than a confident confabulation?*
   - Capture rationale (why / priority / tradeoff / what-it-prevents) for ~3 likely-questioned decisions
     in a queryable form ECHO already ingests: a one-line `WHY:` comment on the Linear ticket OR a short
     `raw/internal/decisions/YYYY-MM-DD-<slug>-why.md` note (1–3 sentences). No new capture surface.
   - **Blind grading (recommended):** generate whys for 3–4 decisions, some deliberately under-grounded;
     founder flags which are faithful *without knowing which is which* (beats agreement bias). Record in
     `raw/internal/interviews/2026-06-19-ac1-blind-grading.md` (decision, generated why, verdict, source).
   - **Pass:** ≥3 of 4 graded faithful → proceed. **Fail:** the layer confidently produces unfaithful whys
     the author can't distinguish → STOP and escalate; a confabulating loop is worse than no loop.
2. **AC2 — Slack-backed scoped read-view (the access surface — chosen 2026-06-19, option C).** The CEO
   asks his *"why did we decide X?"* in **Slack** (a DM to a bot, or a designated channel); a small
   **responder running on the founder's machine** answers from a **scoped slice** of the founder's eng
   context. This is the only real build in 103. Hard requirements:
   - **Scope (the one real access concern):** answers only from the *relevant eng context* (e.g. the
     justinian.ai decisions/eng context), **NOT** the founder's entire cross-project ECHO.
   - **Slack is the surface AND the auth boundary:** the CEO asks where he already is. **Slack workspace
     membership + the bot token is the access boundary** — no separate pre-shared secret. The responder
     connects **outbound** to Slack (**Socket Mode**), so **nothing on the founder's machine is exposed to
     the internet** — no inbound endpoint, no tunnel. (This is why C beats a raw tunnel.)
   - **Minimal build (~1–2d):** a Slack app (bot token + Socket Mode) + a small listener that, on a
     question in the designated channel/DM, runs the scoped ECHO query and posts the answer back. Nothing
     more.
   - **Slack is the *validation* surface; a customized/bespoke query surface is POST-VALIDATION only**
     (founder, 2026-06-19 — "easy to validate before we build a customized surface").
   - Explicitly **NOT** required (still out of scope per the strip): fail-closed ceremony, the
     UUID/session/intent-enum event schema, a productized proxy, inbound auth/tunnels.
3. **AC3 — n=2 setup.** The CEO actually queries the founder's scoped eng context in a real two-person
   configuration. (No CEO install; meetings→founder is 104.)
4. **AC4 — Minimal usage signal.** Observe whether the CEO **self-serves a why-query unprompted**, whether
   it **recurs** (>once, distinct occasions), and whether he **interrupted the founder anyway afterward**
   (the tell that the answer didn't satisfy). **With Slack as the surface, most of this is visible in Slack
   itself** — whether he posted a why-question to the bot unprompted vs. DM'd the founder directly. The
   responder appends a one-line record per answered query (`timestamp · unprompted? · satisfied-or-DMed-
   anyway`) to `raw/internal/ceo-loop-events.md`; a founder tally is acceptable for n=2. **No**
   UUID/session/intent-enum schema.

**Definition of done (validation) — two signals, either is a strong positive:**
- **(primary)** the CEO self-serves a why-query **unprompted, ≥2 times across distinct occasions**, not
  followed by interrupting the founder; AND/OR
- **(sharper — the wedge firing)** a **sync where the eng-recap got skipped** because the CEO arrived
  pre-loaded from the read-view (he opened with "on X — what's next?" instead of "what happened with X?").

If he shrugs / never queries / always DMs anyway after the pre-flight is in place, the loop is dead
regardless of architecture — record that honestly as the result.

## Out of Scope (Don't Drift)

- **Production access-control + audit infrastructure (DELIBERATELY REMOVED 2026-06-19, founder decision).**
  Includes: pre-shared-secret auth, fail-closed startup, `127.0.0.1`/`--public`/ngrok tunnel + child-PID
  lifecycle/revocation, no-bearer-leakage rules, a productized local proxy (`proxy.ts`/`package.json`/
  README-as-DoD), and the UUID/`session_id`/`intent_category`-enum/interruption-annotation event schema.
  These were patched in over review R1–R4 (patch-deeper drift); they solve a multi-user/remote/adversarial
  threat model that **does not exist** for an n=2 test with a trusted cofounder on a local machine.
  **POST-VALIDATION productization only** — reintroduce ONLY if the loop validates and you productize.
  Reviewers: do not re-add; escalate if you think one is load-bearing *for the n=2 validation*.
- **Customized/bespoke query surface** (a dedicated web/hotkey/desktop UI) — deferred. Slack is the
  *validation* surface; build a custom surface only if the loop validates (founder, 2026-06-19).
- **Granola / meetings ingestion (CEO→founder)** — item 104 (Slack capture).
- **Federation / B2 multi-party / consent matrix** — team scale only. See [[project_cross_human_ecosystem_bet]].
- **CEO installs/runs ECHO** — not required; query-only.
- **New Slack / Linear / PM capture** — none here. (Linear already flows into ECHO and grounds the eng-why.)
- **Rewriting shipped-reality docs** (`wiki/`, `v1-spec`, CLAUDE.md scope) — strategy record only until validated.
- **The orchestration loop stays completely personal** — this touches context retrieval, not claim→review→merge.

## files_to_modify

_AC2 is a small Slack responder (the only build); AC1/AC3/AC4 are founder-executed validation. Builder
confirms the lightest shape at claim time; **MUST NOT** touch MCP server core, capture pipeline, `wiki/`,
or `docs/BACKLOG.md`._

- **(the build — AC2)** a small Slack responder: a Slack app (bot token + **Socket Mode**, outbound-only) +
  a listener that, on a question in the designated channel/DM, runs a **scoped** ECHO query and posts the
  answer back. Likely a new `src/surfaces/ceo-slack-responder/` (builder proposes lightest shape).
  **Shares the Slack app / integration foundation with item 104 (Slack capture) — coordinate; do NOT stand
  up two separate Slack apps.**
- **(validation artifacts, founder-authored, no builder code)** `raw/internal/interviews/2026-06-19-ac1-blind-grading.md`; `raw/internal/decisions/YYYY-MM-DD-*-why.md`; `raw/internal/ceo-loop-events.md` (one-line usage log).

## spec_refs

- `raw/internal/decisions/2026-06-18-office-hours-ceo-loop-rationale-capture.md` (design doc — READ FIRST; incl. the 06-19 wedge refinement + the disposition note)
- `raw/internal/decisions/2026-06-18-office-hours-cross-human-context-ecosystem.md` (session 1 — long-term direction)
- `raw/internal/dogfooding/mcp-interactions-journal-2026-06-claude.md` (06-18 16:30 + 06-19 10:45 entries)
- Sibling item: `backlog/proposed/2026-06-18-104-slack-meeting-context-capture.md` (the meetings→founder Slack leg)
- Memory: `project_ceo_loop_rationale_capture`, `project_cross_human_ecosystem_bet`

## After Completion (Strategist Notes)

- **Do NOT write wiki pages until the DoD signal actually fires.** Validation experiment, not shipped reality.
- Validates (CEO self-serves >once, or a sync skips the recap) → likely a `research/` page ("n=2 eng→CEO context-loop validation").
- Does NOT validate → record the negative result in `raw/internal/decisions/`; a dead loop re-gates the federation bet.
- Symmetry (bidirectional) restored when 104 (Slack) ships; revisit federation **only** if this loop cleared.
