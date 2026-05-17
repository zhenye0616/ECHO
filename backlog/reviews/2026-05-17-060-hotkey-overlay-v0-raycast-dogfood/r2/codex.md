---
item_id: "2026-05-17-060-hotkey-overlay-v0-raycast-dogfood"
round: 2
reviewer: "codex"
artifact_sha: "74cb4641853e55a54e5dd733d4c9521c8b2db11b"
completed_at: '2026-05-17T21:26:02Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-17-060-hotkey-overlay-v0-raycast-dogfood.md:11"
    finding: "The spec requires a new tools/raycast-echo/src/lib/source-app.ts helper in the body, but the frontmatter files_to_modify list omits that file. A builder following the role loop has to either add an unlisted file or place the helper somewhere other than the requested path. Add tools/raycast-echo/src/lib/source-app.ts to files_to_modify, or rewrite the body/AC to put the helper in an already-listed file."
  - severity: "medium"
    where: "backlog/ready/2026-05-17-060-hotkey-overlay-v0-raycast-dogfood.md:185"
    finding: "The documented fetch fallback for MCP-SDK bundling trouble is missing ECHO's required Accept header. Current raw MCP callers/tests use Accept: application/json, text/event-stream; tools/review-queue/coord-emit.sh also documents that StreamableHTTPServerTransport rejects requests lacking both format hints. If Raycast cannot bundle the SDK, the specified fetch fallback can fail at runtime even with Content-Type set. Patch the fallback contract to include that Accept header and parse the JSON-RPC envelope."
  - severity: "medium"
    where: "backlog/ready/2026-05-17-060-hotkey-overlay-v0-raycast-dogfood.md:136"
    finding: "The dogfooding journal contract is internally inconsistent and does not match the canonical journal schema. AC4/AC8/DoD require a 7-field template, After Completion says 6-field, while raw/internal/dogfooding/mcp-interactions-journal.md currently requires Source agent, Trigger, Query inputs, Returned, Read sources, Verdict, Note, and optional Conjecture. Because AC4 asks the README to state the template verbatim and AC8 uses those entries as the V1 trigger, patch the spec to name one exact schema, likely the canonical schema plus the new Repo field if that addition is intentional."
---

# Codex Review

Verdict: proceed_after_patches

## Findings

1. MEDIUM - `source-app.ts` is required but outside the declared write scope. The body asks the builder to define `tools/raycast-echo/src/lib/source-app.ts`, but `files_to_modify` only lists `search-context.tsx`, `mcp.ts`, and `format.ts` under `src/`. That creates a builder-loop ambiguity: either add an unlisted file or ignore the requested path. Add the file to `files_to_modify`, or move the helper into a listed file and update the body/AC accordingly.

2. MEDIUM - The fetch fallback for the MCP client is missing the required `Accept` header. The current server raw-post tests and `tools/review-queue/coord-emit.sh` use `Accept: application/json, text/event-stream`; the script comments note the transport rejects requests without both format hints. If Raycast's bundler forces the fallback path, the spec's `Content-Type`-only POST can fail at runtime. Patch R1/AC1 to require the `Accept` header and JSON-RPC envelope parsing.

3. MEDIUM - The dogfooding journal template is inconsistent. AC4/AC8/DoD say a 7-field template, After Completion says a 6-field template, and the canonical journal schema currently includes `Source agent`, `Trigger`, `Query inputs`, `Returned`, `Read sources`, `Verdict`, `Note`, plus optional `Conjecture`. Since AC4 wants README text verbatim and AC8 uses these entries as the V1 trigger, the spec should define one exact template before the builder ships the README, likely canonical schema plus the new `Repo` field if that addition is intentional.

No pushback on the Raycast v0 direction after those spec patches. The daemon endpoint, no-role-header posture for these retrieval tools, `find_clusters`/`search_memories`/`get_atom`/`get_atoms` shapes, trace-viewer root URL, and current Raycast APIs all look implementable.
