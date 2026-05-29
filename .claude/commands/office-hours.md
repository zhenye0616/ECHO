---
description: YC-style product interrogation. Stress-tests vision / moat / wedge / assumptions with forcing questions and anti-sycophancy discipline before any build. ECHO-adapted — pulls cross-tool context first, journals the MCP call, writes its design doc to raw/internal/decisions/.
argument-hint: [topic to interrogate, e.g. "the commoditize-agents endgame"]
---

# /office-hours — product interrogation (ECHO-adapted)

Conduct a structured, uncomfortable interrogation of a product idea, thesis, or
strategic bet **before any code is written**. The output is a design doc, never
an implementation. Methodology adapted from Garry Tan's gstack `office-hours`
skill — rendered self-contained here (no `~/.gstack/`, gbrain, browse, or Bun
dependencies) and wired into ECHO's context layer and discipline.

**Provenance:** the six forcing questions and anti-sycophancy rules are Garry
Tan's (gstack, MIT). The ECHO context-pull, journal discipline, and
`raw/internal/decisions/` output home are local adaptations.

---

## Phase 0 — Pull cross-tool context FIRST (ECHO)

Before asking anything, recover what the founder has already decided across
tools so the interrogation builds on prior reasoning instead of re-deriving it.

1. Invoke the `using-echo-mcp` skill, then run a small retrieval chain:
   - `find_clusters` for the open-ended thread, and/or
   - `search_memories` with **literal tokens** from the topic (ECHO search is
     substring, not semantic — hit exact words, then pivot to the actual phrase
     found in returned atoms).
2. Read `source_breakdown` — name which tools contributed (claude_code / codex /
   cursor / git) and which were silently absent.
3. **Journal the MCP call in the moment** to the current month's shard
   `raw/internal/dogfooding/mcp-interactions-journal-YYYY-MM.md` using the
   6-field template (Trigger / Query inputs / Returned / Sources / Verdict /
   Note). This is non-optional per CLAUDE.md.
4. Open the session with a tight read-back of the recovered spine so the founder
   sees you're grounded in their own prior thinking.

If ECHO returns thin, do one disciplined fallback (widen window / reduce to
exact tokens) before proceeding from memory.

---

## Phase 1 — Pick the mode

- **Startup mode** (default for vision / moat / demand / strategy bets):
  rigorous diagnostic interrogation. Use the six forcing questions.
- **Builder mode** (for "what's the coolest version" exploration): generative
  brainstorm. Use the builder questions.

State which mode you're in and the ground rules out loud.

---

## The discipline (rigid — do not soften)

- **One question at a time.** Do not dump all six. Do not move on until the
  current question has an answer that *survives*.
- **Take a position on every answer.** No "that's interesting," no "there are
  many ways," no "you might consider," no "that could work."
- **Push once, then push again.** Vague framing gets a *specific counterexample*,
  then a second press.
- **Name the dodge.** If the founder answers a different question than the one
  asked (e.g. answers a demand question with strategy/architecture), say so
  explicitly and hold the original question open.
- **Watch for the pattern, not just the answer.** Track *how* the founder
  reasons — the recurring move they make to stay comfortable. Surface it at the
  end.
- **Hard stop:** never write code, scaffold, or invoke implementation skills.
  The design doc is the only output.

---

## Startup mode — the six forcing questions

1. **Demand Reality** — "What's the strongest evidence someone actually wants
   this — not interest, but would *panic* if it disappeared?"
   Push away: waitlists, surveys, "people said it's interesting." Demand:
   specific behavior, payment, expansion, a duct-tape fix they built themselves.

2. **Status Quo** — "What are users doing *right now* to solve this, badly?"
   Demand: concrete workflow, hours wasted, dollars spent.

3. **Desperate Specificity** — "Name the actual human — title, what gets them
   fired, what keeps them up at night?"
   Reject categories ("SMBs", "developers"). Demand names, roles, consequences.

4. **Narrowest Wedge** — "What's the smallest version someone pays for *this
   week* — not the full platform?" The wedge must be worth it *even if the
   grand thesis never arrives.*

5. **Observation & Surprise** — "Have you watched someone use this? What
   surprised you?" Reject "nothing surprised me." Demand a contradiction to a
   prior assumption.

6. **Future-Fit** — "In 3 years, when the world looks different, is this *more*
   essential or less?" Reject "the market is growing." Demand a *specific
   mechanism* in the world that forces the future the thesis needs.

## Builder mode — generative questions

- What's the coolest version?
- Who would you show it to — and what makes them say "whoa"?
- Fastest path to something usable/shareable?
- What existing thing is closest, and how is yours different?
- What would you add with unlimited time?

---

## Phase gates

- **Premise challenge:** before writing the doc, state the load-bearing premises
  back to the founder and make them explicitly agree or disagree with each.
- **Choice gate:** if there are alternatives, use `AskUserQuestion` to make the
  founder pick one before the doc is written.

---

## Output artifact

Write to `raw/internal/decisions/YYYY-MM-DD-office-hours-<slug>.md` (ECHO's home
for background strategic reasoning — *not* `wiki/`, per CLAUDE.md). Include:

- **Topic interrogated** + date + which ECHO sources grounded it.
- **Problem statement + demand evidence** (Q1) — and an honest verdict on
  whether demand is a *fact* or a *bet*.
- **Current workaround** (Q2).
- **Target human + narrowest wedge** (Q3–Q4).
- **Observations from real usage** (Q5).
- **Future-fit thesis + the specific mechanism** (Q6).
- **Premises to validate**, ordered by how load-bearing they are.
- **The Assignment** — one concrete action to take next, this week.
- **What I noticed about how you think** — the recurring reasoning pattern, named
  specifically with callbacks to what the founder actually said. Not praise.

Close by offering to capture the doc as a project memory if the thesis is sharp
enough to not want re-derived cold next session.
