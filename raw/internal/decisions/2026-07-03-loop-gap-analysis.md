# Loop gap analysis — per-station, architecture-map as SOT

**Date:** 2026-07-03
**Method:** 7 parallel read-only agents (one per loop station + cross-cutting rails), grounded in `docs/architecture-map/` (pinned `0f77efa1`, committed `d6b28188`), every claim re-verified in code with `path:line` citations. Apollo/GTM, stations 7–8, layer-2/federation out of scope per founder order. **Analysis only — no backlog items.** Full per-station evidence: `2026-07-03-loop-gap-analysis-station-evidence.md` (same directory).

## Verdict row

| Station | Verdict | One-liner |
|---|---|---|
| 1 Capture | partial | Eng + meeting edges solid; **Slack and Linear are surfaces, not capture sources** |
| 2 Structure signals | partial | Granola path production-grade; **no structuring of any non-meeting source**; drift join key fractured |
| 3 Decision packet | partial | Shipped end-to-end; **extracted meeting rationale dropped at one line**; confirm card thin; provenance frays at terminals |
| 4 Record | partial | Write side solid (append-only, exactly-once, tested); **read side weak** — no MCP decision retrieval, no decision↔Linear linkage |
| 5 Translate/backflow | partial | Responder + brain machinery hardened; **Linear read missing AND a live routing bug hijacks status questions** |
| 6 Drift (hero) | **missing** | No detection/scan/alert exists; but the rails are stronger than the "hero build" framing suggests |
| Cross-cutting rails | partial | Fly deploy real; five named durability/observability holes, all pre-identified in 109 follow-ups, none fixed |

## The six findings that change the plan

1. **Scene 3 has two blockers, not one.** Linear read is missing as expected (`linear-client.ts` exposes exactly one operation, the `EchoCreateIssue` mutation, `linear-client.ts:55`; credentials already load). But separately, `isLikelyLinearIntake` (`src/brain/brain.ts:250`) matches on *any known project name*, so the literal demo utterance "where is \<Project\>?" is hijacked into the intake follow-up flow before any answer path sees it. That's a live routing bug on the demo script, not a missing feature.

2. **Slack is not a capture source — load-bearing for drift v0.** The responder receives every allowed-channel envelope in-process (`responder.ts:1404`) but nothing feeds `processCandidate`; intake conversations live in a JSON draft file, Q&A in a markdown event log. The v0 drift definition names a Slack statement as the contradiction trigger — that leg has **no rail**. Until Slack capture exists, the only same-day drift supply is Granola meetings (which are drift-ready: signals carry `canonical_subject`, quotes, and `decision_status` proposed/decided/unresolved). Either build Slack capture or script the demo drift as meeting-sourced.

3. **The drift join key is fractured.** Two byte-identical normalizers live in `granola-signals.ts:368` and `decision-store.ts:54` and write to **two different metadata keys** (`canonical_subject` on signals, `normalized_subject` on decisions); the join is purely lexical, depending on two independent LLM invocations emitting the same phrase; eng atoms carry no subject at all. Unifying into one shared util + one key is the cheapest prerequisite for station 6.

4. **The "ECHO never captures why" claim is stale — the fix is one line wide.** The extractor already captures `rationale` as a first-class signal type with `rationale_for` linkage to decisions (`granola-signals.ts:32,442-449`), and `why` is a hard-required intake field the bot interrogates the founder for (`brain.ts:101-110,634`). But `INTAKE_SIGNAL_TYPES` (`granola-intake-candidates.ts:31`) excludes `'rationale'`, so extracted meeting-WHY never reaches the classifier or the seed. The highest-value rationale channel is severed at exactly one filter.

5. **ECHO cannot see its own loop.** The confirmed intake outcome, the created Linear issue {id,url}, decision↔issue linkage, and all Slack conversation content live only in `~/.echo/state/*.json` files and a markdown log — never in the atom store. Consequences: no MCP tool can retrieve a recorded decision by subject (decisions write `subject`, search matches `canonical_subject`; `queryLatestTeamDecisions` is in-process only), `pending_decisions` reads git playbook files not team decisions, and a future Linear read couldn't be joined back to eng atoms without new linkage. The loop's own artifacts are the biggest atom-store blind spot.

6. **Demo-week operational risks are concentrated and already named.** All still real in code: an `ECHO_GRANOLA_INTAKE_OWNER_MAP` JSON typo crashes the whole daemon at startup (plain-Error path through `daemon/index.ts:96`); seed retry is classifier-dependent, so a transient Slack failure + non-re-emitting brain strands a seed forever; a misconfigured seed carve-out drops every seed with zero log; a usage-log write failure destroys a successful answer; and **decision-confirm is configured nowhere in the deploy files** — the Fly worker answers decision buttons "not configured", so station 4 recording depends on an unsupervised, manually-started local responder, and running both against one Slack app token splits envelopes arbitrarily.

## Per-station gap map (condensed)

### Station 1 — Capture (partial)
- **Exists:** all six surfaces (CC/Codex/Cursor extractors, git/fs watchers, Granola poller) through the single `processCandidate`/gate chokepoint, booted by the daemon.
- **Gaps:** Slack conversations never become atoms (attach: `handleSocketMessage` `responder.ts:1404` or a `src/capture/surfaces/slack-*.ts` surface). Linear entirely uncaptured — write-only outbound (attach: checkpointed poller modeled on `granola-poller.ts`, source `api:linear`). Allowlist `apis` hardcoded to `['granola']` (`sources.ts:18`, one-line edit). Structural note: `derived:` sources bypass the gate chokepoint entirely and self-police (`gate.ts:57-72`) — the single-chokepoint invariant is policy, not structure, for that class. New sources also need normalize adapters to be visible to trace/clustering.

### Station 2 — Structure signals (partial)
- **Exists:** Granola extraction is production-grade — typed decision/rationale/action signals, `canonical_subject`, transcript-span provenance, content-hash dedupe, checkpoint+manifest+supersedes durability; well-filtered intake-candidate bridge.
- **Gaps:** No structuring of eng-session atoms — only the manual `echo-emit-decision` skill (excludes Cursor/git by enum, bypasses signal vocabulary). `src/reasoning/causal.ts` is dead-but-tested code (zero production importers — the architecture map's "consumed by MCP tools" claim is **false**), yet is the natural seed for eng-session structuring. Join-key fracture (finding 3). Minor: manifest-orphan window on crash; one bad note aborts the whole extraction tick; bridge doesn't apply current-manifest filtering (dedupe_key stability covers it).

### Station 3 — Decision packet (partial)
- **Exists:** meeting signal → durable versioned Slack seed (8 typed fields incl. required `why`, meeting provenance, machine marker traceable to the exact signal atom); parallel `propose_decision` MCP propose→confirm gate.
- **Gaps:** rationale channel severed (finding 4). Confirm is take-it-or-leave-it: intake card shows 4 of 8 fields and no provenance; decision-card Edit button is a dead end (`editDraft` exists, zero callers). Provenance frays at terminals: Linear issue body drops machine keys (`note_id`, `candidate_key`) needed for backflow joins (`issue-render.ts:112-126`); `propose_decision` schema has no source-atom refs; confirmed outcome never appended to the store (attach: `runCreateOnce` success path, `responder.ts:912-958`).

### Station 4 — Record (partial)
- **Exists:** `TeamDecisionAtom` well-typed (`normalized_subject`, `dedupe_key`, `draft_id`, full attribution) at `decision-store.ts:20`; append-only; propose→confirm fail-closed and exactly-once (tested); Linear create exactly-once via pending→creating→created/needs-reconcile.
- **Gaps:** no MCP tool wraps `queryLatestTeamDecisions` (demo clients must know the internal dedupe_key format); decision subject invisible to free-text search; decision↔Linear-issue linkage absent everywhere (two disjoint pipelines, JSON-file-only state); supersede is implicit latest-wins with no chain — subject wording drift produces two coexisting "live" decisions with no conflict signal (directly limits station 6). Caveats: draft-store locks are in-process only; decision lookups full-scan.

### Station 5 — Translate / backflow (partial; demo-critical spine absent)
- **Exists:** responder + brain subprocess machinery hardened (socket lifecycle, ack, injectable deps); decision-store answer mode has a real coded "couldn't find".
- **Gaps:** **Linear read missing** (headline); **status-question hijack bug** (finding 1); no status-question type at all; faithfulness on the brain path is prompt-only, zero code enforcement, zero tests; the two answer modes are **mutually exclusive by env** (`ECHO_TEAM_DECISION_STORE` set → every question answered from confirmed decisions only, brain never runs — the map doesn't note this); no structured provenance in replies; no eng-atom↔issue linkage for evidence; `ECHO_MCP_URL` injected into the brain env but consumed by nothing — ECHO access rides ambient CLI config.

### Station 6 — Drift alert (missing; rails mapped)
- **Rails that exist:** bilateral subject keys (lexical only, fractured — finding 3) with `decision_status` semantics free on the Granola side; two worked brain-backed worker templates (`granola-signals`, intake classifier) + `startEnrichmentDispatch` as the declared fan-out point; interval/debounce/`runSignalsFirst` scheduling shape ready to copy; daemon-side Slack push precedent (`postGranolaIntakeSeed`) + Block Kit cards; false-positive containment fully solved by the propose-confirm card + requester-only guard + dismissal-as-noise-signal log.
- **Missing:** contradiction detection (no compare code anywhere; attach as a third brain-backed enrich worker: latest decision per subject × new same-subject statements → strict-JSON verdict, checkpoint-idempotent); candidate supply beyond Granola (finding 2); alertable owner — `author` is a machine id, `confirmed_by` is a cofounder id with **no reverse cofounder→slack_user_id lookup** (data exists in the identities env; trivial helper missing).

### Cross-cutting rails (partial)
- **Exists:** daemon boots the full stack with mostly-graceful config degradation; Fly deployment (`project-ech0`, restart=always, /data volume) is real and the map under-states it; channel model precise and tested; seed/intake stores implement real at-least-once/exactly-once with crash-recovery tests; `.env*` verified untracked (public repo safe).
- **Gaps (all pre-named in 109 follow-ups, none fixed):** owner-map typo daemon-crash; store-driven retry missing (stranded seeds); terminal-candidate skip missing (brain re-runs every note every 10 min); needs-reconcile has no listing/reconcile surface; silent seed drops (no-log at `responder.ts:711`, debug-only at `:809` while Fly ships info level); usage-log failure destroys successful answers; bridge↔responder config-equality invariant spans two machines with zero verification; local responder (the only decision-confirm host) has no supervisor; envelope-splitting hazard if local + Fly connect on one token. Tracing one intake = joining `candidate_key` across five artifacts on two machines.

## Suggested build path (component-by-component, for founder understanding — not specs)

Ordered so each component teaches the next and the demo-critical path lands earliest; matches the sprint's hardening → backflow → faithfulness sequence with drift as hero:

1. **Rails hardening** (station 0, ~the 114 batch): owner-map crash wrap, store-driven seed retry, terminal skip, warn-level silent-drop logs, Fly log level for demo week. Teaches: the intake state machines. Everything downstream assumes real traffic survives.
2. **Loop self-capture** (station 1): created-Linear-issue atom + Slack conversation capture through `processCandidate` (+ allowlist entries + normalize adapters). Teaches: the capture gate/pipeline/adapter chain end-to-end. Unblocks both scene-3 grounding and drift's Slack leg — the single highest-leverage new capability found.
3. **Status backflow** (station 5, scene 3): Linear read methods on the client, a status-question route in `respondToQuestion`, fix the `isLikelyLinearIntake` hijack, structured provenance in replies. Teaches: responder routing + brain grounding.
4. **Join-key unification + decision read surface** (stations 2/4): shared normalizer util, one metadata key, MCP tool wrapping `queryLatestTeamDecisions`. Small; prerequisite for 5. Teaches: metadata/retrieval contract.
5. **Drift worker** (station 6, hero): third brain-backed enrich worker + cofounder→slack reverse lookup + alert card cloning the confirm pattern. Teaches: the whole enrich fan-out. Meeting-sourced drift works without step 2's Slack leg; cofounder-vs-cofounder-in-Slack needs it.
6. **Rationale re-plumb** (station 3): include rationale signals (+ `rationale_for` links) in classifier input; consider making rationale load-bearing on the decision path. One-line start, big narrative payoff ("captures the WHY" becomes literally true).
7. **Faithfulness A/B** (gates camera): unchanged from sprint plan; note the coded "couldn't find" exists only in decision-store mode — the A/B must test the brain mode the demo will actually run.

## Architecture-map corrections owed (map maintenance, not product work)

- `src-reasoning.md`: "consumed by MCP tools, render-trace, and future audit UI" is false — only importer is its test.
- `index.md` data-flow: "RESP -- decisions / drafts --> STORE" over-states — only confirmed decisions land; drafts live in JSON files.
- `src-surfaces.md`: missing the Fly deployment story (fly.toml/Dockerfile) and the env-based mutual exclusivity of the two answer modes.
