# WS3 pre-lift ranked acceptance outlines

**Date:** 2026-07-11 · **Author:** WS3 strategist support · **Status:** pre-lift disposition draft (not specs)

> **Outline boundary (WS3, clarity-sprint-plan.md).** *A pre-lift acceptance outline may contain only the required outcome, evidence, unresolved decision, owner, dependencies, and queue rank. It must not contain files-to-modify, implementation design, acceptance criteria, test contracts, task-state pointers, or any backlog artifact. Those belong to post-G2 spec review.*

**Conversion rule.** These are pre-lift dispositions, not `backlog/proposed/` specs. No outline below becomes a spec until the founder commits the `clarity-halt-lift` decision naming an approved main SHA (G2). Conversion authorizes structure, not content: every converted spec then flows through the normal cross-tool review queue like any other item, with its own Out-of-Scope section and fresh references written at spec time. The graduation foundation (rank 1) is the first post-G2 proposal by construction — the product boundary, `tests/product/`, runtime configuration, and build-once evidence records must exist before any individual capability can graduate through them.

The ranking reflects a single ordering principle: the foundation that all later product work must land inside comes first; then the traps that make a *fresh-machine first run* fail outright; then the traps that force a client onto founder identity; then latency, deployment, and honesty-of-failure hardening; then the discrete quality bundle. Each rank's one-line rationale is restated in the summary table at the end.

---

## Rank 1 — Graduation foundation (product boundary, runtime isolation, `tests/product/`, build-once matrix record)

- **Required outcome.** A Team-product composition root and import fence exist as a distinct boundary from the ECHO lab, such that the client runtime boots only meeting input, extraction/API-key brain, human gate, brief generation/delivery, local state, and health — and cannot install, boot, or enable Machine/Fleet surfaces. Product-only hermetic tests live in their own home. A single build-once versioned artifact flows through a product-only qualification record that binds source SHA, version, and artifact SHA-256. This is the ground every later capability graduates through; without it, ranks 2–8 have no product boundary to land inside and would re-entangle with the lab.
- **Evidence required.** The product composition root boots the wedge set and nothing else; absence of required config fails closed rather than silently degrading. The product test suite runs with no network, live credentials, founder database, or wall-clock dependence. One byte-identical artifact is produced once, its SHA-256 recorded, and the qualification record distinguishes machine-executable cells, independent-review cells, and founder-authority cells per the graduation pipeline. Every "never not-applicable" matrix cell (source boundary, product tests, product-only boot, runtime isolation, wedge behavior, auth/failure honesty, one target platform, clean install, fresh+populated state, packaging closure, security/data, operations, provenance/authority, distribution) has a defined green condition.
- **Unresolved decision(s).** Product source allowlist — source-by-source inclusion (register T1). Sidecar classification — instance-local vs transferable state (T2). Runtime/composition configuration must be introduced as an explicit new lane and must NOT overload the retired `dogfood | customer` profile meaning (graduation pipeline invariant 3). Whether the first artifact's upgrade-from-previous cell is the one permitted not-applicable result for release #1.
- **Owner.** Strategist (boundary + tests + build-once flow); QA operator (qualification matrix cells); founder + independent reviewer (evidence records, release authority).
- **Dependencies.** G2 lift (this is the first post-G2 proposal). References the four-stage contract and release qualification matrix in `2026-07-11-team-product-graduation-pipeline.md`. Must precede conversion of ranks 2–8, each of which graduates one capability *through* this foundation. WS7 hard boundary applies: no `src/product/` creation or `src/` moves occur pre-lift.
- **Queue rank.** 1 — the enabling foundation; all other product specs graduate through it, so it converts first.

---

## Rank 2 — Signals first-run cutoff + newest-first ordering

- **Required outcome.** A fresh install against a populated Granola workspace does not brain-extract the entire history, and the meeting that just ended is not last in line behind years of backlog. First run is bounded by a cutoff, and extraction order serves the newest meeting first so a same-day install can produce a brief for that afternoon's meeting within a usable window. This is the top unmitigated fresh-machine trap: today the signals path has no first-run cutoff and sorts oldest-first, which is the demo-killing and first-client-killing shape.
- **Evidence required.** On a scratch `ECHO_HOME` against a populated workspace, first-run extraction volume is bounded (not one brain call per historical note) and the newest note reaches a brief ahead of old backlog, verified against the cold-db extraction rubric before any customer-facing run. Cost/quota blast radius on install day is bounded rather than hours-and-real-dollars serialized at ~1 note/min.
- **Unresolved decision(s).** The cutoff semantics — lookback window length, and whether it aligns with the item-128 intake 7-day lookback or diverges (register V1, still open). Interaction with the existing poison-pill/3-strike behavior on first run.
- **Owner.** Strategist (V1 semantics + queue rank); QA operator (cold-db grading of the first-run behavior).
- **Dependencies.** Rank 1 foundation (graduates into the product boundary). Register V1 closure. Pairs with the cold-db extraction gate (register A2) as its verification harness. Trap-map §7 identifies this as must-fix-before-any-fresh-machine-run.
- **Queue rank.** 2 — top unmitigated trap; a fresh install starves the newest meeting, which breaks both the demo and the first client's very first run.

---

## Rank 3 — ANTHROPIC_API_KEY product brain binding

- **Required outcome.** The client runtime performs meeting extraction using a client-scoped API key path, with no dependency on the founder's machine, personal CLI login (`codex login` / Claude Code auth), or live database. Client machines must not need founder CLI auth; this binding is what removes the single largest client-onboarding blocker (vendor login is explicitly not self-healable) and is required for the "No founder identity in CLIENT LIVE" separation invariant.
- **Evidence required.** A real meeting extracts end-to-end with only a client-scoped API key configured and no CLI binary authenticated. Expired, missing, and rate-limited credentials fail loud, bounded, and recoverable rather than hanging an unattended subprocess. Auth-and-failure-honesty matrix cell is green for the meeting extraction path (currently "missing for the meeting extraction path").
- **Unresolved decision(s).** Brain economics, terms, and key custody (register A3, open) — who pays for vendor usage, plaintext vs keychain custody, and the n=2 Granola/brain account topology (advisor's own key vs shared-workspace-only). Whether the initial engagement requires this before first client meeting or tolerates a documented interim.
- **Owner.** Founder + strategist (A3 economics/custody/terms + topology); QA operator (auth-expiry probe, register V2).
- **Dependencies.** Rank 1 foundation. Register A3 closure and the V2 unattended-auth-expiry probe. The intake-agent already demonstrates the direct Claude Agent SDK pattern but is not yet wired to Granola extraction (per WS5 target contract note) — that is prior art, not a shipped path.
- **Queue rank.** 3 — client machines must not require founder CLI auth; this is the gating separation invariant for any off-founder-machine run, just behind the fresh-run cutoff.

---

## Rank 4 — `echoctl brief --wait` + target-miss diagnostics

- **Required outcome.** Running `echoctl brief` at meeting end, before Granola has published, polls until the fresh note is visible + ingested + extraction complete and then emits the brief, failing loud on a bounded timeout. When it cannot produce a brief, the diagnostics name the likely cause and the fix, not just the miss — specifically the Granola private-My-Notes cause (move the note to a team-space folder the key can see; visible within ~60s), the didn't-record possibility, and the extraction-not-complete case (wait ~1–2 min and rerun). This directly serves the founder's calendar-less ad-hoc-Zoom workflow, where the manual move-to-folder step is permanent and the miss recurs.
- **Evidence required.** A brief requested immediately at meeting end succeeds after bounded polling rather than returning empty during the ~15-min worst-case latency floor. Each hard-fail path emits actionable copy naming the likely fix. Behavior stays within the existing AC1 target contract (error-copy and a wait loop, no new architecture).
- **Unresolved decision(s).** Timeout bound and poll cadence. Whether `--wait` and the diagnostics ship as one spec or two (both are named 131 follow-ons; the stress-test follow-ups prescribe `--wait`, and 131 Out-of-Scope bullet 1 already reserves it).
- **Owner.** Strategist (scope + rank); founder (workflow shape confirmation, since this encodes his no-calendar-event habit).
- **Dependencies.** Rank 1 foundation. Consumes AC1's target contract from item 131. Pairs with the manual move-to-team-folder step being order-insensitive. Trap-map §8 latency and §10 concierge-knowledge inventory.
- **Queue rank.** 4 — turns the ~15-min latency floor and the permanent private-notes miss from silent failures into a bounded, self-explaining wait; high leverage but sits behind the run-at-all traps.

---

## Rank 5 — Product daemon launchd unit + versioned-package deploy story

- **Required outcome.** The client machine runs the wedge from a versioned product package under its own launchd unit — distinct `ECHO_HOME`, database, port, launchd label, logs, and credentials — installed with no repo checkout and never rebuilt from source on the client box. The endpoint is the client's Mac, superseding the retired founder-box delivery target. Upgrade and rollback to the previous qualified artifact preserve client-local state and restore health.
- **Evidence required.** The exact qualified artifact installs on a clean/target-like Mac, initializes client runtime, exercises the real launchd lifecycle, reports healthy, and survives restart; a scripted install + upgrade + rollback runs on a non-founder machine exercising the trap map. The plist-wipe-on-reinstall trap and the bootout+bootstrap (not `kickstart -k`) env-reload rule are handled or documented. Clean-install, upgrade/rollback, and distribution matrix cells are green (today's "private beta" is a normal prerelease in a public repo — that gap is closed).
- **Unresolved decision(s).** Version/CHANGELOG fix — bump past the `0.1.0-beta.1` semver inversion and backfill a customer-facing entry, or explicit deferral. Distribution channel: authenticated client channel, artifact retention/access, checksum verification, and revocation/replacement procedure. Migration order on a populated db (register T10) and backup rule (T9).
- **Owner.** QA operator + repo maintainer (deploy rehearsal, launchd lifecycle); founder (distribution channel, version policy, release authorization).
- **Dependencies.** Rank 1 foundation (build-once artifact + packaging closure). The deploy rehearsal is the WS6 non-founder-machine run and the WS5 current-vs-target contract separation. Register T9/T10 closure. Must not present the target product-daemon contract as installable today.
- **Queue rank.** 5 — the client-machine endpoint and its upgrade/rollback story; depends on the foundation's build-once artifact, so it converts after the capabilities that fill that artifact.

---

## Rank 6 — Fail-loud config health surfaced in doctor/heartbeat

- **Required outcome.** Silent-absence traps become visible. A missing/invalid `GRANOLA_API_KEY` (which today silently disables the poller while only the CLI complains), an env-config parse error that permanently disables the worker with no retry, and fail-soft/swallowed heartbeat writes on a sick filesystem are surfaced through doctor and heartbeat as loud, actionable health states rather than quiet no-ops. On a client box, a typo'd env var is currently worse than an absent binary; this makes both legible.
- **Evidence required.** Doctor/health covers every wedge stage; the three silent-failure classes (key absent, env parse-disable, heartbeat write failure) each produce an observable degraded/disabled signal with a named cause. Operations matrix cell moves from "partial local observability" toward green, with a written support owner and recovery steps.
- **Unresolved decision(s).** Whether an observed-disabled worker downgrades doctor's overall rollup (124 follow-up founder policy call — currently soft by design). Whether corrupt-but-JSON-valid heartbeats (finite-time parse failure) should read as stale rather than observed-and-never-stale (124 hardening follow-up). Active alerting/support path (register-level Operations, still open).
- **Owner.** Strategist (scope + the rollup-downgrade policy call framing); founder (the soft-rollup policy decision); QA operator (health-surface verification).
- **Dependencies.** Rank 1 foundation. Trap-map §2 (secrets/config absence behavior) and §3 (fail-soft heartbeats). Folds the 124 merge follow-ups (heartbeat parse hardening, rollup-downgrade policy).
- **Queue rank.** 6 — makes the silent traps loud so a client box's misconfiguration is diagnosable; important honesty work, but it hardens rather than enables the first run.

---

## Rank 7 — Calendar-trigger guard inventory

- **Required outcome.** A written inventory of every place the wedge assumes or would depend on calendar-event triggering, and an explicit guard/decision for each, so the founder's calendar-less ad-hoc-Zoom reality (advisor meetings are joined ad hoc, no calendar event) does not silently break trigger paths, and a client with a different meeting-scheduling habit is not assumed into a calendar model. The calendar route stays optional; `--wait`-at-meeting-end (rank 4) is the primary path.
- **Evidence required.** Each trigger/freshness/settle assumption is enumerated with its behavior when no calendar event exists; guards are named where a missing event would otherwise starve or misfire the loop. Consistency with the machine-clock/timezone freshness findings (freshness/settle/high-water logic runs on the machine clock; briefs render in the rendering machine's timezone).
- **Unresolved decision(s).** Whether calendar triggering is in scope for the first client at all, or deferred entirely behind `--wait`. Timezone/locale handling for multi-TZ clients (trap-map §11 flags this as a real design gap, not a config nit) — in-scope-now vs deferred-with-trigger.
- **Owner.** Strategist (inventory + rank); founder (calendar-in-scope decision, multi-TZ posture).
- **Dependencies.** Rank 1 foundation. Complements rank 4 (`--wait` is the calendar-less mitigation). Trap-map §8 (no webhooks, poll-only latency) and §11 (timing/cadence, timezone).
- **Queue rank.** 7 — a scoping/inventory disposition that prevents a hidden calendar assumption from surfacing late; lower urgency because `--wait` already covers the founder's live path.

---

## Rank 8 — 130-hardening bundle

- **Required outcome.** The discrete 130-merge residuals are closed as one bundle: an opt-in env gate for the decision-changeset producer (item-109 off-by-default pattern) before meeting→card goes live; confirm-after-edit so an edited changeset is repostable/confirmable via UI (today edited changesets are unconfirmable); a founder call on client-intake vs decision-batch classifier semantics at producer go-live; store-path parity so bridge and responder changeset-draft-store defaults do not diverge under `ECHO_HOME` override; and stale-run signal filtering (the item-130 bridge reads signals through current-run filtering — 131 RC3 residual). The leaked fixture ChangesetDraft in the production draft store is purged and the offending test that wrote without a temp-dir override is fixed.
- **Evidence required.** The producer stays off until its env gate is set; an accepted edit yields a confirmable fresh-revision card; bridge and responder resolve the same draft-store path under an `ECHO_HOME` override; the bridge extracts only current-run signals; the production draft store contains no fixture pollution and the offending test no longer writes through the production path.
- **Unresolved decision(s).** Classifier semantics at producer go-live — route by content class; whether to add few-shot decision_type examples to correct the executable-when-uncertain flattening (all 6 Legal lines classified `executable`). Whether cross-checkpoint fingerprint-skip parity (131 RC4 residual) rides in this bundle or is its own low-priority item.
- **Owner.** Strategist (bundle composition + the classifier-semantics founder call framing); founder (classifier semantics decision); builder/QA (fixture purge + test fix verification).
- **Dependencies.** Rank 1 foundation. Sources: the 128/129/130/131 merge follow-ups in `_followups.md` (post-07-07 section) and the trap-map §10 concierge inventory. The fixture-purge + offending-test-fix is also tracked in WS3's prod-draft-store cleanup line; pre-lift it is recorded and ranked, and becomes a proposed item only after G2.
- **Queue rank.** 8 — a grab-bag of real but individually-small residuals; correct to batch and land last so it does not displace the enabling and first-run work.

---

## Summary ranking

| Rank | Outline | One-line rationale |
|---|---|---|
| 1 | Graduation foundation | Enabling foundation; every other product spec graduates through the boundary/tests/build-once record, so it converts first (first post-G2 proposal). |
| 2 | Signals first-run cutoff + newest-first ordering | Top unmitigated trap; a fresh install starves the newest meeting and breaks both the demo and the first client's first run. |
| 3 | ANTHROPIC_API_KEY product brain binding | Client machines must not need founder CLI auth; the gating separation invariant for any off-founder-machine run. |
| 4 | `echoctl brief --wait` + target-miss diagnostics | Turns the ~15-min latency floor and the permanent private-notes miss into a bounded, self-explaining wait. |
| 5 | Product daemon launchd unit + versioned-package deploy | The client-machine endpoint and upgrade/rollback story; needs the foundation's build-once artifact first. |
| 6 | Fail-loud config health in doctor/heartbeat | Makes silent config traps diagnosable on a client box; hardens rather than enables the first run. |
| 7 | Calendar-trigger guard inventory | Scoping disposition preventing a hidden calendar assumption from surfacing late; `--wait` already covers the founder's live path. |
| 8 | 130-hardening bundle | Real but individually-small residuals; correct to batch and land last so it doesn't displace enabling work. |

*All eight remain dispositions until G2. `backlog/proposed/` stays empty unless the founder-signed halt-lift has landed; converted specs still flow through normal cross-tool review.*
