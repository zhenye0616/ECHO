---
item_id: "2026-05-13-046-context-fatigue-via-role-typed-state"
round: 2
reviewer: "codex-ops"
artifact_sha: "aa1023ca95c9f5ae2f714e052731c22929d68e92"
completed_at: "2026-05-14T03:52:19Z"
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC4 omitted-ref get/list read contract, lines 88-95"
    finding: >-
      The ref-pinned read contract still has a HEAD race when `ref` is omitted: the spec says to read with `git show HEAD:<path>` and echo the resolved HEAD SHA, but it does not require resolving HEAD to a SHA before the blob read and then using that same SHA for every read in the call. In production, a launchd reviewer/watcher tick or human merge can advance `main` between those git operations, so MCP can return content from commit A while the response `ref` points at commit B. A consumer that pins a follow-up call to the echoed `ref` would not get byte-identical content, defeating the whole drift-recovery anchor. Patch AC4/AC5 to require `resolved_ref = git rev-parse HEAD` first when omitted, then `git show <resolved_ref>:...` for content, stage cross-references, and anchor parsing; add a test where HEAD advances between operations and the response still matches the initially resolved SHA.
    cross_ref:
      round: 1
      reviewer: "codex-ops"
      finding_index: 2
  - severity: "medium"
    where: "AC1 round-state writer freshness protocol, lines 57-63"
    finding: >-
      The freshness check is still not an operational compare-and-swap. As written, a writer reads a blob SHA, writes new content, commits, and then compares `HEAD:<path>` at commit time; if that means after the local commit, the value necessarily changed because the writer just changed it, and if it means before the local commit, it still misses a concurrent watcher/strategist commit that lands on origin between the local check and push. The unattended failure mode is a stale generated rewrite being auto-rebased or last-writer-winning over the previous boundary synthesis. Patch the protocol to fetch/compare the upstream blob immediately before commit/push, abort and append one queue error on mismatch, and regenerate from the new committed base rather than reusing stale content through rebase/autostash.
    cross_ref:
      round: 1
      reviewer: "codex-ops"
      finding_index: 3
  - severity: "medium"
    where: "AC3 reviewer hard-fail lint, lines 79-81; AC7 counter-example, lines 123-126"
    finding: >-
      The hard-fail reviewer guard is too broad for an unattended queue: it searches the whole reviewer response body/frontmatter for the pointer marker strings, while AC7 also expects reviewers to critique the invariant when it is wrong. A legitimate ops finding that names the forbidden marker as the bug target will be quarantined by `commit-reviewer-response.sh`, the next tick will regenerate the same valid critique, and the round can stall until a human reads queue-errors. Patch the lint contract so it fails actual consumption or propagation of the pointer field, but allows reviewer findings to mention the marker as critique evidence; add one negative test for a finding that quotes the marker target and one positive test for a response that claims it read pointer state.
    cross_ref:
      round: 1
      reviewer: "codex-ops"
      finding_index: 4
---

# Codex-ops review

Verdict: `pushback`.

Reviewed the R2 artifact at `aa1023ca95c9f5ae2f714e052731c22929d68e92` through the operational/runtime lens.

The R1 patches moved the spec in the right direction, but three unattended failure modes remain load-bearing: omitted-ref MCP reads can still return content and `ref` from different commits, the round-state writer protocol is not yet an atomic freshness guard, and the reviewer contamination lint can quarantine valid findings that describe the forbidden marker as the problem.
