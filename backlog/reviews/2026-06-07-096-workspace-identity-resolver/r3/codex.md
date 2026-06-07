---
item_id: "2026-06-07-096-workspace-identity-resolver"
round: 3
reviewer: "codex"
artifact_sha: "33d647bce765638f94f42497b108f89b48112410"
completed_at: '2026-06-07T19:22:51Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "files_to_modify / AC1-AC2"
    finding: "The spec tells `probeGitState` to use `resolveCanonicalRoot` for the git-toplevel branch, but `resolveCanonicalRoot` degrades to anchor/reported-directory paths on git failure. Patch the spec to require a git-only primitive that returns null on git failure, so `probeGitState.repo_root` never receives the resolver's non-git fallback and AC2's existing git_state semantics stay unchanged."
  - severity: "medium"
    where: "AC3"
    finding: "The git watcher requirement says `metadata.canonical_root` equals the git toplevel, but does not explicitly require the same realpath/case canonicalization used by `resolveCanonicalRoot`. Patch AC3 to require the watcher to pass the git toplevel through the shared canonicalization path before stamping metadata, otherwise symlinked or case-variant repo paths can produce split `local:workspace:<root>` keys."
  - severity: "medium"
    where: "AC5-AC6"
    finding: "`git_alias` is specified as being attached either on the workspace artifact or ambient metadata, which leaves adapters and tests with two possible output shapes. Patch the spec to choose the exact field/container for `git_alias` and require all three repo-bearing adapters plus tests to use that same non-join location."
  - severity: "medium"
    where: "AC8"
    finding: "The test plan covers resolver behavior and normalized join behavior, but does not require direct assertions that claude_code, codex, and git watcher captures stamp `metadata.canonical_root`. Patch AC8 to add concrete extractor/watcher test paths or explicit assertions in existing capture tests for AC2, AC3, and AC4."
---
