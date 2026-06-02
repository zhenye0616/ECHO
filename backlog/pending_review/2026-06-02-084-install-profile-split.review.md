---
item_id: 2026-06-02-084-install-profile-split
verdict: merge with founder fixups
reviewed_at: 2026-06-02T17:35:57Z
test_counts: { passed: 1504, failed: 1 }
---

## Verdict
Merge with founder fixups. Independent review confirmed the worktree HEAD matched `f144bb4c0a8e15371c61ea8b410da77e32ed8f4a`, the implementation covers the profile split, touched files exactly match `files_to_modify`, and no code-level blocker was found. The only merge gate is verification: full `npm test` timed out in one unrelated-looking test, while the focused rerun of that failing file passed; `npm run lint` and `npm run typecheck` passed.

## Pre-merge fixups
- [ ] Rerun full `npm test` and merge only after a clean run, or have the founder explicitly waive the isolated `tests/mcp/recent-calls-endpoint.test.ts` timeout as an unrelated/full-suite-load flake. Review observed: full `npm test` failed with 1 failed test / 1504 passed / 21 skipped; `npx vitest run tests/mcp/recent-calls-endpoint.test.ts` then passed 2/2; `npm run lint` passed; `npm run typecheck` passed.

## Expected merge conflicts
- None expected. The review found no merge-tree conflict markers or changed-in-both conflicts; current main-only changes are backlog/review artifacts, not the code files touched by this branch.

## Follow-up items (defer, do not block merge)
- Codex-specific adapter friction: the skill's Codex section hardcodes `codex exec --output-last-message`; in this environment the first sandboxed CLI child failed during Codex app-server initialization with `Operation not permitted`.
- Codex-specific adapter friction: the escalated CLI child completed useful verification but hung after final status/diff checks and never wrote the `--output-last-message` review file, forcing a stale parse-failure sidecar before this rerun.
- Codex-specific adapter friction: process inspection (`ps`) required escalation; the default sandbox rejected it.
- Skill portability friction: the skill is very Claude-Code-shaped in spirit (`superpowers:code-reviewer` final-message semantics) and its Codex adapter is CLI-specific; the successful retry used the available Codex subagent primitive instead, whose result is returned as agent output rather than a temp-file `--output-last-message`.
- Skill artifact-scope friction: parse-failure handling asks for durable queue-error evidence, but the same skill says only review sidecars should be committed. That leaves useful local diagnostics dirty unless the protocol explicitly allows committing queue-error evidence.
- Test-suite friction: full-suite `npm test` can surface load-sensitive daemon/MCP timeouts while focused reruns pass, making the merge gate depend on founder flake policy.

## Open questions for founder
None for the implementation. Founder decision needed only on the verification fixup: require a clean full `npm test` rerun or waive the isolated timeout as unrelated flake.
