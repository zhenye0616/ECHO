---
item_id: 2026-05-13-043-per-round-reviewer-roster
round: 1
reviewer: codex
artifact_sha: d1d9fbc728f7ad4b0e42fb7ab630b4f24cd6350b
completed_at: '2026-05-13T06:17:15Z'
verdict: pushback
findings:
- severity: high
  where: "AC1 combine-side lines 86-95 + AC2 field semantics lines 124-129 + AC6 semantics/tests lines 326-365"
  finding: >-
    The spec does not define one implementable eligibility rule for optional requested reviewers. AC2 says `cursor` is optional but has `timeout_hours: 2` and line 128 says combine declares `partial_responses` for an absent IDE reviewer; AC6 says optional missing reviewers do not block convergence and AC6c returns `proceed`; AC1 only says the missing-past-timeout check uses the required set. Against current `combine.py`, eligibility and verdict are separate phases, so a builder can reasonably implement immediate codex-only combine, wait two hours then emit non-escalated `proceed`, or wait two hours then emit escalated `partial_responses`. Add explicit ACs for `requested_reviewers: [codex, cursor]` with codex present/cursor absent both before and after cursor's timeout, and state whether the terminal verdict is `proceed` or `partial_responses`.
- severity: high
  where: "AC4 lines 242-268 + current tools/review-queue/commit-reviewer-response.sh lines 45-100"
  finding: >-
    The proposed race guard is placed in a boundary the current system does not own. Reviewer prompts already `os.link` the final `codex.md` before calling `commit-reviewer-response.sh`, and the helper currently requires that canonical file to exist before validation. AC4 says to add the guard between `validate.py` and `os.link`, but there is no `os.link` in the helper. Worse, the prescribed `rm -f "$RESPONSE_PATH"` can delete a response after `combine.py` has already observed that uncommitted file and written `combined.md` with `codex_response: codex.md`. Move the terminal-round recheck to the prompt before the atomic link, or make the helper own temp-file-to-final linking, and test the actual current sequence rather than a `codex.md.tmp` fixture that the helper never accepts.
- severity: high
  where: "AC6 N-way rollout lines 278-365 + current tools/review-queue/combine.py lines 276-304 and 306-380"
  finding: >-
    The N-way verdict function is specified, but the end-to-end combine path remains two-reviewer-only. Current `build_combined` discovers only `codex.md` and `cursor.md`, reads only those files, hardcodes cross-review matching between those two names, and writes only `codex_response`/`cursor_response`. The spec does not require replacing that response discovery and body generation with a loop over `requested_reviewers`, nor does any test create a third requested reviewer and prove its verdict and findings affect `combined.md`. That leaves the headline third-reviewer case unimplemented even if `find_eligible_rounds` and `compute_combined_verdict` are generalized.
- severity: medium
  where: "AC2 _reviewers.py lines 131-170 and AC2a lines 192-193"
  finding: >-
    The provided `_reviewers.py` skeleton cannot satisfy AC2a as written. It references `_SLUG_RE` without defining or importing `re`, and `Reviewer(**r)` raises `TypeError` for a missing required field, not the specified `ValueError` with a clear message. It also does not validate the `timeout_hours` mode contract from lines 127-128. Spell out the loader validation path, including `_SLUG_RE`, conversion of constructor/schema errors to `ValueError`, and tests for invalid `timeout_hours` values.
---

# Codex review

Pushback. The direction is right, but the spec still has implementation-level contradictions around optional reviewer timeouts and the late-response race boundary. It also does not yet force the actual `combine.py` path to consume an N-reviewer response set end to end.
