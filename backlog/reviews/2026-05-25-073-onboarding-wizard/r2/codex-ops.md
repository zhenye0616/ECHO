---
item_id: "2026-05-25-073-onboarding-wizard"
round: 2
reviewer: "codex-ops"
artifact_sha: "6a5a1778ece70705fe398a79ac460961e85135e9"
completed_at: '2026-05-26T03:00:56Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:151; src/storage/interface.ts:12-17,104-110; src/mcp/util/source-app.ts:17-23"
    finding: >-
      AC1.3 still specifies atom activity as `Storage.query` with exact `source === kind` values (`codex`, `claude_code`, `cursor`), but the storage seam treats `source` as exact-match while real captured app atoms use source prefixes such as `fs:$HOME/.codex/sessions/`, `fs:$HOME/.claude/projects/`, and `fs:$HOME/Library/Application Support/Cursor/`. In production this makes every real historical atom miss the detector, so a user with weeks of Codex/Claude/Cursor activity is downgraded to config-only medium confidence, or `none` if the config file is absent. Patch AC1.3 to use the canonical source-app prefix mapping (or an equivalent wizard-local map) via `source_prefix`, and add AC8 cases with realistic FS-prefixed sources for all three agents.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:36-39,153-165; src/daemon/index.ts:19-25; src/daemon/lifecycle.ts:18-22"
    finding: >-
      The production opener is specified as a `resolveDataDir()`-based DB path, but the daemon's actual SQLite path resolver gives `ECHO_DB_PATH` precedence over `ECHO_DATA_DIR` and only then falls back to the homedir data dir. If an operator or test harness runs the daemon with `ECHO_DB_PATH`, the wizard will open the wrong path, treat the missing default DB as a fresh install, and silently return no atom activity/projects even though the live daemon has data. Patch the wizard to reuse or mirror the daemon's `resolveDbPath()` precedence, and pin an AC8 production-path test for `ECHO_DB_PATH`.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:340-361; backlog/claimed/2026-05-25-072-adapter-sync-engine.md:286-288,346-361,364-379"
    finding: >-
      AC5.7 short-circuits only when `syncResult.syncLock` is populated, but 072 also has top-level no-dispatch failure shapes (`repoRoot` and `directorySymlink`) where no agents or roles ran and `agents` is empty. Under those safety failures, AC5.5 still proceeds to rewrite `onboarding.json` for the selected agents, advancing `last_updated_at` and possibly creating agent records without any adapter dispatch having happened. That leaves the persisted onboarding state looking newer than the actual wiring and hides the safety failure from later resume/summary flows unless the caller kept the transient `syncResult`. Patch AC5.7 to short-circuit on every 072 top-level no-dispatch sentinel (`syncLock || repoRoot || directorySymlink`) with no cache writes and no onboarding mutation, and add wire tests for the non-lock sentinels.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r1 fixes landed in the requested areas, but the current artifact still has production-facing gaps: real atom-store activity will not be detected because source matching is exact instead of prefix-based, custom daemon DB paths are not mirrored, and 072's non-lock safety preflight failures can still mutate onboarding state as if a wire attempt happened.
