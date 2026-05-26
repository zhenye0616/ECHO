---
task_id: 2026-05-25-074-echo-cli-binary
role: builder
binding: codex
claim_branch: agent/echo-cli-binary
last_updated: 2026-05-26T07:24:24Z
handoff_outcome: escalated
handoff_branch: agent/echo-cli-binary
handoff_head_sha: 2933e7f74e39501f25dcdabfb58dc39619684535
handoff_run_log: raw/internal/agent-runs/2026-05-26-2026-05-25-074-echo-cli-binary.md
---

## current_thesis
Claim opened for 074. Build the `echoctl` CLI surface as a thin consumer of 070-073: `init`, `doctor`, `uninstall`, and `run`, with no daemon-side changes, no new dependencies, and tests proving the CLI packaging and command behavior.

<!-- builder-state-handoff:start -->
- Lifecycle: ESCALATED — see agent_notes and raw/internal/agent-runs/2026-05-26-2026-05-25-074-echo-cli-binary.md for blocker.
<!-- builder-state-handoff:end -->

## locked_decisions
- AC1: `src/cli/index.ts` is the shebang entrypoint; `package.json` exposes `bin.echoctl`, `files` packs `dist/**`, and `tsconfig.cli.json` emits all transitive runtime imports.
- AC2: `init` wraps 073 `createWizard()` with TTY-only UX framing, deterministic remediation copy, and one explicit source-tree retry for AC5.7-style repoRoot recovery.
- AC3: `doctor` is read-only: daemon HTTP health, state-file validation, orphaned adapter lock reporting, and per-agent re-probe.
- AC4: `uninstall` conservatively reverses 072 adapter writes, strips ECHO marker blocks, removes MCP config entries, deletes byte-equal copied skills, and purges `~/.echo` only behind `--purge-state`.
- AC5: `run` loads minimal workflow TOML, resolves project context, matches roles to onboarded agents by capability superset, supports explicit role-agent overrides, and dispatches steps sequentially.
- AC6: `src/cli/io/prompt.ts` and `src/cli/io/render.ts` are the only prompt/render primitives; no color or prompt libraries.
- AC7: Tests cover each command, inverse helpers, workflow loader/matcher/dispatcher, shell reachability, and scaffold workflows directory behavior.
- AC8: Builder documentation updates are limited to the run log and pending-review metadata; wiki and operating-model files stay untouched.

## open_questions
- None blocking at claim time; escalate if implementation requires files outside `files_to_modify`, a new dependency, or daemon-side changes.

<!-- builder-state-handoff-open-questions:start -->
- See agent_notes and run log for the escalation question.
<!-- builder-state-handoff-open-questions:end -->

## dont_touch
- No daemon-side changes; duplicate `daemon.pid` locally in doctor instead of exporting a daemon constant.
- No `doctor --fix`, workflow library content, new dependencies, `init --resume`, global PATH/install logic, upgrade/migration path, telemetry, verbose/log-level surface, multi-host daemon support, or non-TTY answer-file path.
- Do not edit `wiki/`, `CLAUDE.md`, `docs/BACKLOG.md`, `docs/STATUS.md`, or item body text.

## canonical_anchors

- spec: backlog/pending_review/2026-05-25-074-echo-cli-binary.md
