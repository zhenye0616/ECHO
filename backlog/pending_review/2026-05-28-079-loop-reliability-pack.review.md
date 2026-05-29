---
item_id: 2026-05-28-079-loop-reliability-pack
reviewer: claude-code-strategist-independent
reviewed_at: 2026-05-29T07:10:15Z
verdict: merge as-is
head_sha: cd67c6e2b01235864e7afb1d1709d0f073842079
---

## Verdict

APPROVE-TO-MERGE. All four load-bearing ACs (AC1-AC4) are implemented to spec and verified in code. AC5 (stretch) correctly deferred whole per the budget rule. AC7 tests are genuine behavioral assertions (they drive the real scripts, not stubs) and all pass. Full root suite, typecheck, lint, and sync-skills --check are green at the head SHA. Merge against current origin/main is clean (zero conflict markers). The single load-bearing judgment call (J5) is correctly decided — see J5 adjudication.

## Verify numbers (re-run independently at cd67c6e2 in /tmp/echo-079-review)

- `npm ci`: exit 0
- `npm run typecheck`: exit 0 (clean)
- `npm test`: exit 0 — **1476 passed | 21 skipped (1497 total); 137 test files passed | 1 skipped (138)**
- `npm run lint`: exit 0 (eslint --max-warnings 0 + python task-state lint)
- `tools/sync-skills.sh --check`: OK (all Claude command adapters match canonical skills/)
- 4 new AC7 shell tests, run directly — all PASS:
  - `test-clean-snapshot.sh`: exit 0
  - `test-effect-runner.sh`: exit 0
  - `test-validate-sidecar.sh`: exit 0
  - `test-check-coupled-invariants.sh`: exit 0
- `check-coupled-invariants.sh` run standalone against the coherent merged tree: exit 0 ("OK: coupled invariants hold") — confirms all 14 registered MCP tools have files + registerTool literals + test recognition.

These match the builder's self-reported numbers exactly.

## Per-AC check

- **AC1 — clean-snapshot default substrate.** PASS.
  - `_clean-snapshot.sh:12-78` — `echo_enter_clean_snapshot <role-slug>` performs prune → enumerate registered → GC >60min `$TMPDIR/echo-*` orphans → `git fetch origin main` → require TMPDIR → `git worktree add --detach $TMPDIR/echo-<role>-<uuid> origin/main` → exports `WT` + `ECHO_REVIEW_QUEUE_REPO_ROOT=$WT` → installs unified EXIT/ERR/INT/TERM cleanup trap. Captures its own repo root in `ECHO_CLEAN_SNAPSHOT_REPO_ROOT` (`:30`) so the trap cd's home independent of caller env. Role-slug validated against an injection-safe charset (`:18-23`).
  - `_run_reviewer.sh:90-101` — inline 050 preamble removed, replaced with `source _clean-snapshot.sh; echo_enter_clean_snapshot "$REVIEWER_NAME"`. No leftover `REGISTERED_WT`/cleanup refs. PATH augmentation, scheduler_health emission, prompt-path resolution, dispatch all preserved.
  - `combine.py:780-823` — `assert_git_mutation_target_safe(repo_root, allow_live)` refuses ONLY when the resolved git toplevel == `~/Desktop/Project_echo` AND `_is_valid_clean_snapshot` is False. `_is_valid_clean_snapshot` (`:773`) requires: TMPDIR+ECHO_REVIEW_QUEUE_REPO_ROOT set, physical-path equality `routed.resolve() == toplevel`, parent==`$TMPDIR`, basename matches `echo-<role>-<uuid>` regex, and registered-worktree membership. Wired into the git-mutating path at `:865` before pull/push.
  - Stale-env bypass correctly rejected: env points at an echo-* path but `--repo-root` resolves to live → `routed != top` → not-a-snapshot → refuse. Verified by `test-clean-snapshot.sh` case (c) (`:153-162`).
  - Test-compat rule (044): a non-`~/Desktop/Project_echo` temp clone is recognized as not-the-founder-live-checkout and proceeds WITHOUT `--allow-live`, so the 044-autostash temp-clone invocation stays green with no test edit. One rule applied consistently. Verified by case (d) (`:164-178`).

- **AC2 — single effect boundary.** PASS.
  - `_effect-runner.sh:19-73` — `echo_effect <kind> -- <argv>`, `kind ∈ {spawn-agent, codex-exec, push, launchd, review-tick}`, `ECHO_EFFECT_MODE ∈ {live, dry-run, test}` (default live). Non-live status contract is **mode-symmetric**: every non-push kind returns 0 under BOTH dry-run and test; push returns `ECHO_EFFECT_NONLIVE_RC=97` under BOTH (`:57-58`, `:63-64`). No dry-run-push-returns-0 false-success path exists (r3 codex F1 satisfied).
  - `push-with-retry.sh:38-52` — the ENTIRE `pull --rebase=merges && push HEAD:main` cycle is wrapped in `echo_effect push -- bash -c '...'`, not just the terminal push. On sentinel 97 it exits 97 immediately (no retry, no network). Live retry + queue-errors fallback preserved.
  - `commit-reviewer-response.sh:91-110` — under non-live mode, probes `echo_effect push -- true`, gets 97, and **refuses before `git add`/`git commit`** (`:104`), so no orphan local-only commit and no false `completed` tick. Verified behaviorally in `test-effect-runner.sh` case 4 (`:65-115`): drives the real script, asserts exit 97 AND HEAD unchanged under both non-live modes.
  - `_run_reviewer.sh:168` — child-CLI dispatch routed through `echo_effect codex-exec -- bash -c "$INVOKE_CMD"`; `command -v` PATH guard made live-only (`:145`) so test-mode smoke spawns no real vendor CLI. Kind label `codex-exec` retained (J3 default).

- **AC3 — unified sidecar contract.** PASS.
  - `schemas/review-sidecar.schema.json` — pins the committed-sidecar frontmatter (item_id/verdict/reviewed_at/test_counts + additive `producer` enum), `additionalProperties: false`. Verified the live Step-C template (`review-pending.md:172-178`) emits exactly these 5 fields, so the strict schema does not reject the live artifact.
  - `validate-sidecar.py` — mirrors validate.py shape; coerces a PyYAML-parsed `datetime` `reviewed_at` back to an ISO-8601 `Z` string (`:34-37, :63-64`) BEFORE jsonschema, so the live UNQUOTED `reviewed_at: 2026-04-30T22:30:00Z` validates (r3 codex F2). Asserts required headings VERBATIM including the `## Follow-up items (defer, do not block merge)` parenthetical, plus `## Open questions for founder` iff verdict==block (`:81-88`).
  - `review-pending.md:177, :209` — Step C stamps `producer` and runs `validate-sidecar.py` before commit+push.
  - `merge-and-cleanup.md:38, :48-58` — Step A replaces the awk verdict/reviewed_at scrapes with `validate-sidecar.py` (fail-loud) then reads validated fields via a yaml parse (with matching datetime coercion). Mergeable-verdict gate + 6h-staleness warning unchanged.
  - Round-trip verified by `test-validate-sidecar.sh` (all producers, unquoted-ts coercion, parenthetical heading, malformed rejection, block-without-open-questions rejection, producer↔consumer reads).

- **AC4 — coupled-invariant checker.** PASS.
  - `check-coupled-invariants.sh` — (i) package.json↔lock deps/name/version coherence via node, non-network (`:16-55`); (ii) `tools/sync-skills.sh --check` (`:57-67`); (iii) every `register*` import in `src/mcp/server.ts` has a tool file + a `server.registerTool('<name>')` literal + recognition in `tests/mcp/tools/recent-work-context.test.ts` (`:69-113`). Per-invariant diagnostic on failure; exits non-zero. Import regex confirmed to match the actual server.ts import style for all 14 tools.
  - `merge-and-cleanup.md:252` — Step C5 runs the checker alongside npm test/lint/typecheck/sync-skills --check; pause-don't-auto-fix posture (consistent with Out-of-Scope #8).
  - `test-check-coupled-invariants.sh` proves (i)/(ii)/(iii) each FAIL on the respective drift and a coherent tree PASSES.

- **AC5 (STRETCH)** — correctly DEFERRED whole. No `classify-finding-provenance.py` / `test-classify-finding-provenance.sh` present; matches the budget rule and Out-of-Scope #7. Filed as After-Completion follow-on.

- **AC6** — observational gate; nothing to verify in code (empirical close on the next merge cycle).

- **AC7** — PASS (numbers above). Fixture regression correctly fixed: 7 existing vitest fixtures that copy `push-with-retry.sh`/`commit-reviewer-response.sh` into throwaway repos now also copy the new `_effect-runner.sh` dependency they source. `git diff --check` clean (no whitespace errors in new shell helpers).

## J5 adjudication (the load-bearing judgment call)

**Verdict: J5-decision-correct.** The builder converted ONLY `_run_reviewer.sh` to the shared `_clean-snapshot.sh` helper and did NOT convert the inline worktree preambles in `skills/review-queue-watch.md` Step 0 or `skills/merge-and-cleanup.md` Step B. This is correct on two independent grounds:

1. **Files-to-modify contract.** Spec line 41 explicitly marks `skills/review-queue-watch.md` as "**READ-ONLY for AC1-AC4**" in spec_refs; it is NOT in `files_to_modify`. `merge-and-cleanup.md`'s files_to_modify entries are scoped to AC3 (sidecar consume) + AC4 (checker), not the AC1 preamble. Converting the watcher would require a files_to_modify amendment, breaking the atomic-claim contract. AC1's prose itself hedges ("and, *in prose*, the watcher + merger skills source it") — the binding files_to_modify list names only `_run_reviewer.sh` for conversion.

2. **AC1's intent is already satisfied for the watcher/merger by the existing 050 design.** I read both preambles. The watcher (`review-queue-watch.md:28-32`) already does `WT="$TMPDIR/echo-watcher-$(uuidgen)"; git worktree add --detach "$WT" origin/main` with the GC-orphans preamble (`:18-25`) and an ERR/EXIT cleanup trap (`:290`). The merger (`merge-and-cleanup.md:91-95`) already does `MERGER_WT="$TMPDIR/echo-merger-$(uuidgen)"; git worktree add --detach "$MERGER_WT" origin/main` with the same preamble shape. Both already use a clean detached-HEAD snapshot of origin/main and never the founder's shared live checkout — exactly what AC1 requires ("automated reviewers, watcher, merger use a clean snapshot, never the shared live checkout").

The actual swarm-source gap AC1 targets — clean-snapshot being a *convention not an enforced default*, and `combine.py --all` being able to commit into the live checkout — is closed by (a) the factored helper + `_run_reviewer.sh` conversion, and (b) the `combine.py` live-checkout guard, which enforces the refusal regardless of which caller invokes combine. Converting the two skills' bash-in-markdown would be a cosmetic de-dup with zero behavioral change (both already isolate correctly). The builder appropriately flagged it as the J5 follow-on alternative. NO escalation needed; NO files_to_modify amendment required to merge this item.

## Expected merge conflicts

None. `git merge-tree` against current origin/main produces zero conflict markers. The branch only adds new files in `tools/review-queue/` + `schemas/`, edits to the two canonical skills + their two synced adapters, and additive copy-the-dependency lines in 7 vitest fixtures — none of which current main has touched concurrently.

## Pre-merge fixups

None required. At Step C5 the new `check-coupled-invariants.sh` will run; it passes on the merged tree (verified standalone, exit 0). Standard merge-and-cleanup verification (npm test/lint/typecheck/sync --check) is green.

## Follow-up items (defer, do not block merge)

- **AC5 wiring follow-on** (strategist After-Completion #3): ship `classify-finding-provenance.py` + wire into `review-queue-watch.md`'s reframe gate.
- **J5 cosmetic de-dup follow-on** (optional): if desired, convert the watcher Step 0 + merger Step B inline preambles to source `_clean-snapshot.sh` in a follow-on item that lists `skills/review-queue-watch.md` in files_to_modify. Behavior-neutral; purely removes the remaining two copies. Not required for correctness.
- **Deferred siblings #6 (ECHO semantic/field-scoped recall fallback) and #7 (process-ancestry before incident framing)** — file as separate V1.5+ items per After-Completion notes.
- Strategist post-shipment: record decision in `raw/internal/decisions/`, update `wiki/operating-model/`, regen manifest/index.
