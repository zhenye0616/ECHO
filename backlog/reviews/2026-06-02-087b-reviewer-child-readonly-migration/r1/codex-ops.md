---
item_id: "2026-06-02-087b-reviewer-child-readonly-migration"
round: 1
reviewer: "codex-ops"
artifact_sha: "09f831d153c2895fd84c23fd6c1a276d2c65dd92"
completed_at: '2026-06-03T06:15:30Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md:56; backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md:63-68; backlog/pending_review/2026-06-02-087-reviewer-invocation-argv-contract.md:69-71; backlog/pending_review/2026-06-02-087-reviewer-invocation-argv-contract.md:85-88"
    finding: >-
      The unattended read-only path still has no durable content channel. AC1/AC2 say the child emits review content via 087's capture.kind, then AC3 flips codex/codex-ops read-only and AC6 forbids new capture-kind scope. But 087 only wires today's headless capture, committed_file, where the child writes the canonical sidecar itself; the non-committed content captures are only forward-stable schema/data. If a launchd tick runs this spec literally, the read-only child can no longer create the only currently wired artifact, and the wrapper has no specified source of truth to validate or commit. Patch the spec to name and wire the replacement capture path for each headless reviewer, such as stdout/final_message or a wrapper-owned temp file outside the child sandbox, and add rc=0/no-content plus malformed-content fixtures that prove the wrapper emits a durable queue-error instead of silently re-polling forever.
  - severity: "high"
    where: "backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md:56-64; backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md:16-19"
    finding: >-
      Moving only the reviewer.md write+commit out of the child leaves the queue lifecycle in the wrong actor. Today's reviewer prompt emits tick_start/tick_end and journals only after its own response commit succeeds; after 087b, the child is supposed to be content-only and cannot know whether the wrapper's schema validation, os.link race guard, upstream-duplicate check, commit, push, and journal commit succeeded. If the child still emits tick_end before wrapper publish, coord can record completed for a response that later fails validation or push; if the prompt drops those post-commit steps without moving them to the wrapper, tick_start remains open until deadline_missed even when the wrapper successfully publishes. AC1/AC2 need to make the wrapper own tick_end outcome emission and post-response journaling, with tests for validation failure, push failure, duplicate_response/upstream_duplicate, and successful publish.
---

# codex-ops review

Verdict: `pushback`.

The trust-boundary direction is right, but the runtime contract is not safe yet. A read-only child needs an explicit non-committed capture channel before the sandbox flip, and the wrapper must own the coordination/journal lifecycle once it owns the publish step. Otherwise a 03:00 launchd tick can either lose valid review content or report queue completion before the canonical response actually lands.
