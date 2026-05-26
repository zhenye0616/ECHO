---
task_id: 2026-05-25-074-echo-cli-binary
role: builder
binding: codex
claim_branch: agent/echo-cli-binary-restart
last_updated: 2026-05-26T08:11:36Z
handoff_outcome: complete
handoff_branch: agent/echo-cli-binary-restart
handoff_head_sha: c3797e77e0d238073651eb9d498ba1f9fb8774a3
handoff_run_log: raw/internal/agent-runs/2026-05-26-2026-05-25-074-echo-cli-binary.md
---

## current_thesis
Claim re-opened for 074 on a fresh branch (`agent/echo-cli-binary-restart`) because the prior `origin/agent/echo-cli-binary` branch was an orphan at the old claim SHA with no implementation work. AC1.5's required `tests/cli/shell-reachable.test.ts` path is now listed in `files_to_modify`, so proceed with the full `echoctl` CLI implementation against the corrected spec.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at c3797e77e0d238073651eb9d498ba1f9fb8774a3.
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
- None.
<!-- builder-state-handoff-open-questions:end -->

## dont_touch
- No daemon-side changes; duplicate `daemon.pid` locally in doctor instead of exporting a daemon constant.
- No `doctor --fix`, workflow library content, new dependencies, `init --resume`, global PATH/install logic, upgrade/migration path, telemetry, verbose/log-level surface, multi-host daemon support, or non-TTY answer-file path.
- Do not edit `wiki/`, `CLAUDE.md`, `docs/BACKLOG.md`, `docs/STATUS.md`, or item body text.

## canonical_anchors

- spec: backlog/pending_review/2026-05-25-074-echo-cli-binary.md
