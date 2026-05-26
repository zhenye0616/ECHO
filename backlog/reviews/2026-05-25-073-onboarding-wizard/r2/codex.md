---
item_id: "2026-05-25-073-onboarding-wizard"
round: 2
reviewer: "codex"
artifact_sha: "6a5a1778ece70705fe398a79ac460961e85135e9"
completed_at: '2026-05-26T02:58:54Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:151,188-192,208; src/storage/interface.ts:12-15; src/mcp/util/source-app.ts:17-23; src/capture/extractors/codex.ts:801; src/capture/extractors/claude-code.ts:583; src/capture/extractors/cursor.ts:1342"
    finding: >-
      AC1.3 still treats Storage.source as the logical app name, and AC2 leaves sourceBreakdown keyed as if rows already carry app identifiers. In the current storage layer, exact source filtering only matches the raw CaptureEvent.source string; the capture extractors append codex, claude-code, and cursor rows with fs: source paths, while the existing source_app layer maps those apps to source_prefix values. A production detectAgents() implementation that follows the spec with query({ source: 'codex' }) / 'claude_code' / 'cursor' will miss existing activity, and detectProjects() will either emit raw source paths in sourceBreakdown or need to invent an unstated classifier. Patch AC1.3 and AC2.2 to use the shared source-app prefix/classification contract, and pin tests with realistic fs: sources rather than only fake enum sources.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:39,153-165,469,478; src/daemon/index.ts:20-24; src/daemon/lifecycle.ts:18-22"
    finding: >-
      The production opener is specified as resolveDataDir-derived, but the daemon's actual SQLite path resolver honors ECHO_DB_PATH before ECHO_DATA_DIR/defaulting to Application Support. Because resolveDbPath() is currently private to src/daemon/index.ts, a builder following 073 will either duplicate the wrong path logic or silently ignore ECHO_DB_PATH; in that environment onboarding returns atomActivity:null / [] even though the daemon is writing a real DB elsewhere. Patch the spec to share/export the daemon DB path resolver or spell out the exact ECHO_DB_PATH -> ECHO_DATA_DIR -> default precedence, and add a production-path test for the ECHO_DB_PATH branch.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:355-359,508; backlog/claimed/2026-05-25-072-adapter-sync-engine.md:305,346-357,620"
    finding: >-
      The lock-failure semantics are correct at a high level, but the pinned test shape is stale relative to the 072 contract this spec blocks on. 073's AC8.5 case 11 mocks code:'EEXIST', file:'~/.echo/locks/sync.lock', and a pid/since message; current 072 specifies the per-user lock at ECHO_HOME_PATHS.state/adapter-sync.lock, maps an existing lock to code:'RETRY_CONFLICT', and returns a manual rm message instead of pid/since metadata. If the builder copies the 073 fixture, the no-mutation branch can pass against an impossible SyncResult while 074 surfaces the wrong operator text. Keep the branch keyed on syncResult.syncLock being populated, but update the test fixture and prose to the actual 072 lock result shape.
---

# Codex review

Verdict: `proceed_after_patches`.

The r2 patches close the direct SqliteStorage side-effect hazard, the lock no-dispatch branch, and completed-flag ownership. The remaining blockers are narrower: use the existing source-app prefix/classifier contract for real atom activity, share the daemon DB path resolver including `ECHO_DB_PATH`, and align the lock-failure fixture with 072's current shape.

I reviewed `backlog/ready/2026-05-25-073-onboarding-wizard.md` at `6a5a1778ece70705fe398a79ac460961e85135e9`, the r2 request focus hints, and current code/spec refs named above. I did not consume task-state for this reviewer tick.
