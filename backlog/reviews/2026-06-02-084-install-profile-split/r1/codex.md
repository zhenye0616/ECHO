---
item_id: "2026-06-02-084-install-profile-split"
round: 1
reviewer: "codex"
artifact_sha: "d817b39ffef281bb29f56b7a8003be2af671ac8c"
completed_at: '2026-06-02T07:47:25Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:75-80; src/echo-home/adapters/skill-sync.ts:79-82; tests/echo-home/adapters/skill-sync.test.ts:79-86"
    finding: >-
      AC1 lets an explicit `--profile customer` override a recorded dogfood profile, and AC2/AC3 promise no `/using-echo-coord`, roles, or workflows after a customer install. The current skill-sync contract intentionally leaves stale target files in place, so a prior dogfood install can retain `~/.echo/skills/using-echo-coord.md` and the Claude command even if the next run filters hop-1 copies; skipping role/workflow sync likewise leaves any existing `~/.echo/roles` and `~/.echo/workflows` files untouched. The spec and smoke only assert a fresh customer/default install. Patch the acceptance criteria to require cleanup when switching dogfood -> customer (or explicitly narrow the promise to fresh installs), and add tests/smoke coverage that proves dogfood-only skills are removed from both `~/.echo/skills` and vendor command dirs plus roles/workflows on a reprofile run.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:61,75,78; src/echo-home/scaffold.ts:49-62"
    finding: >-
      The missing-profile rule is internally inconsistent against the current init lifecycle. `ensureEchoHome()` creates `state/onboarding.json` before profile resolution, so a fresh install with no prior state and a pre-084 install with an onboarding file lacking `profile` can both present as "missing profile" unless the implementation carries the `created_files` result or another migration signal. AC1 says fresh installs default to `customer`, but AC4 allows missing profile to be treated as `dogfood` or `customer` at the builder's discretion. If the builder chooses dogfood, a brand-new install can leak the coord surface; if they choose customer, the founder's pre-084 machine can be downgraded. Patch AC4 to a single required rule and test both cases: no onboarding file before init, and an existing valid pre-084 onboarding file without `profile`.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:77,80-81; src/echo-home/adapter-sync.ts:541-596; tests/echo-home/adapter-sync.test.ts:191-227"
    finding: >-
      AC3 says customer installs intentionally skip roles and workflows, but the current `syncAll` success contract treats workflow sync as part of a good run: `computeOverallOk` returns false when `workflowsResult` is undefined, and tests pin copied/missing workflow behavior rather than an intentional profile skip. The spec does not say what `roles`, `workflowsResult`, and `overallOk` should look like for a successful customer-profile sync, nor does `files_to_modify` include `tests/echo-home/adapter-sync.test.ts` even though `adapter-sync.ts` is where the gate lands. Patch the spec to require a concrete sync-result shape for customer skips and add adapter-sync tests that customer skip is successful while dogfood preserves today's workflow/role behavior.
---

# Codex Review - R1

Verdict: proceed_after_patches.

The profile split is implementable, and the flag/frontmatter approach matches the current codebase shape. The patch needs to close three concrete spec gaps before a builder starts: stale dogfood artifacts on profile downgrade, one unambiguous missing-profile/backward-compat rule, and a pinned `syncAll` success contract for intentional customer role/workflow skips.

I did not read any task-state pointer. I reviewed the request body, the spec at the pinned SHA, and current repo code/tests needed to validate the implementation seams.
