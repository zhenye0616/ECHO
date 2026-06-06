---
id: 2026-06-05-094-ci-burn-reduction-paths-ignore
title: "Stop bookkeeping pushes from firing CI/release matrices — paths-ignore for backlog/raw/docs/wiki on ci.yml and release.yml rehearsal triggers; v* tag path stays unfiltered"
status: proposed
priority: HIGH
estimate: 0.25d
created: 2026-06-05
blocked_by: []
task_state_ref: 2026-06-05-094-ci-burn-reduction-paths-ignore
requested_reviewers: ["codex", "codex-ops"]
ready_content_sha: 232801842b6996bc6c239b39d8e97ae64bba83ea9e966724e1aed37e262dfce8
files_to_modify:
  - .github/workflows/ci.yml       # AC1 — paths-ignore on push + pull_request triggers. Trigger block ONLY; no job/step content changes.
  - .github/workflows/release.yml  # AC2 — paths-ignore on the agent/** push + pull_request REHEARSAL triggers; the v* tag trigger must remain unfiltered (AC3).
spec_refs:
  - backlog/complete/2026-06-05-092-release-workflow-and-voting-ci.md  # parent — created release.yml + the rehearsal triggers (AC2b) this item scopes; ci.yml gate semantics context.
  - raw/internal/dogfooding/mcp-interactions-journal-2026-06.md  # context — the orchestration loop's commit volume (every claim/review/journal/disposition pushes to main).
  - .github/workflows/ci.yml      # current triggers: push branches [main] + pull_request + workflow_dispatch, no path filtering; 12-job matrix (2 jobs × 3 OS × 2 node), 4 jobs on macOS (10× billing).
  - .github/workflows/release.yml # current triggers: push branches agent/** + tags v* + pull_request + workflow_dispatch, no path filtering; build + 3-OS validate matrix.

# --- agent-managed fields (filled in during run) ---
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-06-06T00:56:52Z"
branch: "agent/ci-burn-reduction-paths-ignore"
worktree: "/Users/zhenye/Desktop/Project_echo--ci-burn-reduction-paths-ignore"
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# 094 — CI burn reduction: paths-ignore for bookkeeping pushes

## Why

On 2026-06-05, GitHub Actions on this private repo died with a billing error ("spending limit") — every
job refused to start. Root cause is structural, not a one-off: **the coordination protocol pushes a commit
to `main` for nearly every state transition** (claims, review requests/responses, dispositions, journals,
follow-ups). Measured on 2026-06-05: **138 pushes, 130 of them touching only `backlog/` / `raw/` / `docs/`**
— and each fired ci.yml's full 12-job matrix including four macOS jobs billed at 10× minutes. The free
2,000 min/month quota was burned almost entirely by bookkeeping. release.yml compounds it: every `agent/**`
push and every PR fires a build + 3-OS validate matrix.

Founder decision (2026-06-05, after rejecting "make the repo public" on privacy/strategy grounds): fix
billing at the account level AND cut the structural burn with path filters. This item is the path-filter
half.

## Locked decisions

1. **paths-ignore, not an allowlist.** Both workflows get `paths-ignore` with the same four bookkeeping
   roots: `backlog/**`, `raw/**`, `docs/**`, `wiki/**`. Ignore-list semantics are the safe direction: a push
   runs CI unless **every** changed file matches the ignore list, so mixed pushes (code + bookkeeping) still
   fire. An allowlist (`paths:`) would silently skip CI when someone adds a new code directory.
   **Known operational limit** *(r2 codex-ops F2)*: GitHub evaluates push path filters against a bounded
   changed-file diff (documented limit: 300 files; pushes with >1,000 commits or an unavailable diff always
   run). In the pathological case — a single push where the first 300 evaluated files are all ignored paths
   and a code file sits beyond the bound — CI could silently skip. Accepted as a documented residual risk,
   not mechanism: this repo's push profile is many small single-purpose commits (bookkeeping commits are
   1-2 files; code lands via reviewed merges), so the >300-mixed-file push shape does not occur in normal
   operation. Operators bundling a code change into a mass bookkeeping push (>300 files) must trigger
   `workflow_dispatch` manually — noted in After Completion.
2. **`skills/`, `.claude/`, `tools/`, `tests/` are NOT ignored.** CI's verify surface includes
   skill-adapter sync and coupled-invariant checks; protocol-file changes must keep firing CI.
3. **Trigger blocks only — with ONE sanctioned exception** *(r1 codex F1)*. No job, step, matrix, or
   permission changes in either workflow, EXCEPT: if AC3's semantics verification shows a single filtered
   `on.push` block can suppress tag-triggered runs, the builder MAY add the minimal job-level `if:` guard
   (or equivalent minimal restructure) needed to keep the `v*` tag path unconditionally live. That exception
   is part of AC3's contract, not drift; anything beyond it stays forbidden. The item must remain
   diff-reviewable in seconds.
4. **The `v*` tag path must remain unfiltered** — a release tag must ALWAYS trigger release.yml regardless
   of what files the tagged commit touched (a tag often points at a bookkeeping-adjacent commit). See AC3.

## Acceptance criteria

- **AC1 — ci.yml bookkeeping filter.** `on.push` (branches [main]) and `on.pull_request` both gain
  `paths-ignore: ['backlog/**', 'raw/**', 'docs/**', 'wiki/**']`. `workflow_dispatch` unchanged. A push
  touching only ignored paths fires zero ci.yml jobs; a push touching any non-ignored file fires the full
  matrix exactly as today.
- **AC2 — release.yml rehearsal filter.** The `agent/**` push trigger and `pull_request` trigger gain the
  same `paths-ignore` list, so builder-branch bookkeeping commits stop firing build + 3-OS validate.
  `workflow_dispatch` unchanged.
- **AC2b — required-checks decision recorded** *(r1 codex F2 + codex-ops F1 convergent; cut to
  spec-time-recorded form per r2 reframe gate — see r2/combined.md)*. Workflow-level `paths-ignore` on
  `pull_request` makes a path-skipped workflow report NO status — if a branch-protection required check
  expected it, the PR would hang pending forever. **Decision, recorded at spec time (2026-06-05):** PR-level
  `paths-ignore` is safe in this repo because no required checks exist and none CAN exist on the current
  plan — both `gh api repos/zhenye0616/ECHO/branches/main/protection` and `.../rulesets` return a
  plan-shaped 403 whose body reads "Upgrade to GitHub Pro or make this repository public to enable this
  feature" (NOT an auth/scope failure; captured 2026-06-05, strategist session). No builder-side
  verification is required — this is a spec-level fact, not a build-time gate. The forward obligation on
  the future aggregate-gate item lives in After Completion (strategist notes), not as a builder AC.
- **AC3 — tag path provably unfiltered.** `v*` tag pushes trigger release.yml unconditionally. The builder
  MUST verify GitHub's actual semantics for `paths-ignore` interaction with tag refs in a single `on.push`
  block (the documented behavior is ambiguous): if `paths-ignore` can suppress a tag-triggered run, the
  triggers must be restructured so the tag path is structurally exempt (e.g., move branch-rehearsal
  filtering into the job-level `if`, or split rehearsal into its own trigger arrangement) — whichever
  mechanism, the AC is: **a `v*` tag on a bookkeeping-only commit still runs build → validate → publish.**
  Cite the verification source (GitHub docs or a dry-run on a throwaway tag) in the run log.
- **AC4 — static verification.** Both workflow files pass a YAML parse / `actionlint` (if available) static
  check; `npm test`, `npm run lint`, `npm run typecheck` green (no product code touched — this is a
  regression guard). Note: a live CI run cannot be a builder gate while account billing is still failing;
  AC3's semantics verification is documentation-or-local, per 092 AC5's precedent.
- **AC5 — no drift (lifecycle carve-out as in 092/093).** ONLY the two trigger blocks, plus AC3's sanctioned
  tag-safety exception (Locked decision 3) if and only if its trigger-only precondition fails. NO other
  job/matrix/step changes, NO aggregate gate job, NO test-suite split, NO repo-visibility changes.
  Builder-protocol lifecycle edits (claim, pending_review move, agent_notes/head_sha, run log) are
  explicitly allowed.

## Out of Scope (Don't Drift) — successors

1. The aggregate `all-green` required-status job (092 AC3's real enforcement) — still blocked on GitHub plan.
2. Test-suite split (product vs `tests/review-queue/**`) — separate parked item.
3. Repo visibility / thin public distribution repo — founder strategy decision, explicitly rejected for now.
4. Account billing/spending-limit fix — founder action in GitHub settings, not a repo change.
5. Any scheme to move bookkeeping commits off `main` (e.g., a separate state branch) — protocol redesign,
   not a CI patch.

## After Completion (Strategist Notes)

- With billing fixed + this filter, expected burn drops ~94% (measured bookkeeping share of 2026-06-05
  pushes). If quota pressure persists, next levers are: trimming the node-version matrix on bookkeeping-
  adjacent paths, or the test-suite split.
- No wiki page for this item alone — fold one line into the 090–093 onboarding/CI/release page when it's
  written.
- **Forward obligation (strategist-owned):** when the aggregate `all-green` required-check item (092 AC3's
  successor) is specced, it MUST handle path-skipped runs (skipped-counts-as-success aggregate pattern or a
  no-op status job) — 094's filters are an explicit input to that design. Carry this line into that spec.
- **Operator note:** a code change bundled into a mass bookkeeping push (>300 changed files) can evade the
  path filter's bounded-diff evaluation — trigger `workflow_dispatch` manually in that (abnormal) case.
