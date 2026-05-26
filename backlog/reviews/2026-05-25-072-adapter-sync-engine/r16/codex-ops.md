---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 16
reviewer: "codex-ops"
artifact_sha: "fb58e80dd2565e2a0d3c144d9790f4f314c119af"
completed_at: '2026-05-26T02:00:07Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:397-408,431-437,608"
    finding: >-
      The symlink write-through contract does not pin where the atomic temp file lives after `realpathSync(filePath)`. AC7.2 says the temp filename uses `<filePath>.<pid>.<uuid>.tmp`, while AC7.2a says `followSymlink: true` writes through to the resolved target and leaves the symlink in place. If `~/.codex/config.toml` or `~/.cursor/mcp.json` is a symlink into a dotfiles repo on another filesystem, a literal implementation either renames a temp from the symlink directory onto the resolved target and hits `EXDEV`, or renames back onto `filePath` and replaces the symlink. That is a production first-run failure for exactly the dotfile workflow AC7.2a is trying to preserve. Patch AC7.2a to require deriving both the final write path and temp path from the resolved target when `followSymlink: true`, so temp and final are in the same directory/device and the symlink path is never the rename destination. Add a test that instruments the rename target/temp dirname for a symlinked config path, not only that the symlink remains after success.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:124-135,397-400,443-455"
    finding: >-
      The secret-sensitive mode contract is ambiguous in a way that can leak config credentials at runtime. AC2/AC3 require config adapters to pass `secretSensitive: true`, and the AC7 interface comment says that flag writes `0600` unconditionally, but AC7.3 says an existing file's mode is always preserved. On a manually-created or previously-broken `0644` Cursor/Codex config, ECHO can add `headers.Authorization` and preserve group/other readability. Patch the contract to choose one behavior explicitly; from an ops/security lens, `secretSensitive: true` should clamp existing targets to `0600` (or at minimum return an AdapterError) rather than preserving an unsafe mode. Pin with an existing-file `0644` config test for both codex and cursor.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:313-314,355-360,597-598"
    finding: >-
      The stale-lock recovery message is the only V1 recovery path after a crash, but it renders `rm <path>` without shell quoting. If `ECHO_HOME` or the user's home directory contains spaces, glob characters, quotes, or other shell metacharacters, the copy-paste command either fails or can target the wrong path, leaving the user permanently blocked on `RETRY_CONFLICT` until they manually infer the right escaping. Patch the lock error message to render a shell-escaped command such as `rm -- '<escaped path>'` (or remove the command and show the raw path separately), and add a test with `ECHO_HOME` under a directory containing spaces and brackets.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r16 contract is close, but three operational recovery/security edges still need tightening before a builder turns it into runtime behavior: symlinked config writes need same-directory temp semantics, secret-bearing config updates need an unambiguous mode policy, and stale-lock cleanup needs copy-paste-safe quoting.
