---
item_id: "2026-05-27-077-cognitive-recap-via-raycast"
round: 7
reviewer: "codex"
artifact_sha: "b55b06a1937f8fb8ce39a49b2ae427c5c4362c44"
completed_at: '2026-05-28T06:30:28Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1/AC2.6/AC6 preference contract (lines 92, 106, 223)"
    finding: "The required Cmd-R Recap fork lives in the existing echo command, but AC1/AC6 intentionally make Recap preferences command-scoped and separately persisted. Raycast does not expose a sibling command's preferences through echo.tsx, and the Session shape only stores agentKind plus recapWindow, so the fork cannot reliably reuse Recap's repoPath/customCommand/Claude token while also honoring the no-extra-Session-fields constraint. Patch the spec to define the preference source for Recap forks, or relax the storage/scope constraint so the fork has the data it needs."
  - severity: "medium"
    where: "AC3 MCP fallback instruction (line 123)"
    finding: "The prompt tells the agent to call get_atoms on the top cluster's atom_ids, but the current get_atoms tool rejects more than 50 atom_ids while find_clusters can return far more than 50 IDs for a cluster. A large active cluster would make the optional MCP fallback fail even though usable atoms are available. Patch AC3 and its snapshot assertions to require chunking into <=50 IDs per get_atoms call, or explicitly selecting a bounded newest-first subset."
---

## Review

Codex verdict: `proceed_after_patches`.

The core Recap shape is implementable, and the r7 spec has closed the daemon-down, timestamp, prompt-substitution, and preference-duplication issues from earlier rounds. The remaining blockers are narrower but should be patched before builder claim because they affect concrete code paths rather than wording preference.

### Findings

1. **Medium — Recap fork preference source is underspecified / contradictory.**
   AC2.6 requires `echo.tsx` to turn Cmd-R on a Recap session into a new Recap run. AC1 and AC6 also require Recap to have its own command-scoped preferences that do not inherit from Ask ECHO. In Raycast, `getPreferenceValues()` inside `echo.tsx` returns the `echo` command preferences, not the sibling `recap` command preferences. The current `Session` model stores `agentKind` but not the repo path, custom command template, or Claude token, and OoS #9 forbids widening the Session shape beyond `recapWindow`. Those constraints cannot all hold for custom/Claude Recap forks. The spec needs to choose one: store enough invocation context on Recap sessions, explicitly use echo-command preferences for forks and document that exception, move the shared prefs somewhere both commands can read, or drop the Cmd-R Recap fork requirement.

2. **Medium — MCP fallback needs a `get_atoms` cardinality rule.**
   AC3 instructs `get_atoms({ atom_ids: <top cluster>, prefer: "newest_first" })`, but `src/mcp/tools/get-atoms.ts` enforces `atom_ids.length <= 50`, while `find_clusters` can surface clusters above that size. The prompt already treats MCP as best-effort, but this would turn a recoverable large-cluster case into a guaranteed fallback failure. Add a prompt rule and snapshot assertion for `<=50` chunks or a bounded newest-first slice.
