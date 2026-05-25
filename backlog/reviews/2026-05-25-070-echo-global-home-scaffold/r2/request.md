---
item_id: 2026-05-25-070-echo-global-home-scaffold
round: 2
spec_commit_sha: 1c5488d26e6f06501a833069c10c4c1c1e1c5552
artifact_path: backlog/ready/2026-05-25-070-echo-global-home-scaffold.md
class: narrow
requested_at: '2026-05-25T22:49:53Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 8f228753-4aa5-46bf-84da-217964293983
focus_hints: "r1 verification round. Verify the four spec patches: (1) AC4 Test 1\
  \ ECHO_HOME-as-child-of-mkdtemp-parent makes created_dirs.length===5 satisfiable\
  \ by a correct impl (line ~191); (2) AC1 import allowlist now permits ajv with pinned\
  \ shape 'import { Ajv, type AnySchema, type ValidateFunction } from \"ajv\"' (line\
  \ ~134); (3) AC2 step 2 atomic absent-only contract \u2014 writeFileSync flag 'wx'\
  \ (O_CREAT|O_EXCL), EEXIST as success no-op, check-then-write + temp-plus-rename\
  \ both forbidden, plus new AC4 Test 4 concurrent-first-create race that asserts\
  \ exactly one Promise.all branch reports created_files.length===2 and the other\
  \ reports 0 with valid JSON content (line ~157); (4) task_state_ref populated +\
  \ backlog/task-state/2026-05-25-070-echo-global-home-scaffold/strategist.md created\
  \ (line ~9 + new file). Also check: AC4 Test 4 microtask-interleaving design \u2014\
  \ is Promise.all of two Promise.resolve().then(sync) calls sufficient to exercise\
  \ the O_EXCL race, or does it always serialize on the JS event loop? If serialized,\
  \ the test still pins the correct EEXIST behavior at the API level; the OS-level\
  \ race is exercised in production. Codex-ops lens: confirm the atomic-create contract\
  \ eliminates the durable-partial-write failure mode, and that there are no remaining\
  \ gaps for V1 production durability of ~/.echo/state/*.json."
---

# What to review

Read `backlog/ready/2026-05-25-070-echo-global-home-scaffold.md` at commit `1c5488d26e6f06501a833069c10c4c1c1e1c5552`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
