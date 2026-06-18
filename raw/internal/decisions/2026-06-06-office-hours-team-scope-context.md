# Office Hours — Team/Org-Scope Context Capture (2026-06-06)

> **→ DIRECTION SHIFT (2026-06-18):** the team/org-scope expansion this session parked ("zero firsthand evidence; no team workflow to dogfood") was committed as the **next-sprint direction** on 2026-06-18 — as a **conviction bet, not demand-validated** (this session's gates were skipped, not cleared). See `2026-06-18-office-hours-cross-human-context-ecosystem.md` and memory `project_cross_human_ecosystem_bet`.

**Topic interrogated:** Founder proposed team-scope / organization-scope context capture as ECHO's next layer once the personal context layer's gaps close ("ready for beta"). Is the expansion sound, and what does it break?

**Mode:** Startup (six forcing questions, anti-sycophancy).

**ECHO sources grounding the session:** `find_clusters` + `get_atoms` over today's repo activity (claude_code session `5fd2bd27` + 6 subagents, codex sessions `019e9e39`/`019e9e8e`, git); `search_memories("team scope")` → 0 prior uses of the phrase (idea is new to the record as of today); `search_memories("organization")` → the 2026-05-28 advisor↔PhD org-lens reframe (codex verdict: "routing policy is the hard problem") and the 2026-05-29 burned-insurance demand research (phrasing-gap finding; org-end interviewee cast as GTM read, not buyer). Cursor absent (expected). All calls journaled in the 2026-06 shard.

**Prior decisions this touches:** reverses-in-part `substrate-is-scaffolding` (2026-05-17: defer team-shape vision to V2+); sits under `wedge-is-the-loop` (2026-06-01: binding constraint = demand-targeting, can't name person #2); gated by `friction-first prioritization` and the n=1 concierge install gate (only the founder has ever installed ECHO).

---

## Q1 — Demand Reality

- **Offered first:** Reddit/X posts + YC RFS for "company brain." Dispositioned: category-demand, not product-demand — same phrasing-gap trap the 05-29 burned-insurance research already documented. The RFS cuts *against* solo entry (funded cohort incoming + Glean/Microsoft/Notion/Slack/Dust incumbents with sales + SOC 2).
- **Real incident recovered on the third press:** during the coworker's Windows onboarding, the founder asked him to **manually export his Codex + Claude session jsonls and send them over** so the founder could debug. That is a genuine duct-tape artifact: the founder hand-reimplemented ECHO's capture layer across a machine boundary, moving the exact files ECHO ingests.
- **Confounds:** (a) founder was acting as *vendor* (support telemetry), not teammate; (b) n=1, and the project was ECHO itself.
- **Direction inversion:** the founder's pitch was "coworker reads MY context to onboard" (counterfactual, imagined); the observed incident was "I read HIS context to debug" (real). Both are the same primitive in opposite directions: **scoped, consented, person-to-person read access over the existing capture layer** — not org-scope ambient capture.

**Verdict: demand for org-scope capture = pure bet, zero firsthand evidence. Demand for a peer-to-peer session-context share primitive = one real duct-tape data point (n=1, self-referential).**

## Q2 — Status Quo

Unanswerable, and the founder said so plainly: **he is a solo dev**. He has no recurring cross-person context workflow to observe. The only observed status quo is the one incident above (manual jsonl export). This is the decisive fact of the session: there is no team workflow available to dogfood.

## Q3 — Desperate Specificity (target human)

Not reached as a standalone question; collapsed by Q2. No nameable team exists. The only named human is the concierge-install coworker (Windows, CC+Codex, flop-AI for Unreal work) — already the subject of the standing n=1 gate, and he is an *install* target, not a team-scope buyer.

## Q4 — Narrowest Wedge

The session's main yield. The scope ladder, with the rung the founder was skipping:

**machine scope → fleet scope → peer share → team scope**

- **Fleet scope** = same owner, multiple execution surfaces. Claude Code web sessions, scheduled remote agents, CI runs, any second machine — all invisible to ECHO today. This is team-scope's hard technical problem (cross-machine capture, identity joins, transport) with **zero consent problem, zero ownership mutation, and a solo dogfooding loop**. Friction-fix-shaped; can pass the friction-first gate if real incidents exist (see Assignment).
- **Peer share** = one-directional, scoped, consented read access between two people (`echo share --repo X --with Y` shape). Validatable at exactly n=2 via the concierge install. Both of the founder's incidents point at this primitive.
- **Team scope** earns a spec only when a *beta user* hand-carries a jsonl to a teammate — their duct tape, not the founder's.

## Q5 — Observation & Surprise

The onboarding session itself was the observation. Surprise extracted: the founder expected the share-direction to be "new member pulls senior context"; the lived incident was the reverse (debugger pulls the new member's context). Assumption contradicted: the first cross-person context consumer was the *expert*, not the novice.

## Q6 — Future-Fit (the part that survives)

The thesis is sound at the 3-year horizon, with a specific mechanism — not "teams are a bigger market":

**As work shifts from humans typing to agents executing, a growing fraction of a team's real knowledge (reasoning, rejected alternatives, the why) gets trapped in agent session logs that no existing team tool captures.** Git shares code; Slack shares chatter; Glean indexes documents; nobody captures agent sessions. Today's `_followups.md` rewrite is the specimen: its entire provenance (3 Codex consults, coverage ledger, 6 subagents) exists only in jsonls — invisible to any teammate reading the commit. The trend line makes a session-context layer *more* essential over time, and ECHO already owns the capture surface.

## What team scope breaks (why "thesis sound" ≠ "build it next")

1. **Breaks the validation engine.** Every ECHO layer was validated against the founder's own logged friction. Solo dev ⇒ no dogfooding loop for team scope exists. The product would switch from "built against felt pain" to "built against Reddit posts."
2. **Mutates the thesis.** The operator-thesis spine is *user-owned* context (the structural defense vs AI vendors). In any org deployment, ownership lands with the employer ⇒ ECHO becomes employer-owned surveillance of employee agent sessions. Different product, different conscience, and it's the contested Glean/RFS space.
3. **Multiplies the unmet prerequisite.** Today's six-root reduction put R1 (canonical artifact identity) upstream of everything — and it is broken within one machine. Cross-person joins are R1². The thesis is already "gated on retrieval signal-to-noise"; more people's atoms scale noise faster than signal.

## Premises to validate (ordered by load-bearing)

1. **Fleet-scope friction is real for the founder** — ≥2 concrete incidents in the last month where ECHO's machine boundary cost something (web session unretrievable, remote agent work off-substrate, second-machine black box). *Validates: the next rung. Falsifies: the whole ladder pauses.*
2. **Peer-share has a pull at n=2** — during/after the concierge install, the coworker (or founder) reaches for the other's context unprompted. *Validates: the share primitive.*
3. **Agent-session knowledge-entrapment grows with agent usage** (Q6 mechanism) — checkable in the founder's own corpus: fraction of decision provenance living only in jsonls, trending. *Validates: the long thesis.*
4. **Ownership can stay user-side in a team deployment** (per-person vaults + grants, not org pool) — unvalidated, deferred until premise 2 holds.

## The Assignment (this week)

**Run the fleet-scope friction audit on yourself:** list every incident from the last 30 days where context was lost or unreachable because it lived off this machine — Claude Code web/cloud sessions, scheduled remote agents, CI runs, the Windows tester's machine, any second device. Date each one. **≥2 real incidents ⇒ fleet scope is a friction-fix candidate and may be specced (inbox, friction-first-compatible). <2 ⇒ park the entire scope ladder; nothing above machine scope has felt pain behind it yet.** (The concierge install remains the standing prior assignment and doubles as premise-2's probe.)

## Founder resolution

Accepted mid-session, in his own words: **"i am jumping ahead. validate from the smallest scope first then gradually scale up."** Team/org scope is not specced; no backlog item created; fleet-scope audit is the gate.

## What I noticed about how you think

- **Validation by isomorphism.** Your recurring comfortable move: when a layer nears completion, you reach for the *bigger abstraction* under the logic "the same pattern, scaled, must also be valuable" — substrate→platform (05-17), ①→② (05-31), machine→org (today). The logic of the small thing is treated as evidence for the big thing. It never is; only incidents are evidence. You skipped two rungs (fleet, peer) to get to the abstraction with the best story.
- **Demand questions get architecture answers.** Asked for panic-evidence, you offered Reddit + an RFS; pressed again, you reframed to "is the direction sound?" You flagged it yourself this time ("not an answer, just a question") — the reflex is becoming visible to you, which is the point of these sessions.
- **You fold fast when the evidence is laid out — and honestly.** "No real signal," "I am a solo dev so I do not have an accurate answer," "I am jumping ahead." Zero defensiveness once cornered. The risk was never stubbornness; it's that without the cornering, the isomorphism story ships.
- **Your best evidence keeps being things you did without noticing.** The jsonl hand-carry was the strongest demand artifact of the session and you presented it as an aside about debugging. Your duct tape is more honest than your pitch — mine it first next time.
