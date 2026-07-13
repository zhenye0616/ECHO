# Phase 2 halt-closure inventory

**Baseline:** `f77ba415` plus Phase 2 security evidence through `10c578fd`
**Canonical register:** `2026-07-10-project-echo-orientation-and-closure.md`
**Current tally:** 27 rows total; 11 resolved; 16 deferred-with-owner-and-trigger; 0 accepted-risk; 0 pending
**Readiness:** G1 closed; founder terminal package approved; G2 remains open pending independent mechanical verification and a separate SHA-bound halt-lift

This inventory does not replace the canonical register. It prevents a template, recommendation, or rubric from being mistaken for closure. Only `resolved`, `accepted-risk`, or `deferred-with-owner-and-trigger` are terminal states.

| Row | Current state | Evidence now available | Missing closure | Decision owner / next action |
|---|---|---|---|---|
| P1 | resolved | Four-stage graduation decision and aligned skill | None | Preserve; do not treat mechanism as built |
| V1 | resolved | Seven-day lookback, newest-first, explicit-only historical backfill | None | Preserve decision in `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| V2 | deferred-with-owner-and-trigger | Contract A auth code/tests; predeclared Phase 2 rubric | Missing/expired/rate-limited result | Owner: QA operator; trigger: product-only API-key candidate, before FOUNDER LIVE |
| A2 | deferred-with-owner-and-trigger | Cold-db risk and predeclared Phase 2 rubric | One-meeting cold-state result + independent grade | Owner: QA operator + independent grader; trigger: candidate and approved meeting, before FOUNDER LIVE |
| A3 | deferred-with-owner-and-trigger | Client-owned Granola/client-scoped API-key direction locked | Exact payer, terms, spend controls, and custody | Owner: founder; trigger: before client enablement/credential handoff |
| A5 | deferred-with-owner-and-trigger | Client-local single-installation direction locked | Customer-two/multi-instance decision | Owner: strategist; trigger: second signed client or first-client multi-install requirement |
| A6 | resolved | `2026-07-12-g1-exposure-baseline-closure.md`: landed scans, zero open CodeQL alerts, enforced repository controls, and terminal risk dispositions at evidence SHA `48ed4f87` | None for G1; preserve G4 history-rewrite deferral and product-qualification blockers | Security executor reruns the audit if a control changes or a dismissed boundary enters the client product |
| B1 | deferred-with-owner-and-trigger | Evidence-gated milestone sequence locked | Lab windows/dependencies | Owner: founder + lab counterpart; trigger: lab confirms discovery/first-meeting windows |
| B5 | deferred-with-owner-and-trigger | Paid design-partner direction; `echo-brain` working name | Exact offer price/payment/buyer/name | Owner: founder; trigger: before first commercial offer |
| B6 | resolved | Assisted install/use/repeat/restart/recovery/operator/support floor locked | None | Preserve decision in `2026-07-12-g2-terminal-dispositions-and-repository-topology.md` |
| T1 | resolved | Product-only allowlist and two-repository topology locked | None | Preserve decision and enforce with post-lift composition fence |
| T2 | resolved | Installation-local mutable state and encrypted credential-free backup rule locked | None | Preserve decision and implement after lift |
| T5 | resolved | General remote writes excluded; bounded approved delivery only | None | Preserve decision and implement after lift |
| T7 | deferred-with-owner-and-trigger | Single-installation identity direction locked | Cross-instance identity contract | Owner: strategist; trigger: second install or first cross-instance restore |
| T8 | resolved | Embeddings excluded from release one | None | Strategist reconsiders only on measured unsolved quality failure |
| T9 | resolved | Encrypted backup and pre-client restore drill gate locked | Later drill evidence | Implement and drill before client enablement |
| T10 | resolved | Copy migration, smoke, atomic cutover, code+state rollback locked | Later rehearsal evidence | Implement and rehearse before qualification/client use |
| T11 | deferred-with-owner-and-trigger | Granola dependency known; no historical backfill | Actual plan/quota/payer | Owner: founder + client counterpart; trigger: before client enablement |
| C1 | deferred-with-owner-and-trigger | Required access classes enumerated | Workspace/transcript/admin settings | Owner: founder + lab counterpart; trigger: before real client transcript processing |
| C2 | deferred-with-owner-and-trigger | Language/length risk identified | Sample or accepted bounds | Owner: founder + lab counterpart; trigger: before real client transcript processing |
| C3 | deferred-with-owner-and-trigger | Internal-heavy assumption identified | Meeting mix and intake consequence | Owner: founder + lab counterpart; trigger: before real client transcript processing |
| C4 | deferred-with-owner-and-trigger | Aggressive selling and paid design-partner direction locked | Buyer/count/cadence/CTA/date/private identity system | Owner: founder; trigger: before first commercial outreach/offer |
| X1 | deferred-with-owner-and-trigger | Honest demo options and default behavior locked | Submit/defer choice | Owner: founder; trigger: before 2026-07-18 freeze; absent choice defaults to DEFER/no change |
| X2 | deferred-with-owner-and-trigger | Agreement/data topics enumerated | Entity/agreement/adviser/owner/deadline | Owner: founder; trigger: before accepting payment/signing first client |
| X3 | deferred-with-owner-and-trigger | Data policy and lab checklist exist | Consent/policy, incident, deletion/offboarding, notification owners | Owner: founder + lab counterpart; trigger: before transcript processing/install |
| X4 | deferred-with-owner-and-trigger | Required second-operator capabilities locked | Operational proof | Owner: founder; trigger: before CLIENT LIVE; full rotation waits for second paid client |
| X5 | resolved | Bounded client-operator manual/batch approval, fail closed | None | Preserve decision and implement after lift |

## Objective work completed in Phase 2 so far

- Gitleaks 8.30.1 textual-history scan plus separately enumerated binary/archive scan, zero findings.
- Reproducible sanitized semantic-history detectors run; known content/history caveat preserved.
- Pinned all-path CI workflow and manual fail-closed pre-push installer implemented with focused tests.
- Empirical rubrics, G3 template, and lab access checklist prepared without running live probes.
- G1/A6 closed on landed scans, enforced repository controls, and terminal finding dispositions. Control drift or a dismissed boundary entering the client product reopens the relevant security review, not product demand.

## Deferred evidence and decisions

- Every remaining item is terminally deferred with the owner and trigger shown above; no row is pending.
- Empirical tests still require their approved input/environment/operator and maturity timing.
- Client/commercial/legal details still close at their pre-outreach, pre-payment, pre-processing, pre-enablement, or pre-CLIENT-LIVE triggers.
- These deferrals do not reopen demand and do not weaken the T1 product boundary.

## Mechanical G2 rule

The canonical register now gives every row one terminal state and a real evidence/trigger reference. A non-author checker must still verify all 27 rows mechanically and confirm cited files exist at the exact landed SHA. The founder then signs a separate `clarity-halt-lift` decision. That signature authorizes proposal conversion only; it does not make anything FOUNDER LIVE, QUALIFIED, or CLIENT LIVE.
