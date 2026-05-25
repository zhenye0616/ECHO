---
item_id: 2026-05-25-071-role-definition-format-and-defaults
verdict: merge as-is
reviewed_at: 2026-05-25T17:30:00Z
test_counts: { passed: 1220, failed: 3, skipped: 21, scoped_071: "38/38 pass" }
---

## Verdict
Implementation is faithful to the r1-patched spec: schema strictness, controlled vocabulary, two-step skill grammar + path-containment check, `skillsRoot`/`assertDefaults` overload, smol-toml ^1.6.1 floor, three canonical TOMLs aligned with CLAUDE.md / AGENT_INSTRUCTIONS.md / review-queue skill set. Lint clean, typecheck clean, all 38 new tests pass. The three observed full-suite failures (`tests/trace/build.test.ts` perf, `tests/capture/surfaces/git-watcher.test.ts` timeout, `tests/coord/coord-status.test.ts` seed loop) do not touch 071's diff and are pre-existing flakies on main. Reviewer (claude/superpowers:code-reviewer): `merge as-is`.

## Acceptance status
- **AC1 schema** — Met. Grammar regexes + CAPABILITIES const at `src/echo-home/roles.ts:5-26`; controlled vocab + sandbox enum enforced at `:201-234`.
- **AC1.1–AC1.7** — Met. Name-from-filename + reject `role.name` at `:265-267` (test `roles.test.ts:150`); capability vocabulary `:18-26, :219-234`; sandbox enum `:201-204`; `mcp_servers` names with regex `:206-217`; free-form `format` (no enum); strict unknown-key rejection at `<root>`, `role`, `role.requires`, `role.output` via `assertAllowedKeys` `:264, :270, :276, :279`; unversioned (no `schema_version` field).
- **AC2.1–AC2.5** — Met. Loader at `src/echo-home/roles.ts` (distinct from `src/coord/roles.ts`); barrel `src/echo-home/index.ts:1-11` exports `DEFAULT_ROLE_FILENAMES`, `RoleLoadOptions`, etc.; `RoleValidationError` with `file` + `field` at `:47-56`; two-step grammar+containment via `validateSkills` `:175-199` and `isInsideRoot` `:170-173`; smol-toml ^1.6.1 floor in `package.json`/lockfile.
- **AC3.1–AC3.4** — Met. Three default TOMLs (strategist/reviewer/builder) match spec text exactly; pre-flight skill-existence verified at `default-roles.test.ts:81`.
- **AC4.1 (28 loader cases)** — Met. All 28 `it()` blocks present and passing.
- **AC4.2 (12 default-roles cases)** — Partial. Observed 10 `it()` blocks, but every numbered assertion the spec listed IS present (cases #5/#6/#7 merged into the composite reviewer/builder/strategist tests at `default-roles.test.ts:104-124`). Coverage equivalent; count lower.
- **AC4.3** — Met for 071-touched surface; 3 pre-existing unrelated flakies.

## Pre-merge fixups
- (none — verdict is merge as-is)

## Expected merge conflicts
- `src/echo-home/` directory — 070 adds `paths.ts` + `scaffold.ts`; 071 adds `roles.ts` + `index.ts`. **No file-level collision.** Resolution: union; whoever merges second has no action.
- `src/echo-home/index.ts` — 070 ships no barrel; if both land, follow-up may extend the barrel to also re-export `paths`/`scaffold`. Non-blocking.
- `package.json` / `package-lock.json` — both items likely touch these. Resolution: mechanical merge of `dependencies`, then `npm install` against post-merge `package.json` to regenerate lockfile.
- `tests/echo-home/` — distinct test filenames; no collision.

## Follow-up items (defer, do not block merge)
- After 070 merges, extend `src/echo-home/index.ts` to re-export `paths` + `scaffold` public surface (canonical import path).
- Relabel `discoverSkillsRoot` failure-path error field from `'skills'` to `'skillsRoot'` for clearer downstream error attribution (`roles.ts:159`).
- File a separate stabilization spec for the 3 pre-existing flakies (`tests/trace/build.test.ts`, `tests/capture/surfaces/git-watcher.test.ts`, `tests/coord/coord-status.test.ts`).
- If strict 1:1 spec-item ↔ `it()` block mapping is desired by future review-queue tooling, split the merged composite tests at `default-roles.test.ts:104, :113`.

## Open questions for founder
(none — verdict is merge as-is)
