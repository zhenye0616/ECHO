---
id: 2026-06-05-092-release-workflow-and-voting-ci
title: "Tag-triggered release workflow — build ONE context-layer tarball, validate that exact tarball on the OS matrix, publish to a private beta channel; flip the cross-platform onboarding job to a REQUIRED gate; pin the packed-manifest scope"
status: proposed
priority: MED
estimate: 0.5-1d
created: 2026-06-05
blocked_by: ["2026-06-05-091-upstream-windows-compat-fixes"]
task_state_ref: 2026-06-05-092-release-workflow-and-voting-ci
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - .github/workflows/release.yml          # AC1/AC2 — NEW tag-triggered (`v*`) workflow. Build ONE artifact via `npm pack` (echoctl-<version>.tgz — NOT per-OS artifacts; ECHO is one Node package, only native dep better-sqlite3 installs via its own prebuild path and is NOT bundled in the npm tarball). Then on matrix os:[ubuntu,macos,windows]: install that SAME .tgz and run `echoctl selftest` (+ `echoctl doctor`). Publish the tarball as a private/prerelease GitHub Release tagged the same `v0.1.x-beta.N`; do NOT delete the prior release (rollback). No npm-public/Homebrew/winget here.
  - .github/workflows/ci.yml               # AC3 — flip the `onboarding` + windows-compat job(s) from 090's NON-required/quarantined state to a REQUIRED gate now that 091 made them green. main now fails if cross-platform onboarding regresses. (Un-skip is already done in 091; this makes the green job a blocking check.)
  - tests/packaging/packed-manifest.test.ts  # AC4 — NEW: snapshot the packed file manifest (`npm pack --dry-run --json`) so the shipped surface is EXPLICIT and any addition/removal is a reviewed diff. Does NOT strip anything — it pins what 076's allowlist currently ships (incl. assets/echo-roles/**, assets/echo-workflows/**, review-queue config/schemas) so a future change is intentional. (Path per repo convention.)
  - package.json                            # AC2 (if needed) — version/channel scaffolding for `v0.1.x-beta.N` (e.g. a `release` or `pack:check` script). Do NOT change the `files` allowlist in this item (that's the flagged founder decision — see After Completion).
spec_refs:
  - backlog/proposed/2026-06-05-091-upstream-windows-compat-fixes.md      # parent — 091 must be complete (Windows artifact is correct from clean source) before a release workflow can produce a shippable Ring-1 tarball.
  - backlog/proposed/2026-06-05-090-adopt-selftest-onboarding-harness.md  # grandparent — provides `echoctl selftest` (the in-tarball harness this workflow runs) + the CI skeleton whose onboarding job this flips to required.
  - backlog/complete/2026-05-26-076-packaged-echoctl-install-boundary.md  # the `files` allowlist this packed-manifest test pins.
  - package.json  # current `files` allowlist (:12) + bin/prepack (:9,:31); native dep better-sqlite3 (:60).

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

# 092 — Release workflow + flip CI to voting + pin the packed manifest

## Why

With the harness in (090) and the compat fixes upstreamed (091), the last Ring-1 piece is a repeatable
way to **produce and validate the artifact the Windows beta tester installs**. The standard model for a
solo, phased rollout of a Node daemon+CLI: a tag triggers a workflow that builds **one** tarball and then
**installs that exact tarball on each OS and runs the shipped `selftest`** — the tarball is the seam, not
per-OS source. We publish to a private beta channel (`v0.1.x-beta.N`), keep the prior tarball for rollback,
and now that cross-platform onboarding is green we make it a **required gate** so it can't silently regress.

No separate release *source* repo (the `files` allowlist already carves the context layer out of this
private repo). A thin acceptance/distribution repo stays a deferred option for when the tester runs the
harness themselves.

## Locked decisions

1. **One cross-platform tarball, tested per-OS.** `npm pack` → one `echoctl-<version>.tgz`; the matrix installs
   *that* tgz and runs `echoctl selftest`. Per-OS artifacts are explicitly NOT built (no bundled node_modules,
   no single-file binary, no self-prebuilt natives — better-sqlite3 resolves at install).
2. **Private beta channel, rollback-safe.** Publish as a private/prerelease GitHub Release tagged
   `v0.1.x-beta.N`; never delete the prior release. No npm-public/Homebrew/winget (Ring-2+).
3. **Flip onboarding CI to required.** 091 made the compat assertions green; 092 makes the onboarding job a
   blocking check. main now fails on cross-platform onboarding regression.
4. **Pin the packed manifest, do not strip.** A snapshot test makes the shipped file set explicit. Whether the
   context-layer tarball should *stop* shipping `assets/echo-roles/**` / `assets/echo-workflows/**` /
   review-queue config is a **founder decision flagged for follow-up**, NOT decided here (those assets may be
   runtime-required by the daemon/MCP; stripping them blind would break the product).

## Acceptance criteria

- **AC1 — tag-triggered release build.** A `v*` tag triggers `release.yml`, which builds exactly one
  `echoctl-<version>.tgz` via `npm pack` from clean source (no `echo-fix` patcher).
- **AC2 — per-OS tarball validation + publish.** On os:[ubuntu,macos,windows] the workflow installs the SAME
  `.tgz` and runs `echoctl selftest` (+ `doctor`); all green is required to publish. It publishes the tarball
  to a private/prerelease GitHub Release tagged `v0.1.x-beta.N` and retains the prior release for rollback.
  (Validated by inspection + a dry-run / `workflow_dispatch` rehearsal; a real Windows GH run is the truth but
  not a unit-test gate.)
- **AC3 — onboarding CI is a required gate.** The `onboarding`/windows-compat job (green after 091) is flipped
  from non-required to a blocking check on `ci.yml`; a deliberately reintroduced compat regression fails it.
- **AC4 — packed-manifest pinned.** `tests/packaging/packed-manifest.test.ts` snapshots `npm pack --dry-run`
  output; adding/removing a shipped path fails the test until the snapshot is updated. It does not alter the
  `files` allowlist.
- **AC5 — tests green.** `npm test`, `npm run lint`, `npm run typecheck` green; the release workflow passes a
  dry-run/rehearsal.
- **AC6 — no drift.** ONLY the release workflow, the CI-voting flip, and the manifest pin. NO `src/` changes,
  NO `files`-allowlist edits, NO public-distribution channels (Homebrew/winget/npm-public), NO thin acceptance
  repo, NO telemetry. Do not touch `backlog/`, `wiki/`, `docs/BACKLOG.md`.

## Out of Scope (Don't Drift) — successors

1. Public distribution: `npm publish`, Homebrew tap (`homebrew-echo`), winget/scoop manifests — Ring-2+ (when there's a public).
2. The thin acceptance/distribution repo (consumes the published tarball clean-room) — only when handed to the tester.
3. Deciding whether to strip roles/workflows/review-queue assets from the context-layer tarball — flagged founder decision (see below).
4. Telemetry/crash reporting, Windows Scheduled-Task autostart, Codex-skill upstream — Ring-2+.

## After Completion (Strategist Notes)

- This completes the Ring-1 path: 090 (harness) → 091 (compat fixes) → 092 (release). Tag `v0.1.0-beta.1`,
  hand the published tarball to the Windows tester, and gate Ring-2 on their `echoctl selftest --json` +
  `echoctl doctor --json` coming back green on real hardware.
- **Write the wiki page now** (all three shipped): one `surfaces/` or `architecture/` page documenting
  cross-platform onboarding + the release/channel model (BOM-tolerant IO, separator normalization, spawn
  resolver, OS data dirs, patcher retirement, one-tarball-tested-per-OS, beta channel + rollback). Update
  `.manifest.json` + regen `wiki/index.md`.
- **Flag for founder:** decide whether the context-layer tarball should stop shipping `assets/echo-roles/**`,
  `assets/echo-workflows/**`, and the review-queue config/schemas. The packed-manifest snapshot makes the
  current set visible; the strip (if wanted) is its own small spec once it's confirmed nothing in the daemon/MCP
  runtime loads them.
