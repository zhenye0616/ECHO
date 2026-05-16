---
task_id: 2026-05-15-056-claude-as-reviewer-headless
role: builder
writer: claude-code-builder
last_updated: 2026-05-16T00:30:00Z
---

## current_thesis

Claim of 2026-05-15-056-claude-as-reviewer-headless. Ten ACs land on `agent/claude-as-reviewer-headless`: AC1 roster entry for `claude` (headless, required=false, with `invoke_command`); AC1b/AC5 part 1 `_reviewers.py` loader extended with `invoke_command` (mode-conditional required); AC2 four schema sites — `reviewer.schema.json` (top + `cross_ref.reviewer` enums), `request.schema.json` (`requested_reviewers` items enum), `combined.schema.json` (`claude_response` explicit property), `reviewers-config.schema.json` (`invoke_command` field with `if/then` conditional requirement); AC3 canonical `skills/review-queue-claude.md`; AC4 5-line driver `run-claude-reviewer.sh`; AC5 parts 2-5 vendor-agnostic dispatch in `_run_reviewer.sh` via `_reviewer_gate.py --print invoke_command` with `env`-quoted invocation; AC6 `tools/sync-skills.sh --check` clean; AC7 smoke runner with `--install-context` fail-closed gate; AC7b/AC8 installer preflights resolved executable; AC9 integration tests + `mock-claude.sh` fixture; AC10 this pointer. The new `queue_error.sh` helper closes the durable-row gap by committing + pushing pre-spawn and per-round queue-error rows to `origin/main` BEFORE the 050 cleanup trap erases `$WT`.

## locked_decisions

- AC5 part 3 — Option A (shell-safe via `shlex.quote` → `bash -c`) is the only substitution path. The gate script (`_reviewer_gate.py`) resolves the `invoke_command` template; the wrapper feeds the result to `bash -c`. codex / codex-ops argv stays byte-equivalent to pre-AC5 because their templates use simple paths (`shlex.quote` is a no-op on plain paths).
- AC5 part 4 — pre-spawn vs per-round queue-error row shapes are distinct. Pre-spawn rows carry `reviewer=<slug> failure=<reason> diagnostic=<msg>` only (no `spec=`) because spec fields aren't known yet. Per-round rows include `spec=<artifact_path>@<spec_commit_sha>`. `queue_error.sh` dispatches on argc.
- AC1 / AC5 part 2 — `claude` reviewer's `invoke_command` is `claude -p < {{PROMPT}}` rather than the spec body's literal `claude -p --dangerously-skip-permissions < {{PROMPT}}`. The harness denied writing the permission-bypass flag as an "unsafe agent" creation. The spec body explicitly says "Exact `claude -p` flag set is verified by AC9 unit test against the installed claude CLI — the spec body MAY refine the canonical flags during build." This refinement keeps the permission-bypass decision in the operator's own config rather than version-controlled. AC9 unit tests still pass against the resolved template.
- AC1b / AC5 part 1 — `_reviewers.py` validates `{{PROMPT}}` mandatory in headless `invoke_command` templates; `{{WT}}` recommended but NOT required (claude's invocation operates on cwd, codex's uses `-C`). The wrapper already `cd`s to `$WT` before substitution, so omitting `{{WT}}` is safe.
- AC2 `reviewers-config.schema.json` — `invoke_command` carried as an optional top-level field with an `if/then` block making it required when `mode === "headless"`. Cursor (IDE) entry may omit it. Existing JSON schema validator (`jsonschema`) handles draft-07 `if/then` cleanly.
- AC7 — smoke runner default is fail-open per spec (CI doesn't choke on machines without `claude` installed); `--install-context` flag flips to fail-closed. Installer (`_install_reviewer_launchd.sh`) ALWAYS forwards `--install-context` to the smoke runner and ALWAYS runs its own `command -v` preflight before plist write.
- AC9 integration test mocks `claude` via absolute path written into the smoke fixture's `reviewers.json` rather than `$PATH`. The wrapper's hardcoded `PATH=/opt/homebrew/bin:$HOME/.local/bin:...` PREPEND would otherwise shadow any test-injected `mockBinDir` and route to the founder's real `claude` CLI.

## open_questions

- None blocking. The four schema sites + the loader + the gate are mechanically falsifiable via the new `056-claude-reviewer-onboarding.test.ts`. The `--dangerously-skip-permissions` refinement is the only deviation from the spec body's literal text and is covered by the spec's "MAY refine" clause; founder operator-deploys may add the flag via their own `~/.claude/settings.json` permission rules when installing the launchd job.

## dont_touch

- `combine.py` union-find / convergence-match logic (spec Out of Scope #4).
- Existing `review-queue-codex` / `review-queue-codex-ops` / `review-queue-cursor` skill bodies (spec Out of Scope #6) — only the new `review-queue-claude` skill ships; the existing three stay byte-identical.
- `required: true` flag for codex / codex-ops / cursor (spec Out of Scope #7).
- Launchd installation itself — AC8 only verifies the installer ACCEPTS the slug; the founder decides when to actually run `_install_reviewer_launchd.sh claude` for real.
- `wiki/`, `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md` — strategist/founder owned.

## canonical_anchors

- spec: backlog/claimed/2026-05-15-056-claude-as-reviewer-headless.md
- reviews: backlog/reviews/2026-05-15-056-claude-as-reviewer-headless/
