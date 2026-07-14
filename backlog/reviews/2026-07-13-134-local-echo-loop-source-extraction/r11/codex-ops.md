---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 11
reviewer: "codex-ops"
artifact_sha: "b6095d0265b6a6fce2386cd20d98e9965a65359d"
completed_at: '2026-07-14T01:24:00Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC7 — evidence-root creation and cleanup"
    finding: "The critical evidence leaf is created beneath `/Users/zhenye/Desktop/.echo-migration-evidence/134`, but the spec does not define creation or preflight of that base and its ancestors. A missing base aborts the attended run, while a pre-existing symlink can redirect oracle, cache, and log writes before the final cleanup containment check. Require every ancestor to be verified as an expected real directory, define whether missing base components are founder-created prerequisites, create the UUID leaf non-recursively with mode 0700 and EEXIST failure, and bind all later writes and cleanup to its verified canonical path."
  - severity: "medium"
    where: "AC1, AC6, and AC7 — sanitized Git environment"
    finding: "The exact Git environment omits `GIT_ATTR_NOSYSTEM=1`, and the argv/environment tests forbid unlisted variables. Git can therefore read installation-wide gitattributes during clone checkout and alter working-tree bytes despite system Git configuration being disabled. Add `GIT_ATTR_NOSYSTEM=1` to every source, target, clone, fixture, and audit Git invocation and cover a hostile system-attributes fixture."
  - severity: "medium"
    where: "AC3 — CLI total exit and diagnostic contract"
    finding: "The requirement that every failure emit one diagnostic conflicts with `terminating signal -> 128+signal`: SIGKILL cannot be trapped or logged, and an unhandled signal is reported by `wait` as signal termination rather than a program-produced numeric exit code. Split catchable handled signals from uncatchable termination, specify the parent-observed status for each, waive CLI stderr guarantees when the process cannot run cleanup, and test those cases through a supervising process."
  - severity: "medium"
    where: "AC3, AC7, and AC8 — named operator audit"
    finding: "The artifact repeatedly requires a `named audit` or `operator audit`, and AC8 distinguishes it from `verify:extraction`, but no executable or package-script name, argument contract, output root, or exit contract is defined. Independent review therefore cannot deterministically invoke the required verifier. Define one committed audit entry point, its pinned source/target/evidence inputs, read/write boundaries, durable failure output, and nonzero-exit propagation."
---
