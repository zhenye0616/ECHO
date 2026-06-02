---
task_id: 2026-06-01-083-init-registers-claude-code-mcp
role: builder
binding: codex
claim_branch: agent/init-registers-claude-code-mcp
last_updated: 2026-06-02T07:31:36Z
---

## current_thesis
Claimed 083 as codex builder. Implement the narrow install-friction fix: `echoctl init` must register Claude Code's user-scope ECHO MCP server through the `claude` CLI, and `doctor`/install docs/tests must surface the exact remediation and local-shadow escape hatch without adding broader MCP-client machinery.

## locked_decisions
- AC1: Claude Code registration uses `claude mcp add --transport http --scope user echo <resolved mcpServerUrl>` when claude-code is selected; Codex/Cursor wiring remains unchanged.
- AC2: `doctor` and init remediation copy must print the explicit user-scope add command plus `claude mcp remove echo -s local` as the shadowing fallback, then rerun `echoctl doctor`.
- AC3: Missing `claude` is non-fatal; duplicate exit-1 is surfaced as unverified rather than swallowed; spawn is bounded, non-interactive, and captures bounded output.
- AC4: `tools/foreign-install-smoke.sh` must hard-fail when the fake `claude` shim does not record the expected argv.
- AC5: `docs/echoctl-install.md` must remove the manual-run workaround and document automation plus troubleshooting only.
- AC6: Focused init/doctor/wire tests plus full `npm test` and typecheck must pass before handoff.
- AC7: Touch only `files_to_modify`; honor every Out-of-Scope item.

## open_questions
- None blocking at claim time. Escalate if implementation requires files outside `files_to_modify`, a new dependency, direct `~/.claude.json` mutation, probe reorder, or active shadow detection.

## dont_touch
- No direct `~/.claude.json` mutator; use the CLI only.
- No project-scope `.mcp.json` support; user scope only.
- No new MCP clients or generalized adapter framework beyond the files listed in the spec.
- No daemon runtime hardening, probe-before-daemon reorder, auto-login, telemetry, postinstall magic, brew/native installer, or active shadow-scope detection/resolution.
- Do not edit `wiki/`, docs outside `docs/echoctl-install.md`, item body text, or founder-owned backlog/status docs.

## canonical_anchors
- spec: backlog/claimed/2026-06-01-083-init-registers-claude-code-mcp.md
