---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 16
reviewer: "codex-ops"
artifact_sha: "60a8191af0eebf106e27009d11db508a4bcbc0ef"
completed_at: '2026-07-16T11:01:57Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3 — fresh-clone verifier/wrapper and exact child traces"
    finding: "Exact argv and cwd checks still launch bare executable names under inherited environment state. PATH can select unintended binaries, while GIT_DIR, GIT_WORK_TREE, GIT_CONFIG_*, GIT_OBJECT_DIRECTORY, NODE_OPTIONS, and npm configuration can redirect probes or preload code without changing the recorded trace. Require a scrubbed allowlisted environment before Node starts, absolute executable resolution with exact version checks, controlled child environments, and poisoned-environment/minimal-PATH fixtures."
  - severity: "high"
    where: "AC4 — target-main canonical plan and sole push"
    finding: "The authorized push targets mutable alias `origin`, but neither the plan nor gate binds that alias's resolved destination or requires a fresh landing clone. A stale origin, URL rewrite, or remote helper can mutate another repository before canonical-target readback fails. Require a fresh detached clone or direct canonical token-free URL, disable URL rewrites and unreviewed config/helpers, bind the resolved endpoint, verify clean HEAD/tree/controller bytes, and add wrong-origin, insteadOf, and dirty-tree fixtures."
  - severity: "high"
    where: "AC6 — workflow-dispatch and release-publication production adapters"
    finding: "Poll counts are bounded, but individual HTTP operations, binary streams, keyring lookups, and gh/git children have no required finite deadlines. A stalled request can hang indefinitely, and terminating only the parent can leave a transport child completing a write after controller exit. Require monotonic per-operation deadlines, abort/stream-close semantics, process-group TERM/KILL handling, ambiguous-write reconciliation, and never-resolving/orphan-child adapter fixtures."
  - severity: "high"
    where: "AC6 — private-target authentication adapter"
    finding: "Actor identity and scopes are checked only during preflight, while a fresh `gh auth token` result is acquired at every later boundary. A concurrent account switch or keyring change can therefore substitute another credential for a tag or release write. Validate every acquired token against the authorized login/user/node/scope tuple before use or retain one preflight-validated in-memory token; also reject Git redirects and proxy overrides, with credential-rotation fixtures before each mutation."
  - severity: "medium"
    where: "AC6 — production entrypoint temporary clone, artifact download, and extraction"
    finding: "The controller-owned clone/download/extraction workspace has no required private-root, ownership, canonical-path, or surviving-exit cleanup contract, and `cleanup:false` is ambiguous about local cleanup. Require a 0700 mkdtemp-owned root, exact-path cleanup in finally without touching unowned paths, primary-error preservation when cleanup fails, and partial-setup/extraction/controller/cleanup failure fixtures; clarify that the no-cleanup rule applies to remote destination state."
---
