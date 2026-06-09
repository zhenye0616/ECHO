---
task_id: 2026-06-08-099-code-owned-sidecar-writer
role: builder
binding: codex
claim_branch: agent/code-owned-sidecar-writer
last_updated: 2026-06-09T07:01:23Z
---

## current_thesis
Claimed 099 as codex builder after the builder-found test gap was folded into `files_to_modify`. Implement the code-owned review sidecar writer so `producer` is stamped by `emit-sidecar.py`, sidecars are validated before atomic publication, the existing validator imports a shared helper, pending-review sidecars are independently gated, and `/review-pending` no longer hand-transcribes sidecar frontmatter.

## locked_decisions
- AC1: add `tools/review-queue/emit-sidecar.py`; it reads a JSON descriptor, derives the target from `item_id`, stamps `producer` and `reviewed_at`, rejects conflicting/generated or unknown keys, assembles required headings, validates before finalizing, and writes nothing on failure.
- AC2: canonical sidecar writes use same-directory temp plus atomic no-clobber `os.link` by default; `--replace` is the only overwrite path and uses `os.replace`.
- AC3: add import-safe `_sidecar_validate.py`; both `validate-sidecar.py` and `emit-sidecar.py` import it while preserving the existing validator CLI contract.
- AC4: tighten `schemas/review-sidecar.schema.json` so `producer` accepts only `review-pending-orchestrator`; do not migrate historical `complete/` sidecars.
- AC5: extend `check-coupled-invariants.sh` to validate committed live `backlog/pending_review/*.review.md` sidecars only, passing cleanly when none exist.
- AC6: update `skills/review-pending.md` to invoke `emit-sidecar.py` via explicit repo-root resolution, remove the literal `producer:` transcription site, and resync `.claude/commands/review-pending.md`.
- AC7: add `tools/review-queue/test-emit-sidecar.sh` with disposable temp-git-repo isolation for writer and gate cases; existing validate-sidecar tests still pass.

## open_questions
- None blocking at claim. Escalate if implementation needs files outside `files_to_modify`, a new dependency, a new test framework, historical sidecar migration, or a decision on `/review-pending` rerun overwrite policy.
- Non-blocking continuity note: this pointer existed from a prior escalated attempt; the current claim supersedes that handoff state and proceeds from the amended spec body plus mandatory refs.

## dont_touch
- Do not implement the generalized Codex/all-adapter freshness gate or wire HOME-relative Codex skill cache checks into merge invariants.
- Do not implement `echo_skill()` render-at-use-time.
- Do not enforce watcher marker writes.
- Do not add or change sidecar fields/headings consumed by merge-and-cleanup.
- Do not migrate or revalidate historical sidecars under `backlog/complete/`; the gate scans only live `pending_review/`.
- Do not decide `/review-pending` rerun/overwrite policy; the writer remains fail-closed with explicit `--replace`.
- Do not edit `wiki/**`, founder-owned docs/status/backlog files, backlog item bodies, dependencies, or files outside the spec's `files_to_modify`.

## canonical_anchors

- spec: backlog/claimed/2026-06-08-099-code-owned-sidecar-writer.md
- reviews: backlog/reviews/2026-06-08-099-code-owned-sidecar-writer/
