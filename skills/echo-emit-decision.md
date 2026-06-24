---
description: Draft a candidate shared team decision from a code-session decision-grade moment and submit it to ECHO's propose-confirm gate.
---

# ECHO Emit Decision

Use this skill only when the current coding session reaches a decision-grade moment the other technical cofounder should know: a chosen architecture, a rejected alternative, a launch/blocking tradeoff, or an end-of-task summary with a durable decision.

## Contract

1. Draft only decision-grade text. Do not include raw diffs, logs, transcripts, secrets, or half-formed scratch.
2. Produce:
   - `subject`: short normalized topic, such as `auth storage` or `pricing launch`.
   - `decision`: one sentence stating what was decided.
   - `rationale`: optional one-sentence why/tradeoff.
   - `source_app`: `claude-code` or `codex`.
3. Call ECHO MCP `propose_decision` with that payload.
4. If the tool returns an error, surface it to the operator. Do not retry silently and do not write directly to shared storage.
5. Nothing is shared until a human confirms the Slack card.

## When To Skip

- The content is raw or sensitive machine-scoped context.
- The decision is speculative or not yet accepted by the human.
- The moment belongs in a private run log, not shared team truth.
- ECHO MCP is unavailable or `propose_decision` returns an operator-visible configuration error.
