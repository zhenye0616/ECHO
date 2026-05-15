---
id: 2026-05-14-052-sync-skills-check-in-merge-and-cleanup
title: /merge-and-cleanup C5 verify includes tools/sync-skills.sh --check + pre-commit hook
status: ready
priority: MEDIUM
estimate: 0.25-0.5d
created: 2026-05-14
blocked_by: []
task_state_ref: 2026-05-14-052-sync-skills-check-in-merge-and-cleanup
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - skills/merge-and-cleanup.md  # AC1 — C5 verify block adds `tools/sync-skills.sh --check`; failure aborts merge with explicit error
  - .claude/commands/merge-and-cleanup.md  # AC2 — re-synced from canonical after AC1 edit (must be byte-identical to the canonical post-edit)
  - tools/install-pre-commit-hook.sh  # NEW (AC3) — idempotent installer for `.git/hooks/pre-commit` running `tools/sync-skills.sh --check`; documents overwrite policy
spec_refs:
  - skills/merge-and-cleanup.md  # AC1 target — current C5 block lists `npm install / npm test / npm run lint / npm run typecheck`; this spec appends the sync-identity check
  - tools/sync-skills.sh  # consumed (`--check` mode); NOT modified by this spec — it already supports --check (verified via header `tools/sync-skills.sh --check    # verify identity, exit non-zero on drift`)
  - raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md  # "Next steps" section explicitly names the pre-commit hook as a deferred follow-up; this spec ships it
  - backlog/_followups.md  # line 713 (045 code-reviewer subagent meta-finding) + line 754 (cross-cut: post-merge adapter drift) — both name this exact two-prong fix; line 713 explicitly says "Tiny scope (one line in merge-and-cleanup skill prose, plus maybe a pre-commit hook script)"

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

# /merge-and-cleanup C5 verify includes `tools/sync-skills.sh --check` + pre-commit hook

## Why this spec exists

ECHO's skills protocol (per `raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md`) treats `skills/<name>.md` as the canonical, vendor-neutral source and `.claude/commands/<name>.md` as a derived materialized adapter, kept in sync by `tools/sync-skills.sh`. The `--check` mode of that script verifies byte identity and exits non-zero on drift.

Drift can be introduced two ways:

1. **Direct adapter edit:** a builder edits `.claude/commands/<name>.md` (because that's the file Claude Code consumes) without re-running `tools/sync-skills.sh`. The canonical and the adapter diverge silently.
2. **Stale-fork merge (cross-cut from `_followups.md` line 754):** a feature branch forks from `main`, then a *different* merged commit on `main` updates `skills/<name>.md` AND its adapter via the sync script. When the feature branch finally merges, git's text-level merge succeeds (no conflicts), but the *materialized adapter* in the merged tree no longer matches the canonical, because the rebase/merge re-applied the older adapter snapshot. Git cannot surface this textually — the only mechanical detector is `tools/sync-skills.sh --check`.

The friction has been observed twice (`_followups.md` lines 713 + 754, both meta-findings from prior code-reviewer subagent runs across the 045 and 049 cycles). The fix is two-prong:

- **(a) Merge-time gate:** `/merge-and-cleanup`'s C5 verify block runs `tools/sync-skills.sh --check`. If it fails, the merge aborts before commit, with an explicit error pointing the operator at `tools/sync-skills.sh` to re-derive. This catches case #2 (stale-fork) at merge time, when there is still a half-staged tree to fix.
- **(b) Pre-commit hook:** an idempotent installer ships at `tools/install-pre-commit-hook.sh` that drops a `.git/hooks/pre-commit` script running `tools/sync-skills.sh --check`. Founder runs the installer once per checkout. Catches case #1 (direct adapter edit) at the moment the bad commit is being created.

The merge-time gate is the load-bearing half (it catches both cases at the integration point and is enforced by the skill prose). The pre-commit hook is the optional convenience layer for the founder's local workflow — it does **not** replace the merge gate, and it is **not** auto-installed by any other tool. The founder runs `tools/install-pre-commit-hook.sh` deliberately, once.

## Architectural invariant

**The merged tree on `main` always has `tools/sync-skills.sh --check` clean.** No commit lands on `main` whose canonical/adapter pair drifts. The merge-and-cleanup skill is the durable enforcement; the pre-commit hook is the local-loop accelerator.

## Acceptance Criteria

### AC1 — `/merge-and-cleanup` C5 verify runs `tools/sync-skills.sh --check`

- **Modified file:** `skills/merge-and-cleanup.md` Step C5.
- **Edit:** append `tools/sync-skills.sh --check` to the C5 verify command list, AFTER `npm run typecheck` and BEFORE the `package-lock.json` regeneration sub-block. The command runs from the project root (the C5 block is already inside `cd ~/Desktop/Project_echo` per Step A).
- **Failure semantics:** if `tools/sync-skills.sh --check` exits non-zero, C5 follows the existing failure pattern documented in the prose immediately below the verify commands (*"If any verify step fails: pause and surface the failure. Do not auto-fix."*). The error message MUST explicitly name the remediation: `"sync-skills check failed — adapter drift between skills/ and .claude/commands/. Run \`tools/sync-skills.sh\` to re-derive, then re-stage and reply 'continue'."`
- **No auto-fix:** the merge command MUST NOT run `tools/sync-skills.sh` (without `--check`) on the operator's behalf. Drift is a real signal that the operator needs to see — auto-fix would mask cases where the canonical was edited on a parallel branch and the adapter snapshot the merge produced is the *wrong* derived form. The operator inspects, decides, runs the sync deliberately, re-stages, and replies `continue`. Same posture as the existing `npm test` / `npm run lint` / `npm run typecheck` failures.
- **Position rationale:** placed after the npm chain because the npm verify is the most likely to fail (and most expensive to re-run); sync-check is fast and orthogonal — running last keeps the slow chain in front of the cheap chain. Placed before the `package-lock.json` regeneration block because that block is conditional (only runs if `package.json` was a conflict) and runs `npm install` / `git add` of its own.

### AC2 — `.claude/commands/merge-and-cleanup.md` re-synced post-AC1 edit

- After applying AC1's edit to `skills/merge-and-cleanup.md`, the builder runs `tools/sync-skills.sh` once. The resulting `.claude/commands/merge-and-cleanup.md` MUST be byte-identical to the canonical (verifiable via `tools/sync-skills.sh --check` exiting 0).
- Both files are committed in the same commit. (The builder MUST NOT split the canonical edit and the adapter re-derive across two commits; the intermediate state would be a self-induced drift that AC4's grep test and the new pre-commit hook would both flag.)
- This AC is recursive in spirit: the spec that adds the merge-time gate is itself the first commit that would have failed the gate had it shipped without re-syncing. Builder MUST verify locally with `tools/sync-skills.sh --check` exits 0 before pushing the feature branch.

### AC3 — `tools/install-pre-commit-hook.sh` ships, idempotent, with documented overwrite policy

- **NEW file:** `tools/install-pre-commit-hook.sh` (executable: `chmod +x`).
- **What it does:** writes `.git/hooks/pre-commit` containing a small bash script that runs `tools/sync-skills.sh --check` and exits non-zero if drift is detected. The hook script's body MUST `cd "$(git rev-parse --show-toplevel)"` before invoking the check so it works regardless of where `git commit` was launched from.
- **Idempotent:** running the installer twice produces the same `.git/hooks/pre-commit` (byte-identical). Implementation: write to a temp file, compare with the existing hook (if any), only `mv` over the live path if content differs. Print `"pre-commit hook unchanged"` on no-op or `"pre-commit hook installed at .git/hooks/pre-commit"` on first install / update.
- **Overwrite policy (documented in installer header comment AND printed at runtime):** the installer **overwrites** any existing `.git/hooks/pre-commit` unconditionally. Rationale: pre-commit hooks are local-only (never committed), this installer is documented as the canonical way to install ECHO's hook, and merging this hook with a hand-written one is out of scope. Operators who have a custom pre-commit hook MUST manually concatenate the two — the installer's printed output reminds them by saying: `"NOTE: existing .git/hooks/pre-commit was overwritten. If you had a custom hook, restore it from your shell history or version-controlled backup."`
- **Manual install only:** the installer is NOT auto-invoked by any other tool, skill, or test. The founder runs it once per checkout, deliberately. (Out of Scope #1 enforces this.)
- **No registration / discovery:** the installer does not write to any config file outside `.git/hooks/`. It does not append to a manifest or registry. One file in, one file out.

### AC4 — Operational test: C5 prose contains the literal string `tools/sync-skills.sh --check`

- **NEW or extended test:** a small grep-style assertion that the canonical `skills/merge-and-cleanup.md` C5 block contains the literal string `tools/sync-skills.sh --check`. Implementation forms acceptable, in preference order:
  1. Add a test case to an existing skills-shape test under `tests/` if one exists for `merge-and-cleanup.md`. Otherwise:
  2. Add a one-liner shell assertion to the existing CI-run point most adjacent to skills (e.g., a script invoked from `npm test`) that does `grep -q "tools/sync-skills.sh --check" skills/merge-and-cleanup.md || { echo "AC4 fail: C5 missing sync-skills check"; exit 1; }`. Otherwise:
  3. Create a minimal `tests/skills/merge-and-cleanup-shape.test.ts` with a single test that does the equivalent grep via `fs.readFileSync` + `expect(content).toContain("tools/sync-skills.sh --check")`.
- **Why a literal-string test, not a behavioral test:** behavioral testing of the C5 verify (running an actual merge with adapter drift and asserting the merge aborts) requires fixturing a worktree, a stale-fork branch, and a captured-stdout assertion. That's out of scope for this small spec. The literal-string test catches the most likely regression (a future skill edit removes the `--check` line by accident) without the fixture cost. If subsequent dogfooding shows the literal-string test isn't enough, file a follow-up.
- **Test must run in `npm test`** so it's part of the gate that the merge-and-cleanup C5 block already runs (closing the loop: the gate that's being added is itself protected by the existing gate).

## Out of Scope (Don't Drift)

1. **Auto-install of the pre-commit hook from any other tool, skill, or test.** The installer must be manually invoked by the founder. No `process-backlog.md` / `merge-and-cleanup.md` / `install-codex-adapters.sh` / npm script silently calling `install-pre-commit-hook.sh`. (Auto-install would create surprise modifications to `.git/hooks/`, which is a directory operators reasonably expect to be theirs to manage.)
2. **A new hook discovery / orchestration system.** This spec ships ONE hook script and ONE installer. No `tools/install-all-hooks.sh`, no hooks manifest, no per-hook registry. If/when a second ECHO-managed hook appears, that spec can introduce orchestration; YAGNI now.
3. **Modifying `tools/sync-skills.sh` itself.** It already supports `--check`. This spec only consumes that mode. Any change to `sync-skills.sh` is a separate spec.
4. **Touching other skill files' adapter sync.** Only `merge-and-cleanup.md` gets the C5 update. `process-backlog.md` / `review-pending.md` / `review-queue-*.md` are unchanged. The merge-time gate is the universal protection; per-skill enforcement is redundant.
5. **Behavioral test of the C5 abort.** AC4 ships a literal-string test only. Fixturing an end-to-end merge-with-drift is meaningful work; defer.
6. **CI integration of `tools/sync-skills.sh --check`.** The merge-time gate (C5) and the local-loop pre-commit hook are sufficient for V1.5+. A separate CI step is fine but out of scope for this spec.
7. **Documenting the hook in CLAUDE.md / README.md / wiki.** Wiki docs land post-merge per the strategist's promotion step. CLAUDE.md edits are out of scope here unless a reviewer surfaces a concrete operational gap.
8. **Cursor / Codex adapter directories.** This spec is about the existing `skills/` ↔ `.claude/commands/` sync only. Cursor + Codex deploy paths are a separate gap (see `_followups.md` lines 770-778).

## Risks

- **R1 — pre-commit hook overwrites operator's custom hook silently.** Mitigated by AC3's printed warning + header-comment documentation. Acceptable: pre-commit hooks are local-only, the installer is opt-in, and the warning makes the overwrite explicit.
- **R2 — C5 abort surfaces too aggressively in cycles where the canonical was legitimately updated on a parallel branch.** This is the *intended* behavior — the operator should see the drift and re-derive. Mitigation is operator-side (run `tools/sync-skills.sh`, re-stage, continue), not skill-side.
- **R3 — the literal-string AC4 test is fragile against future cosmetic refactors of C5 (e.g., breaking the verify chain into smaller blocks).** Acceptable: a refactor that removes the literal string `tools/sync-skills.sh --check` is precisely the regression we want to catch. The test failing on a deliberate refactor is a feature, not a bug — the refactor's spec must update the test.

## Definition of Done

- AC1: `skills/merge-and-cleanup.md` C5 verify block contains `tools/sync-skills.sh --check`; failure surfaces with the exact remediation message named in AC1.
- AC2: `.claude/commands/merge-and-cleanup.md` byte-identical to canonical post-edit; `tools/sync-skills.sh --check` exits 0 in the feature branch's tree.
- AC3: `tools/install-pre-commit-hook.sh` exists, executable, idempotent on re-run, prints overwrite warning, documented header comment.
- AC4: `npm test` includes an assertion that `skills/merge-and-cleanup.md` contains the literal string `tools/sync-skills.sh --check`.
- All four ACs verified locally before pushing the feature branch.

## After Completion (Strategist Notes)

- **No new wiki page.** This is a maintenance / drift-prevention edit to an existing skill. The cross-tool-protocol decision (`raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md`) already documents the canonical/adapter relationship; the merge-time gate is an operational detail of that pattern.
- **Add a one-line note** to the cross-tool-protocol decision's "Next steps" section recording that the pre-commit hook landed (so the deferred-followup item is closed-out in the decision doc itself).
- **Do NOT update `_followups.md` lines 713 + 754 entries** — those are historical observations; resolution gets recorded in this spec's `review_notes`, which is the pattern other completed specs follow.
- **Wiki promotion (if/when):** if the merge-time gate proves load-bearing across multiple cycles (e.g., catches drift in 2+ subsequent merges), promote to `wiki/operating-model/` as a documented protocol invariant. Don't pre-promote — wait for empirical signal.
