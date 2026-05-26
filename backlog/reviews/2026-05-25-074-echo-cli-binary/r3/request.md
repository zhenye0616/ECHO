---
item_id: 2026-05-25-074-echo-cli-binary
round: 3
spec_commit_sha: ca21a05281d8703360654b8058e1a1bfd698b1b1
artifact_path: backlog/ready/2026-05-25-074-echo-cli-binary.md
class: structural-reform
requested_at: '2026-05-26T06:18:40Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 3bd301c2-2204-4a0c-a87b-dc1846ced325
focus_hints: "r3 verification: (1) Binary rename echo->echoctl cascades cleanly throughout\
  \ the spec (title + section + bin field + every CLI command reference + remediation\
  \ copy + AC1.5 smoke test); confirm no stray 'echo init/doctor/uninstall/run' references\
  \ survive. (2) AC5.2 two-stage matcher (no-onboarded-agent at step 3b vs capability-mismatch\
  \ at step 3c) \u2014 unambiguous for every reachable input shape. (3) AgentMatch.resolvedSandbox\
  \ populated iff reason==='matched'; the dispatcher's AC5.3 step 2 has no other access\
  \ path to Role.sandbox so this is the load-bearing data flow. (4) AC5.4 step 8 named\
  \ SIGINT/SIGTERM handlers + step 10 exit code derivation \u2014 confirm there is\
  \ NO reachable path where a signal-interrupted workflow exits 0; also confirm the\
  \ named-handler unregistration in 'finally' avoids handler accumulation across multiple\
  \ runRun() invocations in a single process (e.g. test runs). (5) AC4.4's enumerate\
  \ ~/.echo/skills/*.md handles missing-dir/empty-dir as no-op; the skipNames source\
  \ no longer requires loadRolesFromDir to succeed. (6) AC5.4 step 5 passes { skillsRoot:\
  \ ECHO_HOME_PATHS.skills, assertDefaults: true } \u2014 confirm both options are\
  \ required (assertDefaults alone fails on partial dirs; skillsRoot alone skips the\
  \ integrity check) and the combination handles the case where ECHO_HOME_PATHS.skills\
  \ was populated by 072 but a default role TOML is missing. (7) --force-purge gate\
  \ \u2014 confirm the warning + residual-config list is actionable; the --yes interaction\
  \ is clear. (8) AC1.5 smoke test \u2014 npm pack approach actually exercises the\
  \ bin entry rather than just verifying file presence. (9) Did any r2 patch introduce\
  \ a new mechanism that itself needs review (per 058 discipline)? In particular:\
  \ receivedSignal mutable ref + AbortController pattern in AC5.4 step 8/9 \u2014\
  \ is the data-flow shape correct, or is it a r2-introduced mechanism worth reconsidering?"
---

# What to review

Read `backlog/ready/2026-05-25-074-echo-cli-binary.md` at commit `ca21a05281d8703360654b8058e1a1bfd698b1b1`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
