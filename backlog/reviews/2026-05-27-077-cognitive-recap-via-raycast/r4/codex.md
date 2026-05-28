---
item_id: "2026-05-27-077-cognitive-recap-via-raycast"
round: 4
reviewer: "codex"
artifact_sha: "fe5112c9252028e0349cfac60040d4ebe8993fe2"
completed_at: '2026-05-28T06:04:58Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:123,173-180; src/mcp/tools/find-clusters.ts:331-335; src/mcp/util/repo-path.ts:35-38"
    finding: >-
      AC3 tells the recap prompt to call `find_clusters({since: ${SINCE_ISO}, repo_path: "${REPO_ROOT}"})`, but AC5 only requires prompt construction to interpolate `${SINCE_ISO}`. The MCP `find_clusters` schema requires `repo_path` to be an absolute filesystem path, and the shared validator rejects non-absolute strings; if the builder satisfies the current tests by replacing only the since placeholder, the optional MCP fallback source will call the daemon with the literal `${REPO_ROOT}` and fail at runtime. Patch AC3/AC5 to require a `buildRecapPrompt({ sinceIso, repoPath })`-style substitution, or equivalent, and assert the rendered prompt contains the absolute repo path and no `${REPO_ROOT}` placeholder.
---

# Codex review

Verdict: `proceed_after_patches`.

The r3 blockers are addressed: the spec now points at the tracked hotkey-overlay wiki page, skips failed/cancelled recap rows for the default window, and makes daemon-down behavior non-blocking. One remaining executable-source gap needs a narrow patch before this goes to a builder: the Recap prompt's MCP fallback must receive a real absolute repo path, not an untested placeholder.
