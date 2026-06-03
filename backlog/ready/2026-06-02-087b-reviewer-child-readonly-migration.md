---
id: 2026-06-02-087b-reviewer-child-readonly-migration
title: "Reviewer-child read-only migration — move `<reviewer>.md` write+commit from inside the AI child to the wrapper/orchestrator, then flip codex/codex-ops `agent_sandbox` → read-only (the R1 fabrication-surface fix; consumes 087's binding fields)"
status: ready
priority: HIGH
estimate: 1-1.5d
created: 2026-06-02
blocked_by:
  - 2026-06-02-087-reviewer-invocation-argv-contract
task_state_ref: 2026-06-02-087b-reviewer-child-readonly-migration
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - tools/review-queue/reviewer-bindings.json                       # AC3 — flip codex + codex-ops `agent_sandbox: danger-full-access` → `read-only` and `commit_policy: child` → `wrapper`. (087 created these fields as descriptive; 087b makes them enforced reality.)
  - tools/review-queue/_run_reviewer.sh                             # AC1+AC2 — the wrapper, NOT the child, writes+commits+pushes the canonical `<reviewer>.md`. The child runs at the binding's `agent_sandbox` (now read-only), produces its review CONTENT via the capture mechanism (per 087's `capture.kind`), and the wrapper validates + writes the file + commits via push-with-retry. The child no longer self-commits.
  - tools/review-queue/commit-reviewer-response.sh                  # AC1 — invoked by the WRAPPER (post-capture), not from inside the AI child. (If the child currently calls it, that call moves out to the wrapper; the script itself may stay, now wrapper-owned.)
  - skills/review-queue-codex.md                                    # AC1 — remove the in-child write/commit/push of `<reviewer>.md`; the child's contract becomes "produce review content to <capture target>", the wrapper publishes. Also fix the stale journal/HTML-twin prose (R3): point at the monthly shard, drop the HTML-twin commit (CLAUDE.md current).
  - skills/review-queue-codex-ops.md                                # AC1 — same as codex (content-only child; stale-journal/HTML-twin prose fixed).
  - skills/review-queue-cursor.md                                   # AC1 — same migration for the cursor reviewer path (mode:ide-manual capture as applicable).
  - skills/review-queue-claude.md                                   # AC1 — same migration for the claude reviewer path.
  - .claude/commands/review-queue-codex.md                          # AC1 — regenerated adapter; `tools/sync-skills.sh` then `--check` passes (do NOT hand-edit).
  - .claude/commands/review-queue-codex-ops.md                      # AC1 — regenerated adapter.
  - .claude/commands/review-queue-cursor.md                         # AC1 — regenerated adapter.
  - .claude/commands/review-queue-claude.md                         # AC1 — regenerated adapter.
  - docs/review-queue-setup.md                                      # AC4 — update to the read-only-child + writer-owned-commit model; remove the `danger-full-access` review-child blessing; the "Why these flags" rationale now states the AI child reads+reasons only, commit/push lives in the wrapper. Remove 087's forward-pointer (now landed).
  - tests/review-queue/reviewer-readonly.test.* (path per repo convention)  # AC5 — assert: codex/codex-ops bindings resolve `read-only`; the child has no commit capability (no `git commit`/`commit-reviewer-response.sh` invoked from inside the child path); the wrapper publishes a valid `<reviewer>.md` from captured content; a child write attempt under read-only is denied/no-ops without losing the review.

spec_refs:
  - backlog/complete/2026-06-02-087-reviewer-invocation-argv-contract.md  # PARENT (impl-time dep). LIFECYCLE-MOBILE PATH (r1 codex F4): 087 is in pending_review/ as of 2026-06-02; `blocked_by` guarantees it is in complete/ before 087b is claimable, so the builder will read it at THIS complete/ path. (If consulting before merge, it is at backlog/pending_review/2026-06-02-087-reviewer-invocation-argv-contract.md.) 087 ships the argv binding file + `agent_sandbox`/`commit_policy` as DESCRIPTIVE fields recording current reality + the `capture.kind` enum (incl. the `stdout` kind 087b wires); 087b flips those values + moves the commit so the descriptions become enforced.
  - backlog/pending_review/2026-06-02-085-reviewer-invocation-contract.md  # 087b = the half of 085 that was dropped (085 AC3 read-only enforcement + the OoS#1 orchestrator-owned-sidecar migration). 085's contradiction was enforcing read-only WHILE keeping child self-commit; 087b resolves it by moving the commit FIRST, then flipping read-only.
  - tools/review-queue/commit-reviewer-response.sh  # the script the AI child calls today to self-commit `<reviewer>.md` — the exact seam that must move to the wrapper.
  - skills/review-queue-codex.md  # the reviewer prompt that performs write/commit/push from inside the child (the R1 self-commit + R3 stale-journal/HTML-twin prose) — both fixed here.
  - raw/internal/queue-errors.md  # the rc=143 084 review-pending PARSE-FAIL (child hung after verification, never emitted review markdown) + the fabricated-sidecar incident — the concrete R1/R2 motivation for taking commit (and full-access) away from the AI child.
  - backlog/complete/2026-06-02-086-claim-gate-spec-review-convergence.md  # if merged: the spec-review claim gate. 087b is itself a reviewed spec; once 086 ships, 087b must reach review convergence before it is claimable.

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# 087b — Reviewer-child read-only migration (the R1 fix; consumes 087's binding fields)

## Why (the friction this closes)

Today the review AI child runs at `--sandbox danger-full-access` and **commits its own `<reviewer>.md` from inside the child** (`commit-reviewer-response.sh`, invoked by the reviewer prompt). That is the **R1 fabrication surface**: at the 084 review a full-access child wrote a stale/fabricated sidecar, and another child hung after verification and never emitted its review (rc=143, `queue-errors.md`). An AI child that both reasons about a diff AND has commit + full-filesystem + network capability is the wrong trust boundary.

The fix is a **two-actor split**: the AI child reads + reasons + produces review *content* (read-only, no commit); the **wrapper/orchestrator** validates that content and publishes the canonical `<reviewer>.md` (write + commit + push). 085 tried to do this in one spec but contradicted itself (enforce read-only WHILE keeping child self-commit). 087b does it in the right order — **move the commit to the wrapper FIRST, then flip the child to read-only** — and it builds on 087's binding file, which already carries the `agent_sandbox`/`commit_policy`/`expected_artifact` fields for exactly this.

## Locked decisions

1. **Move the artifact write+commit+push AND the coord lifecycle from the child to the wrapper.** The child's contract becomes "emit review content to the capture target (per 087's `capture.kind`)"; the wrapper validates (existing schema gate) + writes `<reviewer>.md` + commits via `push-with-retry.sh`, AND owns `tick_start`/`tick_end` outcome + post-response journaling (a content-only child can't know whether the wrapper's publish succeeded — r1 codex-ops F2). `commit-reviewer-response.sh` becomes wrapper-owned.
1a. **The read-only child's capture channel is `stdout` (wrapper-owned, outside the child sandbox), not the `committed_file` 087 wired.** A read-only child can't write the canonical file; the wrapper redirects child stdout to `capture.stdout_path` and publishes from it. This is wiring an already-087-enum-defined kind, not a new one (r1 codex F1 + codex-ops F1).
2. **Then flip `agent_sandbox` → `read-only`** for codex + codex-ops in `reviewer-bindings.json` — AND the `--sandbox` token in the binding's `argv`, since 087's gate resolves argv verbatim and the argv is the actual runtime control (a metadata-only flip is theater — r1 codex F2). The child can no longer commit/write even if a prompt regresses — enforced by sandbox, not just prose.
3. **Order matters: commit-move BEFORE sandbox-flip** within the item (otherwise a read-only child that still tries to self-commit loses its review — the 085 trap).
4. **Fix the stale reviewer-prompt prose in the same pass** (R3): monthly journal shard, no HTML-twin commit. Low-cost, same files.

## Acceptance criteria

- **AC1 — wrapper owns the artifact AND the coordination lifecycle.** The reviewer prompts (`skills/review-queue-*.md` + regenerated `.claude/commands/*`) no longer write/commit/push `<reviewer>.md` from inside the child; the child emits review content to the capture target. `_run_reviewer.sh` (the wrapper) validates the captured content against the reviewer schema and writes + commits + pushes `<reviewer>.md`. `commit-reviewer-response.sh` is invoked by the wrapper, never the child. **Lifecycle ownership (r1 codex-ops F2): the wrapper — not the content-only child — owns the coord lifecycle and post-response journaling. The wrapper emits `tick_start` before spawning the child and emits `tick_end` with its outcome ONLY after its own validate → write → commit → push succeeds (or fails); the post-response dogfooding-journal append also moves to the wrapper (after the response commit lands).** The child no longer emits `tick_end` or journals — it cannot know whether the wrapper's schema-validate / `os.link` race-guard / upstream-duplicate check / commit / push succeeded, so reporting `completed` from inside the child would record success for a response that may never land (or leave `tick_start` open until `deadline_missed` even on a successful wrapper publish). `tools/sync-skills.sh --check` passes.
- **AC2 — capture path named + wired (the load-bearing fix, r1 codex F1 + codex-ops F1).** A read-only child CANNOT write the canonical `<reviewer>.md`, so the `committed_file` capture 087 wired for headless reviewers is unusable here. 087b switches codex + codex-ops to a **non-committed, wrapper-owned capture channel that already exists in 087's `capture.kind` enum** (NOT a new kind — see AC6): the wrapper redirects the child's **stdout** to `capture.stdout_path` (a wrapper-owned path OUTSIDE the child's read-only sandbox, so the redirection is performed by the wrapper/parent shell, not the child), and the child's contract becomes "emit the review markdown as its final stdout message." The wrapper reads `capture.stdout_path` (and `capture.rc_path`), validates the content against the reviewer schema, and publishes `<reviewer>.md`. Set each migrated binding's `capture.kind` accordingly. **No-content / hung / malformed-content all yield a durable queue-error (not a silent miss and not an infinite re-poll)** — `rc != 0`, empty `stdout_path`, or schema-invalid content each route to the `queue-errors.md` durable diagnostic. This directly addresses the rc=143 PARSE-FAIL class.
- **AC3 — sandbox flipped at RUNTIME, not just in metadata (r1 codex F2).** 087's gate resolves the binding's `argv` vector verbatim and does NOT derive the sandbox from the `agent_sandbox` field — so the actual codex/codex-ops sandbox lives in the argv (`codex exec … --sandbox danger-full-access`). 087b therefore flips BOTH for codex + codex-ops: (i) the `argv` `--sandbox danger-full-access` token → `--sandbox read-only`, AND (ii) the descriptive `agent_sandbox: danger-full-access` → `read-only` and `commit_policy: child` → `wrapper`. After 087b, **no codex/codex-ops binding carries `danger-full-access` in either its argv OR its `agent_sandbox`** (AC5 asserts the *resolved* argv, so a metadata-only flip that left the argv full-access fails the gate). To prevent future argv/metadata drift, the gate SHOULD reject a binding whose resolved argv sandbox token disagrees with its `agent_sandbox` field. (The wrapper retains its own git/worktree capability — only the AI child is constrained.) **Scope (r1 codex F3): this ban is codex/codex-ops ONLY.** Claude's binding keeps whatever 087 recorded (the `056-claude-required-flag-gate` / `--dangerously-skip-permissions` decision stays OoS per AC6); AC3 does not touch the claude or cursor bindings.
- **AC4 — docs to the read-only model.** `docs/review-queue-setup.md` describes read-only AI children + writer-owned commit; the `danger-full-access` review-child blessing is removed; 087's forward-pointer is resolved.
- **AC5 — tests green (each finding falsifiable).** New/updated tests prove: (i) codex/codex-ops bindings resolve `agent_sandbox: read-only` AND their **resolved argv contains `--sandbox read-only` and NOT `danger-full-access`** (r1 codex F2 — runtime, not metadata); (ii) no `git commit` / `commit-reviewer-response.sh` is invoked from inside the child path; (iii) the wrapper publishes a schema-valid `<reviewer>.md` from the captured `stdout_path` content (r1 F1); (iv) **no-content (rc≠0 / empty stdout) AND malformed/schema-invalid content each produce a durable `queue-errors.md` diagnostic — not a silent miss, not an infinite re-poll** (the rc=143 class); (v) **lifecycle: the wrapper emits `tick_end` with the correct outcome on validation-failure, push-failure, duplicate_response/upstream_duplicate, and successful publish, and `tick_start` is wrapper-owned so a successful wrapper publish never leaves an orphaned-open `tick_start`** (r1 codex-ops F2). Full `npm test` + typecheck + lint + `tools/sync-skills.sh --check` green.
- **AC6 — no scope drift.** Only the commit-ownership + lifecycle-ownership + sandbox-flip + capture-rewire + prompt-prose fixes. **"No new capture kind beyond what 087 defined" means: WIRING an already-087-`capture.kind`-enum-DEFINED kind (`stdout`) for the read-only child IS in scope (that is the migration, AC2); inventing a `capture.kind` value outside 087's enum is OoS.** The `danger-full-access` ban is codex/codex-ops ONLY — the `056-claude-required-flag-gate` decision and the claude/cursor bindings stay OoS (r1 codex F3). No `requested_reviewers` claim-gate; coord-roles SLA config untouched.

## Out of Scope

- `NormalizedReviewIntermediate`, evidence byte-cap/redaction, schema enum-sync codegen, per-binding preflight/smoke, headless watcher — all remain successors.
- The `056-claude-required-flag-gate` (`--dangerously-skip-permissions` vs settings.json) stays out.

## After Completion (Strategist Notes)

- This closes the R1/R2 reviewer-child friction from the 2026-06-02 friction audit (danger-full-access child + child self-commit + rc=143 hang).
- Wiki: update `wiki/surfaces/review-queue.md` "reviewer-binding contract" — the `agent_sandbox`/`commit_policy` fields are now ENFORCED (read-only child, wrapper-owned commit). Update `.manifest.json` + regen index.
