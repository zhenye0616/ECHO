---
item_id: 2026-05-16-057b-coord-active-trigger-and-role-emission
verdict: merge with founder fixups
reviewed_at: 2026-05-16T17:30:00Z
test_counts: { passed: 1121, failed: 0, skipped: 21 }
---

## Verdict

`merge with founder fixups`. Implementation is correct on every load-bearing invariant spot-checked: the 5-step role-resolution gate in `src/coord/paths.ts:81-144` runs in spec order (shape regex BEFORE FS access; roster BEFORE path math; containment + executable bit after); `src/mcp/tools/coord-invoke.ts:96-169` orders validation → synchronous `emitReviewerInvoked` → spawn → error-listener-then-unref exactly per AC0 step 4 causality contract; `tools/review-queue/coord-emit.sh:84` uses BSD-portable `+%Y-%m-%dT%H:%M:%SZ` (no `%N`); the codex pinned-mode skill emits `tick_start` BEFORE bind-validate then `tick_end(bind_failed)` on rejection (`skills/review-queue-codex.md:38,73-76`); `src/coord/internal-emitter.ts:62-74` sets `source = coord:<subject_role>` with `emitter_role: "daemon"` in metadata. The central founder decision is whether the 10 missing AC8 tests are merge-blocking. **Reviewer judgment: not merge-blocking, ship now and file a follow-on.** The shipped 10 cover the load-bearing invariants (path-resolution gates, input validation, wrapper spawn shape, fire-and-forget budget, cwd-independence, no pre-push spawn, internal-emitter attribution, coord-emit transport with BSD-date assertion, causality ordering, daemon-down tolerance). The missing 10 mostly verify integration-level behaviors requiring mocked codex spawn-and-await, EMFILE injection, or launchd cadence simulation — each meaningful but exercising follow-on scaffolding, not core 057b production code. Lint/typecheck/sync-skills clean; 1121 passed | 21 skipped reproducible.

## Acceptance status

| AC | Met | Partial | Not Met | Evidence |
|---|---|---|---|---|
| AC0 (coord_invoke MCP tool) | yes | | | `src/mcp/tools/coord-invoke.ts:79-189`, `src/coord/paths.ts:77-147` (5-step gate exact order), `src/coord/internal-emitter.ts:56-103` (sync sequence) |
| AC7 (role emission) | yes | | | `tools/review-queue/coord-emit.sh:84` (BSD date), `tools/review-queue/_run_reviewer.sh:80-87` (Phase 1 scheduler_health), `skills/review-queue-codex.md:38,73-76` (pinned-mode tick_start-before-bind + bind_failed), `skills/review-queue-watch.md` post-push hook present, `skills/review-pending.md` post-push hook present, `tools/review-queue/request.py:11` adds correlation_id, `tools/review-queue/schemas/request.schema.json` canonical uuid4 regex |
| AC8 (integration tests) | | yes (10/20) | | shipped 10 named in agent_notes verified present in `tests/coord/`; 10 missing — see verdict for impact judgment |
| AC9 (task-state pointer) | yes | | | `backlog/task-state/2026-05-16-057b-coord-active-trigger-and-role-emission/builder.md` present |

## Drift findings

None observed. The 33 changed files are subset-or-equal to the body's `files_to_modify` list, with two adapter SKILL.md files appropriately conditional (the canonical skill files lack `## Binding-specific notes — codex` sections so `tools/sync-skills.sh` doesn't materialize them — `--check` exits OK, confirming the intent). Four unrelated test files have one-line modifications (`tests/mcp/tools/recent-work-context.test.ts`, `tests/review-queue/046-task-state-ref-and-fresh-eyes.test.ts`, `tests/review-queue/056-claude-reviewer-onboarding.test.ts`, `tests/review-queue/schemas.test.ts`) — required to make existing tests aware of the new `correlation_id` field; recommend founder eyeball at merge but not a drift concern. No 057a substrate files touched (no edits to `src/coord/deadlines.ts`, `coord-roles.json`, or `coord_emit`/`coord_status` tools).

## Design-choice judgments

- **Stand**: 10/20 AC8 tests shipped, the rest deferred. The 10 missing involve substantial scaffolding (mocked codex CLI, EMFILE injection, launchd-cadence simulation). The shipped 10 cover the high-risk load-bearing invariants. Honest agent_notes flag is appropriate.
- **Stand**: synchronous `emitReviewerInvoked` happens BEFORE spawn (`coord-invoke.ts:125-147`) — causality contract for r5 codex-ops F1 HIGH preserved.
- **Stand**: `child.on('error', ...)` registered at line 156 BEFORE `child.unref()` at line 169 — async-error fatality avoided per r5 codex-ops F1 HIGH.
- **Stand**: `coord-emit.sh:84` uses `date -u +%Y-%m-%dT%H:%M:%SZ` (no `%N`) — r7 convergent HIGH BSD-portability fix correctly applied.
- **Stand**: `coord-emit.sh:101` adds `Accept: application/json, text/event-stream` — undocumented in spec but plausibly required by `StreamableHTTPServerTransport` content negotiation; the per-tier transport test passes, validating empirically. Worth confirming this header expansion is desired (small spec underspecification, not a defect).
- **Stand**: pinned-mode emits `tick_start` BEFORE bind-validate (`skills/review-queue-codex.md:38`), then `tick_end(outcome=bind_failed, reason=...)` on rejection (line 73-76). Matches r1 codex F2 + r1 codex-ops F3 convergent HIGH.

## Bugs/risks

- `src/coord/paths.ts:140` — exec-bit check is `(st.mode & 0o100) === 0`, i.e. owner-only executable. Acceptable for V1 (the wrapper files in repo all have `rwxr-xr-x`); the in-file comment already calls out the FAT caveat. Non-blocking.
- `tools/review-queue/coord-emit.sh:62-66` — when caller passes both `--correlation-id` and `--tick-run-id`, the script logs to stderr and exits 0 without emitting. Spec-aligned (best-effort, queue-durability-preserving), but silent skip means no atom is appended for what is almost certainly a caller coding error. The reviewer skill steps never pass both, so practically unreachable. Non-blocking.
- `src/coord/internal-emitter.ts:97-100` — `deadlines.ingest()` failures are swallowed silently. The comment acknowledges "Periodic reconciliation closes any tracker skew" but there's no reconciliation timer in 057a substrate. If `ingest()` throws, the durable atom exists but tracker state is wrong until daemon restart re-reads the ledger. Not a 057b bug per se; non-blocking follow-on.

## Merge-conflict preview

- **Predicted: zero conflicts.** Branch merge-base is `41a70ca` (the claim commit). Main has advanced only by `c8d0dee` (review sidecar — adds files under `backlog/pending_review/_reviews/`, touches no source). `git merge-tree` from merge-base produces no conflict markers. The 058 disposition-discipline edit on `skills/review-queue-watch.md` is BELOW the merge base — already absorbed into the branch's starting point, no conflict surface.
- **Recommended strategy**: standard `git merge --no-ff agent/057b-coord-active-trigger-and-role-emission` should complete without prompts.

## Suggested fixups

**Pre-merge punch list** (must do before merge):

- [ ] (Optional) Confirm with founder that `Accept: application/json, text/event-stream` header expansion at `tools/review-queue/coord-emit.sh:101` is intentional — required for `StreamableHTTPServerTransport` to accept the POST and validated empirically by the passing transport test, but not in the spec snippet.

**Non-blocking follow-ups** (defer to a successor spec):

- File a follow-on spec to ship the 10 deferred AC8 tests: `active-trigger-roundtrip`, `pre-spawn-deadline-fires`, `scheduler-health-two-phase`, `correlation-id-shared-active-and-fallback`, `pinned-request-mode`, `tick-end-covers-clean-exits`, `pinned-request-bind-failed-closes-deadline`, `coord-invoke-spawn-error-noncrash`, `scheduler-health-bootstrap-scope`, `silent-fail-detection`. Each requires distinct scaffolding (mocked codex CLI for the roundtrip + roster-mode + bind-failed-deadline trio; deterministic EMFILE injection for spawn-error-noncrash; launchd-cadence simulation against deadline timers for silent-fail-detection + scheduler-health-bootstrap-scope).
- Consider a periodic reconciliation timer for `DeadlineTracker.ingest()` failure paths (`src/coord/internal-emitter.ts:97-100` swallows silently with no current recovery mechanism beyond daemon restart).
- Confirm exec-bit policy at `src/coord/paths.ts:140` — owner-only is fine for V1 dev but operator surface should document it.

## Test counts observed

- `npm test` → **Test Files 98 passed | 1 skipped (99); Tests 1121 passed | 21 skipped (1142)**; duration 31.50s (exit 0). Matches agent_notes verbatim.
- `npm run lint` → clean (eslint + task-state lint, exit 0).
- `npm run typecheck` → clean (tsc --noEmit, exit 0).
- `bash tools/sync-skills.sh --check` → `OK: all adapters match canonical skills/` (exit 0).
