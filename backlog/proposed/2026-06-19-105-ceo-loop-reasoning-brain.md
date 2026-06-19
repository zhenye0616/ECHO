---
id: 2026-06-19-105-ceo-loop-reasoning-brain
title: "CEO-loop reasoning brain — responder invokes a headless coding agent (swappable Codex/Claude) over ECHO MCP to SYNTHESIZE a why, instead of dumping raw retrieval"
status: proposed
priority: HIGH
estimate: 2-4d
created: 2026-06-19
blocked_by: ["2026-06-18-103-ceo-context-loop-n2"]
task_state_ref: 2026-06-19-105-ceo-loop-reasoning-brain
requested_reviewers: ["codex", "codex-ops"]
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

## Why

Item 103's Slack responder was built, reviewed, and **tested live** (2026-06-19): DM'd "why did
we build the observability layer?", it replied with **three irrelevant recent Linear-reorg
snippets** — not a why. Replaying its pipeline proved the cause: the responder's answer *is* raw
`search_memories` output (literal-substring + recency-ranked), and **there is no LLM in the loop to
synthesize.** ECHO itself uses **no LLM** (verified — deterministic substrate); the brain must live
in the consumer.

**This item adds the brain.** Per the 2026-06-19 design doc, the responder invokes a **headless
coding agent** (the exact pattern the review-queue already runs — `codex exec` headless already
calls ECHO MCP) to *retrieve + reason + synthesize* a CEO-grade why, then posts that. The agent's
agentic loop also fixes retrieval as a side effect (it can do multiple searches / `find_clusters` /
`get_atoms`, not one naive literal lookup).

This is the difference between "the bot functions" (103) and "the bot is worth putting in front of
your CEO" (this).

## Locked decisions (from `2026-06-19-ceo-loop-reasoning-layer-and-decision-atoms.md`)

- **Brain lives in the consumer, not ECHO.** The responder becomes a mini coding-agent: ECHO MCP
  (hands) + a headless LLM agent (brain).
- **Reuse the headless-agent pattern**, don't hand-roll an LLM client/orchestration. `codex exec` /
  `claude -p` already work and already reach ECHO MCP (review-queue + builder runners prove it).
- **Brain is SWAPPABLE** via config — one setting selects which agent the responder shells out to.
- **Model choice is empirical, not brand:** the failure mode is confabulation; decide Codex vs
  Claude by a **faithfulness A/B** (= AC1's blind-grade, reused). Founder's default arm = OpenAI/Codex.
- **NOT the Linear hosted/credit-metered agent** — that solves a scale-cost problem; at n=2 we run
  `codex exec` on the founder's machine. Do not build hosting/metering.
- **Scope is preserved from 103:** the agent answers ONLY from the scoped slice
  (`ECHO_CEO_CONTEXT_REPO_PATH`, justinian.ai), never the founder's whole cross-project ECHO.

## Acceptance criteria

1. **AC1 — Responder invokes a headless agent as its brain.** On a Slack question, instead of the
   current direct-`search_memories`-and-dump path (`buildSlackAnswer`), the responder invokes a
   headless coding agent (`codex exec` by default) with: ECHO MCP access, the `ECHO_CEO_CONTEXT_REPO_PATH`
   scope, and a prompt to answer the "why" question from that scoped context. It captures the agent's
   final answer (e.g. `--output-last-message`).
2. **AC2 — Synthesized answer posted to Slack.** The agent's synthesized why (business terms, not raw
   atom snippets) is posted back to the Slack thread, replacing the raw-dump path.
3. **AC3 — Swappable brain.** A single config/env (e.g. `ECHO_CEO_BRAIN=codex|claude`) selects which
   headless agent is invoked; both `codex exec` and `claude -p` wired, same contract. Adding a third
   later must not require touching call sites.
4. **AC4 — Latency UX.** Because a headless agent run takes seconds-to-minutes, the responder posts an
   immediate ack (e.g. "🤔 looking…") and then the answer (edit-in-place or follow-up message). No
   silent multi-minute gap.
5. **AC5 — The re-test (the validation of the fix).** Re-run the canonical query *"why did we build
   the observability layer?"*. The answer must be a **synthesized why grounded in justinian.ai eng
   context**, NOT the recency-dump of today's baseline. Capture the before/after for the record.
6. **AC6 — Usage logging preserved.** Keep 103's AC4 one-line usage record (`ceo-loop-events.md`).

## Out of Scope (Don't Drift)

- **The decision-atom layer** (`[decision, reason, alternatives]` capture/curation) — a separate,
  capture-side item; this brain reasons over whatever ECHO returns today. Decision-atoms *improve*
  grounding later but are NOT required for this to beat the dump.
- **Changing `search_memories` core** (relevance ranking, embeddings) — the agent's loop handles
  retrieval quality for now; core retrieval changes are a separate concern.
- **Hosted / credit-metered agent (the Linear shape)** — scale problem, not n=2. Run headless on the
  founder's machine.
- **Faithfulness A/B as a code deliverable** — the A/B is a *validation activity* (reuses AC1 blind-
  grade); this item only needs to make the brain swappable so the A/B is *possible*.
- **Broadening scope** beyond `ECHO_CEO_CONTEXT_REPO_PATH` — keep the single-slice scope from 103.
- **Rewriting shipped-reality docs** (`wiki/`, v1-spec, CLAUDE.md scope) until validated.

## files_to_modify

_Builder confirms at claim time; extends item 103's surface. **MUST NOT** touch MCP server core,
capture pipeline, `wiki/`, or `docs/BACKLOG.md`._

- `src/surfaces/ceo-slack-responder/responder.ts` — replace the `answerQuestion` direct-search path
  with a headless-agent invocation (capture final message); keep `extractQuestion`, Slack transport,
  and usage logging.
- `src/surfaces/ceo-slack-responder/brain.ts` (NEW, likely) — the swappable headless-agent invoker
  (`codex exec` / `claude -p`), prompt construction, scope injection, output capture, timeout/error
  handling.
- responder config (env) — add `ECHO_CEO_BRAIN` (+ any per-brain invocation knobs); README update.
- `tests/surfaces/ceo-slack-responder/*` — brain-invoker unit tests (mock the agent exec; assert
  scope is injected, output captured, errors handled, swappability).

## spec_refs

- `raw/internal/decisions/2026-06-19-ceo-loop-reasoning-layer-and-decision-atoms.md` (design — READ FIRST)
- `raw/internal/decisions/2026-06-18-office-hours-ceo-loop-rationale-capture.md` (the wedge + AC1)
- `backlog/pending_review/2026-06-18-103-ceo-context-loop-n2.md` (the responder this extends)
- `tools/review-queue/run-codex-reviewer.sh`, `tools/backlog/run-codex-builder.sh` (the headless `codex exec` pattern to reuse)
- `tools/review-queue/reviewers.json` (shows both `codex exec …` and `claude … -p` invocation shapes)
- Memory: `project_ceo_loop_rationale_capture`

## After Completion (Strategist Notes)

- **Do NOT write wiki pages until the re-test (AC5) + the real n=2 DoD fire.** Validation experiment.
- The immediate payoff is AC5 (the same query now answered, not dumped) — that's the proof the brain
  works; capture the before/after in the dogfooding journal.
- Then: the **faithfulness A/B** (Codex vs Claude on the same decisions) = AC1 reused → pick the brain
  that confabulates least.
- The **decision-atom layer** is the natural follow-on (better grounding); spec it separately if the
  brain alone still produces shaky whys on under-grounded decisions.
- Sequencing: blocked on 103 merging (this extends the responder surface 103 builds).
