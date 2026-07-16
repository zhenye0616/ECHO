---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
verdict: redo before merge
reviewed_at: '2026-07-16T09:50:01Z'
test_counts:
  passed: 1025
  failed: 0
producer: review-pending-orchestrator
---
## Verdict
Redo before merge. Independent review at Project_echo head 25b833332bb22ec79700fcdf31b9c9f20eea79f5 and echo-context head 145868a67a85dbb651faed457ee4001370c0fad0 found the extraction, authority boundary, clean-clone CI, and deterministic source artifact sound, but AC4 and AC6 are not satisfied. The publication controller can declare success after asset identity replacement, mandatory executable fault/recovery fixtures are largely absent, and the reviewed private GitHub protection/environment-reviewer mechanism is unavailable on the current account topology. No target-main merge or release is authorized from these heads.

## Pre-merge fixups
- [ ] Reframe AC4/AC6 through fresh exact-SHA specification review: replace the unavailable private-repository branch-protection plus required-environment-reviewer mechanism with an enforceable delegated exact-tuple authorization gate; preserve private visibility, two explicit dispatch phases, fail-closed readback, and no retry/adoption/cleanup.
- [ ] `tools/release-publication-controller.mjs` — retain the captured release and all three asset IDs/sizes/digests; at the final boundary re-read exact release identity/name/tag/flags, require the exhaustive namespace to contain those exact IDs, and re-download/re-hash every exact asset ID before success.
- [ ] `tools/release-publication-controller.mjs` — parse and validate every mutation response body, including publish PATCH; malformed or identity/flag-mismatched bodies are ambiguous failures even when later readback looks correct.
- [ ] `tools/release-publication-controller.mjs` — emit and preserve the sanitized `git push --porcelain` created-by-this-run proof after validating `* [new tag]`.
- [ ] Release orchestration/tests — introduce injected Git/HTTP/log/process-loss adapters and executable table-driven fixtures for repository creation/CAS, full pagination/auth failure, every write response/readback/lost-response/timeout/hard-loss boundary, zero-later-write behavior, log loss, cold recovery, nonempty namespaces, ID drift/replacement, and exact final postconditions.
- [ ] Fresh-clone/secret/workflow governance tests — add the spec-enumerated mutation, cleanup-failure, non-owned-sentinel, scanner failure/non-disclosure, wrong-boundary, dispatch/rerun, and repository-creation fixtures; parse workflow structure instead of relying chiefly on source-string assertions.
- [ ] Release workflow — move hosting/authorization verification into an unprivileged prerequisite before any approval/write-capable job, grant only scopes actually available to that verifier, and rerun all local plus hosted checks on the corrected exact head.
- [ ] Obtain a fresh independent implementation review against the corrected Project_echo and echo-context exact heads before either main merge.

## Expected merge conflicts
- `backlog/task-state/2026-07-15-136-echo-context-canonical-repository-release-substrate/builder.md` — current main contains newer reviewer/coordinator continuity state; preserve current-main history and regenerate the builder handoff for the corrected target head instead of taking the stale feature-side pointer wholesale.
- The echo-context PR itself is currently conflict-free against its frozen baseline, but this preview becomes stale after the required reframe and repair commits and must be rerun.

## Follow-up items (defer, do not block merge)
- None. Every substantive high/medium finding above is blocking for item 136 and must be resolved within this item.
- Reviewer replay independently observed 77 files, 1,025 passed, 17 skipped, 0 failed plus three exact-head hosted checks; one of two operator replay legs could not run in an intentionally offline cold cache, so the corrected exact head must rerun the complete operator evidence.
