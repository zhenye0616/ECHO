---
item_id: "2026-06-02-084-install-profile-split"
round: 4
reviewer: "codex"
artifact_sha: "01156081573c10cba0b4e0d2646a6a34c72600d2"
completed_at: '2026-06-02T08:15:21Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:13,18,85; src/echo-home/wizard/run-wizard.ts:40-42,66-75 at 0115608"
    finding: >-
      AC1 says the resolved profile is threaded into wire/skill-sync, and the spec lists `src/echo-home/wizard/wire.ts` as the file that accepts and forwards that profile. The public `Wizard.wire()` API that `init.ts` actually calls is declared in `src/echo-home/wizard/run-wizard.ts`, where the accepted `Pick<WireOpts, ...>` still excludes any profile field before forwarding to `wireAgents()`. Passing `profile` from `init.ts` will be an excess-property/typecheck failure unless `run-wizard.ts` is changed, but AC8 forbids touching files outside `files_to_modify`. Patch the spec by adding `src/echo-home/wizard/run-wizard.ts` to `files_to_modify`/`spec_refs` (or explicitly change the AC to avoid the Wizard.wire API path), so AC1 and AC8 can both be implemented.
---

# Codex Review - R4

Verdict: `proceed_after_patches`.

The r4 spec closes the prior discriminator, doctor text, answer-file, and scope items called out in the request focus. One implementation-scope conflict remains: the profile cannot be passed through the current wizard API without touching `src/echo-home/wizard/run-wizard.ts`, which is not in `files_to_modify` while AC8 bans out-of-scope edits.

I did not read any task-state pointer. I reviewed the request, the pinned spec at `01156081573c10cba0b4e0d2646a6a34c72600d2`, and the code surfaces needed to validate the init/wizard/wire handoff.
