---
id: 2026-06-18-103-ceo-context-loop-n2
title: "eng→CEO context loop — capture decision rationale (the 'why') + a single-consumer read-view; validate the one-directional read loop (Granola/meetings split to 104)"
status: proposed
priority: HIGH
estimate: 2-4d (engineering) + multi-day validation observation
created: 2026-06-18
blocked_by: []
task_state_ref: 2026-06-18-103-ceo-context-loop-n2
requested_reviewers: ["codex", "codex-ops"]
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

## Why

_(Created 2026-06-18; realigned 2026-06-19 with the reasoning-layer fidelity test; **trimmed 2026-06-19** to the eng→CEO direction — the meetings→founder/Granola leg split to sibling item 104.)_

The 2026-06-18 office-hours (session 2) interrogation narrowed last session's federated-ecosystem
direction into the *actual* next sprint. The headline finding holds: **the thing that closes the
CEO loop is captured decision *rationale* (the "why"), not shared data.**

**REFINEMENT (2026-06-19 reasoning-layer fidelity test):** a reasoning layer (strong LLM) over
**already-unified context + a thin captured rationale** (the Linear JUS-17 ticket line + funnel
attrition numbers) **produced a faithful CEO-grade "why" — founder-confirmed it matched his actual
reason for prioritizing observability (positive n=1).** This validates the
"context-layer-first + reasoning-on-top" architecture. **The real failure mode is NOT "no answer" —
it is a *fluent, confident, possibly-confabulated* answer.** Fluency ≠ fidelity. The load-bearing
fix is **one-line rationale capture at decision time**, which is **orthogonal to capture-breadth**.

**This item is the eng→CEO half of the loop — the *validated direction* with the observed pain.**
Today the CEO questioned why the observability layer was a priority; the founder had to **manually
translate** the technical decision into a business "why." That hand-labor under friction is the
burned-insurance signal. The CEO is the **consumer**; the founder is the **producer** of context he
*already generates*. The eng-why is grounded by eng exhaust + Linear, **both already flowing into
ECHO** — no new capture surface required.

**Why one-directional (and why that's fine):** this tests the load-bearing hypothesis — *will one
other human self-serve another human's context instead of interrupting them?* — on the direction
that has the only observed demand datapoint, with **zero external-API dependency.** The reciprocal
direction (founder consuming the CEO's meetings) is the **additive** leg, gated on an unverified
Granola API, and is split to **item 104** so it cannot block this validated half. Asymmetry here is
a *sequencing artifact*, restored to symmetry when 104 ships — not a design stance.

## Locked decisions (2026-06-18 session-2 + 2026-06-19 realignment & trim)

- **Premise #1 (founder accepted):** the gap is *capturing the why*, not *sharing the data*.
- **Architecture endorsed:** context-layer-first + reasoning-layer-on-top. The reasoning layer
  produces the why; captured rationale makes it *faithful* not merely *fluent*.
- **The AC1 fidelity fix is the one-line "why" habit, NOT capture-breadth.** Free, immediate,
  independent of how many surfaces are wired.
- **No federation, no install required for this direction (2026-06-19 simplification).** For the CEO
  to *consume* the founder's eng context he only needs to **query** the founder's ECHO via the
  read-view (a link/interface) — he does **NOT** need to run ECHO on his machine. The only thing
  that ever required capture on the CEO's machine was his Granola, which is now item 104. This
  collapses the n=2 adoption ask from "install ECHO + wire Granola" to "open a link, ask a question."
- **Mandatory pre-flight:** seed rationale capture for ~3 likely-questioned decisions BEFORE the CEO
  queries, so his first query is not a confabulation that teaches him "this doesn't help me" and
  burns the one cheap-but-not-free adoption ask. (AC1 mechanism already has a positive n=1 — the
  pre-flight now hardens *fidelity*, not basic capability.)

## Acceptance criteria

1. **AC1 — Faithful-why proof (the solo pre-flight; gates everything after it).**
   The bar is **FIDELITY, not production.** The 06-19 test showed the reasoning layer *can* produce a
   fluent CEO-grade why and one was founder-confirmed faithful (**positive n=1**). So AC1 is **"does it
   produce a why the author would stand behind, across decisions, rather than a confident
   confabulation."**
   - Capture rationale (why / priority / tradeoff / what-it-prevents) for ~3 likely-questioned
     decisions in a queryable form ECHO ingests (the one-line-why habit). **Concrete format:** a
     one-line `WHY:` comment appended to the relevant Linear ticket description OR a short
     `raw/internal/decisions/YYYY-MM-DD-<slug>-why.md` note (1–3 sentences max). ECHO ingests these
     via its existing Linear MCP capture + filesystem watcher; no new capture surface required.
   - **Rigorous (recommended) test — blind grading:** generate whys for 3–4 decisions, some
     deliberately under-grounded; founder flags which are faithful *without knowing which is which*
     (per the project's blind-holdout discipline). Mere agree-with-a-plausible-paragraph is the weak
     version, vulnerable to agreement bias.
   - **Grading record location:** blind-grading results stored in
     `raw/internal/interviews/2026-06-19-ac1-blind-grading.md` (one row per decision: decision label,
     generated why, founder faithful/unfaithful verdict, actual rationale source).
   - **Pass threshold:** ≥3 of 4 decisions graded faithful by founder. Fewer than 3 → STOP; do not
     proceed to AC2/AC3.
   - **Fail condition:** the reasoning layer confidently produces *unfaithful* whys the author can't
     distinguish from faithful ones → STOP and escalate; a confabulating loop is worse than no loop.
2. **AC2 — CEO read-view (the engineering core).** A read-only query/chat surface onto the founder's
   eng context, exposable to exactly one other person, that answers "why did we decide X?" in
   business terms. Single-consumer, founder-controlled, **not** productized, **not** multi-tenant,
   **not** a consent matrix. Does NOT require the CEO to run ECHO.
   - **Required path — local proxy:** ALL CEO queries MUST go through the founder-run local proxy
     (see `files_to_modify`). The `claude --mcp` session alternative is NOT permitted because it
     cannot enforce the event log (AC4). The proxy is the single audited path; no other surface is
     an accepted implementation.
   - **Fail-closed startup:** the proxy MUST refuse to start if the pre-shared secret is unset or
     empty (`exit 1` with a clear error). It MUST bind to `127.0.0.1` by default; any public
     listener (e.g., ngrok tunnel) requires an explicit founder-run flag (`--public` or equivalent).
     Unattended starts MUST NOT expose the ECHO MCP context wider than loopback.
   - **Auth boundary:** a single non-empty pre-shared secret (env var `CEO_LOOP_SECRET` or CLI
     `--secret` flag) required to talk to the proxy.
   - **No bearer-link leakage:** the shared link/command MUST NOT embed the secret in the URL path
     or query string; the secret is passed as an HTTP header or an interactive CLI prompt. **Proxy
     logs** (the new surface built by this item) MUST NOT record raw query text, bearer/secret
     values, or any content that would expose founder context. Existing MCP server logging is
     **out of scope for modification** — the builder MUST verify via `grep -r "query\|request"
     src/mcp-server/` that no raw query is logged there, and record the result in README; if found,
     escalate to founder rather than patching MCP core.
   - **Tunnel revocation — managed child lifecycle:** when `--public` is passed, the start script
     spawns ngrok (or equivalent) as a child process, records its PID, traps SIGINT/SIGTERM, and on
     exit sends `kill <tunnel-pid>` (specific child PID — NOT `kill 0`, which signals the calling
     shell's process group). The start script MUST fail with a non-zero exit if tunnel fails to
     start. Stopping the proxy MUST terminate the tunnel.
   - **Demo command (DoD for AC2):** a concrete start command and CEO query command/URL in
     `src/surfaces/ceo-read-view/README.md`:
     ```
     CEO_LOOP_SECRET=<secret> npx ts-node src/surfaces/ceo-read-view/proxy.ts [--public]
     ```
     Both the founder start command and CEO-side query must be in the README before AC2 is accepted.
3. **AC3 — n=2 setup (eng→CEO only).** The CEO can query the founder's eng context via the read-view
   in a real two-person configuration. (No CEO install, no Granola — that's 104.)
4. **AC4 — The watch-signal instrumented.** A way to observe whether the CEO *self-serves a "why"
   query instead of interrupting the founder* — unprompted, and whether it recurs (>once). This is
   the definition-of-done signal; not "done" until observable in real use.
   - **Durable event record:** the read-view proxy appends a JSON-L entry to
     `raw/internal/ceo-loop-events.jsonl` for **every query**, with fields:
     - `event_id`: UUID (stable identifier for annotation references)
     - `event_type`: `"query"` (for query events) or `"interruption_annotation"` (see below)
     - `session_id`: UUID generated at proxy startup, shared across all queries in one session
     - `timestamp`: ISO-8601 UTC
     - `consumer_id`: fixed slug (e.g. `"ceo"`) — never raw identity
     - `intent_category`: a fixed/pre-defined category label chosen by the proxy from an
       enumeration (e.g. `"why_decision"`, `"priority_rationale"`, `"tradeoff"`, `"other"`);
       MUST NOT record raw query text or any portion of it
     - `success`: boolean — did the MCP server return a non-empty result?
     - `prompted_by_founder`: boolean — true if proxy was started with `--prompted-by-founder` flag;
       false otherwise (all queries in an unprompted session are classified unprompted)
   - **Post-hoc interruption annotation:** when the founder observes the CEO asked the same question
     directly afterward, the founder appends a **separate** annotation event to the same file:
     - `event_id`: new UUID
     - `event_type`: `"interruption_annotation"`
     - `query_event_id`: the `event_id` of the prior query event being annotated
     - `timestamp`: ISO-8601 UTC
     - `note`: short text (e.g. `"CEO DM'd anyway 10min later"`)
     Append-only invariant: query events are NEVER modified; interruption is recorded as a sibling
     entry, joined by `query_event_id` at audit time.
   - **Event log path and resilience:** the proxy MUST resolve `raw/internal/ceo-loop-events.jsonl`
     relative to the **git repo root** (not CWD) at startup. It MUST create `raw/internal/` if
     absent (`mkdir -p`). It MUST emit a non-zero exit + clear error if the log file cannot be
     opened for append (permission error, read-only filesystem, etc.). Silent wrong-tree writes are
     a validation failure.
   - **Proxy log privacy:** proxy logs MUST NOT record raw query text, bearer/secret values, or any
     content that would expose founder context. MCP server logging is out of scope for modification
     (see auth boundary note above).
   - **Audit command:** `tail -f raw/internal/ceo-loop-events.jsonl | jq .` gives the live feed.
     Validation is complete (DoD for AC4) when the following jq query returns `"pass": true`:
     ```
     jq -s '(map(select(.event_type=="interruption_annotation") | .query_event_id) | unique) as $interrupted
       | map(select(.event_type=="query" and .success == true and .prompted_by_founder == false
           and (.event_id as $id | ($interrupted | index($id) | not))))
       | {count: length, sessions: (map(.session_id) | unique | length),
          pass: (length >= 2 and (map(.session_id) | unique | length) >= 2)}' \
       raw/internal/ceo-loop-events.jsonl
     ```
     The `pass: true` condition requires ≥2 successful, unprompted query events that have NO linked
     `interruption_annotation`, across ≥2 distinct sessions. Queries followed by interruption do not
     count toward validation.

**Definition of done (validation):** the CEO self-serves a "why" query unprompted, more than once,
instead of interrupting the founder. If he shrugs / never queries after the pre-flight is in place,
the loop is dead regardless of architecture — record that honestly as the result.

## Out of Scope (Don't Drift)

- **Granola / meetings ingestion (the CEO→founder direction)** — split to **item 104**. Do not build
  any meeting-capture surface in this item.
- **Federation / B2 multi-party** — consent matrix, no-shared-store, each-runs-own-ECHO. Deferred to
  team scale (3+ with private context). See [[project_cross_human_ecosystem_bet]].
- **CEO installs/runs ECHO** — not required for eng→CEO consumption; the read-view is query-only.
- **Slack / Linear / PM capture as NEW build** — none here. (NB: Linear already flows into ECHO via
  captured `mcp__linear__*` calls and grounds the eng-why; no new work.)
- **Admin console, permission-mirroring, access-control UI, multi-tenant productization** — none.
  This is an n=2 validation experiment, build the minimum that lets the test run honestly.
- **Rewriting shipped-reality docs** (`wiki/`, `wiki/product/v1-spec.md`, CLAUDE.md V1 scope) —
  strategy record only until this validates.
- **The orchestration loop stays completely personal** — this item touches context capture/retrieval,
  NOT the claim→review→build→merge loop. See [[project_cross_human_ecosystem_bet]].

## files_to_modify

_The engineering core (AC2) is a founder-run local proxy + event log. Concrete candidate paths —
builder confirms at claim time; out-of-scope files MUST NOT be touched:_

- `src/surfaces/ceo-read-view/proxy.ts` (NEW — TypeScript/Node HTTP proxy; canonical and only shape;
  wraps the existing ECHO MCP server at its local HTTP address, which the proxy reads from env/config;
  no MCP server code changes permitted)
- `src/surfaces/ceo-read-view/package.json` (NEW — minimal Node package; `start` script runs proxy.ts
  via `ts-node`)
- `src/surfaces/ceo-read-view/README.md` (NEW — MUST contain: exact `CEO_LOOP_SECRET=... npx ts-node
  proxy.ts [--public]` start command; exact CEO query command/URL; tunnel PID revocation instructions;
  event log location; MCP log grep verification result)
- `tests/surfaces/ceo-read-view/proxy.test.ts` (NEW — unit tests: fail-closed on empty secret;
  loopback binding absent --public; event log repo-root resolution and JSONL append; intent_category
  value in enumeration; tunnel child PID management; mock MCP server call and non-empty response)
- `raw/internal/ceo-loop-events.jsonl` (NEW — append-only event log; created by proxy on first query)
- `raw/internal/interviews/2026-06-19-ac1-blind-grading.md` (NEW — blind grading record; human-
  authored by founder during AC1 pre-flight, not generated by builder)
- `raw/internal/decisions/YYYY-MM-DD-*-why.md` (glob — NEW rationale-note files the founder creates
  during AC1 capture; ECHO ingests via existing filesystem watcher; builder does not create these,
  but they are allowed artifacts the builder may reference in tests/docs)

_Builder MUST NOT touch `wiki/`, `docs/BACKLOG.md`, MCP server core, capture pipeline, or any
existing surface. AC1 and AC3 are founder-executed validation steps; they produce files in
`raw/internal/` but require no code changes._

## spec_refs

- `raw/internal/decisions/2026-06-18-office-hours-ceo-loop-rationale-capture.md` (this item's design doc — READ FIRST)
- `raw/internal/decisions/2026-06-18-office-hours-cross-human-context-ecosystem.md` (session 1 — long-term direction this refines)
- `raw/internal/dogfooding/mcp-interactions-journal-2026-06-claude.md` (06-18 16:30 + 06-19 10:45 entries — the translation + fidelity tests)
- Sibling item: `backlog/proposed/2026-06-18-104-granola-capture-surface.md` (the meetings→founder leg split from here)
- Memory: `project_ceo_loop_rationale_capture`
- Memory: `project_cross_human_ecosystem_bet`

## After Completion (Strategist Notes)

- **Do NOT write wiki pages until the watch-signal (AC4/DoD) actually fires.** This is a validation
  experiment; a wiki page documents shipped+validated reality.
- If the eng→CEO loop validates (CEO self-serves >once), likely wiki home is a new `research/` page
  ("n=2 eng→CEO context-loop validation").
- If it does NOT validate, record the negative result in `raw/internal/decisions/` — a dead loop is a
  high-value datapoint that re-gates the federation bet, not something to quietly drop.
- Symmetry (bidirectional loop) is restored when item 104 (Granola) ships; revisit the federation
  question **only** if the n=2 loop cleared.
