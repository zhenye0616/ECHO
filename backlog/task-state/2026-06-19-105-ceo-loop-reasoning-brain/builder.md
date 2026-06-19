---
task_id: 2026-06-19-105-ceo-loop-reasoning-brain
role: builder
binding: codex
claim_branch: agent/ceo-loop-reasoning-brain
last_updated: 2026-06-19T23:02:22Z
---

## current_thesis
Claimed 105 as codex builder. Replace the CEO Slack responder's raw retrieval dump with a swappable headless-agent brain that is scoped to `ECHO_CEO_CONTEXT_REPO_PATH`, posts a threaded ack before synthesis, and always resolves the thread with either a synthesized answer or bounded failure.

## locked_decisions
- AC1: `buildSlackAnswer`/responder path invokes `runBrain(question, opts)` via a concrete `codex`/`claude` contract; brain cwd and prompt both pin the scoped repo.
- AC2: Slack posts the synthesized business-language answer, not raw atom snippets.
- AC3: `ECHO_CEO_BRAIN=codex|claude` defaults to `codex`; both arms return the same `BrainResult`; adding a brain is registry-only in `brain.ts`.
- AC4: responder posts immediate threaded "looking" ack, then a second threaded answer or bounded failure; hard timeout defaults to 180000 ms and kills the whole process group.
- AC5: committed `raw/internal/ceo-loop-retest-105.md` captures before/after for "why did we build the observability layer?" and checks synthesis over scoped justinian.ai context.
- AC6: `raw/internal/ceo-loop-events.md` lines include timestamp, selected brain, outcome, duration, Slack thread identity, and bounded failure reason.
- Verify exact installed `codex`/`claude` invocation flags at claim time before pinning argv; codex JSON capture depends on `--json`.

## open_questions
- None blocking at claim. Escalate if exact CLI flags, tests, or scoped retest cannot be completed within the files listed in the spec.

## dont_touch
- Do not implement decision atoms, search ranking/embeddings changes, hosted/credit-metered agent infrastructure, or faithfulness A/B grading as code.
- Do not broaden scope beyond `ECHO_CEO_CONTEXT_REPO_PATH`.
- Do not rewrite wiki, docs, MCP server core, capture pipeline, or backlog item bodies.
- Do not add dependencies not named by the spec or modify files outside `files_to_modify` except the required run log and `raw/internal/ceo-loop-retest-105.md`/events artifact explicitly listed in the ACs.

## canonical_anchors

- spec: backlog/claimed/2026-06-19-105-ceo-loop-reasoning-brain.md
