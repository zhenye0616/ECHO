---
id: 2026-07-03-113-brain-faithfulness-ab
title: "Brain faithfulness A/B — blind-grade Codex vs Claude synthesized 'whys' on the same decision set; pick the responder default empirically"
status: proposed
priority: MED
estimate: 1-2d harness + founder grading session
created: 2026-07-03
blocked_by: []
spec_refs:
  - raw/internal/decisions/2026-06-19-ceo-loop-reasoning-layer-and-decision-atoms.md  # the design this executes: swappable brain, decide by faithfulness not brand, A/B = AC1's blind-grade reused
  - src/surfaces/ceo-slack-responder/brain.ts        # the swappable headless-agent invocation under test
  - src/surfaces/ceo-slack-responder/decision-store.ts  # confirmed decision atoms = the question source
  - eval/cold-reader/run.sh                          # existing arm-runner pattern to reuse
files_to_modify:
  # PROVISIONAL
  - eval/brain-faithfulness/   # NEW — question set, arm runner, grading sheet, results
---

## Problem

The 6/19 design committed to a swappable brain and an empirical default: "decide by faithfulness, not brand — A/B Codex-vs-Claude synthesized whys on the same decisions." Current evidence is n=1 (the one faithful why, 2026-06-19, was Claude). The responder's failure mode is confabulation; the default brain is currently chosen by wiring convenience, not measurement. Before v0.1 backflow puts synthesized answers in front of the team, measure.

## Design

Reuse the cold-reader arm pattern: a fixed question set drawn from real confirmed decision atoms (and real "why did we…" questions from the journal), run through both brains against identical ECHO scope, outputs blind-shuffled, founder grades each answer faithful / partial / confabulated against the known ground truth.

## Acceptance Criteria

- **AC1 — question set:** ≥10 "why"/status questions with founder-verifiable ground truth, drawn from confirmed decision atoms and real usage; committed under `eval/brain-faithfulness/`.
- **AC2 — arm runner:** one script runs both arms (codex exec, claude -p) with identical MCP scope and prompt template; outputs stored with arm identity separated from the grading sheet (blind).
- **AC3 — grading:** founder grades blind; rubric is faithful / partial / confabulated; results committed.
- **AC4 — decision recorded:** the default-brain choice (or "no significant difference, keep current") lands in `raw/internal/decisions/` and the responder's brain config default is set accordingly — one config change, no invocation-pattern rewrite.

## Out of Scope (Don't Drift)

- No hosted/metered brain, no credit-gating (explicitly deferred in the 6/19 design until the loop validates at scale).
- No prompt-engineering iteration loop inside this item — one shared template, measured once; tuning is a follow-up if both arms fail.
- No new models beyond the two already wired.

## After Completion (Strategist Notes)

- Fold the result into `wiki/architecture/` (brain-in-the-consumer page, if/when created) as the empirical basis for the default.
