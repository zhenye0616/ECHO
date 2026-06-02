---
item_id: "2026-06-02-084-install-profile-split"
round: 3
reviewer: "codex"
artifact_sha: "a8f4b7223efb37756d6ce7e5e87179d93b51da2e"
completed_at: '2026-06-02T08:04:27Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:19,81,84; src/cli/io/render.ts:77-101 at a8f4b72"
    finding: >-
      AC5 requires `echoctl doctor` to report the active profile, but the only human doctor output path is `renderDoctorReport()` in `src/cli/io/render.ts`, and that file is not in `files_to_modify` while AC8 forbids touching files outside the list. Updating `src/cli/commands/doctor.ts` can add the field to the JSON report, but it cannot make normal text-mode `doctor` print it without changing the renderer. Patch the spec to include `src/cli/io/render.ts` (and, if desired, make the doctor test assert both JSON and text output) so AC5 and AC8 can both be satisfied.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:77,80,83; src/echo-home/scaffold.ts:29-51 at a8f4b72"
    finding: >-
      The missing-profile rules still collapse two code-identical states. AC4 says an existing valid schema-v1 onboarding file lacking `profile` is legacy and resolves to `dogfood`, but AC7 also requires the partial-scaffold case (`onboarding.json` created before profile persistence) to resolve to `customer`. At the pinned SHA, `ensureEchoHome()` writes a valid profile-less onboarding file before `init.ts` can persist the resolved profile, so a crash in that window leaves exactly the same persisted shape AC4 calls legacy unless the spec defines an additional discriminator. Patch AC4/AC7 to name the predicate (for example, `completed:false` with no agents is treated as interrupted fresh scaffold) or add the needed scaffold change/scope so the profile is written with the initial state.
---

# Codex Review - R3

Verdict: `proceed_after_patches`.

The r3 spec removes the stale reprofile-prune path and preserves the customer-skip success contract. Two implementability gaps remain before a builder starts: AC5 needs the doctor text renderer in scope, and the missing-profile rule needs a deterministic discriminator for interrupted fresh scaffolds versus legacy pre-084 installs.

I did not read any task-state pointer. I reviewed the request, the pinned spec at `a8f4b7223efb37756d6ce7e5e87179d93b51da2e`, and the code surfaces needed to validate the init/onboarding/doctor implementation seams.
