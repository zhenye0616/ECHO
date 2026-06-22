---
item_id: 2026-06-21-106-granola-meeting-signal-extraction
round: 1
combined_at: '2026-06-22T06:17:07Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 2
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

**Reframe gate:** N/A — this is r1; there are no prior-round patch commits, so 0 findings target prior-round mechanism (< 2). Mandatory investigator does not fire. All 7 findings target original spec text → must-patch precision, not patch-on-patch.

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC2 — source_span format | accepted — patched | `248910e3` — `source_span` is now an explicit object: `{kind:"summary"}` or `{kind:"transcript",start_time,end_time,quote}` reading the **structured** transcript items (not the flat blob). canonical_subject normalization defined. |
| 2 | MEDIUM | codex | AC3 — supersede ambiguity | accepted — patched | `248910e3` — run family fixed to `note_id` (version is provenance only); deterministic latest-wins = manifest not in any `supersedes`, tie-break `completed_at` DESC then `extraction_run_id` DESC. Cannot return both v1+v2. Architecture line aligned. |
| 3 | MEDIUM | codex | AC4 — untestable defaults | accepted — patched | `248910e3` — concrete config keys + defaults: SETTLE_MS=600k, WORKER_INTERVAL_MS=300k, MAX_RETRIES=2, MAX_NOTES_PER_TICK=5, LEASE_TTL_MS=900k; error surface = 104 logged-error pattern. |
| 4 | MEDIUM | codex | AC5 — MCP filter schema | accepted — patched | `248910e3` — named the one schema change: `metadata_match` scalar=equality, array=set-membership (back-compat); canonical_subject = exact-normalized; free-text via existing `query`. Exact example query given. |
| 5 | MEDIUM | codex | AC6 — provider not implementable | accepted — patched | `248910e3` — AC6 now **reuses 105's** provider/model + credential resolution (builder confirms module at ready); injectable `extractFn` mock boundary; model config-overridable. 105 added to spec_refs. |
| 6 | MEDIUM | codex-ops | AC4:86 — no lease/overlap/stale recovery | accepted — patched | `248910e3` — durable atomic per-`note_id` lease at `~/.echo/state/granola-signals-claims.json`; active-claim skip; stale-TTL reclaim; manifest-last crash-idempotency (orphan atoms never selected); overlap + crash tests added. |
| 7 | MEDIUM | codex-ops | AC6:99 — no provider-failure runtime contract | accepted — patched | `248910e3` — startup credential validation + self-disable (104 AC4); bounded retry/backoff; cost cap (MAX_NOTES_PER_TICK); `status:"failed"` manifest (no spin); missing-config + failure/rate-limit tests added. |

## Convergence call

`needs R2` — focus_hints: verify the 7 r1 precision patches at `248910e3`: (AC2) source_span object shape references structured transcript items; (AC3) latest-wins is deterministic and cannot return two runs; (AC4) lease + stale-reclaim + crash-idempotency are coherent and the defaults are sane; (AC5) `metadata_match` array-membership is the only schema change and is back-compat; (AC6) reusing 105's provider path is a real, locatable mechanism, not a re-invention.

