---
item_id: "2026-05-17-059-coord-emit-surface-daemon-rejection"
round: 3
reviewer: "codex"
artifact_sha: "d6be1400929e61fc145a9e3addf90d9ee7d5880c"
completed_at: '2026-05-17T08:13:40Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md:82,183"
    finding: "AC1 and Out of Scope #7 lock daemon-unreachable to zero stderr and explicitly require curl's own stderr to be suppressed, but the spec still says the header may document 'unreachable -> silent (or opt-in verbose...)' and the Tests section says 'curl's own stderr is intentionally allowed'. Those stale clauses contradict the r3 contract and could lead a builder to preserve the exact daemon-down log-flood path AC1 is closing. Delete the opt-in/allowed language or replace it with the zero-byte stderr contract before build."
---

# Codex Review — Round 3

Verdict: `proceed_after_patches`.

## Findings

1. **MEDIUM — stale stderr/verbose wording contradicts the locked unreachable contract** (`backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md:82,183`)

   The main ACs are now clear that daemon-unreachable is zero-byte stderr: AC1 requires `2>/dev/null` for curl's own stderr, AC3 pins `r.stderr.toString() === ''`, and Out of Scope #7 bans curl-native stderr passthrough or an `ECHO_COORD_EMIT_VERBOSE=1` branch. Two leftover clauses still point the other way: line 82 says the header can document `unreachable -> silent (or opt-in verbose, per AC1 disposition)`, and line 183 says `curl's own stderr is intentionally allowed`. That is enough ambiguity for the builder to keep a verbose/curl-stderr path while claiming AC coverage. Patch those two phrases to state the zero-byte unreachable contract unconditionally.
