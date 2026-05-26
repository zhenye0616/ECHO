---
item_id: "2026-05-25-074-echo-cli-binary"
round: 1
reviewer: "codex"
artifact_sha: "d9ef0c07804647d9c2e17f2be64553186a129d79"
completed_at: '2026-05-26T05:46:03Z'
verdict: "pushback"
findings:
  - severity: high
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:338"
    finding: >-
      AC5's matcher filters onboarded agents by `OnboardedAgentProfile.capabilities`, but the current onboarding writer initializes those capabilities to `[]` and never populates them (`src/echo-home/wizard/wire.ts:127-164`; schema only requires a string array at `src/echo-home/paths.ts:28-34`). Since the default roles require non-empty capabilities, a freshly completed `echo init` would make every `echo run` plan fail with `no-onboarded-agent` or `capability-mismatch`. Patch the spec to define the per-agent capability source and require init/wire/state tests to populate it, or change the matcher to use a defined capability map.
  - severity: high
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:165"
    finding: >-
      AC2.2 mandates `import { version } from '../../../package.json' assert { type: 'json' }`, but the target runtime here is Node v22.22.1: `assert` import assertions are rejected, and JSON modules expose a default export rather than a named `version` export. The prescribed code will fail before `echo init` can construct the wizard. Patch this to a Node 22-compatible default JSON import with `with { type: 'json' }`, or read/parse package.json through fs, and pin the emitted CLI with a runtime test.
  - severity: medium
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:302"
    finding: >-
      The workflow schema example requires `version = 1`, but the validation contract immediately below says `schema_version` is pinned, and the loader interface drops the version field entirely. With strict unknown-key rejection, builder fixtures using one spelling will fail an implementation that chose the other. Patch AC5.1/AC7.6 to use one field name consistently and say whether `Workflow` retains it or validates-and-discards it.
  - severity: medium
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:200"
    finding: >-
      The doctor rollup is contradictory: AC3.2 says a PID lock with unreachable MCP is the known stale-lock shape and should be `degraded`, AC3.6 says daemon-unreachable is `broken`, and AC7.2 test case 2 expects `degraded`. The builder cannot encode the requested constant table unambiguously. Patch the rollup table and tests so stale PID-lock, closed port, and missing daemon each have one expected `overall` value.
  - severity: medium
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:289"
    finding: >-
      AC4.4 requires 072 to prepend a first-line `<!-- echo-owned-skill -->` marker before Claude command files can be uninstalled, but the current command files begin with YAML frontmatter (`skills/process-backlog.md:1-3`) and `syncClaudeSkills` currently copies those bytes verbatim (`src/echo-home/adapters/skill-sync.ts:109-132`). A first-line HTML marker would move `---` off line 1 and risks breaking command metadata parsing; placing the marker after frontmatter would then fail the specified first-line uninstall gate. Patch the marker shape/placement to preserve frontmatter semantics and update both sync and inverse tests around that exact format.
---

# Codex review

Verdict: `pushback`.

The CLI surface is directionally coherent, but the current spec is not yet buildable as written. The biggest issue is that `run` depends on onboarded agent capabilities that upstream state never records, so the role-plugging mechanism would be dead on arrival after a successful `init`. AC2.2 also prescribes JSON import syntax that fails on the stated Node 22 target.

## Findings

1. **high** — `backlog/ready/2026-05-25-074-echo-cli-binary.md:338`

   AC5's matcher filters onboarded agents by `OnboardedAgentProfile.capabilities`, but the current onboarding writer initializes those capabilities to `[]` and never populates them (`src/echo-home/wizard/wire.ts:127-164`; schema only requires a string array at `src/echo-home/paths.ts:28-34`). Since the default roles require non-empty capabilities, a freshly completed `echo init` would make every `echo run` plan fail with `no-onboarded-agent` or `capability-mismatch`. Patch the spec to define the per-agent capability source and require init/wire/state tests to populate it, or change the matcher to use a defined capability map.

2. **high** — `backlog/ready/2026-05-25-074-echo-cli-binary.md:165`

   AC2.2 mandates `import { version } from '../../../package.json' assert { type: 'json' }`, but the target runtime here is Node v22.22.1: `assert` import assertions are rejected, and JSON modules expose a default export rather than a named `version` export. The prescribed code will fail before `echo init` can construct the wizard. Patch this to a Node 22-compatible default JSON import with `with { type: 'json' }`, or read/parse package.json through fs, and pin the emitted CLI with a runtime test.

3. **medium** — `backlog/ready/2026-05-25-074-echo-cli-binary.md:302`

   The workflow schema example requires `version = 1`, but the validation contract immediately below says `schema_version` is pinned, and the loader interface drops the version field entirely. With strict unknown-key rejection, builder fixtures using one spelling will fail an implementation that chose the other. Patch AC5.1/AC7.6 to use one field name consistently and say whether `Workflow` retains it or validates-and-discards it.

4. **medium** — `backlog/ready/2026-05-25-074-echo-cli-binary.md:200`

   The doctor rollup is contradictory: AC3.2 says a PID lock with unreachable MCP is the known stale-lock shape and should be `degraded`, AC3.6 says daemon-unreachable is `broken`, and AC7.2 test case 2 expects `degraded`. The builder cannot encode the requested constant table unambiguously. Patch the rollup table and tests so stale PID-lock, closed port, and missing daemon each have one expected `overall` value.

5. **medium** — `backlog/ready/2026-05-25-074-echo-cli-binary.md:289`

   AC4.4 requires 072 to prepend a first-line `<!-- echo-owned-skill -->` marker before Claude command files can be uninstalled, but the current command files begin with YAML frontmatter (`skills/process-backlog.md:1-3`) and `syncClaudeSkills` currently copies those bytes verbatim (`src/echo-home/adapters/skill-sync.ts:109-132`). A first-line HTML marker would move `---` off line 1 and risks breaking command metadata parsing; placing the marker after frontmatter would then fail the specified first-line uninstall gate. Patch the marker shape/placement to preserve frontmatter semantics and update both sync and inverse tests around that exact format.
