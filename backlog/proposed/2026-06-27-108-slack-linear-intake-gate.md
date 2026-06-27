---
id: 2026-06-27-108-slack-linear-intake-gate
title: "Slack→Linear intake gate — non-technical teammates describe work in plain English to Echo in Slack; Echo gathers minimum context via bounded follow-ups, then on requester confirm creates a structured Linear issue (parent-deliverable shape) in Inbox and links it back"
status: proposed
priority: HIGH
estimate: 2-3d (engineering; Linear write client is the only net-new external surface — the rest reuses 107)
created: 2026-06-27
blocked_by: []
task_state_ref: 2026-06-27-108-slack-linear-intake-gate
requested_reviewers: ["codex", "codex-ops"]
spec_refs:
  - docs/execution/echo/linear-intake-gate-setup.md              # SOURCE — the founder's operating design this item builds the code-bearing slice of (intake/triage/issue shapes, conversation contract, MVP phases)
  - backlog/complete/2026-06-24-107-cross-team-decision-sync-slack.md  # the propose-confirm-over-Slack pattern this reuses: draft → Slack confirm card → terminal action; identity attribution; idempotent confirm
  - src/surfaces/ceo-slack-responder/responder.ts                # Socket Mode lifecycle, ack, threaded reply, confirm-card posting — the surface this intake flow lands on
  - src/surfaces/ceo-slack-responder/draft-store.ts             # FileDecisionDraftStore: durable, atomic (tmp+rename), per-id lock, idempotent confirm — the template for the intake draft store
  - src/surfaces/ceo-slack-responder/propose-decision-tool.ts   # the propose→post-card→on-confirm-run-terminal-action shape; here the terminal action becomes createLinearIssue()
  - src/surfaces/ceo-slack-responder/identity.ts                # Slack user ↔ identity; reused to attribute the requester ("who is asking / who is this for")
  - src/surfaces/ceo-slack-responder/brain.ts                   # swappable headless brain (codex|claude); the intake brain (classify + field extraction) is a new variant, not new infra
  - wiki/architecture/capture-gate.md                           # binds: Slack stays SURFACE-only; this item does NOT add Slack as a capture source — gate.ts/sources.ts untouched for Slack
  - wiki/architecture/interface-layers.md                       # L1/L3/L5 vocabulary; the intake conversation is an L3 summoned surface, the confirm is an L5 trust moment
  - wiki/surfaces/mcp-server.md                                 # how the responder host registers callables, in case the intake submit path is exposed as a tool
files_to_modify:
  # PROVISIONAL — finalized at ready-promotion. Builder confirms paths against the substrate before claiming.
  - src/surfaces/ceo-slack-responder/linear-client.ts          # NEW (AC4) — Linear WRITE client: createIssue({project, title, body, state, owner}) → {url, id}. ECHO's first external write integration; auth via env (LINEAR_API_KEY); team/project IDs config.
  - src/surfaces/ceo-slack-responder/intake-draft-store.ts     # NEW (AC2/AC3) — thread-keyed intake state: partial fields blob accumulated across follow-up turns + the confirm draft. Modeled on draft-store.ts (durable, atomic, idempotent confirm); keyed by Slack thread_ts.
  - src/surfaces/ceo-slack-responder/issue-render.ts           # NEW (AC4) — gathered fields → the mandatory parent-deliverable markdown shape from the source doc
  - src/surfaces/ceo-slack-responder/brain.ts                  # intake brain variant: plain English → extract mandatory fields + identify what's missing (no engineering jargon asked of teammates)
  - src/surfaces/ceo-slack-responder/responder.ts             # intake message flow: ack → bounded follow-ups → confirm card → on requester confirm create Linear issue + post link back
  - src/surfaces/ceo-slack-responder/identity.ts             # reuse/extend for requester attribution (who is asking)
  - docs/onboarding/slack-linear-intake-runbook.md           # NEW (AC6) — operator setup: Slack app/channel, LINEAR_API_KEY, name→project-ID map, owner default, failure-evidence behaviors
  - tests/surfaces/ceo-slack-responder/intake-gate.test.ts             # NEW — happy path: plain English w/ all fields → confirm → issue created in Inbox → URL posted back
  - tests/surfaces/ceo-slack-responder/intake-followup.test.ts         # NEW — missing fields → ≤2 targeted plain-language questions/turn; no issue created until minimum context present; never asks for branch/files/tests
  - tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts  # NEW — retry/double-click on confirm creates EXACTLY ONE Linear issue (mocked client); crash-between-writes replay-safe
  - tests/surfaces/ceo-slack-responder/linear-client.test.ts           # NEW — createIssue maps fields→payload; missing key/project → operator-visible error + NO partial issue + NO silent drop
---

> **Origin: 2026-06-27 conversation (founder + Claude strategist).** Founder flagged the Slack→Linear intake
> gate (`docs/execution/echo/linear-intake-gate-setup.md`) as **P0 / the immediate sprint** because it lets the
> **non-technical part of the team align with the technical part**: teammates describe work in normal planning
> language in Slack; Echo turns it into structured, executable Linear issues without anyone learning Linear.
>
> **This item is the code-bearing slice only.** The source doc is a full operating design across 4 phases; this
> spec is Phase 1→core-of-Phase-2 (the intake gate: gather minimum context → create a structured issue → link
> back). Duplicate search, shape validator/digest, the decomposition assistant, multi-bucket classifier routing,
> and any backlog↔Linear sync are explicitly **deferred** (see Out of Scope) — they are separate items.
>
> **Architecture is a known pattern, not new substrate.** This is 107's propose-confirm-over-Slack flow with the
> terminal action swapped from `appendDecision()` to `createLinearIssue()`. The draft store, the Slack confirm
> card, identity attribution, and idempotent confirm are all shipped in `src/surfaces/ceo-slack-responder/`.
> The genuinely net-new surface is the **Linear write client** (ECHO has zero Linear code today).
>
> **Confirm model (founder decision, 2026-06-27): the REQUESTER confirms the draft.** Echo posts a confirm card
> in-thread; the teammate who made the request reacts to create the issue. This reuses 107's machinery, gives the
> teammate a "did Echo capture this right?" check, and keeps the founder OUT of the per-intake loop. Zhen remains
> the Inbox→Todo gate (out of scope here).
>
> **Relates to [[project_v15_cleanup_pause]] / [[project_friction_first_prioritization]].** Like 107, this item's
> trigger is the launch/team-alignment decision, not codebase cleanup. Spec-review should confirm the posture
> before promoting `proposed/ → ready/`.

## Why

The team is now mixed technical/non-technical with real client work (e.g. `Claudia`). The coordination tax is the
translation step: non-technical teammates can't (and shouldn't) write Linear issues with the structure engineering
needs, so requests arrive as ambiguous Slack messages that Zhen hand-translates — or get lost. That hand-translation
is the observed duct-tape this removes.

Echo is the right place for the gate because it already lives in Slack (the surface the team uses) and already has
the propose-confirm machinery (107). Putting Echo between plain-English Slack and structured Linear means: (a)
non-technical teammates submit in their own language, (b) engineering receives issues that are actually executable
without reinterpreting them, and (c) intake quality is enforced once, in conversation, instead of cleaned up later.

The two risks this design controls:
- **Garbage issues / silent creation.** A vague issue with no "done-when" is worse than no issue. Resolved by the
  **minimum-context gate** (Echo refuses to create until the mandatory fields exist) + **propose-confirm** (nothing
  is created until the requester confirms the drafted issue). Bias toward asking one more question over filing junk.
- **Scope creep into a workflow product.** The source doc is large and tempting. This item is deliberately the
  narrow create path; everything else is a follow-up. The strategic identity (agency-ops tooling that dogfoods the
  cross-human thesis vs. the validated wedge) is a separate, unresolved question and must NOT be smuggled in via
  feature breadth here.

This stays on-thesis: Echo as the bus translating human intent into executable work, surface-only (Slack is not
captured), raw context never ingested — only the structured issue, which the teammate explicitly confirms, leaves
to Linear.

## Acceptance criteria

1. **AC1 — Plain-English intake in Slack.** A teammate @mentions Echo in a configured channel (e.g. `#eng`) or a
   thread with a plain-language request. Echo posts an ack ("Looking…", reusing 107's responder lifecycle) and runs
   the **intake brain** to extract the mandatory fields from the message. No engineering vocabulary is required of
   the teammate. Tested: a plain-language message produces a parsed field set.

2. **AC2 — Minimum-context gate with bounded, plain-language follow-ups.** Echo gathers the mandatory intake fields
   — **Client/project, Request, Why, Client outcome, Evidence/example, Done-when, Urgency, Client-facing** (per the
   source doc). Missing fields trigger **at most two targeted follow-up questions per turn**, in plain language;
   answers accumulate in **per-thread intake state** (`intake-draft-store.ts`, keyed by Slack `thread_ts`). Echo
   **never** asks a non-technical teammate for branches, files, test plans, or implementation detail. Echo
   **refuses to create a Linear issue while any mandatory field is missing** (default-deny). Tested in
   `intake-followup.test.ts`: missing→asks ≤2 questions, no issue created; jargon-ask is absent.

3. **AC3 — Propose-confirm before creation; the REQUESTER confirms.** Once minimum context is present, Echo posts a
   **confirm card in-thread** rendering the drafted issue (the parent-deliverable shape, AC4). Only on the
   **requester's explicit confirm** does Echo create the issue; **edit** and **dismiss** are supported; an
   unconfirmed/dismissed draft creates nothing. Confirm is **idempotent per draft** (107's R5 pattern): a Slack
   retry, double-click, or crash between writes creates **exactly one** Linear issue and never orphans/duplicates.
   The draft records who confirmed it and when. Tested in `intake-confirm-idempotency.test.ts` (concurrent duplicate
   confirms + crash-after-one-write replay, mocked Linear client).

4. **AC4 — Structured Linear issue creation.** On confirm, `linear-client.ts` creates a Linear issue:
   **title** = the plain-language request; **body** = the gathered fields rendered into the source doc's mandatory
   **parent-deliverable markdown shape** (`issue-render.ts`); **state** = `Inbox`; **owner** = configurable default
   (`Zhen`); **project** = resolved from the gathered Client/project field via a **name→project-ID config map**,
   defaulting to the `Echo` internal project. The client returns the created issue's URL + id. Tested in
   `linear-client.test.ts`: field→payload mapping; a missing API key or unresolvable project yields an
   **operator-visible error with NO partial issue and NO silent drop**.

5. **AC5 — Link-back + receipt.** Echo posts the created issue's **URL back into the Slack thread**, naming what it
   created (project, status `Inbox`) and which fields it included (the source doc's "Issue Created" prompt shape).
   The created issue records the **requester identity** (`identity.ts`) and the **Slack thread link** as a receipt.
   Tested as the tail of `intake-gate.test.ts`.

6. **AC6 — Surface-only (no raw capture) + operator runbook.** Echo reads the Slack thread **transiently** to build
   the draft and does **NOT** add Slack as a capture source — `src/capture/gate.ts` and `src/capture/sources.ts`
   are **not modified** for Slack; raw Slack messages are never ingested. A short `slack-linear-intake-runbook.md`
   documents one-screen-share setup: Slack app/channel config, `LINEAR_API_KEY`, the name→project-ID map, the owner
   default, and the operator-visible failure behaviors (AC4). Tested/asserted: no new Slack entry in the source
   allowlist.

## Out of Scope (Don't Drift)

- **Duplicate search against Linear** ("Echo searches existing work" in the source doc). Needs Linear *read* +
  matching; it's the next item, not this one. Create path first.
- **Multi-bucket classifier routing** beyond the name→project-ID map (bug/research/ops/echo-capability buckets),
  the **shape validator + daily digest** (source doc Phase 3), and the **decomposition / sub-issue assistant**
  (Phase 4). All separate follow-ups.
- **Any Linear↔backlog sync, or writing/reading Linear status state-machine.** Echo creates an issue in `Inbox` and
  stops. It does NOT move issues to `Todo`/`In Progress`, reflect repo backlog status into Linear, or generate
  backlog items from Linear. (Explicitly cut earlier in this conversation — the atomic-claim invariant makes
  bidirectional sync a landmine; revisit only via `/office-hours`.)
- **Slack as a capture source / raw Slack ingestion.** Surface-only; preserves "raw context never leaves your
  machine."
- **Auto-create without confirm**, and **Zhen-gated creation.** Founder decision is requester-confirms; do not add a
  no-confirm fast path or route confirmation to Zhen.
- **Comments on / updates to existing issues** (the source doc's "Update to existing issue" bucket). Needs Linear
  read + match; deferred with duplicate search.
- **A destination app / new ECHO UI.** Intake lives in Slack; the artifact lives in Linear.
- **Resolving the strategic identity question** (agency-ops tool vs. validated wedge). That's a `/office-hours`
  conversation, not code; building this item does not settle it.

## After Completion (Strategist Notes)

- Wiki: add a `surfaces/` page for the **Slack→Linear intake gate** (the minimum-context gate, propose-confirm with
  requester-confirm, surface-only-no-capture rule). Update [[interface-layers]] (intake conversation = L3, confirm =
  L5 trust moment). Cross-link the 107 cross-team-decision surfaces page (shared propose-confirm machinery).
- Capture the **non-technical↔technical alignment** rationale as the strategic "why" (a `product/` or `research/`
  note) — distinct from the mechanism; this is the team-alignment wedge claim, still demand-unvalidated.
- Feed observations into the dogfooding journal: does a non-technical teammate file a clean, executable issue
  **without Zhen hand-translating**? That's the validation signal (mirrors the source doc's validation criteria).
  If it lands, that's the trigger to spec the duplicate-search + shape-validator follow-ups (do not pre-build them).
- Reconcile the V1-spec Linear cut: this un-cuts a narrow slice of Linear for internal team ops. Note it; do NOT
  rewrite the V1 spec until the wedge claim is validated (per [[project_cross_human_ecosystem_bet]] discipline).
