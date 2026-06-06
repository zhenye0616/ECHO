---
role: builder
task_id: 2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor
binding: codex
claimed_at: "2026-06-05T23:36:10Z"
last_updated: 2026-06-06T00:03:59Z
branch: agent/fix-packaged-selftest-codex-skill-and-doctor
worktree: /Users/zhenye/Desktop/Project_echo--fix-packaged-selftest-codex-skill-and-doctor
handoff_branch: agent/fix-packaged-selftest-codex-skill-and-doctor
handoff_head_sha: 0ce61a001beb8e45a224c34008ea6ed7ce9d1919
handoff_run_log: raw/internal/agent-runs/2026-06-05-2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor.md
---

## current_thesis
Claimed 093 to make the packaged tarball `echoctl selftest --json` green by fixing Codex skill materialization, diagnosing/fixing DOC-02 reachability within the allowed files, and replacing the fixed capture-settle sleep with bounded poll-until-recall.

<!-- builder-state-handoff:start -->
- Lifecycle: ESCALATED — see agent_notes and raw/internal/agent-runs/2026-06-05-2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor.md for blocker.
<!-- builder-state-handoff:end -->

## locked_decisions
- AC1: implement the Codex skills second-hop in the echo-home adapter layer from shipped `assets/echo-skills/*.md`, producing `<codexHome>/skills/<name>/SKILL.md` with `name:` frontmatter and no partial writes on missing source.
- AC2: diagnose the packaged-install `doctor --json` DOC-02 failure first; fix only if the root cause stays inside the listed files, otherwise escalate as blocked rather than widening scope.
- AC3: replace `selftest.ts` fixed `sleep(4000)` with bounded polling against `search_memories`, preserving check semantics and adding timeout diagnostics.
- AC4: prove success with `npm pack`, clean-prefix install, isolated `HOME`/`USERPROFILE`/`ECHO_HOME`/`CODEX_HOME`, absolute installed `echoctl` path, no `ECHO_MCP_PORT` override, and full JSON output in the run log.
- AC5: keep `npm test`, `npm run lint`, and `npm run typecheck` green with new AC1 unit coverage.
- AC6: no release workflow, version, tag, file allowlist, suite split, asset-stripping, or unrelated lifecycle work.

## open_questions
- None blocking at claim; DOC-02 root cause is intentionally unknown and must be diagnosed during implementation.

<!-- builder-state-handoff-open-questions:start -->
- See agent_notes and run log for the escalation question.
<!-- builder-state-handoff-open-questions:end -->

## dont_touch
- Do not cut tags, run the real GitHub matrix release validation, or edit release/CI workflows.
- Do not decide tarball asset stripping, test-suite split, cross-platform init investigation, or full-suite flake handling.
- Do not weaken, skip, or re-scope selftest checks to make the tarball pass.
- Do not modify files outside the spec's `files_to_modify` list except builder-protocol lifecycle artifacts.

## canonical_anchors

- spec: backlog/pending_review/2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor.md
