---
item_id: "2026-05-17-060-hotkey-overlay-v0-raycast-dogfood"
round: 1
reviewer: "codex"
artifact_sha: "e26d2ccb42647d019a40b2f7b4c573fdb40d5fec"
completed_at: '2026-05-17T21:13:03Z'
verdict: "proceed_after_patches"
findings:
  - severity: medium
    where: "spec lines 57, 75, 121 vs src/mcp/tools/search-memories.ts:32-39, src/mcp/tools/get-atom.ts:64-70, src/mcp/tools/get-atoms.ts:66-73"
    finding: |
      The UI and copied-bundle contract requires `<source_app>`, but the actual MCP shapes exposed to the Raycast extension do not contain `source_app` on matches or hydrated atoms. They expose `source`, `timestamp`, and `content`; `source_app` appears only inside `search_memories.query_echo`, which reflects the caller's input filter and will be null for the unscoped typed-search path. A builder following the spec literally will either access a nonexistent field or invent a private mapping. Patch the spec to define the exact derivation from `source` (preferably reusing the prefixes in `src/mcp/util/source-app.ts`: `fs:$HOME/Library/Application Support/Cursor/`, `fs:$HOME/.claude/projects/`, `fs:$HOME/.codex/sessions/`, `git:`) or change the bundle/header contract to use `source`.
  - severity: medium
    where: "spec lines 69, 120, 177 vs tools/serve-trace.ts:161-176"
    finding: |
      AC2 requires the Open-in-Trace action to open `http://127.0.0.1:38479/?atom=<id>`, but the current trace viewer only serves exact `req.url === '/'` or `/index.html`; a query string such as `/?atom=...` falls through to 404. R3 describes a fallback to the index, but the acceptance criterion still names the broken deep-link as the behavior. Patch AC2 to make the index fallback the actual v0 contract, or add `tools/serve-trace.ts` to `files_to_modify` and make the deep-link route real.
  - severity: medium
    where: "spec lines 140-147, 187-195"
    finding: |
      AC6/AC7 are listed as acceptance criteria and in Definition of Done while also saying they are not builder-verified and occur over several days after merge. That conflicts with the builder loop's normal claim/review/complete semantics: the builder can satisfy AC1-AC5, but cannot prove the >=10 invocations across >=3 days or the founder's top-3 issue articulation before moving the item to review. Patch this by moving the dogfooding threshold into a clearly named post-merge/V1-gate section, or by narrowing AC6/AC7 to builder-verifiable artifacts (README text plus no wiki/V1-spec edits) and leaving the multi-day threshold out of this item's DoD.
  - severity: low
    where: "spec lines 11-18, 137, 193 vs .gitignore:36-39"
    finding: |
      AC5/DoD says `.gitignore` adds `tools/raycast-echo/{dist,node_modules}/`, but `.gitignore` is not listed in `files_to_modify`, and the existing root patterns already ignore any `node_modules/` and `dist/` directory. Patch the DoD to say the existing ignore rules cover the Raycast build outputs, or add `.gitignore` to `files_to_modify` if a more specific ignore rule is actually required.
---

# Codex review (R1)

The Raycast v0 direction is implementable and appropriately bounded to existing MCP retrieval tools. The patches above are needed before claim so the builder has a concrete atom-labeling contract, a trace-viewer action that matches the current server, and a completion gate that does not require post-merge founder behavior before the implementation item can close.
