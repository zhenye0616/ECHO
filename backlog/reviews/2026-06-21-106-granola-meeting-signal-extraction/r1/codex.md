---
item_id: "2026-06-21-106-granola-meeting-signal-extraction"
round: 1
reviewer: "codex"
artifact_sha: "30fba46390b838570f8ea0d364906c0ca6a35cb6"
completed_at: '2026-06-22T06:12:13Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC2 — Signal metadata makes cheap surfacing possible"
    finding: "The spec requires `source_span` to be a transcript time-range, but the artifact describes the predecessor transcript as a flat blob. Patch AC2 to either cite the timestamp field available on raw Granola transcript atoms or define a fallback span format such as character offsets, line ranges, or `summary`."
  - severity: "medium"
    where: "AC3 — Append-only re-derivation via per-run manifest"
    finding: "The supersede contract is internally ambiguous: AC3 says `supersedes` is for the prior run in the note/version family, while the Tests section expects an extractor_version bump to supersede the prior version. Patch the spec to define the exact run family, latest-wins query algorithm, and deterministic tie-breaker so retrieval cannot return both v1 and v2 runs or choose arbitrarily."
  - severity: "medium"
    where: "AC4 — Async enrichment worker, debounced on settle"
    finding: "The worker contract is not testable as written because `N minutes`, retry policy, cost budget, and the operator-visible error surface are all unnamed. Patch AC4 with concrete defaults or config keys, retry/cost limits, and the exact log/error path or helper the tests should assert."
  - severity: "medium"
    where: "AC5 — Signal-level retrieval"
    finding: "The retrieval API shape is underspecified: the example uses equality-style `metadata_match`, then requires `signal_type ∈ {decision, rationale}` and allows `or equivalent`. Patch AC5 to name the exact MCP input schema for scalar and set membership filters, including whether canonical_subject is exact, normalized, or fuzzy."
  - severity: "medium"
    where: "AC6 — Extraction is itself an ECHO dogfood"
    finding: "`Provider = latest Claude model per global guidance` is not an implementable contract for a builder or a stable test target. Patch AC6 to point at the existing provider/model resolution mechanism or define the config/env key and injectable mock boundary used by the extractor tests."
---
