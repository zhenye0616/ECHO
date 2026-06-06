---
item_id: 2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor
verdict: merge with founder fixups
reviewed_at: 2026-06-06T00:44:54Z
test_counts: { passed: 1592, failed: 0 }
producer: review-pending-orchestrator
---

## Verdict

`merge with founder fixups`. The implementation is well-built and the two headline risks resolve in the item's favor: an independent packaged-tarball rehearsal confirms the Codex skill second-hop works (WIR-06 + SKILL-02 green from a clean install), the full `npm test` suite is green (1592 passed / 0 failed — the builder-reported `recent-calls-endpoint` hang did NOT reproduce; it passed in 14s), and typecheck/lint pass. **AC1, AC3, AC5, AC6 are solidly met** with strong unit + integration tests; **drift is zero** (diff touches only the 4 `files_to_modify` + one allowed sibling test file); **merge is clean** (main is 26 commits ahead but none touch the modified files). Two items block a clean `merge as-is`, and both are founder dispositions, not redos: (1) **AC4's required run-log artifact is entirely absent** — no `raw/internal/agent-runs/2026-06-05-093-*.md` exists, so the mandated packaged-rehearsal proof (bin path, four env values, ECHO_MCP_PORT-not-set, tarball SHA-256, full selftest JSON) does not exist and the `failedIds: []` claim is unverified by record; (2) **AC2's DOC-02 fix is a selftest check-relaxation, not a doctor-code fix** — defensible (it still hard-requires `mcpReachable===true`, only tolerating agent-probe-driven `degraded`), but the spec's locked-decision #1 said a check believed wrong must be escalated, not re-scoped inline, so it needs explicit founder sign-off.

## Pre-merge fixups

- [ ] **Green-light the DOC-02 narrowing** (AC2 — `src/cli/commands/selftest.ts:700-710`). The fix relaxes the DOC-02 pass condition to also accept `overall==='degraded'` when `mcpReachable && state-ok && only the agent-probe is degraded`. Reviewer judges this a correct narrowing (a check named "mcp reachable" should not over-assert full health; if mcp is genuinely unreachable, DOC-02 still fails). Founder decision per locked-decision #1: accept the narrowing as the contract (recommended), or send back as an escalation.
- [ ] **Produce the AC4 run-log** at `raw/internal/agent-runs/2026-06-05-093-*.md` with the 5 required fields, OR accept the reviewer's independent rehearsal as substitute — but note that rehearsal only confirmed WIR-06/SKILL-02 green; DOC-02/CAP-02 were **unreachable on the review host** because a live dev daemon holds the OS-data-dir pid-lock (the sandbox isolates `ECHO_HOME` but not the pid-lock). A clean-host packaged rehearsal (no running ECHO daemon) is still owed before cutting the `v0.1.0-beta.1` tag. Reviewer-captured tarball SHA-256: `68089706032134fb6dbc02eeedb794a9a4fc7b12b30972d99dbfc6e1b8d1044c`.

## Expected merge conflicts

- None. Merge-base `9daf1cab`; `git merge-tree` shows no conflict markers and `git log MB..main` for the 4 modified files is empty (092's packaging/CI changes did not touch these src files). Branch was cut 26 commits back, so re-running `npm test` on the merged tree post-merge is cheap insurance, but no content collision exists.

## Follow-up items (defer, do not block merge)

- Document in the AC4 rehearsal recipe that the host must have no running ECHO daemon (pid-lock is keyed on the OS data-dir in `src/.../lifecycle.ts:80-92`, not on sandbox `ECHO_HOME`).
- Consider making the selftest sandbox's pid-lock honor the sandbox `dataDir` so the packaged rehearsal is robust on dev machines (separate item).
- `doctorStateOk` requires `schemaVersion===1` (`selftest.ts:692`) — brittle if a future schema bump lands; low priority.
- The `recent-calls-endpoint.test.ts` transient hang the builder hit is already carved into successor item #4 (real-daemon/concurrency full-suite flakes); it did not reproduce here.

## Open questions for founder

- DOC-02 disposition (see pre-merge fixup #1): is the inline check-narrowing acceptable as the DOC-02 contract, or do you want it escalated/re-specced per locked-decision #1? This is the one substantive design call gating merge; the reviewer recommends accepting it.
