# The decision loop — canonical five-stage model (founder abstraction, 2026-07-09)

**Status:** strategy/architecture framing — the tool-agnostic statement of what ECHO is. No new build item by itself; names the one missing stage.
**Context:** emerged from the lab-pilot design thread (see `2026-07-07-office-hours-org-recap-pilot.md` + Addendum 5). Founder's abstraction, verbatim in spirit: *extract decisions at the place they're discussed and made → triage against what the org already has in motion → propose for human validation → resolved decisions become issues/tasks/projects for the execution layer → results flow back up.*

## The loop

1. **Extract** (sense) — decision-grade extraction at the venue of decision-making (meetings, conferences, chat). Invariant: fail-honest (never fabricate from empty input). Surface: pluggable capture adapters — Granola today; Zoom/Mattermost/Slack next. Input fidelity is the vendor's job, never ours.
2. **Triage** (reconcile) — every extracted candidate is checked against **what the org already has in motion**: the ratified ledger (already decided? conflicts? supersedes?) and the execution state (duplicate of an open issue? already shipped?). Verdict classes: new / duplicate / conflict / supersession / update. **This is the missing stage** — the current intake classifier runs with `zero_retrievals` (proposes without consulting org state; was already the top handoff-queue item on 07-07). It is also the uniquely-ECHO stage: it requires standing on ledger + execution state + capture simultaneously — the cross-source join no single-surface vendor can perform.
3. **Validate** (ratify) — propose→confirm gate; nothing enters the record unratified. Triage verdicts ride on the card ("conflicts with decision X of June 3") so confirmation is informed. Built and proven (station 4; `derived:team-decisions`).
4. **Dispatch** (execute) — resolved decisions become issues/tasks/projects in the execution layer, provenance-linked. Execution store is rented and headless (Linear driven by ECHO; advisor/team never needs to visit it). Plumbing exists (108/109 fail-closed create). Discipline: task-shaped content only in third-party stores; transcripts/rationale stay in the owned ledger.
5. **Backflow** (observe) — execution evidence flows back up: issue-state changes, eng capture, commit activity → next brief/meeting opens with done-vs-decided, stalls, and drift (activity contradicting a ratified decision). Partial today: capture exists; composition is concierge.

## Division of labor (locked)

Stage-1 surfaces belong to capture vendors (Granola et al.). Stage-4 surfaces belong to PM vendors (Linear et al.). **ECHO owns stages 2, 3, 5 and the joins between all five.** The ledger (append-only, subject-keyed supersession, ratification + provenance) lives only in the owned substrate (`echo.db` / org-hub store) — never in a rented SaaS. Surfaces are pluggable per customer; the loop is the identity.

## Immediate application (lab pilot, phase 1, n=2)

Stages 2 and 5 run concierge: before any card is proposed, the strategist retrieves ledger + Linear state and stamps the triage verdict on the card; briefs join decision slate + issue states + captured eng progress. Automation of stage 2 = the zero-retrievals tuning successor; automation of stage 5 = the brief composer. Both get specced only after the pattern stabilizes across 2–3 advisor meetings.

## The form — how the loop stays tool/surface-agnostic (same day)

**Typed object model + five stage contracts + MCP ports. No pipeline, no vendor nouns in the core.**

1. **Invariant core = the decision lifecycle state machine**, event-sourced append-only (matches existing storage): `candidate → triaged{new|duplicate|conflict|supersedes|update} → proposed → ratified|dismissed → dispatched{work_item_ref} → observed{evidence} → closed|superseded_by`. Every transition is an immutable event with provenance (source atom ids, quotes, actor, timestamp). Stage transitions reference atom ids and verdicts — never vendors.
2. **Stages are contracts, not integrations** — each stage defines input→output; a tool "binding" satisfies the contract or it doesn't. Adding Mattermost/Jira/Zoom adds a binding row; the loop is untouched.
3. **Surface-agnostic proposals via self-describing artifacts** — generalize the shipped `echo-intake-seed v1` embedded-payload pattern (the base64 seed inside the Slack intake card): the proposal carries its own machine-readable payload, so any button-capable surface can host Validate and the confirm leg parses it back regardless of venue.
4. **Executor-agnostic stages** — a stage may be run by daemon code, an LLM brain binding, or a human concierge; all produce the same lifecycle event. This is why phase 1 runs with zero new code, and why concierge→automation is a swap, not a rewrite. Doctrine precedent: `2026-05-13-echo-skills-are-the-cross-tool-protocol.md` (canonical vendor-neutral core, per-client adapters) — applied to the product.
5. **MCP is the port in both directions** — loop verbs exposed as MCP tools (`propose_decision` already is), surfaces consumed via thin adapters or brain bindings that natively speak other vendors' MCPs (e.g., Linear MCP for stage-4 dispatch and stage-2 execution-state reads).
