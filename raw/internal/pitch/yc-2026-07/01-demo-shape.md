# Demo shape + scope — DECIDED 2026-07-03

**Shape: the multi-hat day.** One continuous demo, live, on the founder's real org and real accumulated context. Mirrors narrative beats 1–3; beat 4 (fractal layering) is told, never shown, per the honesty ledger.

## The three acts

**Act 1 — the eng hat (personal context layer).** Fresh Claude Code or Codex session in a real repo. Ask the cold-start question ("what was I working on and why?" / resume a specific thread). ECHO surfaces the cross-tool trace — coding sessions, git history, the prior conversation where the decision was made. Point made: *your AI tools stop meeting you as a stranger, day one, solo.* (Shipped; cold-reader validated 5/5.)

**Act 2 — the alignment moment (decision layer).** Cofounder (or founder in the counterpart seat) asks the responder in Slack: "why is X the priority?" The responder answers from confirmed decision atoms — the actual rationale, with provenance, without pulling anyone out of flow. Point made: *the propose-confirm gate is both the privacy story and the alignment story.* (Shipped: 103/107; the 6/19 live-test failure is fixed by the decision-atom + brain architecture — rehearse this act hardest.)

**Act 3 — the intake loop (meetings → work).** A Granola-captured client meeting mentions a need → ECHO's bridge posts an intake seed in Slack, owner tagged → follow-up questions in thread → confirm card → Linear issue created with meeting provenance (title, quote, Granola link). Point made: *nothing enters the org's system of record without a human confirm — and nobody retyped anything.* (Shipped: 104/106/108/109.)

## Scope rules

- Shipped code only. No federation, no `echoctl join`, no multi-team anything on screen.
- Real accumulated context — no hand-staged fixtures. If an act can't run on real data, that's a product finding, not a staging problem.
- **Stretch (decide 7/17):** if item 112 (status backflow) is merged + live-smoked by then, add a 15-second beat to Act 2: "where is X?" answered from Linear state. If not, one spoken sentence.

## Prerequisites

1. **Item 114 merged** — the seed-retry hardening is what makes Act 3 reliable on a live run.
2. **Brain faithfulness (113)** — if graded by 7/17, use the winning default for Act 2; Act 2's failure mode (confabulated why) is the single biggest demo risk.
3. **Fallback recordings** — record each act clean once; live is the plan, the recording is the insurance.
4. **Rehearsal checklist** — dry-run #1 by 7/10, timed run #2 by 7/17. Journal every ECHO call made during rehearsal (dogfooding discipline applies; rehearsal failures are the best pre-demo bug reports).

## Risks

| Risk | Mitigation |
|---|---|
| Act 2 confabulates or retrieves the wrong why | 113 A/B; rehearse with the exact demo questions; decision atoms for the demo storyline confirmed ahead of time (that's real usage, not staging) |
| Act 3 seed doesn't fire on cue (10-min poller cadence) | trigger the worker run manually on camera — it's a real invocation, cadence is config |
| Slack/Fly transient failure mid-live | fallback recording per act |
| Demo sprawls past attention span | 3 acts ≤ 2.5 min total; one question per act, one payoff per act |
