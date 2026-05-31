# Key — surface-positioning-ephemeral (EPHEMERAL-SOURCE probe)

**Target:** the ①-vs-② resolution reached in the 2026-05-31 office-hours conversation.
**Why this rung:** the truth lives **only in this session's chat** (captured as `claude_code` JSONL). It is in **NO committed git artifact** — the office-hours doc + journal + memory updates are still in the working tree, uncommitted; the older 05-28/05-29 ① framing IS committed but does NOT contain today's specific admissions. So a pass here means retrieval reconstructed from **ephemeral cross-tool context**, not from a committed file ECHO indexed.

## VALIDITY CONDITIONS (must hold at run time)
1. **Do NOT commit** the office-hours doc / journal before running — committing moves the truth into git and voids the ephemeral isolation.
2. ECHO must have **captured + indexed** today's claude_code session up to the relevant turns (capture lag risk — if the latest turns aren't indexed, an honest "INSUFFICIENT FROM ECHO" is the *correct* result, not a fail).

## Ground-truth (from the 2026-05-31 conversation)

| # | Fact | Truth |
|---|---|---|
| 1 | Decision | **① (personal context layer) = the company / public positioning. ② (command/operator surface) = the founder's personal conviction tool, audience of one** |
| 2 | Candid reason | He admitted he "picked ① because it's the safer thing to say"; ② exists because *he* needs it (out of execution loop without cognitive debt), "not because users demand it" — the "external manager-surface demand trigger" for ② was a fiction |
| 3 | Reasoning pattern | When cornered on **validation**, he reaches for **expansion** / retreats to the **substrate** (demand→thesis; validate-②→retrieval; prove-substrate→"search the web on ecosystem expansion") |
| 4 | Next step | The **Cold Reader Test** — a foreign (Codex) agent, ECHO-only, must reconstruct a real decision; A/B ECHO-on/off; founder out of the scoring loop; gates axiom #7 |

## Scoring focus
- **Did it surface the 2026-05-31 conversation at all** (vs only the older committed ① decision, vs honest INSUFFICIENT)?
- Distinguish three outcomes: (a) **ephemeral hit** — recovers today's specific facts (esp. Fact 2's "safer thing to say" + Fact 3's pattern, which exist ONLY in today's chat); (b) **honest miss** — "INSUFFICIENT FROM ECHO" (safe; capture-lag or genuine gap); (c) **confabulation** — confident wrong answer or answering from the older 05-28 framing while claiming it's today's (the fatal mode).
- Fact 2 and Fact 3 are the discriminators — they cannot be sourced from any committed artifact.

## Results log
| Date | Ephemeral hit? | A (on) | B (off) | A−B | Failure mode | Notes |
|---|---|---|---|---|---|---|
| 2026-05-31 | ✅ YES | 4/4 | 0/4 | 4 | none | Codex gpt-5.5, 10 ECHO calls. Recovered TODAY's session (`88d02d88`) incl. the two ephemeral-only facts: "safer thing to say" admission (atom `08cf5525`) + retreat-to-substrate pattern. Doc still uncommitted at run time ✓. **CAVEAT:** fresh-capture + high-salience + self-referential (read its own test design); n=1 — a low-salience passing remark may not survive |
