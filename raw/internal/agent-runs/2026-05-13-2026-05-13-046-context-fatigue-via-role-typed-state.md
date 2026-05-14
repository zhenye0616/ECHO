---
backlog_item: 2026-05-13-046-context-fatigue-via-role-typed-state
agent_run_started: 2026-05-14T04:39:58Z
agent_run_ended: 2026-05-14T05:05:00Z
status: ready_for_review
test_status: passing
head_sha: 76638c2e28591f398509490bfe170816c2cdee5c
branch: agent/context-fatigue-via-role-typed-state
agent_id: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
---

# Agent Run: Context fatigue via role-typed task-state (046)

## What I Implemented

All 8 acceptance criteria. The spec was R5 CLAIM-READY with the convergence already locked through five reviewer rounds, so the implementation work was almost entirely mechanical: write the schema doc, the lint, the schemas, the MCP read surface, the journal-by-proxy rule, the cold-start primer, the recursive dogfooding pointer.

The cure shape — `role = (skill bundle, prompt, task-state pointer); bindings are interchangeable` — is now structurally present in the repo: pointer files for strategist/builder/round-state live under `backlog/task-state/<task-id>/`, the read contract is byte-identical across FS and MCP at a pinned commit SHA, and the reviewer-tick path is structurally prevented from contaminating fresh-eyes-at-SHA.

## Files Modified

### New files

- `skills/role-typed-task-state.md` + `.claude/commands/role-typed-task-state.md` — schema doc, read contract, CAS write protocol, writer responsibilities table (AC1 + AC5).
- `skills/using-superpowers.md` + `.claude/commands/using-superpowers.md` — ECHO-namespaced cold-start primer; distinct from the superpowers plugin skill (AC7).
- `tools/task-state/lint.py` — stdlib-only Python lint; body line-count cap, required-block order, round-state current_round header (AC2).
- `tools/task-state/push-round-state.sh` — round-state-specific blob-lease push helper; deliberately does NOT delegate to push-with-retry.sh's pull-rebase path (AC4).
- `src/mcp/parse-anchors.ts` — TypeScript-only canonical_anchors parser (AC1 / AC4).
- `src/mcp/tools/get-role-state.ts` — single-file MCP read tool with always-pin-to-commit-SHA contract (AC4).
- `src/mcp/tools/list-task-states.ts` — discovery surface with same SHA-pinning (AC4).
- `src/mcp/util/role-state-git.ts` — shared git-plumbing helpers (resolveRefOnce, readBlobAtRef, etc.).
- `tests/task-state/anchors-fixtures.json` — shared cross-language fixtures (AC1).
- `tests/task-state/anchors.test.ts` — fixture-driven anchors parser tests (AC4).
- `tests/task-state/lint.test.ts` — 9 cases including under/over-cap, missing/wrong-order blocks, frontmatter-only fails (AC2).
- `tests/task-state/push-round-state.test.ts` — A-wins-B-loses blob-lease integration test (AC4).
- `tests/echo-mcp/role-state.test.ts` — 15 cases including HEAD-race (j), branch-ref (k), byte-identity, malformed-anchors degraded mode, single-pinned-SHA cross-snapshot, repo-root resolution (i), end-to-end MCP transport (AC4 + AC5).
- `tests/review-queue/046-task-state-ref-and-fresh-eyes.test.ts` — 9 cases covering task_state_ref schema extension + REVIEWER_FRESH_EYES_VIOLATION (AC3).
- `backlog/task-state/2026-05-13-046-context-fatigue-via-role-typed-state/strategist.md` — recursive dogfooding pointer (AC8).

### Modified files

- `CLAUDE.md` — added "Journal-by-proxy for read-only consultees" subsection to Dogfooding journal discipline (AC6).
- `backlog/README.md` — documented `task_state_ref:` frontmatter field on backlog items (AC3).
- `package.json` — added `lint:task-state` script; `lint` aggregate now invokes it.
- `src/mcp/server.ts` — added `options.repo_root`; resolver pins repo root once at server-start; registered the two new tools.
- `tests/mcp/tools/recent-work-context.test.ts` — tool-count assertion updated from 8 to 10 (added get_role_state, list_task_states).
- `tools/review-queue/schemas/request.schema.json` — added optional `task_state_ref`.
- `tools/review-queue/schemas/reviewer.schema.json` — added optional `consumed_task_state`.
- `tools/review-queue/validate.py` — REVIEWER_FRESH_EYES_VIOLATION enforcement (frontmatter flag + field-aware three-of-six heading detection).

## Decisions Made During Implementation

### Decision 1: `skills/using-superpowers.md` is a NEW ECHO-namespaced file, not an edit of the plugin's same-named skill

- **Spec text:** AC7 says "Edit `skills/using-superpowers.md`".
- **Reality:** the file does not exist in `skills/` — `superpowers:using-superpowers` is a plugin skill, loaded from `~/.claude/plugins/cache/.../superpowers/5.0.7/skills/using-superpowers`. The ECHO repo had no file at the named path.
- **Chose:** create a new ECHO-namespaced `skills/using-superpowers.md` and let `tools/sync-skills.sh` copy it to `.claude/commands/using-superpowers.md`. Both skills can coexist — the slash commands have distinct names (`superpowers:using-superpowers` vs. `using-superpowers`).
- **Why:** "edit" can only mean "create or edit." The spec's intent is clearly to ship the cold-start primer; the file's prior non-existence is a gap rather than a deliberate constraint. The ECHO version is namespaced under our `skills/` per the cross-tool-protocol decision (`raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md`).
- **Worth founder review?** Yes — flagging in `agent_notes` so the reviewer can call out the name overlap if they want a distinct slug.

### Decision 2: lint.py uses stdlib only

- **Options considered:** match `tools/review-queue/validate.py`'s PyYAML + jsonschema pattern.
- **Chose:** stdlib only.
- **Why:** the lint's job is body-line-count + heading-presence, not YAML validation. Frontmatter detection via a literal `---\n...\n---\n` delimiter is sufficient. Avoiding the PyYAML import avoids the Apple-Silicon `arch -arm64` retry dance that `_lib.py` carries.
- **Worth founder review?** No.

### Decision 3: `tests/echo-mcp/` is a new directory (matches spec verbatim, not `tests/mcp/`)

- The spec literally says `tests/echo-mcp/role-state.test.ts`. Existing convention is `tests/mcp/`. I went literal so the spec's path checks pass if anyone greps for it; vitest's `tests/**/*.test.ts` include picks it up either way.
- **Worth founder review?** Optionally relocate to `tests/mcp/` for consistency. Trivial 1-line move.

### Decision 4: push-round-state.sh adds a defensive post-rebase blob-equality check

- The CAS protocol step 6 says "if pull-rebase introduces ANY conflict on this file specifically, run the durable-log abort sequence." I extended this to also catch the rebase-succeeded-cleanly-but-replaced-our-blob case: if `git rev-parse HEAD:<path>` after rebase equals `now_remote_blob` (or `ABSENT`), the rebase resolved by taking remote's version, so the local commit got effectively dropped. Treat as lease-broken.
- **Why:** belt-and-braces. The spec language is "if pull-rebase introduces ANY conflict" — a silent-overwrite is a worse failure mode than an explicit conflict, so applying the same abort sequence is conservative.
- **Worth founder review?** Yes — the spec didn't name this branch explicitly. Easily revertable if too defensive.

## Acceptance Criteria Status

- [x] **AC1** — `skills/role-typed-task-state.md` + `.claude/commands/...` sync. All required content present: FS layout, required blocks, line cap, anchors syntax, parser pin, fixture file, round-state CAS protocol (steps 1-6 including ABSENT sentinel and durable-log abort), writer table.
- [x] **AC2** — `tools/task-state/lint.py` enforces 120-line hard cap (80+ warn), required block presence + order, round-state current_round header, frontmatter-only fails. `npm run lint:task-state` wired in.
- [x] **AC3** — `task_state_ref:` documented in `backlog/README.md`. `request.schema.json` accepts optional `task_state_ref`. `reviewer.schema.json` accepts optional `consumed_task_state` (false default). `validate.py` rejects on `consumed_task_state: true` and on three-or-more task-state required-block headings in body. Tests cover both negative (named-as-critique-target / single-mention / two-mentions) and positive (three-mentions / `consumed_task_state: true`).
- [x] **AC4** — `get_role_state` + `list_task_states` ship with always-pin-to-commit-SHA contract. Repo-root resolved at server-start (constructor option > env > cwd). Tests cover (a)-(k) cases per AC4, including byte-identity, HEAD-race, branch-ref, malformed-anchors degraded mode, single-pinned-SHA cross-snapshot. `push-round-state.sh` blob-lease helper + integration test simulating A/B race.
- [x] **AC5** — Read protocol section in `skills/role-typed-task-state.md` documents FS + MCP byte-identity contract at the same ref. Tests assert directly.
- [x] **AC6** — CLAUDE.md "Journal-by-proxy for read-only consultees" subsection added with worked example.
- [x] **AC7** — `skills/using-superpowers.md` (ECHO-namespaced) with the strategist/builder/watcher/dispatcher rule, explicit reviewer-tick exclusion, worked strategist example, reviewer counter-example.
- [x] **AC8** — `backlog/task-state/2026-05-13-046-context-fatigue-via-role-typed-state/strategist.md` populated with the five required blocks. Lints clean (under cap, all blocks in order). The pointer summarises the cross-strategist convergence + R5 locked decisions in <120 lines.

## Tests Run

```
npm run lint               → clean (eslint + lint:task-state)
npm run typecheck          → clean (tsc --noEmit)
npm test                   → Test Files: 63 passed | 1 skipped (64)
                             Tests: 878 passed | 21 skipped (899)
                             Duration: 16.02s
tools/sync-skills.sh --check → OK: all adapters match canonical skills/
```

New test files contribute: lint.test.ts 9 cases, anchors.test.ts 9 cases (fixture-driven), push-round-state.test.ts 1 integration case, role-state.test.ts 15 cases, 046-task-state-ref-and-fresh-eyes.test.ts 9 cases. Plus a 1-line update to recent-work-context.test.ts (tool-count assertion).

## Open Questions for Founder

1. **`skills/using-superpowers.md` name overlap with the superpowers plugin skill of the same name.** The plugin's skill is `superpowers:using-superpowers`; ours is `using-superpowers`. They are distinct slash commands. If you'd prefer a non-overlapping slug (e.g. `cold-start-primer.md` or `read-task-state-first.md`), the file is small and easy to rename. Spec wording said "edit `skills/using-superpowers.md`" so I went with the literal name.
2. **`tests/echo-mcp/` vs `tests/mcp/`.** Spec literally says `tests/echo-mcp/role-state.test.ts`. Existing convention is `tests/mcp/`. Trivial to relocate if you'd prefer consistency.
3. **Post-rebase blob-equality defensive check in push-round-state.sh** (Decision 4 above) — I added a tiny safety beyond the literal spec text. Easy to remove if you consider it scope creep.

## Anything I Almost Did But Stopped Myself

Nothing. The spec was R5-locked; every potential drift was already chased through five reviewer rounds. The implementation work was applying the locked decisions verbatim. No `## current_thesis` of mine to litigate.

## Next Suggested Backlog Items (Don't Auto-Create)

Per spec "After Completion (Strategist Notes)":
1. Promote role-slot vocabulary to `wiki/operating-model/role-slot-agnostic-orchestration.md`.
2. New `wiki/architecture/task-state-pointer.md`.
3. Update `.manifest.json` and regenerate `wiki/index.md`.
4. Update CLAUDE.md "Operating Mode" section to reference role-typed task-state as cold-start primitive.
5. File V2 successor `047-upsert-role-state` for the deferred write-surface MCP work.
6. Lift the friction-first prioritization gate (per founder direction 2026-05-13).
7. 1-week post-merge A/B cold-start measurement (NOT a merge prerequisite — already moved to "After Completion" #4 in the spec).
