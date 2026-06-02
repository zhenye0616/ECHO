---
item_id: "2026-06-02-084-install-profile-split"
round: 3
reviewer: "codex-ops"
artifact_sha: "a8f4b7223efb37756d6ce7e5e87179d93b51da2e"
completed_at: '2026-06-02T08:06:16Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:80,83; src/echo-home/scaffold.ts:29-62 at a8f4b72"
    finding: >-
      AC4/AC7 still leave an unattended retry path that can flip a fresh customer install into dogfood after a crash. The spec says an existing valid schema-v1 onboarding file without `profile` is legacy and resolves `dogfood`, while AC7 also requires the partial-scaffold case (`onboarding.json` created before profile persistence) to resolve `customer`; at the pinned SHA, `ensureEchoHome()` writes exactly that valid profile-less file before `init` can persist the profile. If the process exits between those writes, the next no-flag rerun has no durable way to tell "interrupted fresh customer scaffold" from "legacy founder install" and can reinstall the coord surface. Patch AC4/AC7 to either write the initial onboarding file with `profile` atomically or define the persisted discriminator for interrupted fresh scaffolds, then test the actual on-disk retry shape.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:19,81,84; src/cli/io/render.ts:76-98 at a8f4b72"
    finding: >-
      AC5 requires `echoctl doctor` to report the active profile, but the normal operator-facing doctor output is rendered by `src/cli/io/render.ts`, which is not in `files_to_modify` while AC8 forbids touching files outside that list. A builder can satisfy the JSON/report-model side by editing `doctor.ts` yet leave `echoctl doctor` text output silent, so the first support check after a leaked or missing coord surface would not show whether the machine is actually `customer` or `dogfood`. Add `src/cli/io/render.ts` to scope and make the doctor test assert the text path, not only JSON/model state.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:77,82-83; tools/foreign-install-smoke.sh:71-76 at a8f4b72"
    finding: >-
      The spec accepts an answer-file `profile` field but never places it in the profile resolution order or the required tests. In the no-TTY install path, answer files are how unattended installs provide setup answers; if `profile` is merely allowed by schema but loses to the default or is not threaded into resolution, a scripted `profile: dogfood` install can silently come up as customer, and a scripted customer install cannot be trusted without also passing a separate CLI flag. Patch AC1/AC7 to define the precedence explicitly, e.g. CLI `--profile` > answer-file `profile` > recorded profile > fresh default, and cover the answer-file profile path in the smoke or init tests.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r3 spec removes the stale-prune data-loss path and keeps the customer role/workflow skip as a successful no-op. The remaining production risks are about unattended install recovery and observability: a crash between scaffold and profile persistence can still create the same on-disk state as a legacy install, normal `doctor` output may not show the profile unless the renderer is in scope, and the answer-file profile path needs explicit precedence for headless installs.

I reviewed the request, the pinned spec at `a8f4b7223efb37756d6ce7e5e87179d93b51da2e`, and the referenced runtime surfaces needed to validate the install/doctor behavior. I did not consume any task-state pointer.
