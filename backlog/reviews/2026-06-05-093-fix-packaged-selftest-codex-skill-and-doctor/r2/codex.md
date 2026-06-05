---
item_id: "2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor"
round: 2
reviewer: "codex"
artifact_sha: "507b252ceb3372ccb3caac70fee0847dcdcb4f79"
completed_at: '2026-06-05T23:24:15Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC4 - packaged rehearsal is the gate"
    finding: "AC4 still permits 'or equivalent env isolation' and says 'isolated daemon state' without naming the executable command/env contract. Patch AC4 with a reproducible rehearsal command skeleton: temp HOME/Codex home/Echo home or the repo's actual env vars, daemon state/port isolation, the clean-prefix absolute bin path, and the exact env fields the run log must record; otherwise DOC-02 can still false-pass by contacting a preexisting daemon."
  - severity: "medium"
    where: "AC1 - Codex skill second-hop"
    finding: "AC1 requires unit coverage for 'missing-source behavior' but never defines the expected behavior. Patch AC1 to state whether a missing shipped `assets/echo-skills/using-echo-mcp.md` is a hard failure or a diagnostic skip, and what marker/partial-target cleanup must happen, so the test contract is not implementation-defined."
---

## Review

The r1 patches for binary identity and BLOCKED-escalation framing are present, and I do not see a reframe-gate issue. The remaining issues are spec-tightening patches needed to make the packaged rehearsal and AC1 tests falsifiable before builder handoff.
