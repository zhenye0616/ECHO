---
id: 2026-06-05-090-adopt-selftest-onboarding-harness
title: "Adopt the orphaned onboarding self-test harness (revised) — port `echoctl selftest` + CLI wiring + a CI skeleton onto current main, with the cross-platform red board QUARANTINED (non-voting) until 091 lands the fixes"
status: proposed
priority: MED
estimate: 0.5d
created: 2026-06-05
blocked_by: []
task_state_ref: 2026-06-05-090-adopt-selftest-onboarding-harness
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - src/cli/commands/selftest.ts          # AC1/AC2 — PORT from the orphaned worktree onto CURRENT main (the agent/onboarding-ci branch is 49 commits BEHIND main; do NOT commit that stale branch — re-apply the file onto main). KEEP: isolated throwaway HOME/ECHO_HOME/CODEX_HOME (selftest.ts:223), native-sqlite-load check (:264), daemon/MCP/init/wiring/capture/doctor checks, exit-code contract (:445), JSON + human reporters. FIX (AC2): the default port is hardcoded 38478 (:198) so it can ping the REAL daemon — change to an ephemeral/free port by default, or fail-fast if the chosen port is already serving a live daemon. selftest must never touch the founder's real daemon or real ~/.echo/~/.claude/~/.codex.
  - src/cli/index.ts                       # AC1 — wire the `selftest` subcommand (import, command-list help, COMMAND_HELP entry, dispatch branch). +~6 lines, mirror the orphaned diff.
  - tests/windows-compat.test.ts           # AC4 — PORT, but QUARANTINE. The F4/R1 assertions reference live code; the R2 + Codex-skill assertions reference src/util/subprocess.ts + src/util/codex-skill.ts that DO NOT EXIST yet (they are 091/Ring-2 targets). To keep main green: mark every not-yet-satisfiable assertion `it.todo`/`describe.skip` with a comment pointing at the spec that will un-skip it (091 for F4/R1/R2; a Ring-2 successor for Codex-skill). NO red test may enter the voting suite here.
  - tests/cli/selftest.test.ts             # AC1 — NEW smoke test for the command: runs `echoctl selftest --json` against an isolated/ephemeral sandbox, asserts the JSON shape + exit contract. (Path per repo test convention.)
  - .github/workflows/ci.yml               # AC3 — PORT the skeleton, REVISED. `quality` job (typecheck/lint/build/test) on matrix os:[ubuntu,macos,windows] × node:[22,24], fail-fast:false — this job is the only voting gate in 090. `onboarding` job validates the PACKED artifact, NOT `npm install -g .` (which skips the `files` allowlist): `npm pack` → install the produced `.tgz` globally → `echoctl selftest`. REMOVE the dead `echo-fix/FIXES.md` comment reference (no echo-fix/ exists in this repo). `format:check` stays omitted (main is Prettier-dirty tree-wide). The cross-platform compat tests are NOT a required gate yet (091 makes them green, 092 flips them to voting).
spec_refs:
  - backlog/complete/2026-05-26-076-packaged-echoctl-install-boundary.md  # the `files` allowlist / packaging boundary the `npm pack` validation exercises. selftest's INS-* checks ride on this boundary.
  - backlog/complete/2026-05-25-074-echo-cli-binary.md                    # the echoctl binary + doctor surface selftest invokes.
  - backlog/complete/2026-06-01-083-init-registers-claude-code-mcp.md     # the WIR-* adapter-registration checks selftest exercises.
  - backlog/complete/2026-06-02-084-install-profile-split.md              # init --answer-file + customer profile selftest drives.
  - src/cli/commands/selftest.ts  # current orphaned impl in the worktree ~/Desktop/Project_echo--onboarding-ci/ (read it there; it is NOT on main). Port the INTENT onto current main, applying the AC2 port fix.

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

# 090 — Adopt the onboarding self-test harness (revised, red board quarantined)

## Why

A `selftest` onboarding smoke + a cross-platform CI skeleton were written Jun 4 in a worktree
(`~/Desktop/Project_echo--onboarding-ci`) but **never committed, claimed, reviewed, or merged** — the
branch is `0` ahead of main and `49` behind it. The work is sound in intent (a fully-isolated
`echoctl selftest` that exercises install → daemon → MCP → init → wiring → capture → recall → doctor,
shipped *inside* the product so the same harness runs at dev time and against the published tarball).
This item brings that intent into the pipeline cleanly, **ported onto current main**, with the two
defects Codex flagged fixed (ephemeral port; packed-artifact validation) and the cross-platform red
board **quarantined** so main stays green until 091 upstreams the compat fixes.

This is the foundation of the Ring-1 (Windows beta tester) rollout path: 090 (harness) → 091 (compat
fixes, the Ring-1 blocker) → 092 (release workflow + flip CI to voting).

## Locked decisions

1. **Port onto current main, not the stale branch.** The orphaned `agent/onboarding-ci` branch is 49
   commits behind. Re-apply the four file changes onto a fresh branch off current main; do not fast-forward
   or merge the stale branch.
2. **Ship the harness inside the product.** `selftest` is a CLI subcommand (`src/cli/commands/selftest.ts`),
   so it rides in the `files` allowlist and the *same* binary runs on dev and against the published tarball.
   No logic is duplicated into CI or any sidecar.
3. **The red board does not vote yet.** The windows-compat assertions for fixes that don't exist on `src/`
   are `it.todo`/`skip`, and the CI compat job is non-required. 091 makes F4/R1/R2 green and un-skips them;
   092 flips the job to a required gate. Merging a default-red voting suite is out of bounds (Codex MED).
4. **Validate the packed artifact, not the working tree.** The `onboarding` CI job does `npm pack` → install
   the `.tgz` → `echoctl selftest`, so it actually validates the `files` allowlist (item 076). `npm install -g .`
   would silently ship the wrong file set.

## Acceptance criteria

- **AC1 — `echoctl selftest` exists and is wired.** The command is ported onto current main and dispatched
  from `src/cli/index.ts`; `echoctl selftest` and `echoctl selftest --json` run, produce the human + JSON
  reporters, and honor the documented exit-code contract. A smoke test (`tests/cli/selftest.test.ts`) asserts
  the JSON shape + exit code against an isolated sandbox.
- **AC2 — selftest is hermetic and cannot touch the real environment.** It uses an isolated throwaway
  HOME/ECHO_HOME/CODEX_HOME (preserved from the orphaned impl) **and** an ephemeral/free port by default
  (NOT the hardcoded 38478); if the chosen port already hosts a live daemon, it allocates a free one or
  fails fast with a clear message. A test proves selftest never binds the real daemon port.
- **AC3 — CI skeleton, packed-artifact validated.** `.github/workflows/ci.yml` runs a `quality` job
  (typecheck/lint/build/test) and an `onboarding` job (`npm pack` → install `.tgz` → `echoctl selftest`)
  across os:[ubuntu,macos,windows] × node:[22,24], `fail-fast:false`. The dead `echo-fix/FIXES.md` reference
  is removed. (CI authoring is validated by inspection + `act`/dry-run where feasible; live GH execution is
  not a merge gate.)
- **AC4 — red board quarantined; main stays green.** Every windows-compat assertion that depends on a fix
  not yet in `src/` is `it.todo`/`describe.skip` with a comment naming the spec that un-skips it (091 for
  F4/R1/R2). The compat job is non-required. `npm test`, `npm run lint`, `npm run typecheck` are green on
  current main.
- **AC5 — no drift.** ONLY harness adoption + CI skeleton. NO `src/` compat fixes (those are 091), NO release
  workflow (092), NO `echo-fix` changes, NO new `src/util/*` modules. Do not touch `backlog/`, `wiki/`,
  `docs/BACKLOG.md`, or `docs/STATUS.md`.

## Out of Scope (Don't Drift) — successors

1. The actual cross-platform fixes (F4 BOM / R1 separators / R2 spawn / no-launchctl / Windows data dir) — **091**.
2. The tag-triggered release workflow + flipping the compat job to a required gate — **092**.
3. `src/util/subprocess.ts`, `src/util/codex-skill.ts` — created in 091 / a Ring-2 successor; their windows-compat
   assertions stay `it.todo` here.
4. Windows Scheduled-Task autostart, Codex-skill-install upstream, the thin acceptance/distribution repo,
   npm-public/Homebrew/winget distribution, telemetry — all Ring-2+.

## After Completion (Strategist Notes)

- Unblocks 091. No wiki page yet — the onboarding/CI/release story gets one wiki page when 092 ships (the three
  items document one capability: cross-platform onboarding + release).
- Note in `review_notes` whether the packed-artifact `onboarding` job surfaced any `files`-allowlist gaps (it is
  the first CI exercise of the 076 boundary).
