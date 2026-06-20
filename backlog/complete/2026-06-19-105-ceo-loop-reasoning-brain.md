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
ready_content_sha: 9c01e2d29a57248c2f295fd18cbac1bd902eec807222dd428c462d49f7878137
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-06-19T23:01:42Z"
branch: "agent/ceo-loop-reasoning-brain"
head_sha: "8938b48166ebdef4c2f210c34148641364f0301e"
pr_url: ""
agent_notes: |
  Implemented the swappable headless-agent brain for the CEO Slack responder on `agent/ceo-loop-reasoning-brain`: `codex`/`claude` registry, codex JSONL capture, startup preflight, process-group timeout kill, threaded ack + answer/failure flow, extended brain usage logging, responder README, and focused tests. AC5 retest is committed at `raw/internal/ceo-loop-retest-105.md`; targeted tests, typecheck, lint, and `git diff --check` pass.
review_notes: |
  Merged on 2026-06-19 via founder reconciliation (sidecar verdict: "merge as-is").

  Conflicts resolved:
  - None — clean --no-ff merge (ort strategy). brain.ts / ceo-slack-brain.test.ts / README.md
    are new files; responder.ts / responder.test.ts / index.ts are rewrites on a branch rooted at
    103's already-merged commit. git merge-tree predicted zero conflicts; confirmed at merge.

  C3.5 cross-vendor consult: none invoked (no conflicts).

  Fixups applied:
  - None — merge as-is, no pre-merge gates.

  Fixups deferred to follow-up items:
  - None.

  Verify: 105 targeted tests 20/20 (brain 9/0 + responder 11/0), typecheck, lint,
  check-coupled-invariants, and sync-skills --check all clean post-merge. Independent Claude
  code-reviewer (codex was the builder) confirmed all 6 ACs Met with file:line evidence and every
  load-bearing review-history item: --json in codex argv (+ test assertion), process-group
  termination (detached + kill -pid SIGTERM->SIGKILL) with a descendant-survival regression test,
  startup preflight, prompt+cwd scope guard, bounded failure messaging, and one-line AC6 logging.
  AC5 headline: the canonical query now returns a synthesized why grounded in justinian.ai eng
  context (JUS-17 + funnel/drop_reason), NOT the 103 recency-dump — the fix is validated end-to-end.
  The 2 pre-existing env/flake product failures (shell-reachable daemon-install, recent-calls
  timeout) are untouched by this surface; founder already adjudicated them at the 103 merge.

  Follow-up items (non-blocking):
  - responder.ts:207-216 — a successful brain answer is downgraded to a failure message if only the
    AC6 usage-log append throws; prefer logging the append error but still posting the valid answer.
  - brain.ts:219-234 — optional recursion-depth guard on assistantText JSON parsing (harmless for
    trusted shallow codex JSONL; cheap defense).
  - 105 unblocks the next leg: live re-test with the real CEO + the Codex-vs-Claude faithfulness
    A/B (AC1 reused). Wiki promotion of 105 + 103 waits until the n=2 DoD fires (validation experiment).
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

1. **AC1 — Responder invokes a headless agent as its brain, via a concrete invocation contract.** On a
   Slack question, instead of the current direct-`search_memories`-and-dump path (`buildSlackAnswer`),
   the responder invokes a headless coding agent through the contract specified in **"Brain invocation
   contract"** below (exact argv per brain, cwd, env, stdin/prompt delivery, final-answer capture,
   timeout, exit-code handling). The brain has ECHO MCP access and is scoped to `ECHO_CEO_CONTEXT_REPO_PATH`.
2. **AC2 — Synthesized answer posted to Slack.** The agent's synthesized why (business terms, not raw
   atom snippets) is posted back to the Slack thread, replacing the raw-dump path.
3. **AC3 — Swappable brain.** A single env (`ECHO_CEO_BRAIN=codex|claude`, default `codex`) selects
   which headless agent is invoked; both `codex` and `claude` wired to the **same `BrainResult`
   contract** (see below). Adding a third brain must only require a new entry in the brain registry
   (`brain.ts`), not changes to `responder.ts` call sites.
4. **AC4 — Latency UX + bounded failure (never a stuck "looking…").** The responder posts an immediate
   ack as a **threaded reply** (e.g. "🤔 looking…"), runs the brain, then posts the answer as a **second
   threaded follow-up message** (NOT edit-in-place — chosen for transport simplicity and so the ack
   survives if the answer post fails). The brain run is wrapped in a **configurable hard timeout**
   (`ECHO_CEO_BRAIN_TIMEOUT_MS`, default 180000). On timeout the responder MUST terminate the **entire
   process tree**, not just the direct child: a headless `codex`/`claude` agent spawns descendants (the
   model client, MCP subprocesses) that outlive a bare `child.kill()`. The concrete mechanism: spawn the
   brain child in its **own process group** (`detached: true` / `setsid`) and on timeout send the kill
   signal to the **process group** (`process.kill(-pid, 'SIGTERM')`, escalating to `SIGKILL`). On
   timeout, non-zero exit, empty capture, or any thrown error, the responder posts a **bounded,
   user-visible failure message** (e.g. "⚠️ couldn't synthesize an answer — <one-line reason>") to the
   same thread. No code path leaves the thread sitting at "looking…". `brain.test.ts` MUST include a
   **descendant-survival regression test**: a brain stub that forks a child which would outlive its
   parent, asserting that after a timeout-triggered kill no descendant remains alive (process-group
   kill, not direct-child-only).
5. **AC5 — The re-test (the validation of the fix), with a checkable rubric + committed artifact.**
   Re-run the canonical query *"why did we build the observability layer?"*. Capture the before
   (103's recency-dump) and after (this brain's answer) into the committed artifact
   `raw/internal/ceo-loop-retest-105.md`. The "after" answer **MUST** (a) state a *reason/purpose*
   (a "why", not a "what"), and (b) cite ≥1 concrete justinian.ai eng-context fact (a ticket, a seam,
   a component, a decision) traceable to the scoped repo; and **MUST NOT** be the verbatim recency-dump
   of unrelated recent atoms that 103 produced. (Faithfulness grading vs. founder intent stays deferred
   per the parent item — AC5 checks *synthesis happened over scoped context*, not authorial fidelity.)
6. **AC6 — Usage + failure logging.** Extend 103's AC4 one-line usage record (`raw/internal/ceo-loop-events.md`)
   so each brain run logs: timestamp, selected brain, outcome (`ok|timeout|error`), wall-clock duration,
   Slack thread identity, and — on failure — a bounded (≤200-char) stderr/reason reference. One line per
   run; no new observability subsystem.

## Brain invocation contract

The swappable invoker (`brain.ts`) exposes one function — `runBrain(question, opts): Promise<BrainResult>` —
and a small registry keyed by `ECHO_CEO_BRAIN`. Each brain entry declares:

- **argv template:** `codex` → `codex exec -C <scopeRepo> --sandbox read-only --json -` (prompt on
  **stdin**), final answer parsed from the **JSON event stream's** last assistant message (the exact
  pattern `_run_reviewer.sh` uses). The `--json` flag is **mandatory and load-bearing**: the capture
  parser consumes the JSON event stream, so omitting it ships plain stdout that the parser cannot read
  and turns successful runs into empty-capture errors. `claude` → `claude -p` with the prompt on stdin
  and the final message captured from stdout (plain-text capture; no JSON flag needed). The argv and the
  capture mode MUST stay internally consistent per brain. Builder confirms exact flags against the
  installed CLI versions at claim time and pins them in `brain.ts` (cite the version checked); the
  `brain.test.ts` for the `codex` brain MUST assert the resolved argv includes `--json` (the flag the
  parser depends on).
- **cwd:** the resolved `ECHO_CEO_CONTEXT_REPO_PATH` (the scope repo), so the agent's ECHO MCP calls and
  any file reads land in the scoped slice.
- **env:** inherit the responder's env (so the ECHO MCP daemon URL/config is visible); invoke
  **non-interactively** (no TTY prompt) and never require approval. If a brand-new brain needs an
  absolute binary path because PATH is stripped, that path is a per-brain config knob — but the
  responder is a **manually-started long-running process, NOT launchd-managed**, so PATH bootstrapping
  is best-effort, not a hard requirement.
- **scope enforcement (mechanism, not just claim):** scoping is enforced by (a) cwd = scope repo and
  (b) the prompt instructing the agent to call ECHO MCP with `repo_path` pinned to the scope repo. This
  is a *prompt+cwd guard*, not a kernel sandbox; the spec claims exactly that much. The unit test asserts
  the scope repo is injected into both argv (`-C`) and the prompt.
- **startup preflight:** on responder boot, verify the selected brain's executable resolves and is
  invocable (a fast `--version`-style probe); if it is missing or errors, **fail loudly at startup**
  (clear log line + non-zero exit) rather than failing silently on the first Slack question.
- **`BrainResult`:** `{ ok: boolean, answer?: string, outcome: "ok"|"timeout"|"error", durationMs, reason? }`
  — the single shape both brains return and `responder.ts` consumes.

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

_Builder confirms exact paths at claim time against 103's merged location. Item 103 will have moved
from `backlog/pending_review/` to `backlog/complete/` by the time this is claimed (this item is
`blocked_by` 103); the source files below live under `src/`/`tests/` regardless of the backlog item's
folder._

- `src/surfaces/ceo-slack-responder/responder.ts` — replace the `answerQuestion` direct-search path
  with a headless-agent invocation (capture final message); keep `extractQuestion`, Slack transport,
  and usage logging.
- `src/surfaces/ceo-slack-responder/brain.ts` (NEW) — the swappable headless-agent invoker
  (`runBrain` + registry per the **Brain invocation contract**): prompt construction, scope injection,
  output capture, hard timeout + child-tree termination, error handling, startup preflight.
- `src/surfaces/ceo-slack-responder/config.ts` (or the responder's existing env-parsing module —
  builder confirms the exact filename) — add `ECHO_CEO_BRAIN` (default `codex`) and
  `ECHO_CEO_BRAIN_TIMEOUT_MS` (default 180000).
- `src/surfaces/ceo-slack-responder/README.md` — document `ECHO_CEO_BRAIN`, the timeout, and the
  startup preflight (builder confirms the README path; create if absent).
- `tests/surfaces/ceo-slack-responder/brain.test.ts` (NEW) — brain-invoker unit tests (mock the agent
  exec): assert scope repo injected into argv (`-C`) **and** prompt, the `codex` argv includes `--json`
  (the flag the capture parser depends on), final answer captured, `outcome` values for ok/timeout/error,
  timeout terminates the **whole process group** (descendant-survival regression test — a forked
  descendant must not outlive a timeout kill), swappability across `codex`/`claude`.
- `tests/surfaces/ceo-slack-responder/responder.test.ts` (extend existing if present, else NEW) —
  assert the ack is posted **before** the brain resolves and a bounded failure message is posted on
  brain failure (no stuck "looking…").

## spec_refs

- `raw/internal/decisions/2026-06-19-ceo-loop-reasoning-layer-and-decision-atoms.md` (design — READ FIRST)
- `raw/internal/decisions/2026-06-18-office-hours-ceo-loop-rationale-capture.md` (the wedge + AC1)
- The merged item 103 spec at `backlog/complete/2026-06-18-103-ceo-context-loop-n2.md` (the responder
  this extends; read for AC4 usage-log format and the existing env/transport surface) — read-only
  reference, not a write target.
- `tools/review-queue/_run_reviewer.sh` (the headless `codex exec --json` invocation + final-assistant-
  message parsing pattern to reuse) and `tools/backlog/run-codex-builder.sh`.
- `tools/review-queue/reviewer-bindings.json` / `reviewers.json` (the `codex exec …` and `claude …`
  invocation shapes).
- Memory: `project_ceo_loop_rationale_capture` (read-only context — not a code input).

## After Completion (Strategist Notes)

- **Do NOT write wiki pages until the re-test (AC5) + the real n=2 DoD fire.** Validation experiment.
- The immediate payoff is AC5 (the same query now answered, not dumped) — that's the proof the brain
  works; capture the before/after in the dogfooding journal.
- Then: the **faithfulness A/B** (Codex vs Claude on the same decisions) = AC1 reused → pick the brain
  that confabulates least.
- The **decision-atom layer** is the natural follow-on (better grounding); spec it separately if the
  brain alone still produces shaky whys on under-grounded decisions.
- Sequencing: blocked on 103 merging (this extends the responder surface 103 builds).
