# Full project map — known knowns / known unknowns / unknown knowns / unknown unknowns

**Date:** 2026-07-10 (evening, post-halt) · **Updated:** 2026-07-11 · **Author:** strategist (Claude Code) at founder request · **Survey baseline:** `5bfb407b` · **Current overlay:** founder commercial-focus + graduation-pipeline decisions

> **Terminology supersession (2026-08-02):** Read this record's `FOUNDER LIVE` / `founder-live` stage references as `INTERNAL LIVE` / `internal-live` under `2026-07-11-team-product-graduation-pipeline.md`. The criteria are unchanged except that the lane runs on a team-controlled internal Mac; founder release authority is unchanged.

**Provenance.** Built by a 15-agent workflow: 8 read-only domain surveys (strategy archive, backlog state, code reality, validation evidence, client readiness, repo hygiene, docs-vs-code drift, public-repo exposure; 227 raw items), 4 per-quadrant consolidators, then two adversarial critics (a completeness critic and an evidence auditor that sampled 12 high-stakes citations, verifying 9 exactly) plus a sprint planner. The critics' corrections are applied in this text — most importantly, the map is rebased onto commit `0ab0af05` (specs 132/133 withdrawn, clarity halt declared), which landed while the surveys ran. Companion docs: `2026-07-10-project-echo-orientation-and-closure.md` (read first), `2026-07-11-team-product-graduation-pipeline.md`, and `2026-07-10-clarity-sprint-plan.md`.

**How to read.** KK = evidence-backed facts, including both merged reality and ratified-but-unbuilt decisions. KU = tracked open questions, ordered roughly by when they bite. UK = things the project acts on that are written nowhere, or that written docs contradict — the cheapest clarity wins. UU = blind-spot *classes*, each paired with the cheapest detection instrument that converts it into a KU. These quadrants are epistemic lenses, not maturity states. Product maturity uses only `DEV -> FOUNDER LIVE -> QUALIFIED -> CLIENT LIVE`; repo/package state, concierge mode, lifecycle, and `E0-E4` evidence remain separate attributes. This register is the evidence deliverable named by the Part-4 halt; dev resumes only after a separate founder halt-lift decision at a named SHA.

**Evidence boundary.** Repository paths, code lines, commits, and committed journal entries are independently recoverable. Citations labeled `memory` or `MEMORY` refer to Claude-private/founder memory that is not tracked in this repo; treat those as founder testimony (`E1`), not a self-contained evidence chain, until a committed source replaces them. Absence greps and “verified this run” claims are snapshots at the baseline SHA, not durable proofs.

**Founder correction (2026-07-11).** `2026-07-11-commercial-focus-team-product-carve.md` locks the Team decision product as ECHO's only current commercial bet and meeting-to-brief as its first saleable wedge. `2026-07-11-team-product-graduation-pipeline.md` locks the maturity path as DEV -> FOUNDER LIVE -> QUALIFIED -> CLIENT LIVE. Pain and demand are considered proven; Machine context and Fleet orchestration remain internal assets. Read older demand-screen language as pricing/sales refinement and older lab/box/package claims through the four-stage pipeline.

## Historical domain survey snapshots — not current instructions

*These snapshots predate both `0ab0af05` and the 2026-07-11 commercial-focus decision. They are preserved as source evidence, not as the current project view. Use the founder correction above and the corrected quadrant entries below for current direction.*

- **strategy & decision archive** — The raw/internal/decisions July chain is dense, current, and internally coherent: org-alignment reframe → canonical five-stage decision loop → lab-pilot switch → client scope pin (meeting→brief) → tarball deploy → trap map. Risk-tracking is unusually good (unknowns register, trap map, stress test). The gaps are propagation and documentation: wiki/product + project CLAUDE.md still encode the April indie-AI-builders V1 as "source of truth"; the entire client-facing loop (Granola poller, intake, decision store, responder, brief) has zero wiki presence; the YC demo plan and Slack enablement plan were never revisited after the 07-09 customer switch; and the Zoom/Mattermost adapters, unattended-box operations, pricing-for-academia, and threat/data-handling zones have no written thinking at all.
- **backlog & work-in-flight** — Pipeline is fully drained: proposed/ready/claimed/pending_review AND inbox/ are all empty at HEAD (132/133 withdrawn at `0ab0af05`; the 081 zombie deleted at `b6fc242a`). The live risk surface is the followup queue: ~20 undispositioned post-Jul-7 bullets, several of which gate the client loop directly (130 producer go-live opt-in, prod draft-store fixture pollution, RC3 current-run filtering residual, brief target-miss diagnostics, a test that decays vacuous ~Jul 30). Doc drift: wiki promotions for 124-131 (including the two client-facing surfaces, brief + changeset compiler) never happened. The two backlog-tooling gaps this map opened are fixed on maint/clarity-phase1: docs/BACKLOG.md is regenerated and no longer inbox-blind (`401ccc38`), and the inbox convention is documented in backlog/README.md (`d7298a40`).
- **code reality** — Code is a single intertwined src tree: the client meeting->brief loop (granola-poller, granola-signals, post-meeting-brief, echoctl brief) exists with real tests, but it rides the full lab daemon — code-tool extractors start unconditionally, the brain layer shells out to local codex/claude CLIs, founder paths are hardcoded defaults, and the npm tarball ships orchestration assets and the Slack responder. Daemon lifecycle is launchd-only; non-macOS install/start are silent no-ops while CI's Windows gate only covers packaged selftest. ~50 ECHO_* env vars exist, several undocumented. Biggest blind-spot classes: non-macOS daemon runtime, real Granola API contract, brain subprocess failure paths, and unbounded append-only db growth on a long-lived client box.
- **validation evidence — proven-live vs merely-built** — The meeting->card leg is genuinely proven live (2 meetings 07-08, full 5-stage advisor cycle 07-09, founder 5/5 extraction verdict), but every cycle was founder-operated with stages 2/3/5 concierge and brief delivery hand-pasted. The shipped 131 brief command was hardened via a 30-finding stress test + blind holdout gate, yet the client's two owed adapters (Mattermost/Zoom) have zero code, no non-founder human has ever received/graded output, the prod-box deploy path decided today has never been exercised, and cold-db extraction quality is untested. Confirm leg works only while a hand-run responder is up; drift sweep never ran on real decisions. journal-cat, the canonical validation-read tool, was broken for July at the 2026-07-10 baseline (Codex shard missing its marker) and now passes (`0122fa41`).
- **client-facing readiness** — Client readiness is documented richly but specced nowhere: the trap map (12 classes), unknowns register (A1-A7/B1-B6, part-2/3 addenda), and stress test enumerate every install/first-run/steady-state trap, yet backlog proposed/ready/claimed/pending_review are all EMPTY — every must-fix (signals first-run cutoff, API-key brain, --wait, item 134 deploy spec, onboarding doc) exists only as prose. Verified in code: no first-run cutoff + oldest-first starvation; --force shipped, --wait not; zero Zoom/Mattermost code. 131 landed owner rendering + sanitization + freshness guard. Docs contradict the scope pin: the only install docs and the "customer" profile describe the retired dev-context-layer product. UU zones: consent/IRB, offboarding/deletion, support/SLA, upgrade rehearsal, API cost.
- **repo hygiene & reorg readiness** — Tracked inventory: backlog 1820 files (1617 = reviews/, 6.9M, still churning), tests 227, raw 214, src 153, tools 112 (2.4G on disk — echo-overlay Tauri app), wiki 84, docs 71, eval 37 (dormant since 05-31), scripts 3. Git hygiene is fundamentally sound: no dist/tgz/db tracked, secrets ignored and never committed, skills sync passes, pipeline dirs empty as documented. Main reorg blockers: review-round archive discipline missing, complete/-archive lagging (5/132), a 2.2G overlay build tree under tools/, duplicate runbook (root vs docs, diverged), stale root operating docs (AGENTS.md gate, CLAUDE.md V1 scope) contradicting the meeting-brief client pin, version/CHANGELOG mismatch (0.1.0-beta.1 semver-precedes 0.1.0), and pitch drafts retained in public git history.
- **docs-vs-code drift (unknown-knowns hunter)** — Verified 19 load-bearing claims. The coordination protocol docs are tight (skills sync clean, claim mechanics match, review-queue tooling all present) and the newest wiki pages (signal-formation, storage append-only) match code. The drift is concentrated exactly on the client product path: local-daemon, capture-allowlist, capture-gate, system-architecture, and v1-spec wiki pages all predate the Granola/enrich era and misdescribe what boots, what is allowlisted, what bypasses the gate, and who the customer is. The client deliverable core (post-meeting brief, changeset compiler) has zero wiki coverage. CLAUDE.md's own V1-scope block declares the current product ("meeting transcripts, Zoom") cut from V1. Blind spots: per-app field contracts, stale-shipped product pages, packaged tarball off-founder-machine.
- **public-repo exposure & privacy/secrets risk** — No live credential values are in the tracked tree (token greps clean; env files gitignored and never committed; test tokens are fakes). The real exposure is content, not keys: the public repo carries the employer/pilot company's name in 22 files including employment-transition/IP-negotiation status, verbatim Slack thread quotes from the employer workspace, real third-party first names from live meeting captures (including in a committed test fixture), an advisor's real meeting title + note ID, and 142 files of founder absolute paths. Git history still contains a third-party lead list, coworker notes, and a 560K raw capture dump — the filter-repo rewrite promised in the removal commit was never tracked or run. Secret-history scan owed since 2026-06-06 remains unrun; no CI secret scanning; no committed-content privacy policy exists.

## 1. Known knowns — the asset inventory

*The KK quadrant is strong: the founder has locked the Team decision product as the commercial focus, meeting→brief as its first wedge, and client-machine operation after assisted onboarding as the endpoint. The meeting→brief path exists in code with real tests and has run live on founder meetings with a 5/5 extraction verdict. This proves enough to productize and sell, not that delivery is finished: all five stages, non-founder operation, Zoom/Mattermost adapters, and the client install remain incomplete. Machine context and Fleet orchestration are real internal assets, not validated parallel products.*

### FULL HALT ON DEV declared (2026-07-10 evening) — the governing frame of this map
*strategy · client-relevance high*

Register Part 4 + commit 0ab0af05: no new build specs or carve until the founder judges the unknowns map complete — this document is that map. Standing decisions that survive the 132/133 withdrawal: the product name and lab/product boundary concept; shared single-schema db with source-filtered instances; retrieval-less product brain mode (A1); founder accounts in client workspaces during onboarding (B3, custody still open); macOS-only phase 1 (B4); versioned-package deploys with no repo checkout (T4); org repo reserved for a later clean split; client scope = meeting→brief first; promote-to-product graduation mechanism retained. The 2026-07-11 commercial-focus decision supersedes B2's founder-controlled box as the delivery endpoint: the onboarded client's machine is the client loop-of-record; founder boxes are demo/staging only.

Evidence: raw/internal/decisions/2026-07-10-product-carve-unknowns-register.md Part 4 · commits 0ab0af05, 18a0f643

**Action:** Every action in this map is analysis / decision / documentation / cleanup. Build-shaped fixes are named and queued but not specced until the halt lifts.

### Commercial portfolio locked: Team product only; meeting→brief is the saleable wedge
*strategy · client-relevance high*

The founder is going all in on ECHO's third body of work: the Team decision loop, now the sole commercial product. The working meeting-to-brief experiment is its first saleable wedge, and its pain and demand are considered proven. The job is no longer to choose among ECHO's Machine, Fleet, and Team systems; it is to carve the Team product from the lab, support assisted onboarding, install it on the client's machine, remove founder-machine dependencies, and sell it aggressively. Machine context and Fleet orchestration remain internal technical assets, not parallel commercial roadmaps.

Evidence: raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md · founder instruction 2026-07-11

**Action:** Every new productization priority must directly serve the Team-product carve, client onboarding/install/operation, or its sales and support boundary. Do not spend the window searching for standalone customer problems for Machine or Fleet features.

### Product maturity pipeline locked: DEV -> FOUNDER LIVE -> QUALIFIED -> CLIENT LIVE
*deploy · client-relevance high*

The founder requires a clean graduation path between development, live testing on the founder's Mac, automated release qualification, and client acceptance. The current meeting→brief candidate is formally **DEV**, with useful `E3` founder-regime evidence from a predecessor workflow. It reaches FOUNDER LIVE only after a versioned candidate package built from a pinned SHA completes an isolated run. Qualification is a mandatory non-weighted matrix over product boundary, behavior, runtime isolation, auth, macOS/Node affinity, clean install, cold/populated state, upgrade/rollback, packaging/dependencies, security/data, operations, provenance, and distribution. CLIENT LIVE uses the exact build-once QUALIFIED artifact and checksum on the client machine and requires useful repeat use.

Current automation is reusable but insufficient: `test:product` means the broad non-orchestration suite, `customer` filters install assets rather than runtime workers, the generic tarball contains lab/Fleet code, release tags do not bind founder-live evidence or reviewed-main ancestry, and neither `src/product/` nor `tests/product/` exists.

Evidence: `2026-07-11-team-product-graduation-pipeline.md` · `skills/promote-to-product.md` · `vitest.product.config.ts` · `.github/workflows/ci.yml` · `.github/workflows/release.yml` · package.json files manifest

**Action:** Pre-G2, preserve the predecessor evidence and write the isolated candidate-package live-test plan. Post-G2, the graduation foundation is the first productization proposal; individual capabilities cannot enter client acceptance before it exists and their QUALIFIED release record is green.

### Client scope pinned to meeting→brief; behavior is config-selected but runtime is not isolated
*strategy · client-relevance high*

Client-facing scope was pinned 2026-07-10 to the meeting→brief loop only. The visible behavior is selected by configuration rather than a product carve: the item-109 intake bridge is off-by-default and fails closed, and the Slack responder is credential-gated, so a Granola-only profile exposes poller→signals→brief. The current daemon still boots the full lab worker set, including dev extractors; this is a scope decision, not an isolated client runtime.

Evidence: raw/internal/decisions/2026-07-10-product-carve-unknowns-register.md Part 2 addenda · src/daemon/index.ts:72-98 (bridge default-off among boot workers)

**Action:** This is the sprint's anchor: all cleanup/client-prep work can assume one product path and treat everything else as lab.

### Deploy direction updated: versioned package → client machine; 132/133 withdrawn
*deploy · client-relevance high*

Deploy = versioned package to the onboarded client's Mac, with no repo checkout and no dependency on the founder's machine or personal CLI session. The client's machine is that client's loop-of-record; a founder-controlled box may remain demo/staging. Specs 132/133 reached r3 proceed/proceed with zero findings, then were withdrawn and deleted at 0ab0af05. Their carve concept survives, but B2's endpoint changed on 2026-07-11; successor specs must be re-cut against the client-machine goal. Historical text and reviews remain at 95a6b581 / 18f72f89 / 71647084. src/product/ does not exist.

Evidence: raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md (client-machine endpoint) · 2026-07-10-product-carve-unknowns-register.md Part 2/4 (T4 and historical B2) · commit 0ab0af05 · absence of src/product and 132/133 files

**Action:** Reorganize toward the carve *concept*, not the withdrawn spec: the spec must be re-cut post-halt, and the A7 staleness re-verify discipline transfers to the re-spec. Minimize churn in the files the old inventory enumerated so the recoverable text stays useful.

### A1/B3/B4 remain; B2 endpoint superseded; API-key brain direction remains
*strategy · client-relevance high*

Founder resolved A1 = retrieval-less product mode, B3 = founder-assisted access into client workspaces during onboarding, and B4 = macOS-only phase 1. The API-key brain direction remains: the delivered product must not require the founder's personal CLI session. Historical B2 chose a dedicated founder-controlled box; the 2026-07-11 commercial decision supersedes that as the endpoint in favor of installation and use on the client's machine.

Evidence: 2026-07-10-product-carve-unknowns-register.md lines 46-49 + Part 2 line 55-57 · 2026-07-11-commercial-focus-team-product-carve.md

**Action:** Client-prep docs must state two contracts: current full-daemon + authenticated CLI, and target API-key product brain. The latter is decided but unbuilt; do not describe it as today's install path.

### First commercial target = university lab; Justinian void; zero adapter code exists
*strategy · client-relevance high*

The active commercial target switched 2026-07-09 to a university lab (Zoom + self-hosted Mattermost); the Justinian pilot is cancelled and its target human declared VOID. Two adapters are owed, and grep confirms zero Zoom or Mattermost code anywhere in src/ or tests/. The withdrawn ports spec (ex-133) built only ports and explicitly excluded both adapters — that exclusion is now a historical fact recoverable at 95a6b581 / 71647084. Demand is no longer the open question; onboarding, commercial terms, adapters, and a client-machine install remain unproven delivery work.

Evidence: 2026-07-07-office-hours-org-recap-pilot.md Addendum 5 · grep -riE 'zoom|mattermost' src/ tests/ = empty (verified) · git history: 95a6b581 (spec), 71647084 (convergence)

**Action:** Known gap, not a surprise: the client's actual tools are 100% unbuilt — client-facing prep must not imply otherwise.

### Five-stage decision-loop model is canonical; its proof conditions need qualification
*strategy · client-relevance high*

The 2026-07-09 model pins the five contracts: S1 Extract shipped (Granola only); S2 Triage MISSING (concierge); S3 Validate built and proven only while the hand-run responder is available; S4 Dispatch plumbing exists but its live proof belongs to the cancelled Justinian regime; S5 Backflow partial (capture built, composition concierge; 131 brief v0 complete 07-10). ECHO owns stages 2/3/5; the decision ledger never lives in rented SaaS. The source model still needs these proof qualifiers written into it.

Evidence: raw/internal/decisions/2026-07-09-decision-loop-canonical-model.md · backlog/complete/2026-07-10-131-post-meeting-brief-generator-v0.md

**Action:** Use this as the skeleton for all client-facing docs — it is the only current, honest product description in the repo.

### YC demo sprint governs until 2026-07-24 (freeze 07-18)
*strategy · client-relevance high*

The demo sprint plan is the governing schedule: freeze Jul 18, demo Jul 24, hard cut list, and the rule 'real captured data with zero hand-staging'. Note two erosions: the plan predates the 07-09 customer switch (scenes 2-3 stand on the cancelled workspace — see UK), and whether the schedule survives the 07-10 clarity halt is now an open founder call (see KU: YC application vs halt).

Evidence: raw/internal/decisions/2026-07-03-yc-demo-sprint-plan.md

**Action:** Cleanup sprint sequencing respects the freeze until the founder says otherwise; the demo-plan amendment (scenes 2-3) must land before Jul 18.

### Station 2 locked as infrastructure with ratified expansion invariants
*strategy · client-relevance high*

Signal formation is locked (D1–D7 no-widening rule), and growth is governed by two ratified invariants: additive-only (new source = allowlist entry + template instantiation, never pattern modification) and backward-compatible schema (frozen signal core + per-source provenance keys).

Evidence: 2026-07-04-station-2-signal-formation-lock-in.md · 2026-07-04-expansion-invariants-additive-backcompat.md

**Action:** The owed Zoom adapter has a pre-agreed shape: allowlist entry + template, no chassis edits — cite this in the adapter spec.

### NORTH_STAR now names three systems and one commercial focus
*strategy · client-relevance medium*

docs/NORTH_STAR.md was rewritten 2026-07-11: Machine context and Fleet coordination are internal assets; the Team decision product is the company bet; meeting→brief is the first wedge; the endpoint is install/use/repeat on the client's machine after assisted onboarding.

Evidence: docs/NORTH_STAR.md · 2026-07-11-commercial-focus-team-product-carve.md

**Action:** Keep every first-read document synchronized to this hierarchy.

### Meeting→brief loop exists end-to-end in code, hardened via blind holdout gate
*product-loop · client-relevance high*

echoctl brief composes pollGranolaOnce + startGranolaSignalWorker + compilePostMeetingBrief with dedicated tests, landed as item 131 (b58f558e, 2026-07-10) through the first blind red-first holdout gate (20 builder-blind tests written pre-build, 19/20 green-equivalent; 2117/2117 tests pass). Shipped guards: --force poison-pill clear, --freshness-minutes, per-action owner rendering with 'unassigned' fallback, markdown sanitization. The brief-now prototype is preserved as a reference implementation at raw/internal/prototypes/brief-now-prototype.mjs (5282b841); no root-level script remains.

Evidence: src/cli/commands/brief.ts:24,135-137; src/enrich/post-meeting-brief.ts:182,256-258 · tests/cli/brief-command.test.ts, tests/enrich/post-meeting-brief.test.ts · backlog/complete/2026-07-10-131-...md review_notes HOLDOUT GATE block

**Action:** This is the client deliverable core — the strongest single asset; wiki coverage for it is owed but the code+tests are solid ground.

### Meeting→card→concierge-triage→brief path proven live; founder extraction verdict 5/5
*product-loop · client-relevance high*

The meeting→brief path ran live on a real advisor meeting 2026-07-09: capture → extraction (6 decisions/3 actions/6 rationales) → card → concierge triage/confirm → brief hand-pasted to Mattermost. Dispatch did not run in this lab cycle. Meeting-end→card was ~70 min, dominated by human gates (compute ~100s). Two prior meeting→card runs succeeded 07-08 (~20 min, Granola-latency-dominated), including fail-honest behavior on an empty-agenda meeting (one defensible card, no fabrication). Founder verdict: 5/5 useful, zero dismissals; binding constraint = confirm-gate friction, not extraction quality.

Evidence: raw/internal/decisions/2026-07-09-first-advisor-loop-cycle.md · mcp-interactions-journal-2026-07-claude.md entries 07-08 00:05, 13:38, 23:22 PDT · 2026-07-08-decision-confirm-friction.md

**Action:** Client-facing narrative can honestly claim 'proven on real meetings' — with the concierge caveat stated, since every cycle was founder-operated.

### Propose→confirm decision gate exercised live with real ratified atoms
*product-loop · client-relevance medium*

Stage-3/4 validate is proven end-to-end: 3 launch-day cards posted and human-confirmed into derived:team-decisions on 07-07, then 5 EchoBrain Legal cards on 07-08 (largest batch), with the harness permission classifier and the confirm gate stacking as two independent checkpoints.

Evidence: 2026-07-07-office-hours-org-recap-pilot.md Addendum 3 · journal entries 2026-07-07 11:05, 2026-07-08 23:01/23:22 PDT

**Action:** The confirm leg works — but only while a hand-run responder is up; treat responder ops as the fragile edge, not the gate logic.

### Brief fast path adversarially stress-tested: 30/30 findings, 12 classes, guards allocated
*product-loop · client-relevance high*

A 36-agent default-refute stress test confirmed 30/30 findings against code, consolidated to 12 failure classes (#1 argv-less brief silently briefs the PREVIOUS meeting; #4 owner mis-stamping verified in live founder-regime rows), with every guard explicitly allocated to item 131 (now complete), future calendar-trigger work, or the assisted-onboarding checklist.

Evidence: raw/internal/decisions/2026-07-10-brief-path-stress-test.md sections 1-3

**Action:** The failure surface of the client deliverable is enumerated and dispositioned — the onboarding checklist bucket is the part that still needs to be written as a client doc.

### Station 2 live in the daemon since 07-05 with 89+ real signals
*product-loop · client-relevance high*

Signal extraction has run live since 2026-07-05 after the probe-race fix (f19dc419), accumulating 89+ real signals (count cited in the 07-07 office-hours record); classifier decision_type spread was good on the research meeting (incl. a correct kill/negative) versus all-executable flattening on the legal note.

Evidence: 2026-07-07-office-hours-org-recap-pilot.md:75 ('89+ station-2 signals') · first-advisor-loop-cycle.md quality-signal section · memory project_yc_demo_sprint (f19dc419)

**Action:** Real founder-regime data exists for demo/staging and quality analysis; it is not evidence of client-machine production. The legal-note flattening is the known quality edge.

### Freshness bound is empirically known: Granola summarization + workspace visibility
*product-loop · client-relevance high*

Brief freshness is bounded by Granola's summarization latency plus the signed-in account/workspace: a just-ended meeting was API-invisible live (07-07 23:25), and the advisor note initially landed outside the EchoBrain workspace requiring an in-app move; 'open the note in-app' is the only known accelerator.

Evidence: journal 2026-07-07 23:25 PDT · first-advisor-loop-cycle.md friction #1-2

**Action:** Set client latency expectations from this bound (~20 min floor), not from compute time; bake the workspace check into onboarding.

### Granola key resolution is explicit and fail-disabled, not fail-crash
*product-loop · client-relevance high*

Key precedence is explicit option → GRANOLA_API_KEY env → local Granola app config file; a missing or invalid key disables the poller (returns a disabled handle) rather than erroring, and this behavior is documented in the architecture map.

Evidence: src/capture/surfaces/granola-poller.ts:314-339,995-1003 · docs/architecture-map/src-capture.md:375

**Action:** Good for daemon stability, bad for silent-broken installs — the doctor/heartbeat observability line is where this gets surfaced to a client.

### Daemon boots a fixed lab worker set with no per-worker enable flags
*product-loop · client-relevance high*

Daemon boot unconditionally starts fs-watcher, git-watcher, granola-poller, enrichment dispatch (granola-signals + drift-sweep), claude-code/codex/cursor extractors, and the MCP server, plus the off-by-default intake bridge — there are no per-worker enable flags, so the client 'profile' today is env-shaped absence, not a product mode.

Evidence: src/daemon/index.ts:72-98

**Action:** This is what the withdrawn 132 design intended to fix and what a post-halt successor carve must revisit; until then, client-prep docs must describe which workers no-op on a client box rather than claiming they do not run.

### Brain layer today = local CLI subprocess, codex default
*product-loop · client-relevance high*

The brain spawns local CLIs as subprocesses — `codex exec --sandbox read-only --json` or `claude --dangerously-skip-permissions -p` — with codex as default when ECHO_CEO_BRAIN/ECHO_GRANOLA_SIGNAL_BRAIN are unset. The API-key binding that removes this client-machine dependency is decided but unbuilt.

Evidence: src/brain/brain.ts:120-150 · src/enrich/granola-signals.ts:944

**Action:** Day-one killer #1 in the trap map; the decided ANTHROPIC_API_KEY item is the single highest-leverage unbuilt piece for the client box.

### Daemon lifecycle is macOS-launchd-only by verified code, consistent with B4
*deploy · client-relevance high*

On non-darwin platforms daemon install/start/stop/restart are silent no-ops (manualDaemonNoop) and status degrades to a bare port probe reporting installed:true unconditionally — matching the B4 macOS-only phase-1 decision, so the platform constraint is a chosen known, not an accident.

Evidence: src/cli/commands/daemon.ts:157-158,702,721-733,1120-1122 · unknowns-register B4 resolution

**Action:** Client prep can hard-state 'macOS required'; the silent-no-op behavior is a UX honesty gap to note, not a blocker.

### Client-loop egress and permissions profile is mapped at code-line level
*deploy · client-relevance high*

The client loop has exactly two external endpoints — https://public-api.granola.ai/v1 (overridable per options, no env var; 15s timeout; page_size hard-capped at 30 by the API, confirmed live; 1,000-page pagination cap) and the brain vendor (CLI today, API later) — nothing reads HTTPS_PROXY; and there is no TCC/Full-Disk-Access exposure because the meeting→brief path is 100% API-based (~/Library reads belong only to dev capture surfaces).

Evidence: 2026-07-10-client-machine-trap-map.md sections 5-6 (verified this run; cites granola-poller.ts:13,:17,:888,911-916)

**Action:** This is the security/consent one-pager for the lab, nearly pre-written: two endpoints, no OS-permission grabs, local append-only store.

### Prod-daemon launchd env landmines are validated operational fact
*deploy · client-relevance high*

launchd `kickstart -k` does NOT reload plist EnvironmentVariables (bootout+bootstrap required); PlistBuddy-added keys are wiped by daemon reinstall; and a confirm-target vs responder-allowlist channel-id mismatch bit once — all directly load-bearing for the planned com.echo.product.daemon unit on the client box.

Evidence: journal 2026-07-07 11:05 PDT note · memory reference_slack_decision_gate_setup

**Action:** These belong verbatim in the (unwritten) box runbook — they were learned the hard way once and will recur on every env change.

### npm tarball path inclusion is allowlist-controlled; raw/env files are excluded at the baseline
*deploy · client-relevance high*

package.json's explicit files manifest ships only dist JS/SQL, assets/echo-{skills,roles,workflows}, review-queue config JSONs/schemas, and a hand-whitelisted 13-file ceo-slack-responder dist subset. At `5bfb407b`, that prevents path-based inclusion of raw/, journals, and env files; echoctl-*.tgz and dist/ are gitignored. It does not prove compiled output contains no embedded paths or client-irrelevant code: the tarball deliberately ships lab orchestration assets, founder defaults, and the Slack responder.

Evidence: package.json:12-41 (files field) · .gitignore:43,53

**Action:** Treat raw/env path exclusion as the proven property; audit compiled defaults separately, and trim the orchestration/responder payload only in the post-halt carve.

### Storage is append-only in code and the retention property is proven live
*data · client-relevance high*

The sqlite backend contains only INSERT — zero UPDATE/DELETE/VACUUM/retention code — matching wiki/architecture/storage.md exactly; and the property was proven live when the derived layer preserved a note the upstream vendor deleted (not_Tdf8iOzdYgU550, Justinian export audit). V1 has no delete path and no growth bound.

Evidence: src/storage/sqlite.ts:79-85 + grep (0 UPDATE/DELETE hits) · wiki/architecture/storage.md 'The Contract' · journal 2026-07-07 23:05 PDT

**Action:** A genuine differentiator and a consent obligation: the client data-handling story must disclose no-deletion and unbounded growth explicitly.

### External Granola capture is gate-enforced; derived client atoms use writer-site guards
*data · client-relevance medium*

The Granola poller routes external input through processCandidate → gate() and rejects on gate failure. Derived signal/team-decision atoms bypass that gate and rely on allowlist checks at writer sites, a two-tier reality the older capture-gate docs do not state. wiki/architecture/signal-formation.md is accurate (settle default 600_000ms, signal_type ∈ {decision,rationale,action}, correct file paths); daemon lifecycle matches local-daemon.md's lifecycle section (PID lock first, mcp_port in started payload, reverse-order shutdown).

Evidence: src/capture/surfaces/granola-poller.ts:10,940 + src/capture/pipeline.ts:31 · src/enrich/granola-signals.ts:30,488-492,760 · src/daemon/index.ts:55-56,100-120

**Action:** The post-June wiki pages are trustworthy — the docs-drift cleanup only needs to target the pre-Granola-era pages, not everything.

### Coordination pipeline fully drained; claim/review checks pass; the flagged maintenance-check gaps are now closed
*coordination · client-relevance medium*

backlog/proposed, ready, claimed, pending_review, and inbox/ are all empty at HEAD, with 130 completed item specs plus one legacy `.review.md` sidecar in complete/. The 132/133 files and their reviews/ dirs were removed at the 0ab0af05 withdrawal, and the zombie duplicate of shipped item 081 — the last inbox file at the 2026-07-10 baseline — was deleted on maint/clarity-phase1 (`b6fc242a`); the inbox convention is now documented in backlog/README.md (`d7298a40`). Every live review round ended converged before withdrawal; claim mechanics match CLAUDE.md. The two self-maintenance gaps this survey flagged are now closed on the same branch: journal-cat 2026-07 exits 0 (`0122fa41`; it had been hard-failing on the Codex shard's missing '## Interactions' marker), and tools/sync-skills.sh --check is now bidirectional and flags orphan adapters (`10a3d95d`; it had checked only canonical→adapter drift).

Evidence: ls backlog/{proposed,ready,claimed,pending_review,inbox} at HEAD (all empty) · commit 0ab0af05 (132/133 withdrawn) · `b6fc242a` (081 zombie deleted) · `0122fa41` (journal-cat marker fix) · `10a3d95d` (sync-skills --check orphan detection)

**Action:** A drained pipeline is the ideal moment for repo reorg — nothing in flight can conflict. The 081 zombie deletion recommended here as a first trivial cleanup is done (`b6fc242a`).

### Test and CI structure is explicit: product/orchestration split, 3-OS packaged gate
*coordination · client-relevance high*

Two vitest configs split suites (test:product excludes only review-queue/backlog/task-state/skills orchestration suites; everything else counts as product); the CI quality gate (typecheck/lint/build/test:product) runs ubuntu+macos only with Windows intentionally excluded from unit tests (~120 dev-side failures per inline comment), while all 3 OSes ARE gated via packaged npm-pack install + `echoctl selftest --json`.

Evidence: vitest.product.config.ts + vitest.orchestration.config.ts; package.json:43-45 · .github/workflows/ci.yml quality/onboarding jobs + matrix comment

**Action:** The reorg's test-move work has a defined contract to preserve; the packaged selftest is the only cross-platform assurance and must survive any restructure.

### CLI and MCP surface inventory is exact
*hygiene · client-relevance medium*

echoctl registers exactly 9 commands (brief, init, doctor, daemon, orchestration, project, uninstall, run, selftest + global --json/--quiet/--no-color). The MCP server registers 12 unconditional tools, optionally `propose_decision`, and conditionally `coord_status` + `coord_invoke` when deadlines are enabled (15 maximum); the deprecated get_recent_work_context wrapper remains registered.

Evidence: src/cli/index.ts:22-45,123-198 · src/mcp/server.ts:271-313

**Action:** A ready-made checklist for the client-vs-lab surface split: decide per-command/per-tool which side of the post-halt successor carve it lands on.

### No tracked-HEAD token-pattern hits were found; nothing automated preserves that baseline
*exposure · client-relevance high*

Greps over tracked HEAD for common token patterns (xoxb-/xapp-/sk-ant-/ghp_/AKIA/private keys) returned only placeholders and test fakes; .env/.env.slack/.env.fly-secrets are gitignored, and no dist/tgz/db/node_modules are tracked at HEAD. This is a bounded pattern-scan result, not proof that all reachable history or semantic content is clean. Neither CI workflow has a secret-scanning job and no scanner config exists — only workflow discipline and gitignore stand between a future commit and the public tree.

Evidence: git grep token-pattern sweep (survey-run, clean) · git log --all --diff-filter=A on env patterns = only .env.example · .github/workflows/ci.yml + release.yml (build/test/pack only)

**Action:** The clean baseline makes adding a gitleaks/trufflehog CI job cheap now — do it during the cleanup sprint while the tree is known-clean.

### Public MIT repo carries enumerated content exposure in HEAD and history
*exposure · client-relevance high*

The repo is public (github.com/zhenye0616/ECHO) under MIT, world-readable including the full decision archive and journals. Verified exposure at HEAD: employer/cancelled-pilot company named in 22 files (incl. employment/IP-negotiation status and verbatim employer-workspace Slack quotes), real third-party first names in 10 files (incl. a committed test fixture and a quoted live-prod brief row), the lab advisor's real meeting title + Granola note ID, and founder absolute paths in 142 files. Git history additionally retains a third-party lead list, coworker notes (cat-file-confirmed at ab95c519), and a 560K raw capture dump (1ba3580a); the filter-repo rewrite promised in 0ee788a2 and the secret-history scan owed since 2026-06-06 were never run.

Evidence: LICENSE:1; git grep counts (22 employer files, 10 name files, 142 path files) · raw/internal/decisions/2026-07-09-first-advisor-loop-cycle.md:3 (title + note ID) · commit 0ee788a2 message + git cat-file at ab95c519; git show --stat 1ba3580a

**Action:** This is fully-mapped known debt, not an unknown: the cleanup sprint can execute redaction + filter-repo + fixture-anonymization from these exact file lists before any client sees the repo.

## 2. Known unknowns — the open-question register

*The KU register is unusually well-tracked — nearly every open question already lives in the unknowns register, trap map, brief-path stress test, or backlog/_followups.md — but almost none has an owning backlog item. The dominant cluster is client install/first-run correctness (signals cutoff, API-key brain, cold-db quality, silent-fail config, deploy story), followed by steady-state reliability, commercial mechanics (price/buyer/rollout), and successor-carve staleness. The 2026-07-11 decision closes pain/demand and product choice; those are no longer gates. During the halt, every remaining productization item needs a disposition, queue rank, owner, and closure condition. Specs begin only after founder halt lift.*

### Signals extraction has no first-run cutoff and starves the newest meeting
*product-loop · client-relevance high*

On a fresh client box the signals worker queries ALL raw Granola atoms (no since-bound) and extracts oldest-first at ~1 note/min, so the just-ended meeting waits hours behind the whole workspace history while burning real brain dollars; named a must-fix but exists in no backlog folder.

Evidence: src/enrich/granola-signals.ts:791 (all-atoms query) and :392 (ascending updated_at sort) — re-verified this run · raw/internal/decisions/2026-07-10-client-machine-trap-map.md section 7 must-fixes · raw/internal/decisions/2026-07-10-product-carve-unknowns-register.md Part 2 must-verifies · backlog/proposed|ready empty (verified)

**Action:** Bites install day/first run. Pre-lift: decide cutoff semantics and rank the outcome. Post-G2: propose the build work and verify the result in the product-only client-machine rehearsal.

### Brain binding is founder CLI auth; API-key product brain unspecced, headless auth-expiry behavior unknown
*deploy · client-relevance high*

Granola extraction shells out to the founder's personally-logged-in codex/claude CLIs (register A3); the Anthropic-API-key brain — the named resolution that makes the target client deploy = node + tarball + 2 keys + launchd — has no spec, and nobody knows whether an unattended box hangs or fails loud when CLI auth expires. A direct Claude Agent SDK + ANTHROPIC_API_KEY binding already ships for the intake agent, so the provider call pattern is reusable, but it is not wired to Granola extraction and does not make the target install contract current.

Evidence: raw/internal/decisions/2026-07-10-product-carve-unknowns-register.md A3 + Part 2 'new high-leverage item' + must-verify (2) · raw/internal/decisions/2026-07-10-client-machine-trap-map.md section 1 (src/brain/brain.ts:122-143) · src/surfaces/ceo-slack-responder/intake-agent.ts:65-150 (direct SDK reuse asset) · backlog pipeline dirs empty (verified)

**Action:** Bites install + steady-state on the unattended box. Per the halt (register Part 4), A3 is an ANALYSIS deliverable this sprint, not a build: Anthropic commercial-terms/ToS check for delivering API-keyed output to a third party, a per-meeting cost model from the two real meetings' token counts, and a decision on whose account/org holds the key. The spec/build lands post-halt. The box-day expired-auth probe (hang vs fail-loud) stays.

### A2: extraction quality on a cold db has never been tested (the retrieval-less price-check)
*product-loop · client-relevance high*

Every live extraction ran against the founder's warm, 89+-signal history-rich store; the client box starts cold, and the resolved A1 retrieval-less product-mode decision makes this the core quality question — what does running the client brain WITHOUT MCP retrieval cost brief/card quality?

Evidence: raw/internal/decisions/2026-07-10-product-carve-unknowns-register.md A2 + 'still open' line 50 · historical spec blob at `95a6b581:backlog/inbox/2026-07-10-132-product-module-carve-out.md` (owed empirical check)

**Action:** Bites before first client use. Run the named gate — scratch ECHO_HOME + fresh db on a real meeting, grade extraction vs the warm-db baseline — before the client-machine product run.

### echoctl brief --wait and target-miss diagnostics are specced but not built
*product-loop · client-relevance high*

No webhooks means ~15 min worst-case end-of-meeting latency before a brief is attemptable, and the founder's advisor meetings are calendar-less (ad-hoc Zoom) so the private-My-Notes target-miss will permanently recur; the chosen mitigations — retry-until-published --wait mode and error copy naming the My-Notes cause — exist only as followup bullets (BRIEF_HELP exposes only --note/--force/--freshness-minutes/--out-dir, verified).

Evidence: src/cli/commands/brief.ts:24 BRIEF_HELP (no --wait, verified this run) · backlog/_followups.md lines 517-518 (commit 8a653a0c) · raw/internal/decisions/2026-07-10-client-machine-trap-map.md section 8 · raw/internal/decisions/2026-07-09-first-advisor-loop-cycle.md friction 1

**Action:** Bites steady-state daily workflow (every meeting). Both stay prose until the halt lifts; this sprint's job is the written disposition (they are already the chosen mitigations) and queue position, not code.

### Granola account topology: grn_ key can never see private My Notes; whose account records at n=2 is unresolved
*product-loop · client-relevance high*

The vendor access model means the founder's API key structurally cannot see private 'My Notes' (no workaround) — the first advisor cycle already required hand-moving the note to the shared workspace — and the advisor-as-user's own meetings will live in THEIR Granola account, invisible to the founder's key; the client onboarding doc distilling the move-to-shared-space habit does not exist and no item owns the topology question.

Evidence: raw/external/precedents/granola-api-access-model.md:7,25 · raw/internal/decisions/2026-07-10-client-machine-trap-map.md section 8 · raw/internal/decisions/2026-07-09-first-advisor-loop-cycle.md friction 1 + parenthetical

**Action:** Bites first-run and hard-blocks n=2. Resolves: write the client onboarding doc (workflow habit) this sprint; founder decision on n=2 account topology (advisor's own key vs shared-workspace-only) before the advisor becomes a user.

### Calendar-trigger item — structural fix for wrong-meeting/invisible-note — has no spec
*product-loop · client-relevance high*

The stress test designates a calendar-trigger item as the only structural fix for the wrong-meeting/invisible-note class and the home for all auto-send prerequisites (recipient⊆attendees, note-identity ack, retry-until-published), and allocates it guards — but no spec exists anywhere in the backlog.

Evidence: raw/internal/decisions/2026-07-10-brief-path-stress-test.md section 3 'Calendar-trigger item' · backlog/proposed and ready empty; inbox empty at HEAD (the 081 zombie was deleted, `b6fc242a`)

**Action:** Bites steady-state (any auto-send ambition) and the moment briefs go to a non-founder recipient. During the halt, preserve the guard inventory as a ranked disposition and acceptance outline; convert it into a proposed spec only after halt lift. Note that the founder's calendar-less meetings partially defeat it (pairs with --wait).

### Silent-fail configuration classes: missing API key quietly disables poller; env typo permanently kills signals worker
*deploy · client-relevance high*

Absent/invalid GRANOLA_API_KEY silently disables the daemon poller (only the CLI throws loudly) so a misconfigured box does nothing forever, and an env parse error (bad ECHO_CEO_BRAIN, non-absolute repo path) permanently disables the signals worker with no retry — a typo is worse than a missing binary, which merely degrades-and-retries.

Evidence: raw/internal/decisions/2026-07-10-client-machine-trap-map.md sections 1 [NEW] + 2 · src/enrich/granola-signals.ts:944-951,1143-1161 per trap map · granola-poller.ts:996-1003 vs brief.ts:94-98 per trap map

**Action:** Bites install and every upgrade/config edit on the client machine. Pre-lift: decide the fail-loud/health outcome and rank it. Post-G2: create the proposed surfaced-health item, then verify the built behavior in the product-package rehearsal.

### Item 134 (product daemon launchd unit + deploy story) exists only as an After-Completion note; deploy path never exercised
*deploy · client-relevance high*

The product needs a client-machine daemon/install story, and the versioned-package path has never been run outside the founder regime — no current product-only spec, no client doc, no rehearsal; daemon lifecycle is launchd-only with silent no-ops elsewhere. Historical B2 framed this as a founder-controlled box, but the commercial endpoint is now the onboarded client's Mac.

Evidence: raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md · historical B2/spec blob at `95a6b581:backlog/inbox/2026-07-10-132-product-module-carve-out.md` · code-reality survey: launchd-only lifecycle, package ships lab assets

**Action:** Bites install day, hard. During the halt, write the deploy contract, bounded outline, and current-vs-target install docs; convert the outline into a proposed deploy item only after G2. A current full-lab rehearsal is diagnostic; G5 qualifies the product-only artifact on target-like clean Macs, then G6 installs the same checksum on the actual client machine.

### 130 meeting→card go-live gates: opt-in env, confirm-after-edit, classifier semantics, store-path parity, prod fixture pollution, RC3 residual
*product-loop · client-relevance high*

Producer go-live is gated on four written followups (ECHO_DECISION_CHANGESET_* opt-in REQUIRED, confirm-after-edit repost, founder call on client-intake vs decision-batch classifier semantics, bridge/responder store-path parity under ECHO_HOME override); additionally a test-fixture ChangesetDraft leaked into the PRODUCTION draft store (~/.echo/state/decision-changeset-drafts.json) and the 130 bridge still reads signals without filterToCurrentSignalRuns (stale-run signals can feed intake cards).

Evidence: backlog/_followups.md lines 505-512 · memory project_130_live_test_advisor_meeting

**Action:** Bites first-run of the card leg and pollutes founder-regime state today. Pre-lift: purge the fixture record, disposition all six bullets, and rank the offending-test/hardening work. Post-G2: create reviewed proposed items; do not use the advisor date to bypass the halt.

### Confirm leg: no MCP path, hand-run responder, confirm-after-edit gap, shape still an open design question
*product-loop · client-relevance medium*

Confirmation dies whenever the manually-started local Socket Mode responder is down (a founder-authorized confirm had no sanctioned execution path — journaled red); card 8f40ef6c and 5 EchoBrain Legal drafts remain pending; the founder wants confirmation 'natural, not a chore' (ride the meeting wrap-up, one batch gesture). Tier-2/3 of the 130 live test and the operational pre-meeting checks (responder up, credentials, triage stamps) are deferred to the advisor meeting; the confirm-after-edit code fix remains post-G2 work.

Evidence: raw/internal/decisions/2026-07-08-decision-confirm-friction.md · raw/internal/decisions/2026-07-09-first-advisor-loop-cycle.md Open section · journal 2026-07-08 23:22 PDT (verdict wrong)

**Action:** Pre-lift: make the confirm-leg shape decision and execute only the operational checks. Post-G2: propose confirm-after-edit and any responder-as-service/MCP implementation through review.

### 109 external-attendee intake gate is wrong for the decision-loop content class
*product-loop · client-relevance high*

The gate skipped the solo-attendee advisor note live (notes_seen 0) and internal-only lab meetings will hit the same wall; the bypass (internalDomains=[]) is folklore-turned-documented but not defaulted or surfaced in any client-visible config; content-class routing is the stated successor and is unbuilt.

Evidence: raw/internal/decisions/2026-07-09-first-advisor-loop-cycle.md friction 3 (line 11) · raw/internal/decisions/2026-07-10-client-machine-trap-map.md section 8

**Action:** Bites first-run for the lab (their meetings are mostly internal). Pre-lift: document the explicit bypass and decide the desired content-class behavior. Post-G2: propose any default or routing code change through review.

### Content freezes at first ingest: no re-fetch of edited notes, supersede-chain decision owed
*data · client-relevance high*

The poller permanently skips ingested note ids and the extraction fingerprint hashes frozen inputs, so post-meeting corrections and late decisions can never enter ECHO; the written workaround is 'ingest only after Granola finishes processing', and the 104 dedupe_key supersede-chain re-capture decision is explicitly owed before relying on re-extraction.

Evidence: backlog/_followups.md line 450 (station-2 lock-in codex review) · raw/internal/decisions/2026-07-10-brief-path-stress-test.md section 3 · memory project_append_only_ingest_no_inplace_modify

**Action:** Bites steady-state (any edited note, which Granola users do constantly). Resolves: founder design decision on supersede-chain re-capture; until then the timing workaround goes in the onboarding doc.

### Silent-drop class: notes need BOTH summary and transcript atoms or they vanish with only a warning
*product-loop · client-relevance high*

A note missing either atom is dropped-with-warning and never extracted; a transcript-disabled Granola config produces structural silence — the loop appears healthy while seeing nothing.

Evidence: raw/internal/decisions/2026-07-10-client-machine-trap-map.md section 8 · src/enrich/granola-signals.ts:364-380 + post-meeting-brief.ts:125 per trap map

**Action:** Pre-lift: put the transcript-setting check in onboarding and define the required warning. Post-G2: propose the brief target-miss diagnostic change through review.

### Trap-map classes with NO planned mitigation: proxy/TLS, English-only, uncapped transcripts, fail-soft heartbeat, hardcoded founder path
*deploy · client-relevance high*

Five trap classes fall outside the trap map's own 'what this map demands' list: corp proxy/TLS interception (nothing reads HTTPS_PROXY; both egress endpoints affected), English-only extraction prompt with no language detection, uncapped transcript embedding (3-hour meetings untested), heartbeat writes that fail soft (observability itself degrades silently), and the hardcoded founder desktop path shipped as a tarball default (capture/sources.ts:7).

Evidence: raw/internal/decisions/2026-07-10-client-machine-trap-map.md sections 2,3,5,9 vs its 'What this map demands' list (covers only 1,7,8,10,11)

**Action:** Pre-lift: triage each into post-G2 build / onboarding caveat / accepted risk with owner and trigger. Do not let a `fix-now` label bypass G2.

### Box environment constraints: TZ/clock-skew rendering, WAL-over-NFS, cross-process checkpoint races
*deploy · client-relevance medium*

Brief headers render in the box's TZ with machine-clock freshness windows (evening meetings drift a day; skew causes false freshness rejections — multi-TZ clients unsolved); WAL-mode SQLite is unsafe on network filesystems with only a checklist line and no runtime guard; poller/signals checkpoints have cross-process read-modify-write races (daemon poll vs manual brief run) with no lockfile — double-ingest, high-water-mark regression, mutual clobber.

Evidence: raw/internal/decisions/2026-07-10-client-machine-trap-map.md sections 3, 11 · raw/internal/decisions/2026-07-10-brief-path-stress-test.md Concurrency section · post-meeting-brief.ts:122-142,226-233; sqlite.ts:68-71 per trap map

**Action:** Pre-lift: require client-machine timezone/local-disk checks and decide the concurrency contract. Post-G2: propose any checkpoint lockfile or runtime guard before the product-only package runs daemon and manual brief invocations concurrently.

### A6: no written data-handling/retention story; secret-history-scan owed since 2026-06-06; pitch drafts in public history
*exposure · client-relevance high*

B3's resolution (founder's accounts inside lab workspaces) makes custody murkier — customer meeting atoms live on founder hardware with nothing written covering it, flagged 'urgent-adjacent'; the secret-history scan owed since the repo went public has never run (no gitleaks/trufflehog config, no scan commit), and pitch drafts removed from HEAD in 9d90d931 remain in public history (7bc368b5), alongside a never-run filter-repo promise.

Evidence: raw/internal/decisions/2026-07-10-product-carve-unknowns-register.md A6 + B3 + line 50 · git log for raw/internal/pitch/* (9d90d931 'history retains 7bc368b5') · memory project_echo_repo_public · raw/internal/decisions/2026-07-07-slack-enablement-two-stage-plan.md (sensitivity lesson applies)

**Action:** Bites client contracting (lab/IRB will ask) and compounds with every client-adjacent commit. Write the one-page data-handling/retention story; run the history scan and decide on filter-repo before sharing repo or live-data material.

### Demand gate retired; pricing and buyer mechanics still need evidence
*strategy · client-relevance high*

The 07-07 recap-pilot decision required burned-buyer and WTP screens before Zoom/Mattermost work. The 2026-07-11 founder decision supersedes those as a go/no-go gate: the Team-product pain and demand are considered proven, the product choice is closed, and the company will sell it aggressively. The exact buyer, payment instrument, price, and sales process still need evidence.

Evidence: raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md · superseded gate in 2026-07-07-office-hours-org-recap-pilot.md Addendum 5

**Action:** Do not block the carve or adapters on another demand screen. Use sales conversations to determine pricing, buyer/payment mechanics, onboarding friction, and offer language; change the product direction only through an explicit founder reversal.

### B1/B5/B6: rollout calendar, pricing + rename, and phase-1 definition of done are all undecided
*strategy · client-relevance high*

No rollout calendar exists against lab semester/grant deadlines (B1); $25/mo per-seat was priced for a different persona and the ECHO rename deadline now covers a customer-visible module name (B5); phase 1 lacks a delivery definition of done (B6). These are execution gaps inside a chosen product, not uncertainty about whether to pursue it.

Evidence: raw/internal/decisions/2026-07-10-product-carve-unknowns-register.md B1/B5/B6 + 'still open' line 50

**Action:** Bites execution now. Define B6 around an onboarded client installing and repeatedly running the product on their machine without the founder's machine; decide B1/B5 as rollout and sales mechanics in parallel.

### Zoom/Mattermost adapters have zero code and 133's ports are provisional-by-design (A4 donor bias)
*product-loop · client-relevance high*

The two adapters owed to the commercial target have no code anywhere in src/ (grep-verified); the withdrawn 133 design's MeetingSource inherits Granola pull-polling assumptions and ChatChannel inherits Slack Socket Mode, so the first real adapter item is EXPECTED to force a port-shape revision — plus filterToCurrentSignalRuns fails OPEN for non-Granola signal sources, a landmine timed exactly for signal source #2.

Evidence: grep -il zoom|mattermost src = 0 files · historical spec blob at `95a6b581:backlog/inbox/2026-07-10-133-product-ports-extraction.md` 'Known limitation — donor bias' · backlog/_followups.md line 453 + raw/internal/decisions/2026-07-04-expansion-invariants-additive-backcompat.md

**Action:** Bites first-client delivery. During the halt, record the port-shape risk and extractor-#2 preconditions in the closure register; create a proposed spec only after G2 and vendor-access discovery.

### Stage-2 triage (the moat stage) runs concierge; automation deferred until 2-3 advisor meetings stabilize the pattern
*product-loop · client-relevance high*

Checking candidates against the ledger + execution state is the named missing stage and the uniquely-ECHO claim; the intake classifier currently proposes with zero retrievals, triage was strategist-concierge in the one live cycle (n=1), and spec-writing is deliberately gated on both 2-3 more meetings and G2.

Evidence: raw/internal/decisions/2026-07-09-decision-loop-canonical-model.md stage 2 + 'Immediate application'

**Action:** Bites steady-state/scale (concierge doesn't scale past the founder). Run the next 2-3 advisor meetings and log triage patterns pre-lift; a spec requires both that evidence and a signed G2.

### ~20 undispositioned followup bullets plus a time-fused test that goes vacuous ~Jul 30
*coordination · client-relevance high*

All post-2026-07-07 followups (127-131 merges + 07-10 entries) await the contracted strategist disposition sweep (spec / fold / drop each); buried among them is a calendar bomb — candidates.test.ts:234 (internal-only attendee filter) passes VACUOUSLY after ~2026-07-30 as its fixture ages out of the 30d wall-clock window, silent coverage loss landing at the start of the client sprint.

Evidence: backlog/_followups.md lines 473-518 (post-sweep-header accumulation) · backlog/_followups.md lines 494-495 (128 injectable-clock audit owes the fix)

**Action:** Run the disposition sweep now. Record and rank the fixture-clock repair pre-lift; implement it only under an explicit non-product maintenance allowance or after G2.

### Windows chain half-open: ~120 unit-test portability failures, node22 EBUSY, one CI-only failure blocking all-green
*hygiene · client-relevance medium*

127's fix went green on onboarding·windows-latest node24 but unmasked a node22 EBUSY unlink-of-open-db bug in selftest cleanup; the ~120-failure portability epic (path separators, CRLF, tmp paths) is tracked in _followups; list-task-states-batching.test.ts:57 fails CI-only on every OS/node combo while passing locally — and the first beta tester is on Windows.

Evidence: backlog/_followups.md lines 489-490 · .github/workflows/ci.yml matrix comment · memory project_first_beta_tester_windows

**Action:** Bites future install, not macOS phase 1. Pre-lift: preserve the CI-only reproduction and explicit deferral trigger. Any Windows-chain build item waits for G2 and a founder decision to reactivate Windows scope.

### PARTIAL 2026-07-11 — Inbox convention gaps: 081 deleted, convention documented, index fixed; dispatch fix still owed
*coordination · client-relevance medium*

tools/review-queue/dispatch-next-round.py's find_artifact scans only kanban stages, so the historical 132 r1→r2 tick required manual reproduction and any future parked inbox spec would hit the same gap — this dispatch-tooling fix (thread artifact_path to request.py) is the honestly-remaining item: written but unfiled, ranked pre-lift and proposed only after G2. The other two gaps this entry opened are closed: backlog/README.md now documents the inbox convention (`d7298a40`), and the stale duplicate of shipped item 081 that had sat in inbox/ was deleted (`b6fc242a`), leaving inbox/ empty at HEAD.

Evidence: backlog/_followups.md lines 516 and 243 (dispatch gap still open) · ls backlog/inbox/ empty at HEAD (was the 081 zombie, deleted `b6fc242a`) · backlog/README.md inbox section (`d7298a40`) · memory project_parked_specs_inbox_convention

**Action:** PARTIAL close (maint/clarity-phase1): 081 zombie deleted (`b6fc242a`), inbox/reviews/task-state/archive documented in backlog/README.md (`d7298a40`), docs/BACKLOG.md indexes inbox via the generator (`401ccc38`). Remaining: the dispatch-next-round artifact_path fix stays ranked pre-lift, proposed only after G2.

### Leaked selftest daemons drive load to ~100 and flake the gates; teardown fix owed
*hygiene · client-relevance medium*

~7 long-running leaked com.echo.selftest.* daemons escalated from cosmetic to prioritized after directly causing gate flakes at system load ~100; the one-shot launchctl bootout + structural teardown fix is a written followup with no item.

Evidence: backlog/_followups.md line 503 (126 fixup, escalating the 106-era line 417) · memory reference_echo_daemon_topology

**Action:** Bites every test run this sprint. The one-shot bootout is halt-compatible operating cleanup; record and rank the structural teardown fix pre-lift, then create a proposed item only after G2.

### Low-priority open defects/gates parked without owners (grab-bag)
*hygiene · client-relevance low*

Tracked but low-urgency: wait_for_new_turns unusable from real clients (60s hold exceeds MCP transport budget; blind to in-flight turns); get_atoms silently budget-drops atoms and echo_resolve_mru self-references the calling session (both journaled partial, no items); get_recent_work_context removal ~8 weeks overdue pending founder consent receipt; 129's deadline_missed atom never verified firing live across restarts; [118] week-1 near-miss collection now due and [122] dashboard-v2 parked on founder usage.

Evidence: journal 2026-07-07 23:25, 2026-07-10 11:22 + 15:37 PDT entries · src/mcp/server.ts:274-276 + wiki/surfaces/mcp-server.md · backlog/_followups.md lines 467, 501

**Action:** Bites steady-state ergonomics only, not the client loop. Resolves: batch-disposition in the followup sweep; none should individually consume sprint time.

### A5: repeatable client-local topology undefined before customer #2
*strategy · client-relevance low*

The commercial direction is one client-local installation, not shared founder hosting. What remains undecided is whether a client machine supports one workspace or multiple users/workspaces, how instance identity and support work, and how onboarding repeats for customer #2 without any shared founder database.

Evidence: raw/internal/decisions/2026-07-10-product-carve-unknowns-register.md A5

**Action:** Bites at customer #2, not the first client. Resolve with a client-local tenancy/support decision or an explicit single-workspace deferral with an owner and trigger.

### Carve re-spec owed post-halt; A7 staleness protocol transfers to the successor
*coordination · client-relevance high*

With 132/133 withdrawn and their numbers freed, the carve exists only as standing decisions (register Part 4). When the halt lifts, the successor spec must be re-cut against then-current main under the A7 discipline: re-check the move inventory and files_to_modify, re-pin SHAs, sweep _followups.md for stale paths. Every reorg commit before then can rot the recoverable inventory at 95a6b581.

Evidence: register Part 4 · commit 0ab0af05 · git history 95a6b581 / 18f72f89 / 71647084

**Action:** Bites at halt lift. Pin the successor proposal to current main and freeze/defer conflicting moves; general reorganization never blocks the carve.

### T-series residue: eight tracked unknowns with no owner (T1, T2, T5, T7–T11)
*deploy · client-relevance high*

Product source allowlist (T1), sidecar classification (T2), remote-write path (T5), cross-instance row identity (T7), embeddings on the client machine (T8), backup rule (T9), migration ordering against a populated db (T10), Granola quota check (T11) — all named in register Part 4's agenda, none owned by any artifact. T9 (backup/restore of the client loop-of-record db) and T11 (Granola quota) have direct client-machine impact; earlier drafts of this map misfiled the backup and migration fragments under UU — they are tracked KUs.

Evidence: register Part 4 map-filling agenda (T-series line)

**Action:** Bites at client-machine setup and first upgrade. Resolve each T-item in the closure register; T9 and T11 first.

### Legal/entity readiness: no entity, no initial client agreement, and the YC application asks the hard questions
*strategy · client-relevance high*

No entity/incorporation or initial client-agreement artifact exists anywhere in the repo (grep-verified) despite an imminent university engagement needing a counterparty, and the YC application (due Jul 24) asks IP/prior-employer questions directly while an employment transition is in flight (office-hours 07-07 line 152 is the only written mention). The public repo timestamps the full development history, which raises the priority of the filter-repo/redaction work.

Evidence: grep for entity/incorporation/agreement across docs/ + raw/ = no artifact · 2026-07-07-office-hours-org-recap-pilot.md:152 · MEMORY: repo public since 2026-06-06

**Action:** Bites at the YC application (Jul 24) and client contracting. Founder resolves the IP/employment question through the appropriate process, decides entity form, and drafts a one-page initial client agreement with payment or an explicit time-bounded paid-conversion term.

### YC application vs clarity halt: unreconciled collision
*strategy · client-relevance high*

The application (written + video) is due Jul 24 with freeze Jul 18; demo scenes 2-3 stand on the cancelled Justinian Slack workspace; the pitch narrative predates both the customer switch and the halt; and no document states whether the demo-sprint schedule survives the halt or what the video honestly shows post-pivot.

Evidence: 2026-07-03-yc-demo-sprint-plan.md scenes 2-3 · 2026-07-03-pitch-narrative-layered-story.md (predates pivot) · register Part 4 (no YC mention)

**Action:** Bites Jul 18. Resolves: one-page founder decision — submit vs defer; if submit, the meeting→brief loop on real founder meetings is the only demoable, halt-compatible scene; application answers inherit the legal-entry resolution.

### Granola vendor economics: plan gating, seats, quota — and whether the lab even runs Granola
*strategy · client-relevance high*

Personal-scope API keys are plan-gated with the vendor's own docs inconsistent (Business vs Enterprise); the T11 quota check has never run; nobody has priced Granola seats for the lab or decided who pays — and the historical pilot doc demotes Granola to 'reference competitor, not the substrate' for a lab whose actual tools are Zoom + Mattermost. The interim first-client substrate is an unpriced, unverified vendor dependency.

Evidence: raw/external/precedents/granola-api-access-model.md (plan-gating inconsistency) · register Part 4 T11 · 2026-07-07-office-hours-org-recap-pilot.md (Granola demoted for the lab)

**Action:** Bites client contracting. Verify plan gating against the founder's actual plan, run T11, and decide who pays for Granola seats and whether the first engagement requires the Zoom adapter.

## 3. Unknown knowns — implicit knowledge and drift

*At the original map baseline, every first-read orientation surface described the retired April Machine-context product. The 2026-07-11 founder correction has now aligned README.md, CLAUDE.md, NORTH_STAR.md, AGENTS.md, AGENT_INSTRUCTIONS.md, and the v1-spec banner around the Team product and client-machine carve. Remaining drift is concentrated in deeper wiki architecture/capture pages, retired install docs, missing 124-131 promotions, and self-maintaining tooling contracts.*

### RESOLVED 2026-07-11 — CLAUDE.md now names the Team product
*strategy · client-relevance high*

At the baseline, CLAUDE.md sent every session toward the retired Machine-context offer. It now names the Team decision product as the commercial focus, meeting→brief as the first wedge, Machine/Fleet as internal assets, and the client-machine endpoint after assisted onboarding.

Evidence: baseline `67f5949e^:CLAUDE.md` vs current CLAUDE.md `Current Commercial Focus` · 2026-07-11 commercial-focus decision

**Action:** Closed. Keep this block synchronized with the founder decision.

### RESOLVED 2026-07-11 — retired v1-spec removed from mandatory reads and bannered
*strategy · client-relevance high*

The historical page still contains the retired April offer, but it is no longer a mandatory builder read and now opens with a 2026-07-11 supersession banner pointing to the Team-product decision.

Evidence: wiki/product/v1-spec.md supersession banner · docs/AGENT_INSTRUCTIONS.md mandatory-read table

**Action:** Closed. Preserve the body as history until the normal wiki retirement pass.

### RESOLVED 2026-07-11 — NORTH_STAR names one commercial focus
*strategy · client-relevance high*

NORTH_STAR now states that Team is the company bet, meeting→brief is the first wedge, Machine/Fleet are internal assets, and definition of done is client-machine install/use/repeat without the founder's machine.

Evidence: docs/NORTH_STAR.md rewritten 2026-07-11

**Action:** Closed.

### RESOLVED 2026-07-11 — AGENTS.md uses the Team-product carve gate
*coordination · client-relevance high*

AGENTS.md now treats the e1/e2 friction-first rule as operating-model history and gates all future product work on the Team-product carve and founder-signed clarity lift.

Evidence: AGENTS.md `Current operating gate` section, updated 2026-07-11

**Action:** Closed.

### Shipped Team-lab capabilities have zero wiki presence: 124-131 promotion pass never ran
*product-loop · client-relevance high*

Per the lagging-doc rule, shipped capabilities get wiki pages after landing in complete/ — but the last promotion commit is dd4e3cb8 (2026-07-06, items 116-123). The Granola poller, intake bridge, decision store, responder, post-meeting brief (131), and changeset compiler (130) are shipped Team-lab capabilities that exist only in raw/ decisions and completed backlog items. They are not all automatically part of the first client package; that package includes only what the meeting→brief wedge demonstrably needs.

Evidence: git log --since=2026-07-06 -- wiki/ shows only dd4e3cb8 · no wiki/surfaces/post-meeting-brief.md or decision-changeset-compiler.md; grep granola/brief across wiki/ near-empty · After Completion sections of backlog/complete/ items 124,125,127,129,130,131 list the owed pages

**Action:** Run the owed strategist wiki-promotion pass for 124-131 (the process explicitly permits it now that items are in complete/): create surfaces/post-meeting-brief.md, surfaces/decision-changeset-compiler.md, a capture page for the Granola poller/intake path, plus the 124/127/129 updates; regenerate manifest + index.

### PARTIAL 2026-07-11 — README corrected; retired install docs remain
*deploy · client-relevance high*

README.md now leads with the Team product, distinguishes internal Machine/Fleet assets, states current carve limitations, and installs the actual filename returned by `npm pack --silent`. docs/echo-init.customer.example.json, docs/SEND-TO-TESTER.md, and docs/echoctl-install.md still describe the retired dev-context-layer offer.

Evidence: current README.md · docs/echo-init.customer.example.json · docs/SEND-TO-TESTER.md · docs/echoctl-install.md

**Action:** Write the product install/onboarding contract and banner/archive the three retired docs so they cannot be handed to a client by accident.

### wiki/architecture/local-daemon.md omits the client product's entire boot spine
*product-loop · client-relevance high*

The shipped-status daemon page lists 6 boot subsystems and claims 'the daemon does no polling of its own'; the daemon actually boots 8+, including the Granola POLLER, enrichment dispatch (signal workers), and the Granola intake bridge — the client-product spine is absent from the page describing what boots.

Evidence: src/daemon/index.ts:77-99 (Promise.all starts granola poller + startEnrichmentDispatch; startGranolaIntakeBridge after) · wiki/architecture/local-daemon.md 'Subsystems Started on Boot' (6 items) + 'does no polling'; last touched 2026-06-06

**Action:** Correct local-daemon.md's boot list and delete the no-polling claim in the 124-131 wiki pass.

### wiki/architecture/capture-allowlist.md denies the connector the client runs on
*product-loop · client-relevance high*

The page says CAPTURED_SOURCES has 'five categories' and 'apis — still empty; API connectors are V1.5+'; reality has a sixth category `derived` (granola-signals, granola-signals-index, team-decisions) and apis=['granola'] live — the wiki denies the existence of the exact API connector and derived-atom class the client product is built on.

Evidence: src/capture/sources.ts:9-21 apis:['granola'], derived:[3 entries] (verified this run) · wiki/architecture/capture-allowlist.md:14 'five categories', :45 'apis — still empty'

**Action:** Update capture-allowlist.md with the six-category reality and the granola + derived entries in the 124-131 wiki pass.

### 'Single capture-gate chokepoint' is policy, not structure, for every client-loop atom
*product-loop · client-relevance high*

wiki/architecture/capture-gate.md and wiki/principles/sandboxed-capture.md present the gate as 'the single runtime chokepoint through which every captured event must pass', but derived signal atoms, team-decision atoms, and coord:* atoms are persisted via direct storage.append and would be REJECTED by the gate (parseSource accepts only app/domain/fs/api/git); allowlist enforcement for that class is ad-hoc at each writer site. The 07-03 loop-gap analysis established this, and every client-loop atom is in the bypass class.

Evidence: src/capture/gate.ts:57-71 (parseSource returns null for derived:/coord:) · src/enrich/granola-signals.ts:855,872 direct storage.append; :749 writer-site isAllowedDerived check; decision-store.ts:259 · raw/internal/decisions/2026-07-03-loop-gap-analysis.md Station 1 structural note

**Action:** Rewrite capture-gate.md (and the sandboxed-capture principle) to state the two-tier reality: gate-enforced for external captures, writer-site-policed for derived/coord — a security-posture claim a client will read.

### system-architecture.md — the canonical architecture page — has zero client-path content
*product-loop · client-relevance high*

The shipped-status page that claims to describe the system contains no mention of enrich/, brain, Granola, signals, or the station pipeline; src/enrich/ has 8+ modules and src/brain/brain.ts spawns codex/claude. The whole client product path is invisible in the page a new engineer or reviewer would read first.

Evidence: grep -i 'enrich|brain|granola|station' over wiki/architecture/system-architecture.md returns nothing; last commit 2026-06-06

**Action:** Add the enrich/brain/station layer to system-architecture.md in the 124-131 wiki pass; this is the anchor page the other corrections hang off.

### The client loop is retrieval-less in practice, contradicting the brand anchor
*strategy · client-relevance high*

The project brands itself 'we make every AI smarter about you' via cross-tool context, but the 123 live trace shows the intake classifier makes ZERO ECHO MCP retrievals (capture_status=zero_retrievals on all fresh cards) — the merged predecessor workflow used meeting signals only, and no spec or wiki page states this. Decision A1 (retrieval-less product mode) was resolved 07-10 but only in raw/ decisions.

Evidence: backlog/_followups.md:504 zero_retrievals finding · CLAUDE.md brand-promise block · commit 7b932c96 'resolve A1 (retrieval-less product mode)'

**Action:** State 'client loop v0 is meeting-signals-only; cross-tool retrieval is optional internal leverage, not a promised dependency of the first Team package' in the client scope anchor and new post-meeting-brief wiki page.

### Content-freeze-at-first-ingest is a real product semantic living only in review threads
*data · client-relevance high*

The poller never re-fetches an ingested Granola note (item 104 append-once), so post-meeting edits and late decisions can NEVER enter ECHO. This deliberate decision surfaced as a blocker-class caveat (Codex F4) and again in the brief stress test, and the filed follow-up (re-ingest-on-updated_at) has no owning backlog item — a client-visible data-loss semantic that is written nowhere a client or operator would look.

Evidence: 2026-07-04-station-2-signal-formation-lock-in.md Codex review F4 · 2026-07-10-brief-path-stress-test.md #3 · MEMORY.md append-only ingest note; no owning item in any kanban dir (verified empty)

**Action:** Document the freeze semantic in the client onboarding doc ('edit the note before ECHO polls it, never after') and in the new Granola-capture wiki page; track re-ingest as a ranked followup, not an inbox spec around G2.

### The loop runs on ~10 steps of concierge folklore with no runbook, incl. the plist-wipe trap
*deploy · client-relevance high*

The system works only because the founder performs an unwritten ritual: workspace visibility drag, settleMs=0 forcing, internalDomains=[] bypass, checkpoint hand-edits, daemon restart after upgrade, codex re-auth, pre-meeting test poll, never-paste-unread — inventoried in trap-map section 10 with the instruction 'none may stay folklore', plus the known-but-undocumented failure mode that daemon reinstall silently WIPES plist env keys (Slack tokens, decision-gate config; register B3). No onboarding/runbook artifact exists.

Evidence: 2026-07-10-client-machine-trap-map.md sections 2 & 10 · unknowns-register B3 plist-wipe clause; MEMORY.md Slack decision-gate setup note · docs/ contains no pilot-onboarding or box-runbook file

**Action:** Write the client-box runbook/onboarding checklist as a docs/ artifact from trap-map section 10, item by item, each marked 'automated | documented workaround'; the plist-wipe trap goes in the upgrade section verbatim.

### Client-readiness fixes exist only as prose; the trap map claims work is 'already queued' that isn't
*coordination · client-relevance high*

Every must-fix from the trap map, register, and stress test (signals first-run cutoff, API-key brain, --wait, successor deploy work, onboarding doc, brief target-miss copy) has zero specced backlog items — proposed/ready/claimed/pending_review are all empty, as required before G2. The trap map's claim that API-key binding is 'already queued' is false; build-shaped work belongs only in ranked dispositions until the halt lifts.

Evidence: all four kanban dirs empty (verified this run) · 2026-07-10-client-machine-trap-map.md:82 '(already queued ...)' (verified this run) · item 134 referenced as if scheduled; no file matches in any kanban dir

**Action:** Reconcile in one sitting: give each must-fix a pre-lift disposition, owner, and queue rank; after halt lift, convert approved work only into `backlog/proposed/` items. Correct trap-map line 82 — the register/trap-map must not claim queue state the backlog contradicts.

### The brief's brain dependency and its security posture are documented only in an in-tree README
*deploy · client-relevance high*

echoctl brief requires a locally installed + authenticated codex (or claude) CLI because startGranolaSignalWorker defaults its extractor to a brain subprocess; the claude binding runs with --dangerously-skip-permissions, and provider=claude hard-requires ANTHROPIC_API_KEY. These are client-box security/ops facts the 'meeting->brief only' scope silently inherits, written only in src/surfaces/ceo-slack-responder/README.md.

Evidence: src/cli/commands/brief.ts imports startGranolaSignalWorker; src/enrich/granola-signals.ts:944,963,1181 · src/brain/brain.ts:141 --dangerously-skip-permissions · src/surfaces/ceo-slack-responder/intake-agent.ts:71-74 ANTHROPIC_API_KEY requirement

**Action:** Document the brain prerequisite + permission posture in the client install doc and post-meeting-brief wiki page. The API-key brain is post-G2 build work; current founder CLI auth must never be presented as the target client contract.

### The client tarball ships the lab: unconditional dev extractors, founder paths, orchestration assets
*deploy · client-relevance high*

The scope pin says meeting->brief only, but the daemon unconditionally starts Claude Code/Codex/Cursor extractors and an fs-watcher over hardcoded macOS paths with no off-switch; DEFAULT_GIT_REPOS is the founder's personal '~/Desktop/Project_echo/' merged into capture config at every boot; and the npm tarball manifest includes echoctl orchestration onboarding, echo-skills/roles/workflows assets, and review-queue reviewer bindings. Items 132/133 were withdrawn at `0ab0af05`; until a post-halt successor carve lands, runtime reality contradicts the client boundary everywhere except in raw/ prose.

Evidence: src/daemon/index.ts:81-90; src/capture/sources.ts:7-21 DEFAULT_GIT_REPOS + fs_paths (verified this run) · package.json:29-35 files manifest; src/cli/index.ts:29,135-137 orchestration command · register Part 4 + `0ab0af05` withdrawal

**Action:** Write the interim truth into the install doc + bounded deploy outline: before the successor carve, the tarball boots the full lab stack and is diagnostic only, not the delivered client package. The paragraph is halt-compatible; the spec is post-G2.

### All pricing thinking is attached to the cancelled customer
*strategy · client-relevance high*

The only written prices anywhere are $25/mo (dead indie persona) and the recurring-with-opt-out / $3-6k-duct-tape-anchor / WTP-upfront playbook inside the CANCELLED Justinian pilot doc. The Team product is now the chosen commercial focus, but its target price, buyer, payment instrument, and initial offer are not written.

Evidence: 2026-07-07-office-hours-org-recap-pilot.md Addendum 1 (pricing playbook) vs Addendum 5 (cancellation) · wiki/product/v1-spec.md Pricing $25/mo · product-carve-unknowns-register B5

**Action:** Write the initial commercial offer: buyer, price or time-bounded paid-engagement posture, payment mechanism, onboarding included, conversion trigger, and what is explicitly not bundled. This refines aggressive selling; it does not gate the carve.

### Slack-enablement plan and YC demo scenes 2-3 stand on the cancelled workspace
*strategy · client-relevance high*

The two-stage Slack enablement plan and demo scenes 2-3 (Slack intake + status backflow with 'P.' as counterpart) were designed for the Justinian workspace and were never revisited after the 07-09 switch to a Mattermost-based lab customer — decisions standing on facts that changed, with the demo freeze on Jul 18 and no amendment doc.

Evidence: 2026-07-07-slack-enablement-two-stage-plan.md (unexecuted) · 2026-07-03-yc-demo-sprint-plan.md scenes 2-3 · 07-07 Addendum 5 replaces premise 2 with Mattermost provisioning; no amendment exists

**Action:** Write a short amendment to the YC demo plan (and mark the Slack plan superseded/deferred) resolving what scenes 2-3 demo now: Mattermost, mock Slack, or cut.

### The git-history exposure cleanup is believed handled but is tracked nowhere
*exposure · client-relevance high*

Commit 0ee788a2 promises the filter-repo history rewrite is 'tracked as a followup', but no followup, backlog item, or decision doc contains it; history still carries a third-party lead list, coworker notes, and a 560K raw capture dump. Compounding the folklore: a June in-store token scan (ECHO db, all hits placeholders) is easily conflated with the git-history secret scan owed since 2026-06-06, which has never run.

Evidence: git grep 'filter-repo|history rewrite' across backlog/raw/docs = only an unrelated item-098 line · commit 0ee788a2 message promise · mcp-interactions-journal-2026-06-claude.md:186-187 (db scan, not git history) · MEMORY.md repo-public note: secret-history-scan still owed

**Action:** Create a raw decision or followup entry now distinguishing three jobs: git-history secret scan, filter-repo content rewrite, and the already-done db token scan. Do not use inbox as a spec bypass.

### No committed-content policy exists for the public repo, while the journal discipline mandates committing captured content
*exposure · client-relevance high*

The repo went public 2026-06-06 but the only written rule about what may be committed is a .gitignore comment; meanwhile CLAUDE.md's journal discipline REQUIRES committing Returned/Sources summaries of retrievals — which embed captured Slack/Granola/meeting content, real third-party names, and the pilot company's identity — with no redaction step defined anywhere.

Evidence: .gitignore:23-26 sole policy artifact · CLAUDE.md dogfooding-journal Required-entry-shape (Returned/Sources mandatory) · 34 slack/granola references in mcp-interactions-journal-2026-07-claude.md alone; employer named in 22 tracked files

**Action:** Write a one-page committed-content policy (docs/ or CLAUDE.md section): name classes allowed/forbidden in the public tree, a redaction rule for journal Returned fields, and client-participant naming rules — then apply it in the cleanup sweep.

### Third-party PII/consent is not a trap class anywhere
*exposure · client-relevance high*

The trap map's 'Secrets & config' class covers operational absence-behavior only; no doc treats third-party-human PII or recording consent as a risk class, even though the experiment ingests an advisor's and PhD students' meeting content, recording-consent culture is named 'the hard part' in the historical pilot doc, and real first names from live captures already sit in a committed test fixture.

Evidence: 2026-07-10-client-machine-trap-map.md section 2 (single 'secret' mention, no PII class) · 2026-07-07-office-hours-org-recap-pilot.md:157 recording-consent culture · real third-party first names in committed fixture (exposure survey)

**Action:** Add a PII/consent class to the trap map (or the new committed-content policy): who appears in captured meetings, what they consented to, what may be committed/derived, and the deletion story — the lab/IRB context makes this a client-facing question, not hygiene.

### The backlog's real topology was undocumented; README + generator now cover it, client-vs-dev axis still open
*coordination · client-relevance medium*

backlog/README.md documented only five lifecycle stages and never mentioned inbox/, archive/, reviews/, or task-state/ — that gap is now closed: README documents the non-kanban state (`d7298a40`) and tools/backlog_index.py has an Inbox section with docs/BACKLOG.md regenerated (`401ccc38`), so the generator is no longer inbox-blind. inbox/ is empty at HEAD (the zombie duplicate of shipped item 081 was deleted, `b6fc242a`). The remaining gap is the ~150+ open _followups bullets having no client-vs-dev axis, leaving the cleanup sprint no written basis for deprioritizing dev-side bullets.

Evidence: backlog/README.md now documents inbox/archive/reviews/task-state (`d7298a40`) · tools/backlog_index.py has an Inbox section, docs/BACKLOG.md regenerated (`401ccc38`) · inbox/ empty at HEAD, 081 zombie deleted (`b6fc242a`); 081 shipped all-REMOVE (9bf44cea) · `0ab0af05` removed 132/133 · _followups.md R1-R6 lack any client/dev tag

**Action:** Sprint-scoped fixes — inbox/archive/reviews/task-state documented in backlog/README.md (`d7298a40`), an Inbox section added to backlog_index.py (`401ccc38`), and the 081 zombie git-rm'd (`b6fc242a`): all done. Remaining: add a client/dev tag convention to _followups.md's preamble.

### package.json version semver-precedes the already-released version
*deploy · client-relevance high*

package.json says 0.1.0-beta.1, which semver-PRECEDES the 0.1.0 released in CHANGELOG.md on 2026-05-27; CHANGELOG has no entry since despite continuous shipping. The first client tarball will carry a version older than the released one, and SEND-TO-TESTER already references echoctl-0.1.0.tgz.

Evidence: package.json "version": "0.1.0-beta.1" and CHANGELOG.md '[0.1.0] - 2026-05-27' (verified this run) · docs/SEND-TO-TESTER.md references echoctl-0.1.0.tgz

**Action:** Pre-lift: decide the next version and required client-facing changelog content. Post-G2: include the version change in the reviewed deploy proposal before cutting the first client package.

### MEMORY.md still calls the CI test split 'parked' — it shipped
*hygiene · client-relevance medium*

The auto-memory record says the orchestration/product CI split is deferred until 092, but vitest.product.config.ts already excludes tests/review-queue/** plus 6 orchestration suites and ci.yml paths-ignore excludes backlog/raw/docs/wiki — a stale record that invites redundant re-work during the cleanup sprint.

Evidence: vitest.product.config.ts exclude list; vitest.orchestration.config.ts include list · .github/workflows/ci.yml paths-ignore · MEMORY.md 'CI gate orchestration-test split (parked)'

**Action:** Correct the MEMORY.md entry (project_ci_gate_orchestration_test_split.md) to 'shipped'; note the residual init.test.ts cross-platform question as the only live remainder.

### ~50 ECHO_* env vars with no operator reference; some documented nowhere at all
*deploy · client-relevance medium*

src contains ~50 distinct ECHO_* env vars; at least ECHO_GRANOLA_SIGNAL_BRAIN and ECHO_SLACK_RESPONDER_INTAKE_ONLY appear in zero docs/wiki/README operator docs (the latter only in an in-tree src README), while doctor.ts references the undocumented var — client-box configuration exists as code-reading folklore.

Evidence: grep ECHO_ src = ~50 tokens; docs/+wiki/+README grep = 0 hits for the two named vars · src/daemon/doctor.ts:891 references ECHO_SLACK_RESPONDER_INTAKE_ONLY

**Action:** Generate an env-var reference table (docs/ or the client install doc): name, default, subsystem, client-box-relevant yes/no — a grep-derived table is an afternoon and directly feeds item 134.

### Secondary shipped-wiki drift: tool counts, storage contract, extension status, phantom 'planned' pages
*hygiene · client-relevance medium*

Four smaller shipped-page contradictions: mcp-server.md's 12+2 shorthand omits the optional propose_decision path (reality: 12 unconditional + 1 optional + 2 deadline-gated); storage.md claims 'three operations, no others' and a 'no-op MemoryStorage' when the interface has 7+ methods and MemoryStorage is fully functional; browser-extension.md (shipped) claims live store wiring while local-daemon.md says none exists and no extension code is in the repo; and hotkey-overlay/audit-page carry status:planned for April commitments the YC cut list excludes — while a full Tauri overlay app actually sits under tools/echo-overlay/ (37 tracked files, 2.2G build tree) against the taxonomy's src/surfaces placement.

Evidence: src/mcp/server.ts:205,271-289,303,313 vs mcp-server.md tool table · src/storage/interface.ts:65-113 + src/storage/memory.ts:38-46 vs storage.md · wiki/surfaces/browser-extension.md:2,14-24 vs local-daemon.md 'Does Not Do (Yet)' · git ls-files tools/echo-overlay = 37 files; wiki hotkey-overlay/audit-page status:planned

**Action:** Fold all four into the same wiki-refresh pass as the 124-131 promotion: correct counts/contracts, resolve the extension contradiction, and change planned→deferred (or delete) with a pointer to the overlay code's actual location.

### The canonical decision-loop model overstates what is proven at stages 3-4
*strategy · client-relevance medium*

The canonical model says stage 3 (confirm) is 'built and proven (station 4)', but confirmation is structurally unavailable whenever the hand-run Socket-Mode responder is down and no MCP confirm path exists — 'proven' holds only for manually-supervised happy-path windows. Stage 4 (Linear dispatch) plumbing was live-validated only on the cancelled Justinian-era Fly deployment and never in the lab-pilot loop; and the June live test graded the shipped responder 'plumbing right / value wrong' (zero synthesis) while pitch framing attributes the fluent answers to the product.

Evidence: 2026-07-09-decision-loop-canonical-model.md stage 3 vs claude journal 2026-07-08 23:22 PDT · codex journal 2026-07-01 09:37 (Jun 28-29 Fly live-test atoms); first-advisor-loop-cycle.md 'no Linear locally' · mcp-interactions-journal-2026-06.md:163 plumbing/value verdict

**Action:** Annotate the canonical-model doc with per-stage 'proven under conditions X' qualifiers (responder-up dependency, Justinian-only Linear validation, no-synthesis responder) so the demo and pilot plans inherit honest capability claims.

### Self-maintaining tooling contracts were silently broken; journal-cat + sync-skills fixed, three still open
*hygiene · client-relevance low*

Several tools/docs that declare their own maintenance guarantees were violating them; two are now fixed on maint/clarity-phase1 and three remain open. Fixed: journal-cat.sh — the documented canonical read for validation evidence — had been hard-failing on 2026-07 (Codex shard missing its '## Interactions' marker) and now exits 0 (`0122fa41`); tools/sync-skills.sh --check had been one-directional and passed despite .claude/commands/office-hours.md having no canonical skills/ counterpart — a canonical skills/office-hours.md now exists and --check flags orphan adapters (`10a3d95d`). Still open, each a falsified self-description: docs/architecture-map self-declares 'edit in the same change wave' but omits the 07-10 brief command; the deprecated get_recent_work_context MCP tool remains registered ~2 months past its own inline removal date; and src/index.ts is an empty export{} stub with src/reasoning/causal.ts having no production importer.

Evidence: journal-cat 2026-07 now exits 0 (`0122fa41`; was exit=1 on the Codex shard's missing '## Interactions' marker) · skills/office-hours.md now exists and sync-skills --check flags orphan adapters (`10a3d95d`) · docs/architecture-map/index.md @0f77efa1 2026-07-03, grep brief src-cli.md = 0 (still stale) · src/mcp/server.ts:274-276 removal note (still registered) · src/index.ts:1 (still stub)

**Action:** PARTIAL close (maint/clarity-phase1): codex shard marker fixed, journal-cat 2026-07 exits 0 (`0122fa41`); sync-skills --check now flags orphan adapters and canonical skills/office-hours.md exists (`10a3d95d`). Remaining: architecture-map regeneration, deprecated get_recent_work_context unregistration, and dead-stub disposition — each still a falsified self-description; the code-touching two wait for G2 or an explicit maintenance allowance.

## 4. Unknown unknowns — blind-spot classes + detection instruments

*ECHO's unknown-unknowns cluster along one seam: the Team-product pain and demand are founder-locked, but delivery has been proven in exactly one regime — founder's macOS machine, founder's months-deep db, founder as operator, grader, and only recipient. Thirteen blind-spot classes fall out: five are the unwritten client journey (vendor access, consent/offboarding, threat model, deploy path, unattended ops), three are never-exercised runtime regimes (cold db, fault/concurrency envelope, no meters), two are client-use evidence voids (no non-founder operation/feedback, no current-product eval), two are self-inflicted instrumentation gaps (repo-state rot with no freshness checks; public-repo exposure never scanned retro- or prospectively), and one is founder continuity. Each class has a cheap converter that reduces deployment risk without reopening the product-choice decision.*

### Zoom/Mattermost adapter + vendor-access void
*product-loop · client-relevance high*

The two adapters the first client engagement depends on have zero code, zero API/auth research, and nobody has enumerated the lab's actual tool reality (Mattermost version/admin rights/websocket availability, Zoom account type, OAuth-app-review lead time that can run weeks) — surprises hide here because every brief so far was founder hand-paste, so the delivery leg has never touched a real vendor API.

Evidence: grep -ril mattermost/zoom across src/, tests/, tools/ hits only tools/echo-overlay/node_modules type-definition noise (re-verified this run) · raw/external/precedents/ contains only one Granola doc; competitor-scans only a Granola scan · unknowns-register A4 covers port-shape bias but not vendor ACCESS discovery · raw/internal/decisions/2026-07-09-first-advisor-loop-cycle.md friction #4 (hand-paste delivery)

**Action:** Pre-lift detection is an access-discovery checklist executed with the lab (Mattermost version/admin/bot rights, Zoom plan + transcript export path, OAuth review timeline). Any post-to-Mattermost coding spike and adapter spec wait for G2.

### Unwritten client-journey stages: consent/IRB, offboarding/deletion, rollout safety
*strategy · client-relevance high*

The journey stages before and after 'loop runs' have no written thinking: third parties in transcripts never consented to ECHO processing at a university where IRB may apply; the only deletion story is dev 'rm -rf ~/.echo' against an append-only store with no in-place modify; and rollout/rollback/support thresholds plus customer-#2 topology were never re-derived after the Justinian→lab switch. These govern delivery safety, not whether the Team product is pursued.

Evidence: grep for consent/retention/offboarding/IRB across wiki/ and docs/ returns only incidental hits · docs/echoctl-install.md Full Removal = rm -rf; wiki/architecture/storage.md + append-only memory (no selective delete) · 2026-07-07-office-hours-org-recap-pilot.md Addendum 5: premises to re-validate 'against the lab' — no follow-up doc exists

**Action:** Detection: before the first real client-data run, (1) ask the lab the IRB/data-policy question and add a consent line to the client agreement, (2) run a deletion drill on a scratch environment and write the offboarding runbook, and (3) define operational rollout/rollback thresholds and name candidate customer #2. None is a demand gate.

### No threat model or data-handling policy for customer content
*exposure · client-relevance high*

Security thinking exists only as fragments — plaintext API-key custody, founder's personal accounts inside lab workspaces (B3), a world-readable repo, and a daemon that unconditionally binds the full 14-tool MCP registry on :38478 even in a brief-only deployment — with no unifying threat-model or retention/consent document, so the attack/exposure surface of a box holding a lab's meeting content has never been enumerated end-to-end.

Evidence: src/daemon/index.ts:89 startMcpServer unconditional; src/mcp/server.ts:269-313 (14 tools, localhost-binding is the only authz) · 2026-07-10-client-machine-trap-map.md section 2 (plaintext key custody) · product-carve-unknowns-register.md A6 + B3 ('Slack-backfill sensitivity lesson applies directly')

**Action:** Detection: a one-page data-handling + threat-model doc written as a gate on the first real lab meeting (what's stored, where, who can read it, what the MCP port exposes), plus a client-mode config decision on disabling MCP registration (successor-carve territory after halt lift).

### Retrospective public-repo exposure never scanned
*exposure · client-relevance high*

The full pre-public git history (2026-04-30→06-06, all branches/blobs — known to still contain a third-party lead list, coworker notes, a 560K capture dump) has never been swept by any secret/PII scanner; ~1600 files under backlog/reviews/ and raw/internal/agent-runs/ were never privacy-audited; and GitHub-side surfaces (secret-scanning settings, Actions logs, release.yml-uploaded tarball artifacts, forks since going public) have never been checked — surprises hide here because exposure already happened and only a scan can reveal its extent.

Evidence: MEMORY: secret-history scan owed since 2026-06-06, filter-repo rewrite promised in the removal commit never run · no scanner config or scan record anywhere in raw/ or docs/ · .github/workflows/release.yml uploads tarball artifacts on agent/** pushes and tags — never audited · backlog/reviews/ = 1617 tracked files across 100+ item dirs, never content-reviewed

**Action:** Detection: one-shot gitleaks/trufflehog over `git log --all` history + a content-class grep sweep of backlog/reviews/ and agent-runs/ + a `gh api` audit of repo security settings and release assets — all before additional client-derived data enters the pipeline.

### Prospective leak path: workflow discipline will publish lab content
*exposure · client-relevance high*

The repo's own documented disciplines (in-the-moment journals, decision docs, review artifacts) will by design embed the lab's meeting titles, note IDs, decisions, and names into the PUBLIC repo — the advisor-loop doc already did exactly this with real advisor data — while the only guard between live secrets (.env.slack, 1748 bytes, sitting in a tree where multiple autonomous agents run git) and origin/main is a single .gitignore line with zero git hooks and no CI secret scan, and a prior near-miss (symlink node_modules committed past a dir-only ignore) proves the guard can fail.

Evidence: .env.slack present in tree; git check-ignore passes but ls .git/hooks shows no non-sample hooks (re-verified this run) · raw/internal/decisions/2026-07-09-first-advisor-loop-cycle.md + 2026-07-10-brief-path-stress-test.md:18 embed real advisor meeting data · memory feedback_no_symlink_node_modules_in_worktree (near-miss precedent) · no redaction rule in the journal template; no CI secret scanning

**Action:** Pre-lift: decide and document the redaction/private-shard rule before the next client-derived meeting. Security tooling may proceed only under the halt's explicit exposure-risk allowance; it is not Team-product feature work.

### Deploy/upgrade/rollback path decided but never executed once
*deploy · client-relevance high*

The historical founder-box deployment design — tarball install, product launchd unit, migration against a populated db, rollback, and data-copy procedure — has zero execution history. The target is now a versioned product-only package installed on the client's machine, with client-local state and no founder-machine dependency. The artifact-drift evidence still applies: the root runbook diverges from docs/, a stale Jun-2 tarball conflicts with package version, and non-macOS lifecycle remains deferred.

Evidence: diff -q echoctl-agent-onboard-runbook.md docs/echoctl-agent-onboard-runbook.md → differ; root tgz mtime Jun 2 (re-verified this run) · 2026-07-11 commercial-focus decision + historical T4/B2 register · client-machine trap map (12 classes, static analysis) · src/cli/commands/daemon.ts:702,1120; backlog/_followups.md R5

**Action:** Run the current full-lab install/upgrade/rollback rehearsal on a clean Mac only as diagnostic input. After G2 and the carve build, G5 repeats it as the product-only qualification matrix on target-like clean Macs; G6 then installs the exact qualified checksum on the actual client machine.

### Client-machine operation has local measurements but no active alerting, backup, or spend meter
*deploy · client-relevance high*

Shipped items 117/120/122/124 provide local measurements: `echoctl doctor` stations 1-3 status, heartbeat artifacts, a local loop dashboard, and observed-vs-inferred health. What does not exist is an unattended consumer that alerts the client/operator/support owner when the client loop-of-record stops. There is also no backup/restore story for echo.db, no long-duration growth evidence, and no measured per-meeting API spend or payer contract.

Evidence: backlog/complete/2026-07-05-117-loop-observability-stations-1-3.md + items 120/122/124 · grep -c DELETE src/storage/sqlite.ts = 0 (re-verified this run); workers write heartbeats every tick (src/enrich/worker-heartbeat.ts:64-72, fail-soft) · trap map sections 3 and 12 · no runbook/SLA/support doc in docs/; B2 notes launchd unit 'needed for pilot uptime' but unspecced

**Action:** Pre-lift: run a kill-the-worker drill using current measurements, decide who must be alerted, set backup/cost/support requirements, and rank the gaps. Post-G2: propose alerting, gauges, and cost logging through review; put support expectations in the initial client agreement.

### Cold-db formation regime never exercised
*product-loop · client-relevance high*

Every live validation ran on the founder's 89+-signal, months-deep database. A fresh client database holds only meeting atoms, and A1 deliberately makes the first wedge retrieval-less. Cross-tool retrieval is optional internal leverage, not a promised product dependency, but extraction quality in the cold client regime still has never been observed.

Evidence: 2026-07-10-product-carve-unknowns-register.md A2 ('the empirical price check' on retrieval-less mode) + A1 resolution note · all live cycles (07-08 meetings, 07-09 advisor loop) ran on the founder's production db

**Action:** Detection: the register's own candidate gate — run the full loop against a scratch ECHO_HOME + fresh db on a real meeting transcript and grade extraction quality, before the first customer-facing run.

### No client has yet operated or repeatedly used the Team product after onboarding
*product-loop · client-relevance high*

The founder considers the pain and demand proven, but delivery and usability evidence remain founder-bound. The advisor received the 07-09 brief by hand-paste, no reception signal was captured, and n for 'installed on the client machine through assisted onboarding, then operated and repeatedly used by the client without the founder's machine' is still zero. Self-service installation is not required for phase 1.

Evidence: raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md (demand decision) · raw/internal/decisions/2026-07-09-first-advisor-loop-cycle.md (no recipient feedback captured) · memory project_n1_concierge_install_gate (delivery floor is n=0)

**Action:** Attach a one-line useful/wrong/why question to every delivered brief and observe installation, repeat use, and failure recovery. Use commercial conversations for pricing and buyer mechanics, not to reopen product selection.

### Real-provider and concurrent live-loop failure envelope remains unexercised
*product-loop · client-relevance high*

Three residual failure zones ride under every brief: (1) brain spawn/preflight/timeout/proxy behavior has automated coverage, but real-vendor auth expiry, output/schema drift, and rate-limit behavior are live-proven only for the founder's current CLI regime; (2) the real Granola API contract (auth expiry, rate limits, upstream schema drift) is untested — poller/signals tests inject fake clients; (3) the stress test's concurrency failure classes (checkpoint clobber, double extraction, orphan signals) were confirmed statically but never observed live because only one process runs on the founder's machine, while the target client machine runs daemon polling and on-demand briefs concurrently.

Evidence: tests/surfaces/ceo-slack-brain.test.ts:75-197 (success/error/timeout/preflight) · tests/enrich/brain-retrieval-capture.test.ts:106-180 (proxy failure + child env) · src/capture/surfaces/granola-poller.ts:1005-1010 + BriefCommandOptions.client test seam in src/cli/commands/brief.ts:44 · 2026-07-10-brief-path-stress-test.md Concurrency section (static confirmation only, no live observation)

**Action:** Pre-lift: run bounded real-provider and soak probes with predeclared rubrics, then decide the required failure behavior. Post-G2: propose recorded-fixture tests and scheduled canary alerting through normal review.

### Current-product eval/regression void
*data · client-relevance medium*

The project's only systematic quality instruments were built for the retired eng-tool product and have not run since: eval/cold-reader and eval/retrieval are frozen at 2026-05-31 with committed results and no statement of whether they are archive or regression suite, and the shipped drift surfaces (114 sweep, 118 join-nomination, 119 delivery-retry) have never executed against the 3 real confirmed decisions — so quality regressions on the meeting→brief surface, and drift-detection correctness, have no detector at all.

Evidence: git log -1 --format=%cs -- eval = 2026-05-31 (re-verified this run); eval/cold-reader/results/*.out.txt tracked · memory project_demo_map_vs_territory_audit ('drift hero never ran, 0 decisions recorded'); no July journal entry shows a live sweep · backlog/complete/2026-07-04-114, 2026-07-06-118/119 (shipped, never live-run)

**Action:** Detection: build a cold-reader-style case pack from the two live meetings' known ground truth and run it against HEAD; run one live drift sweep against the 3 confirmed derived:team-decisions rows; stamp eval/ as either archived-record or active-suite in a README.

### Repo/doc state rots with no freshness instruments
*hygiene · client-relevance medium*

Six monotonic state surfaces have no liveness check, so during the cleanup sprint the map silently diverges from the territory: After-Completion wiki promises are never diffed against the manifest (how 124-131 promotions lapsed), inbox-parked specs' file paths are never re-verified as HEAD mutates (blocked.py and review tooling both skip inbox/), 51 task-state pointer dirs for long-dead items actively misdirect cold-start actors, most wiki/product pages still lack supersession metadata (the old v1-spec and drift-prevention pages are now explicitly retired), per-app field-contract pages have no conformance tests pinning them post-112's subject-key change, and backlog/reviews grew 396 commits since Jun 25 with no archive policy or dir-size lint.

Evidence: ls backlog/task-state = 51 dirs; git log --since=2026-06-25 -- backlog/reviews | wc -l = 396; all 10 wiki/product pages status:shipped (all re-verified this run) · complete/2026-07-07-127 After Completion ('evidence for making the followups liveness sweep periodic') · backlog/_followups.md lines 243/516 (inbox specs unreviewable, dispatch gap); frontmatter schema defines only shipped|planned · tests/enrich/granola-signals.test.ts pins the signal contract but no analogous extractor-metadata conformance test exists

**Action:** Detection: one composite staleness sweep run weekly or as a merge gate — diff complete/ After-Completion sections vs wiki/.manifest.json, lint inbox specs' files_to_modify/spec_refs against HEAD, flag task-state pointers whose item is in complete/, add superseded_by/as_of frontmatter during the cleanup pass, add per-extractor field-conformance tests on the 115-AC4 pattern, and a tracked-count-per-dir lint for reviews/ growth.

### Unattended-FOUNDER: bus factor of one across every loop stage
*deploy · client-relevance high*

Concierge stages 2 and 5, the hand-started responder, founder-personal keys/CLI auth, and n=0 non-founder installs all run through one human. The chosen commercial endpoint must remove those founder-machine dependencies after onboarding, but nothing yet proves a client or second operator can restart, recover, or support the loop during a founder-unavailable week.

Evidence: first-advisor-loop-cycle.md (concierge stages) · register A3/B3 + superseded B2 · 2026-07-11 commercial-focus decision · memory project_n1_concierge_install_gate (n=0)

**Action:** Write a client-operations continuity note: credential inventory, restart/recovery steps a client or second operator can follow, pause/notify protocol, and support expectations in the initial client agreement.

## Cross-check against the Part-4 map-filling agenda

Every line of the halt's own agenda maps to entries above; the map also adds five dimensions the agenda did not name.

| Part-4 agenda line | Where it lands |
|---|---|
| Trap-map must-verifies (first-run backfill bound; brain-auth expiry) | KU: signals first-run cutoff · UU: deploy rehearsal / auth-expiry probe |
| A2 cold-db extraction quality | KU: A2 entry · UU: cold-db formation regime |
| A3 brain economics/ToS (analysis, not build) | KU: brain-binding entry (action rewritten to analysis) |
| A5 multi-tenant topology | KU: A5 entry (correctly sequenced at customer #2) |
| A6 secret-history scan + data-handling story | KU: A6 entry · UU: retrospective + prospective exposure classes |
| B1 rollout calendar / B5 pricing + name / B6 definition of done | KU: B1/B5/B6 entry · KU: Granola economics (feeds B5) |
| T-series (T1, T2, T5, T7–T11) | KU: T-series entry (new, post-critique) |
| Trap-map §3 classes 8/9 client-reality checks | KU: Granola topology, silent-drop, content-freeze entries · sprint plan WS5 access-discovery checklist |

Added beyond the agenda: legal/entity readiness, the YC-application-vs-halt collision, Granola vendor economics, unattended-founder bus factor, and the execution (not just mapping) of the exposure debt.

## Meta: what the critics changed

- **Refuted:** '132/133 review-converged and parked until ≥07-25' (withdrawn at 0ab0af05); 'brief-now.mjs deleted' (preserved at raw/internal/prototypes/); 'inbox has 3 files' (was 1 at the 2026-07-10 baseline — the 081 zombie — now 0 at HEAD after `b6fc242a`); the trap map's '(already queued)' claim about the API-key brain item remains false at HEAD — no kanban dir contains it.
- **Re-anchored:** live citations into deleted backlog/inbox/132·133 files point at the register (Parts 2/4) or explicit historical blobs at 95a6b581; convergence remains anchored at 18f72f89 / 71647084.
- **Reclassified:** backup rule and migration ordering moved UU→KU (they are tracked T9/T10).
- **Evidence auditor verdict:** 9 of 12 sampled high-stakes entries verified exactly at file/line level. Treat code-line claims as strong where pinned; treat `MEMORY`, mutable absence greps, and `verified this run` as weaker evidence until promoted into committed artifacts. The post-withdrawal rebase was completed editorially in this pass.
