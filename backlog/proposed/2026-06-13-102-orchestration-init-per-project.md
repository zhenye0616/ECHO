---
id: 2026-06-13-102-orchestration-init-per-project
title: "`echo orchestration init` — per-project onboarding of the full coordination system, by decoupling the review machinery from Project_echo's hardcoded backlog layout"
status: proposed
priority: HIGH
estimate: 1-2d
created: 2026-06-13
blocked_by: []
task_state_ref: 2026-06-13-102-orchestration-init-per-project
requested_reviewers: ["codex", "codex-ops"]
---

## Why

ECHO's orchestration (review-queue) layer is machinery the founder wants available
machine-globally — invokable from any repo, the way the context layer already is.
Empirically the *pattern* ports (spec → independent reviewer → triage → loop) but the
*machinery* does not: when the founder ran it in `overton-signal-desk`, the loop
collapsed to a hand-rolled single `codex exec` call because `request.py`/`combine.py`/
`coord_invoke` are welded to Project_echo's `backlog/`/`backlog/reviews/` directory
layout. (`search_memories` for `request.py`/`review-queue`/`strategist` scoped to overton
returned 0; full context in the design doc under spec_refs.)

This item is the **foundational vertical slice** of the machine-global-orchestration
design: make `echo orchestration init <repo>` scaffold the full coordination system into
an arbitrary repo and run the **review loop** against it, by decoupling the hardcoded
paths/ref. Full builder-pipeline *operation* (claim/stage transitions via `process-backlog`)
lands with item 104; 102 delivers the scaffold + a configurable, operable review loop.
Storage stays file-based with git as the source of truth (per the locked decisions); `~/.echo`
only gains a registry entry, not lifecycle authority.

## Locked decisions (from the 2026-06-13 design)

1. **Files, git as source of truth — not a machine-scoped DB of record.** Every lifecycle
   transition names `{target repo, target ref, artifact path, spec SHA}` and is
   authoritative only once git records it. The atomic-claim mechanic is retained. `~/.echo`
   is projection/registry only — it never decides claimed/promoted/complete/converged.
2. **Coordination ref is configurable.** Project_echo uses `main`; an onboarded repo may use
   a dedicated `refs/heads/echo/coord` side ref or PR-backed writes, so onboarding never
   forces operational commits onto a protected/CI-triggering default branch. "git remote as
   shared CAS" is decoupled from "commit on main."
3. **Full coordination system per onboarded repo (target end-state).** Onboarding scaffolds the
   full pipeline (`proposed→ready→claimed→pending_review→complete` + `reviews/`) and a working
   review loop. **Scope boundary (r1 codex):** 102 delivers the scaffold + a configurable, operable
   *review loop*; full *builder-pipeline operation* (parallel agents claiming via `process-backlog`,
   with the claim/stage-transition machinery honoring `coord_ref`) depends on item 104 (skill
   genericization, which owns the claim mechanics). 102 does not claim the full builder pipeline
   runs end-to-end on an onboarded repo before 104.
4. **Project_echo's existing behavior is byte-stable.** The default config (no `.echo/project.json`,
   or one that names today's values) reproduces current behavior exactly; this item adds a
   configurable layer, it does not change Project_echo's own flows.

## Acceptance criteria

- **AC1 — Per-project config.** A `.echo/project.json` schema + validated loader with
  `coord_ref`, `reviews_root`, `reviewers`, `spec_dir`, with documented defaults. Absent
  config resolves to Project_echo-compatible defaults.
- **AC2 — `echo orchestration init <repo>`.** A CLI command that, run for a target repo:
  scaffolds the full backlog pipeline (`proposed/ ready/ claimed/ pending_review/ complete/`
  + `reviews/`), writes `.echo/project.json`, and upserts the repo into
  `~/.echo/state/projects.json`. Idempotent re-run (no duplicate/clobber; reports already-onboarded).
  **The `projects.json` upsert is atomic + concurrency-safe** (r1 codex-ops): temp-file-plus-rename
  with an interprocess lock or compare-and-retry so two concurrent `init` runs cannot clobber
  registrations or leave a truncated registry; surface an operator-visible error when the lock or
  write fails.
- **AC3 — Decouple `coord_invoke` path validation.** `src/coord/paths.ts`'s request-path
  regex is parameterized so the containment root + reviews-root come from project config,
  not the hardcoded `backlog/reviews/<slug>/r<N>/` literal. **Regex parameterization alone is
  NOT sufficient for containment** (r1 codex + codex-ops, convergent): the validator MUST
  canonicalize — resolve both the configured `reviews_root` and the request path to real paths
  (realpath) and require the resolved request path to live inside the resolved `reviews_root`.
  Reject absolute-path escapes, `..` traversal, URL-encoded traversal, and **symlink escapes**
  (a symlinked `reviews_root`, or a symlinked request ancestor pointing outside the repo).
  Project_echo's existing request paths still validate; AC8 pins the adversarial cases.
- **AC4 — `request.py` / `combine.py` reviews-root.** Both accept a `--reviews-root` and read
  `.echo/project.json`, defaulting to `backlog/reviews/` so existing Project_echo flows are
  byte-stable. They no longer assume the `proposed/ready/...` stage dirs exist for artifact
  discovery when run against a review-only invocation.
- **AC5 — Configurable coordination ref (review surface).** Review-round commits target the
  configured `coord_ref` (default = today's behavior for Project_echo). **The review helpers that
  operationally hardcode `origin/main` must be patched, not just the config** (r1 codex + codex-ops,
  convergent): the `origin/main` fetch + duplicate-response check in
  `tools/review-queue/_run_reviewer.sh` and the push/rebase target in
  `tools/review-queue/push-with-retry.sh` resolve from `coord_ref`. **No-silent-misconfiguration
  guardrail:** if `coord_ref` is non-default but a helper would still target the default branch,
  fail loudly — never silently write to the default branch. **Read side (r2 codex-ops):** the
  reviewer tick must FETCH and SELECT/READ rounds from `coord_ref` — request selection and artifact
  reads, not only the response write — so a tick starting from a default-branch checkout still finds
  a request that exists only on the side ref (otherwise the unattended loop is non-runnable on a
  side-ref repo). NOTE: the claim/stage-transition (`ready→claimed→…`) coord_ref plumbing rides with
  the `process-backlog` claim mechanics and is therefore part of **item 104**, not 102 (see Scope
  boundary, Locked #3).
- **AC6 — Reviewer-bindings artifact paths overridable per project.** `reviewer-bindings.json`
  artifact paths are templatized / made `reviews_root`-relative so an onboarded repo's responses
  land in the right tree, and the binding-resolution consumer (`tools/review-queue/_run_reviewer.sh`)
  honors that. **Deferred to item 104 (r2 codex):** the agent-command-dir override — running a
  reviewer tick against external `~/.echo` command copies *without* in-repo `.claude/commands` —
  needs a `.echo/project.json` command-dir carrier + `init` writing it, which is skill/command
  genericization (104's domain). 102 assumes the reviewer command files are reachable (synced or
  in-repo); it does not add the command-dir override.
- **AC7 — Regression.** Project_echo's own review-queue + backlog suites stay green; the
  default config reproduces current behavior (prove with the existing tests + a default-config
  conformance test).
- **AC8 — Tests.** Init (scaffold + register + idempotent + **concurrent-upsert atomicity**),
  config loader + defaults, decoupled `paths.ts` (containment + project-config resolution +
  **adversarial cases: `..`, absolute, URL-encoded, symlinked `reviews_root`, symlinked request
  ancestor**), request/combine reviews-root, the configurable-coord_ref **unattended side-ref test** — a
  request existing ONLY on `coord_ref` is selected, read, reviewed, and written back to `coord_ref`
  with the default branch untouched (r2 codex-ops: read+select side, not only write) — plus the
  **no-silent-misconfiguration fail-loud** case. (The AC6 external-command-copy fixture moves to
  item 104 with the command-dir override.)

**Split seam (if spec-review finds this too large):** cut along {AC1+AC3+AC4+AC5+AC6 — the
path/ref decoupling} | {AC2 — the init command + registration}. The decoupling is the
enabling half; init is the thin scaffolding UX on top.

## Out of Scope (Don't Drift)

- **The `~/.echo` projection/index/lease control plane** beyond the minimal `projects.json`
  registry write — cross-repo status view, leases, `echo orchestration status` are **item 103**.
- **Skill genericization** (`process-backlog`/`review-queue-*`/`merge-and-cleanup` embedding
  Project_echo paths + the `~/Desktop/Project_echo--<slug>` worktree convention; plus the
  **agent-command-dir override** + `.echo/project.json` command-dir carrier so a reviewer tick runs
  against external `~/.echo` command copies without in-repo `.claude/commands` — r2 codex) — **item 104**.
  Because the claim mechanics live in these skills, **full builder-pipeline operation on an
  onboarded repo depends on 104**; 102 scaffolds the pipeline structure + the review loop only.
- **Onboarding overton** — **item 105** (operational proof + friction capture).
- **Cross-machine coordination, Windows/launchd portability, DB-of-record mode for
  non-git/secret-heavy reviews, customer productization** — all explicitly deferred in the
  design doc's Out of Scope.
- **Do not change Project_echo's default behavior** (AC4/AC7 are the guardrail).

## files_to_modify

- src/coord/paths.ts                          # AC3 — parameterize the request-path regex: containment root + reviews-root from project config; preserve path-containment security; Project_echo default unchanged.
- tools/review-queue/request.py               # AC4 — `--reviews-root` + read `.echo/project.json`; default `backlog/reviews/`; don't require stage dirs for review-only invocation.
- tools/review-queue/combine.py               # AC4 — same reviews-root parameterization for the round scan.
- tools/review-queue/_run_reviewer.sh         # AC5/AC6 — origin/main fetch + duplicate-response check resolve from coord_ref; honor per-project command-dir override; no-silent-misconfig fail-loud.
- tools/review-queue/push-with-retry.sh       # AC5 — push/rebase target resolves from coord_ref instead of hardcoded origin/main.
- tools/review-queue/reviewer-bindings.json   # AC6 — templatize artifact paths + agent-command dir; allow per-project override.
- src/cli/commands/                           # AC2 — new `orchestration init` command (confirm exact file path/registration during build, matching existing command structure).
- src/echo-home/paths.ts                       # AC1/AC2 — `.echo/project.json` schema + loader + defaults; `~/.echo/state/projects.json` registry shape + upsert.
- tests/coord/                                 # AC3/AC8 — paths.ts containment + project-config resolution + adversarial traversal.
- tests/cli/                                   # AC2/AC8 — init scaffold + register + idempotency.
- tests/review-queue/                          # AC4/AC8 — request/combine reviews-root; configurable coord ref.
- tests/echo-home/                             # AC1/AC8 — config loader + projects.json upsert.

## spec_refs

- raw/internal/decisions/2026-06-13-machine-global-orchestration-onboarding.md   # READ FIRST — the full design, all four locked decisions, the codex consult, and the decomposition this item heads.
- raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md          # the already-approved "global, not project-local" install posture + repo_path scoping rule this realizes.
- backlog/complete/2026-05-11-039-cross-tool-review-dispatch-queue.md            # the prior decision that the review queue is file-backed, ECHO context NOT the queue state (honored here).
- src/coord/paths.ts                                                             # the hardcoded request-path regex being decoupled (the load-bearing change).
- tools/review-queue/request.py                                                  # the reviews-root coupling point.
- tools/review-queue/combine.py                                                  # the reviews-root coupling point.
- tools/review-queue/reviewer-bindings.json                                      # the artifact-path + command-dir coupling point.
- src/echo-home/paths.ts                                                         # the `~/.echo` layout the registry/config plug into.
- backlog/README.md                                                             # the full pipeline contract being scaffolded into onboarded repos.
- backlog/complete/2026-06-02-084-install-profile-split.md                       # profile/skill-sync context (dogfood profile already syncs the coord skills/roles).

## After Completion (Strategist Notes)

On merge, do NOT write wiki yet (lands only when 102+ ship and the onboarding flow is real).
When the decomposition (102–105) completes, create `wiki/surfaces/orchestration-onboarding.md`
documenting `echo orchestration init` + the per-project layout, and update `wiki/architecture/`
to record the per-project-git-truth + `~/.echo`-projection split. Update `.manifest.json` +
regenerate `wiki/index.md` then.
