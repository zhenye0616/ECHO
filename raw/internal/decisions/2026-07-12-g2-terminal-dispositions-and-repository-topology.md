# G2 terminal dispositions and repository topology

**Date:** 2026-07-12 PDT
**Founder instruction:** `APPROVE TERMINAL PACK`
**Decision input SHA:** `938b4905c78d0d9be3d97e331a69816ff2045023`
**Status:** landed at main SHA `4cc700001ac07b66fdf0700643b29cdde8b83fb7`; independently verified; separate SHA-bound lift signed in `2026-07-12-clarity-halt-lift.md` and effective when that record lands
**Product maturity:** DEV; unchanged

> **Terminology supersession (2026-08-02):** Read this record's `FOUNDER LIVE` / `founder-live` stage references as `INTERNAL LIVE` / `internal-live` under `2026-07-11-team-product-graduation-pipeline.md`. The criteria are unchanged except that the lane runs on a team-controlled internal Mac; founder release authority is unchanged.

## Decision boundary

The founder approved the complete terminal package prepared from the Phase 2 decision packet and the subsequent repository-topology refinement. This decision places all 25 previously pending G2 rows into allowed terminal states without reopening product demand.

This record is **not** the `clarity-halt-lift`. It does not authorize product specs, product code, repository extraction, FOUNDER LIVE, QUALIFIED, CLIENT LIVE, or a push to `main`. The completed register must first land at an exact `main` SHA, a different binding must mechanically verify it there, and the founder must then sign a separate halt-lift naming that SHA.

## Resolved rows

| Row | Approved decision |
|---|---|
| V1 | Initial processing uses a seven-day lookback, newest meeting first, with no automatic historical backfill. Older history requires an explicit operator command after first-run health is green. |
| B6 | The operational floor is assisted install, one useful brief from a real meeting, a second real meeting on a different day, healthy restart, and one observed recovery or rollback rehearsal. A named client operator and support owner must operate without founder credentials or runtime. A failed delivery pauses or rolls back the installation; it does not reopen demand. |
| T1 | Release-one product scope is the meeting-to-brief wedge only: meeting input/configuration, signal extraction, client-scoped API-key brain, human approval, brief generation/delivery, and client-local state, health, install, upgrade, and rollback. Machine capture beyond the minimal owned wedge input, MCP retrieval, Fleet/review orchestration, legacy Slack/Linear surfaces except an explicitly selected human-gate or delivery slice, autonomous action, and unrelated daemon workers are excluded. |
| T2 | Every mutable database, checkpoint, manifest, health record, draft, and log is installation-local. Only an explicit encrypted backup is transferable; credentials are excluded and the restore version is recorded. |
| T5 | General remote writes are excluded. The only permitted remote write is an allowlisted brief-delivery adapter after human approval; it must be idempotent, expose failure, and prevent silent retry storms. |
| T8 | Embeddings are excluded from release one. Owner: strategist. Reconsider only after measured cold-state or brief-quality failure that cannot be solved from meeting content. |
| T9 | Before upgrade or migration, create an encrypted client-local backup of the database and required nonsecret state. Agree retention and location with the client, and complete a restore drill before client enablement. |
| T10 | Stop the service, verify backup, migrate a copy, run health and brief smoke checks, atomically cut over, and retain the previous qualified artifact and state until acceptance. Rollback restores code and state. No irreversible in-place migration is allowed without a tested reverse path or an explicit accepted risk. |
| X5 | Client one uses bounded manual or batch approval owned by the client operator. The runtime fails closed and never delivers an unapproved brief. |

## Deferred rows

Every deferral below has an owner and an objective trigger. A trigger reopens only that decision or evidence task; it does not reopen product demand.

| Row | Owner | Trigger and locked direction |
|---|---|---|
| V2 | QA operator | When a product-only API-key brain candidate exists, run the missing, expired, and rate-limited authentication test before FOUNDER LIVE. |
| A2 | QA operator + independent grader | When a product-only candidate and an approved founder meeting are available, run the cold-state test before FOUNDER LIVE. |
| A3 | Founder | Before client enablement or credential handoff, decide the client account, payer, terms, spend controls, and custody. Direction is client-owned Granola, a client-scoped API key, client-paid usage, and no founder CLI credential. |
| A5 | Strategist | Reopen at the second signed client or when client one requires multiple isolated installations, whichever occurs first. |
| B1 | Founder + lab counterpart | When the lab confirms access-discovery and first-meeting windows, set the rollout calendar from evidence gates and external dependencies. |
| B5 | Founder | Before the first commercial offer, set exact price, payment route, buyer, and customer-visible offer name. Direction is a paid design-partner engagement; `echo-brain` is the repository and working product name. |
| T7 | Strategist | Reopen at the second client installation or the first cross-instance restore, whichever occurs first. |
| T11 | Founder + client counterpart | Before client enablement, measure the actual Granola plan, quota, and payer. Historical backfill remains excluded. |
| C1 | Founder + lab counterpart | Before processing a real client transcript, confirm workspace, transcript, and admin settings. |
| C2 | Founder + lab counterpart | Before processing a real client transcript, obtain a language/length sample or record accepted bounds. |
| C3 | Founder + lab counterpart | Before processing a real client transcript, confirm the internal/external meeting mix and its intake consequence. |
| C4 | Founder | Before first commercial outreach or offer, set buyer, sanitized target count, weekly cadence, call to action, first-contact date, and the private identity system. Paid design-partner direction is locked. |
| X1 | Founder | Decide before the 2026-07-18 freeze. If no choice is recorded by the freeze, default to `DEFER` and make no YC/demo change. If submitting, the prior recommendation is meeting-to-brief only and cutting old scene 1. |
| X2 | Founder | Before accepting payment or signing the first client, decide entity, agreement, adviser, owner, and deadline. |
| X3 | Founder + lab counterpart | Before client transcript processing or installation, decide policy/IRB/consent, incident ownership, deletion/offboarding ownership, and notification responsibility. |
| X4 | Founder | Before CLIENT LIVE, a second operator or client operator proves credential inventory, restart, pause/notify, and rollback. A full support rotation remains deferred until the second paid client. |

## Repository topology

The target starts as two private organization repositories with separate ownership boundaries:

1. `echo-brain` is the commercial, client-local meeting-to-brief product. Its name does not authorize adjacent product scope. It owns only the T1 allowlist, its product tests, its installation and qualification evidence, and copied minimal shared code with recorded provenance and no synchronization obligation.
2. `echo-dev-platform` is how the founder and AI agents work across projects. The current Project_echo repository remains the migration source and is later transferred or renamed to `echo-dev-platform` with full history retained. It is not archived.

The context layer and orchestration harness/skills remain separate packages inside `echo-dev-platform` initially. They split into repositories only after they have independent consumers, release cadences, and versioned contracts. Each repository owns its own backlog, task-state, and review state. The harness may operate externally on `echo-brain`; `echo-brain` must have no runtime or build dependency on `echo-dev-platform`.

The organization GitHub Project is a read-only portfolio view. Repository folder queues remain canonical.

## Extraction and cutover

Extraction happens after an in-place product-only composition boundary and isolated FOUNDER LIVE proof, and before qualification. The new `echo-brain` repository becomes authoritative only when a native clone reproduces the same build, run, tests, artifact identity, and local-state behavior. At that point product paths in the old repository freeze and receive no further feature work.

Keep `/Users/zhenye/Desktop/Project_echo` stable during cutover. A local directory rename is allowed later only after absolute-path assumptions have been removed and a path-migration test passes.

Both target repositories remain private. Transfer or visibility changes are blocked if the organization plan cannot preserve the required security controls and CI. Provenance points to the applicable current or post-rewrite SHA.

The prior history decision remains `DEFER`: founder-owned, triggered by the first G4 exclusive maintenance window after holdout-131 evidence and branch/worktree closure, or an external report of the flagged content. This package does not reopen or execute that rewrite.

## Register result

After reconciliation, the canonical register contains 27 rows: 11 `resolved`, 16 `deferred-with-owner-and-trigger`, zero `accepted-risk`, and zero `pending`. P1 and A6 retain their existing resolved evidence. The 25 dispositions above cite this record.

Independent mechanical review completed at the exact landed SHA with verdict `G2_MECHANICALLY_READY`. The founder then signed the separate SHA-bound `2026-07-12-clarity-halt-lift.md`. G2 remains operationally open only until that record lands on `main` without changing the approved base.
