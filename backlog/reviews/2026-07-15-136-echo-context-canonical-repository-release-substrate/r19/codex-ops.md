---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 19
reviewer: "codex-ops"
artifact_sha: "98250a763cb24326b3ac989f7488399470d4a3ed"
completed_at: '2026-07-16T14:14:35Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC6 post-publication fresh-clone acceptance; AC4 top-level operation-kind contract"
    finding: "The mandatory private-release-asset download and AC3 release-mode acceptance run has no authorized host mode: target exposes only land, collect, and publish; publish is mutation-capable and capped at 1,800 seconds while AC3 alone requires 3,700 seconds. Add a mutation-incapable post-publication verification mode with exact asset-ID capabilities, fresh-clone and HOME ownership, an aggregate covering transfer plus AC3 plus teardown, terminal evidence, cleanup, and executable tests."
  - severity: "high"
    where: "AC4 land/converge polling, AC6 collect polling, and the generated deadline inventory"
    finding: "The maximum polling schedules are not time-feasible. Land/converge may reach its last tick at elapsed 5,900 with only 50 seconds before logical cutoff, while final serialized readbacks may each consume 30 seconds; collect may reach elapsed 2,900 and still require a binary download and verification allowed 300 seconds plus final readbacks. The strict 15-second cadence also conflicts with paginated cycles whose single requests may consume 30 seconds and cannot overlap. Rebudget the aggregates and poll deadlines with an explicit post-result reserve and overrun rule, then test maximum-start, slow-page, and last-tick success using charged durations."
  - severity: "high"
    where: "AC4 final 50-second host reserve and expiry/cleanup contract"
    finding: "The final reserve is five seconds short on its specified worst-case path: an active child can require 10 seconds for TERM/KILL/reap and stream settlement, the cleanup worker can require 30 seconds plus 10 seconds for escalation/reap/absence proof, and terminal framing/EOF/exit exclusively requires five seconds. Move the logical cutoff earlier, enlarge the reserve, or shorten component bounds, and test cutoff-time child expiry followed by cleanup-helper escalation."
  - severity: "medium"
    where: "AC4 hosted quality-job HOME cleanup"
    finding: "The workflow authenticates the workspace cleanup helper only before the 3,700-second verifier, then executes the mutable workspace path from if:always() after repository code has run. A failed verifier can therefore leave a replaced helper or static import to control or prevent recursive cleanup. Execute retained or separately materialized authenticated closure bytes, or reauthenticate the complete closure immediately at execution, and add a validate-then-mutate failure fixture."
  - severity: "medium"
    where: "AC6 anonymous-FD Git askpass transport"
    finding: "The token and receipt pipe contract does not fix endpoint ownership and close timing. The password helper cannot observe token EOF unless every writer closes after the pre-spawn copy, and receipt EOF can deadlock if the host retains a receipt writer or waits serially while Git still owns one. Specify the host/Git/helper FD map, inheritance and CLOEXEC rules, pre-spawn/post-write closures, and concurrent settlement ordering; prove it with a real two-prompt EOF/receipt process test."
  - severity: "medium"
    where: "AC4 coordinator fallback cleanup after partial materialization"
    finding: "Fallback cleanup streams only echo-context-remove-owned-root.mjs through node --input-type=module -, although the authenticated helper may have a static-import closure and partial materialization is explicitly covered. Relative imports then have no guaranteed authenticated import base and cleanup can fail on the path that needs it most. Require the streamed helper to be statically import-free and test that invariant, or materialize and bind its full closure and canonical cwd before every root-creating step."
---
