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
ready_content_sha: ed54968e04cee9be4f6e4b3bb9534a8d934aeba4ce5cfe5fc733cf6e675ceadb
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
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-06-05T22:00:46Z"
branch: "agent/release-workflow-and-voting-ci"
worktree: "/Users/zhenye/Desktop/Project_echo--release-workflow-and-voting-ci"
head_sha: "0f392a3263b1109803b00190f5932b1e894aa903"
pr_url: ""
agent_notes: |
  BLOCKED: The implemented release workflow would correctly run the installed tarball's `echoctl selftest --json`, but that prerequisite currently fails from a locally packed/installed `echoctl-0.1.0-beta.1.tgz` with failedIds `WIR-06`, `SKILL-02`, and `DOC-02`. Tried: implemented and pushed `agent/release-workflow-and-voting-ci` at `0f392a3263b1109803b00190f5932b1e894aa903`; ran static workflow assertions, focused packed-manifest test, `npm ci --dry-run`, `npm run typecheck`, `npm run lint`, full `npm test`, and a local build-once/install/selftest/doctor rehearsal. Best-guess answer: 090/091 left the packaged selftest path not actually green for Codex skill installation and internal doctor reachability, so a prerequisite follow-up should fix selftest before 092 can safely make onboarding/release validation required (confidence high for WIR-06/SKILL-02 because `src/echo-home/adapter-sync.ts` does not second-hop Codex skills today; medium for DOC-02). Why I escalated rather than guessing: fixing the failing prerequisite requires `src/cli/commands/selftest.ts` and/or adapter-sync changes outside `files_to_modify`, and AC6 explicitly forbids `src/` drift.
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

- **AC1 — tag-triggered build-once.** A `v*` tag triggers `release.yml`. A SINGLE `build` job builds exactly one
  `echoctl-<version>.tgz` via `npm pack` from clean source (no `echo-fix` patcher), computes its SHA-256
  checksum, and uploads BOTH the tarball and the checksum as a workflow artifact. No downstream job re-runs
  `npm pack` — the build-once artifact is the seam every consumer receives. *(r1 codex F1.)*
- **AC2 — validate-the-exact-artifact, then gated publish.** On os:[ubuntu,macos,windows], independent
  validation jobs DOWNLOAD the uploaded artifact, verify its SHA-256 matches AC1's checksum, install that exact
  `.tgz`, and run `echoctl selftest` (+ `echoctl doctor`). A `publish` job runs ONLY after every validation job
  passes, consumes the SAME downloaded artifact (never a rebuild), publishes it to a private/prerelease GitHub
  Release tagged `v0.1.x-beta.N`, and retains the prior release for rollback. Publish-safety contracts:
  - **OS-portable checksum verifier** *(r2 codex-ops F1)*: the SHA-256 verification uses ONE cross-platform
    verifier on every matrix OS — a Node `crypto` one-liner (e.g. `node -e "compute sha256 of the .tgz, compare
    to the recorded checksum, exit nonzero on mismatch"`), run AFTER `actions/setup-node` and BEFORE install.
    Do NOT use `sha256sum -c` / `shasum` / `certutil` — they are absent or shell-divergent on the default
    Windows runner shell and would fail only at runtime. (Node is guaranteed present: validation installs and
    runs the Node CLI, so `setup-node` precedes the verifier.)
  - **Version-identity gate** *(r1 codex F2)*: before publishing, the workflow asserts `${GITHUB_REF_NAME#v}`
    equals `package.json` `version`; a mismatch fails the job (prevents tag / version / tarball-name drift).
  - **Least-privilege token** *(r1 codex-ops F2)*: the workflow declares explicit `permissions:` — validation
    jobs are `contents: read`; only the `publish` job is granted `contents: write`, so a read-only default
    `GITHUB_TOKEN` cannot silently fail publish and validation jobs cannot mutate repo state.
  - **Channel:** private/prerelease only; no npm-public/Homebrew/winget.
- **AC2b — runnable rehearsal (no production release state)** *(r1 codex-ops F3; trigger refined r2 codex F1)*.
  The rehearsal runs the SAME build-once + OS-matrix download/verify(portable checksum)/install/selftest/doctor
  steps but SKIPS the `publish` job (no tag, no GitHub Release created); `publish` is conditioned on a real `v*`
  tag only. The rehearsal is reachable WITHOUT a tag by two triggers, because each covers a different window:
  - a `pull_request` (and/or `push`-to-feature-branch) trigger so branch CI can run the rehearsal **pre-merge
    where available**;
  - `workflow_dispatch` for the **post-merge** manual dry-run — note GitHub only dispatches a workflow once it is
    present on the default branch, so `workflow_dispatch` CANNOT rehearse a brand-new `release.yml` before it
    merges. The pre-merge window is owned by the `pull_request`/`push` trigger (or, if branch CI is unavailable
    for this repo, by AC5's post-merge founder/manual carve-out) — NOT by `workflow_dispatch`.
- **AC3 — onboarding CI is a blocking gate (in-file mechanism + founder-verifiable protection)** *(r1 codex F3
  + codex-ops F1, convergent)*. Within `ci.yml`, the `onboarding`/windows-compat job(s) (green after 091) are
  made blocking by having the workflow's existing required/aggregate status job `needs:` them, so the
  already-required check transitively fails when onboarding regresses; a deliberately reintroduced compat
  regression fails that aggregate. **Branch-protection / ruleset config is NOT settable from workflow YAML** —
  if `main`'s required checks are managed by GitHub branch protection rather than an aggregate job, that toggle
  is an explicit founder/manual follow-up OUTSIDE this file list, verified with
  `gh api repos/{owner}/{repo}/branches/main/protection`. The spec ships whichever mechanism the repo already
  uses; it does not invent a new required-checks surface.
- **AC4 — packed-manifest pinned (self-contained snapshot)** *(r1 codex F4)*.
  `tests/packaging/packed-manifest.test.ts` runs `npm pack --dry-run --json`, extracts a SORTED list of
  `files[].path` with stable normalization (path-only; no sizes/integrity/version-bearing fields), and asserts
  it against an INLINE snapshot held in the test file itself (no external snapshot artifact — keeps
  `files_to_modify` unchanged). Adding/removing a shipped path fails the test until the inline snapshot is
  updated. It does not alter the `files` allowlist.
- **AC5 — tests green + builder-local rehearsal; full GH-matrix run is post-merge** *(r2 codex F1)*. `npm test`,
  `npm run lint`, `npm run typecheck` green. The BUILDER-executable rehearsal gate is LOCAL/static, because a
  brand-new workflow file cannot be GitHub-run before it lands on the default branch: `npm pack` succeeds, the
  `release.yml`/`ci.yml` YAML passes a static check (`actionlint` if available, else a YAML parse asserting the
  `build → validate(matrix) → publish` `needs:` wiring and the `publish`-gated-on-`v*`-tag condition), and the
  Node `crypto` checksum verifier + validation steps are demonstrably runnable as local commands on the
  builder's own OS. The full GitHub Actions OS-matrix rehearsal is validated **post-merge** — the
  `pull_request`/branch-CI run if the integration flow opens one, otherwise the real `v*`-tag / `workflow_dispatch`
  run — as a **founder/manual** check, NOT a pre-review builder gate. (Consistent with the original contract: a
  real Windows GH run is the truth but not a unit-test gate; the spec does not require the builder to do the
  pre-merge-impossible.)
- **AC6 — no drift (impl/product scope only; lifecycle metadata carved out)** *(r1 codex F5)*. ONLY the release
  workflow, the CI-voting flip, and the manifest pin. NO `src/` changes, NO `files`-allowlist edits, NO
  public-distribution channels (Homebrew/winget/npm-public), NO thin acceptance repo, NO telemetry. Do not touch
  `wiki/`, `docs/BACKLOG.md`, or product/spec content under `backlog/`. **Carve-out:** the REQUIRED
  builder-protocol lifecycle edits are explicitly allowed — atomically claiming the item (`ready/`→`claimed/`),
  moving it to `pending_review/`, writing `agent_notes`/`head_sha`, and the run-log under
  `raw/internal/agent-runs/`. Those are protocol metadata, not the product-content edits AC6 forbids.

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
