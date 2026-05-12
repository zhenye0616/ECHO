---
backlog_item: 2026-05-12-041-reviewer-background-execution
agent_run_started: 2026-05-12T11:30:00Z
agent_run_ended: 2026-05-12T15:20:00Z
status: ready_for_review
test_status: passing
branch: agent/reviewer-background-execution
head_sha: 90c77b305283853a357a425481c59a44afce5e00
---

# Agent Run: Reviewer background execution (Codex launchd + mechanical validation)

## What I Implemented

Closed the 040 "founder activation friction" gap by:

1. **Unattended Codex reviewer ticks via launchd.** A wrapper script + install/status/uninstall trio writes `~/Library/LaunchAgents/com.echo.review-queue-codex.plist` with a 10-min `StartInterval`. After one install, the founder never types `codex exec` for review work again.
2. **Mechanically-enforced reviewer-emission validation.** A new `commit-reviewer-response.sh` helper sits between every reviewer's response file and `git add`. It runs `tools/review-queue/validate.py reviewer <path>` first; on validation failure it quarantines the malformed file to `<path>.invalid.<ISO-ts>` (so the canonical poll regenerates next tick) and appends a `VALIDATION-FAIL:` row to `raw/internal/queue-errors.md`. Both Codex and Cursor reviewer slash-commands now invoke this helper as their canonical commit path.
3. **Cursor degradation policy documented as steady-state.** `docs/review-queue-setup.md` now treats `single_reviewer_timeout` on a Cursor-absent round as expected behavior, not a defect.
4. **Setup-doc rewrite.** `docs/review-queue-setup.md` made launchd the macOS primary recipe; the old broken `--sandbox workspace-write --ask-for-approval never` invocation is gone.
5. **Scoped `atom_id` → `id` audit.** `backlog/_followups.md:410` corrected; historical journal narrations left intact (they document the bug itself, not stale guidance); one wiki match flagged for strategist post-merge wiki promotion (AGENT_INSTRUCTIONS rule 6 — builders don't edit `wiki/`).

## Files Modified

| Path | Type | Lines |
|---|---|---|
| `tools/review-queue/run-codex-reviewer.sh` | new | ~70 |
| `tools/review-queue/install-codex-reviewer-launchd.sh` | new | ~95 |
| `tools/review-queue/status-codex-reviewer-launchd.sh` | new | ~30 |
| `tools/review-queue/uninstall-codex-reviewer-launchd.sh` | new | ~25 |
| `tools/review-queue/commit-reviewer-response.sh` | new | ~95 |
| `tools/review-queue/smoke-test-codex-runner.sh` | new | ~160 |
| `tests/review-queue/commit-reviewer-response.test.ts` | new | ~205 |
| `.claude/commands/review-queue-codex.md` | modified | Step 5 + Step 6 rewritten |
| `.claude/commands/review-queue-cursor.md` | modified | Step 5 + Step 6 rewritten |
| `docs/review-queue-setup.md` | rewritten | full rewrite |
| `backlog/_followups.md` | modified | line 410 `get_atom` placeholder corrected |

Branch: `agent/reviewer-background-execution`
HEAD: `90c77b305283853a357a425481c59a44afce5e00`

## Decisions Made During Implementation

### Decision 1: Wrapper invokes `codex exec --sandbox danger-full-access`

- **Source of decision:** AC3 of the item, pinned by R3 convergence. The prior recipe used `--sandbox workspace-write` which denied `.git/FETCH_HEAD` writes on macOS and was the root cause of the 039 AC0 sandbox-recipe failure.
- **Permission gate hit during implementation:** the harness flagged the `danger-full-access` literal string when writing `run-codex-reviewer.sh`. Asked founder for explicit approval; founder approved option 1 (write the file as specced). The wrapper itself only runs under launchd in a separate process, not in-session.

### Decision 2: `--smoke` flag fires both the real launchd job AND the isolated smoke

- **Reasoning:** AC2 says `--smoke` should `launchctl kickstart -k` (so `RunAtLoad=false` does not strand the job until the first 600s boundary). AC5 says the install script "offers to run AC5 automatically post-install with a `--smoke` flag." Folded both into the single `--smoke` flag: step 1 kickstarts the real job, step 2 runs the isolated AC5 smoke.
- **Trade-off considered:** could split into `--kickstart` vs `--smoke`, but the spec uses one flag name in both ACs. Single flag honors the spec literally and keeps founder ergonomics simple.

### Decision 3: AC4 helper resolves `python3` via the same `arch -arm64 python3` fallback used in `tests/review-queue/_helpers.ts`

- **Reasoning:** the validator imports `jsonschema` + `yaml`; on Apple Silicon under vitest's x86_64 node, direct `python3` may inherit the x86_64 arch and fail to load arm64 wheels. The helper runs in shell, but launchd's `PATH` is also stripped down; mirroring the test-helper fallback keeps the resolution rule consistent across both call sites.

### Decision 4: AC7 wiki match left for strategist post-merge

- **The match:** `wiki/operating-model/cross-tool-spec-review.md:140` — `[[mcp-get-atom|`get_atom(<elided_atom_id>)`]]` placeholder.
- **Why not edited:** AGENT_INSTRUCTIONS rule 6 says builder agents do not edit `wiki/`. CLAUDE.md says strategist edits wiki post-shipment only. The After Completion §2 of this item already lists wiki updates as strategist work. I treated the no-wiki-write rule as the higher-priority constraint and flagged the match here for strategist post-merge action.
- **What I did do:** corrected the same placeholder in `backlog/_followups.md:410` (which is not under wiki). Added a "Reviewer-prompt contract — `get_atom` parameter name" section to `docs/review-queue-setup.md` so forward-looking guidance is clear in the canonical setup doc.
- **Verification:** post-edit `git grep -nE 'get_atom\([^s].*atom_id'` shows 5 residual matches, all journal entries (lines 2658, 2674, 2688, 2702 — three are narrative observations of the bug; 2658 explicitly annotates the wrong shape; rewriting historical journal entries would falsify the record). Last residual is the wiki match above. None match the "stale forward-looking guidance" pattern AC7 targets.

### Decision 5: Test file has 2 it() blocks, not 1

- **Spec said:** "+1 to the review-queue baseline (was 46 at 040 merge, becomes 47)." Read this as +1 test-area, not +1 test case.
- **Why two cases:** AC4's Test list explicitly enumerates two paths: "accepts valid response; rejects malformed YAML with non-zero exit + queue-errors.md row." A single `it()` covering both would be tangled. Both new cases pass.
- **Net count:** review-queue total = 48 (47 pass + 1 known-fail concurrency:133). Pre-041 was 47 (46 pass + 1 known-fail). Delta = +2 cases, not +1 — flagging for reviewer.

### Decision 6: AC3 verification deferred to founder

- **Spec says:** "AC3 is verified by AC5 running successfully end-to-end on the founder's actual machine."
- **In-session call:** asked founder; founder chose option 2 (founder runs the smoke themselves after merge). AC3 is therefore "structurally satisfied" by AC1's flag-pinning + AC5's existence; end-to-end verification is the founder's first post-merge action via `tools/review-queue/smoke-test-codex-runner.sh`.

## Acceptance Criteria Status

- **AC1 — `run-codex-reviewer.sh`** — ✅ implemented. `set -euo pipefail`; `${ECHO_REVIEW_QUEUE_REPO_ROOT}` env-var with production-path default; PATH augmentation; pinned `codex exec -C ... --sandbox danger-full-access - < <prompt>` invocation; unified log at `~/Library/Logs/echo-review-queue-codex.log` with 10MB rotation; one-line preamble per tick; codex exec rc passthrough; chmod +x; bash -n syntax check passes.
- **AC2 — launchd plist + install/status/uninstall** — ✅ implemented. Plist has `<key>Label</key><string>com.echo.review-queue-codex</string>` as first key in the top-level dict; `StartInterval=600`; `RunAtLoad=false`; `KeepAlive=false`; std streams to `/dev/null` (wrapper owns logging). Install detects macOS Sonoma+ via `sw_vers -productVersion` and uses `launchctl bootstrap gui/<uid>` + `bootout` pair; falls back to `launchctl load -w` + `unload` pair on older macOS. `--smoke` fires `launchctl kickstart -k gui/<uid>/com.echo.review-queue-codex` (step 1) and then the AC5 isolated smoke (step 2). Install/status/uninstall all idempotent.
- **AC3 — verified Codex invocation pinned** — ✅ structurally; AC5 end-to-end run deferred to founder (see Decision 6). Flag set verbatim in wrapper: `--sandbox danger-full-access`, no `--ask-for-approval`, `<` redirection.
- **AC4 — mechanically-enforced reviewer output validation** — ✅ implemented. `commit-reviewer-response.sh` signature matches spec verbatim. Validation failure path: quarantines via `mv <path> <path>.invalid.<ISO-ts>`, appends `<ts> VALIDATION-FAIL: <reviewer> r<N> on <item_id> moved_to=<...> diagnostic=<...>` to `raw/internal/queue-errors.md`, exits non-zero, no git ops. Success path: `git add` → `git commit -m "review-r<N>: <reviewer> on <item_id>"` → `push-with-retry.sh`. Both reviewer slash-commands rewritten to invoke this helper in Step 5; Step 6 journal write conditioned on helper exit 0.
- **AC5 — synthetic-request smoke test** — ✅ implemented. `mktemp -d` for working repo and bare origin; both initialized with `git init -b main` (with `symbolic-ref` fallback for older git); pinned item_id `2026-05-12-999-smoke-test-synthetic`; full repo-relevant subset copied (`.claude/commands/`, `tools/review-queue/`, `backlog/ready/<synthetic>.md`, `backlog/reviews/<synthetic>/r1/request.md`); wrapper invoked via `ECHO_REVIEW_QUEUE_REPO_ROOT="$SMOKE_WORK" HOME="$SMOKE_HOME"`. Hard isolation assertions: remote URL equality (`git remote get-url origin == $SMOKE_ORIGIN`), single-remote (`git remote == "origin"`), production URL absent from `.git/config`. Functional: `codex.md` produced, validates against `reviewer.schema.json`, HEAD commit message matches contract. Advisory production-repo delta logged but not pass/fail. Both tmpdirs cleaned in `trap cleanup EXIT`.
- **AC6 — Cursor degradation policy documented** — ✅. Setup doc has a dedicated "Steady-state property" section: Cursor ticks only when IDE open with the paste-once-self-loop running; `single_reviewer_timeout` on Cursor-absent is expected, not a defect; strategist's per-round call documented; graceful-degradation framing explicit; manual paste-per-round preserved as fallback; explicit no-keyboard-automation note.
- **AC7 — scoped `atom_id` → `id` audit** — ✅ for non-wiki paths. `backlog/_followups.md:410` placeholder corrected to `get_atom({id: <elided-atom-id>})`. Setup doc gained an explicit "Reviewer-prompt contract — `get_atom` parameter name" section. One wiki match (`wiki/operating-model/cross-tool-spec-review.md:140`) left for strategist post-merge wiki promotion per AGENT_INSTRUCTIONS rule 6. Historical journal narrations untouched (they document the bug). Post-edit grep verified.
- **AC8 — observational** — pending. Empirically measured by strategist on the first qualifying spec to enter the queue post-041 merge. Baseline = 5 activations per 3-round cycle; target = 0–1.

## Tests Run

```
> echo-daemon@0.0.0 test
> vitest run tests/review-queue/

 ✓ tests/review-queue/request.test.ts (7 tests)
 ✓ tests/review-queue/e2e.test.ts (1 test)
 ✓ tests/review-queue/watcher-state.test.ts (4 tests)
 ✓ tests/review-queue/combine.test.ts (14 tests)
 ❯ tests/review-queue/concurrency.test.ts (7 tests | 1 failed)
   × orphan .tmp.* older than 30 min is cleaned up by combine.py
     expected true to be false
 ✓ tests/review-queue/schemas.test.ts (13 tests)
 ✓ tests/review-queue/commit-reviewer-response.test.ts (2 tests)
   ✓ valid response: validates, commits, and pushes to origin
   ✓ malformed response: quarantines file, appends queue-errors row, exits non-zero, never commits

 Test Files  1 failed | 6 passed (7)
      Tests  1 failed | 47 passed (48)
```

The one failure is `concurrency.test.ts:133`, the pre-existing test-fixture clock-mismatch bug called out in the 041 spec as "remains pre-existing red until its separate test-fix item lands." Out of 041 scope.

Typecheck: clean. Lint: clean.

## Open Questions for Founder

1. **AC3 end-to-end verification.** Founder chose to run `tools/review-queue/smoke-test-codex-runner.sh` post-merge as the AC3 verification. Please run it before installing the launchd job against production.
2. **AC7 wiki residue.** `wiki/operating-model/cross-tool-spec-review.md:140` still has `get_atom(<elided_atom_id>)`. Builder did not edit `wiki/` per AGENT_INSTRUCTIONS rule 6; strategist post-merge wiki promotion is the natural fix.
3. **AC4 test count.** Spec said "+1 to the review-queue baseline"; I added 2 cases (one per acceptance path in AC4's Test list). Net delta is +2, not +1. Flagging for reviewer; happy to consolidate to one `it()` block if requested.
4. **`node_modules` symlink in the worktree.** I symlinked `node_modules` from the main repo so vitest could resolve. The symlink is ignored by git (`.gitignore` covers `node_modules`); not committed. Founder may delete it when cleaning up the worktree.

## Anything I Almost Did But Stopped Myself

- Considered editing `wiki/operating-model/cross-tool-spec-review.md:140` directly to close AC7 fully. Stopped — AGENT_INSTRUCTIONS rule 6 is hard, and the After Completion section already routes wiki updates through the strategist. Documented the match instead.
- Considered rewriting historical journal entries that mention `get_atom({atom_id: ...})`. Stopped — those entries narrate the bug as observed (the journal is "lossy in the moment" historical record per CLAUDE.md). Rewriting them would falsify the record. AC7's "where the reference is to the `get_atom` MCP tool's parameter" scope excludes historical observations.
- Considered adding a `--dry-run` flag to `commit-reviewer-response.sh` so the test suite could exercise validation without commit/push. Stopped — not in AC4. The test instead runs the helper against an isolated repo with a local bare origin (the same isolation pattern the AC5 smoke uses).

## Next Suggested Backlog Items (Don't Auto-Create)

- **Test-fixture clock-mismatch fix for `tests/review-queue/concurrency.test.ts:133`** (already known; spec calls it out as a separate item).
- **Wiki-side `atom_id` → `id` audit completion** — strategist post-merge step from the After Completion notes; could be folded into the same wiki-promotion commit.
- **`docs/BACKLOG.md` cleanup** (Codex flagged stale rows post-040; out of 041 scope per the spec).
