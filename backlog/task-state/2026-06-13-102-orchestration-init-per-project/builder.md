---
task_id: 2026-06-13-102-orchestration-init-per-project
role: builder
binding: codex
last_updated: 2026-06-13T10:09:45Z
branch: agent/orchestration-init-per-project
handoff_branch: agent/orchestration-init-per-project
handoff_head_sha: 8190e7babbefc6dadbc4e3dbf64fe68fbc877849
handoff_run_log: raw/internal/agent-runs/2026-06-13-2026-06-13-102-orchestration-init-per-project.md
---

## current_thesis
Claimed by codex builder. Implement item 102 as the foundational vertical slice for per-project orchestration onboarding: config/defaults, `echo orchestration init`, configurable review roots and coordination refs for the review loop, and regression tests proving Project_echo defaults remain stable.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at 8190e7babbefc6dadbc4e3dbf64fe68fbc877849.
<!-- builder-state-handoff:end -->

## locked_decisions
- AC1: add a validated `.echo/project.json` loader/defaults for `coord_ref`, `reviews_root`, `reviewers`, and `spec_dir`.
- AC2: add `echo orchestration init <repo>` scaffolding for the full backlog pipeline plus atomic/concurrency-safe `~/.echo/state/projects.json` registration.
- AC3: decouple request-path validation from hardcoded `backlog/reviews` and enforce realpath containment against traversal, absolute paths, URL-encoded traversal, and symlink escapes.
- AC4: make `request.py` and `combine.py` accept/read configurable `reviews_root` without requiring stage dirs for review-only invocation.
- AC5: make review-round read/select/write/push helpers honor `coord_ref`, including side-ref operation and fail-loud protection for non-default refs.
- AC6: make reviewer binding artifact paths reviews-root-relative/overridable; command-dir override is deferred to item 104.
- AC7: preserve Project_echo default review-queue/backlog behavior.
- AC8: add tests covering config/defaults, init/idempotency/concurrency, path adversaries, configurable reviews root, side-ref review flow, and fail-loud misconfiguration.

## open_questions
- None blocking at claim time; escalate if the existing CLI/test structure requires files outside `files_to_modify` or dependencies not named by the spec.

## dont_touch
- Do not build the broader `~/.echo` projection/index/lease control plane beyond the minimal `projects.json` registry.
- Do not genericize `process-backlog`, review-queue skills, merge-and-cleanup, worktree conventions, or external command-dir overrides; those are item 104.
- Do not onboard `overton`; that is item 105.
- Do not add cross-machine coordination, Windows/launchd portability, DB-of-record mode, secret-heavy review support, or customer productization.
- Do not change Project_echo's default behavior.
- Do not edit wiki pages or backlog item bodies.

## canonical_anchors

- spec: backlog/pending_review/2026-06-13-102-orchestration-init-per-project.md
- reviews: backlog/reviews/2026-06-13-102-orchestration-init-per-project/
