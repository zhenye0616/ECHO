---
item_id: "2026-05-25-071-role-definition-format-and-defaults"
round: 1
reviewer: "codex-ops"
artifact_sha: "8fa6ecc4ba42ff2279f66aadc8f89597efcf6ff4"
completed_at: '2026-05-25T22:48:55Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md:156"
    finding: "The public API pins loadRoleFromFile(filePath) and loadRolesFromDir(dirPath) without the optional skillsRoot overload that R3 later says downstream ~/.echo-rooted consumers need, and AC4 does not add a test for that overload. A builder can satisfy the acceptance criteria while leaving 072/074 with a loader that only works from repo-rooted assets; at runtime, ~/.echo/roles files would fail root discovery or report misleading missing-skill errors. Patch AC2.2, AC2.4, and AC4 to make opts.skillsRoot part of the public contract and require tests for explicit skillsRoot success, missing skillsRoot failure, and wrong skillsRoot failure."
  - severity: "medium"
    where: "backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md:157"
    finding: "loadRolesFromDir is specified to sort and throw on single-file validation errors, but it has no contract for an empty or partially populated default-role directory. During 072's copy/sync handoff or concurrent install attempts, ~/.echo/roles containing only builder.toml could be treated as a valid one-role system, making downstream role matching silently degrade instead of failing loud. Patch the spec either to state generic loadRolesFromDir returns only discovered roles and consumers must compare DEFAULT_ROLE_FILENAMES, or add an expected-defaults option/helper plus tests that a missing reviewer or strategist default is reported as an installation integrity error."
  - severity: "low"
    where: "backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md:177"
    finding: "The skills check validates existence of skills/<skill>.md but never defines a grammar or containment rule for <skill>. With an explicit skillsRoot, an implementation that simply joins paths can accidentally accept traversal-shaped entries or environment-specific aliases instead of role skill names. Patch AC1 or AC2 to require skill names to match a safe filename grammar and require the resolved candidate path to remain inside skillsRoot; add one rejection test."
---

# Operational Review

Verdict: proceed_after_patches.

## Findings

1. [medium] backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md:156 — The public API pins loadRoleFromFile(filePath) and loadRolesFromDir(dirPath) without the optional skillsRoot overload that R3 later says downstream ~/.echo-rooted consumers need, and AC4 does not add a test for that overload. A builder can satisfy the acceptance criteria while leaving 072/074 with a loader that only works from repo-rooted assets; at runtime, ~/.echo/roles files would fail root discovery or report misleading missing-skill errors. Patch AC2.2, AC2.4, and AC4 to make opts.skillsRoot part of the public contract and require tests for explicit skillsRoot success, missing skillsRoot failure, and wrong skillsRoot failure.

2. [medium] backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md:157 — loadRolesFromDir is specified to sort and throw on single-file validation errors, but it has no contract for an empty or partially populated default-role directory. During 072's copy/sync handoff or concurrent install attempts, ~/.echo/roles containing only builder.toml could be treated as a valid one-role system, making downstream role matching silently degrade instead of failing loud. Patch the spec either to state generic loadRolesFromDir returns only discovered roles and consumers must compare DEFAULT_ROLE_FILENAMES, or add an expected-defaults option/helper plus tests that a missing reviewer or strategist default is reported as an installation integrity error.

3. [low] backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md:177 — The skills check validates existence of skills/<skill>.md but never defines a grammar or containment rule for <skill>. With an explicit skillsRoot, an implementation that simply joins paths can accidentally accept traversal-shaped entries or environment-specific aliases instead of role skill names. Patch AC1 or AC2 to require skill names to match a safe filename grammar and require the resolved candidate path to remain inside skillsRoot; add one rejection test.

## Ops Notes

Malformed default-role TOML mostly fails loud as specified: missing required tables, required fields, invalid sandbox/capability values, unknown schema keys, and parser errors all throw RoleValidationError with file and field context. That is the right operational shape for typos in shipped role files, provided the implementation keeps those errors distinct from filesystem discovery failures.

The loader itself is read-only, so partial-write durability mainly belongs to 072's sync/install step. Still, 071 exports the directory loader and DEFAULT_ROLE_FILENAMES that downstream code will use, so the handoff needs an explicit integrity contract for the installed default set before 072 depends on it.

The unversioned V1 role format is acceptable for this spec only if later sync/upgrade work owns provenance and conflict detection out of band. If a user edits ~/.echo/roles/reviewer.toml and ECHO ships a changed default, 071 should fail loudly on invalid syntax/schema, while 072 decides whether to preserve, skip, or write a conflicted copy; do not let 071's strict loader become the silent upgrade policy.
