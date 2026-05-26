---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 10
reviewer: "codex-ops"
artifact_sha: "299f042f32679c0d473cf62752a3f03cd6358024"
completed_at: '2026-05-26T01:21:18Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:338-349"
    finding: >-
      AC6a is titled as a directory-component symlink guard, but the required check only lstatSyncs the final guarded directory. If ~/.echo itself, or another ancestor of ~/.echo/skills, ~/.echo/roles, ~/.echo/state, or a commandsDir, is a symlink, lstatSync(dirPath) follows that ancestor and reports a normal directory. At runtime the engine can then populate skills, roles, and the lock under an unintended target while returning success, which is the same production failure AC6a is trying to prevent for ~/.echo/skills -> /tmp/exfil. Patch the contract to guard ECHO_HOME_PATHS.root and/or walk every path component before any read/write, and add an AC9 case where ~/.echo is a symlink to prove no external target is read or written.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:342-349"
    finding: >-
      The new assertDirIsNotSymlink preflight only defines the symlink and missing-path branches. lstatSync can also throw ENOTDIR, EACCES, ELOOP, or other filesystem errors when a parent path is a regular file, unreadable, or a symlink loop; because this preflight runs before the adapter try/catch paths, those errors can escape syncAll instead of returning the structured overallOk:false result promised by AC6 and the Definition of Done. Specify that preflight filesystem errors are caught into a top-level AdapterError, or into directorySymlink with a broader name, and add tests for at least an ENOTDIR parent and an EACCES parent.
---

# codex-ops review

## Findings

1. medium - `backlog/ready/2026-05-25-072-adapter-sync-engine.md:338-349`

   AC6a only checks the final guarded directory. A symlinked ancestor such as `~/.echo -> /tmp/echo-home` bypasses the guard and lets the engine operate under the resolved external tree while reporting success. Guard the root or walk each path component, then pin it with a test.

2. medium - `backlog/ready/2026-05-25-072-adapter-sync-engine.md:342-349`

   The directory preflight does not map `lstatSync` errors like `ENOTDIR`, `EACCES`, or `ELOOP` into the structured no-throw result. A broken home directory can crash the wizard/CLI before the normal adapter error channels run. Define the error shape and add fixture coverage.

## Verdict

`proceed_after_patches`.
