---
role: builder
task_id: 2026-06-05-091-upstream-windows-compat-fixes
last_updated: 2026-06-05T21:41:28Z
lifecycle: claimed
branch: agent/upstream-windows-compat-fixes
head_sha: ""
run_log: ""
handoff_branch: agent/upstream-windows-compat-fixes
handoff_head_sha: a25d62e25abe3fa4dbacead1aa852419d7a32947
handoff_run_log: raw/internal/agent-runs/2026-06-05-2026-06-05-091-upstream-windows-compat-fixes.md
---

## current_thesis
Claimed 091 as codex builder. Implement only the Ring-1 Windows compatibility fixes in the listed files, then hand off for review on `agent/upstream-windows-compat-fixes`.

<!-- builder-state-handoff:start -->
- Lifecycle: ESCALATED — see agent_notes and raw/internal/agent-runs/2026-06-05-2026-06-05-091-upstream-windows-compat-fixes.md for blocker.
<!-- builder-state-handoff:end -->

## locked_decisions
- AC1: add one BOM-tolerant JSON helper in `src/util/json.ts` and route the answer-file, onboarding-state, and capture-sources parse sites through it.
- AC2: fix only path-bearing prefix/membership compares with component-aware normalization, Windows case-folding, and segment-boundary checks; logical `coord:` prefixes remain plain string checks.
- AC3: add `src/util/subprocess.ts` with a pure injected-deps resolver for Windows PATHEXT/.cmd/.exe lookup; preserve existing `deps.spawn` seams.
- AC4: keep macOS data-dir behavior unchanged, add Windows/Linux data-dir defaults, and gate launchd behavior to `platform === 'darwin'` so non-darwin reports manual-daemon state cleanly.
- AC5: verify normal build/release paths do not reference `echo-fix`; no source change is required for this criterion unless the verification finds a release-path reference.
- AC6: un-quarantine only the Ring-1 windows-compat assertions and keep Codex-skill plus Scheduled-Task assertions as `it.todo`; run the specified test/lint/typecheck suite.
- AC7: no drift beyond the listed compatibility fixes.

## open_questions
- None blocking at claim time.

<!-- builder-state-handoff-open-questions:start -->
- See agent_notes and run log for the escalation question.
<!-- builder-state-handoff-open-questions:end -->

## dont_touch
- Do not implement Windows Scheduled-Task autostart.
- Do not create `src/util/codex-skill.ts` or un-todo its successor assertion.
- Do not edit release workflow or CI-voting behavior for 092.
- Do not migrate existing macOS data dirs.
- Do not add telemetry, thin acceptance repo work, public distribution changes, or a new CLI command.
- Do not edit `wiki/`, `docs/BACKLOG.md`, or backlog item body content.

## canonical_anchors

- spec: backlog/pending_review/2026-06-05-091-upstream-windows-compat-fixes.md
