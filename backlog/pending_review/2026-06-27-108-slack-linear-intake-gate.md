---
id: 2026-06-27-108-slack-linear-intake-gate
title: "Slack→Linear intake gate — non-technical teammates describe work in plain English to Echo in Slack; Echo gathers minimum context via bounded follow-ups, then on requester confirm creates a structured Linear issue (parent-deliverable shape) in Inbox and links it back"
status: proposed
priority: HIGH
estimate: 3-4d (engineering; the Linear write client + exactly-once-across-an-external-side-effect is the net-new hardness — local-append reuse from 107 doesn't cover the external create)
created: 2026-06-27
blocked_by: []
task_state_ref: 2026-06-27-108-slack-linear-intake-gate
requested_reviewers: ["codex", "codex-ops"]
ready_content_sha: 66c9ff6b3b0679d5bba7ef1e7036ed084f906638df79bbe2ddd5bb423a608fdf
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-06-27T22:34:49Z"
branch: "agent/slack-linear-intake-gate"
head_sha: "a6a68315686c6ea71e0d1df791219892a2c8a0fe"
pr_url: ""
agent_notes: |
  Implemented the Slack→Linear intake gate on `agent/slack-linear-intake-gate`: deterministic plain-English intake extraction, per-thread durable draft state, requester confirm/dismiss, fail-closed exactly-once Linear create, Slack link-back receipts, no Slack capture allowlist changes, operator runbook, and focused tests. Verified focused acceptance tests, full CEO Slack responder regression group, typecheck, lint, and `git diff --check`.
  Post-review root-cause fixes committed at `a6a68315686c6ea71e0d1df791219892a2c8a0fe`: production Slack envelope text now preserves labeled-line boundaries before intake parsing, and the file-backed intake draft store serializes whole-file read/modify/write sections while using unique temp paths. Added regressions for production envelope parsing and concurrent different-thread draft persistence. Verified with `npx vitest run tests/surfaces/ceo-slack-responder/intake-gate.test.ts tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts` (9/9 pass).
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
  - src/surfaces/ceo-slack-responder/intake-draft-store.ts     # NEW (AC2/AC3) — intake state: partial fields blob accumulated across follow-up turns + the confirm draft + status pending|creating|created|needs-reconcile|dismissed + idempotency token + Slack-ingress de-dupe set. Modeled on draft-store.ts (durable, atomic, idempotent); keyed by team_id:channel_id:root_ts (R1).
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

1. **AC1 — Plain-English intake in Slack; ack before work (R5).** A teammate @mentions Echo in a configured channel
   (e.g. `#eng`) or a thread with a plain-language request. The responder **acks the Slack event immediately**
   (before any brain/Linear work, so Socket Mode does not redeliver), then runs the **intake brain** to extract the
   mandatory fields from the message. No engineering vocabulary is required of the teammate. Tested: ack precedes
   brain/Linear work; a plain-language message produces a parsed field set.

2. **AC2 — Minimum-context gate with bounded, plain-language follow-ups.** Echo gathers the mandatory intake fields
   — **Client/project, Request, Why, Client outcome, Evidence/example, Done-when, Urgency, Client-facing** (per the
   source doc). Missing fields trigger **at most two targeted follow-up questions per turn**, in plain language;
   answers accumulate in **per-thread intake state** (`intake-draft-store.ts`), keyed by the **stable operational
   key `team_id:channel_id:root_ts` where `root_ts = thread_ts || ts`** (R1) — so a top-level mention and its
   threaded follow-ups resolve to the **same** draft, and different channels/workspaces never collide. One active
   intake per key (a thread-root = one request being refined). Echo **never** asks a non-technical teammate for
   branches, files, test plans, or implementation detail. Echo **refuses to create a Linear issue while any
   mandatory field is missing** (default-deny). **Client/project must resolve to a known config project (R9): an
   unmapped name is missing context — Echo asks the requester to pick from the known projects before showing a
   confirm card** (the configured default is internal-only, never a catch-all). Tested in `intake-followup.test.ts`:
   missing→asks ≤2 questions, no issue created, jargon-ask absent; top-level + threaded follow-up resolve to one
   draft; two channels don't collide; an unmapped project name triggers a pick-from-known-projects question, not a
   silent default.

3. **AC3 — Propose-confirm before creation; the REQUESTER confirms; exactly-once across the external create (R3, R4).**
   Once minimum context is present, Echo posts a **confirm card in-thread** rendering the drafted issue (the
   parent-deliverable shape, AC4). This slice supports **confirm** and **dismiss** only — **`edit` is cut** (to
   change a draft, the requester edits their request text and re-triggers a fresh draft; editing the card is
   deferred, see Out of Scope). Only on the **requester's explicit confirm** is an issue created; a dismissed draft
   makes a later confirm a no-op; an unconfirmed/dismissed draft creates nothing. **Exactly-once is enforced
   fail-closed, invariant + tests, mechanism the builder's choice** (107 R5 altitude; refined in r2):
   - **(R5, refined r2) Slack ingress de-dupe** — message events are durably de-duped by `team:channel:` + Slack's
     **unique event delivery id** (envelope/`event_id`, **NOT** the static Block-Kit `action_id`). Interactive
     confirms are made idempotent by the **draft's consume-once `pending→creating` transition** (R4) — the final
     no-op guard for any replayed/stale confirm. A replayed delivery never re-runs brain/create work or acts on a
     consumed draft.
   - **(R4, refined r2 — fail-closed, founder decision 2026-06-27) Linear-create exactly-once.** The draft consumes
     once via an atomic `pending→creating` transition **before** the create call; on success it records `created`
     with the issue id/url. Because **Linear reads stay out of scope**, a crash/timeout in the `creating` window
     (issue *may* have been created, id not yet stored) does **NOT** attempt recovery and does **NOT** auto-create a
     second issue — the draft stays **`needs-reconcile`** with operator-visible evidence and the requester gets a
     visible failure reply. A possible orphan issue is reconciled **manually** (accepted rare cost of the no-reads
     cut). No reliance on a Linear API idempotency key.
   The draft records who confirmed it and when. Tested in `intake-confirm-idempotency.test.ts`: concurrent duplicate
   confirms → **exactly one** create; replay of a `creating` draft (crash before result stored) → **no second
   create**, draft is `needs-reconcile` (NOT "recover id"); create-timeout → `needs-reconcile`, no second create;
   replayed Slack confirm on a consumed draft → no-op.

4. **AC4 — Structured Linear issue creation; config is explicit IDs, no Linear reads (R2).** On confirm,
   `linear-client.ts` creates a Linear issue: **title** = the plain-language request; **body** = the gathered fields
   rendered into the source doc's mandatory **parent-deliverable markdown shape** (`issue-render.ts`); **state** =
   the configured **Inbox workflow-state ID**; **assignee** = configured **default assignee ID** (Zhen); **team** =
   configured **team ID**; **project** = **resolved during intake** (R9, founder decision 2026-06-27): the gathered
   Client/project name is looked up in the config **name→project-ID map**; an **unmapped name is treated as missing
   context** — Echo asks the requester to pick from the known project names before any confirm card is shown (never a
   silent default, never a typo'd misfile). `LINEAR_DEFAULT_PROJECT_ID` (the Echo project) applies **only** to an
   explicit internal / no-client request. Because resolution is config-driven, **no Linear read path is introduced**
   (consistent with reads-out-of-scope). Required config keys (validated at responder **startup**): `LINEAR_API_KEY`,
   `LINEAR_TEAM_ID`, `LINEAR_INBOX_STATE_ID`, `LINEAR_DEFAULT_ASSIGNEE_ID`, `LINEAR_DEFAULT_PROJECT_ID`,
   `LINEAR_PROJECT_MAP` (name→ID JSON). The create call uses a **bounded timeout** and **no automatic retry that
   could duplicate a create** (R4). The client returns the created issue's URL + id. Tested in `linear-client.test.ts`:
   field→payload mapping; a missing/invalid API key, team, state, or assignee → **operator-visible error, NO partial
   issue, NO silent drop**; an absent/unresolved project ID reaching the client → defensive error (unreachable in
   normal flow because R9 resolves project during intake).

5. **AC5 — Link-back + receipt.** Echo posts the created issue's **URL back into the Slack thread**, naming what it
   created (project, status `Inbox`) and which fields it included (the source doc's "Issue Created" prompt shape).
   The created issue records the **requester identity** (`identity.ts`) and the **Slack thread link** as a receipt.
   Tested as the tail of `intake-gate.test.ts`.

6. **AC6 — Surface-only (no raw capture) + operator runbook + durable failure evidence.** Echo reads the Slack
   thread **transiently** to build the draft and does **NOT** add Slack as a capture source — `src/capture/gate.ts`
   and `src/capture/sources.ts` are **not modified** for Slack; raw Slack messages are never ingested. External-call
   failures (Linear/Slack network errors, timeouts, the R4 `needs-reconcile` state) produce a **requester-visible
   reply** AND a **durable, operator-visible record** (draft status + log) sufficient for manual reconciliation —
   never a silent drop. A short `slack-linear-intake-runbook.md` documents one-screen-share setup: Slack app/channel
   config; the full Linear ID config set (AC4); the name→project-ID map; the owner default; and the operator-visible
   failure / `needs-reconcile` behaviors. Tested/asserted: no new Slack entry in the source allowlist.

## Resolved in spec-review (r1 disposition — binding for the build)

r1 (codex + codex-ops) returned `proceed_after_patches`. The decisions below resolve every r1 finding and are
binding. Module paths remain PROVISIONAL (builder confirms against the substrate before claiming).

- **R1 — Intake/draft state key (codex F2, codex-ops F3, convergent).** Key state and locks by
  `team_id + ":" + channel_id + ":" + root_ts`, `root_ts = thread_ts || ts`. One active intake per key; a
  thread-root is one request being refined (so a follow-up in the same thread continues the same draft — not a
  collision). Tested: top-level mention + threaded follow-up → one draft; two channels/threads don't collide.
- **R2 — Linear config is explicit IDs, no reads (codex F1).** Config provides `LINEAR_API_KEY`, `LINEAR_TEAM_ID`,
  `LINEAR_INBOX_STATE_ID`, `LINEAR_DEFAULT_ASSIGNEE_ID`, `LINEAR_DEFAULT_PROJECT_ID`, and `LINEAR_PROJECT_MAP`
  (name→project-ID JSON). Name→ID resolution is config-driven, so **no Linear read code is added**. Validated at
  responder startup; missing/invalid → operator-visible error, NO partial issue. (Keeps reads-out-of-scope honest.)
- **R3 — `edit` is cut (codex F3, disposition = removal).** This slice ships **confirm + dismiss** only. To change a
  draft, the requester edits their request text and re-triggers a fresh draft. Card-edit is deferred (Out of Scope).
  Tested: dismiss → later confirm is a no-op; no issue on dismiss.
- **R4 — Linear-create exactly-once + uncertain-outcome reconcile (codex-ops F1, F4).** Draft persists a
  deterministic idempotency token and moves `pending→creating→created` storing the issue id/url; bounded create
  timeout; **no auto-retry that can duplicate**; uncertain outcome → `needs-reconcile` + operator-visible evidence,
  never a blind second create. If Linear's API exposes a create idempotency key, reuse the token. Invariant + owner +
  tests; mechanism is the builder's choice. Tested: concurrent dup confirm → 1 create; crash-mid-create replay → no
  2nd create; timeout → needs-reconcile.
- **R5 — Slack ingress idempotency (codex-ops F2; key REFINED in r2, see R8).** Ack immediately before brain/Linear
  work; durably de-dupe message events by Slack's unique envelope/`event_id`, and make confirms idempotent via the
  draft consume-once transition (R4/R7) — **NOT** the static Block-Kit `action_id` (superseded by R8). A Socket-Mode
  redelivery doesn't post duplicate questions/cards or re-run a stale confirm. Tested: replayed confirm on a consumed
  draft → no-op.
- **R6 — Concrete Tests section (codex F4).** Added below (run command + per-file assertions).

## Resolved in spec-review (r2 disposition — binding for the build)

r2 (codex `proceed_after_patches`, codex-ops `pushback` — boundary crossed → founder-escalated). Both reviewers
flagged the **same 3 second-order issues** in the r1 patch; all resolved by simplification (disposition discipline:
prefer removal over deeper patching when findings target a recent-round patch). Founder decided the two product
forks on 2026-06-27.

- **R7 — R4 made fail-closed (founder decision; supersedes r1 R4's "recover stored id").** A crash in the `creating`
  window does NOT recover the id and does NOT auto-create a second issue → `needs-reconcile` + visible failure;
  possible orphan reconciled manually. No dependency on a Linear idempotency key, no Linear read. (Both reviewers:
  "recover stored id after crash is not valid unless id was durably stored first." Correct — removed.)
- **R8 — R5 de-dupe key fixed (mechanical; both reviewers).** `action_id` is a static Block-Kit identifier, not a
  unique delivery id. Events de-dupe on Slack's unique envelope/`event_id`; interactive confirms rely on the draft
  consume-once transition (R4/R7) as the idempotency guard. Test: two confirm cards sharing an `action_id` do not
  collide.
- **R9 — Project resolution moved into intake (founder decision; resolves the AC4↔test contradiction).** Unmapped
  Client/project = missing context → Echo asks the requester to pick from known projects; default is internal-only;
  the linear-client errors on an unresolved project only as a defensive guard. (Both reviewers flagged the
  default-vs-error contradiction.)

## Tests

Run from the builder's worktree:

```bash
npm test -- tests/surfaces/ceo-slack-responder/intake-gate.test.ts \
            tests/surfaces/ceo-slack-responder/intake-followup.test.ts \
            tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts \
            tests/surfaces/ceo-slack-responder/linear-client.test.ts
npm run typecheck && npm run lint
```

Per-file assertions the builder must satisfy:
- **intake-gate.test.ts** — plain-English message with all fields → confirm card → requester confirm → Linear
  `createIssue` called once with state=Inbox-ID/assignee=default/correct project; issue URL posted back to the thread
  with the field summary; created issue records requester identity + Slack thread link.
- **intake-followup.test.ts** — missing fields → ≤2 plain-language questions/turn; NO create while any mandatory
  field missing; no branch/file/test-plan ask ever appears; top-level mention + threaded follow-up resolve to the
  same draft (R1); two channels with same `ts` do not collide; an **unmapped project name → pick-from-known-projects
  question, not a silent default** (R9).
- **intake-confirm-idempotency.test.ts** — concurrent duplicate confirms → exactly one `createIssue`; replay of a
  `creating` draft (crash before result stored) → **no second create, draft = `needs-reconcile`** (R7 — NOT "recover
  id"); create-timeout → `needs-reconcile`, no second create; replayed/stale Slack confirm on a consumed draft →
  no-op; two confirm cards sharing an `action_id` do not collide (R8).
- **linear-client.test.ts** — fields→payload mapping; missing/invalid `LINEAR_API_KEY`/`LINEAR_TEAM_ID`/
  `LINEAR_INBOX_STATE_ID`/`LINEAR_DEFAULT_ASSIGNEE_ID` → operator-visible error, NO partial issue, NO silent drop;
  an absent/unresolved project ID reaching the client → defensive error (unreachable in normal flow, R9); bounded
  timeout, no duplicating retry.
- **(any of the above)** — assert no new Slack entry is added to the capture source allowlist (`src/capture/sources.ts`).

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
- **Editing the confirm card / in-place draft edit** (R3). Confirm + dismiss only; re-trigger to change a draft.
- **Auto-retry of a Linear create** (R4). On uncertain outcome, reconcile — never blind-retry into a duplicate issue.
- **Linear reads of any kind**, including server-side name→ID lookup (R2 makes resolution config-driven).
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
