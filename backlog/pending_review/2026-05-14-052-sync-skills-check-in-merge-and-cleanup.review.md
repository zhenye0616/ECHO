---
item_id: 2026-05-14-052-sync-skills-check-in-merge-and-cleanup
verdict: merge as-is
reviewed_at: 2026-05-15T09:30:00Z
test_counts: { passed: 937, failed: 0, skipped: 21 }
---

## Verdict

052 is a tight, well-bounded drift-prevention spec. Ground-truth HEAD matches; all four ACs Met with file:line evidence; `npm test` (937 pass / 21 skipped), `npm run lint`, `npm run typecheck`, `bash -n`, and `tools/sync-skills.sh --check` all clean. Diff is +420 / -0 across exactly the five files in `files_to_modify`, no drift. Design choices (anchored regex with no EOF fallback, 6-scenario installer test including relative-`core.hooksPath`-from-nested-cwd, no-auto-fix error path) are faithfully implemented and convergent with prior reviewer r2/r3 findings. The only material concern is the merge-conflict surface against 050, which structurally rewrites the same file's surrounding prose — not a defect in 052.

## Acceptance status

- **AC1 — Met.** `skills/merge-and-cleanup.md:142` adds `tools/sync-skills.sh --check` inside the fenced C5 verify block; the remediation paragraph at line 145 names `tools/sync-skills.sh` (without `--check`) as operator-manual, explicit no-auto-fix posture.
- **AC2 — Met.** `tools/sync-skills.sh --check` exits 0 in worktree (observed: `OK: all adapters match canonical skills/`); `.claude/commands/merge-and-cleanup.md` diff is byte-identical to canonical's.
- **AC3 — Met.** `tools/install-pre-commit-hook.sh` (116 lines, mode 0755). Hook-path resolution at lines 42–63 covers all three cases: absolute `core.hooksPath` (45–47), relative resolved against `git rev-parse --show-toplevel` (48–54), `git rev-parse --git-path hooks/pre-commit` fallback (57). Idempotence branches at 88–105 cover content-identical-and-executable (no-op), content-identical-but-not-executable (mode repair), content-differs/missing (overwrite with warning at 115). Atomic-rename via `mktemp` in `$HOOK_DIR` (84) + cleanup trap (85).
- **AC3 test — Met.** `tests/tools/install-pre-commit-hook.test.ts` ships all 6 scenarios at lines 67, 83, 102, 118, 137, 155 — fresh / idempotent-no-rewrite / mode-repair / content-differs / linked-worktree / relative-hooksPath-from-nested-cwd.
- **AC4 — Met.** `tests/skills/merge-and-cleanup-shape.test.ts:20-21` uses anchored `^#+\s+C5(?:[^A-Za-z0-9]|$)` and `^#+\s+C6`; line 49 requires C6 to exist (no EOF fallback); lines 87–124 synthetic-content tests prove the four distinct error messages fire.

## Drift findings

No drift detected. `git diff main...HEAD --stat` shows exactly the five files enumerated in `files_to_modify`. No `_followups.md`, `CLAUDE.md`, README, or wiki edits — Out-of-Scope items honored.

## Design-choice judgments

- **Anchored regex with no EOF fallback (AC4)** — **stand**. Rejects `AC5`/`BC5`/`C50`/`C5A` (verified by synthetic test at 87–100); missing-C6 yields distinct `C6 heading not found after C5` error rather than silently widening extraction. Convergent with codex R2 F-A.
- **6 installer-test scenarios (AC3)** — **stand**. Scenarios 5 + 6 (linked-worktree, relative-hooksPath-from-nested-cwd) correspond to codex-ops R1 F5 and codex/codex-ops R2 F-B; would have caught silent-misplacement failures.
- **No-auto-fix on C5 failure (AC1)** — **stand**. Merge skill itself never invokes `sync-skills.sh` without `--check`; operator-manual remediation matches spec's wrong-derived-form rationale.
- **Hook-path resolution order (AC3)** — **stand**. Matches spec's prescribed order. The fallback at 59–62 (normalizing `--git-path` output against TOPLEVEL if relative) is an extra safety belt, harmless.
- **Mode-repair branch (AC3, codex-ops R1 F4)** — **stand**. Handles the silent-failure mode where git ignores non-executable hooks.

## Bugs/risks

- **Minor — `read -r -d '' HOOK_BODY <<'HOOK_EOF' || true` (line 72).** `read -d ''` returns non-zero at EOF without delimiter, so `|| true` is required and correct. The resulting `$HOOK_BODY` loses the trailing newline; line 86's `printf '%s\n' "$HOOK_BODY"` restores exactly one. Not a bug; minor fragility if future edit adds intentional trailing blanks to the heredoc.
- **Minor — `mktemp "$HOOK_DIR/.pre-commit.XXXXXX"` (line 84)** leaves artifact if interrupted between `mktemp` and trap install on line 85. Race window is microseconds.
- **No security or correctness bugs.** `set -euo pipefail` (32), all variable expansions quoted, no command substitution into unquoted contexts.

## Merge-conflict preview

- **vs current `main`**: clean. C5 block on main ends with `npm run typecheck` followed by a blank line and the `package-lock.json` regeneration sub-block; 052 inserts one line + one paragraph between them. Pure addition, no overlap.
- **vs 050 (`worktree-isolation-for-multi-step-main-writers`)**: **HIGH-conflict.** 050 substantially rewrites `skills/merge-and-cleanup.md` and `.claude/commands/merge-and-cleanup.md` — restructures Step B (deletes the sentinel-lock convention), wraps merge in `$TMPDIR/echo-merger-<uuid>` worktree, and reflows surrounding prose. The C5 verify block is the natural seam; 052's single-line insert + new paragraph will almost certainly land in a conflict region.
- **vs 051 (`merge-lock-cross-vendor-enforcement`)**: clean. 051's agent_notes explicitly say "No changes to merge-and-cleanup.md. 051 only adds READING surfaces." No textual overlap.
- **Recommended merge order: 052 → 051 → 050.** (a) 052 is the smallest, cleanest change against main; landing it first immediately activates the C5 gate that protects 050's and 051's adapter pairs going forward. (b) 051 is also non-overlapping with 052. (c) 050 lands last and absorbs the C5-block conflict it's already restructuring — operator running `/merge-and-cleanup` for 050 must re-establish the `tools/sync-skills.sh --check` line and remediation paragraph inside 050's new C5 form. AC4's shape test catches the regression mechanically.

## Suggested fixups

**Pre-merge punch list (blocking):** None.

**Non-blocking follow-ups:**
- When 050 merges, founder must re-insert the `tools/sync-skills.sh --check` line + remediation paragraph into 050's new C5 form. AC4's shape test will fail loudly if forgotten.
- After 052 merges: strategist task per "After Completion" notes — add one-line note to `raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md` "Next steps" recording the pre-commit hook landed.
- Optional aesthetic: tighten `printf '%s\n' "$HOOK_BODY"` to a direct here-doc-to-file, eliminating the small heredoc trailing-newline fragility. Skip.

## Test counts observed

- `npm test`: **70 files passed | 1 skipped; 937 tests passed | 21 skipped** (45.54s).
- `npm run lint`: clean (eslint `--max-warnings 0` + `python3 tools/task-state/lint.py`).
- `npm run typecheck`: clean (`tsc --noEmit`).
- `bash -n tools/install-pre-commit-hook.sh`: OK.
- `tools/sync-skills.sh --check`: `OK: all adapters match canonical skills/`, exit 0.
