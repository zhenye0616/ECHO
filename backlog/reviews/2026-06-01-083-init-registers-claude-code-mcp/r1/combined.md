---
item_id: 2026-06-01-083-init-registers-claude-code-mcp
round: 1
combined_at: '2026-06-02T07:03:48Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | both (convergent on `backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md:81`) | backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md:81 | accepted — patched | Real `claude` CLI exits 1 on duplicate AND keeps the stale URL (both reviewers verified under fake HOME). Locked-decision #4 + AC3(b) rewritten: the duplicate path must `claude mcp get echo` → if URL matches resolved `mcpServerUrl` treat idempotent, else remove+re-add; NOT swallow exit-1 as success. Stale-URL fake-CLI test now required. |

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md:82 and tools/foreign-install-smoke.sh:7 | accepted — patched | AC4 rewritten: smoke must be a mechanical hard-fail (non-zero exit + diagnostic when the recorded fake-`claude` argv is absent/differs), not the current observational `set -uo pipefail`/`head` log-only check. |
| 2 | LOW | codex | backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md:93 and src/cli/commands/init.ts:488 | accepted — patched | OoS#5 corrected: `runInit` probes BEFORE `ensureDaemonRunning` (init.ts ~488/497); item does not reorder — false code claim removed, behavior stated explicitly; non-blocker because the documented flow runs `daemon install` first. |
| 3 | MEDIUM | codex-ops | backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md:79 | accepted — patched | AC3(c) adds the unattended-runtime contract: bounded timeout (30s probe precedent), stdin ignored (non-interactive), bounded stdout/stderr captured; a never-exits fake-`claude` test required so a blocked CLI can't hang `init --answer-file`/foreign smoke. |
| 4 | LOW | codex-ops | backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md:80 | accepted — patched | AC2 + J3 resolved: the `claude mcp remove echo -s local` escape-hatch line now lives in the doctor `mcp-not-configured` copy (not docs-only), since the old local-default remediation can leave a shadow the user-scope add can't beat. Active shadow *detection* stays deferred (OoS#8). |

## Convergence call

**needs R2** — all 5 r1 findings accepted + patched into the spec (no removals; all targeted original ACs, both reviewers `proceed_after_patches`, no boundary cross). R2 verifies the patched spec. focus_hints: (1) AC3(b)/Locked#4 — duplicate path does get→compare→remove+re-add on stale URL, not swallow exit-1; stale-URL fake-CLI test present. (2) AC3(c) — registration spawn is bounded (timeout + stdin-ignored + bounded capture); never-exits fake-CLI test present. (3) AC4 — smoke is a mechanical non-zero hard-fail on missing/wrong argv. (4) AC2 — doctor `mcp-not-configured` copy includes the `-s local` escape hatch. (5) OoS#5 — wording now matches real `runInit` probe-before-daemon order. Confirm no scope crept beyond `files_to_modify` (AC7).

