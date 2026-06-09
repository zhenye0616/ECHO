---
task_id: 2026-06-08-100-codex-adapter-freshness-check
role: builder
binding: codex
claim_branch: agent/codex-adapter-freshness-check
last_updated: 2026-06-09T19:12:31Z
handoff_branch: agent/codex-adapter-freshness-check
handoff_head_sha: a2af40487ec6f7a1dd2590001cabe1038acfc195
handoff_run_log: raw/internal/agent-runs/2026-06-09-2026-06-08-100-codex-adapter-freshness-check.md
---

## current_thesis
Claimed 100 as codex builder. Implement operator-side Codex skill-adapter freshness checking: `install-echo-codex-skills.sh --check` validates managed `~/.codex/skills` installs read-only, and `echoctl doctor` reports stale or uninspectable Codex adapters as non-fatal degraded status.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at a2af40487ec6f7a1dd2590001cabe1038acfc195.
<!-- builder-state-handoff:end -->

## locked_decisions
- AC1: add installer `--check` that discovers managed dirs from `.echo-managed`, re-renders from recorded `source` and `skill_name` into a per-run temp stage, compares actual vs expected `SKILL.md`, distinguishes drift from runtime errors, and prints cwd-safe per-skill remediation.
- AC2: absent or readable-zero managed installs exit 0 with "nothing to check"; untraversable trees or unreadable sentinels are check errors, never clean passes.
- AC3: integrate with `echoctl doctor` via absolute-path `execFile`, safe subprocess `PATH`, structured `codexAdapter` report, total exit-code mapping, opaque details, and degraded-not-broken overall behavior.
- AC4: leave `tools/review-queue/check-coupled-invariants.sh` and all merge/CI gates untouched by Codex HOME-local state.
- AC5: add focused installer and doctor tests using disposable temp HOME, non-default namespace/underscore installs, sparse PATH doctor execution, runtime error mapping, remediation accuracy, mixed families, missing-source variants, and uninspectable installs.

## open_questions
- None blocking at claim time. Escalate if implementation requires files outside `files_to_modify`, new dependencies, merge-gate wiring, auto-repair, new sentinel fields, or broader adapter/render changes.

## dont_touch
- Do not wire Codex adapter freshness into `check-coupled-invariants.sh`, CI, or any merge gate.
- Do not add auto-repair or `--fix`; only report remediation commands.
- Do not re-check Claude adapters or modify `.claude/commands/` / `~/.claude/commands/`.
- Do not implement `echo_skill()` render-at-use-time.
- Do not touch `emit-sidecar.py` or the sidecar `producer` field.
- Do not add sentinel fields or change installer render output beyond read-only checking behavior.
- Do not edit wiki, founder-owned status/backlog docs, backlog item bodies, or files outside the spec's `files_to_modify`.

## canonical_anchors

- spec: backlog/pending_review/2026-06-08-100-codex-adapter-freshness-check.md
