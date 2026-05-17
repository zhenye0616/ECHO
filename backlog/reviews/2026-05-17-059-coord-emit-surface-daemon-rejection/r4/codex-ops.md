---
item_id: "2026-05-17-059-coord-emit-surface-daemon-rejection"
round: 4
reviewer: "codex-ops"
artifact_sha: "15f7463ab91f04a769d32d5c6d30094d631695e8"
completed_at: '2026-05-17T08:23:17Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md:75"
    finding: "AC1 and AC3 still leave the curl_rc=0 + HTTP 2xx + malformed or non-MCP body branch unspecified; a stale ECHO_MCP_URL pointed at a local service that returns 200 can still exit 0 with no atom and no stderr. Add an explicit unexpected-2xx response branch and a 200 non-MCP fixture so wrong-transport success responses are operator-visible."
---

# codex-ops review

Verdict: `proceed_after_patches`.

## Findings

### F1 MEDIUM — unexpected HTTP 2xx responses can still fail silently

`AC1` defines success as `curl_rc == 0`, HTTP 2xx, and a body that parses to a coord JSON-RPC result, but it never says what happens when the body is HTTP 2xx and not that shape. `AC3` covers a wrong-transport `500`, but not a stale `ECHO_MCP_URL` that reaches some other local service returning `200` with HTML or unrelated JSON.

That is the same production failure class this spec is closing: reachable endpoint, wrapper exits 0, no coord atom, and no operator-visible stderr. Patch the spec to add an explicit unexpected-2xx/malformed-response branch that emits one advisory stderr line while preserving exit 0, plus a test fixture returning HTTP 200 with a non-MCP body.
