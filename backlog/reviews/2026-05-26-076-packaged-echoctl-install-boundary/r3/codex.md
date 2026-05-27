---
item_id: "2026-05-26-076-packaged-echoctl-install-boundary"
round: 3
reviewer: "codex"
artifact_sha: "2b018839a24c78361060fc7908e032056e85a9cb"
completed_at: '2026-05-27T05:29:21Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:174 and backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:341"
    finding: "The packaged coord_invoke smoke is still allowed to call any role, so it can pass through a roster/headless rejection instead of the missing-wrapper path AC1.5 is trying to prove. The current resolver checks role shape and coord-roles/headless before it constructs/stats tools/review-queue/run-<role>-reviewer.sh; choosing cursor or another non-headless/invalid role would return isError without proving the packaged tarball omitted the headless reviewer wrapper safely. Patch AC5.1 to invoke a known headless role such as codex with a syntactically valid request_path/correlation_id, and assert the text includes the wrapper-not-found CoordPathError for run-codex-reviewer.sh."
  - severity: "medium"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:344-357"
    finding: "The production data-dir/db mtime+size assertion is racy on the exact machine this smoke is meant to protect. If the founder's real com.echo.daemon is running, it can legitimately ingest unrelated Codex/Claude/git activity and mutate ~/Library/Application Support/ECHO/echo.db while the isolated smoke runs, causing a false failure even when the test daemon used only the override data-dir/db-path. Patch the safety check so a live production daemon is verified by label/plist/PID plus positive override assertions for the test daemon; only require production sqlite mtime/size stability when the production daemon is not loaded or has been explicitly quiesced."
  - severity: "low"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:178-180 and backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:421-427"
    finding: "AC2.3 still reads like a required sqlite.ts code change, but the pinned source already resolves MIGRATIONS_DIR via import.meta.url next to the runtime file, and the out-of-scope section says the existing migration mechanism is preserved. The load-bearing fix is copying the SQL files into dist/storage/migrations, not changing sqlite.ts. Patch the wording to say verify the existing import.meta.url lookup remains unchanged unless the builder finds a failing test."
---

## Findings

1. Medium - AC5.1's coord_invoke assertion can pass for the wrong reason. The spec says any role is acceptable, but the current resolver performs roster/headless checks before checking for the wrapper file. Use a known headless role like codex and assert the missing-wrapper CoordPathError text, otherwise the smoke does not prove AC1.5's packaged de-scope path.

2. Medium - AC5.1/AC5.2's production data-dir mtime+size check is not stable while the founder's real daemon is running. A live daemon can mutate its sqlite for unrelated captures during the smoke, so the test can fail even when the packaged test daemon never touched production state. Keep the PID/plist safety check and the positive override assertions; only require sqlite stability when production is quiesced/not loaded.

3. Low - AC2.3 implies a sqlite.ts change that appears already satisfied at this SHA. The existing code uses import.meta.url for the migrations directory; the spec should make the SQL copy the required fix and treat sqlite.ts as a verification point, not mandatory churn.
