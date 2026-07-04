# Capture→signals seam v0 — the decisions, in plain English

**Date:** 2026-07-04
**Status:** decided (founder-approved in strategist session; backlog gate lifted for this scope)
**Builds on:** `2026-07-03-loop-gap-analysis.md` (stations 1–2 + station 6 rails), the three-fork seam discussion (this session), `2026-07-03-yc-demo-sprint-plan.md`.
**Amends:** the sprint plan's "no backlog specs" amendment — founder lifted the gate for this scope on 2026-07-04. The component-by-component intent is preserved: the three items below *are* the components, in dependency order.

Each decision below is stated in plain English first; the technical grounding lives in the gap analysis evidence file and the session transcript.

## A. What crosses the seam (fork 1)

1. **There are two different jobs, never mixed: noticing facts and drawing conclusions.** A fact: "in Tuesday's meeting, someone decided to use SQLite." A conclusion: "we're drifting off the launch plan." Facts are written down permanently; conclusions are worked out fresh every time someone asks.
2. **Facts are extracted once and saved forever, with a receipt** (the exact quote and which meeting it came from). Extraction costs an AI call and wording varies per run — so pay once, pin the result, never re-extract the same input.
3. **Conclusions are never saved — they're recomputed every time.** "Are we on track?" computed Tuesday is wrong by Thursday. A saved conclusion is a stale opinion pretending to be a fact.
4. **The test: does the answer change when the goal changes?** No → fact, below the seam, persist. Yes → conclusion, above the seam, recompute.
5. **The office analogy:** filing cabinet (store), secretary who writes structured minutes (signal extractors), manager who reads across meetings against goals (correlation layer). Two forbidden failures: the secretary who editorializes (judgment buried in plumbing), and the manager with no minutes (re-interviewing everyone per question).
6. **A machine conclusion becomes company truth only after a human clicks confirm** (the existing propose-confirm gate).

## B. When raw data gets cleaned up (fork 2)

7. **Clean up on demand, not in advance.** Improvements to the cleanup logic then apply to all history for free; no stale precompute. Fast enough today; measured slowness, not predicted slowness, triggers change.
8. **Hide that choice behind one door**: a single internal window-read function. Whether it computes on the fly or serves a cache is invisible to callers forever.
9. **The door hands back one bag**: raw events and extracted facts together, in one ordering, one budget — so no caller ever builds on half the picture.
10. **Full text inside the house; trimming only at the doorway.** Wire-size caps exist for external MCP clients; internal readers (the drift sweep) get full fidelity. MCP tools become the wire projection of the internal read, never the other way around.
11. **Same question + same data = byte-identical answer**, guaranteed and tested. That's what makes false alerts debuggable and quality A/B-able.
12. **No speed-up until a real reading is measured slow; no second copy of the data.** The store is the working memory. When a cache is needed, the manifest/supersede pattern (already built for the harder LLM case) is the template.

## C. How the understanding layer asks (fork 3)

13. **It asks a question — not a subscription feed, not a full dump.** The store is already a log; every consumer is a cursor-poller; feeds would add delivery plumbing we don't need.
14. **The decisive anti-feed argument: silence sends no notification.** The most valuable catch — a decision nobody acted on — produces zero events. Only a clock can see nothing happening.
15. **The one genuinely new mechanism is an alarm clock, not a sensor**: a periodic sweep asking "what arrived since my last check, and does it contradict — or conspicuously ignore — a recorded decision?" Everything else is re-drawing boundaries around existing code.
16. **The sweep keeps its place in line by arrival order, not event date.** Late-arriving atoms (daemon down during a meeting → notes ingested hours later with old timestamps) would be silently skipped by a date-based cursor — the exact atoms most likely to matter. The append-order cursor pattern already exists for coord atoms (built for this exact reason); we generalize it.
17. **"Whose context?" is a filter setting**: `scope: machine` (code sessions, commits) vs `scope: company` (meetings, Slack, Linear, decisions). Team/department later become more values of the same setting — the fractal costs a parameter, not a redesign.
18. **Topic filtering starts dumb and honest**: exact match on one unified subject key. Today two duplicated normalizers write two different keys — merging them is the first item. Alias grouping later (below the seam, as saved facts); fuzzy AI matching, if ever, above the seam only.
19. **Nothing inside the plumbing ever calls an AI.** Intelligence lives in the extractors (below, run once, saved) or the question-askers (above, run fresh) — never in the window/storage layer.
20. **Contradiction and silence are handled differently because being wrong costs differently.** Contradiction → interrupt the decision owner (behind an acknowledge/dismiss card; false alarm costs one click). Silence → weekly digest, never an interrupt.

## Scope decision: three backlog items

| # | Item | What it is | Depends on |
|---|---|---|---|
| 115 | subject-key unification | one shared normalizer, one metadata key across signals + decisions | — |
| 116 | signal-window interface | the "one door": `getSignalWindow` internal contract + generalized append-order cursor | 115 |
| 117 | drift sweep v0 | the alarm clock: contradiction detection + owner alert, meeting-sourced | 116 |

**Why exactly three.** 115 is small but makes 116's `loop` filter honest — separate so it can land and be reviewed fast. 116 is the contract everything else stands on — separate so the interface gets reviewed as an interface, not as a side effect of the sweep. 117 is the only net-new mechanism and the demo hero. Merging any two couples a cheap review to an expensive one; splitting further (e.g., the storage append-order seam out of 116) would create an item with no independently observable behavior.

**Explicitly deferred, not forgotten:**
- **Silence/absence digest** — post-freeze stretch per sprint plan; the sweep's clock and watermark make it a small follow-up.
- **MCP tools refactored onto `getSignalWindow`** — post-V0 alignment; no behavior change for external clients until then.
- **Slack + Linear capture, eng-session signal worker** — gap-map items on their own track; v0 drift supply is Granola-only by design.
- **Alias table / semantic loop matching** — earns its keep only after lexical matching demonstrably misses real drift.

## After Completion (Strategist Notes)

- 115 ships → note on `wiki/architecture/storage` (or successor page) that subject keys are unified; update `capture-gate` page only if the derived-write path changes.
- 116 ships → new `wiki/architecture/signal-window` page: the seam contract, two orderings, scope semantics, fork-1 rules (this doc is the source).
- 117 ships → new `wiki/surfaces/drift-alert` page + update the loop diagram's station 6 from planned→shipped; drift-report digest gets its own decision record before any deepening.
