# Project ECHO orientation and closure view

**Date:** 2026-07-10 · **Evidence baseline:** `5bfb407b` · **Status:** companion view; no new product decisions

This is the short founder-facing view of the project. It does not replace the evidence-rich `2026-07-10-full-project-map.md` or the execution inventory in `2026-07-10-clarity-sprint-plan.md`. It gives those documents the missing orientation layer: what Project ECHO contains, what the active product slice actually is, how mature each capability is, and what must be true before the clarity halt can lift.

## Current truth in one paragraph

ECHO is not one product surface. It is (1) a local append-only context substrate for AI work, (2) a cross-vendor coordination protocol for AI agents, and (3) a team decision-loop lab. The active pilot candidate is much narrower: a founder-operated, retrieval-less meeting-to-brief slice for a university lab. That slice is built, tested, and live on founder meetings, but it is not isolated from the full lab daemon, deployed on a fresh client box, validated by a non-founder user, or connected to the lab's actual Zoom and Mattermost systems. Triage and delivery still contain concierge steps. Dev remains halted until the founder ratifies a complete-enough map at a named commit.

## Read the project through three artifacts

| Artifact | Job | It is not |
|---|---|---|
| This orientation and closure view | Two-minute system model, maturity view, and halt gate | The full evidence archive |
| `2026-07-10-full-project-map.md` | Canonical evidence and risk register across KK/KU/UK/UU lenses | A prioritized roadmap or maturity model |
| `2026-07-10-clarity-sprint-plan.md` | Workstream inventory, dependency order, and verification plan | A promise that all 61 bullets and 20 reorg rows fit before Jul 24 |

The four epistemic quadrants are filters over the project, not delivery states. A fact can be known while the capability is only decided, unbuilt, or unvalidated. Use the state and evidence vocabularies below whenever a concise claim is needed.

## What Project ECHO contains

| Layer | Purpose | Current reality | Active boundary |
|---|---|---|---|
| Machine substrate | Capture Cursor, Claude Code, Codex, git, and selected APIs into one append-only store; return context through MCP | Shipped and founder-dogfooded; capture, normalization, storage, daemon, CLI, and retrieval tools exist | Maintained, but deliberately not the current pilot product |
| Fleet coordination | Let strategist, builder, reviewer, watcher, and dispatcher bindings coordinate through skills, backlog state, task-state, review rounds, and coord atoms | Shipped and used to build ECHO across Claude, Codex, and Cursor bindings | Operating substrate, not a client-facing destination |
| Team decision loop | Extract meeting/chat signals, reconcile them, ratify decisions, dispatch work, and compose backflow | Mixed: capture/extraction/brief are live; triage and backflow composition are partly concierge; dispatch proof is historical and customer-specific | Lab system from which the pilot slice is being learned |
| Pilot product slice | Turn one meeting into one useful brief for a university-lab pilot candidate | Scope decided as meeting-to-brief only; current implementation still rides the full lab daemon and founder CLI auth | Retrieval-less v0; macOS; founder-operated; no autonomous action |
| Client boundary | Zoom input, Mattermost delivery, dedicated Mac, tarball deploy, API-key brain, support/data contract | Mostly decided or absent, not deployed; Zoom/Mattermost adapters have zero code | Must not be described as shipped |

## The three live flows

```text
Machine context
Cursor / Claude Code / Codex / git -> capture + normalize -> echo.db -> MCP -> AI clients

Fleet coordination
spec -> builder -> independent review -> founder merge gate -> shipped record + task state

Pilot path today
Granola -> meeting atoms -> signal extraction -> founder triage/confirm -> echoctl brief
        -> founder reads -> manual Mattermost delivery

Target pilot path (not built end to end)
Zoom -> meeting contract -> signals -> human-gated decision loop -> Mattermost
     running from a dedicated Mac tarball with an API-key brain
```

## Work already done, by era

The repo has 130 completed item specs at the baseline SHA (plus one legacy `.review.md` sidecar in `backlog/complete/`). The current lab-pilot map should not erase the earlier work that makes it possible.

| Era | Durable work created | Representative evidence |
|---|---|---|
| Apr 30 | Capture gate, append-only storage, daemon, Cursor/Claude/git capture, first MCP retrieval | Complete items 001-015 |
| May 6-10 | Normalization, cross-source clustering, exact search, MRU/session tools, recovery and retrieval reliability | Complete items 016-038 |
| May 11-Jun 13 | Cross-vendor review/merge protocol, coord substrate, task-state, packaged CLI, onboarding, selftest, release gates | Complete items 039-102 |
| Jun 18-Jul 2 | Granola capture, reasoning brain, Slack/Linear intake, cross-team decision sync, packaged-daemon hardening | Complete items 103-111 |
| Jul 4-10 | Signal contracts, drift/backflow primitives, observability, decision changesets, meeting-to-brief command | Complete items 112-131 |
| Jul 10 | Client carve reviewed then withdrawn; standing decisions retained; clarity halt declared | Register Part 4 + `0ab0af05` |

## State and evidence vocabulary

Use both fields. Neither field substitutes for the other.

| Delivery state | Meaning |
|---|---|
| `live` | Exercised on real data under named conditions |
| `shipped` | Merged and tested, but not necessarily exercised in the target regime |
| `concierge` | A human currently satisfies part of the contract |
| `decided` | Ratified direction; implementation does not yet exist |
| `open` | Known question or missing decision |
| `deferred` | Explicitly inactive until a named owner/trigger reopens it |
| `absent` | Required capability has no implementation |
| `retired` | Previously current, now explicitly superseded |

| Evidence | Meaning |
|---|---|
| `E4` | A non-founder target user installed, used, and acted on the result |
| `E3` | Founder live-run or sustained dogfooding on real data |
| `E2` | Code plus automated tests or a reproducible local check |
| `E1` | Explicit decision, static analysis, or preserved design evidence |
| `E0` | Hypothesis, missing research, or uninstrumented regime |

No current university-lab pilot capability has reached `E4`.

## Capability and proof matrix

| Capability | State / proof | Strongest honest claim | Next gate |
|---|---|---|---|
| Cross-tool capture + append-only store | `live / E3` | Founder machine continuously captures multiple AI/code sources into one local store | Retention/deletion policy and long-lived growth drill |
| MCP retrieval | `live / E3` | Exact search, clusters, atom fetch, MRU resolution, and task-state reads are shipped and dogfooded | Keep retrieval quality instruments current; pilot v0 deliberately does not depend on retrieval |
| Cross-vendor agent coordination | `live / E3` | File-backed claim/review/merge protocol and coord observability have run across multiple vendor bindings | Correct stale orientation gates and self-maintenance checks |
| Meeting capture | `live / E3` for Granola; `absent / E0` for Zoom | Granola meetings are captured on founder infrastructure | Lab access discovery, then Zoom adapter research/spec after halt lift |
| Signal extraction | `live / E3` | Real founder meetings produced useful decision/action/rationale signals | Cold-db run; first-run cutoff/order decision; real auth-expiry probe |
| Triage against org state | `concierge / E3` | One advisor cycle was manually reconciled; automation is intentionally deferred | Record 2-3 more patterns before spec work |
| Human validation | `live / E3` (conditional) | Propose/confirm works while the responder and credentials are live | Confirm-after-edit, responder uptime, and interaction-shape decision |
| Dispatch | `shipped / E3` (historical regime) | Slack-to-Linear plumbing was live-tested in the cancelled Justinian regime | Revalidate only if dispatch re-enters the lab-pilot scope |
| Brief composition | `live / E3` | `echoctl brief` is tested and has produced founder-graded briefs from real meetings | Non-founder recipient feedback; `--wait`; target-miss diagnostics |
| Delivery to the lab | `concierge / E1` | Founder can hand-paste a reviewed brief to Mattermost | Mattermost access discovery and adapter work after halt lift |
| Client deployment | `decided / E1` | Direction is a versioned tarball on a dedicated founder-controlled Mac; current brief extraction still needs CLI auth | Distinguish current CLI-auth install from target API-key install; reuse the shipped direct Claude SDK pattern from intake; rehearse install/upgrade/rollback |
| Commercial/legal/data readiness | `open / E0-E1` | Risks and missing decisions are named | WTP, rollout, entity/pilot terms, consent, custody, retention, deletion, and incident ownership |

## The actual proof boundary

**Proven:** code exists for the Granola-to-brief core; automated tests are broad; the founder has run meeting-derived cards and briefs on real data; the cross-tool substrate and coordination protocol are heavily dogfooded.

**Not proven:** a non-founder target user installing or relying on the pilot; cold-db quality; fresh-machine deployment; unattended auth failure; Zoom/Mattermost access and adapters; active monitoring/alerting; backup/restore; recipient usefulness; pricing/WTP; or a lab-approved data/consent contract.

The phrase “full five-stage loop ran live” is therefore too strong for the lab pilot. The honest live sequence is meeting capture -> extraction -> concierge triage/confirm -> brief -> manual delivery. Dispatch proof belongs to an earlier customer regime.

## Critical path

| Gate | Required outcome | DRI | Blocks |
|---|---|---|---|
| G0 Truth baseline | This view accepted; current-state claims corrected; orientation surfaces name one project model and one pilot boundary | Strategist + founder | All downstream documentation |
| G1 Exposure baseline | Separate secret and content scans; HEAD remediation; committed-content/data policy; rewrite decision | Founder + security executor | New live-data artifacts and pilot sharing |
| G2 Clarity halt lift | Every Part-4 row below is resolved, accepted-risk, or deferred with owner+trigger; founder records approval at a named SHA | Founder | New build specs and product work |
| G3 Jul 18 freeze | Immutable demo SHA, tarball checksum, db snapshot, plist/env export, smoke result, rollback artifact, emergency-change owner | Demo operator | Demo-box changes |
| G4 History/reorg maintenance | Holdout evidence closed; rewrite completed or explicitly deferred; references rebaselined before moves | Repo maintainer | Mass archive/path moves and successor carve inventory |
| G5 Client handoff | Clean-machine rehearsal incorporated; access, WTP, consent, and data gates passed | Founder + lab counterpart | Pilot installation |

## Halt closure register (Part 4 + critical additions)

The V/A/B/T/C rows operationalize the Part-4 agenda; X rows capture P0 blind spots the adversarial pass found beyond that agenda. Every row must end in exactly one state before G2: `resolved`, `accepted-risk`, or `deferred-with-owner-and-trigger`. “Open in _followups.md” is not closure. Resolution does not require building the fix during the halt.

| ID | Question | Baseline state | Required closure artifact | DRI |
|---|---|---|---|---|
| V1 | Signals first-run cutoff and newest-first semantics | Gap verified; semantics open | Decision note + post-lift queue rank | Strategist |
| V2 | Unattended brain auth expiry | Untested | Timed probe with predeclared pass/fail rubric | Operator |
| A2 | Cold-db extraction quality | Untested | Scratch-ECHO_HOME comparison against warm baseline | Operator + independent grader |
| A3 | Brain economics, terms, and key custody | API-key direction decided; analysis open | Cost model + account/custody/terms decision | Founder + strategist |
| A5 | Customer-2 topology | Open; not a pilot-1 blocker | Deferred state naming owner and customer-2 trigger, or topology decision | Founder |
| A6 | Public history and customer-data handling | Exposure known; scan/policy open | Scan report + data/retention/deletion/custody decision | Founder + security executor |
| B1 | Lab rollout calendar | Open | Milestones and dependency dates confirmed with lab | Founder + lab counterpart |
| B5 | Pricing and customer-visible name | Open | Pricing posture + rename decision or explicit timed deferral | Founder |
| B6 | Phase-1 definition of done | Open | Measurable outcome and kill criterion | Founder |
| T1 | Product source allowlist | Open | Source-by-source inclusion decision | Strategist |
| T2 | Sidecar classification | Open | Instance-local vs transferable state table | Strategist |
| T5 | Remote-write path | Open | Direction decision with failure/rollback boundary | Strategist + operator |
| T7 | Cross-instance row identity | Open | Identity contract or explicit single-instance deferral | Strategist |
| T8 | Embeddings on production box | Open | Include/exclude decision with privacy/cost rationale | Founder + strategist |
| T9 | Backup rule | Open | Backup/restore decision plus drill or named pre-pilot blocker | Operator |
| T10 | Migration order on populated db | Open | Upgrade/migration/rollback order plus rehearsal gate | Operator |
| T11 | Granola quota and plan gating | Open | Measured quota/plan result and payer decision | Founder |
| C1 | Lab transcript/workspace settings | Unknown | Access-discovery checklist completed with lab | Founder + lab counterpart |
| C2 | Meeting language and length distribution | Unknown | Sample or interview result; accepted bounds documented | Founder + lab counterpart |
| C3 | Internal vs external meeting mix | Likely internal-heavy; unverified | Lab confirmation and intake-gate consequence | Founder + lab counterpart |
| X1 | YC application and demo-vs-halt collision | Open | Submit/defer decision + honest post-pivot demo scope | Founder |
| X2 | Entity, IP process, and pilot agreement | Open | Entity/pilot-letter decision; IP questions handled through the appropriate external process | Founder |
| X3 | Consent/IRB, offboarding, and incident ownership | Open | Lab-approved handling/consent path + deletion/offboarding/support protocol | Founder + lab counterpart |
| X4 | Founder-unavailable operations | Open | Credential/restart inventory + pause/notify protocol a second operator can follow | Founder + operator |
| X5 | Confirm-leg interaction shape and responder operation | Propose/confirm proven only while the hand-run responder is up; founder wants confirmation "natural, not a chore" | Interaction-shape decision (responder-as-service, MCP confirm path, or batch gesture) or explicit deferral naming the pilot-1 workaround | Founder + strategist |

## Halt-lift rule (ratified 2026-07-10)

*Reviewed and ratified by strategist pass 2026-07-10 (founder instruction, Claude Code session) against the full-map evidence base: the current-truth paragraph and capability matrix were verified claim-by-claim at `5bfb407b` + working tree (MCP tool census, complete/ census, and the intake-agent SDK reuse asset re-checked in code). Two additions below — condition 7 and the conversion paragraph; register row X5 added in the same pass. The G2 signature itself remains the founder's.*

The halt has no calendar expiry. The founder may lift it only by committing a short `clarity-halt-lift` decision that:

1. names the main SHA being approved;
2. accepts the current-truth paragraph and capability matrix, with edits if needed;
3. records one of the three closure states for every halt-register row;
4. names any unresolved empirical result as an explicit blocker or accepted risk;
5. confirms the critical-path ordering, especially the exposure and history/reorg gates;
6. authorizes conversion of ranked dispositions into `backlog/proposed/` specs; and
7. carries a mechanical row-completeness verification performed by one non-author binding — every register row in exactly one terminal state, every cited closure artifact present at the named SHA — recorded in the same document.

The lift authorizes conversion, not content: converted specs flow through the normal review queue like any other item. Register rows may be added before G2 only with a stated P0 rationale (founder call or a strategist review pass); the register is otherwise frozen at ratification.

If the founder does not sign that artifact, “no new specs created” is the correct outcome. A halt lift means the project is clear enough to resume development; it does not mean the pilot is client-ready.

## Maintenance rule

This view is intentionally small. Update it only when one of these changes: project scope, capability delivery state, evidence grade, critical-path gate, or halt-closure status. Put detailed findings and evidence in the full map, and execution detail in the sprint plan. Never expand this view into a second 100-entry register.
