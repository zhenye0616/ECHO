# Project ECHO orientation and closure view

**Date:** 2026-07-10 · **Updated:** 2026-07-12 · **Evidence baseline:** `67f5949e` + founder commercial-focus decision · **Status:** founder orientation view

> **Terminology supersession (2026-08-02):** Read this record's `FOUNDER LIVE` / `founder-live` stage references as `INTERNAL LIVE` / `internal-live` under `2026-07-11-team-product-graduation-pipeline.md`. The criteria are unchanged except that the lane runs on a team-controlled internal Mac; founder release authority is unchanged.

This is the short founder-facing view of the project. It does not replace the evidence-rich `2026-07-10-full-project-map.md` or the execution inventory in `2026-07-10-clarity-sprint-plan.md`. It gives those documents the missing orientation layer: what Project ECHO contains, what the active product slice actually is, how mature each capability is, and what must be true before the clarity halt can lift.

## Current truth in one paragraph

ECHO contains (1) a local context substrate, (2) a cross-vendor agent-coordination system, and (3) a Team decision product. Only the third is the current commercial bet. Its first saleable wedge is the meeting-to-brief experiment, whose pain and demand are considered proven by the founder. The job now is to carve that working experiment out of the ECHO lab, support assisted onboarding, install it on the client's machine, let it run without the founder's machine, and sell it aggressively. Machine context and Fleet coordination remain internal assets, not parallel products. Delivery readiness is still unproven: the current candidate is formally DEV, rides the full lab daemon and founder CLI auth, lacks the client's Zoom/Mattermost adapters, and retains concierge steps. The clarity halt remains until the productization questions below are closed.

## Read the project through five artifacts

| Artifact | Job | It is not |
|---|---|---|
| `2026-07-11-commercial-focus-team-product-carve.md` | Founder-locked product and commercialization direction | A build spec or halt lift |
| `2026-07-11-team-product-graduation-pipeline.md` | DEV -> FOUNDER LIVE -> QUALIFIED -> CLIENT LIVE and release matrix | Evidence that the mechanism exists today |
| This orientation and closure view | Two-minute system model, maturity view, and halt gate | The full evidence archive |
| `2026-07-10-full-project-map.md` | Canonical evidence and risk register across KK/KU/UK/UU lenses | A prioritized roadmap or maturity model |
| `2026-07-10-clarity-sprint-plan.md` | Workstream inventory, dependency order, and verification plan | A promise that every inventory line and 20 reorg rows fit before Jul 24 |

The four epistemic quadrants are filters over the project, not maturity states. Product maturity has one axis below. Repo/package state, automated-vs-concierge mode, lifecycle, and evidence are separate attributes.

## What Project ECHO contains

| Layer | Purpose | Current reality | Active boundary |
|---|---|---|---|
| Machine substrate | Capture Cursor, Claude Code, Codex, git, and selected APIs into one append-only store; return context through MCP | Shipped and founder-dogfooded; no validated standalone customer problem | Internal asset; maintain only where it supports the Team product or development workflow |
| Fleet coordination | Let strategist, builder, reviewer, watcher, and dispatcher bindings coordinate through skills, backlog state, task-state, review rounds, and coord atoms | Shipped and used to build ECHO; no validated standalone customer problem | Internal operating system, not a product currently being sold |
| Team decision product | Extract meeting/chat signals, reconcile them, ratify decisions, dispatch work, and compose backflow | Chosen commercial product; pain and demand are founder-validated; implementation is mixed live/concierge | Company focus; sell and productize this system |
| First saleable wedge | Turn one meeting into one useful brief | Core works in the founder regime; current implementation still rides the full lab daemon and founder CLI auth | Carve only the meeting-to-brief requirements first; no unrelated lab systems |
| Client product boundary | Assisted onboarding, client-machine install, meeting input, useful brief, health, upgrade/rollback, support/data contract | Direction locked; end-to-end client delivery not yet proven; Zoom/Mattermost adapters have zero code | After onboarding, runs without repo checkout or the founder's machine |

## Product maturity axis

| Stage | Meaning | Current Team-wedge status |
|---|---|---|
| DEV | A candidate exists but is still developed in the lab with scratch state and fixtures | Current meeting -> signal -> brief candidate |
| FOUNDER LIVE | A versioned package built from a pinned SHA ran on real founder workflows in an isolated live regime | Not reached by the current candidate; the predecessor has useful founder-regime evidence |
| QUALIFIED | Product-boundary artifact passed every release-matrix cell and exact-artifact founder staging smoke | Not reached |
| CLIENT LIVE | Exact QUALIFIED bytes run on the client's Mac with client-local state/credentials and repeat use | Not reached |

This is the only maturity vocabulary. `merged`, `packaged`, `concierge`, `E3`, or `founder-locked` describe other facts; none advances a capability to QUALIFIED or CLIENT LIVE. Work with no implementation candidate has no maturity stage; `No candidate` is a repository fact, not a fifth stage. Canonical contract: `2026-07-11-team-product-graduation-pipeline.md`.

## The three live flows

```text
Machine context
Cursor / Claude Code / Codex / git -> capture + normalize -> echo.db -> MCP -> AI clients

Fleet coordination
spec -> builder -> independent review -> founder merge gate -> shipped record + task state

Commercial wedge today
Granola -> meeting atoms -> signal extraction -> founder triage/confirm -> echoctl brief
        -> founder reads -> manual Mattermost delivery

Target client product (not built end to end)
Zoom -> meeting contract -> signals -> human-gated decision loop -> Mattermost
     running from a versioned client-machine package with an API-key brain
```

## Work already done, by era

The repo has 130 completed item specs at the original map baseline (plus one legacy `.review.md` sidecar in `backlog/complete/`). Most of that work is technical leverage, not evidence of three viable products.

| Era | Durable work created | Representative evidence |
|---|---|---|
| Apr 30 | Capture gate, append-only storage, daemon, Cursor/Claude/git capture, first MCP retrieval | Complete items 001-015 |
| May 6-10 | Normalization, cross-source clustering, exact search, MRU/session tools, recovery and retrieval reliability | Complete items 016-038 |
| May 11-Jun 13 | Cross-vendor review/merge protocol, coord substrate, task-state, packaged CLI, onboarding, selftest, release gates | Complete items 039-102 |
| Jun 18-Jul 2 | Granola capture, reasoning brain, Slack/Linear intake, cross-team decision sync, packaged-daemon hardening | Complete items 103-111 |
| Jul 4-10 | Signal contracts, drift/backflow primitives, observability, decision changesets, meeting-to-brief command | Complete items 112-131 |
| Jul 10 | Client carve reviewed then withdrawn; standing decisions retained; clarity halt declared | Register Part 4 + `0ab0af05` |

## Supporting attributes — not maturity

| Attribute | Values | Meaning |
|---|---|---|
| Repository/package state | `absent \| merged \| packaged` | Whether code exists and is included; says nothing about client readiness |
| Operating mode | `automated \| concierge` | Whether software or a human satisfies the contract |
| Lifecycle | `active \| deferred \| retired` | Whether work is current, intentionally parked, or superseded |
| Decision state | `locked \| open` | Whether direction is settled; a locked decision can still be unbuilt |

| Evidence | Meaning |
|---|---|
| `E4` | Installed on the client machine, including through assisted onboarding; the client then operated it, repeated the workflow, and acted on the result without the founder's machine |
| `E3` | Founder live-run or sustained dogfooding on real data |
| `E2` | Code plus automated tests or a reproducible local check |
| `E1` | Explicit decision, static analysis, or preserved design evidence |
| `E0` | Hypothesis, missing research, or uninstrumented regime |

The founder's demand decision is separate from this delivery-evidence scale. The Team-product pain and demand are considered proven; `E4` still has not been reached for client-machine delivery and repeat operation.

## Capability and proof matrix

| Capability | Product maturity | Other attributes / proof | Next gate |
|---|---|---|---|
| Cross-tool capture + append-only store | Internal; outside Team maturity axis | `merged / E3`; useful substrate, not a validated standalone offer | Maintain only where required by Team or ECHO development |
| MCP retrieval | Internal; outside Team maturity axis | `merged / E3`; first wedge deliberately does not depend on it | Keep stable; do not let it displace the carve |
| Cross-vendor agent coordination | Internal; outside Team maturity axis | `merged / E3`; effective internal operating system | Maintain reliability; no independent commercial roadmap |
| Meeting capture | Granola `DEV`; Zoom `No candidate` | Granola `merged / automated / E3` predecessor evidence; Zoom `absent / E0` | Pinned isolated Granola rerun; client access discovery; post-G2 Zoom adapter proposal |
| Signal extraction | `DEV` | `merged / automated / E3` predecessor evidence; still founder CLI/full-lab regime | Cold-db, cutoff/order, real auth-expiry evidence, then pinned isolated rerun |
| Triage against org state | `DEV` | `concierge / E3` predecessor evidence; one advisor cycle | Record 2-3 more patterns; define founder-live plan; implementation waits for G2 |
| Human validation | `DEV` | `concierge / E3` predecessor evidence, conditional on responder/credentials | Confirm shape and operating contract; include in pinned isolated rerun |
| Dispatch | Excluded from first wedge | `merged / E3` only in retired Justinian regime | Re-enter only through an explicit wedge-boundary decision |
| Brief composition | `DEV` | `merged / automated / E3` predecessor evidence; finalized command did not produce the recorded live brief | Pinned isolated current-candidate run, then qualification-ready behavior |
| Product boundary + qualification pipeline | `No candidate` | `locked / E1`; contract written, mechanism absent | After G2: composition root, fence, tests/product, build-once evidence records |
| Problem and demand | Not a maturity item | `locked / N/A`; founder chose aggressive commercialization | Preserve decision; never reopen it through release evidence |
| Client delivery | `No candidate` | Manual founder hand-paste is useful predecessor concierge evidence, not formal FOUNDER LIVE or client delivery | Delivery adapter/contract, then qualification and G6 acceptance |
| Client deployment | `No candidate` | `locked / E1`; assisted install direction only | Qualification, then exact-artifact G6 install and acceptance |
| Commercial/legal/data execution | Not a maturity item | `open / E0-E1` | Resolve sales/delivery mechanics without reopening demand |

## The actual proof boundary

**Proven:** the founder considers the Team-product pain and demand proven; automated tests are broad; a predecessor workflow produced meeting-derived cards and briefs on real founder data; the cross-tool substrate and coordination protocol provide internal leverage.

**Not proven:** a versioned, pinned, isolated FOUNDER LIVE package run of the current candidate; product qualification; product-only packaging/runtime; exact-artifact client release and repeat operation; cold-db quality; unattended auth failure; Zoom/Mattermost access and adapters; active monitoring/alerting; backup/restore; the exact pricing/sales motion; or a client-approved data/consent contract.

The phrase “full five-stage loop ran live” is therefore too strong for the founder-run experiment. The honest live sequence is meeting capture -> extraction -> concierge triage/confirm -> brief -> manual delivery. Dispatch proof belongs to an earlier customer regime.

## Critical path

| Gate | Required outcome | DRI | Blocks |
|---|---|---|---|
| G0 Truth baseline | Orientation surfaces name the Team product as the only commercial focus and Machine/Fleet as internal assets | Strategist + founder | All downstream documentation |
| G1 Exposure baseline | Separate secret and content scans; HEAD remediation; committed-content/data policy; rewrite decision | Founder + security executor | New live-data artifacts and client sharing |
| G2 Clarity halt lift | Every halt-register row is resolved, accepted-risk, or deferred with owner+trigger; no row reopens product demand; founder records approval at a named SHA | Founder | New build specs and product work |
| G3 Jul 18 freeze | Immutable demo SHA, tarball checksum, db snapshot, plist/env export, smoke result, rollback artifact, emergency-change owner | Demo operator | Demo-box changes |
| G4 History/reorg maintenance | Holdout evidence closed; history rewrite completed or explicitly deferred; conflicting path moves frozen or rebaselined | Repo maintainer | History rewriting and conflicting moves only; unrelated reorg never blocks the carve |
| G5 Qualification | Build-once product-only artifact passes machine qualification; independent review and exact-artifact founder staging pass; checksum-bound founder release authorization completes the matrix and seals the QUALIFIED record | QA operator + independent reviewer + founder | Protected release/tag and client acceptance |
| G6 Client install + acceptance | Exact G5 artifact/checksum installed on the actual client Mac; access/agreement/consent/data recorded; healthy runtime produces a useful brief from a real meeting, repeats the workflow, and has support/recovery/rollback ownership | Founder + client counterpart | CLIENT LIVE status after the multi-run acceptance record closes; candidate remains QUALIFIED before then |

## Halt closure register (Part 4 + critical additions)

The P/V/A/B/T/C rows operationalize productization and the Part-4 agenda; X rows capture P0 blind spots beyond that agenda. Every row must end in exactly one state before G2: `resolved`, `accepted-risk`, or `deferred-with-owner-and-trigger`. “Open in _followups.md” is not closure. Resolution does not require building the fix during the halt.

| ID | Question | Baseline state | Required closure artifact | DRI | Closure state | Closure evidence / deferral trigger |
|---|---|---|---|---|---|---|
| P1 | Product graduation path | Founder requested clean DEV -> FOUNDER LIVE -> qualification -> client separation | Four-stage decision + aligned promotion skill | Founder + strategist | resolved | `2026-07-11-team-product-graduation-pipeline.md` |
| V1 | Signals first-run cutoff and newest-first semantics | Gap verified; semantics open | Decision note + post-lift queue rank | Strategist | resolved | Seven-day initial lookback; newest first; no automatic history backfill; explicit operator command only after green first-run health. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| V2 | Unattended brain auth expiry | Untested | Timed probe with predeclared pass/fail rubric | Operator | deferred-with-owner-and-trigger | Owner: QA operator. Trigger: product-only API-key brain candidate exists; run missing/expired/rate-limited auth test before FOUNDER LIVE. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| A2 | Cold-db extraction quality | Untested | Scratch-ECHO_HOME comparison against warm baseline | Operator + independent grader | deferred-with-owner-and-trigger | Owner: QA operator + independent grader. Trigger: product-only candidate and approved founder meeting exist; run before FOUNDER LIVE. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| A3 | Brain economics, terms, and key custody | API-key direction decided; analysis open | Cost model + account/custody/terms decision | Founder | deferred-with-owner-and-trigger | Owner: founder. Trigger: before client enablement/credential handoff; direction is client-owned Granola, client-scoped API key, client-paid usage, no founder CLI credential. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| A5 | Repeatable client topology | Client-local direction locked; customer-2/multi-user/support shape open | Deferred state naming owner and customer-2 trigger, or topology decision | Strategist | deferred-with-owner-and-trigger | Owner: strategist. Trigger: second signed client or first-client requirement for multiple isolated installations. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| A6 | Public history and customer-data handling | Exposure remediated/scanned; Job C rewrite deferred; repository controls enforced; CodeQL terminal | Scan report + data/retention/deletion/custody decision | Founder + security executor | resolved | `2026-07-12-g1-exposure-baseline-closure.md`; technical evidence SHA `48ed4f87`; Job C remains an explicit G4 deferral in `2026-07-11-filter-repo-decision-template.md` |
| B1 | Lab rollout calendar | Open | Milestones and dependency dates confirmed with lab | Founder + lab counterpart | deferred-with-owner-and-trigger | Owner: founder + lab counterpart. Trigger: lab confirms access-discovery and first-meeting windows; then set evidence-gated dates. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| B5 | Pricing and customer-visible name | Product choice closed; commercial mechanics open | Pricing posture + rename decision or explicit timed deferral | Founder | deferred-with-owner-and-trigger | Owner: founder. Trigger: before first commercial offer, set price, payment, buyer, and offer name; paid design-partner direction and `echo-brain` working name are locked. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| B6 | Phase-1 operational definition of done | Product choice closed; delivery outcome open | Client-machine install/use/repeat metric plus rollout, rollback, and support thresholds; never a product-demand kill gate | Founder | resolved | Assisted install; one useful real-meeting brief; second real meeting on another day; healthy restart; observed recovery/rollback; named client operator/support owner; no founder credentials/runtime. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| T1 | Product source allowlist | Open | Source-by-source inclusion decision | Strategist | resolved | Meeting-to-brief product allowlist and two-repository topology locked; no runtime/build dependency on the dev platform. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| T2 | Sidecar classification | Open | Instance-local vs transferable state table | Strategist | resolved | All mutable state is installation-local; only encrypted credential-free backup is transferable; restore version recorded. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| T5 | Remote-write path | Open | Direction decision with failure/rollback boundary | Strategist + operator | resolved | No general remote writes; only allowlisted post-approval brief delivery with idempotency and visible failure. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| T7 | Cross-instance row identity | Open | Identity contract or explicit single-instance deferral | Strategist | deferred-with-owner-and-trigger | Owner: strategist. Trigger: second client installation or first cross-instance restore. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| T8 | Embeddings on the client machine | Open | Include/exclude decision with privacy/cost rationale | Founder + strategist | resolved | Excluded from release one; strategist reconsiders only after measured cold-state/brief-quality failure unsolved by meeting content. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| T9 | Backup rule | Open | Backup/restore decision plus drill or named pre-client blocker | Operator | resolved | Encrypted local backup before upgrade/migration; client-agreed retention/location; restore drill before enablement. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| T10 | Migration order on populated db | Open | Upgrade/migration/rollback order plus rehearsal gate | Operator | resolved | Stop, verify backup, migrate copy, smoke, atomic cutover, retain prior qualified artifact/state, roll back code+state. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| T11 | Granola quota and plan gating | Open | Measured quota/plan result and payer decision | Founder + client counterpart | deferred-with-owner-and-trigger | Owner: founder + client counterpart. Trigger: before client enablement, measure actual plan/quota/payer; no historical backfill. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| C1 | Lab transcript/workspace settings | Unknown | Access-discovery checklist completed with lab | Founder + lab counterpart | deferred-with-owner-and-trigger | Owner: founder + lab counterpart. Trigger: before real client transcript processing, confirm workspace/transcript/admin settings. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| C2 | Meeting language and length distribution | Unknown | Sample or interview result; accepted bounds documented | Founder + lab counterpart | deferred-with-owner-and-trigger | Owner: founder + lab counterpart. Trigger: before real client transcript processing, obtain sample or accepted language/length bounds. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| C3 | Internal vs external meeting mix | Likely internal-heavy; unverified | Lab confirmation and intake-gate consequence | Founder + lab counterpart | deferred-with-owner-and-trigger | Owner: founder + lab counterpart. Trigger: before real client transcript processing, confirm meeting mix and intake consequence. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| C4 | Initial sales execution | Product choice closed; offer and cadence unwritten | Written offer, named buyer, target-account list, outreach cadence, demo/CTA, and first-contact date | Founder | deferred-with-owner-and-trigger | Owner: founder. Trigger: before first commercial outreach/offer, set buyer, sanitized count, cadence, CTA, first date, and private identity system; paid design-partner direction locked. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| X1 | YC application and demo-vs-halt collision | Open | Submit/defer decision + honest post-pivot demo scope | Founder | deferred-with-owner-and-trigger | Owner: founder. Trigger: before 2026-07-18 freeze; absent a decision, default `DEFER` with no demo change; if submit, recommendation remains meeting-to-brief only and cut old scene 1. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| X2 | Entity, IP process, and initial client agreement | Open | Entity/client-agreement decision; IP questions handled through the appropriate external process | Founder | deferred-with-owner-and-trigger | Owner: founder. Trigger: before accepting payment/signing first client, decide entity, agreement, adviser, owner, and deadline. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| X3 | Consent/IRB, offboarding, and incident ownership | Open | Lab-approved handling/consent path + deletion/offboarding/support protocol | Founder + lab counterpart | deferred-with-owner-and-trigger | Owner: founder + lab counterpart. Trigger: before client transcript processing/install, decide policy/consent, incident, deletion/offboarding, and notification owners. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| X4 | Founder-unavailable operations | Open | Credential/restart inventory + pause/notify protocol a second operator can follow | Founder | deferred-with-owner-and-trigger | Owner: founder. Trigger: before CLIENT LIVE, second operator proves credential inventory, restart, pause/notify, and rollback; full rotation waits for second paid client. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| X5 | Confirm-leg interaction shape and responder operation | Propose/confirm proven only while the hand-run responder is up; founder wants confirmation "natural, not a chore" | Interaction-shape decision (responder-as-service, MCP confirm path, or batch gesture) or explicit deferral naming the first-client workaround | Founder + strategist | resolved | Client one uses bounded manual/batch approval owned by client operator; fail closed; never deliver an unapproved brief. `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |

`C4` starts with commercial execution: its trigger is before the first outreach or offer, and it never functions as a demand-validation gate. The founder-approved terminal package is recorded in `2026-07-12-g2-terminal-dispositions-and-repository-topology.md`: 27 rows total, 11 resolved, 16 deferred with owner and trigger, zero accepted-risk, and zero pending. Independent verification completed at main SHA `4cc700001ac07b66fdf0700643b29cdde8b83fb7`, and the founder signed `2026-07-12-clarity-halt-lift.md`. The lift becomes effective when that signed record lands on `main` without changing the approved base.

## Halt-lift rule (ratified 2026-07-10)

*Ratified 2026-07-10 and amended by founder decision 2026-07-11. The amendment locks the Team product and its demand, supersedes the founder-box delivery endpoint with the client's machine, and retires demand discovery as a halt gate. The G2 signature itself remains the founder's.*

The halt has no calendar expiry. The founder may lift it only by committing a short `clarity-halt-lift` decision that:

1. names the main SHA being approved;
2. accepts the current-truth paragraph and capability matrix, with edits if needed;
3. records one of the three closure states for every halt-register row;
4. names any unresolved empirical result as an explicit blocker or accepted risk;
5. confirms the critical-path ordering, especially the exposure and history/reorg gates;
6. authorizes conversion of ranked dispositions into `backlog/proposed/` specs; and
7. carries a mechanical row-completeness verification performed by one non-author binding — every register row in exactly one terminal state, every cited closure artifact present at the named SHA — recorded in the same document.

The lift authorizes conversion, not content: converted specs flow through the normal review queue like any other item. Register rows may be added before G2 only with a stated P0 rationale (founder call or a strategist review pass); the register is otherwise frozen at ratification.

If the founder does not sign that artifact, “no new specs created” is the correct outcome. Customer outreach, offer design, and onboarding discovery still continue. A halt lift means the project is clear enough to resume development; it does not mean the product is client-ready.

## Maintenance rule

This view is intentionally small. Update it only when one of these changes: project scope, capability delivery state, evidence grade, critical-path gate, or halt-closure status. Put detailed findings and evidence in the full map, and execution detail in the sprint plan. Never expand this view into a second 100-entry register.
