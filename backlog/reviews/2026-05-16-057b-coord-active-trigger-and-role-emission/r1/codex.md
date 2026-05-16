---
item_id: "2026-05-16-057b-coord-active-trigger-and-role-emission"
round: 1
reviewer: "codex"
artifact_sha: "be6dcce8a3d1d2390a447cc64c0e3d5ecfecf724"
completed_at: '2026-05-16T06:49:21Z'
verdict: "pushback"
consumed_task_state: false
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:116"
    finding: >-
      The correlation_id contract is internally inconsistent. AC0 and request.schema.json require
      a 36-character UUID-ish value (`^[a-f0-9-]{36}$`), but AC7 tells request.py to generate
      `uuid.uuid4().hex`, which is 32 lowercase hex characters. A builder following the spec will
      create request.md files that fail the new schema and coord_invoke validation, so the active
      trigger path cannot start. Patch the spec to use one representation everywhere and add an
      assertion that request.py output passes request.schema.json and coord_invoke input validation.
  - severity: "high"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:130"
    finding: >-
      `tick_failed_to_bind` is specified as the terminal event for pinned-request validation
      failures, and AC8 expects it to close the pre-spawn deadline, but the declared 057a substrate
      closes records only when an event_type equals the opener's `expects` value. 057a has
      reviewer_invoked expecting tick_start, not tick_failed_to_bind, and 057b explicitly forbids
      daemon-side deadline tracker changes. As written, every bind failure still leaves the
      reviewer_invoked deadline open until it fires deadline_missed. Patch either the substrate
      contract to support alternate terminal closers before 057b, or change 057b to emit events that
      the existing tracker can actually close.
  - severity: "high"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:114"
    finding: >-
      AC0 says coord_invoke loads the 057a coord-roles.json invoke_command and substitutes
      REQUEST_PATH/CORRELATION_ID tokens, but 057a's declared argv vector only contains WT and the
      057b files_to_modify list never includes coord-roles.json. In the current reviewer runner,
      prompt routing and worktree setup live in _run_reviewer.sh/reviewers.json; a bare argv from
      coord-roles.json would not necessarily read the review prompt or enter pinned-request mode.
      Patch 057b to explicitly update the coord-roles command vectors, environment, and prompt/stdin
      handoff that coord_invoke will spawn, with a test that the spawned process receives the pinned
      request variables and the canonical prompt bytes.
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:79"
    finding: >-
      The spec says 057b must not be claimed until 057a is in complete, but its mandatory spec_ref
      points at backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md. Once the
      dependency is actually shipped, the builder loop's required spec_ref read will target a stale
      path and fail cold-start discipline. Patch the reference to the eventual complete/ path before
      marking 057b claimable, or make the spec explicitly list both paths with a deterministic
      fallback.
---

# Codex review - r1

Verdict: pushback.

F1 is a direct validation break: the requested UUID string cannot both be `.hex` and match the 36-character schema. F2 is a lifecycle break between 057b's pinned-request failure path and 057a's existing `expects`-based close rule. F3 leaves the active-spawn command underspecified against the current headless runner plumbing. F4 is a dependency-path issue that will surface when 057a moves from ready to complete.
