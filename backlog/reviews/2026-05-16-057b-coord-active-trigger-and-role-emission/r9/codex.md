---
item_id: "2026-05-16-057b-coord-active-trigger-and-role-emission"
round: 9
reviewer: "codex"
artifact_sha: "401867bb82a56dac51d9307d03a2abef5914230f"
completed_at: '2026-05-16T19:09:40Z'
verdict: "pushback"
consumed_task_state: false
findings:
  - severity: "high"
    where: "skills/review-queue-watch.md:187; skills/review-pending.md:245; tools/review-queue/coord-emit.sh:97-103"
    finding: >-
      The production active-trigger hook uses urllib to call coord_invoke with only Content-Type and X-Echo-Role headers. The same patch correctly documents in coord-emit.sh that StreamableHTTPServerTransport rejects MCP POSTs unless Accept includes both application/json and text/event-stream, and every passing Node MCP test sets that header. As written, the post-push hook that is supposed to activate 057b's reviewer spawning will get 406-rejected by the daemon and fall back to launchd cadence, so the core active-trigger path remains inactive. Add Accept: application/json, text/event-stream to both Python hook request headers and cover coord_invoke over the actual HTTP transport.
  - severity: "high"
    where: "tests/coord/coord-invoke-spawns-wrapper.test.ts:88-93; tests/coord/coord-invoke-fire-and-forget.test.ts:83-90; src/mcp/tools/coord-invoke.ts:136-147"
    finding: >-
      The shipped Vitest happy paths call coord_invoke(role='codex'), and the production handler immediately spawn()s tools/review-queue/run-codex-reviewer.sh with the real repo root. There is no child_process mock or test-only wrapper injection, so running the test suite starts detached headless reviewer ticks on the developer machine/CI while the assertions only inspect in-memory storage. That can create worktrees, logs, queue-error pushes, or real Codex invocations outside the test's control. Make the spawn/path resolver injectable or use a temp ECHO_REPO_ROOT plus fixture wrapper/coord-roles config, and assert no production wrapper is executed during tests.
  - severity: "medium"
    where: "skills/review-queue-codex.md:73-78; skills/review-queue-codex-ops.md:71-76; skills/review-queue-claude.md:71-76"
    finding: >-
      AC0 says a pinned-request bind-validation failure emits tick_end(outcome=bind_failed, reason=...) and exits non-zero, but all three reviewer prompts exit 0 after emitting bind_failed. That makes a broken active-spawn bind look like a clean wrapper tick to launchd/log consumers; only the coord atom carries the failure. Change the bind-failure branch to exit non-zero after the tick_end emission, while preserving the already-required reason enum.
---

# Codex Review R9

Verdict: `pushback`.

I reviewed the pending-review artifact at `401867bb82a56dac51d9307d03a2abef5914230f` and the implementation head recorded in it, `38246c1972957ef3ba5f3b90599f02c48d15b8d4`.

The main coord_invoke implementation has the intended validation and spawn ordering, but the active trigger cannot reliably reach the daemon from the watcher hook because the Python MCP request is missing the transport Accept header. Separately, the current tests exercise the happy path by spawning the real reviewer wrapper; I did not run those tests from this review tick because the test code itself has uncontrolled production side effects.
