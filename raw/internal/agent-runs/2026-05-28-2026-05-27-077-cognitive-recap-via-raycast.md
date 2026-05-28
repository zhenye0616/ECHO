---
backlog_item: 2026-05-27-077-cognitive-recap-via-raycast
agent_run_started: 2026-05-28T07:19:37Z
agent_run_ended: 2026-05-28T07:39:45Z
status: ready_for_review
test_status: passing
---

# Agent Run: Cognitive Recap via Raycast

## What I Implemented

Built the Raycast `Recap` command as a second command beside Ask ECHO. The command is an explicit Form -> Detail flow that resolves a recap window, builds a pinned single-shot prompt, spawns the selected CLI agent, streams markdown, and keeps MCP audit data best-effort and bounded.

The implementation keeps Recap ephemeral: it reads Ask ECHO sessions only to resolve "since last session" and does not write any Recap sessions to LocalStorage.

## Files Modified

- `tools/raycast-echo/package.json` - added `recap` command, duplicated command-scoped preferences, added `defaultSinceWindow`, bumped extension version.
- `tools/raycast-echo/package-lock.json` - matched package version bump.
- `tools/raycast-echo/src/recap.tsx` - new Recap entry point, repo preflight, prompt construction, agent spawn, streaming detail, bounded audit fetch, cancellation.
- `tools/raycast-echo/src/lib/recap-system-prompt.ts` - pinned template and `buildRecapPrompt` substitution/validation.
- `tools/raycast-echo/src/lib/since-resolver.ts` - pure since-window resolver and invalid-input error.
- `tools/raycast-echo/src/lib/audit.ts` - optional abort signal support for one-shot Recap audit fetch.
- `tools/raycast-echo/src/lib/agent-runner.ts` - optional session-log suppression and dynamic runtime footer.
- `tools/raycast-echo/test/*.ts*` - Recap, resolver, prompt, audit, runner, and Raycast API mock coverage.
- `tools/raycast-echo/README.md` - Recap usage, preference setup, output shape, and dogfooding template.

## Decisions Made During Implementation

### Decision 1: Keep Recap completely separate from Ask ECHO UI

- **Options considered:** modify `echo.tsx` to share/fork Recap flows; add Recap only as its own command.
- **Chose:** own command only.
- **Why:** the spec explicitly cut cross-command fork/session behavior after review rounds, and Ask ECHO preferences are command-scoped.
- **Worth founder review?** No - follows the locked option-F/option-D scope in the item.

### Decision 2: Validate repo path before spawning

- **Options considered:** let the spawned agent fail; reject missing/non-git repo paths in the Form flow.
- **Chose:** reject missing, non-directory, or non-git paths before spawn.
- **Why:** accepted r11 fixups require a runtime guard so Recap does not produce a misleading filesystem recap from the wrong directory.
- **Worth founder review?** No - explicitly in scope from r11.

### Decision 3: Disable agent-runner session logs for Recap

- **Options considered:** reuse agent-runner logging defaults; add an option for Recap to suppress session logs.
- **Chose:** `sessionLogEnabled: false` for Recap.
- **Why:** Recap's persistence contract is "none for V1"; the option preserves existing Ask ECHO behavior while preventing a Recap side channel.
- **Worth founder review?** No - this is the minimal implementation of the no-persistence AC.

## Acceptance Criteria Status

- [x] AC1 - Raycast `recap` command registered with duplicated preferences, `defaultSinceWindow`, and version bump.
- [x] AC2 - Recap Form -> Detail streaming flow, invalid input validation, no daemon hard gate, one-shot 5s audit timeout, cancellation, no persistence, and custom cwd.
- [x] AC3 - Pinned recap prompt with six evidence sources, authoritative `combined.md` rule, stable timestamps, A/B/D output, MCP fallback constraints, and snapshot/load-bearing assertions.
- [x] AC4 - Pure since resolver plus `buildRecapPrompt` absolute-path validation and full placeholder substitution.
- [x] AC5 - Recap, resolver, prompt, audit, runner, and package preference tests added.
- [x] AC6 - README Recap section and dogfooding template added.
- [x] AC7 - Post-merge founder dogfooding remains the validation gate; builder implementation is ready for review.

## Tests Run

```text
tools/raycast-echo: npm test -- test/since-resolver.test.ts test/recap-system-prompt.test.ts test/recap.test.tsx test/audit.test.ts test/agent-runner.test.ts
5 files passed; 47 tests passed.

tools/raycast-echo: npm test
16 files passed; 140 tests passed.

tools/raycast-echo: npm run typecheck
Passed.

tools/raycast-echo: npx ray build
Passed; entry points src/echo.tsx and src/recap.tsx built.

repo root: npm test
136 files passed, 1 skipped; 1464 tests passed, 21 skipped.

repo root: npm run typecheck
Passed.

repo root: npm run lint
Passed.

git diff --check
Passed.
```

## Open Questions for Founder

None.

## Anything I Almost Did But Stopped Myself

- I initially applied the implementation patch from the main checkout, caught it before committing, replayed the patch into the isolated worktree, and restored the main checkout. The final implementation commit is only on `agent/cognitive-recap-via-raycast`.
- I did not add Recap session persistence, Cmd-R behavior, new MCP tools, coord events, daemon-side synthesis, or Ask ECHO component edits.

## Next Suggested Backlog Items

- None from this builder pass. The spec already names V1.5+ Recap persistence only if dogfooding proves demand.

## Branch

- Branch: `agent/cognitive-recap-via-raycast`
- Head SHA: `ac8969fdd272a844d908dfdf7280fbddbc004a1f`
