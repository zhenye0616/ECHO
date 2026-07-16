---
item_id: "2026-07-15-139-echo-context-founder-mac-authority-activation"
round: 2
reviewer: "codex"
artifact_sha: "15c8e2c7004ea9b6f1c6f1d23a0cdf12e05712f5"
completed_at: '2026-07-15T23:45:54Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-15-139-echo-context-founder-mac-authority-activation.md:AC1"
    finding: "AC1 says to read item-138 target_landed_sha and project_landed_sha from canonical remotes, but the spec does not name the exact remote URLs, ref names, or file/field paths that contain those SHAs. Patch AC1 or spec_refs to identify the exact command/read path for both canonical SHAs so a builder cannot accidentally use a local sibling checkout, branch tip, or ambiguous migration note."
  - severity: "medium"
    where: "backlog/proposed/2026-07-15-139-echo-context-founder-mac-authority-activation.md:AC1 and Tests"
    finding: "The spec requires building controller/residual artifacts exactly once and forbids npm install/rebuild or alternate artifacts, while the Tests section later requires rerunning item-138 suites against final artifact hashes. Patch the execution order and allowed commands so it is clear whether dependency installation/test builds happen only inside disposable detached build clones before the immutable artifact hash is approved, and which post-approval commands are allowed to consume but not rebuild those exact bytes."
  - severity: "medium"
    where: "backlog/proposed/2026-07-15-139-echo-context-founder-mac-authority-activation.md:AC7"
    finding: "AC7 requires atomically rewiring .codex/config.toml, .claude.json, .cursor/mcp.json, installed Claude commands, Codex skills, and package callers, but it does not specify an atomicity mechanism across multiple files and formats. Patch AC7 with the required staged-write/fsync/rename/rollback sequence or controller command that snapshots all before bytes, validates all after bytes, and restores all files on any partial parse/header/auth failure before service activation."
  - severity: "medium"
    where: "backlog/proposed/2026-07-15-139-echo-context-founder-mac-authority-activation.md:AC8 and AC10"
    finding: "AC8/AC10 require live observations from six adapters and fresh Codex/Claude/Cursor use, but the artifact does not define the evidence schema or exact redaction boundary for these observations. Patch the spec to name the evidence file fields and forbidden content classes, including how to prove an adapter observation without storing message/file contents or secret-bearing client output."
---
