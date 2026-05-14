---
id: 2026-05-13-047-codex-as-builder-binding-adapter
title: Codex-as-builder binding adapter — the missing binding that makes role-slot-agnostic orchestration empirically true (first post-046 spec; vendor-agnostic pivot begins)
status: ready
priority: HIGH
estimate: 1-1.5d
created: 2026-05-13
task_state_ref: 2026-05-13-047-codex-as-builder-binding-adapter
requested_reviewers: ["codex", "cursor"]
files_to_modify:
  # AC1 — new wrapper script
  - tools/backlog/run-codex-builder.sh
  # AC2 + AC6 — binding-specific section appended to vendor-neutral protocol skill
  - skills/process-backlog.md
  - .claude/commands/process-backlog.md  # synced from skills/ via tools/sync-skills.sh
  # AC4 — integration tests (new directory + fixtures)
  - tests/backlog/run-codex-builder.test.ts
  - tests/backlog/fixtures/mock-codex.sh
  # AC3 — recursive dogfooding pointer the codex builder writes during claim
  # (path follows 046 AC1 task-state schema; created on atomic claim, updated
  # on milestones, finalized on move-to-pending_review)
  - backlog/task-state/2026-05-13-047-codex-as-builder-binding-adapter/builder.md
  # AC5 — opportunistic 046 dogfooding measurement report (written at merge time)
  - raw/internal/dogfooding/role-typed-state-comparison-047.md
  - raw/internal/dogfooding/role-typed-state-comparison-047.html  # HTML twin per CLAUDE.md convention
spec_refs:
  - backlog/complete/2026-05-13-046-context-fatigue-via-role-typed-state.md  # Direct parent. 046 shipped the role-typed task-state primitive, the AC3 fresh-eyes lint, and the role-slot-agnostic vocabulary. 047 fills the missing codex-builder binding so the role-slot vocabulary is true in operation, not just in prose. AC1 builder-state.md format + writer responsibilities are inherited from 046.
  - raw/internal/dogfooding/role-typed-state-baseline.md  # The immutable empirical baseline written 2026-05-13 22:45 PDT against which AC5's opportunistic dogfooding measurement is compared. Three falsifiable PASS conditions defined in §"Falsifiable PASS criteria for the next qualifying cycle" — 047 is that next qualifying cycle.
  - raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md  # The decision that skills/ is the cross-tool collaboration protocol. 047 operationalizes the "bindings are interchangeable" claim by adding the second builder binding (after Claude Code + Cursor's Claude).
  - tools/review-queue/_run_reviewer.sh  # AC1 shape reference. 047's `run-codex-builder.sh` matches the same repo-root validation + PATH augmentation + log rotation + codex exec invocation shape as the headless reviewer wrapper. Reuse the patterns; do not invent new ones.
  - skills/process-backlog.md  # AC2 touch. Vendor-neutral protocol stays here. AC2 appends ONE binding-specific section for codex; no protocol changes.
  - skills/role-typed-task-state.md  # AC3 reference. Builder pointer schema + writer-responsibilities table for `builder.md` are inherited verbatim from 046.
  - skills/review-queue-cursor.md  # AC7 reference. Existing skill that defines the Cursor's-Claude reviewer binding. 047 does NOT modify it — only documents how the founder triggers cursor reviewer ticks during the 047 cycle.
---

## Why this spec exists

**The vendor-agnostic pivot's first concrete step.** 046 shipped the role-typed task-state primitive and ECHO's claim that "roles are slots, clients are bindings" — but every actual builder run in 046 (and before) was either Claude Code or Cursor's Claude. The "codex" entry in the role vocabulary was reviewer-only. Without a codex-builder binding, the slot/binding decomposition was prose; with it, it's operationally verified.

**This is also the first qualifying cycle to test 046's baseline.** The `raw/internal/dogfooding/role-typed-state-baseline.md` file written 2026-05-13 22:45 PDT defines three falsifiable PASS conditions:

1. **Strategist cold-start** ≤ 1 MCP call + ≤ 200 lines read + < 60s to productive output.
2. **Reviewer-tick INVARIANT** within 10% of baseline floor (no token drop — drops mean AC3 fresh-eyes lint regressed).
3. **Founder in-queue activations = 0.**

047's cycle is the natural first measurement: strategist binding unchanged (claude), reviewer roster changes from `[codex, codex-ops]` to `[codex, cursor]` (so the "claude" reviewer side is exercised), builder is independent of the measurement. AC5 opportunistically captures the data without making it a hard merge-gate (an observational entry, not a structural AC).

**Why a thin wrapper rather than a launchd job.** Codex strategist's R0 informal consult (2026-05-13 22:30 PDT) flagged that the builder lifecycle is fundamentally different from reviewer ticks: builder is **one-shot, long-running** (claim → worktree → tests → push → pending_review, often 20+ minutes), while reviewers are **periodic, bounded** (one review per tick, exit immediately). Building the codex-builder as a 10-min launchd tick would either spawn multiple builders racing for the same item (no good) or fire long after the founder wants the work to start (no good). The right shape is a manually-triggered shell wrapper that runs to completion; founder invokes it when they want codex to claim the next ready item.

## Acceptance Criteria

**AC1 — `tools/backlog/run-codex-builder.sh` wrapper.**

- Matches the shape of `tools/review-queue/_run_reviewer.sh` for shared concerns:
  - **Repo-root resolution:** via `${ECHO_BACKLOG_REPO_ROOT:-$HOME/Desktop/Project_echo}`, with the same git-rev-parse validation pattern as the reviewer wrapper.
  - **PATH augmentation:** matches the reviewer wrapper's PATH (homebrew, /usr/local/bin, asdf/nodenv shims, ~/.cargo/bin, etc.) so `codex` and `git` resolve from a minimal launchd-style env.
  - **Log file:** `~/Library/Logs/echo-backlog-codex-builder.log` with rotation at 10MB → `.1` sidecar, drop older. Same `stat -f%z` / `stat -c%s` portability fallback as the reviewer wrapper.
- Builder-specific additions:
  - **`ECHO_AGENT_ID`:** a stable per-machine identifier read from `~/.echo/agent-id` (or generated + persisted there on first run). This is the writer identity for `task-state/<id>/builder.md` per 046 AC1 writer-responsibilities. Must be unique across machines (UUID4 on first init).
  - **Lockfile (atomic acquisition).** Resolved per R1 codex F3 + R2 codex F1: use a **lock DIRECTORY** rather than a file, because `mkdir` is atomic on macOS HFS+/APFS (and Linux ext4) — `[ -e ]` + `echo >` is not, and would let two near-simultaneous wrapper invocations both enter the critical section. Lock-info content uses ONLY wrapper-known metadata — `$ITEM_ID` is selected inside `codex exec` (after the lock is held), so referencing it in the wrapper would be unbound under `set -euo pipefail`:
    ```
    LOCK_DIR="$REPO_ROOT/.git/echo-builder-in-progress.d"
    if ! mkdir "$LOCK_DIR" 2>/dev/null; then
      echo "ERROR: existing lock at $LOCK_DIR" >&2
      [ -f "$LOCK_DIR/info" ] && echo "  contents: $(cat "$LOCK_DIR/info")" >&2
      echo "  remove with: rm -rf $LOCK_DIR" >&2
      exit 1
    fi
    echo "codex-builder @ $(date -u +%Y-%m-%dT%H:%M:%SZ) by $$ agent=$ECHO_AGENT_ID" > "$LOCK_DIR/info"
    trap 'rm -rf "$LOCK_DIR"' EXIT INT TERM
    ```
    Defends against the founder accidentally running two `run-codex-builder.sh` instances on the same machine (the two would race on atomic-claim git ops). The `mkdir` race-window is closed by atomic-create-or-fail semantics; check-then-write would not be sufficient.
  - **Invocation:** `codex exec -C "$REPO_ROOT" --sandbox danger-full-access - < "$REPO_ROOT/skills/process-backlog.md"`.
  - **Sandbox:** `danger-full-access` is required (workspace-write blocks `.git/FETCH_HEAD` writes during push, `~/.echo/agent-id` writes, sibling worktree creation under `~/Desktop/Project_echo--<slug>/`, and node_modules writes during test runs).
- Script lives at `tools/backlog/run-codex-builder.sh`; executable bit set; shellcheck-clean.
- A 5-line sibling driver at `tools/backlog/run-claude-code-builder.sh` is **out of scope** — only codex needs the new adapter; Claude Code + Cursor's Claude work via direct skill-loading in-session.

**AC2 — `skills/process-backlog.md` gains a "Codex builder binding" section.**

- Append a single section at the end of `skills/process-backlog.md` (after existing protocol body, before any "Failure Modes" or trailing index). New section title: **"Binding-specific notes — codex"**. Content covers:
  - Codex's `--sandbox danger-full-access` flag semantics; how it differs from Claude Code's tool-use sandbox.
  - That codex sees ECHO MCP via the same `mcp__echo__*` tool surface as Claude Code — **subject to the operator's Codex/MCP configuration** (R1 cursor F8). MCP exposure for `codex exec` depends on the operator's `~/.codex/config.toml` (or equivalent) actually registering the ECHO MCP server with codex; the skill file alone does not infer this. First-time codex-builder setup: verify ECHO MCP is registered in the operator's codex config OR document the silent-missing-tool failure mode and the recovery step. Add a one-line checklist to the binding-specific section so first-run setup is unambiguous.
  - Reminder: journal-by-proxy rule from 046 AC6 applies; codex's `codex exec` here is NOT a read-only consult (sandbox is full-access), so codex journals its own ECHO MCP calls in-the-moment per the standard discipline — not via proxy.
  - Token / session-limit observation: codex sessions have implicit upper bounds; if a long-running builder exhausts the session, the builder must commit its progress and surface the limit via `agent_notes:` in `pending_review/` (move the item there with an escalation note rather than losing work).
- Sync to `.claude/commands/process-backlog.md` via `tools/sync-skills.sh`.
- **NO protocol changes.** Atomic-claim git ops, worktree creation, test/lint/typecheck running, commit-and-push, move-to-pending-review — all unchanged. Only binding-specific notes appended.

**AC3 — Codex builder writes `backlog/task-state/<id>/builder.md` via direct commit (NO CAS).**

Resolved per R1 codex F1 + cursor F5 (convergent HIGH on the same finding). `tools/task-state/push-round-state.sh` is hardcoded to `round-state.md` (verified at SHA `4cce421` — `PATH_REL=backlog/task-state/${TASK_ID}/round-state.md`); it cannot write `builder.md` without modification. AND `builder.md` doesn't need CAS: per 046 AC1's writer-responsibilities table, `builder.md` has a single owner (the builder role bound to the current binding) for the duration of the claim. No concurrent writer race exists. Direct commit is correct.

- On atomic claim (the single-commit `ready/ → claimed/` op): the codex builder writes an initial `builder.md` containing:
  - Required top blocks: `current_thesis` ("claim of <id>"), `locked_decisions` ("AC list as locked"), `open_questions` ("any items the agent will defer to founder"), `dont_touch` (out-of-scope per spec), `canonical_anchors` (spec path + worktree path).
  - `current_round:` is NOT applicable — `round-state.md` is reviewer-cycle state; `builder.md` is builder lifecycle state. Omit.
- On milestone commits (per `process-backlog.md`'s "log work in `raw/internal/agent-runs/...`"): update `builder.md`'s `open_questions` + `locked_decisions` if anything shifts. **Write mechanism: plain `git add backlog/task-state/<task-id>/builder.md && git commit -m "builder: <task-id> milestone update" && git push origin <branch>`.** No CAS helper. Single-owner invariant from 046 is the safety property.
- On completion (move to `pending_review/`): write a final `builder.md` with `current_thesis: "<id> complete, ready for review"` + the final `canonical_anchors` (spec at the head_sha, branch, etc.). Same direct-commit mechanism.
- If the builder writes `builder.md` on the AGENT BRANCH (not main): the writes land via the existing branch-push flow that `skills/process-backlog.md` already uses. The pointer is visible on `agent/<slug>` until merge, then lands on main via `/merge-and-cleanup`.
- The builder pointer is the path future strategists/reviewers/watchers consult to understand "what state was this item left in?" — coexists with the existing `agent_notes:` frontmatter as the canonical source (for 047, both coexist; future cycles may deprecate `agent_notes`).
- **No generalization of `push-round-state.sh`** in 047 scope. If a future writer needs CAS for a non-round-state pointer, file that separately.

**AC4 — Integration test `tests/backlog/run-codex-builder.test.ts`.**

Resolved per R1 codex F4: the test asserts the **wrapper contract** (env passed to codex, lockfile visibility, git ops the wrapper itself performs), NOT the workflow the stub performs. Stub work is allowed and useful; it just doesn't count as wrapper proof.

Fixture shape matches `tests/task-state/push-round-state.test.ts` (tmpdir + bare-origin + clone). Three test cases:

1. **`wrapper passes correct env + argv to codex exec`** (wrapper-owned assertions):
   - Mock codex via `tests/backlog/fixtures/mock-codex.sh` that records its exact `argv` + `env` + `stdin` to a side-channel file, then exits 0 without doing any workflow.
   - Invoke `tools/backlog/run-codex-builder.sh`.
   - Assert (wrapper-owned): (a) recorded argv is exactly `codex exec -C <repo_root> --sandbox danger-full-access -`; (b) recorded env contains `ECHO_AGENT_ID=<resolved>`; (c) recorded `HOME` is the test tmpdir's HOME (proving the wrapper respects an overridden HOME for `~/.echo/agent-id` placement); (d) recorded stdin equals the on-disk content of `$REPO_ROOT/skills/process-backlog.md` at HEAD; (e) `LOCK_DIR` exists during the codex invocation (captured via the stub's first action: read-and-record the lock dir's presence), released after exit; (f) log file at `~/Library/Logs/echo-backlog-codex-builder.log` (or test-overridden path) contains start + end markers.

2. **`wrapper handles ECHO_AGENT_ID first-run generation`** (wrapper-owned):
   - Pre-condition: no `~/.echo/agent-id` file in the test HOME.
   - Invoke `run-codex-builder.sh`.
   - Assert: (a) `~/.echo/agent-id` is created with a UUID4-shaped string; (b) the same value appears in the recorded env passed to codex.
   - Second invocation (after stub cleans up the LOCK_DIR): assert the SAME UUID is read from `~/.echo/agent-id` (stable across runs).

3. **`atomic lockfile prevents overlapping wrapper invocations`** (wrapper-owned, R1 codex F3 fixture):
   - Use a "slow" stub `mock-codex.sh` that `sleep 3 && exit 0` to keep the lock dir held.
   - Invoke `run-codex-builder.sh` in the background.
   - **Synchronization (R2 codex F2 — make the race-free):** poll for `.git/echo-builder-in-progress.d/info` to exist with timeout ~2s (`WAITED=0; while [ ! -f .git/echo-builder-in-progress.d/info ] && [ "$WAITED" -lt 20 ]; do sleep 0.1; WAITED=$((WAITED+1)); done`). Only THEN invoke the second `run-codex-builder.sh`. Without this gate, a Vitest `spawn` implementation can race the first process's `mkdir` and occasionally let the second invocation acquire first on a loaded machine. (`WAITED=0` initializer per R3 cursor F2 — required under `set -u`.)
   - Assert: (a) second invocation exits non-zero with the lock-exists diagnostic; (b) `LOCK_DIR/info` content shows the FIRST invocation's PID and timestamp (unchanged); (c) after the first invocation completes, `LOCK_DIR` is gone; (d) a third invocation (post-cleanup) acquires the lock cleanly.

Tests do **NOT** invoke real `codex exec` (would require codex CLI + auth + non-deterministic LLM output). The wrapper's contract — what env/argv/stdin/lock-visibility codex receives — is what's under test, not codex's runtime behavior.

TypeScript tests under vitest; shell stub for codex lives in `tests/backlog/fixtures/mock-codex.sh`. The stub MAY perform workflow operations (commit, push, move-to-pending_review) but those are not assertion targets; they're allowed as side-effects the wrapper enables, not as wrapper proof.

**AC5 — Opportunistic 046 dogfooding measurement (observational).**

This is the cycle that gets measured against the baseline. AC5 is **not** a hard merge-gate; it's a documented observation that lands in review_notes at merge time AND as a sibling file `raw/internal/dogfooding/role-typed-state-comparison-047.md`. Measurement protocol:

- **§1 strategist cold-start:** Once during the 047 cycle (between R1 and R3 of review-queue cycle, ideally), the strategist (claude) `/clear`s the session and resumes via `get_role_state(047-id, "strategist")` instead of the broad-corpus reconstruction pattern from the baseline (3 MCP calls + 18 atoms + ~3-4 min). Journal observed: MCP call count, lines read, wall time to first productive output. Compare against baseline §1's three targets (≤1 MCP / ≤200 lines / <60s).
- **§3 reviewer-tick INVARIANT:** Compare codex reviewer-tick token counts per round (from `~/Library/Logs/echo-review-queue-codex.log`) against baseline §4's R1-R5 token spread (9-90k range). Cursor reviewer ticks are qualitative — founder records subjective signal of "did re-reading the cycle's growing spec feel heavier than before?" Cursor-side qualitative notes land in **a mandatory subsection of `role-typed-state-comparison-047.md` titled "§3-cursor (qualitative)"** (per R1 cursor F7 — name the sink so it stays comparable across cycles). Same subsection shape across future comparison reports.
- **§5 founder in-queue activations:** Count manual founder interventions inside the review-queue (escalations, divergent-verdict resolutions, push authorizations that aren't standing). Target: 0.
- **Comparison report:** `raw/internal/dogfooding/role-typed-state-comparison-047.md` written at merge time (sibling to baseline). Same six-dimension structure as baseline. Verdict: PASS (all 3 hard conditions met) / PARTIAL (1-2 met) / FAIL (0-1 met). If FAIL → file `047-fixups` per baseline escalation rule; do NOT merge as if 046 worked.

**AC6 — Documentation: codex-builder binding guide.**

- New section in `skills/process-backlog.md`'s "Binding-specific notes — codex" (per AC2) covers:
  - How to invoke: `bash tools/backlog/run-codex-builder.sh` from a regular terminal (matches the codex reviewer invocation memory's "regular zsh terminal, NOT inside the codex REPL" caution).
  - When to invoke: when the founder wants codex to claim the next ready item. Not a daemon. Not periodic.
  - What happens on session limit / token cap: codex commits current state, surfaces escalation note, exits non-zero. The next founder action is to read the run log and decide whether to re-invoke (which re-claims after lockfile cleanup) or escalate to a different builder binding.
  - Threat model: `danger-full-access` sandbox is broad; the wrapper's repo-root + lockfile + ECHO_AGENT_ID gate misuse. Operator MUST run only from a terminal they trust.
- Sync to `.claude/commands/process-backlog.md` via `tools/sync-skills.sh`.

**AC7 — Cursor reviewer activation note (no new infrastructure).**

- Spec body explicitly notes: cursor reviewer ticks for THIS 047 cycle are triggered manually by the founder from Cursor IDE. **Trigger mechanism:** in Cursor, the canonical `skills/review-queue-cursor.md` skill is invoked via the slash command `/review-queue-cursor` from the command palette (the slash form is the operator-facing trigger; the canonical path is the source of truth). Per R1 cursor F6 — one explicit sentence linking trigger ↔ canonical path reduces activation ambiguity across rounds.
- No new wrapper, no launchd job, no automation. Founder pins a sidebar conversation in Cursor for the cycle's duration; runs `/review-queue-cursor` from the command palette when a new round's `request.md` lands on origin/main.
- No code or skill changes — this is documentation only, captured in spec body to prevent the cursor side from being silently skipped during dogfooding measurement.

## Out of Scope (Don't Drift)

- **Launchd job for the codex builder.** Builder is one-shot, not periodic. Spawning it via cron / launchd would race multiple builders on the same item. Manual invocation is the correct lifecycle.
- **Headless Claude Code reviewer binding.** Codex's R0 consult was explicit: "Do not build headless Claude Code unless founder clarifies that 'claude reviewer' means headless." Cursor's Claude via `skills/review-queue-cursor.md` is the claude reviewer for this cycle.
- **Multi-machine builder coordination.** Lockfile is local-only (`.git/echo-builder-in-progress.d/`, the atomic-`mkdir` lock DIRECTORY per AC1; stale-recovery is `rm -rf .git/echo-builder-in-progress.d`). Cross-machine coordination is V2+ work; no current need.
- **Builder retry semantics beyond skills/process-backlog.md.** The existing skill defines retry / escalation / stop-on-uncertainty behavior. 047 does NOT change that.
- **Changes to the cross-tool protocol.** Only ADDS a binding. The protocol (atomic-claim shape, worktree contract, push-to-pending-review semantics) is unchanged.
- **Builder-state pointer for already-merged 046 item.** The retroactive `task-state/2026-05-13-046-.../builder.md` does not exist and will not be backfilled. AC3 starts with 047's own pointer.
- **Backfilling builder.md for all in-flight items.** None in flight (backlog/ready and claimed are empty at filing time). Schema is forward-only.
- **Renaming `claimed_by` to `builder_id` or similar.** Backwards-compat with existing skills + scripts. Both `claimed_by` (legacy) and `task_state_ref:` (new pointer-based) coexist; no schema rename.
- **Aggregating per-event `queue-errors/` files into a single rendered view.** Filed as 046 follow-up; not 047 scope.

## Definition of Done

- All 7 ACs implemented and verified.
- `npm test`, `npm run lint`, `npm run typecheck` clean. `tests/backlog/run-codex-builder.test.ts` **3 cases** green (matches AC4's three-case partition: wrapper env/argv contract, ECHO_AGENT_ID stability, atomic-lock overlapping-invocation race).
- `tools/sync-skills.sh --check` clean.
- Sidecar review verdict ≥ `merge with founder fixups`.
- AC5 dogfooding measurement recorded in review_notes + `raw/internal/dogfooding/role-typed-state-comparison-047.md`.
- Merge happens via `/merge-and-cleanup` with founder approval at the two checkpoints.

## After Completion (Strategist Notes)

Once merged:

1. **Promote `wiki/architecture/codex-builder-binding.md`** documenting the binding (one of three current builder bindings: Claude Code, Cursor's Claude, codex). Mark `status: shipped`.
2. **Update `wiki/operating-model/role-slot-agnostic-orchestration.md`** (from 046's promotion list) with the empirical update: "codex builder binding added via 047 (merge date)" plus a link to the 047 comparison report.
3. **Decide on next step based on AC5 comparison report:**
   - If PASS: file `048-<next-feature-spec>` from the unblocked vendor-agnostic backlog. Friction-first prioritization stays lifted per 046's After-Completion #6.
   - If PARTIAL: file `048-role-typed-state-empirical-fixes` addressing the failed conditions; freeze new feature work until those fix.
   - If FAIL: rollback consideration. The role-typed-state primitive did not ship its claimed effect. File `048-046-rollback-or-redesign`; restore friction-first prioritization gate.
4. **Update `.manifest.json` + regenerate `wiki/index.md` via `tools/wiki_index.py`.**
5. **Consider filing the missing aggregator for `raw/internal/queue-errors/` per-event files** (046 follow-up) — only if multiple CAS aborts have actually happened in the wild by then.

## Risk Register

- **R1 — Codex session limits in long-running builder.** A backlog item that takes >30min of codex work may exhaust codex CLI's token cap. Mitigation: AC4's test doesn't exercise this (mocks codex); spec body explicitly documents the escalation path (commit-and-pending-review-with-note). Real-world data informs whether to file a successor item that splits work across multiple codex sessions.
- **R2 — `danger-full-access` sandbox breadth.** Builder has full repo write + push + node_modules + sibling worktree creation. Lockfile + ECHO_AGENT_ID + repo-root validation mitigate accidental misuse. Document the threat model in AC6 skill section. The same sandbox + protections already work for codex reviewer-tick (5x in 046 cycle); pattern is proven.
- **R3 — AC5 measurement is single-cycle, single-point.** A /clear-then-resume during 047 is the only strategist cold-start data point unless founder triggers more naturally. Mitigation: the comparison report explicitly notes this as a controlled measurement; future cycles measure naturally as opportunities arise.
- **R4 — Cursor reviewer is manual; cursor side of dogfooding §3 invariant is qualitative.** Without automated cursor reviewer-tick logging, the reviewer-INVARIANT measurement is codex-only. Mitigation: spec body notes cursor side is qualitative; the §3 hard condition for PASS still requires codex-side INVARIANT (10% bound). **Cursor-side qualitative notes land in the mandatory `§3-cursor (qualitative)` subsection of `raw/internal/dogfooding/role-typed-state-comparison-047.md` per AC5 §3 patch.** (R2 cursor F2 — sync risk language to AC5's authoritative sink, not `review_notes` prose.)
- **R5 — RESOLVED at R1 (codex F1 + cursor F5 convergent HIGH).** `push-round-state.sh` is hardcoded to `round-state.md` at SHA `4cce421`. AC3 patched to use direct `git add + commit + push` for `builder.md`. Builder is single-owner per 046 writer-responsibilities; no CAS needed. No generalization of the helper in 047 scope.
- **R6 — `~/.echo/agent-id` writes need filesystem write permission outside repo.** `danger-full-access` allows it; workspace-write would block it. Documented as part of AC1's sandbox choice; tests cover the file-creation case.
