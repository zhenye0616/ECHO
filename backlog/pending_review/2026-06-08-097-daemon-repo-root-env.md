---
id: 2026-06-08-097-daemon-repo-root-env
title: "daemon install bakes ECHO_REPO_ROOT into the launchd plist so packaged reviewer dispatch resolves repo-relative paths (coord_invoke ENOENT fix)"
status: proposed
priority: HIGH
estimate: 2h
created: 2026-06-08
blocked_by: []
task_state_ref: 2026-06-08-097-daemon-repo-root-env
requested_reviewers: ["codex", "codex-ops"]
ready_content_sha: 127f00a3e18afad70865b5d2f6681f12ce9787d698e61bbc1f0555ec03be0d75
claimed_by: "codex-builder-E94AA128-0730-443D-B17B-AA0321BA6E1A"
claimed_at: "2026-06-08T21:18:57Z"
branch: "agent/097-daemon-repo-root-env"
head_sha: "939bfe3ef9b461614fece76a00e832b41a7c7c8d"
pr_url: ""
agent_notes: |
  Built by a Codex builder (codex exec, danger-full-access, worktree agent/097-daemon-repo-root-env). Only the 2 files_to_modify touched (src/cli/commands/daemon.ts, tests/cli/daemon.test.ts); zero out-of-scope edits (src/coord/paths.ts untouched). All ACs implemented.
  Reviewed by Claude strategist (independent of the Codex builder), verdict MERGE AS-IS:
  - AC1-AC4 met with file:line evidence; harness-marker gate (tools/review-queue/) applied to BOTH explicit (throw->exit 2, no plist) and auto-derive (silent omit) paths; ECHO_REPO_ROOT XML-escaped in plist; isLaunchdPlatform gates Windows out (omits).
  - Critical negatives verified: explicit bad --repo-root -> return 2 + existsSync(plist)==false; restart/start/status preserve the var via readPlistConfig read-back (no upgrade-path regression).
  - AC5 all 7 cases covered (a/d folded with real special-char value; g parametrized over non-existent + no-harness).
  - Orchestrator-reproduced from git ground truth: npx vitest run tests/cli/daemon.test.ts -> 26/26 passed; typecheck clean; lint clean.
  head_sha = d1ee1cacf1848f0c09eb78a08b92d3147657adb0 (branch agent/097-daemon-repo-root-env, pushed to origin).
  MERGE-RECONCILIATION (939bfe3e, founder-approved): tests/cli/shell-reachable.test.ts (outside 097 files_to_modify) asserted coord_invoke returns isError in a packaged install AND the post-097 auto-derive made its install (cwd=repo) resolve the real source-repo wrapper -> coord_invoke succeeded (inverting the assertion) AND fire-and-forget spawned a live codex tick. Fix: run daemon install from a non-repo cwd (tmpRoot) so ECHO_REPO_ROOT is omitted, faithfully modelling the packaged-boundary (076); graceful-ENOENT contract restored, live spawn removed, test-only. shell-reachable green in isolation; full suite re-verified at merge.
review_notes: ""
files_to_modify:
  - src/cli/commands/daemon.ts        # add --repo-root flag + repoRoot config field (explicit flag → cwd git-toplevel → omit); harness-marker gate (<root>/tools/review-queue/ must exist) — explicit failure = exit non-zero + no plist, auto-derive failure = silent omit; emit <key>ECHO_REPO_ROOT</key> into the plist EnvironmentVariables dict only when an accepted root is resolved; update the install help text.
  - tests/cli/daemon.test.ts          # plist-content assertions: flag value present + XML-escaped + absolute; relative flag resolves absolute; cwd-in-harness-repo default; cwd-not-a-repo / git-ENOENT → key OMITTED; cwd-in-unrelated-repo (no harness) → OMITTED; explicit bad/non-harness path → exit non-zero + no plist.
spec_refs:
  - src/coord/paths.ts                # computeRepoRoot() — READ FIRST: already honors ECHO_REPO_ROOT (lines 36-44); DO NOT modify. This spec only ensures the daemon's environment SETS it.
  - src/mcp/tools/coord-invoke.ts     # reference ONLY — consumes REPO_ROOT for cwd + ECHO_REVIEW_QUEUE_REPO_ROOT + wrapper resolution; DO NOT modify (request_path stays relative).
  - backlog/_followups.md             # R6 — the "coord_invoke ENOENT (077 + 092 recurrence)" HIGH bullet this closes; R6.remote_durable_truth theme.
---

## Why

Every strategist-driven reviewer dispatch through `coord_invoke` ENOENTs against the **packaged** daemon (followups R6, `open HIGH`, recurred at 077 and 092). Root cause: `src/coord/paths.ts` `computeRepoRoot()` checks `ECHO_REPO_ROOT` first, **else** derives the repo root from `import.meta.url` → `../..`. In a `npm install -g` deployment that fallback resolves to the **install dir** (`…/lib/node_modules/echoctl`), not the user's repo. So:

- `resolveReviewerWrapperPath(role)` looks for `<install-dir>/tools/review-queue/run-<role>-reviewer.sh`, which does not exist in the packaged tree → ENOENT.
- `coord_invoke` spawns the wrapper with `cwd: REPO_ROOT` and `ECHO_REVIEW_QUEUE_REPO_ROOT: REPO_ROOT` = the install dir, so even the relative `request_path` (`backlog/reviews/<slug>/r<N>/request.md`) resolves against the wrong root.

The override already exists for exactly this case — the `ECHO_REPO_ROOT` env var, documented in `paths.ts` as "tests + bundled-daemon deployments where the source-tree path math doesn't hold." The bug is purely that **nothing sets it in the daemon's launchd environment.** The launchd plist generator (`src/cli/commands/daemon.ts`) already emits an `EnvironmentVariables` dict with `ECHO_HOME`, `ECHO_MCP_PORT`, `ECHO_DATA_DIR`, `ECHO_DB_PATH` — it just never adds `ECHO_REPO_ROOT`. This is a one-seam, additive, no-protocol-change fix.

## Locked decisions

1. **`daemon install` writes `ECHO_REPO_ROOT` into the launchd plist `EnvironmentVariables` dict**, alongside the existing `ECHO_HOME`/`ECHO_MCP_PORT`/`ECHO_DATA_DIR`/`ECHO_DB_PATH`, XML-escaped identically. The packaged daemon then hits the existing env-override branch of `computeRepoRoot()` (`paths.ts:36-44`) and resolves wrappers + the relative `request_path` against the real repo.
2. **Value source + harness-marker gate.** Resolve a candidate root in order: (a) an explicit new `--repo-root <path>` flag (authoritative; mirrors `--home`/`--data-dir`), resolved to an absolute path; else (b) the git toplevel of the install-time working directory (`git rev-parse --show-toplevel` of the cwd the operator runs `echoctl daemon install` from); else (c) none. **A candidate is written to the plist ONLY if it contains the reviewer harness — i.e. `<root>/tools/review-queue/` exists.** This single guard stops the fix from *re-creating* the very silent-ENOENT class it closes: a typo'd/stale explicit path, or `daemon install` run from an **unrelated** git repo, would otherwise bake a root against which `coord_invoke` resolves wrappers and request-paths to the wrong tree. Failure handling differs by source — an **explicit** `--repo-root` that is missing, non-existent, or lacks the harness marker is an **operator error** → `daemon install` exits **non-zero** with a clear stderr message and writes NO plist; an **auto-derived** cwd toplevel that lacks the marker (unrelated repo, non-git dir, `git` absent/ENOENT, non-zero exit) **silently omits** the key (current behavior preserved, no error).
3. **Omit-not-empty (no regression).** When neither a flag nor a cwd git-toplevel yields a root, the `ECHO_REPO_ROOT` key is absent from the plist — never an empty string, never the install dir. A customer install that does not use the reviewer queue and is not run from a repo behaves byte-for-byte as today (the daemon keeps its current `import.meta.url` fallback).
4. **macOS launchd plist only.** Windows daemon launch has no plist and is a separate path (R5 Windows EPIC) — see Out of Scope.
5. **No protocol or resolver change.** `computeRepoRoot()`, `coord_invoke`, and `resolveReviewerWrapperPath` are correct and are NOT modified; `request_path` stays relative. The single-repo-per-daemon assumption is retained intentionally (the coord/reviewer harness is single-repo; multi-repo dispatch is a separate future item).

## Acceptance criteria

1. **`--repo-root <path>` flag, validated at install time.** `echoctl daemon install` accepts `--repo-root <path>`; the value is resolved to an absolute path (relative inputs resolve against the install-time cwd) and persisted into the generated plist as `<key>ECHO_REPO_ROOT</key><string>…</string>` inside the existing `EnvironmentVariables` dict. An explicit `--repo-root` is **validated**: it must be an existing directory containing `tools/review-queue/`. If it is missing, non-existent, or lacks that marker, `echoctl daemon install` exits **non-zero** with a clear stderr message and writes **no plist** — it must never install a daemon that will ENOENT later. The install help text (the flag list in `daemon.ts`) documents the flag.
2. **Default derivation when `--repo-root` is omitted, gated on the harness marker.** The installer derives `repoRoot` = the git toplevel of the install-time cwd (`git rev-parse --show-toplevel`, reusing the existing git-subprocess invocation style; no new timeout knob). The auto-derived toplevel is written to the plist **only if it contains `tools/review-queue/`**. On any git failure (not a git repo, `git` absent/ENOENT, non-zero exit) **or** a toplevel that lacks the harness marker (an unrelated repo), it falls through to omission **with no error** (auto-derivation is best-effort, unlike the explicit flag).
3. **Omit-not-empty.** When no root is resolved/accepted (no flag AND cwd is not a harness-bearing git repo), the generated plist contains **no** `ECHO_REPO_ROOT` key (assert absence — not an empty `<string></string>`, not the install dir). This is the no-regression guarantee for non-coord installs.
4. **Behavior contract — dispatch resolves against the repo.** With `ECHO_REPO_ROOT` set in the plist env, a packaged daemon's `computeRepoRoot()` returns the configured repo root (env branch), so `resolveReviewerWrapperPath(role)` resolves `<repo>/tools/review-queue/run-<role>-reviewer.sh` and `coord_invoke` spawns with `cwd` / `ECHO_REVIEW_QUEUE_REPO_ROOT` = the repo root. Demonstrated by AC5's plist-content tests plus the existing `paths.ts` env-override behavior (the override path is pre-existing and already covered; this spec does not re-test `paths.ts`).
5. **Tests + verification.** `tests/cli/daemon.test.ts` gains: (a) `--repo-root <abs harness dir>` → plist contains `<key>ECHO_REPO_ROOT</key>` with that path, XML-escaped, absolute; (b) omitted + cwd inside a harness-bearing git repo → plist contains that repo's toplevel; (c) omitted + cwd NOT a git repo (or `git` ENOENT) → plist has no `ECHO_REPO_ROOT` key; (d) a value needing XML escaping is escaped like the sibling vars; (e) omitted + cwd is a git repo that LACKS `tools/review-queue/` (unrelated repo) → plist has no key; (f) a **relative** `--repo-root` pointing at a valid harness dir → plist contains the cwd-resolved **absolute** path; (g) an explicit `--repo-root` to a non-existent path, OR an existing dir lacking `tools/review-queue/` → `daemon install` exits **non-zero** and writes **no plist**. Builder runs before review:
   ```bash
   npm run test -- tests/cli/daemon.test.ts
   npm run typecheck
   npm run lint
   ```

## Out of Scope (Don't Drift)

- **Windows daemon env injection.** Windows has no launchd plist; threading `ECHO_REPO_ROOT` into a Windows daemon launch mechanism is the Windows EPIC's concern, not this item. Do not add a Windows daemon-install path here.
- **Multi-repo-per-daemon coord dispatch.** One configured repo root per daemon only. Do NOT widen `coord_invoke`'s `request_path` to an absolute path, and do NOT add a `repo_root` field to the coord protocol — that is a separate future item if the harness ever serves multiple repos.
- **Generalizing the harness marker.** The accept-gate is the concrete `tools/review-queue/` directory (exactly what `resolveReviewerWrapperPath` needs) — NOT a broader "is this the ECHO repo" probe (package.json name, git remote, etc.). Keep it the literal reviewer-harness path; do not invent a richer repo-identity check here.
- **Changing `computeRepoRoot()` / `coord-invoke.ts` / `resolveReviewerWrapperPath`.** They are correct; only the daemon's *environment* was wrong. If a real resolver bug surfaces, log a drift-event — do not fix here.
- **`doctor`/`selftest` validation that the plist carries `ECHO_REPO_ROOT`.** A reasonable follow-up, but not in this item — keep the surface to install-time plist generation.
- **Auto-migrating an already-installed daemon.** Picking up the new env requires re-running `echoctl daemon install` (regenerates the plist); no postinstall auto-restart is added. The re-run instruction is a docs note (strategist, post-merge), not code here.

## After Completion (Strategist Notes)

- Update `docs/echoctl-install.md`: document `--repo-root`, and that existing installs must re-run `echoctl daemon install` (then `daemon restart`) to add `ECHO_REPO_ROOT` to the plist env.
- Update `backlog/_followups.md` R6: mark **coord_invoke ENOENT (077 + 092)** resolved by `ECHO_REPO_ROOT`-in-plist; keep the Windows daemon-env and multi-repo-per-daemon residuals open.
- Consider a one-line architecture/surfaces note that the daemon's repo-root is an explicit install-time env contract (not an `import.meta.url` inference) for packaged deployments.
