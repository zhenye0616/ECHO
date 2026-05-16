---
item_id: "2026-05-15-057-coord-layer-narrow-append-and-deadlines"
round: 1
reviewer: "codex"
artifact_sha: "c9b712865f67a6c7a5aab6ed07ce4ef40461d695"
completed_at: '2026-05-16T03:35:33Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC0 lines 111-117; tools/review-queue/request.py lines 114-119; skills/review-queue-watch.md lines 116-126 and 146"
    finding: >-
      AC0 places the active trigger in `request.py` "after the `request.md` commit+push lands", but `request.py` does not commit or push; it only writes and validates the request file, while the watcher commits and pushes later. If the builder implements the invoke in `request.py`, the daemon can spawn the reviewer before `backlog/reviews/.../request.md` exists on `origin/main`; the reviewer prompt's first step pulls `origin/main`, sees no candidate, and exits as a false no-op. Patch the spec to put `coord_invoke` after the relevant `push-with-retry.sh` succeeds in the watcher/dispatch flow, or define a concrete post-push hook boundary. The roundtrip test should use a fake wrapper that does the same pull-and-scan check so this ordering bug is falsifiable.
  - severity: "high"
    where: "AC0 lines 113-114; AC2 lines 144-160; AC5 line 186; tools/review-queue/reviewers.json lines 5-23; tools/review-queue/_run_reviewer.sh lines 23 and 49-53"
    finding: >-
      The role config contract does not line up with the queue's existing reviewer identity. AC0 depends on `coord-roles.json` entries having `headless: true` and `invoke_command`, but AC2's sample/schema requirements omit both fields. The sample role name is `codex-reviewer`, while the queue roster and wrapper identity are `codex` / `codex-ops`, and AC0's test calls `coord_invoke(role=codex)`. Without a canonical mapping, `request.py` cannot decide which requested reviewers are invokable, the daemon cannot find the command to spawn, and AC5 can reject the wrapper's `X-Echo-Role`. Patch AC2 to require the launch fields for headless roles and either make `name` exactly the reviewer slug or add an explicit `reviewer_slug` mapping with tests for `codex` and `codex-ops`.
  - severity: "medium"
    where: "AC2 lines 159-160; tools/review-queue/schemas/reviewers-config.schema.json lines 1-3; tools/review-queue/_reviewers.py lines 92-108"
    finding: >-
      AC2 says the JSON schema validates `max_deadline_sec > default_deadline_sec`, but the current schema tooling is draft-07 JSON Schema and the existing reviewers config enforces cross-field mode/timeout rules in Python, not in the schema. A builder cannot express sibling numeric comparison portably in the checked-in schema alone. Patch the acceptance criteria to require a `coord-roles` loader/validator that performs this comparison in code, and add a failing fixture where `max_deadline_sec <= default_deadline_sec` is rejected.
  - severity: "medium"
    where: "AC5 lines 184-188; AC7 lines 207-211; src/mcp/server.ts lines 103-136"
    finding: >-
      The identity model only works for curl-style wrappers unless the spec defines how native MCP clients supply identity. AC5 says the daemon derives the role from `X-Echo-Role` and ignores caller-supplied `role`; AC7 then says Cursor's IDE-mode reviewer emits through the MCP tool surface with no curl. Existing MCP tool handlers are registered per request but receive only tool input unless `server.ts` explicitly captures request headers and closes over them, and Cursor/other MCP clients generally do not expose a per-tool `X-Echo-Role` header knob. Patch the V1 contract to either scope authenticated emission to wrappers only, define a concrete native-MCP identity injection path, or allow a local signed/validated role parameter. Add a test for the chosen Cursor/strategist path instead of only testing curl headers.
  - severity: "medium"
    where: "AC3 lines 167-170; src/storage/interface.ts lines 50-62"
    finding: >-
      The deadline-missed idempotency key is too coarse for the open-record model and the lookup path is not grounded in the current storage API. AC3 tracks open records by `(correlation_id, expected_by, role, event_type)`, but the idempotency key is only `sha256(correlation_id + '|deadline_missed')`, so two roles or two expected completions under the same correlation_id would collapse to one missed-deadline atom. Also, the current `metadata_match` whitelist cannot query a nested `coord.idempotency_key`; an implementation must either scan recent coord atoms or extend the storage filter deliberately. Patch the key to include the distinguishing fields and specify the lookup mechanism, with a restart test covering two overdue records sharing one correlation_id.
  - severity: "medium"
    where: "AC1 lines 135-139; AC4 lines 176-179; files_to_modify lines 24-38; src/mcp/util/fs-exclusion.ts lines 16-28; src/mcp/tools/wait-for-new-turns.ts lines 144-162; src/mcp/tools/search-memories.ts lines 232-239"
    finding: >-
      The coord non-pollution rule needs a sharper file/test contract because the obvious implementation can break the mailbox. AC1 requires `search_memories()` with no filter to exclude `metadata.surface='coord'`, but `files_to_modify` does not list `search-memories.ts` or the shared exclusion helper. If a builder adds `coord` to the existing `withFsExclusion` helper, `wait_for_new_turns(source_prefix='coord:')` will also filter out the coord atoms AC4 needs to deliver. Patch the file list and tests so `search_memories()` excludes coord by default, `search_memories(source_prefix='coord:')` can still retrieve coord atoms, and `wait_for_new_turns(source_prefix='coord:')` returns coord turn ids.
---

# Codex Review

Verdict: `proceed_after_patches`.

The coord-layer direction is implementable, and the spec is already anchored to the right substrate: append-only atoms plus a durable mailbox rather than a new push bus. The patches needed before build are mostly boundary fixes.

The load-bearing one is AC0's ordering: the active trigger has to run after the request commit is visible on `origin/main`, not from `request.py` before the watcher commits. The other blockers tighten the config and identity contracts so the daemon can actually map a requested reviewer slug to a spawn command and a trusted coord source. The remaining medium findings are testability/implementation hazards around cross-field config validation, deadline idempotency, and keeping coord atoms out of normal search without suppressing the coord mailbox itself.
