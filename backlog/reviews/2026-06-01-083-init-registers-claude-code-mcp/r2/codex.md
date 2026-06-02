---
item_id: "2026-06-01-083-init-registers-claude-code-mcp"
round: 2
reviewer: "codex"
artifact_sha: "de4620a122e659b40060a912e03e8cbd8822d6f6"
completed_at: '2026-06-02T07:13:00Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md:68 and backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md:81"
    finding: >-
      AC3(b)/Locked decision #4 tells the builder to verify the existing user-scope URL with `claude mcp get echo`, but the installed Claude CLI has no scope option for `get` and returns the effective entry. In a fake HOME with both a correct user-scope `echo` entry and a stale local-scope `echo` entry, `claude mcp get echo` reports `Scope: Local config` and the stale local URL. A builder following the current wording can misclassify that local shadow as a stale user entry, remove/re-add only `-s user`, and still report success while Claude continues resolving the local shadow. Patch AC3(b) to require checking the `Scope` line before URL comparison: only compare/reconcile when `get` reports User config; when it reports Local/Project config, surface the AC2 escape hatch (`claude mcp remove echo -s local`) and do not claim duplicate reconciliation made Claude point at the right daemon.
    cross_ref:
      round: 1
      reviewer: "codex-ops"
      finding_index: 3
---

# Codex Review - R2

Verdict: proceed_after_patches.

The r1 patches cover the requested stale duplicate handling, bounded non-interactive spawn, hard smoke assertion, doctor escape-hatch copy, and the corrected probe-before-daemon statement. The remaining issue is a concrete Claude CLI API mismatch in the duplicate reconciliation wording: `get` is unscoped, while the spec asks it to verify the user-scope entry.

I verified the current installed CLI in an isolated HOME. `claude mcp add --transport http --scope user echo <url>` and `claude mcp remove echo -s user` are valid, duplicate user-scope add exits 1, and `claude mcp get echo` prints a parseable URL. But with a local `echo` entry present, `get echo` reports the local entry instead of the user entry. The spec should pin the `Scope: User config` check so the builder does not turn the acknowledged local-shadow case into a false init success.
