---
item_id: "2026-06-02-084-install-profile-split"
round: 4
reviewer: "codex-ops"
artifact_sha: "01156081573c10cba0b4e0d2646a6a34c72600d2"
completed_at: '2026-06-02T08:14:43Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:78,81; src/echo-home/wizard/wire.ts:129-167,257 and src/cli/commands/init.ts:448-515 at 0115608"
    finding: >-
      AC4 now uses `completed`/`agents` as the legacy-vs-fresh discriminator, but the spec still does not require the resolved `profile` to be persisted before `wire()` can mutate `state.agents`. At the pinned runtime flow, `wire()` writes selected agents into `onboarding.json` before `init` later marks completion; if the 084 implementation resolves customer, starts wiring, and crashes after agents are written but before `profile` is persisted, the next no-flag rerun sees `completed:false` plus non-empty `agents` without `profile` and AC4 classifies it as legacy dogfood. That unattended retry can reinstall the coord surface onto the same fresh customer machine AC4 is meant to protect. Patch AC1/AC4 to make profile persistence happen before any agent/sync/onboarding mutation that can trip the dogfood discriminator, and add a regression for the ordering or for the `completed:false`+agents-without-profile crash shape.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r4 patches close the named r3 gaps around file-presence inference, answer-file precedence, doctor text output, and scope. One runtime edge remains: the discriminator is only safe if profile persistence is ordered before agent state mutation. Without that contract, an unattended crash during wiring can still turn a fresh customer retry into dogfood.

I reviewed the request, the pinned spec at `01156081573c10cba0b4e0d2646a6a34c72600d2`, and the pinned runtime surfaces needed to validate the install crash path. I did not consume any task-state pointer.
