---
id: 2026-05-14-049-codex-skill-adapter
title: Codex skill adapter — third sync target for `tools/sync-skills.sh` + vendor-neutralization of `skills/review-pending.md` body
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-05-14
blocked_by: []
task_state_ref: 2026-05-14-049-codex-skill-adapter
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - tools/sync-skills.sh  # extend with codex target — directory wrapper + frontmatter transform + --check verification
  - adapters/codex/skills/  # NEW directory — tracked codex adapter target (mirror of canonical skills/ in codex's SKILL.md format)
  - skills/review-pending.md  # vendor-neutralize body — abstract subagent dispatch mechanism + binding-specific notes (Claude Code / codex)
  - .claude/commands/review-pending.md  # re-synced from canonical after the body change
  - tools/install-codex-adapters.sh  # NEW — one-time user setup helper to symlink adapters/codex/skills/* → ~/.codex/skills/*
  - tests/sync-skills/codex-adapter.test.ts  # NEW — byte-identity body, frontmatter transform, --check failure modes
  - tests/sync-skills/install-codex-adapters.test.ts  # NEW — install helper test coverage (8+ cases per AC3); addresses R3 codex F1 HIGH (files_to_modify allowlist gap)
  - AGENTS.md  # add codex skill discovery section (one paragraph + the install-codex-adapters.sh reference)
spec_refs:
  - backlog/complete/2026-05-13-047-codex-as-builder-binding-adapter.md  # the codex-as-builder binding adapter — established the per-skill binding-specific-notes pattern in skills/process-backlog.md that 049 extends to skills/review-pending.md
  - skills/process-backlog.md  # AC2 reference: the "Binding-specific notes — codex" section pattern this spec mirrors for review-pending
  - tools/sync-skills.sh  # AC1 target — header comment names "Codex / web ChatGPT: TBD (future: MCP echo_skill(name) tool, served from skills/)" — 049 makes this concrete via adapters/codex/skills/
  - skills/review-pending.md  # AC2 target — currently has Claude-Agent-tool-specific dispatch language that this spec abstracts
  - raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md  # the cross-tool protocol decision; 049 operationalizes the third adapter target the decision anticipated
  - ~/.codex/skills/.system/skill-creator/SKILL.md  # codex's native skill anatomy reference (frontmatter shape, progressive disclosure design)

# --- agent-managed fields (filled in during run) ---
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-14T21:29:52Z"
branch: "agent/codex-skill-adapter"
worktree: ""
head_sha: "da573483f3ed7f58284e29690fafd21c830b3278"
pr_url: ""
agent_notes: |
  All five ACs implemented in a single Claude Code session. tools/sync-skills.sh extended
  with adapters/codex/skills/<name>/SKILL.md materialization for canonical skills that
  document a "## Binding-specific notes — codex" section (in-scope set: process-backlog,
  review-pending). skills/review-pending.md vendor-neutralized + Claude Code + codex
  binding-specific notes appended (codex notes: workspace-write -C <worktree>, RUN_DIR
  via mktemp, --output-last-message capture, parse-failure evidence preservation,
  concurrency cap N<=4). tools/install-codex-adapters.sh: --symlink (default) / --copy /
  --dry-run, three-factor stale-lock gate (age + pid liveness via kill -0 + process
  search), --copy stages outside the live skill discovery root, sentinel records
  synced_from_commit + synced_content_sha256. 27 vitest cases (9 sync + 18 install) all
  green. AGENTS.md gains Codex skill discovery paragraph. npm run lint, typecheck, test
  (910 pass / 21 pre-existing skip), and tools/sync-skills.sh --check all clean. Adapter
  files materialized + committed at da57348.

  AC3's parse-failure-evidence-preservation test deferred per spec line 134 (would have
  required implementing the codex fan-out orchestrator that the spec's Out of Scope
  forbids). Live codex CLI discovery smoke test deferred to founder per DoD: run
  bash tools/install-codex-adapters.sh from a trusted terminal then verify in a real
  codex session that /review-pending resolves. If symlink-mode discovery fails,
  re-run with --copy.

  Implementation decision worth flagging: canonical-side YAML frontmatter is parsed
  line-by-line (not via yaml.safe_load) because skills/process-backlog.md's description
  contains an unquoted "Idempotent: a crashed run..." substring that PyYAML rejects.
  Adapter-side frontmatter is still strict YAML (round-trips through yaml.safe_dump),
  so codex parses it cleanly. No canonical files were edited. If a future spec wants
  strict-YAML canonicals, that is a separate decision.
review_notes: |
  Merged on 2026-05-14 via founder reconciliation. Recorded as a follow-up commit (bookkeeping + post-merge sync) on top of `c398307` rather than as part of a merge commit — see history-loss note below.

  Conflicts resolved:
  - None (clean text merge).

  History note (cross-vendor merge-lock collision, second occurrence today):
  - My `git merge --no-ff` produced a proper merge commit `018e26a` (parents: 9724cab + da57348). While npm test was running (~30s), a parallel codex review-queue process committed `r1/codex.md` for spec 050 on top of `018e26a` as `c503a5a`, then `push-with-retry.sh` ran `git pull --rebase origin main` because origin had advanced. The rebase did NOT preserve merges (no `--rebase-merges`), so my merge commit got flattened into a linear cherry-pick `c398307` on origin/main with 049's full diff but no second parent. The merge structure is lost; the content is intact. agent/codex-skill-adapter at da57348 is technically "unmerged" by ref-graph standards even though all its content is in main via c398307.
  - This is the SAME class of collision that hit the first 048 merge attempt this morning. Both motivated spec 050 (worktree-isolation-for-multi-step-main-writers) which was already in flight.
  - `agent/codex-skill-adapter` deleted with `-D` (force) because `-d` refuses on the missing merge structure; content verified present on main before delete.

  Post-merge cross-cut surfaced + repaired:
  - `adapters/codex/skills/process-backlog/SKILL.md` drifted from canonical `skills/process-backlog.md` after merge. Root cause: 049's branch was forked BEFORE 048's `skills/process-backlog.md` update (E2.5 step), so the codex adapter was materialized from pre-048 canonical content. Git couldn't surface this textually because the adapter lives at a different path than the canonical. Caught by `tools/sync-skills.sh --check` post-merge and by the 048 byte-identity test which itself runs sync-skills. Re-running `tools/sync-skills.sh` regenerated the adapter (75-line diff). Re-verified: 927/927 tests pass.

  Fixups applied:
  - None pre-merge (verdict was `merge as-is`).
  - Post-merge: re-sync of `adapters/codex/skills/process-backlog/SKILL.md` via `tools/sync-skills.sh`.

  Fixups deferred to follow-up items: None.

  Verify: 927/927 tests pass (21 skipped); eslint clean; tsc --noEmit clean; `tools/sync-skills.sh --check` clean.

  Follow-up items (non-blocking):
  - `tools/install-codex-adapters.sh:201` cosmetic — `age_ok=${age_ok}` always 1 by the time it's printed.
  - `tools/install-codex-adapters.sh:342` cosmetic — `cp -R "$adapter/." "$stage/"` runs after sentinel write; safe per V1 scope, worth a comment.
  - Document in `tools/sync-skills.sh` header that `--check` reads `$HOME/.codex/skills/*/` for stale-`--copy` warnings.
  - Strategist follow-ups (from spec After-Completion): extend vendor-neutralization to remaining canonical skills; generate `agents/openai.yaml`; pre-commit hook for sync-skills --check; verify codex auto-discovery honors symlinks.
  - File deferred `parse-failure-evidence-preservation` test against the future codex-fan-out-orchestrator spec.
  - Human smoke test owed per DoD: run `tools/install-codex-adapters.sh` in a real codex CLI session.
  - **CROSS-CUT LESSON #1 (post-merge adapter drift)**: when an item's fork-point precedes a canonical change in main, materialized adapters end up stale at merge time and git can't surface it textually. Mitigations to consider: (a) `/merge-and-cleanup` runs `tools/sync-skills.sh` automatically as part of C5 verify, OR (b) `tools/sync-skills.sh --check` runs as a pre-push hook. (a) closer to existing 045 AC5b stage-before-mv intent. File as a backlog item.
  - **CROSS-CUT LESSON #2 (merge-lock cross-vendor gap, second occurrence)**: `.git/echo-merge-in-progress` is Claude-Code-only; the codex review-queue's `push-with-retry.sh` runs `git pull --rebase` independently and flattens in-flight merge commits. The 048 morning collision and this 049 collision are the same root cause. Spec 050 (worktree-isolation-for-multi-step-main-writers, already in flight) is the long-term fix; meanwhile the merge-lock should be honored by reviewer-queue scripts AND `push-with-retry.sh` should use `--rebase-merges` to preserve merge structure. Already noted in 048 followups; raising the priority.
---

# Codex skill adapter

## Why this spec exists

ECHO's cross-tool collaboration protocol is hosted in `skills/<name>.md` (vendor-neutral, ECHO-namespaced). `tools/sync-skills.sh` fans those canonical files out to per-client adapter directories so every binding's skill discovery picks up byte-identical content. Today only one adapter target exists — `.claude/commands/<name>.md` for Claude Code (and reused by Cursor's Claude via Cursor's compatibility). The sync script's header comment explicitly anticipates `Codex / web ChatGPT: TBD (future: MCP echo_skill(name) tool, served from skills/)` as future work.

On 2026-05-14 the founder activated codex's native `skill-creator`, surfacing that Codex CLI v0.130.0 ships a first-class skill system at `~/.codex/skills/<name>/SKILL.md` with the directory-wrapped progressive-disclosure anatomy (`SKILL.md` + optional `agents/openai.yaml`, `scripts/`, `references/`, `assets/`). The "TBD" assumption that codex would need an MCP-served retrieval path is now obsolete — codex auto-discovers skills from a filesystem location, same shape as Claude Code, just at a different path with a slightly different frontmatter.

This serves north star (e2) directly. Today Cursor's Claude can use `/review-pending` because `.claude/commands/` is byte-identical to canonical. Codex cannot — there's no codex-side adapter. Wiring the third adapter target makes EVERY canonical skill cross-binding by construction, not by per-skill manual ports. It also closes the "codex strategist test" found gap that codex couldn't invoke ECHO skills via slash command — the friction observed empirically in the 048 cycle when codex strategist needed to be fed prompts inline rather than fire `/review-queue-watch`.

The work is narrow: add the adapter target + transform, vendor-neutralize ONE canonical skill body (`review-pending` — the most Claude-Agent-tool-coupled today) as the proof, defer remaining canonical-body neutralization to followups. The 047 pattern for codex-specific notes appended to vendor-neutral protocol bodies is the template.

## Acceptance Criteria

### AC1 — `tools/sync-skills.sh` extension: codex adapter target

- Add `adapters/codex/skills/` as the tracked codex-side adapter directory in the repo. Same role as `.claude/commands/` but for codex.
- **Scope of materialization**: only canonical `skills/<name>.md` files that already have a documented `## Binding-specific notes — codex` section get adapter materialization in 049. Today that's exactly TWO skills:
  - `skills/process-backlog.md` — codex notes added by 047
  - `skills/review-pending.md` — codex notes added by AC2 below (this spec)
- All other canonical skills (`merge-and-cleanup`, `review-queue-codex`, `review-queue-cursor`, `review-queue-codex-ops`, `review-queue-watch`, `process-backlog-batch`, `using-superpowers`, `role-typed-task-state`) are explicitly OUT OF SCOPE for adapter materialization — they would expose Claude-Agent-tool-specific or other Claude-coupled mechanisms to codex's slash-command surface without a codex-side implementation. They get materialized in per-skill followups AFTER their canonical body adds a codex binding-specific notes section. This addresses codex-ops F1 HIGH from R1.
- For each in-scope canonical skill, the sync writes `adapters/codex/skills/<name>/SKILL.md` with codex-required YAML frontmatter:
  - `name: <name>` (from canonical filename basename without `.md`)
  - `description: <canonical's description field>` — **MUST be YAML-safe-serialized** via `yaml.safe_dump` or equivalent quoting strategy so descriptions containing colons (`:`), quotes (`"`/`'`), brackets, or other YAML-sensitive characters produce valid output. Naive line-scraping that passes the raw scalar would break for current canonical content (e.g., `skills/process-backlog.md`'s description contains an unquoted colon-space sequence). This addresses codex F1 from R1.
  - `metadata.short-description: <first 80 chars of description, truncated at last whole word>` (deterministic transform, also YAML-safe)
- Body byte-identical to the canonical's body (everything below the closing `---` of canonical's frontmatter).
- Per-skill directory must contain ONLY `SKILL.md` for V1. `agents/openai.yaml` / `scripts/` / `references/` / `assets/` are out of scope (Risk R3 explains).
- `tools/sync-skills.sh --check` mode:
  - For each in-scope canonical skill, verify `adapters/codex/skills/<name>/SKILL.md` exists.
  - Verify body byte-identity (canonical body == adapter body below adapter's frontmatter).
  - Verify frontmatter parses as valid YAML AND has the three required keys with correct derivation.
  - **Reject unexpected adapter directories** (addresses R4 codex F2 MED): enumerate every directory under `adapters/codex/skills/*` and cross-reference against the in-scope skill set (skills with a `## Binding-specific notes — codex` section in their canonical body). Fail with a diagnostic naming any out-of-scope adapter directory that exists in `adapters/codex/skills/` but is not in the in-scope set. This is the load-bearing drift guard — without it, a stray `adapters/codex/skills/merge-and-cleanup/` could land in git and `--check` would stay green while exposing a Claude-coupled skill to codex's slash-command surface after install.
  - Exit non-zero with a diagnostic if any check fails. Match the existing Claude Code adapter check shape.
- Default (no args) sync mode:
  - Creates `adapters/codex/skills/<name>/` directory if missing.
  - Writes `SKILL.md` (overwrite-safe — sync is the canonical operation).
  - Exits 0 on success; non-zero on any I/O failure.

### AC2 — Vendor-neutralize `skills/review-pending.md` body

- Replace Claude-specific dispatch language in the protocol body with vendor-neutral subagent-dispatch-primitive language. Concretely: "Spawn one `superpowers:code-reviewer` subagent per item, in parallel, via Agent tool calls" becomes "Dispatch one independent code-review process per item, in parallel, using your binding's subagent dispatch primitive."
- Add `## Binding-specific notes — Claude Code` section before `## Step C` (the synthesis step):
  - Names the Agent tool with `superpowers:code-reviewer` subagent_type as the Claude Code dispatch mechanism.
  - References `.claude/commands/review-pending.md` as the synced adapter.
- Add `## Binding-specific notes — codex` section adjacent to the Claude Code one. **Operationally-safe fan-out contract** (addresses codex-ops F2 from R1, codex F1+F2 + codex-ops F1+F2 from R2, codex F2 from R6, codex-ops F1 HIGH from R6):
  - **Per-child sandbox = `workspace-write` SCOPED to each item's existing per-item worktree** (NOT the main repo). `/review-pending` reviews items in `backlog/pending_review/`; each item already has a per-item git worktree at `$HOME/Desktop/Project_echo--<slug>/` created by the builder during `/process-backlog`. Codex children are invoked with `codex exec --sandbox workspace-write -C <item-worktree-path> - < <per-item-prompt>` — `-C <item-worktree-path>` scopes the child's CWD AND workspace-write surface to ITS OWN worktree, NOT the main repo. Worktrees are disjoint paths, so parallel children CANNOT race each other's writes. Each child runs `npm test`, `npm run lint`, `npm run typecheck` IN ITS WORKTREE (workspace-write needed for node_modules/test caches). This addresses R6 codex F2 MED: verification commands now have a clear ownership (children) AND a clear safe scope (their own worktree).
  - **Sidecar write happens in orchestrator path** (not children). Children emit review markdown on stdout. Orchestrator parses + writes `backlog/pending_review/<id>.review.md` in the MAIN repo (not in any worktree). Main-repo sidecar writes never race because the orchestrator is single-threaded for that step.
  - **Child subprocess wrapping under `set -euo pipefail`** (addresses R6 codex-ops F1 HIGH + R7 codex F1 HIGH): each child invocation MUST (a) write the FINAL response via `codex exec --output-last-message "$RUN_DIR/<item-id>.review.md"` to a separate file — NOT parse stdout. codex CLI v0.130.0's stdout contains banner + workdir/model metadata + the user prompt + token summary BEFORE the final answer; the per-item prompt itself contains the same review-section heading names (Verdict, Drift findings, etc.); regex extraction from raw stdout would match prompt text as if it were the child's review. The `--output-last-message` flag writes ONLY the final response to the named file. (b) Capture rc even on non-zero exit; (c) parent drains via `wait "$pid" || true`. Concrete pattern:
    ```bash
    (
      set +e   # Don't let codex's non-zero exit terminate the subshell before we write rc
      codex exec --sandbox workspace-write -C "$WORKTREE" \
        --output-last-message "$RUN_DIR/<item-id>.review.md" \
        - < "$PROMPT" > "$RUN_DIR/<item-id>.stdout" 2> "$RUN_DIR/<item-id>.stderr"
      echo $? > "$RUN_DIR/<item-id>.rc"
    ) &
    PIDS+=( $! )
    ```
    Parent drains: `for pid in "${PIDS[@]}"; do wait "$pid" || true; done` (the `|| true` prevents `set -e` in parent from killing orchestrator before all children's outputs are readable). **Orchestrator parses `<item-id>.review.md` (NOT `.stdout`) for required section headings.** `.stdout` + `.stderr` are diagnostic-only, surfaced on parse failure or rc≠0.
  - **Per-run isolated temp directory**: orchestrator allocates `RUN_DIR=$(mktemp -d -t echo-review-pending-XXXXX)` ONCE at fan-out start (uses `${TMPDIR:-/tmp}` if TMPDIR is unset). Each per-item invocation writes its stdout to `$RUN_DIR/<item-id>.stdout`, stderr to `.stderr`, and exit code to `.rc`. Per-run scoping prevents cross-orchestrator race: two concurrent `/review-pending` runs each have their own `$RUN_DIR` and never overwrite each other's child files. Addresses R2's codex F1 + codex-ops F2 (same finding).
  - **Cleanup scoped to RUN_DIR only**: `trap "rm -rf \"$RUN_DIR\"" EXIT` (NOT a broad glob). Guarantees cleanup on orchestrator crash without touching other in-flight runs.
  - **Output format (markdown, matching Claude path — addresses R5 codex F1 HIGH + R6 codex F1 HIGH)**: each per-item codex child's `<item-id>.review.md` file (per `--output-last-message`) contains the COMPLETE MARKDOWN review format that Claude Code's `superpowers:code-reviewer` subagent produces, matching `skills/review-pending.md` Step B requirements: **`Verdict`, `Acceptance status`, `Drift findings`, `Design-choice judgments`, `Bugs/risks`, `Merge-conflict preview`, `Suggested fixups`, `Test counts observed`**. (R6 codex F1 caught the original section list was incomplete — `Design-choice judgments` and `Merge-conflict preview` were missing.) Orchestrator extracts sections by regex match on those headings against `<item-id>.review.md`. **Parse failure semantics** (addresses R7 codex-ops F1 MED): if any required section is missing OR the file is absent OR rc≠0, the orchestrator (a) logs a queue-errors row that NAMES the specific missing section headings + rc + the first 2KB of stderr inline (durable in queue-errors.md), AND (b) preserves the child's `<item-id>.{stdout,stderr,review.md}` triple by copying them to `raw/internal/queue-errors/<ISO-ts>-review-pending-<item-id>/` BEFORE the orchestrator's `RUN_DIR` cleanup trap fires. The preserved-evidence directory gives the operator a durable pointer to inspect what the child actually produced. Don't silently drop or substitute defaults.
  - **Concurrency cap**: fan-out concurrency N ≤ 4 to avoid CPU saturation on the founder's machine. Use a counting semaphore pattern (`(( running < N ))` gate before each child spawn) rather than unbounded `&`.
  - References `adapters/codex/skills/review-pending/SKILL.md` as the synced adapter target.
- Mirror the 047 pattern in `skills/process-backlog.md` for the codex binding-specific notes section structure (header level, sandbox semantics, dogfooding journaling expectation).
- Re-sync via `tools/sync-skills.sh` so `.claude/commands/review-pending.md` and (post-AC1) `adapters/codex/skills/review-pending/SKILL.md` both reflect the new canonical body.

### AC3 — Tests

- Add `tests/sync-skills/codex-adapter.test.ts` (vitest):
  - **`materialized SKILL.md has codex-valid frontmatter`**: Run sync on a fixture canonical skill; assert `adapters/codex/skills/<name>/SKILL.md` exists; assert YAML parses; assert `name === basename`; assert `description === canonical.description`; assert `metadata.short-description` is non-empty and ≤80 chars.
  - **`YAML-safe serialization for tricky descriptions`** (addresses codex F1 from R1): fixture canonical with `description: "Use when X: do Y with 'quoted' Z"` (contains colons + apostrophes); assert sync produces parseable codex YAML; assert round-trip description equality.
  - **`body byte-identity holds`**: After sync, read canonical body (everything after closing `---`) and adapter body (everything after closing `---`); assert byte-for-byte equality.
  - **`--check passes on synced state`**: After sync, run `tools/sync-skills.sh --check`; assert exit 0; assert stderr empty.
  - **`--check fails on adapter body drift`**: After sync, mutate adapter body; run `--check`; assert exit non-zero; assert diagnostic names the drifted file.
  - **`--check fails on adapter frontmatter drift`**: After sync, mutate adapter frontmatter description; run `--check`; assert exit non-zero.
  - **`--check fails on missing adapter`**: Delete an adapter file; run `--check`; assert exit non-zero; assert diagnostic names the missing path.
  - **`--check skips out-of-scope canonical skills`**: Fixture canonical without a `## Binding-specific notes — codex` section; assert sync does NOT create an adapter for it; assert `--check` does not flag missing adapter for it.
  - **`--check rejects unexpected adapter directories`** (addresses R4 codex F2 MED): pre-create `adapters/codex/skills/merge-and-cleanup/SKILL.md` (out-of-scope skill — should not have an adapter); run `--check`; assert exit non-zero; assert diagnostic names the unexpected adapter path.
- Add `tests/sync-skills/install-codex-adapters.test.ts` (vitest, addresses codex F2 + codex-ops F3 from R1):
  - **`clean install creates symlinks under HOME=$TMPDIR`**: Set `HOME=<tmp>`; run install script; assert `<tmp>/.codex/skills/<name>` is a symlink pointing at repo's adapter dir for each in-scope skill.
  - **`pre-flight creates ~/.codex/skills if absent`**: Set `HOME=<tmp>` where `~/.codex/` exists but `~/.codex/skills/` does not; run install; assert `<tmp>/.codex/skills/` created with default permissions.
  - **`idempotent rerun is a no-op`**: Run install twice in symlink mode; assert exit 0 both times; assert no extra entries; assert symlink targets unchanged.
  - **`--copy mode creates copies with `.echo-managed` sentinel`**: Run with `--copy`; assert directory exists at target (not symlink); assert `<target>/.echo-managed` sentinel exists.
  - **`mode switch rewrites cleanly`**: Run `--symlink` then `--copy`; assert second run replaces symlink with copy; vice-versa works too.
  - **`--dry-run produces no FS changes`**: Run with `--dry-run`; assert no entries created under `<tmp>/.codex/skills/`; assert stdout lists planned ops.
  - **`non-managed conflict refuses overwrite (regular directory)`**: Pre-create `<tmp>/.codex/skills/<name>/` as a regular directory (no symlink, no sentinel); run install; assert exit non-zero; assert diagnostic names the conflicting path AND identifies it as "non-managed directory"; assert pre-existing content unchanged.
  - **`non-managed conflict refuses overwrite (non-matching symlink)`** (addresses R2 codex F3 + codex-ops F3): Pre-create `<tmp>/.codex/skills/<name>` as a symlink pointing somewhere OTHER than the repo's adapter dir (e.g., `/tmp/elsewhere`); run install; assert exit non-zero; assert diagnostic identifies it as "non-managed symlink"; assert pre-existing symlink target unchanged.
  - **`non-managed conflict refuses overwrite (regular file)`**: Pre-create `<tmp>/.codex/skills/<name>` as a regular file; run install; assert exit non-zero; assert diagnostic identifies it as "regular file"; assert pre-existing file unchanged.
  - **`unwritable HOME exits with clear error`**: Set HOME to a read-only path; run install; assert exit non-zero with `HOME` named in diagnostic.
  - **`concurrent install lock serializes probe-to-finalize`** (addresses R4 codex F1 + codex-ops F2 MED): Acquire `$HOME/.codex/.echo-locks/<name>` lock in test setup (simulate ongoing install); run install in parallel; assert second invocation exits non-zero with "another install in progress" diagnostic; release setup lock; second-attempt install succeeds.
  - **`lock applies to BOTH symlink and copy modes`** (addresses R5 codex F3 + codex-ops F1 HIGH): Test setup acquires lock; run `--symlink` install — asserts blocked with diagnostic; run `--copy` install — asserts blocked with diagnostic. Confirms lock is mode-agnostic.
  - **`stale-staging cleanup preserves staging root`** (addresses R5 codex F2 + codex-ops F2 MED): Pre-create `$HOME/.codex/.echo-staging/` with mtime > 60min ago AND a child `.echo-staging/foo-12345/` also > 60min ago; run install; assert `.echo-staging/` root STILL exists (cleanup preserved it via `-mindepth 1`); assert child `foo-12345/` was removed; assert install proceeds successfully.
  - **`stale-lock recovery — readable old timestamp`** (addresses R7 codex F2 MED): Pre-create `$HOME/.codex/.echo-locks/<name>/` with `pid=99999` (non-existent PID) AND `timestamp` file containing a unix epoch >600s ago; run install; assert install warns about stale lock, removes it, AND proceeds (no 10-min wait).
  - **`stale-lock recovery — corrupted/missing timestamp (mtime fallback)`** (addresses R7 codex-ops F2 MED): Pre-create `$HOME/.codex/.echo-locks/<name>/` with NO `timestamp` file (simulates crash between `mkdir "$LOCK"` and timestamp-write) AND dir mtime >600s ago; run install; assert install warns "lock has missing/corrupted timestamp; falling back to mtime", removes the lock, AND proceeds. Also test the non-integer-timestamp variant (`timestamp` file contains "garbage"): assert same recovery path.
  - **`parse-failure-evidence-preservation` test DEFERRED** (addresses R8 codex F1 HIGH — self-inflicted at R7): the test required an executable orchestrator+parser that 049's Out of Scope explicitly forbids implementing ("AC2 documents the codex-side mechanism in the canonical skill body; actual fan-out implementation is a separate concern"). Test contract conflicted with implementation contract. Deferred to a future spec that actually implements the codex fan-out orchestrator/parser (e.g., a `050-codex-fan-out-orchestrator` if `--copy`/`--symlink` smoke test surfaces the need). 049's AC2 still PRESCRIBES the parse-failure evidence-preservation behavior in prose; just no executable test in 049's scope.
  - **`--copy install sentinel records synced_from_commit`** (addresses R7 codex-ops F3 MED): Run `tools/install-codex-adapters.sh --copy`; assert `$HOME/.codex/skills/<name>/.echo-managed` contains a `synced_from_commit=<sha>` line matching the repo's HEAD at install time.
  - **`sync-skills.sh --check warns on stale copy-mode adapter`** (addresses R7 codex-ops F3 MED): Pre-install via `--copy` mode; modify the canonical skill in repo (changes HEAD SHA); run `tools/sync-skills.sh --check`; assert it WARNS (stderr) that `~/.codex/skills/<name>` has `synced_from_commit=<old>` but canonical is at `<new>`; assert it does NOT fail (warning, not error — install-step concern).
  - **`staging directory lives outside ~/.codex/skills`** (addresses R4 codex-ops F1 HIGH): Run install in `--copy` mode; assert staging happens under `$HOME/.codex/.echo-staging/<name>-*` NOT under `$HOME/.codex/skills/`; assert post-install `$HOME/.codex/.echo-staging/` contains no `<name>-*` orphans (cleanup happened).
  - **`stale staging cleanup runs on pre-flight`**: Pre-create `$HOME/.codex/.echo-staging/foo-12345/` with mtime > 60min ago; run install; assert pre-flight removed the stale staging directory; assert install proceeds normally.
- All tests use temporary fixture directories under `$TMPDIR` (HOME override) to avoid touching the real `adapters/codex/skills/` or `~/.codex/skills/`.
- Existing `npm run lint` + `npm run typecheck` + `tools/sync-skills.sh --check` remain clean post-change.

### AC4 — Deployment helper + AGENTS.md documentation

- Add `tools/install-codex-adapters.sh` (executable, mode 0755):
  - **Mode flag**: `--symlink` (default) | `--copy`. Both modes share the same path-resolution + conflict semantics; only the install operation differs. This addresses codex F3 / codex-ops F4 from R1 — the copy fallback is now in-AC, not just a documented mitigation.
  - **Pre-flight**: `mkdir -p "$HOME/.codex/skills"` before any link/copy operation. Required for clean-machine installs where `~/.codex/` exists but `~/.codex/skills/` doesn't yet. Addresses codex-ops F3 from R1. If `$HOME/.codex/` itself is unwritable (rare but possible under restricted profiles), exit non-zero with a clear diagnostic naming the unwritable path.
  - **Per-target lock applies to BOTH `--symlink` and `--copy` modes** (addresses R5 codex F3 + codex-ops F1 HIGH): the atomic-mkdir lock at `$HOME/.codex/.echo-locks/<name>` is acquired BEFORE the target-classification probe for BOTH install modes. Lock directory contains `pid` + `timestamp` files written immediately after acquisition (addresses R6 codex-ops F2 MED — stale lock recovery): `mkdir "$LOCK" && echo $$ > "$LOCK/pid" && date -u +%s > "$LOCK/timestamp"`. Trap removes lock on EXIT. **Stale-lock recovery — three-factor gate** (addresses R6 codex-ops F2 MED + R7 codex-ops F2 MED + R8 codex-ops F1 MED): a lock is only removed-as-stale if ALL THREE conditions hold:
    1. **Age**: `now - timestamp > 600s` (readable timestamp path), OR lock-dir mtime > 600s (corrupted/missing-timestamp fallback path — addresses R7 codex-ops F2).
    2. **PID liveness**: `kill -0 <pid> 2>/dev/null` returns non-zero (process is NOT alive) — addresses R8 codex-ops F1 MED. A still-running first install on slow filesystem >600s would have a LIVE pid; we do NOT steal its lock. If `$LOCK/pid` is missing/non-integer, conservatively treat as "unknown liveness — fall back to age-only check + warn loudly that the lock has no pid; manual recovery may be needed." (This preserves recovery from corrupted locks while not stealing live ones.)
    3. **No corresponding install process**: belt-and-braces — check for any `tools/install-codex-adapters.sh` process with the same skill name in its arguments. If found, refuse stale removal even if age + pid checks pass.
    Reading non-existent / non-integer timestamps under `set -euo pipefail` MUST NOT terminate the script — wrap reads in `[ -f "$LOCK/timestamp" ] && timestamp=$(cat "$LOCK/timestamp" 2>/dev/null) || timestamp=""`; if `[[ ! "$timestamp" =~ ^[0-9]+$ ]]`, fall through to mtime path. AC3 test covers FOUR stale-lock shapes: (a) old readable timestamp + dead pid → recover; (b) missing/corrupted timestamp + old mtime + dead pid → recover; (c) **old timestamp BUT live pid** → REFUSE to steal lock (R8 codex-ops F1 fix); (d) missing pid file → conservative warn + age-only check.
  - **Pre-install target probing** (addresses R2 codex F3 + codex-ops F3): BEFORE any `ln -snf` / `rm -rf` / `cp`, probe `$HOME/.codex/skills/<name>` and classify it:
    - **Absent** → proceed with install (either mode).
    - **Symlink AND target exactly matches `$REPO_ROOT/adapters/codex/skills/<name>`** → ECHO-managed in `--symlink` mode. If installing `--symlink`, no-op; if installing `--copy`, `rm` the symlink then create the copy.
    - **Directory AND contains a `.echo-managed` sentinel file at its root** → ECHO-managed in `--copy` mode. If installing `--copy`, `rm -rf` then re-copy (rewrites cleanly); if installing `--symlink`, `rm -rf` then create the symlink.
    - **ANY other state** (regular file, non-matching symlink, regular directory without sentinel) → REFUSE; exit non-zero with a clear diagnostic naming the conflicting path AND its detected kind ("regular file" / "non-managed symlink" / "non-managed directory"). NEVER overwrite paths that aren't ECHO-managed.
  - **For each `adapters/codex/skills/<name>/` directory** in the in-scope set (matches AC1 — only skills with codex notes get installed), after target-probing clears the path:
    - `--symlink` mode: `ln -snf "$REPO_ROOT/adapters/codex/skills/<name>" "$HOME/.codex/skills/<name>"`. The probe guarantees the target was either absent OR an ECHO-managed entity that was just removed; `ln -snf` is safe here because the only competing path types have been ruled out by the probe.
    - `--copy` mode (crash-safe staged-then-rename, **stages OUTSIDE the live codex skill root** — addresses R4 codex-ops F1 HIGH AND the original R3 codex F2 MED):
      - **Staging area is `$HOME/.codex/.echo-staging/<name>-$$`** — a sibling directory to `$HOME/.codex/skills/`, NOT inside it. Same filesystem (atomic `mv` works), but explicitly outside codex's skill discovery root. Stale `.staging-*` from a SIGKILL'd / power-lost install CANNOT be seen by next-codex-startup as a skill because codex doesn't look in `$HOME/.codex/.echo-staging/`. Pre-flight: `mkdir -p "$HOME/.codex/.echo-staging"`.
      - **Per-target lock around probe-to-finalize** (addresses R4 codex F1 + codex-ops F2 MED): before the target-classification probe, acquire a per-target lock via atomic `mkdir`: `LOCK="$HOME/.codex/.echo-locks/<name>"; mkdir -p "$HOME/.codex/.echo-locks" && mkdir "$LOCK" 2>/dev/null || { echo "another install in progress for <name>"; exit 1; }`. Trap removes the lock on EXIT: `trap 'rm -rf "$LOCK" 2>/dev/null' EXIT`. The lock serializes probe → remove → stage → mv against concurrent installer processes, eliminating the probe-to-install race.
      - **Stage + finalize** (executed under the lock): `STAGE="$HOME/.codex/.echo-staging/<name>-$$"; mkdir "$STAGE" && touch "$STAGE/.echo-managed" && cp -R "$REPO_ROOT/adapters/codex/skills/<name>/." "$STAGE/" && mv "$STAGE" "$HOME/.codex/skills/<name>"`. The sentinel is written INTO staging FIRST so even mid-copy the marker is present. Trap: `trap 'rm -rf "$STAGE" 2>/dev/null; rm -rf "$LOCK" 2>/dev/null' EXIT` (combined cleanup).
      - **Stale staging cleanup**: install script's pre-flight ALSO does `find "$HOME/.codex/.echo-staging" -mindepth 1 -maxdepth 1 -type d -mmin +60 -exec rm -rf {} +` to clean staging directories older than 60 minutes (covers SIGKILL/power-loss orphans). **`-mindepth 1` is mandatory** (addresses R5 codex F2 + codex-ops F2 MED): without it, `find` matches the `.echo-staging` root itself once it ages past 60min, deletes it, and the next `mkdir "$STAGE"` fails because the parent was removed. AC3 test asserts staging root survives a cleanup run where it's old but children are also old.
  - Idempotent: re-running in the same mode is a no-op (returns 0). Switching modes between runs (e.g. `--symlink` followed by `--copy`) is allowed and rewrites cleanly.
  - Dry-run mode: `--dry-run` prints planned operations without executing.
- Update `AGENTS.md` "Canonical Reads" section to add a "Codex skill discovery" paragraph: "If you are running as a codex binding and want ECHO's protocol skills (currently `process-backlog`, `review-pending` — per 049 in-scope set) to appear in your `/<name>` discovery, run `tools/install-codex-adapters.sh` once. Default is symlink mode (dev-friendly — edits to canonical skills propagate to `~/.codex/skills/<name>` on the next `tools/sync-skills.sh` run, no re-install needed). Pass `--copy` if codex session-start discovery doesn't resolve symlinks on your platform — BUT note: **`--copy` mode installs are SNAPSHOTS**. Future `tools/sync-skills.sh` runs update `adapters/codex/skills/*` in the repo but DO NOT update `~/.codex/skills/*`. If you use `--copy`, you MUST re-run `tools/install-codex-adapters.sh --copy` after every `tools/sync-skills.sh` to refresh installed skills (addresses R7 codex-ops F3 MED). Per-skill list grows as future specs add codex binding-specific notes + materialize their adapters."
- **Stale-copy detection — content-hash, not HEAD-SHA** (addresses R7 codex-ops F3 MED + R8 codex-ops F2 MED): each `--copy`-installed `~/.codex/skills/<name>/.echo-managed` sentinel file ALSO contains a `synced_content_sha256` line — the SHA256 hash of the source adapter's `SKILL.md` content at install time: `echo "synced_content_sha256=$(shasum -a 256 "$REPO_ROOT/adapters/codex/skills/<name>/SKILL.md" | cut -d' ' -f1)" >> "$STAGE/.echo-managed"`. (R8 codex-ops F2 fix: content-hash, NOT `git rev-parse HEAD` — HEAD changes on unrelated commits while leaving SKILL.md bytes unchanged, producing FALSE warnings; uncommitted skill edits leave HEAD unchanged while changing the bytes, producing SILENT stale state. Content-hash is the only signal that matches the actual question: "is the installed copy stale vs the current canonical?"). `tools/sync-skills.sh --check` reads the sentinel + computes the canonical's CURRENT content hash + emits a warning (stderr, not error — install-step concern, not sync-step) if any installed `--copy` adapter's `synced_content_sha256` differs. Lets the operator see "your copy-mode install is stale; re-run install-codex-adapters.sh --copy to refresh." AC3 test covers TWO cases: (a) uncommitted skill-body change → installed content_sha256 stale → check WARNS (even though HEAD unchanged); (b) unrelated commit (e.g., docs/, no skill change) → installed content_sha256 still matches → check DOES NOT warn.

### AC5 — Materialize codex adapters in this commit

- Run `tools/sync-skills.sh` after AC1/AC2 implementation lands.
- Commit the resulting `adapters/codex/skills/<name>/SKILL.md` files for every canonical skill that's in-scope per AC1.
- These are tracked artifacts in the ECHO repo — version-controlled, reviewable in future cycles, and installable via `tools/install-codex-adapters.sh` or `codex` `skill-installer` from this GitHub repo path.
- After commit, `tools/sync-skills.sh --check` MUST return exit 0 clean.

## Out of Scope (Don't Drift)

- Do not vendor-neutralize ANY canonical `skills/<name>.md` other than `review-pending.md`. The remaining skills (`process-backlog.md` already has codex notes from 047; `review-queue-{codex,cursor,codex-ops,watch}.md`, `merge-and-cleanup.md`, `process-backlog-batch.md`, etc.) get their per-skill vendor-neutralization in followups, AFTER 049's pattern proves out.
- Do not materialize codex adapters for skills lacking documented codex binding-specific notes. The in-scope materialization set is exactly `process-backlog` (codex notes from 047) + `review-pending` (codex notes added by AC2). All other skills get materialization AFTER their codex notes section lands in a future spec (addresses codex-ops F1 HIGH from R1 — prevents exposing Claude-coupled skills via codex's slash-command surface).
- Do not include `using-superpowers.md` or `role-typed-task-state.md` in the codex adapter target. Both are ECHO-namespaced cold-start primers + schema docs, not slash-command-invokable workflows. They're read by file path, not via codex skill discovery. Including them would dilute codex's slash-command surface with non-actionable skills.
- Do not generate `agents/openai.yaml` UI metadata in V1. Codex's skill-creator marks this as RECOMMENDED, not required. Defer to a followup once the basic adapter target is wired.
- Do not generate `scripts/`, `references/`, or `assets/` subdirectories under `adapters/codex/skills/<name>/`. Each skill is a single `SKILL.md` for V1.
- Do not change `tools/sync-skills.sh`'s existing Claude Code adapter behavior (`.claude/commands/<name>.md` sync). The change is purely additive — codex adapter target is added; Claude Code adapter target preserved byte-for-byte.
- Do not modify `~/.codex/skills/.system/` (codex's built-in skills like `skill-creator`, `skill-installer`). Those are user-home, codex-owned; ECHO's adapter target is `~/.codex/skills/<name>` at the same level, never inside `.system/`.
- Do not implement the Claude-Agent-tool → codex-exec-fan-out mechanism in code. AC2 documents the codex-side mechanism in the canonical skill body; actual fan-out implementation (per-item codex exec subprocess orchestration, JSON output collection, synthesis) is a separate concern — the skill body PRESCRIBES it; codex following the prescription does the work. If implementing the codex-side fan-out turns out to need helper scripts, those land as a followup spec.
- Do not replace `.claude/commands/` with a different Claude Code adapter location. The directory naming is a Claude Code design choice ECHO inherits via Cursor compat; renaming would break Cursor's discovery.
- Do not modify any backlog item, wiki page, or `docs/` content outside the specifically-named files above.

## Risk Register

- **R1 — Codex frontmatter contract may evolve.** Today codex requires `name` + `description` + optional `metadata.short-description`. Future codex versions may add required fields (e.g., `version`, `requires`). Mitigation: `sync-skills.sh`'s codex frontmatter generation is a single function; bump as needed when codex's schema changes. The AC3 frontmatter-validity test pins the V1 expectation; failures on schema changes will surface as test failures, not silent breakage.
- **R2 — Codex auto-discovery may not honor symlinks.** `tools/install-codex-adapters.sh` uses symlinks by default for dev ergonomics (edit canonical → adapter updates → codex sees new content without manual install). If codex's session-start discovery resolves only real files, the symlink approach breaks. Mitigation: the install script is required by AC4 to support a `--copy` mode (in-AC, not just a documented mitigation — addresses codex F3 and codex-ops F4 from R1). If smoke test (DoD) shows symlink mode fails discovery, builder switches to `--copy` default; either mode lands cleanly in scope.
- **R3 — Skill body length may exceed codex's <500-line target.** Codex's `skill-creator` recommends ≤500 lines per `SKILL.md` body for context-window hygiene. ECHO's `skills/review-pending.md` is currently ~150 lines; `skills/merge-and-cleanup.md` is the longest at ~250 lines. Both fit. If a future canonical skill exceeds 500 lines, the codex-side adapter would need the `references/` split codex documents — but V1 isn't blocked.
- **R4 — Two-codex reviewer roster (codex + codex-ops) loses cross-vendor signal.** This cycle deliberately uses same-vendor reviewers because the work is narrow (sync-script extension + documentation), the codex-ops lens specifically catches runtime/ops issues distinct from codex's procedural lens, and the cross-vendor pattern is proven by 047/048. If R2 verdict divergence is wider than expected, file as evidence that cross-vendor remains needed even for narrow specs.
- **R5 — Adapter content drift between sync runs.** If a builder manually edits `adapters/codex/skills/<name>/SKILL.md` without updating canonical, the next `--check` will flag it but the drift was visible to codex users in between. Mitigation: pre-commit hook (out of scope for V1) eventually; for now the AC3 `--check` test surfaces drift on every CI/local check run.
- **R6 — In-scope set scope-expansion escape hatch REMOVED.** R3 codex F3 MED flagged that an "expand mid-build IF builder also adds codex notes" provision contradicted the spec's fixed Out-of-Scope set AND the `files_to_modify` allowlist — it would reopen the drift this spec is trying to prevent. Original mitigation prose REMOVED here. If during the build phase the builder finds that codex strategist sessions commonly need `/review-queue-watch`, the builder SHOULD escalate via `agent_notes` rather than self-expand; strategist files a successor spec to add review-queue-watch (and other skills) per the same pattern. This preserves spec-discipline-as-drift-prevention.

## Tests

- `tests/sync-skills/codex-adapter.test.ts` — sync-side test cases per AC3 (frontmatter validity, YAML-safe serialization for tricky descriptions, body byte-identity, --check passes, --check fails on adapter body drift, --check fails on adapter frontmatter drift, --check fails on missing adapter, --check skips out-of-scope canonicals, --check rejects unexpected adapter directories).
- `tests/sync-skills/install-codex-adapters.test.ts` — install-helper test cases per AC3 (clean install creates symlinks, pre-flight creates ~/.codex/skills if absent, idempotent rerun, --copy mode + .echo-managed sentinel, mode-switch rewrites cleanly, --dry-run no FS changes, non-managed conflict refuses (regular dir / non-matching symlink / regular file), unwritable HOME exits with diagnostic, concurrent install lock serializes probe-to-finalize, lock applies to both symlink and copy modes, staging directory lives outside ~/.codex/skills, stale-staging cleanup preserves staging root).
- Verification commands at build time: `npm run lint`, `npm run typecheck`, targeted vitest for the new file, `tools/sync-skills.sh --check` (must return clean post-sync), `python3 tools/blocked.py` (must still select 049 or whatever's next).
- Smoke test (AC4): after `tools/install-codex-adapters.sh` runs, manually verify in a separate codex CLI session that `/review-pending` (or codex's slash-command surface) discovers the new skill. This is a one-shot human verification — log result in the builder run log; not a CI test.

## Definition of Done

- All ACs implemented.
- `npm run lint`, `npm run typecheck`, `tools/sync-skills.sh --check` all clean.
- New vitest cases pass (both `codex-adapter.test.ts` and `install-codex-adapters.test.ts`).
- `adapters/codex/skills/<name>/SKILL.md` files materialized + committed for every canonical skill in-scope per AC1 (2 skills: `process-backlog`, `review-pending`).
- `tools/install-codex-adapters.sh` is executable (mode 0755) + supports `--symlink` (default), `--copy`, `--dry-run` modes + works idempotently against a clean `~/.codex/skills/` AND against an absent `~/.codex/skills/` (`mkdir -p` pre-flight).
- AGENTS.md gains the codex-skill-discovery paragraph with both install modes documented.
- Builder smoke test recorded in the run log: codex CLI sees the synced skills + can trigger at least one (`review-pending`). If symlink mode fails discovery, builder switches to `--copy` default and re-runs smoke. Either mode landing cleanly satisfies DoD.

## After Completion (Strategist Notes)

- **Wiki promotion:** Create `wiki/surfaces/codex-skill-adapter` documenting the third adapter target + its install pattern. Update `wiki/operating-model/` to reflect that ECHO's cross-tool protocol now has three concrete adapter targets (Claude Code, Cursor's Claude via compat, codex). Regenerate `wiki/index.md` via `tools/wiki_index.py`. Update `.manifest.json`.
- **Followups to file**:
  - Extend vendor-neutralization pattern (AC2 shape) to remaining canonical skills: `merge-and-cleanup`, `review-queue-codex`, `review-queue-cursor`, `review-queue-codex-ops`, `review-queue-watch`, `process-backlog-batch`. Each is ≤1h friction-fix.
  - Generate `agents/openai.yaml` for each codex adapter — needed for nice UI labels in codex's skill list. Mirror of `scripts/init_skill.py` invocation in codex's skill-installer.
  - Pre-commit hook to enforce `tools/sync-skills.sh --check` clean on every commit touching `skills/` or `.claude/commands/` or `adapters/codex/skills/`.
  - Verify codex auto-discovery honors symlinks (R2). If not, switch install script default to copy mode.
  - When codex eventually supports project-local skill discovery (`<repo>/.codex/skills/` or similar), revisit whether the install-step symlink is still needed.
- **Retire from `_followups.md`**: this spec doesn't directly resolve a current 047 followup line; it serves the (e2) vendor-coverage gap at the skill-discovery layer for codex strategist. Note in the merge commit that 049 lands the third adapter target the cross-tool-protocol decision doc explicitly anticipated.
