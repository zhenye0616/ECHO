---
item_id: "2026-06-13-102-orchestration-init-per-project"
round: 2
reviewer: "codex"
artifact_sha: "9db479c2d777952cceff4198cb513a45908ff5b7"
completed_at: '2026-06-13T09:15:12Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 / AC2 / AC6"
    finding: "The spec requires reviewer binding artifact paths and agent-command dir to be overridable, and requires an onboarded repo to run a reviewer tick without in-repo .claude/commands, but AC1's .echo/project.json schema only names coord_ref, reviews_root, reviewers, and spec_dir, and AC2 does not say init writes the binding override needed for a fresh repo. Patch the spec to name the exact config carrier for reviewer binding overrides and command-dir override, and require echo orchestration init to either write a runnable default pointing at the external command copies or fail loudly when those copies are unavailable. The AC6 fixture should exercise the generated/declared config path, not an implicit manual override."
---
