---
item_id: 2026-05-13-043-per-round-reviewer-roster
round: 1
combined_at: '2026-05-13T06:19:17Z'
codex_response: codex.md
cursor_response: null
patch_commit_sha: null
next_round: null
combined_verdict: single_reviewer_timeout
escalated_to_founder: true
---

# Combined findings

**Single-reviewer disposition (off-protocol override, founder-authorized 2026-05-12 ~16:44 PDT).** Strategist drives single-reviewer disposition; AC8 stays at 0. Codex's verdict was `pushback` (not proceed_after_patches) — signals structural revision needed; all 4 findings real.


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC1 combine-side + AC2 field semantics + AC6 semantics/tests | **Accept patch.** Resolve the ambiguity by stating one rule: `required: true` means combine waits indefinitely for headless reviewers OR up to `timeout_hours` for ide reviewers; absence past that → `partial_responses`. `required: false` means combine treats absence as non-blocking (eligible as soon as required set complete); late-landing response is rejected by AC4. To preserve "default deploy unchanged" (AC7), `reviewers.json` default has BOTH `codex.required: true` AND `cursor.required: true` (current behavior). Speed gains from `cursor.required: false` are a separate config decision, not bundled with 043. Add AC1c/AC1d/AC1e test cases enumerating the three eligibility×timeout combinations. | Spec-patched in r1 disposition commit |
| 2 | HIGH | codex | AC4 race-guard placement | **Accept patch.** Move the `combined.md` existence check from `commit-reviewer-response.sh` into the reviewer prompts' Step 5, immediately BEFORE the `os.link(tmp, final)` call (the prompt is where the `os.link` lives; the helper is downstream and doesn't own the atomic link). Update AC4 test fixtures to drive the prompt path (or extracted helper function), not a `codex.md.tmp` against the commit helper. | Spec-patched in r1 disposition commit |
| 3 | HIGH | codex | AC6 N-way + build_combined two-reviewer hardcoding | **Accept patch.** Extend AC6 with explicit `build_combined` generalization: replace hardcoded codex.md/cursor.md discovery with `for reviewer in request.requested_reviewers: read r<N>/<reviewer>.md if exists`; replace fixed `codex_response`/`cursor_response` field writes with per-reviewer loop; replace pairwise codex×cursor cross-reference matching with N-way (per-`where`-key) cross-reference matching. Add AC6h test case: 3-requested-reviewer round (codex + cursor + synthetic `codex-arch`), all three present with unanimous proceed → combined verdict proceed AND all three responses listed AND findings cross-referenced across all three. | Spec-patched in r1 disposition commit |
| 4 | MEDIUM | codex | AC2 _reviewers.py skeleton bugs | **Accept patch.** Replace the AC2 implementation skeleton with a correct one: import `re`, define `_SLUG_RE = re.compile(r"^[a-z][a-z0-9-]*$")`, wrap `Reviewer(**r)` in try/except TypeError → ValueError with field-name in message, validate `mode=headless requires timeout_hours is None` and `mode=ide requires timeout_hours is positive number`. Add AC2d test case explicitly: `timeout_hours: 0`, `timeout_hours: -1`, `timeout_hours: "string"`, `mode=headless + timeout_hours: 2` all rejected with clear messages. | Spec-patched in r1 disposition commit |

## Convergence call

`needs R2 — focus_hints: Verify AC1's three-rule semantics (required×mode×timeout matrix) is unambiguous; verify AC4's race-guard now lives in the reviewer prompt's Step 5 (not commit-reviewer-response.sh); verify AC6's build_combined generalization replaces ALL three two-reviewer-hardcoded sites (discovery, response-field write, cross-ref matching); verify AC6h test case actually exercises a 3rd reviewer; verify AC2's _reviewers.py skeleton compiles and the timeout_hours/mode contract is tested.`

