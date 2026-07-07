---
item_id: 2026-07-07-127-packaged-tarball-import-closure
round: 1
combined_at: '2026-07-07T07:26:55Z'
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
| 1 | MEDIUM | codex | files_to_modify / AC1 | accepted — scope + falsifiability hardening | f5a9f983 — took codex's option (a): removed the import-RESTRUCTURE alternative from AC1 and pinned the fix to packaging config (`package.json` files/pack) only. The restructure path would edit `src/mcp/server.ts`/the responder tree and risk the propose_decision / Slack-surface / brain-boundary contracts locked in Out of Scope; removing it keeps files_to_modify (package.json + tests/packaging/) honest and inside the locked boundary. Not a removal-matrix case (targets original r1 AC text, not a prior-round patch). |
| 2 | MEDIUM | codex | AC3 | accepted — falsifiability hardening | f5a9f983 — AC3 now pins a concrete test `tests/packaging/packaged-boot.test.ts` (permitted path) + the `npx vitest run ...` command. Paired with #4. |
| 3 | MEDIUM | codex | AC4 | accepted — moved out of builder AC | f5a9f983 — AC4's post-merge Windows CI evidence is now explicitly a founder/watcher post-merge validation gate, not a builder pending_review criterion (a builder on the feature branch can't produce post-merge CI evidence). Builder gate is AC3 + AC5. Also recorded in After Completion. Paired with #5. |
| 4 | MEDIUM | codex-ops | spec:53 (AC3) | accepted — falsifiability hardening | f5a9f983 — same AC3 patch: the proof now MUST `npm pack`, extract/install into a temp dir OUTSIDE the repo, launch the packaged entrypoint under production module resolution with NO mocks, and FAIL on real `ERR_MODULE_NOT_FOUND` (no inferred/mocked reachability, no repo-node_modules-symlink reliance). |
| 5 | MEDIUM | codex-ops | spec:58 (AC4) | accepted — moved out of builder AC | f5a9f983 — same as #3: post-merge real Windows CI/release jobs are founder/watcher validation; the builder produces pre-review evidence (AC3 packaged-boot test + AC5 local gate) on the feature branch. Removes the impossible-completion-gate / unverifiable-run-log-claim risk in the unattended queue. |

## Reframe gate

Not triggered: r1 has zero prior-round `spec-r*-patches` commits (0 patch-on-patch findings < 2 threshold). All findings target original AC1/AC3/AC4 text. The one removal-language disposition (#1, removing the restructure alternative) targets original r1 AC text, not a prior-round patch, so the removal proof matrix does not fire. Investigator not run.

## Convergence call

`needs R2` — spec patched (f5a9f983); proposed artifact takes a verification round (branch b). focus_hints: verify AC1 is packaging-config only (restructure option removed, no source-surface edits, files_to_modify stays package.json + tests/packaging/); AC3 pins a real no-mocks pack/extract/boot test at tests/packaging/packaged-boot.test.ts that fails on real ERR_MODULE_NOT_FOUND; AC4 post-merge Windows CI is founder/watcher validation, not a builder AC; builder completion gate = AC3 + AC5 local.

