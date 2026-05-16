---
item_id: "2026-05-16-057b-coord-active-trigger-and-role-emission"
round: 4
reviewer: "codex"
artifact_sha: "3d88d39c58eda9b26ea258c7f37c513bf7d72bff"
completed_at: '2026-05-16T07:36:41Z'
verdict: "proceed_after_patches"
consumed_task_state: false
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:114,121-127,148"
    finding: >-
      AC0 now validates `correlation_id` and `request_path`, but it still never
      validates `role` before interpolating it into
      `path.join(REPO_ROOT, "tools/review-queue", `run-${role}-reviewer.sh`)`.
      `shell:false` does not protect this path construction: a role containing
      slashes such as `../../../../tmp/x` normalizes outside the reviewer-wrapper
      directory before the exists/executable check runs. It also means a future
      accidental `run-cursor-reviewer.sh` file would activate an out-of-scope
      headless Cursor path even if `coord-roles.json` says `headless:false`.
      Patch AC0 to require a role gate before path construction: role must match
      the canonical reviewer slug shape, must resolve to a known
      `coord-roles.json` entry with `headless:true`, and the resolved wrapper
      path must be `path.resolve`-checked to remain under
      `${REPO_ROOT}/tools/review-queue/` with the exact `run-<role>-reviewer.sh`
      basename. Extend `coord-invoke-input-validation.test.ts` /
      `paths-resolution.test.ts` with malicious role values (`../`, `/`, shell
      metacharacters), unknown roles, and `cursor`, asserting no spawn and no
      `reviewer_invoked` atom.
---

# Codex review - r4

Verdict: proceed_after_patches.

The r3 path-depth, UUIDv4, boundary-wording, and scheduler-health fixes are in place. One security/implementability gap remains in the active-spawn surface: `role` needs the same explicit validation treatment as `request_path` and `correlation_id` before it is used to build the wrapper path.
