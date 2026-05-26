---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 17
reviewer: "codex"
artifact_sha: "21f6c2e586ca67409e7a8511b380cc9b5116a0d0"
completed_at: '2026-05-26T02:08:00Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:433"
    finding: >-
      AC7.2a makes followSymlink:true start with fs.realpathSync(filePath), and AC2/AC3 require the codex/cursor config adapters to pass followSymlink:true. On a first-run machine where ~/.codex/config.toml or ~/.cursor/mcp.json is missing, realpathSync(filePath) throws ENOENT before atomicWrite can create the file, directly contradicting AC2 line 122 and AC3 line 134's missing-file add branches. Patch AC7.2a so followSymlink:true resolves only an existing symlink target and otherwise uses filePath for missing targets, then pin both missing-file create and existing-symlink write-through in atomic-write/config tests.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:22"
    finding: >-
      The spec adds smol-toml but files_to_modify only lists package.json even though this npm repo has a tracked package-lock.json and smol-toml is absent from both files today. If the builder imports smol-toml and updates only package.json, npm ci/repro installs fail with a lockfile mismatch and clean checkouts may not have the dependency installed. Add package-lock.json to files_to_modify/DoD and require the dependency addition to update it.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:427"
    finding: >-
      atomic-write.ts's public AtomicWriteError snippet references AdapterError['code'], but AdapterError is defined inline in adapter-sync.ts while the spec_ref explicitly says there is no shared types.ts and each module defines its own DTOs. A literal atomic-write.ts cannot typecheck unless the builder invents a type-only import from the orchestrator module, duplicates the code union, or creates a shared type surface the spec forbids. Patch AC7 to define a local AtomicWriteErrorCode union or explicitly export/import the shared error-code type without creating a runtime adapter-sync dependency.
---

# Codex R17 Review

Verdict: proceed_after_patches.

## Findings

1. High - `followSymlink:true` cannot create missing codex/cursor config files as written because `realpathSync(filePath)` throws before the missing-file branch can write.

2. Medium - adding `smol-toml` needs the tracked `package-lock.json` updated too, not just `package.json`.

3. Medium - `atomic-write.ts` references `AdapterError['code']` without a clear in-scope type contract, conflicting with the no-shared-types module layout.

## Verification Notes

Reviewed `backlog/ready/2026-05-25-072-adapter-sync-engine.md` at `21f6c2e586ca67409e7a8511b380cc9b5116a0d0` and the r17 request. I did not consume task-state for this reviewer tick.
