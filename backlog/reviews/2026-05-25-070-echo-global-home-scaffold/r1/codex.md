---
item_id: "2026-05-25-070-echo-global-home-scaffold"
round: 1
reviewer: "codex"
artifact_sha: "d4c0ad79428ef4d330c3cb61646804a494040156"
completed_at: '2026-05-25T22:42:02Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:190-192"
    finding: >-
      AC4's fresh-tmpdir test is internally inconsistent with AC2's created_dirs contract. mkdtempSync creates the ECHO_HOME directory before ensureEchoHome() runs, so a correct implementation that reports only directories created in this call cannot return created_dirs.length === 5. Patch the test setup to point ECHO_HOME at a not-yet-created child under the temp parent, or change the expected count to 4 when the root pre-exists.
  - severity: "high"
    where: "backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:134-142"
    finding: >-
      AC1 forbids external imports beyond node:os, node:path, and ../guards.js, then requires Ajv-compiled validators typed as ValidateFunction<T> from ajv. The current repo's Ajv usage also requires importing Ajv/ValidateFunction from ajv. As written, paths.ts cannot satisfy both constraints; explicitly allow the ajv import or move validators to a separate module and list that module in files_to_modify/tests.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:157-159"
    finding: >-
      The write-if-absent contract does not specify an atomic no-overwrite write path. If the process is interrupted during writeFileSync to onboarding.json/projects.json, a partial file can exist, and the next ensureEchoHome() must leave any existing file untouched without validation. Add a concrete atomic create pattern, e.g. write a complete temp file in state/, hard-link it into the final path with linkSync so EEXIST preserves existing state, then unlink the temp file, plus a test for not overwriting on same-file races or leftover temp cleanup.
  - severity: "low"
    where: "backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:9"
    finding: >-
      The spec frontmatter has task_state_ref empty and the pinned commit has no backlog/task-state/2026-05-25-070-echo-global-home-scaffold/strategist.md. The 046+ cold-start protocol requires a self-referential task_state_ref and strategist pointer for builder sessions; patch both before the item is claimed so the builder can follow the load-bearing primer rule.
---

# Codex review

Verdict: proceed_after_patches.

The scaffold direction is implementable, but the spec needs patches before a builder claims it. Two ACs are currently unsatisfiable as written: the tmpdir test cannot produce the expected created_dirs count, and the import allowlist conflicts with the required Ajv validators. The write path also needs an explicit atomic create/no-overwrite contract because preserving any existing state file forever makes partial writes a durable failure mode.

## Findings

1. HIGH - AC4's fresh-tmpdir setup conflicts with the created_dirs contract. `mkdtempSync` returns an already-created directory, while AC2 says `created_dirs` only includes paths that did not exist before the call. Either set `ECHO_HOME` to a child path under the mkdtemp parent, or expect only the four subdirectories when the root already exists.

2. HIGH - AC1 cannot both ban external imports beyond `node:os`, `node:path`, and `../guards.js` and require `ValidateFunction<T>` validators from `ajv`. The repo's existing Ajv import shape is `import { Ajv, type AnySchema, type ValidateFunction } from 'ajv';`, so the spec should explicitly allow that import or split validators into another module.

3. MEDIUM - The absent-file write semantics need an atomic no-overwrite mechanism. A plain check-then-write can leave a truncated final JSON file on interruption, and a later daemon start must preserve it because existing files are never read or rewritten. Specify a temp-file + `linkSync`/EEXIST pattern or equivalent, and pin the behavior with a focused test.

4. LOW - `task_state_ref` is empty and the strategist task-state pointer is absent at the pinned SHA. That violates the repo's 046+ cold-start contract and will make the next builder load more context than intended.
