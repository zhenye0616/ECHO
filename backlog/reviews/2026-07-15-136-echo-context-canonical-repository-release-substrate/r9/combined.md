---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 9
combined_at: '2026-07-16T05:21:53Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 10
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

Reframe gate: TRIGGERED — all eight findings target mechanisms introduced or reshaped by prior `spec-r*-patches` commits: the protected-environment policy pin, tag-before-draft write sequence, and lost-response contract (r8 822e6bf5, reshaping r5 3d74d33b / r6 d309cdeb staging), the two-mode fresh-clone argument contract (r2 0f05a7ce, r7 92a03132, r8), and the AC1 baseline-push contract (r1 ad53c6c7 lineage). Non-mechanical, so the mandatory fresh-context investigator ran (`codex exec --sandbox read-only`). Verdict: `propagation_completion` — r4/r5 already removed optional recovery machinery; these findings close missing CAS, comparison, readback, and fixture edges on retained founder-locked controls, and cutting them would break exact-source, no-adoption, protected-environment, or annotated-release guarantees. Diagnostic check applied: the patch adds no lifecycle, no external mutation, no new owner, and no persisted schema — every change tightens an existing contract, and equal-OID pre-existing main/tag refs, a non-HEAD source SHA, a missing/wrong policy type, annotation-byte drift, unmarked mutations, and reordered write traces now all fail by fixture. Investigator risk carried forward: if an Actions run log cannot provide a genuinely durable flushed write-ahead marker across abrupt runner loss, finding #3's row needs founder-directed redesign rather than more propagation prose — listed as an explicit R10 verification focus. Disposition matches the founder's standing instruction for this tick (accept all eight; spec-only propagation completion; no promotion/build). Patch commit: 140d72e1aef66a32e983db574b4248638a7c887c (`spec-r9-patches`).

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC6 — protected-environment policy; Tests — hosting-controls fixtures | accepted — patched (converges with #6) | 140d72e1: AC6 verifier now requires the fully paginated branch-policy set to contain exactly one policy with name `main` AND type `branch`; a tag-type policy named `main` does not authorize `refs/heads/main` and fails; missing/unreadable/non-branch `type` fails closed; wrong-type and missing-type hosting-controls fixtures added |
| 2 | MEDIUM | codex | AC6 — annotated-tag publication sequence; Tests — release-identity fixtures | accepted — patched | 140d72e1: byte-exact UTF-8 annotation oracle defined — literal template `echo-context source release\nversion: <version>\nsource-sha: <source-sha>\n`, three LF-terminated lines incl. mandatory final newline, no CR or whitespace variation; creation writes exactly these bytes and every verification compares read-back annotation bytes to the template; release-identity fixtures rebased onto the oracle (wrong field label/order, missing final newline, CRLF, whitespace drift) |
| 3 | MEDIUM | codex | AC6 — lost or ambiguous external-write responses; Tests — lost-response fixtures | accepted — patched | 140d72e1: flushed write-ahead attempt marker required immediately before every external write (tag push, draft creation, each asset upload, publish update), naming mutation, target, and run/attempt identity; a marker without a recorded response is itself an ambiguous-write signal and reconciliation after it is read-only; marker-before-call ordering fixtures under injected timeout/termination added. Investigator durability caveat (Actions log flush semantics under abrupt runner loss) carried into R10 focus |
| 4 | MEDIUM | codex-ops | AC1 — baseline preflight and initial push | accepted — patched (same CAS contract as #7) | 140d72e1: prepared founder push is create-only compare-and-swap — final pre-write `git ls-remote` absence check plus empty-expect `--force-with-lease=refs/heads/main:` push of 0cf7b006 succeeding only on porcelain new-ref (`*`); any pre-existing `refs/heads/main`, even at the identical OID an ordinary push would adopt as up-to-date, fails for founder disposition |
| 5 | MEDIUM | codex-ops | AC3 — fresh-clone source mode; Tests — scripted fresh-clone acceptance | accepted — patched | 140d72e1: `--mode=source` now fails unless `--source-sha` equals the checked-out clone's full HEAD commit before building, binding the tested/linted tree to the built/verified objects; wrong-source source-mode fixture added to the fresh-clone negative tests |
| 6 | MEDIUM | codex-ops | AC6 — source-release protected environment; Tests — hosting-controls fixtures | accepted — patched (same contract as #1) | 140d72e1: see #1 — exact policy {name: main, type: branch}, fail-closed on missing/unreadable/wrong type, wrong-type and missing-type fixtures |
| 7 | MEDIUM | codex-ops | AC6 — empty-namespace preflight and annotated-tag push; Tests — concurrency and release-identity fixtures | accepted — patched | 140d72e1: annotated-tag push is create-only CAS via empty-expect `--force-with-lease=refs/tags/v<version>:`, succeeding only on porcelain new-ref proof recorded in the run log; an identical expected tag appearing between preflight and push fails the lease instead of reporting an adopting up-to-date success; interleaved identical-tag concurrency fixture added |
| 8 | MEDIUM | codex-ops | AC6 — tag-before-draft sequence; Tests — release-identity fixtures | accepted — patched | 140d72e1: write-ordering trace fixtures prove the exact sequence tag-push → tag-verification readback → draft-create → draft-readback → asset uploads with per-asset readback → publish → post-publish readback; a draft-before-tag-verification or asset/publish-before-draft-readback trace fails even when every object is eventually valid; zero draft writes after tag-verification failure and zero asset or publish writes after draft-readback failure |

## Convergence call

needs R10 — focus_hints: verify the r9 correction patches: create-only CAS semantics for the prepared AC1 initial main push and the AC6 annotated-tag push (empty-expect force-with-lease, porcelain new-ref proof, same-OID pre-existing ref fails instead of adopting, interleaved identical-tag fixture); source-mode `--source-sha` must equal the clone's full HEAD before building (wrong-source fixture); exact protected-environment policy {name: main, type: branch} with missing/wrong-type fail-closed fixtures; byte-exact UTF-8 annotation template oracle incl. final-newline rule with byte-drift fixtures; flushed write-ahead attempt markers before every external mutation with marker-without-response ambiguity semantics, read-only reconciliation, and marker-before-call fixtures under injected timeout/termination — including whether an Actions run log provides a genuinely durable flushed marker across abrupt runner loss or the marker mechanism needs founder-directed redesign; exact write-ordering trace fixtures with zero-write guarantees after each failure point; Tests bullet alignment for all of the above.

