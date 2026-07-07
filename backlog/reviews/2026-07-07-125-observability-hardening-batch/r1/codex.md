---
item_id: "2026-07-07-125-observability-hardening-batch"
round: 1
reviewer: "codex"
artifact_sha: "a0b97cf7da7606520cb6239d15d97776776703a4"
completed_at: '2026-07-07T06:40:54Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Acceptance Criteria / AC3"
    finding: "The proposed dedupe guard is check-then-append and therefore not atomic; the AC currently promises exactly one atom without naming an atomic primitive or scoping the claim. Patch the spec to either require an existing atomic/unique append mechanism, or explicitly scope the guard and test to the sequential markPosted-throw retry edge while calling concurrent duplicate appends out of scope."
  - severity: "medium"
    where: "Acceptance Criteria / AC4"
    finding: "`--note <note_id>` seed listing is undefined when no card atoms exist, because AC1 derives the seed store from a card atom channel_id but AC4 is specifically the no-card-atom path. Patch AC4 to state the exact store resolution order/set, including how `--seed-store <path>` interacts with note mode, and add the concrete fixture expectation."
  - severity: "medium"
    where: "frontmatter files_to_modify / Acceptance Criteria / AC2"
    finding: "AC2 requires a destroyed-client proxy-stream test for `src/brain/brain.ts`, but `files_to_modify` only permits `tests/tools/` and `tests/enrich/` test paths. Patch the allowed file list and AC2 to name the exact brain/proxy test file and command the builder must run."
  - severity: "low"
    where: "Acceptance Criteria / AC5"
    finding: "AC5 includes an optional PRESENT-db test variant, which cannot be enforced as an acceptance criterion. Patch the spec to either remove the optional test from AC5 or make it a required, concrete test with its exact path and assertion."
---
