---
item_id: "2026-05-27-077-cognitive-recap-via-raycast"
round: 11
reviewer: "codex-ops"
artifact_sha: "7f313fc374731fc3cafeb1c2467a70bf01f99f4b"
completed_at: '2026-05-28T07:08:47Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:102; backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:121; backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:211; backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:225"
    finding: >-
      The daemon-down contract is only bounded for Raycast's audit fetch, not for the spawned agent's own MCP fallback. AC3 asks the CLI agent to call find_clusters/get_atoms and to continue if that MCP response is slow after 5s, but a prompt instruction is not a runtime timeout: if the daemon accepts the MCP connection and then wedges, the subprocess can block inside the tool call and the Recap answer never reaches the promised file+git-only fallback. The README dogfood step with echoctl daemon stop catches fast connection failures, but not this half-open/wedged daemon path. Patch the spec so the MCP fallback is either removed from V1, supplied by Raycast through a real AbortController-bounded prefetch before spawning the agent, or covered by an explicit subprocess-level timeout/error path that renders an operator-visible "MCP unavailable; file + git only" result.
  - severity: "medium"
    where: "backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:106; backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:176; backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:210; backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:222"
    finding: >-
      The repoPath runtime contract stops at home-expansion and absolute-path validation, but Recap depends on that path being an existing ECHO git checkout. A stale Raycast preference like /Users/me/Desktop/Project_echo after the repo was moved still passes buildRecapPrompt's absolute-path check; then custom-agent spawn with cwd can fail with ENOENT, or codex/claude can run git/file reads in a non-repo directory and produce a bad recap instead of a clear operator error. Patch AC2/AC4a/AC5 to require recap.tsx to validate repoPath exists, is a directory, and is a git worktree before spawning (or to surface child_process spawn ENOENT and git-root failures visibly), with tests for nonexistent and non-git absolute paths.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The spec is close from an ops/runtime perspective. The remaining gaps are both unattended failure paths: a wedged MCP fallback can still hang the spawned agent despite the stated daemon-down contract, and a stale absolute `repoPath` can fail at spawn time or produce a recap from the wrong filesystem context without a clear Raycast-side error.
