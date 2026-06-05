---
id: 2026-06-05-091-upstream-windows-compat-fixes
title: "Upstream the Windows compat fixes into src/ (F4 BOM → R1 separators → R2 spawn → no-launchctl-false-fail + Windows data dir) and retire the echo-fix runtime patcher from the release path — the Ring-1 blocker"
status: proposed
priority: HIGH
estimate: 1-2d
created: 2026-06-05
blocked_by: ["2026-06-05-090-adopt-selftest-onboarding-harness"]
task_state_ref: 2026-06-05-091-upstream-windows-compat-fixes
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - src/util/json.ts                       # AC1 (F4) — NEW BOM-tolerant JSON reader (strip a leading U+FEFF before JSON.parse). Single helper reused at every onboarding-critical parse site. (Path per repo util convention.)
  - src/cli/commands/init.ts               # AC1 (F4) — route answer-file parse (init.ts:265 `JSON.parse(raw)`) and onboarding-state reads (:331, :356 `JSON.parse(readFileSync(...))`) through the BOM-tolerant reader. A UTF-8-BOM answer file currently throws — this is the root of the answer-file/init cascade.
  - src/capture/sources.ts                 # AC1 (F4) + AC2 (R1) — F4: capture-sources parse (sources.ts:125 `JSON.parse(raw)`) through the BOM reader. R1: path-membership checks compare raw slash styles (`expanded.startsWith(expandTilde(entry))` :81, `expandTilde` :58) — normalize separators before compare so a Windows path matches its config entry.
  - src/storage/memory.ts                  # AC2 (R1) — `event.source.startsWith(sourcePrefix)` (:94) compares source strings that embed filesystem paths (e.g. `fs:/…`). VERIFY which compares are genuinely path-style vs logical-prefix (`coord:` at :166/:180 are logical — leave those); normalize only the path-bearing ones.
  - src/util/subprocess.ts                 # AC3 (R2) — NEW cross-platform command resolver: resolve `claude`/`codex` on Windows (PATHEXT, .cmd/.exe shims), correct arg handling, NO shell-injection. (Path per repo util convention.) SEAM (r1 codex F3): export a PURE resolver `resolveCommand(cmd, deps: { platform: NodeJS.Platform; env: NodeJS.ProcessEnv; existsSync: (p: string) => boolean })` returning `{ command: string; prependArgs?: string[] }`. The resolver reads platform/PATH/PATHEXT/fs ONLY from `deps` — never `process.platform`/`process.env`/host PATH directly — so a Windows `.cmd` lookup is testable on a POSIX host by injecting `{ platform: 'win32', env: { PATH, PATHEXT }, existsSync: <fake> }`. `realSpawn` calls it with the real `{ platform: process.platform, env: process.env, existsSync }`.
  - src/echo-home/wizard/probe.ts          # AC3 (R2) — the default `realSpawn` (:167, used at :133 `spawn(cmd, ...)`) routes through src/util/subprocess.ts. The `deps.spawn` injection seam is preserved (tests still inject).
  - src/echo-home/adapters/claude-code-mcp.ts  # AC3 (R2) — default `realSpawn` (:99, used at :105 `spawn('claude', args, ...)`) routes through src/util/subprocess.ts. Preserve the `deps.spawn` seam.
  - src/daemon/lifecycle.ts                # AC4 — `resolveDataDir()` (:18) returns `~/Library/Application Support/ECHO` on EVERY OS. Make it OS-appropriate: Windows → %LOCALAPPDATA% (fallback %APPDATA%), macOS → ~/Library/Application Support/ECHO, Linux → $XDG_DATA_HOME or ~/.local/share/ECHO. PRESERVE the ECHO_DATA_DIR override (highest precedence). NOTE migration risk: existing macOS installs must keep resolving the same path (no data move) — macOS branch is unchanged.
  - src/cli/commands/daemon.ts             # AC4 (r1 codex F1 / codex-ops F5; r2 codex-ops F1) — the launchctl caller. EVERY launchd op (launchctl print/bootstrap/bootout at :231/:514/:518, and the "launchctl not found …" false-fail messages) is currently unconditional. Add `platform?: NodeJS.Platform` to `DaemonDeps` (:34; the existing DI seam, default `process.platform`); gate launchd on `platform === 'darwin'` — on EVERY non-darwin platform (`win32` AND `linux`), the daemon lifecycle MUST NOT invoke `launchctl`: start/stop/status return a clean "manual daemon (no launchd)" result instead of a launchctl-not-found error. Only the macOS/darwin path calls launchctl (unchanged).
  - src/cli/commands/doctor.ts             # AC4 (r1 codex F1 / codex-ops F5; r2 codex-ops F1) — the doctor reporting path. Reads daemon health via `report.daemon.pidLockHeld`/`mcpReachable` (:191-192) over `resolveDataDir()` (:205). On every non-darwin platform (Windows AND Linux), absent launchd MUST report a clean manual-daemon state (NOT `broken`/`degraded` false-fail); the unattended ubuntu/Windows selftest must not red-board on a manually-run daemon.
  - tests/windows-compat.test.ts           # AC6 — UN-QUARANTINE the F4/R1/R2/data-dir assertions 090 marked `it.todo`/`skip`; they now PASS. Keep Codex-skill + Scheduled-Task assertions `it.todo` (Ring-2 successors — src/util/codex-skill.ts is NOT created here).
  - tests/util/json.test.ts               # AC1 — BOM-prefixed input parses; non-BOM unchanged; malformed still throws. (Path per repo convention.)
  - tests/util/subprocess.test.ts         # AC3 — via the injected `{ platform, env, existsSync }` deps (no process.platform monkey-patch, no host-PATH dependency): resolver finds a `.cmd` shim under a simulated Windows PATHEXT; POSIX path unchanged; no shell-injection. (Path per repo convention.)
  - tests/cli/daemon.test.ts               # AC4 — with a non-darwin platform injected into DaemonDeps (cover BOTH `'win32'` and `'linux'`), daemon start/stop/status make ZERO `launchctl` calls (assert the spawnSync/spawn mock is never invoked with 'launchctl') and return the manual-daemon result; `'darwin'` path still calls launchctl as today.
  - tests/cli/doctor.test.ts               # AC4 — with a non-darwin platform (`'win32'` and `'linux'`), doctor reports a non-broken manual-daemon state for a reachable-but-not-launchd daemon (no false-fail); `'darwin'` reporting unchanged.
spec_refs:
  - backlog/proposed/2026-06-05-090-adopt-selftest-onboarding-harness.md  # parent. 090 ships the harness + quarantined red board; 091 makes F4/R1/R2/data-dir green and un-quarantines them. Read 090's AC4 (quarantine mechanism) before un-skipping.
  - src/cli/commands/init.ts          # F4 parse sites (:265 answer-file, :331/:356 onboarding-state)
  - src/capture/sources.ts            # F4 (:125) + R1 (:58 expandTilde, :81 startsWith membership)
  - src/echo-home/wizard/probe.ts     # R2 spawn (:133, :167 realSpawn)
  - src/echo-home/adapters/claude-code-mcp.ts  # R2 spawn (:105, :99 realSpawn)
  - src/daemon/lifecycle.ts           # data-dir default (:18 resolveDataDir)

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

# 091 — Upstream the Windows compat fixes; retire the patcher from the release path

## Why

The Windows onboarding failures Codex root-caused (BOM intolerance, raw-separator path compares,
direct `spawn('claude'/'codex')`, macOS-only data dir + launchctl assumptions) are currently fixed
**only** in a runtime patcher (`echo-fix/echo-windows-fix.mjs`) that rewrites the compiled `dist`.
A dist patcher means `src/`, the test suite, typechecking, and shipped behavior can silently diverge —
these are **runtime product bugs, not packaging bugs**, so they belong in `src/`. This item upstreams
them in the dependency order Codex confirmed (F4 first — it's the root of the answer-file/init cascade)
and removes the patcher from the normal release path, so 092 can build a *clean-source* tarball that
runs correctly on Windows with no post-build rewrite.

This is the **Ring-1 blocker**: until F4, R1, R2, no-launchctl-false-fail, and the Windows data dir
land, the beta tester's Windows box cannot receive a correct artifact.

## Locked decisions

1. **Retire `echo-fix` from the release path.** The fixes live in `src/`; the release workflow (092) builds
   clean source with no patcher. (If `echo-fix/` is regenerated later as a *local emergency* hotfix tool that
   is fine, but it is NOT in the shipped/normal path.)
2. **F4 → R1 → R2 → no-launchctl/data-dir order.** F4 (BOM) is the root of the answer-file/init cascade and
   fails on every platform that hands ECHO a BOM'd file; it lands first. R1/R2/data-dir follow.
3. **One BOM-tolerant reader, reused.** A single `src/util/json.ts` helper at every onboarding-critical parse
   site, not scattered inline strips.
4. **R2 keeps the dependency-injection seam.** The resolver goes in the *default* `realSpawn`; the `deps.spawn`
   test seam in `probe.ts`/`claude-code-mcp.ts` is untouched.
5. **R3 splits.** "Do not call `launchctl` on Windows / do not false-fail" is Ring-1 and lands here, together
   with the OS-appropriate data dir. Proper Windows Scheduled-Task autostart is a **Ring-2 successor** (fine
   while Ring-1 runs the daemon manually).
6. **macOS data path is unchanged** — only the Windows/Linux branches are new, so existing installs don't move data.

## Acceptance criteria

- **AC1 — F4 (BOM).** A BOM-tolerant reader (`src/util/json.ts`) is applied at the answer-file parse
  (`init.ts:265`), onboarding-state reads (`init.ts:331,:356`), and capture-sources parse (`sources.ts:125`).
  A UTF-8-BOM answer file and a BOM'd capture-sources file parse cleanly; non-BOM input is unchanged; malformed
  input still throws. The 090-quarantined F4 windows-compat assertion now passes.
- **AC2 — R1 (separators).** Path-membership/prefix compares use **path-component-aware** normalization
  (r1 codex-ops F4), not bare slash-swapping: (a) normalize separators, (b) case-fold on Windows (filesystem
  paths are case-insensitive there), and (c) enforce a **path-boundary** so a prefix matches only at a segment
  boundary — `C:\foo` MUST NOT match `C:\foobar`, while `C:\foo\bar` DOES match entry `C:\foo`. Applied to the
  path-bearing compares (`sources.ts:58/:81`; `memory.ts:94`); logical prefixes (`coord:` in `memory.ts:166/:180`)
  stay plain string-prefix, untouched. The R1 assertion passes, plus an added sibling-prefix non-match case
  (`C:\foo` vs `C:\foobar`) and a Windows case-fold match case.
- **AC3 — R2 (spawn).** `src/util/subprocess.ts` resolves `claude`/`codex` cross-platform (PATHEXT/.cmd/.exe,
  correct arg handling, no shell-injection) via a PURE `resolveCommand(cmd, { platform, env, existsSync })`
  resolver that reads platform/PATH/PATHEXT/fs ONLY from injected deps (r1 codex F3); `realSpawn` in `probe.ts`
  and `claude-code-mcp.ts` routes through it; the `deps.spawn` seam is preserved. A test injects
  `{ platform: 'win32', env: { PATH, PATHEXT }, existsSync }` and proves resolution of a `.cmd` shim on a
  simulated Windows PATHEXT **without** monkey-patching `process.platform` or depending on host PATH. The R2
  assertion passes.
- **AC4 — no-launchctl false-fail + Windows data dir.** `resolveDataDir()` (`lifecycle.ts:18`) returns an
  OS-appropriate directory (Windows %LOCALAPPDATA%/%APPDATA%, macOS unchanged, Linux XDG) with `ECHO_DATA_DIR`
  overriding. The launchd lifecycle in `src/cli/commands/daemon.ts` (the `launchctl` caller) is gated on a new
  `DaemonDeps.platform` field (default `process.platform`) **on `darwin` only** (r2 codex-ops F1): launchd ops
  run iff `platform === 'darwin'`; on **every non-darwin platform (win32 AND linux)** the lifecycle makes **zero**
  `launchctl` calls and returns a manual-daemon result — so the ubuntu selftest in AC6's matrix cannot
  launchctl-not-found false-fail either. `src/cli/commands/doctor.ts` reports a clean (non-`broken`/`degraded`)
  manual-daemon state on all non-darwin platforms rather than false-failing. macOS behavior unchanged. Tests cover
  the Windows data-dir resolution (`tests/windows-compat.test.ts`), the no-launchctl daemon path
  (`tests/cli/daemon.test.ts` — `platform:'win32'` AND `platform:'linux'` → no `launchctl` spawn), and the
  no-false-fail doctor path (`tests/cli/doctor.test.ts`, non-darwin).
- **AC5 — patcher retired from the release path (VERIFICATION-ONLY; r1 codex F2).** No normal build/release step
  references `echo-fix`. Falsifiable check (must return no matches):
  `grep -rIn 'echo-fix\|echo-windows-fix' package.json scripts/ .github/workflows/ tsconfig*.json`. At spec time
  this is already clean (`build:cli`/`prepack` in `package.json` invoke no patcher; the only `echo-fix*` strings
  in-repo are unrelated `echo-fixture` test data under `tools/review-queue/`). **No `src/` change is required for
  this AC.** `echo-fix/` may remain on disk as a local emergency hotfix tool but MUST NOT be invoked by
  `npm run build:cli`, `prepack`, or 090's CI workflow (the same grep over `.github/workflows/` must be clean once
  090's CI is present).
- **AC6 — Ring-1 board green; tests pass.** `npm test`, `npm run lint`, `npm run typecheck` green; the
  un-quarantined F4/R1/R2/data-dir windows-compat assertions pass; `echoctl selftest` passes on the
  os:[ubuntu,macos,windows] matrix from 090's CI (still non-required until 092). Codex-skill + Scheduled-Task
  assertions remain `it.todo`.
- **AC7 — no drift.** ONLY the listed compat fixes. NO `src/util/codex-skill.ts`, NO Windows Scheduled-Task
  autostart (Ring-2 successors), NO release workflow / CI-voting flip (092), NO new CLI command. Do not touch
  `backlog/`, `wiki/`, `docs/BACKLOG.md`.

## Out of Scope (Don't Drift) — successors

1. Windows Scheduled-Task autostart (proper boot-time start) — Ring-2; Ring-1 runs the daemon manually.
2. `src/util/codex-skill.ts` Codex-skill-install upstream — Ring-2 successor; its windows-compat assertion stays `it.todo`.
3. The release workflow + flipping the compat job to a required gate — **092**.
4. Migrating existing macOS data dirs (none needed — macOS branch unchanged).
5. Telemetry, the thin acceptance repo, public distribution channels — Ring-2+.

## After Completion (Strategist Notes)

- Unblocks 092 and clears the Ring-1 blocker. After 092 ships, fold the cross-platform-onboarding decisions
  (BOM-tolerant IO, separator normalization, cross-platform spawn resolver, OS-appropriate data dir, patcher
  retirement) into the single onboarding/release wiki page.
- File the Ring-2 successors as `_followups.md` rows: Windows Scheduled-Task autostart; Codex-skill-install
  upstream (un-`todo` its windows-compat assertion).
