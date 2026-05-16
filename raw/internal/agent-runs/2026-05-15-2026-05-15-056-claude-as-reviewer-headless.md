# Run log — 2026-05-15-056-claude-as-reviewer-headless

## Run 1 (2026-05-16T00:18:46Z — 2026-05-16T00:50:00Z)

**Agent persona:** `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405` (Claude Code, file-based UUID)
**Branch:** `agent/claude-as-reviewer-headless`
**Worktree:** `~/Desktop/Project_echo--claude-as-reviewer-headless/`
**Head SHA at handoff:** `a5105a882398afbd431a5a5284857f251c378966`

### What I implemented (this attempt)

Closed all 10 acceptance criteria of the spec:

- **AC1 — roster entry.** Appended `claude` to `tools/review-queue/reviewers.json` with `mode:headless`, `required:false`, `timeout_hours:null`, `slash_command:review-queue-claude`, and an `invoke_command` template. Also added `invoke_command` to the existing codex + codex-ops headless entries (cursor remains without it — IDE-mode by design).
- **AC1b / AC5 part 1 — loader extension.** `tools/review-queue/_reviewers.py` `Reviewer` NamedTuple now carries `invoke_command: str | None = None`. Loader conditionally requires it for `mode=headless` (must be a non-empty string containing the `{{PROMPT}}` token; `{{WT}}` recommended but not required).
- **AC1b / AC5 part 1b — gate extension.** `tools/review-queue/_reviewer_gate.py` accepts `--print invoke_command` and resolves the template via `shlex.quote` (Option A: shell-safe substitution). IDE-mode reviewers under `--print invoke_command` exit non-zero with the documented `IDE-mode reviewer <slug> has no invoke_command` diagnostic. Default `--print slash_command` mode preserves byte-equivalent back-compat with the 043 contract.
- **AC2 — schema sites.** Four files moved together: `reviewer.schema.json` top `reviewer` enum + `findings[].cross_ref.reviewer` enum gain `claude`; `request.schema.json` `requested_reviewers` items enum gains `claude`; `combined.schema.json` adds the explicit `claude_response: { type: ["string", "null"] }` property; `reviewers-config.schema.json` adds the `invoke_command` field with an `if/then` block making it required when `mode === "headless"`.
- **AC3 — canonical skill.** `skills/review-queue-claude.md` written mirroring `skills/review-queue-codex.md`'s seven-step shape with Claude's distinct reviewer voice (conceptual/architectural drift, scope-creep, ECHO-domain wisdom). Step 3's SHA-drift path uses the new `queue_error.sh` helper to durably commit + push the per-round queue-error row before the wrapper cleanup trap erases `$WT`.
- **AC4 — driver.** `tools/review-queue/run-claude-reviewer.sh` is the standard 5-line `exec env REVIEWER_NAME=claude $TOOL_DIR/_run_reviewer.sh` driver; executable bit set.
- **AC5 parts 2-5 — vendor-agnostic dispatch.** `_run_reviewer.sh` no longer hardcodes `codex exec`. Per-tick flow:
  1. Resolve `invoke_command` via `env WT=… PROMPT=… python3 _reviewer_gate.py --print invoke_command`. (Note: the `env` prefix is required because bash's `VAR=val INVOKE_CMD=$(…)` syntax does NOT propagate env vars when the right-hand side is itself an assignment. Found via failed test run; fixed.)
  2. `command -v` preflight on the first whitespace-token of the resolved string.
  3. Failures (template missing token, IDE-mode, executable absent) route through the new `tools/review-queue/queue_error.sh` helper, which appends a pre-spawn row (`reviewer=<slug> failure=<reason> diagnostic=<msg>` — no spec fields) and commits + pushes it via `push-with-retry.sh` BEFORE the 050 cleanup trap fires.
  4. On success, the resolved command runs via `bash -c "$INVOKE_CMD"` (shell-redirection works because the template's `< {{PROMPT}}` is intentionally interpreted by the shell). codex / codex-ops argv stays byte-equivalent to pre-AC5 because their templates use simple paths (no shlex-quote diff).
- **AC6 — sync clean.** `tools/sync-skills.sh` re-runs cleanly; `--check` passes. (No codex adapter needed for `review-queue-claude.md` — it has no `## Binding-specific notes — codex` section, so the codex adapter dir intentionally stays empty for this skill.)
- **AC7 — smoke runner.** `tools/review-queue/smoke-test-claude-runner.sh` sibling shape to `smoke-test-codex-runner.sh`, with a `--install-context` flag that flips fail-open (default) to fail-closed. Hard isolation assertions match the codex smoke. No-response variant tolerated when the real `claude` CLI lacks unattended permission config.
- **AC7b / AC8 — installer preflight.** `_install_reviewer_launchd.sh` now resolves `invoke_command` via the gate's `--print invoke_command`, extracts the first whitespace-token (executable name), runs `command -v` BEFORE plist write, and refuses to install when the CLI is missing. Always forwards `--install-context` to the smoke runner so the smoke leg fails-closed when invoked from the installer.
- **AC9 — integration tests.** `tests/review-queue/056-claude-reviewer-onboarding.test.ts` plus `tests/review-queue/fixtures/mock-claude.sh`. 16 falsifications across loader, gate, schemas, queue-error row shapes, install preflight, smoke fail-open / fail-closed, and end-to-end mock invocation via `ECHO_REVIEWERS_CONFIG`-routed roster. The end-to-end tests run in 5-6 sec each with the mock; defensive precondition asserts the resolved invoke_command points at the mock binary BEFORE invoking the wrapper, so a routing miss can never silently fall through to the founder's real `claude` CLI (this happened once during development — the wrapper hung for 50+ minutes consuming real API tokens against the founder's actual claude session). All 16 tests pass.
- **AC10 — builder.md.** `backlog/task-state/2026-05-15-056-claude-as-reviewer-headless/builder.md` written to the 046 AC1 schema, lints clean via `tools/task-state/lint.py`.

### Files modified

Branch `agent/claude-as-reviewer-headless` head sha `a5105a882398afbd431a5a5284857f251c378966`.

In files_to_modify list (spec-prescribed):

- `tools/review-queue/reviewers.json` — +21 -3
- `tools/review-queue/_reviewers.py` — +29 -3
- `tools/review-queue/schemas/reviewer.schema.json` — +2 -2
- `tools/review-queue/schemas/request.schema.json` — +1 -1
- `tools/review-queue/schemas/combined.schema.json` — +3 -0
- `tools/review-queue/schemas/reviewers-config.schema.json` — +15 -2
- `skills/review-queue-claude.md` — new, 157 lines
- `.claude/commands/review-queue-claude.md` — new, 157 lines (synced via tools/sync-skills.sh)
- `tools/review-queue/run-claude-reviewer.sh` — new, 5 lines, +x
- `tools/review-queue/_run_reviewer.sh` — +50 -7 (dispatch + queue-error error paths)
- `tools/review-queue/smoke-test-claude-runner.sh` — new, 195 lines, +x
- `tools/review-queue/_install_reviewer_launchd.sh` — +43 -3 (preflight + --install-context forward)
- `tests/review-queue/056-claude-reviewer-onboarding.test.ts` — new, ~580 lines
- `tests/review-queue/fixtures/mock-claude.sh` — new, 110 lines, +x
- `backlog/task-state/2026-05-15-056-claude-as-reviewer-headless/builder.md` — new

Additional files modified (consequential cleanup — NOT in spec's files_to_modify but required to keep pre-existing tests green under the new loader contract):

- `tests/review-queue/n-reviewer-framework.test.ts` — duplicate-slug fixture gains invoke_command so duplicate-slug is the first failure mode, not missing invoke_command.
- `tests/review-queue/045-smoke-gate-fail-closed.test.ts` — synthetic mock-reviewer fixture gains invoke_command.
- `tests/review-queue/default-deploy-baseline.test.ts` — expected combined.md now includes `claude_response: null` (combine.py emits `<slug>_response:` for every roster entry; adding claude to the default deploy roster adds the line).

New file added that was NOT in files_to_modify but is essential to AC5 part 4's "durable queue-error" requirement:

- `tools/review-queue/queue_error.sh` — new helper, 75 lines, +x. The AC5 part 4 contract requires queue-error rows to commit + push to origin/main BEFORE the cleanup trap erases $WT; this helper is the single entry point referenced by both `_run_reviewer.sh` (pre-spawn) and the claude reviewer skill body (per-round). The spec did not list this file by name but the implementation hint at AC5 part 4 said: *"Implementation hint: write a small helper `tools/review-queue/queue_error.sh <reason> <diagnostic>` (or extend `commit-reviewer-response.sh` with an `--error <reason>` mode) so the wrapper has a single entry point."* I chose the standalone helper variant for cleaner separation from commit-reviewer-response.sh.

### Decisions made

1. **`claude -p < {{PROMPT}}` instead of `claude -p --dangerously-skip-permissions < {{PROMPT}}`.** The spec body shows the latter as the canonical template. The harness denied the Write tool when the JSON contained `--dangerously-skip-permissions` as creating an "unsafe agent." The spec explicitly allows refinement (*"Exact `claude -p` flag set is verified by AC9 unit test against the installed claude CLI — the spec body MAY refine the canonical flags during build."*). I chose to ship the simpler form and document the operator-time config requirement, rather than escalate. The integration test asserts the resolved template against the schema, not the literal flag set, so AC9 passes either way.
2. **`queue_error.sh` as standalone helper rather than `commit-reviewer-response.sh --error` extension.** The spec offered both options. Standalone keeps the existing commit-reviewer-response.sh helper's single-responsibility shape (validate + commit + push for reviewer responses) and avoids overloading its flags. The new helper is callable from both the wrapper (pre-spawn) and skill bodies (per-round) with the same dispatch logic.
3. **Defensive precondition probe in AC9 end-to-end tests.** During development, a routing miss caused the wrapper to invoke the founder's REAL claude CLI for 50+ minutes (consuming real API tokens) instead of the mock. I added a precondition probe that runs `python3 _reviewer_gate.py --print invoke_command` against the smoke fixture's roster with `ECHO_REVIEWERS_CONFIG` pointing at the smoke repo's reviewers.json, asserting the output contains the mock's absolute path BEFORE invoking the wrapper. If the env-routing breaks, the test fails fast instead of running for an hour.
4. **PATH-based mock dispatch ruled out, ECHO_REVIEWERS_CONFIG-routed roster chosen instead.** The wrapper's hardcoded PATH augmentation (`/opt/homebrew/bin:$HOME/.local/bin:…`) prepends the founder's real claude binary BEFORE any test-injected `$mockBinDir`. PATH manipulation is the wrong primitive. Instead, the test rewrites the smoke fixture's reviewers.json to use the absolute mock path, then sets `ECHO_REVIEWERS_CONFIG` so the gate's `_lib.REVIEWERS_CONFIG` lookup reads the smoke roster. Reliable; matches the production routing path.

### Acceptance criteria status

| AC | Status |
|---|---|
| AC1 — reviewers.json claude entry | ✅ |
| AC2 — four schema sites | ✅ |
| AC3 — skills/review-queue-claude.md | ✅ |
| AC4 — run-claude-reviewer.sh 5-line driver | ✅ |
| AC5 part 1 — _reviewers.py loader + invoke_command field | ✅ |
| AC5 part 2 — reviewers.json invoke_command for all headless | ✅ |
| AC5 part 3 — shell-safe substitution (Option A) | ✅ |
| AC5 part 4 — queue-error durable persistence | ✅ |
| AC5 part 5 — backwards-compat (codex/codex-ops argv equivalence) | ✅ — asserted by argv-snapshot regression test |
| AC6 — tools/sync-skills.sh --check clean | ✅ |
| AC7 — smoke runner fail-open / fail-closed | ✅ |
| AC7b — installer accepts --install-context + preflights | ✅ |
| AC8 — installer accepts claude slug | ✅ (preflight tested; real launchd install deferred to founder per spec) |
| AC9 — 16-falsification integration test | ✅ all 16 pass |
| AC10 — builder.md per 046 AC1 schema | ✅ lints clean |

### Test results

`npm run lint` and `npm run typecheck` both clean.
`npx vitest run tests/review-queue/` — 136/136 pass in ~22 sec.

### Open questions for founder

None blocking. The `--dangerously-skip-permissions` deviation is the one item that may warrant founder review at merge time:

- If founder considers the literal spec text load-bearing, a one-line edit to `tools/review-queue/reviewers.json` to add `--dangerously-skip-permissions` after merge would land it (and may need a permission rule in `.claude/settings.local.json` to allow the write).
- If founder accepts the deferred-to-operator-config posture, no action needed; the operator handles permission-bypass via their own Claude Code settings at install time.

### Drift events

None. The deviations above are documented and traceable to spec language ("MAY refine"); they aren't drift.

### Resumed-state notes

N/A — first attempt.
