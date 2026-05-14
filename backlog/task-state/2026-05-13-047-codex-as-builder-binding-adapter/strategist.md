---
task_id: 2026-05-13-047-codex-as-builder-binding-adapter
role: strategist
writer: claude-strategist
last_updated: 2026-05-14T05:50:00Z
---

## current_thesis

047 ships the codex-builder binding adapter (`tools/backlog/run-codex-builder.sh`) — a thin shell wrapper that lets `codex exec` execute `skills/process-backlog.md`'s vendor-neutral protocol. This is the FIRST post-046 spec; vendor-agnostic ECHO pivot begins here. The cycle is ALSO the first qualifying empirical measurement of 046's three baseline PASS conditions (AC5 is observational, not a hard gate).

## locked_decisions

- Scope path: (B) adapter + opportunistic 046 dogfooding measurement; ~1-1.5d.
- Bindings for this cycle: strategist=claude (this session); reviewers=`[codex, cursor]`; builder of 047 is independent of the new adapter (chicken-and-egg — codex-builder doesn't exist yet, so 047's builder is whichever existing binding claims it).
- "Claude reviewer" = Cursor's Claude via existing `skills/review-queue-cursor.md`. NOT a new headless Claude Code reviewer. (Codex strategist R0 consult, 22:30 PDT.)
- Builder lifecycle: one-shot, long-running. NOT a launchd tick. Manual invocation from a terminal.
- Sandbox: `danger-full-access` required (workspace-write blocks `.git/FETCH_HEAD`, `~/.echo/agent-id`, sibling worktrees).
- Protocol stays in `skills/process-backlog.md`; AC2 appends one binding-specific section. NO protocol changes.
- Lockfile path: `.git/echo-builder-in-progress` (local-only; cross-machine coordination is V2+).
- AC4 integration test mocks `codex exec` via shell stub; does NOT invoke real codex (would require credentials + non-deterministic LLM output).
- AC5 PASS verdict: PASS (all 3 hard conditions met) / PARTIAL / FAIL. FAIL → file `048-046-rollback-or-redesign`; restore friction-first prioritization gate.

## open_questions

- (a) AC3 builder.md writes — should they go through `push-round-state.sh` (which is currently round-state.md-specific) or via direct commit (since builder is single-owner per 046 writer-responsibilities, no CAS needed)? **Surfaced as R5 in spec; reviewers will disposition.** Likely answer: direct commit, drop CAS.
- (b) AC5 measurement timing — when does the strategist `/clear` to test cold-start? Spec suggests "between R1 and R3 ideally" but it's the strategist's call. Founder can direct or skip.
- (c) AC4 test fixture for ECHO_AGENT_ID: should the test pre-seed `~/.echo/agent-id` or assert the wrapper creates it on first run? Both cases needed; test covers both.

## dont_touch

- Existing `skills/process-backlog.md` protocol body. Only the new "Binding-specific notes — codex" section is added.
- Existing `tools/review-queue/_run_reviewer.sh` and its callers. 047 borrows the SHAPE of this wrapper but does not modify it.
- The reviewer protocol — `skills/review-queue-codex.md`, `skills/review-queue-cursor.md`, AC3 fresh-eyes lint in `tools/review-queue/validate.py`. Out of scope per 046.
- `claimed_by` legacy frontmatter field. Coexists with new pointer-based approach; no rename.
- Other ECHO MCP tools (`get_role_state`, `list_task_states`, etc.). 047 USES them (codex builder reads/writes `builder.md`) but does not modify them.
- `backlog/task-state/2026-05-13-046-context-fatigue-via-role-typed-state/builder.md` — no retroactive backfill. The schema is forward-only.

## canonical_anchors

- spec: backlog/ready/2026-05-13-047-codex-as-builder-binding-adapter.md
- reviews: backlog/reviews/2026-05-13-047-codex-as-builder-binding-adapter/
- baseline (for AC5 measurement): raw/internal/dogfooding/role-typed-state-baseline.md
- parent (046): backlog/complete/2026-05-13-046-context-fatigue-via-role-typed-state.md
- decision (skills-as-protocol): raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md
