---
item_id: 2026-07-15-137-echo-context-installable-shadow-runtime
round: 5
combined_at: '2026-07-16T06:06:33Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC4 release-set manifest and AC5 repo-free installation | accepted — structural cut (`fam-5c681d0c6bd231b4`) | Replaced the hosted release set with one local four-asset bundle whose manifest and delegated installation record bind every byte. |
| 2 | MEDIUM | codex | AC4 release approval ingress | accepted — structural cut (`fam-5c681d0c6bd231b4`) | Removed approval-file ingress; the already-landed sequential-program decision requires a committed single-use exact-operation authorization. |
| 3 | MEDIUM | codex | AC4 release FSM journal and tools/release-runtime.mjs | accepted — scope removal (`fam-079a65de84d8e4c6`) | Removed release FSM, hosted publication, resume, tag, upload, and download machinery; item 140 owns hosted release work. |
| 4 | MEDIUM | codex | AC5 install crash transaction and AC7 cleanup | accepted — local repair (`fam-408e017d6c846d18`) | AC4 now requires a durable intent, immutable staging, ownership receipt, and adopt/rollback/refuse recovery under one lifecycle lock. |
| 5 | MEDIUM | codex | AC5 candidate layout and close-bind handoff | accepted — structural cut (`fam-a99bc4210e962be6`) | Candidate proof now runs one foreground process group below a disposable root on kernel-selected port 0 with no launchd job or close-bind handoff. |
| 6 | MEDIUM | codex | AC5 lifecycle sequences | accepted — local repair (`fam-408e017d6c846d18`) | AC4 requires source-owned literal launchctl vectors, idempotent loaded/not-loaded handling, and bounded job/PID/listener convergence. |
| 7 | MEDIUM | codex | AC5 supervisor topology and durable last-exit record | accepted — scope removal (`fam-00b89b3e86ac4d53`) | Removed the supervisor and last-exit record; launchd directly owns the runtime and inherited output is `/dev/null`. |
| 8 | MEDIUM | codex | AC6 status and doctor process contract | accepted — local repair (`fam-5b03b08cc0deea62`) | AC5 names closed schemas, canonical JSON+LF, bounded probes, redacted stderr, deterministic exit precedence, and read-only doctor behavior. |
| 9 | HIGH | codex-ops | AC4 — release FSM process containment and tests/install/release-fsm.test.ts | accepted — scope removal (`fam-079a65de84d8e4c6`) | Hosted release execution and its FSM test are deleted from the item; final local build ambiguity stops for coordinator reconciliation. |
| 10 | HIGH | codex-ops | AC4 — release FSM lock namespace and private publication | accepted — scope removal (`fam-079a65de84d8e4c6`) | No private publication or release lock remains; item 140 is the parked owner of hosted governance. |
| 11 | HIGH | codex-ops | AC4/AC5 — release-set checkpoint and repo-free trust anchor | accepted — structural cut (`fam-5c681d0c6bd231b4`) | The canonical runtime manifest binds the other three assets and the installation authorization separately binds that manifest plus each typed asset. |
| 12 | HIGH | codex-ops | AC5 — install crash transaction and tests/integration/shadow-install.test.ts | accepted — local repair (`fam-408e017d6c846d18`) | AC4 and the named transaction/integration tests cover bootstrap, intent, staging, receipt, job load, kill boundaries, and owned cleanup. |
| 13 | MEDIUM | codex-ops | AC5 — lifecycle mutation serialization | accepted — local repair (`fam-408e017d6c846d18`) | One per-layout lifecycle lock is held across recovery, filesystem mutation, launchd mutation, and convergence for every mutating command. |
| 14 | HIGH | codex-ops | AC5 — supervisor restart and logging failure behavior | accepted — structural cut (`fam-00b89b3e86ac4d53`) | The competing supervisor/restart loop is removed; launchd has sole restart authority and one bounded application logger owns disk output. |
| 15 | HIGH | codex-ops | AC7 — crash-durable candidate cleanup and failure evidence | accepted — structural cut (`fam-a99bc4210e962be6`) | Candidate proof owns one foreground process group, always terminates survivors, proves listener removal, and deletes only receipt-owned disposable paths. |

## Convergence call

needs R6 — focus_hints: fresh protocol-v2 full rebaseline of the six-AC local-bundle/direct-runtime scope; verify the exact predecessor and authority boundary, and reject any hosted-release, supervisor, or cutover leakage.
