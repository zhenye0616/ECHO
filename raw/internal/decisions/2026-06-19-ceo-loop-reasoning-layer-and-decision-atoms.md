# Next-sprint design — the CEO-loop reasoning layer: decision-atoms + a headless-agent brain

**Date:** 2026-06-19
**Status:** design doc (strategy record) — seeds the next-sprint spec(s). Not shipped reality.
**Extends:** `2026-06-18-office-hours-ceo-loop-rationale-capture.md` (the wedge + AC1) and item `103` (the Slack responder MVP, which this builds the brain for).
**Origin:** a long working session that built the Slack responder (item 103), tested it LIVE, and diagnosed precisely why it failed — which produced the architecture below.

---

## What today proved (the live test is the strongest artifact)

Item 103's Slack responder was built, reviewed (fix b applied), and **tested live**: founder DM'd it *"why did we build the observability layer?"*. It replied with **three irrelevant recent Linear-reorg snippets** — not a why.

Replaying the exact pipeline (`answerQuestion`, responder.ts:192-203) proved the mechanism beyond doubt:
1. 1st `search_memories(<full question>, repo_path=justinian)` → **0 matches** (literal-substring search of a whole sentence matches nothing).
2. Fallback `deriveFallbackQuery` → longest token = `"observability"`.
3. 2nd `search_memories("observability", …)` → **5 matches, all from today 17:43–17:56** — Linear-reorg surveys + code-review prompts that merely *mention* the word (they list JUS-17's title), **recency-ranked**.
4. `buildSlackAnswer` → dump the top 3 raw, no synthesis.

**Root cause:** the bot's answer *is* raw `search_memories` output, and `search_memories` is **literal-substring + recency-ranked**. The actual rationale (seam analyses, design doc) is older and needs *relevance* ranking to surface; it never did.

## The architecture insight (the spine)

**ECHO uses no LLM.** Verified against the codebase: no LLM/provider SDKs in `package.json`; no model API calls in `src/`; `search_memories` is `content.toLowerCase().includes(q)` ("NOT a semantic / KNN search"); clustering is artifact-overlap heuristics. ECHO is a **deterministic capture + retrieval substrate.**

> **The brain lives in the *consumer*, never in ECHO.** ECHO supplies memory (MCP tools); the *LLM querying it* supplies intelligence.

This is why ECHO "feels smart" inside coding agents and dumped chatter in the Slack bot:

| Surface | Hands (ECHO MCP access) | Brain (LLM) | Result |
|---|---|---|---|
| Coding agent (Claude Code, Codex) | ✓ | ✓ (built in) | synthesizes |
| Slack responder (today) | ✓ | ✗ | dumps raw atoms |

**ECHO is worth exactly as much as the LLM querying it.** In a coding agent the LLM is free (already there). In a standalone surface (Slack, future web UI) you must *supply* it.

## Two deficits → two fixes

1. **Retrieval** — literal-substring + recency is the wrong primitive for conceptual "why did we decide X" queries. Fix = **relevance ranking** + a **sparse high-signal retrieval target** (decision-atoms, below).
2. **Synthesis** — nothing turns retrieved atoms into a business "why." Fix = **a brain** (an LLM in the consumer surface).

## Fix 1 — the decision-atom layer (founder's proposal)

A new **curated atom kind** layered *over* ECHO's raw event capture:

```
decision-atom = {
  decision:     what was decided,
  reason:       why — BOTH the design rationale AND the priority rationale
                ("why this approach" + "why it's worth doing now"),
  alternatives: what was considered and rejected (and why not),
}
```

- It's the **ADR (Architecture Decision Record)** pattern. `alternatives` is the load-bearing field — "we chose X over Z because Z fails under W" is what makes a why *defensible*; it's also the field most likely skipped under sprint pressure.
- **Why it fixes both deficits:** a decision-atom is *sparse + high-signal* (a "why" query hits *it*, beating recency-chatter — fixes retrieval) AND it carries the `reason` *pre-structured* (no synthesis-from-exhaust, so the brain *presents* rather than *confabulates* — fixes fidelity).
- **Capture model — HYBRID (the bet):** an LLM drafts the `[decision, reason, alternatives]` triple from the live session/exhaust; the founder **confirms/corrects it in one click while fresh.** This is low-effort AND faithful, and it sidesteps the can't-remember problem (see AC1 below) by capturing before memory decays. Pure author-at-decision-time is too effortful (alternatives gets skipped); pure LLM-extraction reintroduces confabulation. Hybrid is the synthesis.
  - Note: `alternatives` are often *more* visible in raw exhaust than the bare why ("tried X, didn't work, did Y"), so extraction does that part reasonably; the *priority* why is the hard part that needs founder confirmation.

## Fix 2 — the reasoning brain: a headless coding agent (founder's direction)

Don't build a bespoke LLM client into the responder. **Make the responder invoke a headless coding agent as its brain** — the exact pattern we already run (review-queue fires `codex exec`; codex already calls ECHO MCP). The responder becomes a mini coding-agent:

```
Slack question
  → invoke headless agent (codex exec / claude -p) with: ECHO MCP + scope (justinian.ai)
     + "answer this 'why' from the decision-atoms / scoped context"
  → agent retrieves (ECHO MCP) + reasons + synthesizes  ← the agentic loop, for free
  → capture final answer (--output-last-message)
  → post to Slack
```

- **It's reuse, not new infra.** `run-codex-reviewer.sh` / `run-codex-builder.sh` already invoke headless codex with ECHO MCP. The claude reviewer uses `claude -p`. Both are proven.
- **Linear analogy:** Linear *productized + credit-metered* an in-house agent over their data. At n=2 we just run `codex exec` on the founder's machine — the cheap validation version. **Do NOT build the hosted/metered version until the loop validates** (credit-gating solves a *scale* cost problem we don't have at n=2).

## Model choice — swappable, decide empirically

- **Founder's default: OpenAI / Codex.** Fine — it's already wired and proven here.
- **Keep the brain swappable** (one config/env: which exec the responder shells out to). Both Codex (`codex exec`) and Claude (`claude -p`) plug into the same pattern.
- **Decide by faithfulness, not brand.** This task's failure mode is *confabulation*; which model stays grounded on synthesis is empirical. **A/B Codex-vs-Claude synthesized whys on the same decisions** — this IS AC1's blind-grade, reused. (Datapoint, not verdict: the one faithful why so far, 2026-06-19 morning, was Claude — n=1.)
- Per global guidance, when building AI features the latest Claude (4.x: Opus 4.8 / Sonnet 4.6) is a reasonable default to include in the A/B; the founder's OpenAI preference is the other arm.

## Tradeoffs to design around
- **Latency:** a headless agent run is seconds-to-minutes (slower than a single LLM API call). Acceptable for n=2 — bot posts "🤔 looking…" then replies. If it bites, fall back to a direct LLM API call with hand-rolled retrieval+prompt (more code, faster).
- **Cost:** one agent session per query — trivial at n=2; needs gating at scale (which is why Linear meters credits). A scale problem, not now.

## AC1 — deferred and reframed FORWARD
The blind-grade can't be run retroactively (founder can't ground-truth decisions he's forgotten — that admission is itself the demand signal: *the first person who needs the captured why is the founder, three weeks later*). The valid version: **capture the why FORWARD this sprint** (the decision-atom hybrid capture), then blind-grade ECHO's reconstruction against the contemporaneously-captured ground truth.

## Next steps (concrete)
1. **Build the headless reasoning brain on top of the responder** — invoke `codex exec` (swappable) with ECHO MCP + justinian scope; synthesize; post to Slack. (Next build; likely a new backlog item.)
2. **Re-test with the same query** (*"why did we build the observability layer?"*) — compare to today's dump. This is the immediate validation of fix 2.
3. **Decision-atom capture** (fix 1) — start capturing `[decision, reason, alternatives]` forward, hybrid model.
4. **Faithfulness A/B** (Codex vs Claude) on the synthesized whys = AC1, reused.
5. Then the real n=2 test: does the CEO self-serve a why-query unprompted, >once (DoD).

## Housekeeping
- Slack responder process **stopped** (2026-06-19). **Rotate both Slack tokens** (they were pasted into the session transcript): `xoxb` via OAuth & Permissions → Reinstall; `xapp` via Basic Information → App-Level Tokens.
- Item 103 (responder MVP) sits in `pending_review` with fix b applied (head_sha `09e18f08`), reviewed `merge with founder fixups`. The brain (this doc) is what makes it actually useful.
