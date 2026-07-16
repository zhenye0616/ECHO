---
item_id: "2026-07-15-138-echo-context-cutover-substrate-rehearsal"
round: 2
reviewer: "codex"
artifact_sha: "15c8e2c7004ea9b6f1c6f1d23a0cdf12e05712f5"
completed_at: '2026-07-15T23:45:00Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md:105,129-133,176-187"
    finding: "AC1 says the only runnable command in this item is `rehearse --root <new-temporary-directory>`, but AC5 requires deterministic build/verify workflows for both repositories and the Tests section requires candidate builds plus both repositories' typecheck/lint/full suites. Patch the spec to distinguish the only mutation-capable rehearsal command from allowed build/test/verification commands, and name the exact package scripts or tool paths builders/reviewers must run."
  - severity: "medium"
    where: "backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md:22-31,64-65,107-114"
    finding: "AC2 requires the rollback-full authority fence to execute before PID lock, data-dir creation, SQLite open, workers, or socket bind, while `src/daemon/lifecycle.ts` is explicitly a spec_ref for current data/DB/PID resolution but is not in `files_to_modify`. This creates an implementation contradiction if the lifecycle module owns pre-open side effects. Patch `files_to_modify` to include `src/daemon/lifecycle.ts` with a why comment, or add a concrete note explaining the existing lifecycle remains unchanged because all pre-open fencing is reachable solely through the listed files."
---
