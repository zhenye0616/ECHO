---
task_id: 2026-05-14-049-codex-skill-adapter
role: builder
writer: claude-code-builder
last_updated: 2026-05-14T21:30:00Z
---

## current_thesis

Claim of 049. Extend `tools/sync-skills.sh` to materialize `adapters/codex/skills/<name>/SKILL.md` for canonical skills that document a `## Binding-specific notes — codex` section (in-scope set: `process-backlog`, `review-pending`). Vendor-neutralize `skills/review-pending.md`. Build `tools/install-codex-adapters.sh` with `--symlink` (default) / `--copy` / `--dry-run` modes, three-factor stale-lock recovery, content-hash sentinel. Add vitest coverage for sync + install. Materialize adapters in same commit.

## locked_decisions

- AC1: in-scope materialization = skills with `## Binding-specific notes — codex` heading present in canonical body. Today: `process-backlog`, `review-pending` (post-AC2). `--check` rejects unexpected adapter directories.
- AC1: frontmatter transform uses `python3 -c "import yaml; yaml.safe_dump(...)"` for YAML-safe `description` serialization (PyYAML available system-wide; confirmed). Naive bash quoting would break on colons.
- AC2: vendor-neutralize subagent-dispatch language in `skills/review-pending.md`; append `## Binding-specific notes — Claude Code` + `## Binding-specific notes — codex` sections before `## Step C` per spec.
- AC2: codex notes prescribe `codex exec --sandbox workspace-write -C <worktree> --output-last-message <file>` per child, run_dir under TMPDIR, parse from `--output-last-message` file (NOT stdout), parse-failure preserves evidence to `raw/internal/queue-errors/<ts>-review-pending-<id>/`, concurrency cap N≤4.
- AC3: tests are vitest, spawn the bash scripts in a tmp HOME, assert behavior; deferred orchestrator-parse-evidence test per spec line 134.
- AC4: install helper uses atomic-mkdir lock at `$HOME/.codex/.echo-locks/<name>`, 3-factor stale-lock gate (age + pid-liveness via `kill -0` + process-search), `--copy` stages to `$HOME/.codex/.echo-staging/<name>-$$` then atomic `mv`, sentinel includes `synced_content_sha256=` (NOT HEAD-SHA per R8). Stale-staging cleanup uses `-mindepth 1`.
- AC5: run sync after AC1/AC2; commit materialized SKILL.md files; final `--check` exit 0.

## open_questions

- None blocking. Will surface in `agent_notes` if implementation forces a deviation.

## dont_touch

- `wiki/`, `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md`.
- Canonical `skills/<name>.md` other than `review-pending.md`.
- `~/.codex/skills/.system/`.
- Existing `.claude/commands/*.md` other than `review-pending.md` re-sync.
- The codex fan-out orchestrator implementation (AC2 documents the mechanism in prose; actual executable orchestrator is out-of-scope and deferred to 050).
- `agents/openai.yaml`, `scripts/`, `references/`, `assets/` subdirs in `adapters/codex/skills/<name>/` — `SKILL.md` only for V1.

## canonical_anchors

- spec: backlog/claimed/2026-05-14-049-codex-skill-adapter.md
- parent_spec: backlog/complete/2026-05-13-047-codex-as-builder-binding-adapter.md
- protocol_decision: raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md
- codex_skill_anatomy_reference: ~/.codex/skills/.system/skill-creator/SKILL.md
- sync_script: tools/sync-skills.sh
