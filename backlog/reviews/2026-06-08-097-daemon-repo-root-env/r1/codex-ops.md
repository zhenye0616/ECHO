---
item_id: "2026-06-08-097-daemon-repo-root-env"
round: 1
reviewer: "codex-ops"
artifact_sha: "d29260ad032e78caaa46d076cf2117b908169b42"
completed_at: '2026-06-08T21:08:02Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-08-097-daemon-repo-root-env.md:40"
    finding: "The cwd git-toplevel fallback bakes any git checkout into the launchd plist. If an operator runs `echoctl daemon install` from an unrelated repo, the packaged daemon will set `ECHO_REPO_ROOT` to that repo and unattended `coord_invoke` will still resolve reviewer wrappers and request paths against the wrong tree. Patch the spec to only auto-derive when the toplevel is recognizably the ECHO repo/reviewer harness, otherwise omit the key, and add a test for an unrelated git repo."
  - severity: "medium"
    where: "backlog/proposed/2026-06-08-097-daemon-repo-root-env.md:47"
    finding: "The explicit `--repo-root` path is only specified as absolutized and persisted. A typo or stale path would install cleanly, then fail later inside launchd as another unattended ENOENT loop. Patch the spec so explicit roots are validated at install time, at minimum existing directory plus expected reviewer harness path, and fail non-zero with a clear stderr message instead of writing a bad plist."
---

## Summary

Proceed after the spec closes the two install-time validation gaps above.
