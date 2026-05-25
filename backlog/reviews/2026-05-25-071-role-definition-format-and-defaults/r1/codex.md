---
item_id: "2026-05-25-071-role-definition-format-and-defaults"
round: 1
reviewer: "codex"
artifact_sha: "8fa6ecc4ba42ff2279f66aadc8f89597efcf6ff4"
completed_at: '2026-05-25T22:51:00Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md:156"
    finding: "AC2.2 only declares loadRoleFromFile(filePath) and loadRolesFromDir(dirPath), while R3 later says skillsRoot is required for ~/.echo/roles/ loads and 072 documents callers passing skillsRoot to loadRolesFromDir. As written, a builder can implement the exported signatures in AC2.2 and satisfy most tests while leaving the downstream directory-loading path unusable outside the repo. Patch the public surface to define shared RoleLoadOptions and accept it on both loadRoleFromFile and loadRolesFromDir, then add tests for loading a role directory from a temp home with explicit skillsRoot."
  - severity: "medium"
    where: "backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md:184"
    finding: "AC2.5 requires smol-toml@^1.3.1, but the current GitHub Advisory Database entry GHSA-v3rj-xjv7-4jmq marks smol-toml versions before 1.6.1 as affected by a parser DoS fixed in 1.6.1. This loader will eventually parse user-authored role TOMLs, so the spec should set the dependency floor to ^1.6.1 and require the lockfile to resolve 1.6.1 or newer rather than encoding a vulnerable minimum."
  - severity: "low"
    where: "backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md:251"
    finding: "AC4.1 says the tests cover the schema cases, but the enumerated 14 cases do not cover every required-field rejection promised earlier: there are no explicit cases for missing skills, missing [role.requires], missing mcp_servers, missing capabilities, missing [role.output], or missing output.format, and only one unknown-key location is tested. Because strict schema validation is the deliverable, patch AC4.1 to enumerate the missing table/field and unknown-key cases or state which validation bullets are intentionally untested."
---

# Code-Grounded Review

Verdict: proceed_after_patches.

## Findings

1. [medium] backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md:156 — AC2.2 only declares `loadRoleFromFile(filePath)` and `loadRolesFromDir(dirPath)`, while R3 later says `skillsRoot` is required for `~/.echo/roles/` loads and 072 documents callers passing `skillsRoot` to `loadRolesFromDir`. As written, a builder can implement the exported signatures in AC2.2 and satisfy most tests while leaving the downstream directory-loading path unusable outside the repo. Patch the public surface to define shared `RoleLoadOptions` and accept it on both `loadRoleFromFile` and `loadRolesFromDir`, then add tests for loading a role directory from a temp home with explicit `skillsRoot`.

2. [medium] backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md:184 — AC2.5 requires `smol-toml@^1.3.1`, but the current GitHub Advisory Database entry [GHSA-v3rj-xjv7-4jmq](https://github.com/advisories/GHSA-v3rj-xjv7-4jmq) marks `smol-toml` versions before 1.6.1 as affected by a parser DoS fixed in 1.6.1. This loader will eventually parse user-authored role TOMLs, so the spec should set the dependency floor to `^1.6.1` and require the lockfile to resolve 1.6.1 or newer rather than encoding a vulnerable minimum.

3. [low] backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md:251 — AC4.1 says the tests cover the schema cases, but the enumerated 14 cases do not cover every required-field rejection promised earlier: there are no explicit cases for missing `skills`, missing `[role.requires]`, missing `mcp_servers`, missing `capabilities`, missing `[role.output]`, or missing `output.format`, and only one unknown-key location is tested. Because strict schema validation is the deliverable, patch AC4.1 to enumerate the missing table/field and unknown-key cases or state which validation bullets are intentionally untested.

## Code Notes

The referenced code paths mostly check out. `src/coord/roles.ts` exists and is a coord-event SLA JSON loader backed by Ajv, so placing the new role-definition TOML loader at `src/echo-home/roles.ts` avoids a real naming collision. `src/echo-home/` does not exist at this HEAD, but 070 owns the initial directory/module family and 071 can add `roles.ts` plus the barrel without overloading `src/coord`.

All listed canonical skill files exist under `skills/`, and the default role skill sets are coherent with `CLAUDE.md`, `docs/AGENT_INSTRUCTIONS.md`, and the review-queue skills. The frontmatter comment for `skills/review-pending.md` says it is referenced by `reviewer.toml` as well as `strategist.toml`, but AC3.2's reviewer TOML does not include it; that looks like a stale comment rather than a schema blocker.

The repo is already `type: module` with `module: NodeNext`, and there is no existing TOML parser in `package.json` or `package-lock.json`, so adding a small ESM TOML parser fits the current dependency posture. The dependency choice just needs the current security floor patched before a builder claims the item.

AC4.2 enumerates eight default-role checks, but the Tests and Definition of Done sections say seven. That is harmless if the builder follows AC4.2, but it should be fixed with the same spec patch so the acceptance count is not ambiguous.
