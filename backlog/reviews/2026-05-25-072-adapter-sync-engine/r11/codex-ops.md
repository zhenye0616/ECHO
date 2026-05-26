---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 11
reviewer: "codex-ops"
artifact_sha: "2b596d37f63b86790fdf143376db260c0fb936e3"
completed_at: '2026-05-26T01:27:32Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:345-353,483-485,558-560"
    finding: >-
      AC6a requires `assertPathComponentsAreNotSymlinks` to lstat every existing component from `/` to the target and abort on any symlink, but the test/runtime contract also leans on OS temp homes. On macOS, `os.tmpdir()` resolves through `/var/folders/...`, and `/var` itself is a symlink to `/private/var`; `/tmp` has the same issue. A literal implementation will classify ordinary temp-backed `ECHO_HOME` or `commandsDir` paths as hostile and return `directorySymlink` before the adapter tests or launch smoke runs touch any real adapter behavior. Patch AC6a/AC9 so the guard ignores trusted system-prefix symlinks by canonicalizing the base temp path, or explicitly starts enforcement at the ECHO-owned root and its descendants while still catching `.echo`, `skills`, `roles`, `state`, and `commands` symlinks. Add a macOS temp-home test so `ECHO_HOME` under `os.tmpdir()` does not fail before adapter work begins.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:83-90,386-390,450-456,553-554"
    finding: >-
      AC1 still describes `mergeWithMarkers` as reading `filePath` before branch selection, while AC7/AC8 later promise marker targets use `followSymlink: false` and that `TargetSymlinkConflict` has no byte payload because the linked target was never read. In production, a literal read-first marker adapter follows `~/.codex/AGENTS.md` or `~/.claude/CLAUDE.md` if it is a symlink before `atomicWrite` gets a chance to refuse the write; if the linked target happens to contain ECHO markers, the conflict path can return bytes from outside the intended file. Patch the marker contract to `lstatSync(filePath)` before any read when the path exists; symlinked targets should return the `target-symlink` conflict without `currentInside` or a diff. Extend AC9 case 26 with a read spy, mirroring the role-symlink no-read assertion, so the linked target is proven unread.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r11 spec is close operationally: the lock posture, role-byte redaction boundary, and directory symlink guard are all pointed in the right direction. Two runtime edges still need tightening before a builder implements it: the symlink guard should not reject standard macOS temp-backed runs, and the marker symlink path needs a pre-read refusal contract to match the no-byte-payload safety claim.
