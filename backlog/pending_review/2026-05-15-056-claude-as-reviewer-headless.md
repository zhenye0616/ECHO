---
id: 2026-05-15-056-claude-as-reviewer-headless
title: Claude-as-reviewer headless onboarding — fourth reviewer slug end-to-end (roster + schemas + skill + vendor-agnostic wrapper)
status: ready
priority: HIGH
estimate: 1-1.5d
created: 2026-05-15
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-16T00:18:46Z"
branch: "agent/claude-as-reviewer-headless"
head_sha: "a5105a882398afbd431a5a5284857f251c378966"
pr_url: ""
task_state_ref: 2026-05-15-056-claude-as-reviewer-headless
agent_notes: |
  All 10 ACs implemented on agent/claude-as-reviewer-headless (head a5105a8). 136/136 review-queue tests pass; lint + typecheck clean. The new reviewer slug works end-to-end: schemas, roster, loader, gate, skill, driver, wrapper dispatch, queue-error helper, smoke runner, installer preflight, and 16-falsification integration test with mock-claude fixture.

  Three pre-existing tests needed mechanical fixture updates because the loader contract changed (invoke_command required for headless reviewers): n-reviewer-framework.test.ts duplicate-slug fixture, 045-smoke-gate-fail-closed.test.ts synthetic mock-reviewer entry, default-deploy-baseline.test.ts expected combined.md now includes `claude_response: null`. Documented in commit body + builder.md.

  Spec deviation worth flagging: reviewers.json's claude invoke_command is `claude -p < {{PROMPT}}` rather than the literal `claude -p --dangerously-skip-permissions < {{PROMPT}}` in the spec body. The harness denied writing the permission-bypass flag as an "unsafe agent" creation. Per the spec's "exact claude -p flag set is verified by AC9 unit test against the installed claude CLI — the spec body MAY refine the canonical flags during build" clause, this defers the operator's permission-bypass decision to install-time config. Founder may add `--dangerously-skip-permissions` (or equivalent) via their own `~/.claude/settings.json` permission rules when activating the launchd job.
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  # AC1 — roster entry
  - tools/review-queue/reviewers.json
  # AC1b — roster loader must accept the new invoke_command field (r1 codex F1 + codex-ops F4 HIGH convergent)
  - tools/review-queue/_reviewers.py
  # AC2 — schema enum extensions (the 3-file manual-sync rule per 043 R1 HIGH #5)
  - tools/review-queue/schemas/reviewer.schema.json
  - tools/review-queue/schemas/request.schema.json
  # AC2b — additional schema surface uncovered by r1 codex F2 HIGH (combined.schema.json + cross_ref.reviewer enum)
  - tools/review-queue/schemas/combined.schema.json
  - tools/review-queue/schemas/reviewers-config.schema.json  # add invoke_command field validation
  # AC7b — installer must accept --install-context (r2 codex F2 + codex-ops F3 convergent HIGH)
  - tools/review-queue/_install_reviewer_launchd.sh
  # AC3 — canonical Claude reviewer skill body
  - skills/review-queue-claude.md
  - .claude/commands/review-queue-claude.md       # synced from skills/ via tools/sync-skills.sh
  - adapters/codex/skills/review-queue-claude/SKILL.md  # synced from skills/ via tools/sync-skills.sh
  # AC4 — 5-line vendor driver
  - tools/review-queue/run-claude-reviewer.sh
  # AC5 — _run_reviewer.sh vendor-agnostic invoke dispatch
  - tools/review-queue/_run_reviewer.sh
  # AC7 — smoke runner (optional but standard)
  - tools/review-queue/smoke-test-claude-runner.sh
  # AC9 — integration tests (n-reviewer-framework extension + claude-specific)
  - tests/review-queue/056-claude-reviewer-onboarding.test.ts
  - tests/review-queue/fixtures/mock-claude.sh
  # AC10 — builder pointer per 046 AC1 task-state schema
  - backlog/task-state/2026-05-15-056-claude-as-reviewer-headless/builder.md
spec_refs:
  - backlog/complete/2026-05-13-043-per-round-reviewer-roster.md  # The roster + schema generalization that 056 extends. 043 made `request.requested_reviewers` the per-round source of truth and shipped `reviewers.json`. 056 adds the fourth roster entry and exercises the schema-sync rule the reviewers-config preamble flags.
  - backlog/complete/2026-05-13-047-codex-as-builder-binding-adapter.md  # Sibling pattern for adding a new vendor binding. 047 added codex-as-builder; 056 adds claude-as-reviewer. The wrapper-shape conventions (PATH augmentation, log file + rotation, repo-root resolution, sandbox flag) are reused from `_run_reviewer.sh` / `run-codex-builder.sh`.
  - backlog/complete/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md  # AC5 reference. 050 enshrined the ephemeral-worktree lifecycle that `_run_reviewer.sh` enforces for all headless reviewers. The Claude reviewer must inherit this lifecycle unchanged.
  - tools/review-queue/_run_reviewer.sh  # AC5 touch. Line 140 hardcodes `codex exec -C "$WT" --sandbox danger-full-access - < "$PROMPT"`. AC5 genericizes via a new roster field `invoke_command` (or a per-driver-overridable function) so the same wrapper body fires Claude OR Codex without per-vendor branches.
  - tools/review-queue/reviewers.json  # AC1 touch.
  - wiki/operating-model/review-queue-protocol.md  # Diagram context — 056 adds the fourth lane (alongside codex / codex-ops / cursor) to the "REVIEWER" row in the diagram.
---

## Why this spec exists

**The matrix's missing reviewer binding.** Today three reviewers exist (codex, codex-ops, cursor); the empirical dry-run on 2026-05-15 (this session) confirmed every gate that would reject a hypothetical `claude` reviewer:

- `tools/review-queue/schemas/reviewer.schema.json:24-25` — `reviewer` enum `["codex", "cursor", "codex-ops"]` rejects `claude` at validate-time.
- `tools/review-queue/schemas/request.schema.json:48` — `requested_reviewers` items enum same 3-slug restriction.
- `tools/review-queue/reviewers.json` — `_reviewer_gate.py` prints `claude not found in reviewers.json` and exits 1 if invoked.
- `skills/review-queue-claude.md` does not exist; `tools/review-queue/run-claude-reviewer.sh` does not exist.
- `tools/review-queue/_run_reviewer.sh:140` hardcodes `codex exec ... < "$PROMPT"` — even if all the above were fixed, the wrapper would still launch codex instead of claude.

056 closes all five gates in one coordinated change. Claude Code has a headless mode (`claude -p`) that maps cleanly onto the existing `mode: "headless"` reviewer slot — no need for an IDE-mode adapter (that path stays Cursor's lane). The result: builder = `{Claude Code, codex, Cursor's Claude}` (post-055), reviewer = `{codex, codex-ops, cursor, claude}` (post-056). Three out of three review-queue roles get ≥2 vendor bindings.

**The load-bearing piece is AC5.** The wrapper genericization (`_run_reviewer.sh` becomes vendor-agnostic via a roster `invoke_command` field) is the real substrate change. Without it, adding any future reviewer (e.g., a future Gemini binding) requires editing the wrapper. With it, adding a reviewer is roster-only + skill-only + driver-only (no wrapper edit).

## Acceptance Criteria

**AC1 — `tools/review-queue/reviewers.json` gains a `claude` entry.**

Append to the `reviewers` array:

```json
{
  "name": "claude",
  "mode": "headless",
  "required": false,
  "timeout_hours": null,
  "slash_command": "review-queue-claude"
}
```

- `required: false` for the initial deploy — this lets 056's own r1 round set `requested_reviewers: ["codex", "codex-ops"]` (excluding claude) without violating the "all required must respond" invariant. After 056 lands and the binding is empirically validated by AC9's integration test, the founder may flip to `required: true` via a one-line follow-up edit.
- `mode: "headless"` per `claude -p` invocation form. `timeout_hours: null` (headless reviewers must have null timeout per `_reviewers.py:92-106`).
- The reviewers-config schema preamble already flags the manual-sync rule (043 R1 HIGH #5); AC2 closes the sync.

**AC2 — Extend ALL reviewer-slug enum sites + the combined-response schema surface (r1 codex F2 HIGH).**

The "manual-sync rule" preamble in `reviewers-config.schema.json` only named two enum sites; r1 codex review surfaced two more. ALL four must move together:

- `tools/review-queue/schemas/reviewer.schema.json:24-25` — `reviewer` field enum becomes `["codex", "cursor", "codex-ops", "claude"]`.
- `tools/review-queue/schemas/reviewer.schema.json` `findings[].cross_ref.reviewer` enum (second enum site in the same schema) — same 4-slug list. **Without this, no reviewer can legally cross-reference a Claude finding** — convergence-match would fail at validation time.
- `tools/review-queue/schemas/request.schema.json:48` — `requested_reviewers` items enum becomes the same 4-slug list.
- `tools/review-queue/schemas/combined.schema.json` — add `claude_response` property explicitly as `{ oneOf: [{type:string},{type:null}] }` in the additionalProperties:false object. **r2 codex F1 HIGH locks in the explicit-property choice** — `combine.py:_schema_response_fields()` at this SHA discovers response fields ONLY from schema properties enumeration (not via regex matching), so the patternProperties route would require also editing `combine.py`, which Out-of-Scope #4 forbids ("no changes to combine.py's union-find / convergence-match logic"). Pattern-based widening is a V1.5+ followup if more reviewers join; for V1 + claude, explicit property is correct and minimal.
- `tools/review-queue/schemas/reviewers-config.schema.json` — add `invoke_command: { type: string, minLength: 1 }` to the field set, **conditionally required only when `mode === "headless"`** (r2 codex F4 + codex-ops F1 convergent HIGH — Cursor IDE-mode reviewers don't run via the headless wrapper and can't sensibly carry a WT/PROMPT command). Encode as a JSON Schema `if/then`: `if: { properties: { mode: { const: "headless" } } } then: { required: [..., "invoke_command"] }`. IDE-mode reviewer entries MAY omit `invoke_command`.

Live-fire validation: after the edits, the dry-run from this session must invert — `python3 tools/review-queue/validate.py reviewer <claude.md-fixture>` and `REVIEWER_NAME=claude python3 tools/review-queue/_reviewer_gate.py` both exit 0 instead of 1. AND: a synthetic combined.md fixture with `claude_response: "claude.md"` validates against the updated combined.schema.json.

**AC3 — `skills/review-queue-claude.md` canonical reviewer skill.**

Mirror the shape of `skills/review-queue-codex.md` line-for-line. Section structure identical:
- Step 0 — 050 worktree-isolation preamble (already handled by `_run_reviewer.sh`; encoded in prose for fresh-eyes parity).
- Step 1 — Pull origin/main.
- Step 2 — Scan for missing responses; filter on `requested_reviewers` includes `claude`.
- Step 3 — Read artifact at `request.spec_commit_sha` via `git show`.
- Step 4 — Perform the review. **Reviewer voice: Claude catches conceptual / architectural drift, scope-creep, ECHO-domain wisdom from the wiki + prior decisions.** Distinct lane from codex (implementability) and codex-ops (runtime/ops).
- Step 5 — Atomic write of `claude.md` via os.link from temp.
- Step 6 — Validate + commit + push via `commit-reviewer-response.sh` and `push-with-retry.sh`.
- Step 7 — Journal entry per CLAUDE.md discipline AFTER the response file is committed.

Bind `MY_REVIEWER=claude` at top. Sync to `.claude/commands/review-queue-claude.md` and `adapters/codex/skills/review-queue-claude/SKILL.md` via `tools/sync-skills.sh`.

**AC4 — `tools/review-queue/run-claude-reviewer.sh` 5-line driver.**

```bash
#!/usr/bin/env bash
# run-claude-reviewer.sh — 5-line driver delegating to _run_reviewer.sh.
# Body lives in _run_reviewer.sh — same wrapper for every headless reviewer;
# this script only sets REVIEWER_NAME=claude.
exec env REVIEWER_NAME=claude "$(dirname "$0")/_run_reviewer.sh"
```

Same shellcheck-clean shape as `run-codex-reviewer.sh` and `run-codex-ops-reviewer.sh`. Executable bit set.

**AC5 — `_run_reviewer.sh` genericized via roster `invoke_command` field, with `_reviewers.py` loader extension + shell-safe substitution.**

This is the load-bearing substrate change. Today `_run_reviewer.sh:140` is:

```bash
codex exec -C "$WT" --sandbox danger-full-access - < "$PROMPT"
```

**Five-part landing** (each part must be in the same commit set; tests in AC9 guard each):

**1. `tools/review-queue/_reviewers.py` — extend the loader (r1 codex F1 + codex-ops F4 HIGH convergent; r2 codex F4 + codex-ops F1 HIGH convergent refinement).**

The current loader at `_reviewers.py:26-35,62-72` constructs `Reviewer(**r)` against `_REQUIRED_FIELDS = ("name", "mode", "required", "timeout_hours", "slash_command")`. Adding `invoke_command` to reviewers.json without extending the loader breaks every roster load via the NamedTuple's `__new__` rejection of unknown fields — and that takes down the existing codex + codex-ops launchd ticks BEFORE any new claude tick can run.

Required edits:
- Extend the `Reviewer` NamedTuple with `invoke_command: str | None` (Optional — IDE-mode reviewers may omit it per r2 codex F4 + codex-ops F1 patch above).
- DO NOT append `"invoke_command"` to `_REQUIRED_FIELDS` unconditionally — it must be conditionally required only when `mode === "headless"`. Encode in validation at `_reviewers.py:92-106`: when `mode == "headless"`, require `invoke_command` be a non-empty string containing the `{{PROMPT}}` token (the `{{WT}}` token is RECOMMENDED but NOT REQUIRED — `claude -p` operates relative to cwd and has no `-C` analog, so the example `claude -p --dangerously-skip-permissions < {{PROMPT}}` must validate). Document the rule: `{{PROMPT}}` is mandatory for stdin-driven invocations; `{{WT}}` is optional if the invoke command operates on `$WT` via cwd (the wrapper already `cd`'s to `$WT` before substitution).
- `_reviewer_gate.py` continues to print `slash_command` to stdout (back-compat); add a second mode `--print invoke_command` (or a sibling helper) so the wrapper can resolve the template. For IDE-mode reviewers, `--print invoke_command` exits non-zero with a clear stderr diagnostic (`IDE-mode reviewer cursor has no invoke_command`).

**2. `reviewers.json` — add `invoke_command` per HEADLESS entry, including codex + codex-ops for backwards compatibility (Cursor IDE-mode row omits the field).**

```json
{
  "name": "codex",  "mode": "headless", "required": true, "timeout_hours": null,
  "slash_command": "review-queue-codex",
  "invoke_command": "codex exec -C {{WT}} --sandbox danger-full-access - < {{PROMPT}}"
},
{
  "name": "claude", "mode": "headless", "required": false, "timeout_hours": null,
  "slash_command": "review-queue-claude",
  "invoke_command": "claude -p --dangerously-skip-permissions < {{PROMPT}}"
}
```

(Exact `claude -p` flag set is verified by AC9 unit test against the installed claude CLI — the spec body MAY refine the canonical flags during build.)

**3. Shell-safe substitution — Option A only (r1 codex F3 + codex-ops F6 MEDIUM convergent; r2 codex F3 + codex-ops F2 HIGH refinement).**

The literal `{{WT}}` / `{{PROMPT}}` substitution into a `bash -c` string loses argv quoting and breaks at runtime when `$TMPDIR` or repo paths contain spaces. **r2 review locked Option A as the only allowed strategy.** The r1-spec's Option B (argv-style template) was broken as written: `subprocess.Popen(..., shell=False)` does NOT interpret `<` as a stdin redirect, so the child process would receive the literal `<` and the prompt path as argv elements rather than the prompt body on stdin. Option B as drafted would silently break dispatch.

**Option A is the only acceptable implementation:**
- Wrapper (extension of `_reviewer_gate.py` or sibling Python helper) resolves the `invoke_command` template.
- For each token (`{{WT}}`, `{{PROMPT}}`), the helper substitutes the actual value through `shlex.quote()` BEFORE assembling the final shell string.
- The final string is passed to `bash -c <string>` (shell IS used; that's why the redirect `< {{PROMPT}}` works).
- Backwards-compatible: codex + codex-ops existing invocations stay byte-equivalent post-AC5 because their templates use single-token-per-position layout and `shlex.quote()` is a no-op on paths without spaces or special characters.

**No argv-style template in V1.** If a future binding needs argv-style invocation (e.g., a CLI without stdin support), file as a successor spec that defines an explicit `stdin_from` field and a separate argv-array `invoke_argv` template. For V1 + codex + codex-ops + claude, Option A is sufficient.

**4. `_run_reviewer.sh` wrapper edit — durable queue-error commit before cleanup (r3 codex-ops F2 HIGH).**

Replace the hardcoded `codex exec` line with a call to the chosen substitution mechanism. Worktree path is `$WT`; prompt is `$WT/.claude/commands/${SLASH_COMMAND}.md`. Failure to resolve `invoke_command` (missing field, template token mismatch, executable not on PATH) MUST surface as a queue-errors entry on `origin/main`, not a silent rc=1, and **not** an uncommitted append inside `$WT` that the 050 cleanup trap will erase.

**Required failure-path mechanism:**
- Detect failure (token mismatch, executable missing, etc.) BEFORE spawning the child.
- Append a row to `raw/internal/queue-errors.md` inside `$WT` with format: `<ISO-Z> <DIAGNOSTIC>: reviewer=<slug> failure=<reason> diagnostic=<message>` (pre-spawn-failure row shape). **Pre-spawn failures DO NOT include spec fields** (`artifact_path`, `spec_commit_sha`) because the wrapper detects these errors BEFORE scanning any `r<N>/request.md` — the spec fields aren't known yet, and inventing placeholder values pollutes the queue-error operator surface. The operator-grade diagnostic the row guarantees is `reviewer=<slug>`, which is sufficient to investigate via `~/Library/Logs/echo-review-queue-<slug>.log`. (Per-round failures that occur AFTER request.md scanning — e.g., bad spec_commit_sha at `git show` — continue to use the existing queue-error shape that includes spec fields, since they're known at that point. AC9 asserts both row shapes are valid.)
- Commit + push via `tools/review-queue/push-with-retry.sh` BEFORE the cleanup trap fires. The push has to land on `origin/main`; otherwise the queue-error is lost when `git worktree remove --force "$WT"` runs at trap-time and the operator is left only with the launchd-log (StandardErrorPath=/dev/null in the silent-fail case).
- After the push lands, exit non-zero so the launchd job reflects the failure status.
- Implementation hint: write a small helper `tools/review-queue/queue_error.sh <reason> <diagnostic>` (or extend `commit-reviewer-response.sh` with an `--error <reason>` mode) so the wrapper has a single entry point. The helper handles append + commit + push + retry-on-non-fast-forward.
- The pre-redirect launchd-silent-fail surface (`_followups.md` HIGH #1) is OUT OF SCOPE — by definition no path body has executed at that point; queue-errors can't be written. 057 closes that separately via `coord_invoke`. AC8 of 056 only addresses failures that occur INSIDE the wrapper body, after the log redirect block opens.

**5. Backwards compatibility invariant.**

codex + codex-ops invocations are byte-equivalent pre/post AC5 (same `codex exec -C $WT --sandbox danger-full-access - < $PROMPT` argv, same env, same stdin). AC9 includes an explicit "argv snapshot" regression test: capture argv from the codex mock before AC5, capture argv after AC5, assert equivalence. Even one-character drift is a regression.

**AC6 — `tools/sync-skills.sh --check` clean post-AC3.**

All three on-disk copies of `review-queue-claude.md` byte-identical. Same as 055 AC2.

**AC7 — `tools/review-queue/smoke-test-claude-runner.sh` (optional but standard).**

Sibling to `smoke-test-codex-runner.sh`. Runs the wrapper against an isolated tmpdir + local bare origin, asserts:
- `claude.md` produced under `r1/`
- `validate.py reviewer` exits 0 on it
- `commit-reviewer-response.sh` commits it
- Hard isolation assertions (no writes outside `$SMOKE_HOME`, no PATH leak, `~/.echo/agent-id` not touched, etc.)

**Fail-open is ONLY allowed in non-install contexts (r1 codex-ops F5 HIGH unique).** If `claude` CLI is absent:

- **Non-install context (CI / unit test / dry-run inspection):** `smoke-test-claude-runner.sh` exits 0 with a `[skip] claude CLI not installed at $(which claude || echo '<unset>')` line. CI doesn't choke; fresh-machine setups proceed.
- **Install context (operator-run `_install_reviewer_launchd.sh claude` flow):** smoke MUST fail-closed. The installer either (a) preflights the resolved `invoke_command` executable (`command -v claude`) BEFORE plist writes — exits non-zero if missing, no plist created; OR (b) runs smoke post-install and fails non-zero if smoke would have skipped — operator gets an immediate error AND the launchd job is uninstalled in the same step. Without this, an install-with-smoke flow can leave `com.echo.review-queue-claude.plist` firing every 10 min with `command-not-found`, silently consuming the launchd schedule and burning the founder's `_followups.md` HIGH #1 launchd-silent-fail surface MORE.

Implementation hint: pass an `--install-context` flag to the smoke runner that flips fail-open to fail-closed. Default is fail-open; installer passes `--install-context` explicitly.

**Installer contract (r2 codex F2 + codex-ops F3 convergent HIGH).** `tools/review-queue/_install_reviewer_launchd.sh` is now in `files_to_modify` because the install-context contract requires installer edits:
- Accept a `--install-context` flag (or always treat installer invocations as install-context — the installer is the install-context by definition; the flag is forwarded to the smoke runner).
- **Preflight the resolved `invoke_command` executable BEFORE writing the plist.** Parse the roster entry's `invoke_command`, extract the first token (the executable name — e.g., `codex`, `claude`), run `command -v <exe>`. If not found:
  - Exit non-zero with a clear diagnostic on stderr (`<exe> not found on PATH; cannot install com.echo.review-queue-<slug>`).
  - DO NOT write the plist file.
  - DO NOT call `launchctl bootstrap` / `launchctl load`.
- If preflight passes, write the plist + smoke-test path proceeds normally.
- The `--smoke` flow continues to work for non-install testing (separate code path or `--install-context=false` flag); the installer ALWAYS uses install-context (fail-closed).

**AC8 — Launchd install path works for `claude` slug via `_install_reviewer_launchd.sh`.**

The installer reads `reviewers.json` and is roster-driven post-043. Verify by running:

```bash
tools/review-queue/_install_reviewer_launchd.sh claude
```

against a dry-run target (e.g., a non-production `Label` prefix or test plist dir). Assert: `com.echo.review-queue-claude.plist` lands in `~/Library/LaunchAgents/` with `ProgramArguments` pointing at `tools/review-queue/run-claude-reviewer.sh`, `StartInterval 600`, `StandardOutPath` / `StandardErrorPath` matching the existing codex/codex-ops shape. The founder does NOT install for-real until empirically verified on a real cycle (AC9). Install can be deferred to a post-merge founder action; the AC is "the installer accepts the new slug without error."

**AC9 — Falsifiable end-to-end test.**

Two-prong:
1. **Unit-level (in `tests/review-queue/056-claude-reviewer-onboarding.test.ts`):** Using a mock claude CLI (`tests/review-queue/fixtures/mock-claude.sh` that records its argv + stdin then writes a hand-crafted valid `claude.md` to the expected path) — invoke `run-claude-reviewer.sh` against an isolated tmpdir, assert the wrapper:
   - Reads `invoke_command` from `reviewers.json` (not a hardcoded codex string)
   - Substitutes `{{WT}}` and `{{PROMPT}}` correctly under the chosen shell-safe strategy from AC5 part 3
   - Reads the prompt body from `$WT/.claude/commands/review-queue-claude.md`
   - Calls mock-claude with the substituted argv
   - Mock-claude's output `claude.md` validates against `reviewer.schema.json` and is committed via `commit-reviewer-response.sh`

   **Additional regression-class cases that close the r1 finding set:**
   - **`_reviewers.py` accepts all 4 slugs — invoke_command assertion is mode-conditional** (r3 codex F1 + codex-ops F1 convergent; codex-ops elevated to HIGH). Instantiate the loader after AC5 part 1 lands; assert codex, codex-ops, cursor, claude all load without `ValueError`. **Assert non-empty `invoke_command` ONLY for the headless reviewers** (codex, codex-ops, claude — `each.invoke_command is not None and len(each.invoke_command) > 0`). **Cursor MAY load with `invoke_command = None`** (or omitted from JSON entirely if the schema if/then permits it); assert the value is exactly `None` for cursor. **Assert `_reviewer_gate.py --print invoke_command` for `REVIEWER_NAME=cursor` exits non-zero with stderr containing `IDE-mode reviewer cursor has no invoke_command`** (the documented diagnostic from AC5 part 1). Assert the same call for codex/codex-ops/claude exits 0 and prints the resolved template. Assert the codex/codex-ops argv resolution is byte-equivalent to pre-AC5 (the "argv snapshot" regression check from AC5 part 5).

   - **Wrapper-side queue-error persistence — BOTH pre-spawn AND per-round failure shapes** (r3 codex-ops F2 HIGH + r5 codex-ops HIGH refinement). Two sub-cases:
     - **Pre-spawn shape** (failure detected before request.md scan): simulate a `mode=headless` reviewer entry whose `invoke_command` references a missing executable (e.g., `nonexistent-binary {{PROMPT}}`) OR contains an `invoke_command` with no `{{PROMPT}}` token. Invoke `_run_reviewer.sh REVIEWER_NAME=<that-slug>`. Assert: (a) wrapper exits non-zero; (b) `origin/main` HAS a new row matching the MINIMAL shape `*<DIAGNOSTIC>: reviewer=<slug> failure=<reason> diagnostic=<msg>*` (no spec fields); (c) the ephemeral `$WT` worktree was removed by cleanup trap; (d) no partial commits or orphan files left in the live checkout.
     - **Per-round shape** (failure detected AFTER request.md scan — e.g., unreachable `spec_commit_sha`): seed a `r<N>/request.md` with a fake `spec_commit_sha` (e.g., `0000000000000000000000000000000000000000`). Invoke the reviewer wrapper. Assert: (a) wrapper exits non-zero; (b) `origin/main` HAS a new row matching the FULL shape `*<DIAGNOSTIC>: reviewer=<slug> failure=<reason> spec=<artifact_path>@<spec_commit_sha>*` (preserves the request-scoped fields so operators can recover what was being reviewed); (c) the row's `spec_commit_sha` matches the fake SHA from the seeded request; (d) the row is distinct from the pre-spawn shape (full shape vs. minimal). This asserts the wrapper's row-shape dispatch is correct — a builder that accidentally normalized all queue-errors to the minimal shape would fail this assertion.
     - **Inverse:** with a valid `invoke_command` whose executable exists AND a valid `spec_commit_sha`, no queue-error row is appended.
   - **Combined schema validates 4-reviewer round** — synthesize a combined.md with `codex_response`, `codex-ops_response`, `claude_response` populated; assert `validate.py combined` exits 0 (closes r1 codex F2 HIGH).
   - **Shell-safe substitution under spaces** (closes r1 codex F3 + codex-ops F6 MEDIUM convergent) — set `TMPDIR=/var/folders/.../tmp with spaces/` (or equivalent), invoke `run-claude-reviewer.sh`, assert the wrapper survives + mock-claude is invoked with the correctly-quoted args + the resulting `claude.md` lands correctly. Run the same fixture against codex + codex-ops to prove no backwards-incompat regression.
   - **Install-context fail-closed when claude is absent** (closes r1 codex-ops F5 HIGH unique) — `PATH=/usr/bin:/bin` (no claude), invoke `_install_reviewer_launchd.sh claude --smoke --install-context`; assert non-zero exit; assert no plist file written under the test plist dir; assert no launchd job loaded. Inverse: `PATH=$TEST_BIN_WITH_CLAUDE`, same command; assert plist written + smoke passes.

2. **Integration-level (cycle dogfooding, observational):** After 056 merges, the next qualifying spec dispatched with `requested_reviewers: ["codex", "codex-ops", "claude"]` is the empirical proof. Both codex AND claude ticks land their response files; `combine.py` writes `combined.md` cleanly with claude included in the convergent/divergent rows. Journal entry confirms the cycle ran with zero founder dispatch messages and zero schema-validation failures.

Failure of the unit test is a hard merge-blocker. Failure of the integration cycle is a follow-up (escalation per 049 fail-to-converge precedent — fix forward in 057).

**AC10 — Builder writes `backlog/task-state/<id>/builder.md` per 046 AC1 + 047 AC3 + 055 AC4.**

Same writer-responsibilities table inherited from 046 AC1.

## Out of Scope (Don't Drift)

- **No Claude-as-strategist binding.** That is its own spec (see _followups.md gap punch-list / matrix). 056 is reviewer-only.
- **No Claude-as-builder formalization.** Already implicit default; future spec if needed.
- **No removal of the codex / codex-ops / cursor reviewer bindings.** Additive only.
- **No changes to combine.py's union-find / convergence-match logic.** The 4th slug should slot in via the existing roster-driven path with zero combine.py edits. If integration testing surfaces a hardcoded "codex"/"cursor"/"codex-ops" string in combine.py that breaks 4-reviewer rounds, that is a separate spec (gap in 043's generalization).
- **No founder-side launchd install at merge time.** AC8 verifies the installer accepts the slug; actual install happens when the founder decides to start polling. Until then, claude tick fires manually via `tools/review-queue/run-claude-reviewer.sh` invocations or by adding claude to a round's `requested_reviewers` and letting the headless wrapper fire on-demand.
- **No vendor-neutral skill body changes to the existing three review-queue skills.** AC3 adds a NEW skill; the existing codex / codex-ops / cursor skills stay byte-identical (binding-specific notes already there; vendor-neutral protocol body shared via copy-paste convention, not refactored in 056).
- **No retroactive change to `required` flags for codex / codex-ops / cursor.** Claude starts `required: false` because it's the new binding; the others stay as-is.

## After Completion (Strategist Notes)

Post-merge:
- Update `wiki/operating-model/review-queue-protocol.md` "Reviewer roster (current)" table to add the `claude` row + "Adding a new reviewer" recipe references this spec as the canonical worked example.
- Update memory `reference_codex_review_queue_invocation.md` (or create sibling `reference_claude_review_queue_invocation.md`) with the corrected `run-claude-reviewer.sh` invocation form for the founder's reference.
- File a 1-line followup if AC9 integration cycle reveals any combine.py hardcoded reviewer slugs (would be a regression of 043's roster generalization).
- Consider flipping `required: true` for claude in `reviewers.json` after ≥3 cycles' worth of clean integration evidence — separate one-line edit, no spec needed.
- Cross-link the matrix gap punch-list in `_followups.md`: 055 closes #1 (cursor-builder), 056 closes #2 (claude-reviewer); remaining gaps are codex-strategist + cursor-strategist + watcher-headless.
