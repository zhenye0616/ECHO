---
id: 2026-05-12-041-reviewer-background-execution
title: Reviewer background execution — Codex headless via launchd; Cursor accept-degradation policy; mechanically-enforced emission validation (closes the 040 "founder activation friction" gap)
status: ready
priority: HIGH
estimate: 0.5-1d
created: 2026-05-12
claimed_by: null
claimed_at: null
branch: null
head_sha: null
agent_notes: null
spec_refs:
  - backlog/complete/2026-05-11-039-cross-tool-review-dispatch-queue.md   # Parent operating-model item; AC0 sandbox recipe broken on this machine; AC3 reviewer-emission validation gap surfaced post-040
  - backlog/complete/2026-05-12-040-watcher-state-executable-test.md      # AC6b loop-close gate fired clean BUT founder still physically activated reviewers ~5×/cycle; 041 closes the activation-friction half of the gap
  - backlog/_followups.md                                                  # "🔴 NEXT GAP — Reviewer background execution" entry (filed 2026-05-12 ~03:05 PDT); AC0 Codex sandbox recipe failure; AC3 reviewer-emission YAML-validation gap; all subsumed by this item
  - docs/review-queue-setup.md                                             # Broken recipe being replaced — Codex section uses --sandbox workspace-write (denies .git/FETCH_HEAD writes on macOS) + --ask-for-approval never (flag does not exist on Codex CLI v0.130.0)
  - .claude/commands/review-queue-codex.md                                 # Codex-side reviewer slash-command — Step 5-6 (commit + push) becomes invocation of new helper
  - .claude/commands/review-queue-cursor.md                                # Cursor-side reviewer slash-command — same shape; same helper invocation
  - tools/review-queue/validate.py                                         # Existing reviewer-response validator — wraps jsonschema + yaml.safe_load; AC4 helper invokes this directly, no re-implementation
  - tools/review-queue/push-with-retry.sh                                  # Existing push helper with pull-rebase retry + queue-errors.md fallback — AC4 helper composes this AFTER successful validation
  - tools/review-queue/schemas/reviewer.schema.json                        # The contract validation enforces — frozen by 039 (verdict enum, severity enum, etc.)
  - CLAUDE.md                                                              # Founder-gate semantics — 041 changes session-bootstrap activation pattern, NOT per-round dispatch (the 039 AC6b property holds throughout)
blocked_by: []
suggested_builder: any  # Pure shell + launchd plist + reviewer-prompt rewrite + doc cleanup. Builder must have macOS to verify the launchd plist works end-to-end (AC2 install + AC5 smoke).
resume_tail_source: "fs:/Users/zhenye/.claude/projects/-Users-zhenye-Desktop-Project-echo/<current>.jsonl"
review_notes: null
---

## Why this now

The 040 merge closed the 039 AC6b loop-close gate on the **strict reading**: zero founder→reviewer dispatch messages between rounds. But across 040's 3-round cycle the founder still physically activated reviewers ~5 times (initial Codex terminal command + 2 Codex re-fires after sandbox correction + 2 Cursor chat pastes). The founder's framing post-040:

> *"so the issue is I still have to activate codex and prompt cursor. that I will the next issue to solve. so I truly dont have to touch cursor and codex or any reviewer agent I might choose to use in the future."*

The "or any reviewer agent I might choose to use in the future" clause is load-bearing: 041 must solve the **activation pattern**, not just patch Codex+Cursor specifically. The same problem will recur every time a new reviewer voice is added (V2+ candidates: a third Claude API persona, a fresh Codex instance with a different system prompt, etc.).

Plus: today's empirical evidence (040 R1 Cursor YAML emission bug; 040 R1 Codex sandbox recipe failure) shows that AC0-style nominal verification of recipes is not enough. Once reviewers run unattended, the strategist can't catch emission bugs in real time the way I caught Cursor R1's `""` defect within 30 minutes. Emission validation needs to be **mechanically enforced**, not prose-asked-of-each-reviewer-prompt.

## Goal

Make reviewer execution truly **hands-off** for the founder while preserving the 039 queue's correctness guarantees:

1. **Codex reviewer runs unattended** on a 10-minute launchd-driven schedule. After a one-time install (~30 sec), the founder never types another `codex exec` command for review work.
2. **Cursor reviewer is documented as opportunistic** — ticks when the founder has Cursor IDE open; missing-Cursor rounds escalate via the existing `single_reviewer_timeout` and the queue carries on with single-reviewer rounds; this is steady-state property, not a system defect.
3. **Reviewer output is validated before commit** by a single helper that all reviewer slash-commands invoke. The validation gate is mechanically unbypassable through the canonical commit path.
4. **`docs/review-queue-setup.md` is rewritten** to be a clean, end-to-end-verified setup recipe for adding the next reviewer.
5. **Folded-in nit:** any documented `get_atom({atom_id: ...})` example is corrected to `get_atom({id: ...})` to remove the per-new-AI-client friction Codex flagged.

## Acceptance Criteria

**AC1 — Codex reviewer wrapper script.** `tools/review-queue/run-codex-reviewer.sh` exists with chmod +x. Owns:
- `cd ~/Desktop/Project_echo` (cwd discipline)
- PATH augmentation so `codex` is findable in launchd's reduced env
- The verified canonical invocation: `codex exec -C ~/Desktop/Project_echo --sandbox danger-full-access - < ~/Desktop/Project_echo/.claude/commands/review-queue-codex.md`
- Stdout + stderr appended to `~/Library/Logs/echo-review-queue-codex.log` (rotated at 10MB via standard log-rotation idiom or accepted as append-only with a one-line note that founder may truncate manually)
- Exit code passthrough from `codex exec`
- One-line preamble logged on each tick: `[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick start`

The wrapper is **idempotent** — running it twice in close succession is safe (each invocation does at most one review tick per the canonical reviewer prompt's "one review per tick" rule).

**AC2 — launchd plist + install/status/uninstall scripts.**
- `tools/review-queue/install-codex-reviewer-launchd.sh` writes `~/Library/LaunchAgents/com.echo.review-queue-codex.plist` with: 600-second `StartInterval` (10 min), `ProgramArguments` pointing to the AC1 wrapper, `StandardOutPath` + `StandardErrorPath` pointing to the AC1 log, `WorkingDirectory` = repo root, `RunAtLoad: false` (founder explicitly fires the smoke first via `launchctl load`), `KeepAlive: false` (one-shot per tick).
- `tools/review-queue/status-codex-reviewer-launchd.sh` runs `launchctl list | grep com.echo.review-queue-codex` and tails the last 10 log lines for at-a-glance verification.
- `tools/review-queue/uninstall-codex-reviewer-launchd.sh` runs `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.echo.review-queue-codex.plist` (or `launchctl unload` if bootout unavailable on the founder's macOS version) and `rm -f` the plist.

All three scripts are idempotent — re-running install is safe (overwrites plist, re-bootstraps); re-running uninstall is safe (no-op if already gone).

**AC3 — Verified Codex invocation pinned (closes the 039 AC0 sandbox-recipe-fix gap).** The AC1 wrapper uses `--sandbox danger-full-access`, NOT `--sandbox workspace-write`. The wrapper does NOT pass `--ask-for-approval never` (flag does not exist on Codex CLI v0.130.0; default is `never` per the CLI's runtime preamble). The wrapper uses `<` redirection (not `cat | codex exec`) — the redirection variant survives shell-paste edge cases that the pipe variant doesn't, per memory note `reference_codex_review_queue_invocation.md`. AC3 is **verified by AC5 running successfully end-to-end on the founder's actual machine** — not by inspection of the wrapper file.

**AC4 — Mechanically-enforced reviewer output validation (Codex R0 amendment + minor pushback).** Create `tools/review-queue/commit-reviewer-response.sh` with signature:

```
commit-reviewer-response.sh <reviewer.md path> <reviewer name: codex|cursor> <round N> <item_id>
```

Behavior:
1. Run `python3 tools/review-queue/validate.py reviewer <path>`. The existing validator wraps `yaml.safe_load` on the frontmatter + `jsonschema` validation against `tools/review-queue/schemas/reviewer.schema.json`.
2. **On validation failure**: exit non-zero. Print the validator's stderr verbatim. Do NOT `git add`, do NOT `git commit`, do NOT push. The malformed `<reviewer>.md` stays in the worktree; the reviewer agent is expected to regenerate it. Append a one-line entry to `raw/internal/queue-errors.md`: `<ISO-ts> VALIDATION-FAIL: <reviewer> r<N> on <item_id> path=<path> diagnostic=<validator stderr first line>`. This makes background-runtime validation failures auditable without requiring the strategist to be watching in real time.
3. **On validation success**: `git add <path>` → `git commit -m "review-r<N>: <reviewer> on <item_id>"` → `tools/review-queue/push-with-retry.sh "review-r<N>: <reviewer> on <item_id>"`.

Both `.claude/commands/review-queue-codex.md` Step 5+6 and `.claude/commands/review-queue-cursor.md` Step 5+6 are rewritten to invoke this helper:

```bash
tools/review-queue/commit-reviewer-response.sh "$dir/<reviewer>.md" <reviewer> "$N" "$item_id"
```

instead of the current inline `git add ... && git commit ... && push-with-retry.sh ...` sequence. The journal-logging step (Step 6 in the current prose) remains after the commit, unchanged in spirit but now triggered only after a successful helper exit. **Validation is mechanically unbypassable for any reviewer that uses the canonical commit path.** A future reviewer plugs into the same helper by invoking it; the helper handles validation + commit + push uniformly across reviewers.

**AC5 — Synthetic-request smoke test.** `tools/review-queue/smoke-test-codex-runner.sh` exists:
1. Creates a tmpdir (`mktemp -d`) and copies the repo into it (or uses worktree-style symlinks where safe).
2. Generates a synthetic `r1/request.md` mirroring the canonical shape (item_id from a small whitelist; spec_commit_sha = HEAD; class=narrow; both reviewers requested).
3. Runs `tools/review-queue/run-codex-reviewer.sh` against the tmpdir (or against a `--repo-root` test override the wrapper accepts as an env var).
4. Asserts `r1/codex.md` is created **AND** validates against `reviewer.schema.json`.
5. Exits 0 on success, non-zero with diagnostic on failure.
6. Cleans up the tmpdir.

The AC2 install script offers to run AC5 automatically post-install with a `--smoke` flag; founder may decline if they want to install-now-verify-later.

**AC6 — Cursor degradation policy explicit in spec body + queue contract (Codex framing addition).** Spec body and `docs/review-queue-setup.md` Cursor section document:
- **Steady-state property**: Cursor reviewer ticks **only when the founder has Cursor IDE open** with an active Claude chat running the paste-once-self-loop prompt. This is by design — Cursor has no headless mode comparable to `codex exec`; macOS keyboard-automation was rejected by 039 §AC0.
- **`single_reviewer_timeout` on a Cursor-absent round is expected**, not a system defect. The watcher escalates per existing 039 behavior (after `MISSING_REVIEWER_TIMEOUT_HOURS`, default 2h).
- **Strategist's call per round**: when escalation fires, the strategist either (a) continues with Codex-only review for that round, or (b) waits for Cursor's next IDE session. Both are valid. Documented in `docs/review-queue-setup.md` so future strategists don't treat the escalation as a bug.
- **The 039 cross-tool review property degrades gracefully** to single-reviewer rounds when Cursor is absent; the queue does not stall. Multi-reviewer convergence is **signal** (high confidence when present), not **requirement** (queue still produces correct results without it).
- **Manual paste-per-round** remains the explicit fallback when Cursor's self-loop is unreliable — the same fallback 039 §AC0 already tolerates. No new keyboard automation. No new GUI pinging.

**AC7 — Scoped `atom_id` → `id` audit (Codex Gap #1 fold-in).** Grep for `atom_id` in: `wiki/`, `docs/`, `.claude/commands/`, `tools/review-queue/`, `backlog/_followups.md`, `raw/internal/dogfooding/mcp-interactions-journal.md`. For each occurrence where the reference is to the `get_atom` MCP tool's parameter, replace with `id`. **Skip references to `metadata.atom_id` or other internal-field uses** — only the `get_atom` schema's parameter name is in scope. Verify no remaining false positives by running the same grep post-edit. Estimated affected files: ≤5.

**AC8 (observational, like 040 AC6b) — Reduce founder per-cycle activations to ≤1.** Empirically measured on the first qualifying spec to enter the queue post-041 merge: how many times does the founder physically touch a reviewer (terminal command, IDE paste, manual restart, manual debug)? Pre-041 baseline: ~5 per 3-round cycle (040 evidence). **Target: 0–1 (the 1 acknowledges Cursor IDE paste-once if founder is also using Cursor for other work that session).** If post-041 count is >1, file failure mode in `_followups.md` with the specific friction observed and bounce to a 042 candidate. AC8 is the empirical "did this actually solve the founder-friction problem" check — same shape as 040 AC6b, recorded in `review_notes` at merge time.

## Out of Scope (Don't Drift)

- **Cursor headless mode.** Cursor has no `cursor exec` equivalent. If/when Cursor ships one, V2+ work to wire it in. Not blocking 041.
- **Replacing Cursor with a different reviewer.** A second Codex instance with a different system prompt would lose Cursor's distinct review voice (040 R1 evidence: Cursor caught real things Codex didn't — `git add` on missing path; AC1 (a) tuple gap). Defer to V2+ only if Cursor degradation proves operationally unworkable.
- **Full malformed-response recovery in `combine.py`.** AC4's emission-time validation gate prevents most malformed responses from getting pushed. The `combine.py` defensive path (catch `yaml.parser.ParserError`, write `escalated_to_founder: true` stub) is a separate, harder problem; defer to a follow-up if AC4's emission gate proves insufficient.
- **Schema changes to `reviewer.schema.json`.** AC4 wraps the existing validator; the schema itself is frozen by 039.
- **`get_atom` schema rename** (`id` → `atom_id` in the live tool). AC7 audits docs/examples to match the live schema; reverse-direction (changing the live schema) would be a much larger MCP-server-side change and is out of scope.
- **Live-tail auto-hydration** (Codex Gap #2). Separate UX item; defer until post-041 evidence shows it bites in the new (less-watched) reviewer loops.
- **Source-resolution narration** (Codex Gap #3). Same.
- **cron as primary recipe.** launchd is the macOS-native primary; cron is documented as fallback for non-macOS founders. 041 doesn't ship a cron variant by default.
- **`docs/BACKLOG.md` cleanup** (Codex flagged stale rows post-040). Separate operating-model cleanup — file as own follow-up; not in 041.

## After Completion (Strategist Notes)

When this item lands in `backlog/complete/`:

1. **Cross out the following entries in `backlog/_followups.md`:**
   - "🔴 AC0 Codex recipe fails verification on macOS" — closed by AC3 + AC5 verifying the corrected invocation works on the founder's machine.
   - "🔴 AC3 reviewer-emission validation gap" — closed by AC4 making validation mechanically enforced.
   - "🔴 NEXT GAP — Reviewer background execution" — closed by AC1 + AC2 + AC8 empirical verdict.
2. **Wiki promotion**:
   - Update `docs/review-queue-setup.md` end-to-end (already covered by AC2 + AC6); not a wiki page itself but is the canonical setup doc.
   - Consider drafting `wiki/principles/reviewer-harness-agnostic.md` — the principle that 041 makes explicit (the queue protocol is reviewer-harness-agnostic; activation mechanism is per-reviewer and out-of-band; mechanically-enforced validation is the only contract). Strategist post-merge call whether this rises to a principle or stays in operating-model.
   - Update existing `wiki/surfaces/review-queue.md` (still owed from 039) to reference 041's helper + the Cursor-degradation property.
3. **Heuristic data point** — log in `raw/internal/dogfooding/mcp-interactions-journal.md` how many rounds 041 settled in. If 1–2 rounds, narrow class trajectory confirmed; if 3, third structural-reform data point (after 037, 038, 039, 040) — heuristic ready to lock into `backlog/README.md` or `docs/AGENT_INSTRUCTIONS.md`.
4. **AC8 empirical verdict** — record in `review_notes` at merge time. Either outcome is data; document both honestly.
5. **If AC8 fails** (founder activation count >1) — file the failure mode as 042 with the specific friction observed. Do not patch 041 inline.

## Test list (for the reviewer/builder)

- `tools/review-queue/run-codex-reviewer.sh` (new) — shell smoke: writes to log; passes through codex exec exit code
- `tools/review-queue/install-codex-reviewer-launchd.sh` (new) — install + launchctl list shows entry; uninstall cleans up
- `tools/review-queue/status-codex-reviewer-launchd.sh` (new) — status check works on installed + uninstalled states
- `tools/review-queue/uninstall-codex-reviewer-launchd.sh` (new) — idempotent
- `tools/review-queue/commit-reviewer-response.sh` (new) — accepts valid response; rejects malformed YAML with non-zero exit + queue-errors.md append
- `tools/review-queue/smoke-test-codex-runner.sh` (new) — end-to-end synthetic-request smoke; AC5 falsifiability
- `.claude/commands/review-queue-codex.md` (modified) — Step 5+6 rewritten to invoke commit-reviewer-response.sh
- `.claude/commands/review-queue-cursor.md` (modified) — same
- `docs/review-queue-setup.md` (rewritten) — launchd primary recipe + Cursor degradation policy + AC7 audit incorporated
- `tests/review-queue/commit-reviewer-response.test.ts` (new, optional but recommended) — integration test: valid response commits + pushes; malformed YAML rejects with non-zero exit + queue-errors.md row
- `npm test` — full suite, expect 786+1 = 787 pass / 21 skipped (existing 46 review-queue tests + 1 new AC4 integration test); concurrency.test.ts:133 remains pre-existing red until separately fixed (out of scope)
- `npm run typecheck` — clean
- `npm run lint` — clean

## Implementation hints (non-binding)

- **launchd plist quirk**: macOS Sonoma+ uses `launchctl bootstrap`/`bootout` instead of `launchctl load`/`unload`. The AC2 install script should detect and use the right pair; fall back gracefully on older macOS.
- **AC4 helper signature flexibility**: if the caller-side complexity of passing 4 args is non-trivial, consider parsing the path to derive `<reviewer>` and `<round>` and `<item_id>` from the path itself (e.g., `backlog/reviews/<item_id>/r<N>/<reviewer>.md` is structured). Trade off: less arg-marshalling at the call site vs. less robustness if the path convention changes.
- **AC5 smoke test isolation**: copy the repo into the tmpdir rather than symlinking — `codex exec`'s sandbox may resolve symlinks in unexpected ways under `--sandbox danger-full-access` (less likely than `workspace-write`, but worth verifying). If a full repo copy is too slow, copy just the files the reviewer prompt references.
- **AC6 documentation**: the Cursor degradation framing is a real spec property — it should appear in both the 041 spec body AND in the new `docs/review-queue-setup.md` so future founders/strategists encounter it where they're looking for it. Two-place doc, single source of truth in the 041 spec.
- **AC7 audit**: use `git grep -n 'atom_id' -- wiki/ docs/ .claude/ tools/review-queue/ backlog/_followups.md raw/internal/dogfooding/mcp-interactions-journal.md` for the initial scan; review each hit individually before replacing (some hits are legitimate references to `metadata.atom_id` or unrelated identifiers).
- **AC8 empirical measurement**: at merge time, the strategist counts founder activations in the next qualifying spec's review cycle. Use the dogfooding journal as the audit trail — every founder activation produces a journal entry (existing discipline). If the count is 0–1, AC8 passes; if >1, the specific friction event is itself the failure-mode evidence.
