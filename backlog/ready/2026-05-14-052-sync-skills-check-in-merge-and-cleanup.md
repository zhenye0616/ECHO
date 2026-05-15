---
id: 2026-05-14-052-sync-skills-check-in-merge-and-cleanup
title: /merge-and-cleanup C5 verify includes tools/sync-skills.sh --check + pre-commit hook
status: ready
priority: MED
estimate: 0.25-0.5d
created: 2026-05-14
blocked_by: []
task_state_ref: 2026-05-14-052-sync-skills-check-in-merge-and-cleanup
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - skills/merge-and-cleanup.md  # AC1 — C5 verify block adds `tools/sync-skills.sh --check`; failure aborts merge with explicit error
  - .claude/commands/merge-and-cleanup.md  # AC2 — re-synced from canonical after AC1 edit (must be byte-identical to the canonical post-edit)
  - tools/install-pre-commit-hook.sh  # NEW (AC3) — idempotent installer for the resolved pre-commit hook path running `tools/sync-skills.sh --check`; documents overwrite policy; respects `core.hooksPath`; repairs non-executable mode
  - tests/tools/install-pre-commit-hook.test.ts  # NEW (AC3 installer test) — covers fresh install, idempotent no-op, mode-repair on non-executable existing hook, content-differs overwrite warning, and linked-worktree path resolution
  - tests/skills/merge-and-cleanup-shape.test.ts  # NEW (AC4 block-extraction test) — extracts C5 verify block and asserts the literal `tools/sync-skills.sh --check` is inside the extraction
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
- **What it does:** writes a small bash script (running `tools/sync-skills.sh --check` and exiting non-zero on drift) to the resolved pre-commit hook path for the current checkout. The hook script's body MUST `cd "$(git rev-parse --show-toplevel)"` before invoking the check so it works regardless of where `git commit` was launched from.
- **Hook path resolution (load-bearing — codex-ops R1 F5 + codex/codex-ops R2):** the installer MUST NOT hardcode `.git/hooks/pre-commit`. ECHO's normal workflow includes linked worktrees where `.git` is a pointer file, not a directory; a hardcoded path either fails or writes to the wrong location while the installer still prints success. Required resolution order:
  1. Read `git config --get core.hooksPath`. If non-empty:
     - If the value is an **absolute path** (begins with `/`), use `<that>/pre-commit` directly.
     - If the value is a **relative path** (anything else, including `./foo`, `foo/bar`, etc.), normalize it against the repo's working tree root: `HOOK_PATH="$(git rev-parse --show-toplevel)/<that>/pre-commit"`. (Required because `git config --get core.hooksPath` returns the raw stored string; Git itself resolves relative `core.hooksPath` values against the repo root, not the cwd from which `git` was invoked. An installer that does `"$hooks_path/pre-commit"` from a subdirectory would print success while writing to `<cwd>/<hooksPath>/pre-commit` and silently leaving the real Git hook path untouched — codex R2 F-B / codex-ops R2 F-B.)
  2. Otherwise use `git rev-parse --git-path hooks/pre-commit` (which correctly resolves through the main repo's git common dir from inside a linked worktree).
  3. `mkdir -p "$(dirname "$HOOK_PATH")"` before writing, in case the resolved directory does not yet exist.
- **Idempotent (content AND mode):** running the installer twice produces a `pre-commit` hook that is byte-identical AND executable for the user. Implementation: write to a temp file (in the same directory as the resolved hook path to keep the rename atomic on the same filesystem), compare with the existing hook (if any). Branches:
  - **Content differs OR hook missing:** `mv` the temp file over the live path, then `chmod u+x "$HOOK_PATH"`. Print `"pre-commit hook installed at <resolved-path>"`.
  - **Content byte-identical AND existing hook is already executable for the user:** discard the temp file. Print `"pre-commit hook unchanged"`.
  - **Content byte-identical BUT existing hook is NOT executable for the user (codex-ops R1 F4 — git silently ignores non-executable hooks, so a no-op reinstall that leaves a non-executable hook is a silent failure):** discard the temp file, then `chmod u+x "$HOOK_PATH"` to repair the mode in place. Print `"pre-commit hook mode repaired (was non-executable) at <resolved-path>"`.
- **Overwrite policy (documented in installer header comment AND printed at runtime):** the installer **overwrites** any existing pre-commit hook content unconditionally on the content-differs branch. Rationale: pre-commit hooks are local-only (never committed), this installer is documented as the canonical way to install ECHO's hook, and merging this hook with a hand-written one is out of scope. Operators who have a custom pre-commit hook MUST manually concatenate the two — the installer's printed output reminds them on the content-differs branch by saying: `"NOTE: existing pre-commit hook was overwritten. If you had a custom hook, restore it from your shell history or version-controlled backup."`
- **Manual install only:** the installer is NOT auto-invoked by any other tool, skill, or test. The founder runs it once per checkout, deliberately. (Out of Scope #1 enforces this.)
- **No registration / discovery:** the installer does not write to any config file outside the resolved hooks directory. It does not append to a manifest or registry. One file in, one file out.
- **Installer test (codex-ops R1 F4):** a `bats` or shell-based test (or a TypeScript test using `child_process.execSync`) under `tests/tools/install-pre-commit-hook.test.*` MUST cover all four cases above in a throwaway repo:
  1. Fresh install (no existing hook): asserts the resolved hook exists AND is executable for the user (`-x "$HOOK_PATH"` true).
  2. Idempotent re-install with hook present + executable + byte-identical: asserts the file's mtime is unchanged (proves no rewrite) AND it remains executable.
  3. Mode-repair re-install with hook present + byte-identical + `chmod -x` applied first: asserts the hook is executable after the installer runs, AND the "mode repaired" prose appears in stdout.
  4. Content-differs re-install with hook present + different content: asserts the new content lands, the file is executable, AND the "was overwritten" warning appears in stdout.
  5. Linked-worktree scenario: install from a worktree created via `git worktree add`; assert the installer resolves the hook into the main repo's hooks directory (NOT into the worktree's `.git` pointer file), and assert `-x "$HOOK_PATH"`.
  6. **Relative `core.hooksPath` from nested cwd:** in a throwaway repo, `git config core.hooksPath relative/hooks` (a relative value), then `cd` into a subdirectory (e.g. `tools/`) and run the installer. Assert the hook lands at `<repo-root>/relative/hooks/pre-commit` (i.e. resolved relative to the repo's working-tree root, NOT relative to the cwd where the installer was invoked), AND that the file is executable. (codex R2 F-B / codex-ops R2 F-B — guards against the silent-misplaced-hook failure mode where a naive installer writes to `tools/relative/hooks/pre-commit` and reports success.)

### AC4 — Operational test: literal string `tools/sync-skills.sh --check` appears inside the first code fence under C5

- **NEW or extended test:** an assertion that the literal string `tools/sync-skills.sh --check` appears INSIDE the **first fenced code block** under the C5 heading of `skills/merge-and-cleanup.md`, NOT merely somewhere in the C5 section's prose (codex-ops R1 F6 + codex R2 F-A + codex-ops R2 F-A — even a section-bounded `toContain` can pass if the literal survives only in C5 explanatory prose, the `package-lock.json` regeneration sub-block, a remediation sentence, or a future comment while the actual verify command fence stops running the check, which is exactly the regression this spec is meant to prevent).
- **Block-extraction contract (load-bearing — tightened in r2 disposition):** the test MUST extract the **first fenced code block** beneath the C5 heading, then assert the literal appears inside that extraction. Anchors:
  - **C5 heading anchor (anchored, NOT regex-permissive — codex R2 F-A):** the first line in `skills/merge-and-cleanup.md` matching the regex `^#+\s+C5(?:[^A-Za-z0-9]|$)` — i.e. one-or-more `#`, whitespace, the literal characters `C5`, followed by a non-alphanumeric character (period, space, en-dash, etc.) or end-of-line. This MUST NOT match `AC5`, `BC5`, `C50`, `C5A`, etc. — only the literal heading label `C5` followed by a separator. Case-sensitive on the `C` and `5` themselves.
  - **C5 section end:** the next line after the C5 heading matching `^#+\s+C6(?:[^A-Za-z0-9]|$)` — the C6 heading. The C5 section is non-terminal in `skills/merge-and-cleanup.md` (C6 always follows it). The test MUST require this C6 heading to exist and MUST NOT silently fall back to end-of-file (codex R2 F-A — EOF fallback would silently widen the extraction through the rest of the file if a future edit malformed the C6 heading).
  - **First code fence inside C5:** within the text bounded by the C5 heading and the C6 heading, find the first opening fence line matching `^[ \t]*\`\`\`` (three backticks, optionally with language tag) and the corresponding closing fence (next `^[ \t]*\`\`\`` line after the opening fence). The "C5 verify command block" is the text between (exclusive of) those two fence lines.
  - The assertion: `c5_first_fence.includes("tools/sync-skills.sh --check")`.
- **Failure modes the test must report distinctly** (so a future regression points the operator at the actual problem):
  - `C5 heading not found` — file structure broken; AC4 cannot evaluate.
  - `C6 heading not found after C5` — C5 has lost its successor heading; the spec invariant that C5 is non-terminal has been violated.
  - `No fenced code block found inside C5` — the verify commands have been moved out of a fenced block (e.g. inlined as prose); the regression we are protecting against.
  - `Literal 'tools/sync-skills.sh --check' not in first C5 code fence` — the verify command list no longer includes the sync-check.
- **Implementation forms acceptable, in preference order:**
  1. Add a test case to an existing skills-shape test under `tests/` if one exists for `merge-and-cleanup.md`. The test reads the file, runs the anchored block extraction above, asserts the literal is inside the extracted code fence. Otherwise:
  2. Create a minimal `tests/skills/merge-and-cleanup-shape.test.ts` with a single test that performs the block extraction (regex-based) and assertion as above. Plain whole-file or whole-section `expect(content).toContain(...)` is INSUFFICIENT and MUST NOT be used.
- **Why a structural-extraction test, not a behavioral test:** behavioral testing of the C5 verify (running an actual merge with adapter drift and asserting the merge aborts) requires fixturing a worktree, a stale-fork branch, and a captured-stdout assertion. That's out of scope for this small spec. The first-code-fence-inside-C5 extraction test catches the most likely regression (the literal moving out of the verify command list into C5 prose, or being removed entirely) without the fixture cost. If subsequent dogfooding shows the block-extraction test isn't enough, file a follow-up.
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
- AC3: `tools/install-pre-commit-hook.sh` exists, executable, idempotent on re-run (content + mode), resolves hook path via `core.hooksPath` / `git rev-parse --git-path hooks/pre-commit`, repairs non-executable mode on no-op re-install, prints overwrite warning on content-differs, has a test covering all five cases including the linked-worktree scenario.
- AC4: `npm test` includes an assertion that the literal string `tools/sync-skills.sh --check` appears INSIDE the extracted C5 verify command block of `skills/merge-and-cleanup.md`, not merely somewhere in the file body.
- All four ACs verified locally before pushing the feature branch.

## After Completion (Strategist Notes)

- **No new wiki page.** This is a maintenance / drift-prevention edit to an existing skill. The cross-tool-protocol decision (`raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md`) already documents the canonical/adapter relationship; the merge-time gate is an operational detail of that pattern.
- **Add a one-line note** to the cross-tool-protocol decision's "Next steps" section recording that the pre-commit hook landed (so the deferred-followup item is closed-out in the decision doc itself).
- **Do NOT update `_followups.md` lines 713 + 754 entries** — those are historical observations; resolution gets recorded in this spec's `review_notes`, which is the pattern other completed specs follow.
- **Wiki promotion (if/when):** if the merge-time gate proves load-bearing across multiple cycles (e.g., catches drift in 2+ subsequent merges), promote to `wiki/operating-model/` as a documented protocol invariant. Don't pre-promote — wait for empirical signal.
