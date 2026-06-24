---
id: 2026-06-24-107-cross-team-decision-sync-slack
title: "Cross-team decision sync via Slack — share the derived decision layer peer-to-peer (cofounder↔cofounder); raw stays machine-scoped; piggyback decision extraction on Claude/Codex via skills + AGENTS.md/CLAUDE.md, gated by propose-confirm"
status: proposed
priority: HIGH
estimate: 2-3d (engineering) + multi-day n=2 onboarding validation
created: 2026-06-24
blocked_by: []
task_state_ref: 2026-06-24-107-cross-team-decision-sync-slack
requested_reviewers: ["codex", "codex-ops"]
ready_content_sha: 86e546b1fe4aac271f5392739f0dbeb735b6f874a9ec0f73a164de3aa1518f7f
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-06-24T05:42:01Z"
branch: "agent/cross-team-decision-sync-slack"
head_sha: "c4c97af92524a671cd4bb1cfcd2ac6cbe874c74c"
pr_url: ""
agent_notes: |
  BLOCKED: AC1 requires `derived:team-decisions` to be accepted/enforced at the capture gate, but `src/capture/gate.ts` is not listed in `files_to_modify`.
  Tried: read every spec_ref, inspected `src/capture/sources.ts`, `src/capture/gate.ts`, and derived-source usage. `sources.ts` already has a derived allowlist helper, but the gate parser only accepts `app`, `domain`, `fs`, `api`, and `git`, so `derived:` is currently rejected as `malformed_event`.
  Best-guess answer: add `src/capture/gate.ts` to `files_to_modify` and allow `derived:` through the existing derived allowlist; confidence high.
  Why escalated rather than guessing: builder stopping condition — AC1 cannot be implemented literally without modifying a file not listed in `files_to_modify`.
spec_refs:
  - backlog/complete/2026-06-18-103-ceo-context-loop-n2.md        # the Slack responder + scoped search_memories read loop this extends from eng→CEO to cofounder↔cofounder
  - src/surfaces/ceo-slack-responder/responder.ts                 # Socket Mode responder; the surface cross-team queries land on
  - src/surfaces/ceo-slack-responder/brain.ts                     # query-side reasoning over scoped ECHO atoms
  - backlog/complete/2026-06-21-106-granola-meeting-signal-extraction.md  # the derived decision/rationale/action layer + raw→derived two-scope precedent
  - wiki/architecture/storage.md                                  # append-only, random-id, no upsert — binds how decision atoms are written
  - wiki/architecture/capture-gate.md                             # source allowlist / gate model; the shared-vs-machine-scope boundary lives here
  - wiki/architecture/interface-layers.md                         # L1/L3/L5 vocabulary; cross-team query is an L3 surface, the share-confirm is an L5 trust moment
  - wiki/surfaces/mcp-server.md                                   # search_memories the responder calls
  - wiki/surfaces/audit-page.md                                   # L5 — the visible sharing boundary this item makes load-bearing
  - skills/role-typed-task-state.md                               # cross-tool protocol precedent; the piggyback extraction ships as a skill, not Claude-Code-specific glue
files_to_modify:
  # PROVISIONAL — finalized at ready-promotion. Builder confirms against the substrate before claiming.
  - skills/echo-emit-decision.md                                  # NEW — canonical cross-tool skill: on a decision-grade moment, draft a candidate decision atom
  - src/capture/sources.ts                                        # allowlist a team-scoped decision namespace (e.g. derived:team-decisions), distinct from machine-scoped raw
  - src/surfaces/ceo-slack-responder/decision-store.ts           # NEW (R1) — the shared decision store: append/query confirmed atoms; owns dedupe_key normalize + latest-wins (R4)
  - src/surfaces/ceo-slack-responder/propose-decision-tool.ts    # NEW (R2) — MCP `propose_decision` handler the piggyback skill calls; creates draft + posts confirm card (PROVISIONAL path)
  - src/surfaces/ceo-slack-responder/identity.ts                 # NEW (R3) — Slack user ↔ cofounder identity for CONFIRM ATTRIBUTION only; does not route raw access (raw drill-down deferred)
  - src/surfaces/ceo-slack-responder/draft-store.ts              # NEW (R5) — durable draft store keyed by draft_id; restart-safe confirm idempotency
  - src/mcp/server.ts                                            # register the `propose_decision` MCP tool (R2, codex r2 F1) — wires propose-decision-tool.ts into the callable surface
  - docs/onboarding/cross-team-decision-sync-runbook.md          # NEW (AC6, codex r2 F3) — short operator runbook for the 1-screen-share n=2 setup
  - src/surfaces/ceo-slack-responder/responder.ts                # add the propose-confirm message flow (draft → one-tap confirm/edit, idempotent per R5) + peer-scope query routing; sole writer to decision-store
  - src/surfaces/ceo-slack-responder/brain.ts                    # answer cross-team queries from the shared decision layer ONLY; never reach a peer's raw store
  - docs/onboarding/AGENTS.md.snippet                            # NEW — drop-in AGENTS.md block instructing Codex to call the emit-decision skill
  - docs/onboarding/CLAUDE.md.snippet                            # NEW — drop-in CLAUDE.md block instructing Claude Code to call the emit-decision skill
  - .claude/commands/echo-emit-decision.md                       # GENERATED by tools/sync-skills.sh from skills/echo-emit-decision.md (AC4) — NOT hand-edited; build runs sync-skills.sh + --check
  - tests/surfaces/ceo-slack-responder/cross-team-scope.test.ts  # NEW — cross-team decision query resolves shared layer; ANY raw-store access via the cross-team surface is refused (R1, R3 defer)
  - tests/surfaces/ceo-slack-responder/propose-confirm.test.ts   # NEW — nothing enters the shared store without an explicit confirm; missing confirm-target errors with NO draft created (R2)
  - tests/surfaces/ceo-slack-responder/confirm-idempotency.test.ts        # NEW (R5) — Slack retry/double-click consumes a draft once; no duplicate shared atoms
  - tests/surfaces/ceo-slack-responder/decision-store-latest-wins.test.ts # NEW (R4) — re-confirm appends; query returns latest; prior atoms immutable
---

> **Origin: 2026-06-24 launch-onboarding conversation (founder + Claude strategist).** Founder has decided to
> launch the scrappy V1 and onboard 2–3-person startups (two technical cofounders both living in Claude Code +
> Codex). The wedge that turns ECHO from a single-seat tool into a per-seat, team-retained product is
> **cross-team context** — and the founder's design call is to deliver it through **Slack as the shared surface**
> (the surface cofounders already collaborate on, and the one ECHO already works on), NOT through peer-to-peer
> sync of local stores. The layering: **raw context stays machine-scoped; only the derived *decision* layer is
> shared** — ECHO mirrors how human teams already communicate (you tell your cofounder "I moved auth to Postgres,"
> not the 200 lines behind it). This composes two shipped/specced primitives rather than building new substrate:
> 103's Slack responder (the read loop) and 106's raw→derived two-scope split (the decision layer).
>
> **Lifts/relates to [[project_v15_cleanup_pause]].** This is the first item whose trigger is the launch decision,
> not codebase cleanup. Spec-review should confirm the pause posture before promoting `proposed/ → ready/`.

## Why

ECHO is already beyond usable at n=1 (3 months of founder dogfooding). The cold-start problem is solved for the
individual. What is NOT yet delivered is the moment that makes a 2-cofounder startup a slam-dunk: **cofounder B's
in-tool AI has no idea what cofounder A decided while B was asleep.** Closing that gap is worth more than product
delight — it changes the economics (2–3 seats per company, not 1) and the retention curve (leaving ECHO becomes a
*coordination* cost between cofounders, not a personal one). Team context is sticky in a way individual context is not.

The risk that kills this is **install friction and a broken trust model at n=2.** ECHO's wedge is on-device privacy;
naive cross-team sharing throws it away. The resolution is the two-scope split: the sensitive material — diffs,
sessions, env, half-formed experiments — never leaves the laptop; only the *decisions* (the stuff you'd tell a
cofounder anyway) are shared. That keeps the privacy promise and the cross-team value in the same breath.

The second risk is **a wrong shared decision is worse than a missing one** — it pollutes shared truth. So promotion
of a raw trace into a shared decision is gated by **propose-confirm** (ECHO drafts, human confirms in Slack), biasing
toward under-sharing, which is the safe direction for a scrappy launch.

The third lever is build cost: the decision extraction **piggybacks on Claude/Codex** — the agents already in the
dev loop — via an ECHO skill + AGENTS.md/CLAUDE.md instructions, rather than ECHO running its own extraction brain.
This is on-thesis ([[skills-are-the-cross-tool-protocol]]: skills are the protocol) and a large scope cut versus
106's daemon-side LLM worker.

## Acceptance criteria

1. **AC1 — Two scopes, one boundary, enforced in the gate (not by policy).** A new **team-scoped decision namespace**
   (proposed: `derived:team-decisions`) is allowlisted in `src/capture/sources.ts`, distinct from all machine-scoped
   raw sources. A cross-team query can read this namespace; it can **never** read another person's raw/machine-scoped
   atoms. Enforced in code at the gate, consistent with [[capture-gate]] — a test asserts a peer query against raw
   sources is refused.
2. **AC2 — Cross-team query is decision-layer-only.** Extending 103's responder: a Slack question ("what did we decide
   about auth this week") is answered from the shared decision layer. **Raw "why" drill-down is NOT a cross-team Slack
   feature in V1 (deferred per R3, structural cut)** — the cross-team surface never touches any machine-scoped raw store;
   the asker drills into raw context in their own tools/machine directly. Tested: the cross-team decision read works; any
   raw-store access via the cross-team surface is refused.
3. **AC3 — Propose-confirm promotion gate (the trust boundary made visible).** Nothing enters the shared decision
   store silently. A candidate decision is **drafted** (by the piggyback extractor, AC4) and surfaced in Slack as a
   one-tap **confirm / edit / dismiss**. Only on explicit confirm is a decision atom appended to `derived:team-decisions`.
   A confirmed atom records who confirmed it and when (the visible-sharing-boundary record; surfaces to [[audit-page]]).
   Default-deny: an unconfirmed draft is never queryable as shared truth. **Confirm is idempotent per R5** (durable
   `draft_id`; a Slack retry/double-click consumes the draft once and appends no second atom).
4. **AC4 — Piggyback extraction via skill + AGENTS.md/CLAUDE.md (no ECHO-side extraction brain).** A canonical
   `skills/echo-emit-decision.md` instructs an agent (Claude Code or Codex), at a decision-grade moment in its own
   session, to draft a candidate decision (subject + the decision sentence + optional rationale) and submit it to the
   propose-confirm gate (AC3). Drop-in `AGENTS.md`/`CLAUDE.md` snippets wire this into a customer repo so the agents
   already in the loop do the extraction. **ECHO does not run a separate daemon LLM worker for this** (the 106 pattern
   is explicitly NOT reused here — see Out of Scope). The skill is vendor-neutral and ECHO-namespaced per the
   cross-tool-protocol convention; a Claude Code adapter copy (`.claude/commands/echo-emit-decision.md`) is produced by `tools/sync-skills.sh` (not hand-edited); `files_to_modify` lists it as sync-output, and the build runs `tools/sync-skills.sh` then `tools/sync-skills.sh --check` to verify adapter/canonical identity (r3 codex).
5. **AC5 — Append-only, machine-attributed decision atoms.** Each shared decision atom carries: `subject`
   (normalized topic), `decision` (the sentence), `rationale?`, `author` (which cofounder/machine produced it),
   `confirmed_by`, `confirmed_at`, `source_app` (claude-code | codex), `dedupe_key`. Append-only, random-id, no upsert
   ([[storage]]); re-confirming the same subject appends a new atom (latest-wins at query time), never mutates.
6. **AC6 — White-glove onboarding path, documented + runnable.** A short operator runbook + the two drop-in snippets
   let the founder set up a 2-cofounder team in one screen-share: install the Slack app for the team, drop the
   AGENTS.md/CLAUDE.md snippet into each repo, confirm the decision-layer query works across both cofounders. The
   onboarding sequence lands **individual aha first, cross-team second** (don't make the newest part the first
   impression). Success metric per V1 definition-of-done: the cofounders ask "when can I pay?"

## Resolved in spec-review (r1 disposition — binding for the build)

r1 (codex + codex-ops) returned `pushback`: the artifact was not buildable while the shared-store topology and the
submission interface were left open. The decisions below resolve every r1 finding and are binding. (Module paths are
still PROVISIONAL — the builder confirms them against the substrate before claiming, per `files_to_modify`.)

### R1 — Shared decision store: option (a), hosted on the Slack-responder instance (r1 findings 1, 5 — HIGH)
The shared decision layer is a **single small append-only store owned by the Slack-responder host instance**
(`src/surfaces/ceo-slack-responder/decision-store.ts`), physically separate from every cofounder's machine-scoped raw
store. It holds ONLY `derived:team-decisions` atoms. Federation (option c) is explicitly deferred — unnecessary at n=2
([[project_cross_human_ecosystem_bet]]: federation is not the n=2 sprint).
- **Write path:** on an explicit Slack confirm (AC3), `responder.ts` calls `decision-store.append(atom)`. This is the
  ONLY writer; raw atoms are never published to it.
- **Read path:** a cross-team query (`brain.ts`) reads `derived:team-decisions` from this shared store ONLY, and has no
  code path to ANY machine-scoped raw store — not a peer's and not the asker's own (raw drill-down deferred per R3).
- **Config/env:** the responder is configured with `ECHO_TEAM_DECISION_STORE` (path/connection of the shared store) at
  install; documented in the AC6 runbook.
- **Test (two-machine fixture):** cofounder B's Slack query returns a decision A confirmed; a same-shaped request aimed
  at A's raw store is refused. → `cross-team-scope.test.ts`.

### R2 — Submission interface: one concrete callable, the ECHO MCP tool `propose_decision` (r1 findings 2 HIGH, 7 MED)
The piggyback extractor (AC4) submits candidates through a **single concrete callable: an ECHO MCP tool
`propose_decision`** exposed by the daemon/responder (provisional handler
`src/surfaces/ceo-slack-responder/propose-decision-tool.ts`; builder confirms the MCP registry path against the substrate).
- **Payload schema:** `{ subject: string, decision: string, rationale?: string, source_app: "claude-code"|"codex" }`.
  No raw content is accepted — decision-grade text only.
- **Auth/identity:** the calling agent's machine identity (the binding ECHO already uses) is attached **server-side** and
  becomes the draft's `author`; the agent does not self-assert identity.
- **Receiver:** the tool handler creates a draft (R5) and posts the one-tap confirm card to Slack via `responder.ts`.
- **Registration (codex r2 F1):** `propose_decision` is wired into the callable surface by the ECHO MCP server tool
  registry (`src/mcp/server.ts`), which registers the `propose-decision-tool.ts` handler as a tool. `server.ts` is the
  named registry owner the builder may edit.
- **Failure surface (no silent drop):** if the submit path is unavailable (responder down, missing Slack creds, MCP
  error), `propose_decision` returns an explicit error to the agent and records nothing as confirmed; the skill instructs
  the agent to surface the error, and the AC6 runbook documents this operator-visible failure evidence.
- **Confirm-card target (r3 codex-ops):** an MCP-originated `propose_decision` carries no Slack event context, so the
  confirm-card destination is an **explicitly configured target** (a team channel/user — exact config shape is the builder's
  choice), validated at responder **startup** and documented in the AC6 runbook. A missing/invalid target makes
  `propose_decision` return an operator-visible error and create **NO draft** (no silently-lost candidate); tested in
  `propose-confirm.test.ts`.

### R3 — Identity (confirm attribution) + cross-team surface is decision-layer-only (r1 finding 3 MED; raw drill-down deferred r2 codex-ops F1)
`identity.ts` maps **Slack user ID ↔ cofounder identity** for confirm attribution (who confirmed/authored). It does NOT
route raw-store access.
- A cross-team **decision** query reads the shared store (R1) — all cofounders' confirmed decisions.
- **Raw drill-down over Slack is deferred for V1 (structural cut).** The cross-team Slack surface is **decision-layer-only**
  and has NO code path to any machine-scoped raw store — peer's *or* the asker's own. Surfacing a user's own *remote* raw
  store through the single responder host would require a new cross-machine raw-access transport, which is explicitly Out
  of Scope ("peer-to-peer sync of local raw stores — the expensive version"). A user drills into raw "why" through their
  own existing single-user tools/machine, never via the cross-team surface.
- **Test** in `cross-team-scope.test.ts`: the cross-team decision query resolves the shared layer; **any** raw-store access
  attempted via the cross-team Slack surface is refused (the surface offers no remote-raw route at all).

### R4 — AC5 atom schema: dedupe_key + latest-wins + immutability (r1 finding 4 — MED)
- `dedupe_key = "team-decision:" + normalize(subject)`, where `normalize` = trim + lowercase + collapse internal whitespace.
- **latest-wins at query time:** for a normalized subject, return the atom with the greatest `confirmed_at`; ties broken by
  append order. Append-only, random-id, never mutate ([[storage]]).
- **Tests** (`decision-store-latest-wins.test.ts`): re-confirming the same subject appends a NEW atom; the prior atom is
  byte-unchanged; the query returns the latest.

### R5 — Confirm idempotency for Slack retries (r1 finding 6 MED; durable r2 codex F2; atomic/replay-safe r3 both)
Each draft is persisted in a **durable draft store owned by the responder host** (`draft-store.ts`), keyed by `draft_id`
and holding `{ draft_id, subject, decision, rationale?, author, source_app, status: pending|confirmed|dismissed, action_ts, decision_atom_id? }`.
confirm/edit/dismiss consumes a draft **exactly once, atomically and replay-safely**: the pending→confirmed transition and
the decision-store append form a single replay-safe operation that **persists the resulting `decision_atom_id` on the draft**,
so a concurrent Slack retry, a double-click, or a crash *between* the two writes all return the SAME prior result and never
double-append or lose a decision. The spec fixes the **invariant + owner + tests**; the exact CAS/transaction mechanism is the
builder's choice (do not over-prescribe storage internals). → `confirm-idempotency.test.ts` drives **concurrent duplicate
confirms** and **crash-after-one-write replay**, in addition to restart-safe replay.

### R6 — The two narrower open questions (resolved, not reviewer-flagged)
- **Decision-grade trigger:** start narrow — **explicit `/echo decision` + end-of-task summary only**; heuristics earn their way in later.
- **Granola overlap:** **code-session-only for V1.** Promoting 106-derived meeting decisions into `derived:team-decisions`
  is a fast-follow, not this item.

## Out of Scope (Don't Drift)

- **Sharing any raw/machine-scoped atom across people.** Diffs, sessions, env, transcripts, half-formed experiments
  never cross the boundary. Decisions only.
- **Auto-publish (no confirm).** Silent promotion of a candidate into shared truth is a V2 optimization, gated on
  *observed* extraction trust — not built here. Under-share on purpose.
- **An ECHO-side daemon LLM worker for decision extraction.** Extraction piggybacks on the agents already running
  (AC4). Do NOT rebuild 106's daemon-worker pattern for code-session decisions.
- **Peer-to-peer sync of local raw stores / a merge layer.** The expensive version. Slack is the shared surface; the
  decision layer is the only shared state.
- **A destination app / new ECHO UI.** Cross-team lives in Slack + in-tool AI, never a place users go to.
- **Production access-control / audit hardening beyond a visible confirm record.** 103 was *stripped* for exactly this
  patch-deeper drift ([[drift-prevention]]); keep the n=2 trust boundary cheap and visible, not a security subsystem.
- **>2 people / role hierarchies / org permissions.** Cofounder↔cofounder symmetric peer case only for V1.

## After Completion (Strategist Notes)

- Wiki: add a `surfaces/` page for the **cross-team decision layer over Slack** (the two-scope model, the
  propose-confirm gate, the decision-layer-only query rule). Update [[interface-layers]] to note the cross-team query
  as an L3 surface and the confirm as an L5 trust moment. Update [[audit-page]] with the shared-decision visibility record.
- Add a `product/` (or `research/`) note capturing the **per-seat / team-retention** rationale as the launch wedge —
  this is the strategic "why cross-team," distinct from the mechanism.
- Lock the one-sentence trust pitch as a `principles/` line: *"Raw context never leaves your machine; only decisions —
  the stuff you'd tell your cofounder anyway — are shared."*
- Feed n=2 onboarding observations into the dogfooding journal; if "when can I pay?" lands ≥3/5, that's the trigger to
  spec the self-serve onboarding + auto-publish follow-ups (do not pre-build them).
