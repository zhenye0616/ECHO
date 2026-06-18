# 2026-06-13 — Machine-global orchestration layer + per-project onboarding

> **→ DIRECTION SHIFT (2026-06-18):** this doc's "customer productization stays deferred" lock was reopened on 2026-06-18 — the founder committed a customer-facing multi-human ecosystem (B2 federated) as the next-sprint direction (conviction bet, not demand-validated). The orchestration loop here is reframed as the **personal tier**; the ecosystem is the new tier. See `2026-06-18-office-hours-cross-human-context-ecosystem.md` and memory `project_cross_human_ecosystem_bet`.

**Status:** Brainstormed 2026-06-13 in Claude Code strategist conversation; founder made all four architecture calls live (see Locked decisions). Decomposition into backlog items begins with `backlog/proposed/2026-06-13-102-orchestration-init-per-project.md`; the remaining subsystems are listed below and get their own items as the founder picks them up.

**Why this lives in `raw/internal/decisions/` and not `backlog/`:** the design spans 4-5 independent subsystems. Per CLAUDE.md + brainstorming-skill decomposition rules, the strategic design is archived here; each subsystem is specced as its own `backlog/proposed/<id>.md`. This is the meta.

**Trigger:** Founder asked to port ECHO's orchestration (review-queue) layer to the `overton-signal-desk` repo "or even better make it global to this machine, just like how I can use the context layer." Empirical trigger: the strategist review *pattern* ported to overton (spec → independent reviewer → triage → loop) but the *machinery* did not — overton had to hand-roll a single bare `codex exec` loop because `request.py`/`combine.py`/the queue are welded to Project_echo's `backlog/` layout. Evidence: ECHO cross-repo recall, 2026-06-13 (journal entry "cross-repo recall: overton strategist-review-port failure"); `search_memories` for `request.py`/`review-queue`/`strategist` scoped to overton returned 0.

## Cross-references

- `raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md` — **this design is the dogfooding realization of that one.** That doc already locked "install posture: global, not project-local" and "project workflows resolve via `repo_path`/`--project` arg, then nearest git root." Today operationalizes it for the founder's own repos, NOT as the paid product.
- `raw/internal/decisions/2026-06-06-office-hours-orchestration-launch-question.md` — "the loop is the demo, the layer is the install; coord layer is dogfood infrastructure until external demand is validated." Making orchestration global *for the founder's own work* is squarely inside that resolution. Customer productization stays deferred.
- MEMORY `project_substrate_is_scaffolding_not_product` (2026-05-17) and `project_friction_first_prioritization` — the tension these raise is **dissolved** by the dogfood framing: this is hardening the wedge on a real revenue repo (overton/Clara), not building a coordination-platform product. No gate is tripped because the global-install direction was already approved 2025-05-25.
- `backlog/complete/2026-05-11-039-cross-tool-review-dispatch-queue.md:84,87` — 039 deliberately made the review queue **file-backed**, with ECHO context explicitly NOT the queue state. The storage decision below honors that prior call.
- Codex independent consult, 2026-06-13 (read-only, against the repo) — confirmed the storage spine and supplied the two sharpenings now folded into the Locked decisions. Raw output: `/tmp/codex-backlog-scope-out.md` (transient; key points captured below).

## TL;DR

A machine-global orchestration *capability* + a deliberate per-project onboarding step. The machinery lives once in `~/.echo`; running `echo orchestration init` inside a repo scaffolds the full ECHO coordination system into that repo, writes a per-project config, and registers the repo in a machine-scoped index. Authoritative coordination state stays **file-based, git-tracked, in the target repo** — never a machine-scoped database of record. `~/.echo` holds only a projection/index/lease control plane.

## Why an explicit `init` and not ambient like capture

The founder's analogy is the context layer, but the two layers diverge exactly here:

- **Context layer is ambient** — `echoctl init` once, machine-wide; capture *observes* every repo automatically, read-only, no per-repo setup.
- **Orchestration layer is opt-in-per-repo** — it *writes* scaffolding into the repo and needs per-repo config (which reviewers, which coordination ref, where specs live). So it is a deliberate onboarding action, not ambient.

## Locked decisions (founder, 2026-06-13)

1. **Intent: machine-global dogfooding infra**, not a customer product. Already-approved direction (2025-05-25), so no friction-first/substrate-is-scaffolding gate is reopened.
2. **Storage: files, git as source of truth — NOT a machine-scoped DB of record.** Every lifecycle transition (claimed/promoted/complete/converged) names `{target repo, target ref, artifact path, spec SHA}` and is authoritative only once git records it. The atomic-claim mechanic (single commit moves a stage dir, push = distributed compare-and-swap) is retained. `~/.echo` is a **projection / index / lease / scheduler cache only** — it never decides lifecycle state. (Codex sharpening #1: say "not a DB *of record*," and design the `~/.echo` control plane deliberately rather than as an afterthought.)
3. **Coordination ref is configurable.** (Codex sharpening #2 — the one place the original argument was too Project_echo-shaped: "git remote as shared CAS" was conflated with "push operational commits to `main`." They are separable.) Project_echo uses `main`; an arbitrary onboarded repo may use a dedicated `refs/heads/echo/coord` side ref or PR-backed writes, so onboarding never forces operational commits onto a protected/CI-triggering branch and never risks secret leakage into reviewed history.
4. **Scope per onboarded repo: the FULL coordination system** — `proposed→ready→claimed→pending_review→complete` + atomic-claim mechanics + `process-backlog` skills + the review loop. (Founder expects to run parallel builder agents in onboarded repos, e.g. overton.)

## Architecture

```
~/.echo/                         # installed once; the machine-global control plane
├── skills/                      # process-backlog, review-queue-*, merge-and-cleanup (already synced, dogfood profile)
├── roles/                       # strategist / reviewer / builder (already synced, dogfood profile)
├── reviewer-bindings.json       # machine-default reviewer argv (per-repo override allowed)
└── state/
    ├── onboarding.json          # existing
    └── projects.json            # REGISTRY + PROJECTION: onboarded repos → {coord_ref, reviews_root, reviewers, last-seen rounds, leases}

<target repo>/                   # source of truth, per onboarded project
├── backlog/                     # full pipeline scaffolded by `echo orchestration init`
│   ├── proposed/ ready/ claimed/ pending_review/ complete/
│   └── reviews/<slug>/r<N>/     # request.md → <reviewer>.md → combined.md
└── .echo/project.json           # per-project config: coord_ref, reviews_root, reviewers, spec dir
```

`echo orchestration init <repo>` (or `echoctl orchestration init`): scaffolds the `backlog/` tree, writes `.echo/project.json`, and upserts the repo into `~/.echo/state/projects.json`. The existing review-queue machinery then runs against the target repo's HEAD on the configured coord ref; round-state lands in the target repo.

## Decomposition (ordered backlog items)

- **102 — `echo orchestration init` + path/ref decoupling (the foundational vertical slice).** First and load-bearing. Genericize the hardcoded `backlog/`/`backlog/reviews/` paths and `coord_invoke`'s request-path regex into per-project config; add the configurable coordination ref; scaffold the full pipeline; register in `projects.json`. Proof: onboard a fresh repo and run one review round end-to-end. May split at spec-review along the seam {path/ref decoupling} | {init command + registration} if too large. → `backlog/proposed/2026-06-13-102-orchestration-init-per-project.md`.
- **103 — `~/.echo` projection/index/lease control plane.** Cross-repo "what's in flight" index, local invocation leases, `echo orchestration status` across all onboarded repos. The deliberate control plane codex called for.
- **104 — Skill genericization.** `process-backlog`, `review-queue-*`, `merge-and-cleanup` embed Project_echo paths and the `~/Desktop/Project_echo--<slug>` worktree convention; make them repo-relative / config-driven so onboarded repos' agents use them unmodified. Also owns the **agent-command-dir override** (a `.echo/project.json` command-dir carrier + `init` writing it) so a reviewer tick can run against external `~/.echo` command copies without in-repo `.claude/commands` — deferred here from 102 AC6 per the r2 codex finding.
- **105 — Onboard overton (proof + friction capture).** First real onboarding; dogfood it and journal the friction. Largely operational.

## Out of scope (explicitly deferred)

- **Cross-machine / multi-box coordination.** A machine-local `~/.echo` index is NOT the multi-machine source of truth; git (the remote) is. Multi-machine is the message-bus endgame (axiom #7), not this work.
- **macOS→Windows portability of the launchd reviewer ticks, hardcoded `$HOME/Desktop/Project_echo` paths, BSD-vs-GNU shell assumptions** (the orchestration portability audit, 2026-06-11). These only matter for a *second machine* or a customer; the dogfood-on-this-machine goal does not need them. Onboarded repos here run on the founder's macOS box.
- **DB-of-record mode for non-git / no-remote / secret-heavy local-scratch reviews.** Legitimate but a separate explicit mode, outside git-backed project truth. Not now.
- **Customer productization / the paid coord tier.** Still gated on external demand per 2026-06-06.

## After completion (strategist notes)

When 102+ land in `complete/`, promote to `wiki/surfaces/` (a new `orchestration-onboarding` page documenting `echo orchestration init` and the per-project layout) and update `wiki/architecture/` to record the per-project-git-truth + `~/.echo`-projection split. Not before shipment.
