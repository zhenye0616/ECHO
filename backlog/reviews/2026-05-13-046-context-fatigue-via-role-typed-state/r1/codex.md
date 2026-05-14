---
item_id: "2026-05-13-046-context-fatigue-via-role-typed-state"
round: 1
reviewer: "codex"
artifact_sha: "5480034c98a7a28e6a8eefa1492c16cd6097585f"
completed_at: "2026-05-14T00:32:41Z"
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC4/AC5, lines 70-86"
    finding: >-
      The read contract requires FS and MCP-capable bindings to return byte-identical content for the same task_id, role, and SHA, but get_role_state has no SHA/ref parameter and AC4 says it reads current main HEAD from disk. This cannot be implemented or tested as stated: `git show <sha>:...` can ask for an older commit while MCP can only read whatever HEAD points at. Patch either by adding an explicit `ref`/`sha` argument to get_role_state/list_task_states plus tests comparing `git show`, or by narrowing AC5 to HEAD-only equivalence.
  - severity: "medium"
    where: "AC2, lines 54-59"
    finding: >-
      The lint contract is internally inconsistent. It says every `backlog/task-state/**/*.md` file must contain the required top blocks in order, but the required test matrix says frontmatter-only files pass. A frontmatter-only file has none of `current_thesis`, `locked_decisions`, `open_questions`, `dont_touch`, or `canonical_anchors`, so the same fixture is both a missing-block failure and an allowed pass. Patch the spec to choose one behavior, or make the exception explicit with a different file class.
  - severity: "medium"
    where: "AC1/AC4, lines 44-49 and 73"
    finding: >-
      `list_task_states` must return structured `canonical_anchors: { spec, reviews? }`, but AC1 only names a `canonical_anchors` top block and never pins the on-disk syntax for the block or its subfields. The builder therefore has no falsifiable parser contract for turning pointer content into `spec` and optional `reviews`. Patch the schema doc AC to specify exact body syntax, e.g. Markdown headings versus YAML-like keys, and include a test that proves `canonical_anchors` parses into the advertised MCP shape.
  - severity: "medium"
    where: "AC4/tests, lines 70-78 and src/mcp/server.ts:23-105"
    finding: >-
      The MCP tool spec does not define how the daemon or tests locate the repo root whose `backlog/task-state` should be read. In the current server API, `startMcpServer(storage, options)` only accepts port/host and the LaunchAgent happens to set WorkingDirectory, so a role-state test either relies on process.cwd or writes fixtures into the production checkout. Patch AC4 with a concrete root resolution contract, such as an option or env var used by the tool and by tests, before requiring isolated MCP tests.
---

# Codex review

Verdict: `pushback`.

Reviewed `backlog/ready/2026-05-13-046-context-fatigue-via-role-typed-state.md` at `5480034c98a7a28e6a8eefa1492c16cd6097585f` with the implementability and code-grounded lens.

The direction is coherent, but the current ACs leave one unimplementable read-contract claim and several parser/test contracts that a builder would have to invent. Patch those before claim so the implementation can be verified without relying on process-global state or unstated body syntax.
