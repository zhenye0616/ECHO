---
item_id: "2026-05-25-074-echo-cli-binary"
round: 2
reviewer: "codex"
artifact_sha: "177a85fea24c656f3a8e580d8e94f02e1e7bb7e8"
completed_at: '2026-05-26T06:05:08Z'
verdict: "pushback"
findings:
  - severity: high
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:483"
    finding: >-
      AC5.4 tells `runRun()` to call `loadRolesFromDir(rolesDir, { assertDefaults: true })`, but `rolesDir` defaults to `~/.echo/roles`. The shipped 071 loader validates every `role.skills` entry by discovering a skills root from the role file path unless `skillsRoot` is passed (`src/echo-home/roles.ts:147-167`, `src/echo-home/roles.ts:175-196`); under `~/.echo/roles` that discovery cannot find the repo `package.json` plus `skills/`, so every installed `echo run` role load fails before matching. Patch AC5.4, and AC4.4's role-skill load, to pass `skillsRoot: ECHO_HOME_PATHS.skills` or define a CLI-specific role-load helper, with a test that loads copied roles from a tmp `ECHO_HOME` rather than in-repo assets.
  - severity: high
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:437"
    finding: >-
      `dispatchWorkflow()` receives only `workflow` and `matches`, but AC5.3 step 2 requires it to look up the matched `Role` to derive the codex sandbox flag. `AgentMatch` carries `role`, `pickedAgent`, and `reason` only (AC5.2), and AC5.4 step 8 calls the dispatcher without passing the `roles` array. The builder cannot satisfy both the public dispatcher signature and the sandbox-mapping acceptance test without inventing an unreviewed side channel or reloading roles. Patch the surface to pass `roles`/`roleByName`, or carry the resolved role sandbox in `AgentMatch`, and pin that data flow in AC7.4 case 11.
  - severity: medium
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:357"
    finding: >-
      AC4.4 scopes uninstall candidates to the union of `role.skills` across the default role TOMLs, but 072's `syncClaudeSkills()` copies every `.md` file from `~/.echo/skills` into `~/.claude/commands` (`src/echo-home/adapters/skill-sync.ts:109-143`). At the pinned SHA, `skills/review-queue-cursor.md` exists and is copied by 072, but no default role references `review-queue-cursor`, so `echo uninstall` would leave an ECHO-owned Claude command file behind. Patch AC4.4 to enumerate `echoSkillsDir/*.md` with the byte-equality proof, or otherwise include every 072-copied skill name, and add a fixture that proves `review-queue-cursor.md` is removed when byte-equal.
  - severity: medium
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:423"
    finding: >-
      The matcher contract and tests disagree on the reason for insufficient capabilities. AC5.2 says the non-override path returns `no-onboarded-agent` when filtering by required capabilities yields an empty set, but AC7.7 case 8 requires an onboarded profile with `capabilities: []` to return `capability-mismatch`. A builder cannot satisfy both without guessing a new distinction. Patch the reason semantics explicitly, for example no wired profiles means `no-onboarded-agent` while present profiles with insufficient capabilities means `capability-mismatch`, and align AC7.4/AC7.7 to that rule.
---

# Codex review

Verdict: `pushback`.

The r1 patches fixed the original capability-population hole, package version read, doctor truth table, and Codex config elision direction. I still see two build-blocking API mismatches in the r2 shape: installed role TOMLs cannot be loaded from `~/.echo/roles` with the default 071 loader options, and the dispatcher signature does not carry the role data needed for the sandbox mapping AC.

## Findings

1. **high** - `backlog/ready/2026-05-25-074-echo-cli-binary.md:483`

   AC5.4 tells `runRun()` to call `loadRolesFromDir(rolesDir, { assertDefaults: true })`, but `rolesDir` defaults to `~/.echo/roles`. The shipped 071 loader validates every `role.skills` entry by discovering a skills root from the role file path unless `skillsRoot` is passed (`src/echo-home/roles.ts:147-167`, `src/echo-home/roles.ts:175-196`); under `~/.echo/roles` that discovery cannot find the repo `package.json` plus `skills/`, so every installed `echo run` role load fails before matching. Patch AC5.4, and AC4.4's role-skill load, to pass `skillsRoot: ECHO_HOME_PATHS.skills` or define a CLI-specific role-load helper, with a test that loads copied roles from a tmp `ECHO_HOME` rather than in-repo assets.

2. **high** - `backlog/ready/2026-05-25-074-echo-cli-binary.md:437`

   `dispatchWorkflow()` receives only `workflow` and `matches`, but AC5.3 step 2 requires it to look up the matched `Role` to derive the codex sandbox flag. `AgentMatch` carries `role`, `pickedAgent`, and `reason` only (AC5.2), and AC5.4 step 8 calls the dispatcher without passing the `roles` array. The builder cannot satisfy both the public dispatcher signature and the sandbox-mapping acceptance test without inventing an unreviewed side channel or reloading roles. Patch the surface to pass `roles`/`roleByName`, or carry the resolved role sandbox in `AgentMatch`, and pin that data flow in AC7.4 case 11.

3. **medium** - `backlog/ready/2026-05-25-074-echo-cli-binary.md:357`

   AC4.4 scopes uninstall candidates to the union of `role.skills` across the default role TOMLs, but 072's `syncClaudeSkills()` copies every `.md` file from `~/.echo/skills` into `~/.claude/commands` (`src/echo-home/adapters/skill-sync.ts:109-143`). At the pinned SHA, `skills/review-queue-cursor.md` exists and is copied by 072, but no default role references `review-queue-cursor`, so `echo uninstall` would leave an ECHO-owned Claude command file behind. Patch AC4.4 to enumerate `echoSkillsDir/*.md` with the byte-equality proof, or otherwise include every 072-copied skill name, and add a fixture that proves `review-queue-cursor.md` is removed when byte-equal.

4. **medium** - `backlog/ready/2026-05-25-074-echo-cli-binary.md:423`

   The matcher contract and tests disagree on the reason for insufficient capabilities. AC5.2 says the non-override path returns `no-onboarded-agent` when filtering by required capabilities yields an empty set, but AC7.7 case 8 requires an onboarded profile with `capabilities: []` to return `capability-mismatch`. A builder cannot satisfy both without guessing a new distinction. Patch the reason semantics explicitly, for example no wired profiles means `no-onboarded-agent` while present profiles with insufficient capabilities means `capability-mismatch`, and align AC7.4/AC7.7 to that rule.
