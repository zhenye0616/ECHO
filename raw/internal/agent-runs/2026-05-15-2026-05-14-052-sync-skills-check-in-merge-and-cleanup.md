---
item: 2026-05-14-052-sync-skills-check-in-merge-and-cleanup
agent_persona: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
binding: claude-code
branch: agent/sync-skills-check-in-merge-and-cleanup
head_sha: 6a7372fa8ae9ef31ec1dcc05b4b5e90f04b26038
started_at: 2026-05-15T18:34:20Z
finished_at: 2026-05-15T18:42:00Z
---

# 052 — /merge-and-cleanup C5 verify includes `tools/sync-skills.sh --check` + pre-commit hook installer

## Run 1

### What I implemented

All four ACs in a single commit on `agent/sync-skills-check-in-merge-and-cleanup` (`6a7372f`):

- **AC1** — `skills/merge-and-cleanup.md` C5 verify block now ends with `tools/sync-skills.sh --check` (after `npm run typecheck`, before the `package-lock.json` regeneration sub-block). Added a remediation-message paragraph immediately after the fence with the exact wording from the spec, plus the "do NOT auto-fix" framing.
- **AC2** — re-ran `tools/sync-skills.sh` once after AC1; `.claude/commands/merge-and-cleanup.md` is byte-identical to canonical (verified by `tools/sync-skills.sh --check` exiting 0). Both files staged in the same commit per AC2's "MUST NOT be split across two commits" requirement.
- **AC3** — new `tools/install-pre-commit-hook.sh` (executable). Hook path resolution: reads `core.hooksPath`; absolute → used directly, relative → normalized against `git rev-parse --show-toplevel`; otherwise falls back to `git rev-parse --git-path hooks/pre-commit`. Idempotent on content AND mode: write-to-temp + `cmp -s`, then three branches — install (mv + chmod + "installed"; prints overwrite warning iff a prior hook existed); unchanged (discard temp, "unchanged"); mode-repair (discard temp, `chmod u+x` in place, "mode repaired (was non-executable)"). Hook body uses `cd "$(git rev-parse --show-toplevel)"` then `exec tools/sync-skills.sh --check` so the check runs from repo root regardless of where `git commit` was invoked.
- **AC4** — new `tests/skills/merge-and-cleanup-shape.test.ts`. Anchored regexes `^#+\s+C5(?:[^A-Za-z0-9]|$)` and the corresponding C6 form prevent matching AC5 / BC5 / C50 / C5A. Reports distinct errors for "C5 heading not found", "C6 heading not found after C5", and "No fenced code block found inside C5". No EOF fallback if C6 missing (per codex R2 F-A). The literal-string assertion runs against the body extracted between the first opening fence and its matching closing fence inside C5.

Installer test (`tests/tools/install-pre-commit-hook.test.ts`) covers the six AC3 scenarios with isolated tmp repos: fresh install, idempotent re-install with mtime-unchanged assertion, mode-repair via `chmodSync(path, 0o644)` then re-run, content-differs overwrite warning, linked-worktree resolution to main repo's hooks dir, and relative `core.hooksPath` from a nested cwd asserting the hook lands at `<repo-root>/relative/hooks/pre-commit` (not `<cwd>/relative/hooks/pre-commit`).

### Files modified

- `skills/merge-and-cleanup.md` (+3 lines in C5 fence + 1 paragraph) — branch tip `6a7372f`
- `.claude/commands/merge-and-cleanup.md` (+3 lines, +1 paragraph; byte-identical to canonical) — branch tip `6a7372f`
- `tools/install-pre-commit-hook.sh` (NEW, 102 lines, +x) — branch tip `6a7372f`
- `tests/tools/install-pre-commit-hook.test.ts` (NEW, 158 lines, 6 tests) — branch tip `6a7372f`
- `tests/skills/merge-and-cleanup-shape.test.ts` (NEW, 116 lines, 4 tests) — branch tip `6a7372f`

Five files matches `files_to_modify` exactly; no other writes.

### Decisions

1. **Remediation prose placement (AC1).** Spec says "follow the existing failure pattern documented in the prose immediately below the verify commands." The existing prose covers npm-chain failures and references "ordering issues that need a structural fix." I added a separate paragraph specifically for sync-check failures with the exact remediation message from AC1, placed *between* the fence and the existing failure-pattern prose so the operator reads the sync-specific guidance first when sync-check is the failing step.

2. **Hook body uses `exec tools/sync-skills.sh --check`.** `exec` rather than a plain invocation so the hook's exit code IS the script's exit code without any chance of trailing shell drift. The hook is one of the simplest possible shapes.

3. **Atomic temp file in same directory.** AC3 says "in the same directory as the resolved hook path to keep the rename atomic on the same filesystem." Used `mktemp "$HOOK_DIR/.pre-commit.XXXXXX"` with a leading dot so the temp doesn't accidentally run as a hook if the install is interrupted (git only runs files named exactly `pre-commit`).

4. **`set -euo pipefail` in installer.** Standard for ECHO bash scripts. The `read -r -d ''` heredoc trick to capture the body returns non-zero on EOF, so the line ends in `|| true` (also a pattern in other ECHO scripts).

5. **Test framework: vitest TypeScript** to match `tests/sync-skills/install-codex-adapters.test.ts` shape, not bats. Already in the project's test surface; no new dependency.

### Acceptance criteria status

- ✅ **AC1** — `tools/sync-skills.sh --check` is the last command in the C5 verify fence; explicit remediation message includes the exact literal from the spec.
- ✅ **AC2** — `tools/sync-skills.sh --check` exits 0 in `agent/sync-skills-check-in-merge-and-cleanup`; canonical + adapter committed together.
- ✅ **AC3** — installer exists, executable, idempotent on content + mode, repairs non-executable mode, prints overwrite warning, resolves linked-worktree + relative-hooksPath-from-nested-cwd correctly; test covers all six scenarios.
- ✅ **AC4** — block-extraction test asserts the literal inside the first C5 code fence; anchored heading regexes; no EOF fallback if C6 missing; distinct error messages.

### Test results (verbatim)

```
$ npx vitest run tests/skills/merge-and-cleanup-shape.test.ts tests/tools/install-pre-commit-hook.test.ts

 RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--sync-skills-check-in-merge-and-cleanup

 ✓ tests/skills/merge-and-cleanup-shape.test.ts (4 tests) 6ms
 ✓ tests/tools/install-pre-commit-hook.test.ts (6 tests) 3702ms
   ✓ install-pre-commit-hook.sh > fresh install: writes hook, marks executable 488ms
   ✓ install-pre-commit-hook.sh > idempotent re-install: no rewrite, executable preserved, mtime unchanged 869ms
   ✓ install-pre-commit-hook.sh > mode-repair re-install: chmod -x first, installer repairs mode in place 778ms
   ✓ install-pre-commit-hook.sh > content-differs re-install: overwrites with warning 538ms
   ✓ install-pre-commit-hook.sh > linked-worktree: hook resolves into the main repo hooks dir 580ms
   ✓ install-pre-commit-hook.sh > relative core.hooksPath from nested cwd: resolves against repo root, not cwd 448ms

 Test Files  2 passed (2)
      Tests  10 passed (10)
```

Full suite:

```
Test Files  70 passed | 1 skipped (71)
     Tests  937 passed | 21 skipped (958)
  Duration  22.70s
```

`npm run lint` and `npm run typecheck` both exit 0; no warnings.

`tools/sync-skills.sh --check` exits 0 in the feature branch's tree (AC2 final verification).

### Open questions

None.

### Drift events caught

None. All four ACs were in scope; spec was unambiguous after a single read; no temptation to widen.

### What previous-attempt state was kept vs discarded

First attempt; no prior log or state to reconcile.
