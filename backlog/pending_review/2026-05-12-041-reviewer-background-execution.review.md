---
item_id: 2026-05-12-041-reviewer-background-execution
verdict: merge as-is
reviewed_at: 2026-05-12T22:20:00Z
test_counts: { passed: 47, failed: 1, skipped: 0, note: "47 review-queue passes; 1 fail = pre-existing concurrency.test.ts:133 orphan-cleanup test-fixture clock-mismatch bug, explicitly out of 041 scope per spec Test list. Includes +2 new commit-reviewer-response.test.ts cases (valid + malformed paths)." }
reviewer_inputs:
  - backlog/pending_review/2026-05-12-041-reviewer-background-execution.md (spec body)
  - git diff main..agent/reviewer-background-execution --stat (13 files, +774/-194)
  - tools/review-queue/run-codex-reviewer.sh (AC1)
  - tools/review-queue/install-codex-reviewer-launchd.sh (AC2)
  - tools/review-queue/status-codex-reviewer-launchd.sh (AC2)
  - tools/review-queue/uninstall-codex-reviewer-launchd.sh (AC2)
  - tools/review-queue/commit-reviewer-response.sh (AC4)
  - tools/review-queue/smoke-test-codex-runner.sh (AC5)
  - tests/review-queue/commit-reviewer-response.test.ts (AC4 integration)
  - .claude/commands/review-queue-codex.md + review-queue-cursor.md (rewires)
  - docs/review-queue-setup.md (AC6 rewrite + AC7 section)
  - backlog/_followups.md (AC7 line 410 — get_atom({id: ...}))
  - npm test -- tests/review-queue/ → 47 pass / 1 pre-existing fail
  - npm run lint → clean
  - npm run typecheck → clean
  - git merge-tree (no conflicts on main)
---

## Verdict

`merge as-is`. All in-scope ACs are satisfied to the letter of the spec. AC1's wrapper has bash strict-mode, clear-stderr-on-bad-env preamble (distinguishes "env unset" from "not a git repo"), env-var-derived repo root with the normative default, the verified `codex exec ... --sandbox danger-full-access - < $PROMPT` invocation, PATH augmentation for launchd's reduced env, log rotation at 10MB, and the tick-start preamble. AC2's plist has `Label` first, `StartInterval=600`, `RunAtLoad=false`, `KeepAlive=false`, stdout/stderr to `/dev/null`; install/uninstall are version-gated (bootstrap/bootout on Sonoma+, load/unload fallback) and idempotent; `--smoke` flag fires both `kickstart -k` against the real job AND the AC5 synthetic smoke. AC4's helper validates BEFORE any git operation; on failure it moves the file aside to `<path>.invalid.<ISO-ts>` AND appends a single `VALIDATION-FAIL:` row to `raw/internal/queue-errors.md` AND exits non-zero — exactly the unbypassable retry-unblocking contract the spec demands. Both reviewer slash-commands are rewired and explicitly gate the journal-write step on helper rc=0. AC5's smoke test does `git init --bare -b main` with the older-git fallback for both bare origin and working repo, uses the pinned `2026-05-12-999-smoke-test-synthetic` item_id, asserts remote URL string-equality + single-remote + production-URL absence in `.git/config`, and logs the advisory production-origin delta. AC7 audit is clean for non-wiki paths; the one wiki residue (`wiki/operating-model/cross-tool-spec-review.md:140` placeholder) was correctly deferred to the strategist's wiki promotion step per AGENT_INSTRUCTIONS rule 6. AC3 + AC8 are observational per spec — AC3 verified by founder running `--smoke` post-merge, AC8 measured on the next qualifying spec. Tests: 47 review-queue passes (+2 from new AC4 integration tests, matching the builder's +1-vs-baseline framing in spec since the test file naturally has 2 it() blocks); the single fail (`concurrency.test.ts:133`) is the pre-existing test-fixture clock-mismatch bug the spec explicitly carves out. Lint + typecheck clean. Merge-tree against main is clean — no conflicts. No scope drift in `git diff --stat`: every modified file is either in `files_to_modify` or directly implied by the ACs.

## Pre-merge fixups

(none — merge as-is)

## Expected merge conflicts

None — clean merge. `git merge-tree` against main shows only `merged` results for all 13 files; no `conflict` markers. Safe to `git merge --no-ff agent/reviewer-background-execution` directly.

## Follow-up items (defer, do not block merge)

- **AC3 founder verification** — founder runs `tools/review-queue/install-codex-reviewer-launchd.sh --smoke` post-merge on the actual machine to close the AC3 end-to-end-verification gap (the wrapper pins the corrected invocation, but only running it on the founder's box proves the 039 AC0 recipe is now real). If smoke fails on the founder's machine for a launchd/codex-binary-resolution reason the builder couldn't anticipate, file as 042.
- **AC7 wiki residue** — `wiki/operating-model/cross-tool-spec-review.md:140` still references `get_atom(<elided_atom_id>)` as a placeholder. Per AGENT_INSTRUCTIONS rule 6 (no agent wiki writes) and the spec's After Completion §2 (strategist wiki promotion), the strategist should patch this during the post-merge wiki promotion pass.
- **AC8 empirical verdict** — record in `review_notes` at merge time and on the next qualifying spec's review cycle. Target: 0–1 founder activations per 3-round cycle (pre-041 baseline ~5).
- **Strategist wiki promotion (spec After Completion §2)** — consider `wiki/principles/reviewer-harness-agnostic.md`; update `wiki/surfaces/review-queue.md` (still owed from 039) to reference 041's helper + Cursor-degradation property; cross out the three `_followups.md` entries listed in After Completion §1.

## Open questions for founder

None — AC3 and AC8 are documented as observational/founder-action, not reviewer-resolvable. Verdict is unblocked.

## Sources consulted

- Spec: `backlog/pending_review/2026-05-12-041-reviewer-background-execution.md` (full body, 8 ACs, Out of Scope, After Completion, Test list, Implementation hints)
- Diff: `git diff main..agent/reviewer-background-execution --stat` and per-file inspection of all 13 changed paths
- Builder shell + plist scripts in the worktree at `~/Desktop/Project_echo--reviewer-background-execution/`
- `tests/review-queue/commit-reviewer-response.test.ts` (full file)
- Commands run:
  - `npm test -- tests/review-queue/` (in worktree) → 47 pass / 1 fail (pre-existing concurrency:133)
  - `npm run lint` → clean
  - `npm run typecheck` → clean
  - `git merge-tree $(git merge-base main agent/reviewer-background-execution) main agent/reviewer-background-execution` → no conflicts
  - `git grep -n 'atom_id' -- docs/ .claude/commands/ tools/review-queue/ backlog/_followups.md raw/internal/dogfooding/mcp-interactions-journal.md` → all residual hits are out-of-scope (`cluster.atom_ids[]`, `metadata.atom_id`, `resolved_by_atom_id`, `<prior_atom_id>` continuation field) per spec's AC7 scoping clause
  - `grep -n 'get_atom' backlog/_followups.md docs/review-queue-setup.md` → line 410 corrected; new docs section in `review-queue-setup.md`

## Operating-model signal

040 + 041 together close the loop the founder named: 040's structural retro reduced cross-tool-spec-review-stage activation friction to zero (AC6b), and 041 closes the reviewer-side activation friction (AC8 target ≤1 per cycle). The 8→6→0 finding-decay shape held for a fourth structural-reform spec (after 037/038/039/040), reinforcing the narrow-class-vs-structural heuristic for `process-backlog` defaults. The AC4 pattern — a single canonical commit-gate helper that mechanically enforces the schema and is invoked uniformly across reviewer prompts — is the right shape for any future reviewer-voice addition; it cleanly inherits the "reviewer-harness-agnostic" principle the spec's After Completion §2 flags as wiki-promotion material. Notable: builder correctly stopped at AGENT_INSTRUCTIONS rule 6 (no wiki writes) for the one remaining `atom_id` residue rather than drifting; that's the discipline the rule exists to produce.
