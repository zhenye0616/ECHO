# Phase 2 founder decision packet

**Status:** awaiting founder session
**Purpose:** collect the decisions required to close G1/G2 without reopening product demand
**Locked input:** Team decision product, meeting-to-brief wedge, aggressive selling, and client-machine endpoint remain decided

Answer one group at a time. A checked option in an older template is not valid until the decision, owner, date, and commit SHA are recorded. Client/account identities belong in a private operating file; the public repo records roles, counts, and sanitized references only.

## 1. History rewrite - A6 / G1 - DECIDED

Canonical neutral template: `2026-07-11-filter-repo-decision-template.md`.

**Founder decision recorded 2026-07-12:** `DEFER`, owned by the founder, triggered by the first G4 exclusive maintenance window after holdout-131 evidence and branch/worktree closure, or any external report of the flagged content, whichever occurs first. Decision input SHA: `afe26cdcdb8edbad8f6c9fb1d022b8057bcc069e`.

Decision context:

- `EXECUTE`: wait for holdout-131 evidence/branch closure and the exclusive G4 window, then snapshot, stop writers, rewrite, fresh-clone, rescan, and map old SHAs to new SHAs.
- `DEFER`: name an owner, objective trigger, and explicitly accept that known content remains reachable in canonical history and prior clones.

**Tradeoff.** Execute reduces future canonical-history exposure but invalidates every SHA and delays post-G2 SHA-pinned work until the rewrite/re-pin finishes. Defer preserves continuity and permits productization after G2, but keeps known content reachable.

**Recommendation:** deliberately neutral because the choice is irreversible and the existing template promises neutrality.

**Remaining G1 settings answer needed:** either (a) re-authenticate `gh` and authorize the security executor to verify GitHub push protection, repository security settings, and release-asset policy before G1 closes, or (b) defer that read-only audit with a named owner and objective trigger. Recommendation: verify before G2 rather than defer. The current local `gh` token is invalid, so no setting is assumed green.

## 2. YC and demo - X1 / G3

Canonical options: `2026-07-11-yc-demo-plan-amendment-template.md`.

**Choice required:**

- YC: `SUBMIT` or `DEFER`.
- If submit: demo `A` (meeting-to-brief plus disclosed test-workspace replay) or `B` (meeting-to-brief only).
- Old scene 1: `CUT` or `KEEP AS A BRIEF INTERNAL-LEVERAGE BEAT`.

**Recommendation:** if submitting, choose **Option B and cut old scene 1**. It demonstrates the commercial wedge using real founder meetings, requires no rule exception or new code, and cannot be confused with a retired customer regime. A demo remains a demo, not FOUNDER LIVE evidence.

**Founder answer needed:** submit/defer, A/B if submitted, and cut/keep scene 1. This must land before the Jul 18 freeze can be sealed.

## 3. Commercial mechanics - B1 / B5 / B6 / C4

### Buyer, offer, price, payment, and name

**Options:**

- Paid design-partner engagement: fixed onboarding/pilot fee plus a defined ongoing price or paid-conversion date.
- Time-bounded unpaid pilot: explicit end date and paid-conversion decision. This conflicts with the stated aggressive-selling posture unless there is a specific access reason.
- Normal subscription from day one: clean commercial signal, but may be premature before installation/support costs are measured.

**Recommendation:** paid design-partner engagement. Keep **ECHO** as the client-visible working name for the pilot; preserve the existing hard rename deadline before public Show HN rather than blocking the first client on naming.

**Founder answer needed:** buyer role, exact offer, exact price/currency, who pays, invoicing/payment route, pilot duration, paid-conversion term, and keep/replace ECHO for the first engagement.

### Rollout calendar and dependencies

**Recommendation:** schedule by evidence gate, not optimistic feature date: access discovery -> isolated founder-live candidate run -> qualification -> assisted client install -> second real meeting/acceptance. Record the lab's available windows and every external dependency (policy approval, Zoom/Mattermost admin access, vendor account/key, contracting/payment) against those milestones.

**Founder answer needed:** target date/window for each milestone, lab counterpart for each external dependency, and the latest acceptable first-client enablement date. If the lab cannot yet commit, defer B1 with the founder as owner and the trigger `lab counterpart confirms access-discovery and first-meeting windows`.

### Operational definition of done

The already-locked floor is assisted install on the client Mac, one useful real-meeting brief, then repeat use without the founder's machine.

**Recommendation:** define repeat as a second real meeting on a different day; require healthy restart, one observed recovery or rollback rehearsal, named client operator, named support owner, and no founder credentials/runtime dependency. A failed delivery gate pauses/rolls back the install; it does not reopen demand.

**Founder answer needed:** repeat-use count, usefulness decision-maker, rollout/rollback threshold, support owner, response window, and who can disable the runtime.

### Sales execution

**Recommendation:** commit only sanitized counts/roles. Keep actual account identities in a private sales system. Record named buyer role, target-account count, weekly outreach count, demo/CTA, first-contact date, and follow-up cadence.

**Founder answer needed:** buyer role, number of initial target accounts, outreach per week, CTA, first-contact date, and private system holding identities.

## 4. Accounts, cost, and client topology - A3 / A5 / T8 / T11

### Brain and Granola ownership

**Recommendation:** client-owned Granola access and client-scoped Anthropic API key; client pays vendor usage; no founder CLI login or personal key after onboarding. Store secrets using the strongest macOS-local mechanism supported by the eventual runtime, never in git. Confirm vendor terms before committing the binding.

**Founder answer needed:** client-owned versus ECHO-owned accounts, who pays each vendor, spending ceiling/alert owner, permitted custody mechanism, and whether a shared-workspace interim is allowed for client one.

### Customer-two topology

**Recommendation:** defer multi-client/cross-instance topology to the second signed client. Owner: strategist. Trigger: second signed client or a first-client requirement for multiple isolated installations, whichever occurs first.

**Founder answer needed:** accept this deferral, or specify a first-client multi-user/multi-instance requirement.

### Embeddings

**Recommendation:** exclude embeddings from the first client wedge. The first wedge is deliberately retrieval-less; embeddings add privacy, cost, and migration surface without a current requirement. Owner: strategist. Trigger to reconsider: a measured cold-db/brief-quality failure that cannot be solved from meeting content alone.

**Founder answer needed:** accept exclusion/trigger or require embeddings now with rationale.

### Granola quota/plan

**Recommendation:** block client enablement, not the product-boundary build, until the client's actual plan/quota and payer are measured. No historical backfill on first install.

**Founder answer needed:** payer and who will obtain the plan/quota evidence from the client.

## 5. Client/legal/operations - C1-C3 / X2-X5

Use `2026-07-11-phase2-lab-access-discovery-checklist.md`; do not invent client answers.

### Entity and agreement

**Options:** contract through the existing legal entity, form/use another entity before payment, or defer signature until professional advice is obtained.

**Recommendation:** obtain appropriate legal/accounting advice and use a short written initial-client agreement covering payment/paid conversion, data custody, consent responsibility, support, deletion/offboarding, and liability boundaries. This packet is not legal advice.

**Founder answer needed:** contracting entity/owner, external adviser if needed, agreement owner, and deadline.

### Consent, IRB, offboarding, and incident ownership

**Recommendation:** no real client transcript processing until the lab names the governing policy/IRB path and confirms participant notice/consent responsibility. Client owns authorization; ECHO records the approval reference. Name deletion/offboarding and incident owners before installation.

**Founder answer needed:** lab counterpart for policy approval, ECHO incident owner, deletion/offboarding owner, and accepted notification window.

### Founder-unavailable operation

**Recommendation:** require a second operator/client operator to follow credential inventory, restart, pause/notify, and rollback instructions before CLIENT LIVE. Defer full support rotation until a second paid client.

**Founder answer needed:** second operator role and the founder-unavailable support window.

### Confirm interaction for client one

**Options:** always-on responder service, explicit MCP confirm path, or a bounded manual/batch approval gesture before delivery.

**Recommendation:** bounded manual/batch approval for client one, owned by the client operator, until real use proves an always-on confirm service is worth productizing. The runtime must still fail closed and never deliver an unapproved brief.

**Founder answer needed:** interaction choice and client-one owner/workaround.

## 6. Technical boundary and recovery - V1 / T1 / T2 / T5 / T7 / T9 / T10

These are strategist recommendations that need founder ratification because they shape the first client contract.

### V1 first-run semantics

**Recommendation:** seven-day initial lookback aligned with the existing intake window, newest meeting first, and no automatic older backfill. Historical processing requires an explicit operator command after first-run health is green.

### T1 source allowlist

**Recommendation:** allow only meeting input/config, signal extraction, API-key brain, human approval, brief generation/delivery, local state, and health. Exclude Machine capture, MCP retrieval, Fleet/review orchestration, Slack/Linear legacy surfaces, autonomous action, and unrelated daemon workers.

### T2 sidecars

**Recommendation:** every mutable database/checkpoint/manifest/health/draft/log is installation-local. Only an explicit encrypted backup bundle is transferable, with credentials excluded and restore version recorded.

### T5 remote writes

**Recommendation:** exclude general remote writes. Permit only the allowlisted brief-delivery adapter after the human gate, with idempotency, visible failure, and no silent retry storm.

### T7 identity

**Recommendation:** one client installation is one identity domain for release one. Defer cross-instance row identity to a second installation or restore/migration evidence requiring reconciliation. Owner: strategist; trigger: second client installation or first cross-instance restore.

### T9 backup

**Recommendation:** encrypted client-local backup of database and required nonsecret state before every upgrade/migration; retention and location agreed with client; restore drill required before client enablement.

### T10 migration/rollback

**Recommendation:** stop product service, verify backup, migrate a copy, run health/brief smoke, atomically cut over, retain previous qualified artifact/state until acceptance, and restore both code and state on rollback. No in-place irreversible migration without a tested reverse path or explicit accepted risk.

**Founder answer needed for this group:** accept all recommendations, or list exceptions by row ID with the replacement decision.

## 7. Empirical approvals

Rubrics: `2026-07-11-phase2-empirical-rubrics.md`.

**Approvals required separately:**

- A2 cold-db test using one permitted founder meeting in isolated scratch state.
- V2 no-auth Contract A test using scratch `HOME` only, without changing real vendor authentication.
- Current-contract clean-Mac rehearsal after the demo window.
- G3 freeze execution after the demo decision.

For each, the founder must approve the data/environment/operator. Approval to run a probe is not acceptance of its result.

## Session close

At the end of the founder session, every answer is written into a dated decision artifact or converted into `deferred-with-owner-and-trigger`. Templates are then updated, the canonical register is reconciled, and a different binding performs the mechanical completeness check. Only after that check does the founder consider a separate SHA-bound G2 halt-lift.
