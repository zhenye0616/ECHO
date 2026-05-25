---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 2
reviewer: "codex"
artifact_sha: "158381a67929795f1484b38dd9713f7644cf5a10"
completed_at: '2026-05-25T23:56:57Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:34-35"
    finding: >-
      The 070/071 spec_refs point at backlog/ready paths that do not exist at the requested artifact SHA; both referenced items are already under backlog/pending_review, and when 072 becomes selectable they should be under backlog/complete. The builder loop requires reading every spec_ref before writing code, so this ready item currently contains mandatory references that a builder cannot resolve. Patch the refs to paths that will exist when the blockers are complete, or add an explicit stage-stable handoff rule before 072 can be claimed.
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:196-214"
    finding: >-
      SyncResult only gives failed agent entries a conflicts array, but the adapters also have normal non-conflict failure modes: malformed JSON/TOML, EACCES, ENOSPC, ENOTDIR, unreadable source dirs, or atomicWrite errors. As written, syncAll can throw after earlier profile writes have already landed, leaving the wizard/CLI with no redacted SyncResult to render or persist. Add a structured per-agent error variant, require syncAll to catch adapter exceptions per profile with overallOk false, and pin at least one malformed Cursor JSON or filesystem-permission test.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:165-170"
    finding: >-
      AdapterSyncProfile.paths is required but all of its fields are optional, while the comment says missing paths default to per-user HOME locations. The spec never states whether paths itself may be omitted, what exact defaults are used for each agent, or what happens when a required path for that agent is absent. A builder can satisfy the type in incompatible ways and 073/074 will not know whether to pass explicit paths. Define the defaulting/error contract and add syncAll tests for omitted paths versus caller-provided temp paths.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:229-244,313-319"
    finding: >-
      The AC7 mode allowlist is internally inconsistent. AC7.3 describes secret-sensitive missing-file mode for the actual user paths ~/.codex/config.toml and ~/.cursor/mcp.json, but AC9 test 3 requires a fresh tmpdir path that merely matches the .codex/config.toml suffix to receive 0600. An implementation that compares against os.homedir() paths will pass the product contract but fail the test; a suffix matcher can unexpectedly mark unrelated tmp paths as secret-sensitive. Specify exact path normalization and matching semantics, or require tests to pass secretSensitive: true instead of depending on suffix inference.
---

# Code-Grounded Review

Verdict: `proceed_after_patches`.

The r2 patch closes the r1 TOML, mode, temp-file, skill-population, and secret-output issues well enough to continue after a small spec patch. The remaining blockers are concrete implementability problems: two mandatory spec_refs are broken at the artifact SHA, `syncAll` has no structured non-conflict error path, profile path defaults are underspecified, and the atomic-write secret-mode allowlist contradicts its own test contract.

## Findings

1. HIGH: `backlog/ready/2026-05-25-072-adapter-sync-engine.md:34-35` points builders to `backlog/ready/2026-05-25-070-echo-global-home-scaffold.md` and `backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md`. At commit `158381a67929795f1484b38dd9713f7644cf5a10`, those files are not there; they are under `backlog/pending_review/`, and once 072 is unblocked they should be under `backlog/complete/`. Since the builder loop requires reading every spec_ref before code, this makes the spec mechanically unclaimable unless the builder guesses the moved paths. Patch the refs to the paths that will exist when blockers are complete, or add an explicit stage-stable resolution instruction.

2. HIGH: `backlog/ready/2026-05-25-072-adapter-sync-engine.md:196-214` models failed agents only as `conflicts: SyncConflict[]`. The adapters also do parse and filesystem work against user-owned files; malformed `mcp.json`, invalid TOML, permissions, ENOSPC, ENOTDIR, and atomic-write failures are not conflicts and can happen after earlier agents have already written. Without a structured error variant and per-profile catch boundary, `syncAll` can throw with a partially-applied run and no `SyncResult` for the wizard/CLI to render, redact, or persist. Add an error result shape plus tests for at least malformed Cursor JSON or an unreadable path.

3. MEDIUM: `backlog/ready/2026-05-25-072-adapter-sync-engine.md:165-170` says adapter paths default to per-user HOME locations, but the type makes `paths` required and every field optional. The contract does not say whether an omitted path should default, skip that adapter operation, or return an error. That choice affects 073/074 call sites and test ergonomics. Define the default paths for codex/claude-code/cursor, whether `paths` itself is optional, and add a test for omitted paths separate from the temp-path tests.

4. MEDIUM: `backlog/ready/2026-05-25-072-adapter-sync-engine.md:229-244` describes a secret-sensitive allowlist for the real user config files, while `:316` requires the same behavior for a tmpdir path that only matches the `.codex/config.toml` suffix. Those are different contracts. A home-path equality implementation and a suffix implementation have different security behavior and different test outcomes. Make the matching rule explicit, or make tests use `secretSensitive: true` when they are not writing the real HOME path.

## Verification Notes

Reviewed the pinned artifact from `158381a67929795f1484b38dd9713f7644cf5a10`, the inline r2 request, the 070/071 dependency specs at the same commit, `package.json` / `package-lock.json`, the parent coord-layer design, and the current reviewer schema. I did not consume any task-state pointer. No ECHO MCP calls were made.
