---
item_id: 2026-06-05-092-release-workflow-and-voting-ci
verdict: merge with founder fixups
reviewed_at: 2026-06-05T23:05:00Z
test_counts: { passed: 1584, failed: 3 }
producer: review-pending-orchestrator
---

## Verdict
The release workflow itself (AC1, AC2, AC2b, AC4, AC5, AC6) is cleanly and correctly implemented and merges with zero conflicts: true build-once (single `npm pack` in the `build` job; `validate`/`publish` only download the artifact), a pure Node-`crypto` checksum verifier on every OS (no `sha256sum`/`certutil`), least-privilege permissions (validate `contents: read`, publish `contents: write`), publish gated on `v*` tags only with a version-identity gate, and a packed-manifest snapshot that matches live `npm pack`. **The catch is AC3.** The "flip the gate to required" step is just removing `continue-on-error: true` from the `onboarding` job — but there is **no aggregate status job in `ci.yml` and branch protection is inaccessible (403, free-tier private repo)**, so there is no required-check surface at all. Net: the flip is a **near-no-op** — it changes the job's *displayed* status but cannot block any merge. That cuts both ways: it's **safe to merge** (it can't brick `main` despite the red CI), but **AC3 does not deliver the gate it promises.** Separately and more importantly, the builder ESCALATED (agent_notes BLOCKED) that the packaged `echoctl selftest` genuinely fails `WIR-06`/`SKILL-02`/`DOC-02` — a real product-onboarding failure that needs a `src/`-touching fix (forbidden by AC6 here). So even if a real gate existed, it would be red from a true product defect, not just the non-portable orchestration tests. Recommendation: mergeable as release-pipeline scaffolding, but treat AC3 as a documented partial and the two decisions below as the real gating questions.

## Pre-merge fixups
- [ ] **DECISION — AC3 efficacy (not a code fix; a founder call).** Removing `continue-on-error` creates no real merge-blocking gate (no aggregate job; branch protection 403 on free-tier private repo). Choose: **(a)** merge now and document AC3 as a partial — no enforcement surface exists yet; or **(b)** hold and have a follow-up add a real aggregate `all-green` job that `needs:[quality, onboarding]` so a future required-check has a target. Do NOT mark `onboarding`/`quality` "required" while they're red on `main`.
- [ ] **DECISION — packaged selftest is red (`WIR-06`/`SKILL-02`/`DOC-02`).** Builder-confirmed and escalated; the fix needs `src/cli/commands/selftest.ts` / adapter-sync edits forbidden by AC6. This is the real prerequisite before any onboarding gate is meaningful. File a `src/`-touching successor (call it 093) to make the packaged selftest green; sequence it before AC3 is ever made truly enforcing.

## Expected merge conflicts
- `package.json` — none; main's `version` unchanged since merge-base, branch is sole editor (bumps `0.1.0` → `0.1.0-beta.1` for the version-identity gate).
- `.github/workflows/ci.yml` — none; main still has `continue-on-error: true`, no competing edit (coherent against the 090-created file).
- `.github/workflows/release.yml`, `tests/packaging/packed-manifest.test.ts` — none (new files).
- `package-lock.json` — none; branch does not touch the lockfile, so the just-merged lockfile fix stands. `git merge-tree` produced zero conflict markers.

## Follow-up items (defer, do not block merge)
- **093 (real product blocker):** fix the packaged `echoctl selftest` `WIR-06`/`SKILL-02`/`DOC-02` failures (`src/`-touching; the builder escalated rather than drift past AC6). This is what actually has to be green before a release tarball validates and before any onboarding gate means anything.
- **Test-suite split (parked decision from this session):** scope the CI voting gate to product/context-layer tests; keep non-portable `tests/review-queue/**` orchestration tests out of the cross-platform gate. Also investigate the `tests/cli/init.test.ts` CI failures (init is product → possibly a real cross-platform bug).
- Post-merge: real Windows GH-matrix run of `release.yml` (the `doctor` daemon background-spawn at `release.yml:106-107` and the bare `echoctl --version` equality check at `:92` are untested on a real Windows runner).
- Strategist: the 090+091+092 wiki page, and the flagged founder decision on stripping `assets/echo-roles|workflows/**` from the tarball.
- 3 full-suite test failures (`run-codex-builder` lockfile-race timeout, `recent-calls-endpoint` timeout, `056-claude-reviewer-onboarding`) all pass in isolation — pre-existing parallelism/real-daemon flakes, not 092 regressions; bundle into the flake friction item.
