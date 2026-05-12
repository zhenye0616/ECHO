---
id: 2026-05-12-041-reviewer-background-execution
title: Reviewer background execution — Codex headless via launchd; Cursor accept-degradation policy; mechanically-enforced emission validation (closes the 040 "founder activation friction" gap)
status: ready
priority: HIGH
estimate: 0.5-1d
created: 2026-05-12
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-12T11:30:00Z"
branch: "agent/reviewer-background-execution"
head_sha: "90c77b305283853a357a425481c59a44afce5e00"
agent_notes: |
  AC1, AC2, AC4, AC5, AC6, AC7 implemented end-to-end on branch
  agent/reviewer-background-execution. Focused tests pass (47 pass + 1 known
  pre-existing red on concurrency.test.ts:133, out of 041 scope per spec).
  Typecheck + lint clean.

  Three flags for review:

  1. **AC3 end-to-end verification deferred to founder** (founder choice
     in-session). Wrapper pins --sandbox danger-full-access with < redirection
     and no --ask-for-approval flag, matching the spec. Founder runs
     tools/review-queue/smoke-test-codex-runner.sh post-merge to close the
     verification gap.

  2. **AC7 wiki residue.** One match
     (wiki/operating-model/cross-tool-spec-review.md:140 — placeholder
     `get_atom(<elided_atom_id>)`) left untouched. Builder honored
     AGENT_INSTRUCTIONS rule 6 (no wiki edits) and routed this to the
     strategist's After Completion §2 wiki promotion step. Non-wiki paths
     handled (backlog/_followups.md:410 corrected; docs/review-queue-setup.md
     now has an explicit get_atom param-name section).

  3. **AC4 test count is +2, not +1.** AC4's Test list enumerates both paths
     (valid commits + malformed rejects), so the test file naturally has 2 it()
     blocks. Net review-queue total: 47 passes (was 46 at 040 merge). Happy
     to consolidate if reviewer prefers.

  AC8 (observational) is the strategist's empirical check on the next
  qualifying spec post-merge.
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
review_notes: |
  Merged on 2026-05-12 (UTC ~22:25) via founder reconciliation under /merge-and-cleanup.

  Conflicts resolved:
  - none — git merge-tree confirmed clean; 11 files (4 modified, 7 net-new);
    all branch-only changes; no main-side overlap.

  Fixups applied:
  - none — sidecar verdict `merge as-is` with empty pre-merge fixups list.

  Fixups deferred to follow-up items:
  - none.

  Verify post-merge:
  - `npm test -- tests/review-queue/`: 47 pass + 1 known pre-existing red
    (`tests/review-queue/concurrency.test.ts:133` — orphan-cleanup test-fixture
    clock-mismatch; already reclassified MED in 040 followups; NOT a 041 regression).
  - `npm run lint`: clean.
  - `npm run typecheck`: clean.
  - Review-queue suite grew 46 → 47 (one new file `tests/review-queue/commit-reviewer-response.test.ts`
    with 2 it() blocks covering both valid-commits + malformed-rejects paths per AC4).

  Cross-tool review history (3 rounds, narrow class, R3-converged at spec_commit_sha e8edb29):
  - R1: 8+1 findings → 5 spec patches (1 combine.py fold of two different findings)
  - R2: 6 findings → 5 spec patches (1 manually-surfaced after combine.py omitted Cursor L1;
    1 combine.py duplicate-fold of Cursor L2)
  - R3: 0 findings; both reviewers `proceed`; convergence declared

  Operating-model observation: combine.py had 2 classification anomalies in 2 rounds (R1 fold,
  R2 drop + double-list). Filed as follow-up below.

  AC6b empirical signal (preliminary, pending AC8 measurement on next post-041 spec):
  - Strict reading: no founder→reviewer dispatch messages between rounds, same as 040.
  - Activation reading: founder still physically activated reviewers each round during 041
    BUILD (same friction 041 is solving). The post-041 measurement (AC8) on the FIRST
    qualifying spec is what proves whether the launchd job actually drops activations to ≤1.

  Builder agent_notes flags (all non-blocking, transcribed for audit trail):
  1. AC3 end-to-end verification deferred to founder post-merge per spec phrasing
     ("verified by AC5 on the founder's actual machine"). Founder runs
     `tools/review-queue/smoke-test-codex-runner.sh` to close. ~1-5 min, $0.05-$0.50 LLM cost.
  2. AC7 wiki residue: one match at `wiki/operating-model/cross-tool-spec-review.md:140`
     (placeholder `get_atom(<elided_atom_id>)`) left untouched per AGENT_INSTRUCTIONS rule 6
     (no wiki edits from builders). Routed to strategist post-merge wiki promotion.
  3. AC4 test count is +2 not +1 — one test file with 2 it() blocks (valid + malformed paths)
     because AC4's own Test list enumerates both paths. Net review-queue total 47.

  Follow-up items (non-blocking, queued in _followups.md at C10):
  1. **AC3 founder smoke verification** — run `tools/review-queue/smoke-test-codex-runner.sh`
     once before relying on the launchd job in steady state.
  2. **AC7 wiki residue** — strategist edits `wiki/operating-model/cross-tool-spec-review.md:140`
     from `get_atom(<elided_atom_id>)` to `get_atom(<id>)` (or equivalent) during post-merge wiki
     promotion.
  3. **AC8 empirical measurement** — count founder activations during the next qualifying spec's
     review cycle. Pre-041 baseline: ~5 per 3-round cycle. Target: 0-1. Record result in next
     item's review_notes.
  4. **combine.py reviewer-finding-enumeration audit** — combine.py had 2 classification
     anomalies in 041's 2 substantive review rounds (R1 fold of two different findings into
     one row; R2 dropped Cursor L1 entirely + double-listed Cursor L2). Strategist's manual
     read of <reviewer>.md is the safety net for now; needs its own backlog item to fix the
     combine.py finding-grouping logic.

  Decay curve: 8→6→0 (same shape as 040). Fourth confirming structural-reform-trajectory data
  point alongside 037, 038, 040 — heuristic ready to lock into `backlog/README.md` post-041
  wiki promotion.
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
- **Bash strict mode + early-exit on bad env var** (R2 patch — convergent Codex L3 + Cursor L2): the wrapper begins with `set -euo pipefail`. If `cd "$ECHO_REVIEW_QUEUE_REPO_ROOT"` fails (env var unset, points at a missing directory, or points at something that isn't a git repo), the wrapper exits non-zero **before** invoking `codex exec`, with a clear stderr preamble naming the env var and its value: `echo "ECHO_REVIEW_QUEUE_REPO_ROOT is missing or not a git repo: '${ECHO_REVIEW_QUEUE_REPO_ROOT:-<unset>}'" >&2`. Under unattended launchd, this distinguishes "env/path misconfig" from "Codex CLI failure" in the log tail.
- **Working repo via env var**: the wrapper derives its working repo from `${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}`. Default = production repo path. The launchd plist (AC2) does NOT set this env var, so launchd-driven ticks run against production unchanged. The smoke test (AC5) sets this env var to a tmpdir, isolating smoke from production. **Variable name + default are normative** — builders must not hardcode the path elsewhere in the wrapper. (R1 patch — convergent Codex H2 + Cursor M1: the original wrapper hardcoded `~/Desktop/Project_echo`, which collided with AC5's tmpdir requirement; copied-repo smoke could have pushed to the real origin.)
- `cd "$ECHO_REVIEW_QUEUE_REPO_ROOT"` (cwd discipline, derived from the env var above; guarded by `set -e` per the strict-mode bullet)
- PATH augmentation so `codex` is findable in launchd's reduced env
- The verified canonical invocation: `codex exec -C "$ECHO_REVIEW_QUEUE_REPO_ROOT" --sandbox danger-full-access - < "$ECHO_REVIEW_QUEUE_REPO_ROOT/.claude/commands/review-queue-codex.md"`
- Stdout + stderr appended to `~/Library/Logs/echo-review-queue-codex.log` (rotated at 10MB via standard log-rotation idiom or accepted as append-only with a one-line note that founder may truncate manually)
- Exit code passthrough from `codex exec`
- One-line preamble logged on each tick: `[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick start ECHO_REVIEW_QUEUE_REPO_ROOT=$ECHO_REVIEW_QUEUE_REPO_ROOT`

The wrapper is **idempotent** — running it twice in close succession is safe (each invocation does at most one review tick per the canonical reviewer prompt's "one review per tick" rule).

**AC2 — launchd plist + install/status/uninstall scripts.**
- `tools/review-queue/install-codex-reviewer-launchd.sh` writes `~/Library/LaunchAgents/com.echo.review-queue-codex.plist` with: **`<key>Label</key><string>com.echo.review-queue-codex</string>`** as the first entry in the top-level dict (R2 patch — Cursor L1 manually surfaced from `r2/cursor.md` after combine.py omitted it: launchd resolves the kickstart identifier `gui/$(id -u)/com.echo.review-queue-codex` from the plist's Label string, not the filename; without a normative Label, install scripts could drift to duplicate/mismatched labels), 600-second `StartInterval` (10 min), `ProgramArguments` pointing to the AC1 wrapper, **`StandardOutPath` and `StandardErrorPath` set to `/dev/null`** (R1 patch — Cursor L4: AC1 wrapper owns unified logging; routing launchd's stream-capture to the same file would double-log with launchd's timestamps interleaving with the wrapper's preamble), `WorkingDirectory` = repo root, `RunAtLoad: false`, `KeepAlive: false` (one-shot per tick).
- **Loading + uninstalling** (R1 patch — convergent Cursor L5 + Codex L3 cleanup, pulled into AC2 from Implementation Hints): the install script uses macOS Sonoma+ semantics by default: `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.echo.review-queue-codex.plist`. Detect macOS version via `sw_vers -productVersion`; if < 14.0, fall back to `launchctl load -w <plist>`. The uninstall script symmetrically uses `launchctl bootout gui/$(id -u) <plist>` (Sonoma+) or `launchctl unload <plist>` (older). Both versions of the pair are normative in this AC, not just in the hints.
- **Smoke trigger** (R1 patch — Codex L3): because `RunAtLoad: false`, `bootstrap`/`load` alone does NOT fire the job. The install script's `--smoke` flag runs `launchctl kickstart -k gui/$(id -u)/com.echo.review-queue-codex` after bootstrap to fire one explicit tick for verification. (Without `--smoke`, the job waits for its first `StartInterval` boundary.)
- `tools/review-queue/status-codex-reviewer-launchd.sh` runs `launchctl list | grep com.echo.review-queue-codex` and tails the last 10 log lines for at-a-glance verification.
- `tools/review-queue/uninstall-codex-reviewer-launchd.sh` runs the version-gated bootout/unload pair above and `rm -f` the plist.

All three scripts are idempotent — re-running install is safe (overwrites plist, re-bootstraps); re-running uninstall is safe (no-op if already gone).

**AC3 — Verified Codex invocation pinned (closes the 039 AC0 sandbox-recipe-fix gap).** The AC1 wrapper uses `--sandbox danger-full-access`, NOT `--sandbox workspace-write`. The wrapper does NOT pass `--ask-for-approval never` (flag does not exist on Codex CLI v0.130.0; default is `never` per the CLI's runtime preamble). The wrapper uses `<` redirection (not `cat | codex exec`) — the redirection variant survives shell-paste edge cases that the pipe variant doesn't, per memory note `reference_codex_review_queue_invocation.md`. AC3 is **verified by AC5 running successfully end-to-end on the founder's actual machine** — not by inspection of the wrapper file.

**AC4 — Mechanically-enforced reviewer output validation (Codex R0 amendment + minor pushback).** Create `tools/review-queue/commit-reviewer-response.sh` with signature:

```
commit-reviewer-response.sh <reviewer.md path> <reviewer name: codex|cursor> <round N> <item_id>
```

Behavior:
1. Run `python3 tools/review-queue/validate.py reviewer <path>`. The existing validator wraps `yaml.safe_load` on the frontmatter + `jsonschema` validation against `tools/review-queue/schemas/reviewer.schema.json`.
2. **On validation failure** (R1 patch — Codex H1 load-bearing fix to the unattended-retry deadlock): exit non-zero. Print the validator's stderr verbatim. Do NOT `git add`, do NOT `git commit`, do NOT push. **Move the malformed file aside**: `mv <path> <path>.invalid.<ISO-ts>` (e.g., `r1/cursor.md` → `r1/cursor.md.invalid.2026-05-12T22:45:00Z`). This is **critical**: the canonical reviewer prompt's polling step skips any round where `<reviewer>.md` already exists (`if [ -f "$dir/cursor.md" ]; then continue; fi`), so leaving the malformed file at the canonical path would block ALL future reviewer ticks on that round forever. Renaming it out of the way unblocks the next tick to regenerate. Append a one-line entry to `raw/internal/queue-errors.md`: `<ISO-ts> VALIDATION-FAIL: <reviewer> r<N> on <item_id> moved_to=<path>.invalid.<ISO-ts> diagnostic=<validator stderr first line>`. This makes background-runtime validation failures auditable AND retryable without requiring the strategist to be watching in real time.
3. **On validation success**: `git add <path>` → `git commit -m "review-r<N>: <reviewer> on <item_id>"` → `tools/review-queue/push-with-retry.sh "review-r<N>: <reviewer> on <item_id>"`.

Both `.claude/commands/review-queue-codex.md` Step 5+6 and `.claude/commands/review-queue-cursor.md` Step 5+6 are rewritten to invoke this helper:

```bash
tools/review-queue/commit-reviewer-response.sh "$dir/<reviewer>.md" <reviewer> "$N" "$item_id"
```

instead of the current inline `git add ... && git commit ... && push-with-retry.sh ...` sequence. The journal-logging step (Step 6 in the current prose) remains after the commit, unchanged in spirit but now triggered only after a successful helper exit. **Validation is mechanically unbypassable for any reviewer that uses the canonical commit path.** A future reviewer plugs into the same helper by invoking it; the helper handles validation + commit + push uniformly across reviewers.

**AC5 — Synthetic-request smoke test.** `tools/review-queue/smoke-test-codex-runner.sh` exists. (R1 patch — convergent Codex H2 + Cursor M1 + Cursor M2: isolation must be real, not best-effort.)

1. **Isolated test repo with local bare origin** (load-bearing for safety): `mktemp -d` two directories — one for the working repo (`$SMOKE_WORK`), one for a bare origin (`$SMOKE_ORIGIN`). `git init --bare -b main "$SMOKE_ORIGIN"` (R2 patch — Codex M1: the bare origin must be on `main`, NOT the git-default `master` on machines without `init.defaultBranch` configured, because `push-with-retry.sh` hardcodes `git pull --rebase origin main && git push origin main`). Copy the project files into `$SMOKE_WORK` (or initialize a minimal subset: `.claude/commands/`, `tools/review-queue/`, `backlog/`, `raw/internal/`). `git init -b main "$SMOKE_WORK" && cd "$SMOKE_WORK" && git remote add origin "$SMOKE_ORIGIN"` (same `-b main` fix). For older `git` versions that don't support `-b`, the fall-through is `git init "$SMOKE_WORK" && (cd "$SMOKE_WORK" && git symbolic-ref HEAD refs/heads/main)` before the first commit. Make an initial commit + push so the bare origin has the `main` baseline. **No path through which smoke artifacts can reach the real GitHub origin** — even if `push-with-retry.sh` fires, it pushes to the local bare repo.
2. **Pinned synthetic item_id**: the synthetic `r1/request.md` uses item_id `2026-05-12-999-smoke-test-synthetic` (R1 patch — Cursor M2 folded with C2: pinned, deterministic, named in this spec so smoke is reproducible). Spec_commit_sha = HEAD of `$SMOKE_WORK`; class=narrow; both reviewers requested. Write a stub `backlog/ready/2026-05-12-999-smoke-test-synthetic.md` in `$SMOKE_WORK` so `request.py find_artifact()` resolves (mirrors 040 R2 fixture preamble fix).
3. **Run the wrapper with the env override**: `ECHO_REVIEW_QUEUE_REPO_ROOT="$SMOKE_WORK" tools/review-queue/run-codex-reviewer.sh`. The env var derived from AC1 makes the wrapper operate on the smoke repo, never the production repo.
4. **Assertions** (R2 patch — Codex L2: hard assertions must be local + deterministic, not race-prone production-origin diffs):
   - `$SMOKE_WORK/backlog/reviews/2026-05-12-999-smoke-test-synthetic/r1/codex.md` is created.
   - That file validates against `reviewer.schema.json` (re-uses the AC4 validator).
   - The smoke commit on `$SMOKE_WORK`'s `main` branch is at HEAD (proves `commit-reviewer-response.sh` ran end-to-end through validate → commit → push to bare origin).
   - **Hard isolation assertions** (deterministic, no race window):
     (a) `git -C "$SMOKE_WORK" remote get-url origin` equals `$SMOKE_ORIGIN` exactly (string equality).
     (b) `git -C "$SMOKE_WORK" remote` lists only `origin` (no other remotes configured).
     (c) The production GitHub URL `https://github.com/zhenye0616/echo_wiki.git` is absent from `$SMOKE_WORK/.git/config` (grep returns 0 hits).
   - **Advisory check** (not a failure condition): log the production-repo origin/main `rev-list HEAD..origin/main | wc -l` delta as a one-line advisory. Other review-queue actors can legitimately push during smoke, so this is operator information, not pass/fail.
5. Exits 0 on success (all hard assertions pass), non-zero with diagnostic on failure.
6. Cleans up both tmpdirs.

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
- **Acceptance: focused review-queue suite + typecheck + lint clean.** `npm test -- tests/review-queue/` passes; the new AC4 integration test adds +1 to the review-queue baseline (was 46 at 040 merge, becomes 47). `npm run typecheck` clean; `npm run lint` clean. **Full `npm test` is NOT a 041 acceptance** — `tests/review-queue/concurrency.test.ts:133` (orphan-cleanup test-fixture clock-mismatch bug) remains pre-existing red until its separate test-fix item lands. (R1 patch — convergent Codex M2 + Cursor NIT: original wording hard-coded "787 pass" while also acknowledging concurrency:133 is red; mutually exclusive. Removed the scalar, replaced with "+1 vs baseline" framing per Cursor's code-rot concern. Full-suite green is a non-goal of 041 — that's the concurrency-test-fix item's job.)
- `npm run typecheck` — clean
- `npm run lint` — clean

## Implementation hints (non-binding)

- **launchd plist quirk**: macOS Sonoma+ uses `launchctl bootstrap`/`bootout` instead of `launchctl load`/`unload`. The AC2 install script should detect and use the right pair; fall back gracefully on older macOS.
- **AC4 helper signature flexibility**: if the caller-side complexity of passing 4 args is non-trivial, consider parsing the path to derive `<reviewer>` and `<round>` and `<item_id>` from the path itself (e.g., `backlog/reviews/<item_id>/r<N>/<reviewer>.md` is structured). Trade off: less arg-marshalling at the call site vs. less robustness if the path convention changes.
- **AC5 smoke test isolation**: copy the repo into the tmpdir rather than symlinking — `codex exec`'s sandbox may resolve symlinks in unexpected ways under `--sandbox danger-full-access` (less likely than `workspace-write`, but worth verifying). If a full repo copy is too slow, copy just the files the reviewer prompt references. (R2 patch — Cursor R2 NIT: when shrinking the copy-set, `grep -E 'tools/review-queue/|\.claude/commands/|tools/review-queue/schemas/' .claude/commands/review-queue-codex.md` to enumerate the prompt's path references, then ensure every referenced path is included in the smoke copy. Otherwise smoke can fail opaquely or pass without exercising the real prompt body. Full-tree copy is the safe default; minimal copy is an optimization that requires this grep step.)
- **AC6 documentation**: the Cursor degradation framing is a real spec property — it should appear in both the 041 spec body AND in the new `docs/review-queue-setup.md` so future founders/strategists encounter it where they're looking for it. Two-place doc, single source of truth in the 041 spec.
- **AC7 audit**: use `git grep -n 'atom_id' -- wiki/ docs/ .claude/ tools/review-queue/ backlog/_followups.md raw/internal/dogfooding/mcp-interactions-journal.md` for the initial scan; review each hit individually before replacing (some hits are legitimate references to `metadata.atom_id` or unrelated identifiers).
- **AC8 empirical measurement**: at merge time, the strategist counts founder activations in the next qualifying spec's review cycle. Use the dogfooding journal as the audit trail — every founder activation produces a journal entry (existing discipline). If the count is 0–1, AC8 passes; if >1, the specific friction event is itself the failure-mode evidence.
