---
task_id: 2026-05-14-049-codex-skill-adapter
role: builder
writer: claude-code-builder
last_updated: 2026-05-14T21:50:00Z
---

## current_thesis

049 complete, ready for review. Implemented all five ACs in a single Claude Code session. `tools/sync-skills.sh` extended with third adapter target; `skills/review-pending.md` vendor-neutralized + Claude Code/codex binding-specific notes added; `tools/install-codex-adapters.sh` written with three-factor stale-lock gate + content-hash sentinel + staging outside the codex skill discovery root; 27 vitest cases covering both scripts; `adapters/codex/skills/{process-backlog,review-pending}/SKILL.md` materialized + committed. `npm run typecheck`, `npm run lint`, `npm test` (910 passed / 21 pre-existing skipped), and `tools/sync-skills.sh --check` all clean. Branch `agent/codex-skill-adapter` pushed at `da57348`. AC3's parse-failure-evidence-preservation test is deferred per spec line 134 (would have required implementing the codex fan-out orchestrator that the spec's Out of Scope explicitly forbids). Live codex-CLI discovery smoke test deferred to founder per spec DoD (one-shot human verification, not CI).

## locked_decisions

- AC1: canonical-side YAML frontmatter parsed line-by-line (not via yaml.safe_load) because `skills/process-backlog.md`'s description contains an unquoted colon-space sequence that PyYAML rejects. Adapter-side frontmatter still emitted via `yaml.safe_dump` so codex's strict-YAML expectation is satisfied. No canonical files were edited; if a future spec wants strict-YAML canonicals, that's a separate decision.
- AC4 sentinel records BOTH `synced_from_commit=<sha>` AND `synced_content_sha256=<sha256>`. AC3's named `--copy install sentinel records synced_from_commit` test (R7-era) and AC4's R8 content-hash-not-HEAD-SHA patch are both honored. The stale-copy WARN in `sync-skills.sh --check` reads `synced_content_sha256`; `synced_from_commit` is informational only.
- AC4 lock loop: refuse on age ≤600s; on age >600s, gate on pid-liveness (kill -0) AND no other install process for the same skill (pgrep + argv match). Missing pid-file → age-only check with loud warning.
- AC2: codex notes mandate `--output-last-message` capture (NOT stdout regex parsing) because codex CLI v0.130.0 stdout interleaves the echoed prompt before the answer, and the prompt contains the same review-section heading names.
- Tests use python3 + yaml.safe_load to parse generated SKILL.md frontmatter (rather than adding `js-yaml`/`yaml` as a new npm dependency). PyYAML is already used by `tools/sync-skills.sh`, so this is no new dependency surface.

## open_questions

- Whether the founder's real codex CLI session discovers `/review-pending` via the symlinked install (or whether `--copy` is needed). Spec DoD: "Builder smoke test recorded in the run log: codex CLI sees the synced skills + can trigger at least one (review-pending). If symlink mode fails discovery, builder switches to `--copy` default and re-runs smoke. Either mode landing cleanly satisfies DoD." Founder runs `bash tools/install-codex-adapters.sh` from a trusted terminal, then `codex` session to confirm.

## dont_touch

- `wiki/`, `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md`.
- Canonical `skills/<name>.md` other than `review-pending.md`.
- `~/.codex/skills/.system/` (codex's built-in skills).
- `.claude/commands/*.md` other than `review-pending.md` re-sync.
- The codex fan-out orchestrator implementation (deferred to a future spec; AC2 documents the mechanism in prose only).
- `agents/openai.yaml`, `scripts/`, `references/`, `assets/` subdirs in `adapters/codex/skills/<name>/` — `SKILL.md` only for V1.

## canonical_anchors

- spec: backlog/pending_review/2026-05-14-049-codex-skill-adapter.md
- parent_spec: backlog/complete/2026-05-13-047-codex-as-builder-binding-adapter.md
- protocol_decision: raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md
- branch: agent/codex-skill-adapter@da573483f3ed7f58284e29690fafd21c830b3278
- run_log: raw/internal/agent-runs/2026-05-14-2026-05-14-049-codex-skill-adapter.md
- sync_script: tools/sync-skills.sh
- install_script: tools/install-codex-adapters.sh
