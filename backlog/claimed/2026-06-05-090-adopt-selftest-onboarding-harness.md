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
ready_content_sha: 4fddfd292ea8203ba83b4ce889298a0f14ee9e283b978e07ea98e14b0ac17ded
files_to_modify:
  - src/cli/commands/selftest.ts          # AC1/AC2 — RE-IMPLEMENT the selftest command on current main to the AC1 check-id contract. The orphaned worktree (~/Desktop/Project_echo--onboarding-ci) is an ADVISORY starting point only — its line numbers are NOT authoritative and the build must not depend on it. KEEP its shape: isolated throwaway HOME/ECHO_HOME/CODEX_HOME, native-sqlite-load check, daemon/MCP/init/wiring/capture/doctor checks, exit-code contract, JSON + human reporters. AC2 port: set ECHO_MCP_PORT=0 for the throwaway daemon (atomic :0 bind — existing support) and read the resolved port from the daemon's mcp_port/mcp_url payload; never read or bind 38478. selftest must never touch the founder's real daemon or real ~/.echo/~/.claude/~/.codex.
  - src/cli/index.ts                       # AC1 — wire the `selftest` subcommand (import, command-list help, COMMAND_HELP entry, dispatch branch). +~6 lines, mirror the orphaned diff.
  - tests/windows-compat.test.ts           # AC4 — PORT, but QUARANTINE. The F4/R1 assertions reference live code; the R2 + Codex-skill assertions reference src/util/subprocess.ts + src/util/codex-skill.ts that DO NOT EXIST yet (they are 091/Ring-2 targets). To keep main green: mark every not-yet-satisfiable assertion `it.todo`/`describe.skip` with a comment pointing at the spec that will un-skip it (091 for F4/R1/R2; a Ring-2 successor for Codex-skill). NO red test may enter the voting suite here.
  - tests/cli/selftest.test.ts             # AC1 — NEW VOTING unit test: drive the command with a FAKE runner / mocked daemon+MCP; assert the JSON shape (check-id set + per-check pass/fail) + exit-code contract. It MUST NOT spawn the real daemon or shell out to the full `echoctl selftest` (the real end-to-end run lives in the NON-voting onboarding job), so it is green on every OS pre-091. Anti-drift: assert it exercises the same check-id inventory + command entrypoint as the real path. (Path per repo test convention.)
  - .github/workflows/ci.yml               # AC3 — PORT the skeleton, REVISED. `quality` job (typecheck/lint/build/test) on matrix os:[ubuntu,macos,windows] × node:[22,24], fail-fast:false — the ONLY voting gate in 090 (windows-compat + selftest unit tests are skip/fake per AC1/AC4, so `npm test` is green on every leg). `onboarding` job validates the PACKED artifact (`npm pack` → install the `.tgz` → real `echoctl selftest`), NOT `npm install -g .` (which skips the `files` allowlist); the ENTIRE `onboarding` matrix carries `continue-on-error: true` in 090 (non-voting on every OS — visible as the real-packaged-path signal, cannot fail `main`). REMOVE the dead `echo-fix/FIXES.md` comment reference. `format:check` stays omitted (main is Prettier-dirty tree-wide). 091 makes the onboarding legs green; 092 removes continue-on-error + makes onboarding a required gate.
spec_refs:
  - backlog/complete/2026-05-26-076-packaged-echoctl-install-boundary.md  # the `files` allowlist / packaging boundary the `npm pack` validation exercises. selftest's INS-* checks ride on this boundary.
  - backlog/complete/2026-05-25-074-echo-cli-binary.md                    # the echoctl binary + doctor surface selftest invokes.
  - backlog/complete/2026-06-01-083-init-registers-claude-code-mcp.md     # the WIR-* adapter-registration checks selftest exercises.
  - backlog/complete/2026-06-02-084-install-profile-split.md              # init --answer-file + customer profile selftest drives.
  # NOTE (not a spec_ref): the orphaned worktree ~/Desktop/Project_echo--onboarding-ci holds an advisory
  # reference impl of selftest. It is NOT load-bearing — AC1's check-id contract is authoritative and the
  # builder reconstructs selftest from it even if that worktree is gone.

# --- agent-managed fields (filled in during run) ---
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-06-05T20:39:33Z"
branch: "agent/adopt-selftest-onboarding-harness"
worktree: "/Users/zhenye/Desktop/Project_echo--adopt-selftest-onboarding-harness"
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

- **AC1 — `echoctl selftest` exists and is wired; the ACs are the authoritative, reproducible contract.**
  The command is ported onto current main and dispatched from `src/cli/index.ts`; `echoctl selftest` and
  `echoctl selftest --json` run, produce the human + JSON reporters, and honor the documented exit-code
  contract. The check set below is authoritative and self-contained — the orphaned worktree is advisory only
  (its line numbers are NOT authoritative); the spec does not depend on an uncommitted external tree. selftest
  MUST cover, each as a stable check-id row in the JSON: install sanity (`INS-*`), daemon spawn/stop
  (`DAE-*`), MCP-over-HTTP bring-up (`MCP-*`), `init` via answer-file (`INIT-*`), adapter wiring for Claude +
  Codex (`WIR-*`), git capture→recall across a daemon restart (`CAP-*`, `REC-*`), and `doctor` (`DOC-*`). The
  VOTING test (`tests/cli/selftest.test.ts`) is a UNIT/fake-runner test of the JSON shape (check-id set +
  per-check pass/fail) + exit code — it does NOT spawn the real daemon (the real end-to-end run lives in the
  non-voting onboarding job per AC3), so it is green on every OS pre-091.
- **AC2 — selftest is hermetic, atomically port-isolated, and cleans up on every exit path.** It uses an
  isolated throwaway HOME/ECHO_HOME/CODEX_HOME. **Port — existing daemon support, no daemon change:** selftest
  sets `ECHO_MCP_PORT=0` for its throwaway daemon; the daemon binds `:0` atomically (`src/mcp/server.ts`
  listen → `boundPort`) and already exposes the resolved port via its `mcp_port`/`mcp_url` payload
  (`src/daemon/index.ts:71`); selftest parses that resolved port and threads it to every MCP/client check. It
  never reads or binds 38478. Two tests: (i) a SENTINEL test occupies 38478 with a stub listener and asserts
  selftest still succeeds and never contacts it; (ii) two concurrent selftest runs neither collide nor touch
  38478. **Cleanup:** on success, failure, AND timeout, selftest terminates its child daemon (platform-aware
  kill) and removes the throwaway HOME/ECHO_HOME/CODEX_HOME; a test asserts BOTH temp-state removal on all
  three exit paths AND no selftest-spawned daemon left listening after a forced failure/timeout.
- **AC3 — `quality` is the ONLY voting gate; the `onboarding` job is wholly non-voting in 090.**
  `.github/workflows/ci.yml` runs a `quality` job (typecheck/lint/build/test) across os:[ubuntu,macos,windows]
  × node:[22,24], `fail-fast:false` — the windows-compat unit assertions and the selftest unit test are
  skip/fake per AC1/AC4, so `npm test` is green on every leg and `quality` is the sole voting gate. The
  `onboarding` job (`npm pack` → install the `.tgz` → real `echoctl selftest`) carries `continue-on-error:
  true` on EVERY matrix leg in 090 — it runs and reports as the real-packaged-path signal but cannot fail
  `main` on any OS. Non-voting is encoded in the workflow YAML (`continue-on-error`), never via repo
  branch-protection (which lives outside `files_to_modify`). The dead `echo-fix/FIXES.md` reference is
  removed. (CI authoring validated by inspection + `act`/dry-run; live GH execution is not a merge gate.)
- **AC4 — red board quarantined; nothing that executes the real selftest votes; main stays green.** (i) Every
  windows-compat UNIT assertion depending on a not-yet-landed `src/` fix is `it.todo`/`describe.skip` with a
  091 comment. (ii) `tests/cli/selftest.test.ts` is a fake-runner unit test (AC1) — it never runs the real
  daemon, so it is green on every OS. (iii) The real end-to-end selftest runs ONLY in the `onboarding` job,
  which is `continue-on-error` on all legs (AC3). Net: no `ci.yml` leg and no voting test can fail `main` in
  090. `npm test`, `npm run lint`, `npm run typecheck` green on current main; 091 un-skips the compat
  assertions + makes the onboarding legs green; 092 removes `continue-on-error` and makes onboarding a
  required gate.
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
