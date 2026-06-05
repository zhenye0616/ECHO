---
item_id: 2026-06-05-092-release-workflow-and-voting-ci
round: 2
combined_at: '2026-06-05T21:08:58Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC2b / AC5 | accepted — patched (text_patch; mechanism kept) | `841d4358` — AC2b: rehearsal now reachable WITHOUT a tag via a `pull_request`/`push` trigger for the pre-merge window (`workflow_dispatch` explicitly noted as post-merge-only, since GitHub can't dispatch a new workflow before it's on the default branch). AC5 split: the BUILDER gate is local/static (`npm pack` + `actionlint`/YAML `needs:`-wiring assertion + locally-runnable validation steps); the full GH-matrix run is a **founder/manual post-merge** carve-out — consistent with the original "real GH run is the truth, not a unit-test gate." Investigator-confirmed text_patch (mechanism load-bearing, not over-built). |
| 2 | MEDIUM | codex-ops | backlog/proposed/2026-06-05-092-release-workflow-and-voting-ci.md:69 | accepted — patched (text_patch; mechanism kept) | `841d4358` — AC2 now pins ONE OS-portable SHA-256 verifier: a Node `crypto` one-liner run after `actions/setup-node`, before install, on every matrix OS; explicitly forbids `sha256sum -c`/`shasum`/`certutil` (absent/shell-divergent on default Windows runner). Node guaranteed present (validation installs+runs the Node CLI). Applies to both publish and rehearsal paths. |

## Convergence call

needs R3 — proposed-artifact verification round (forced for proposed specs). Both r2 findings were `proceed_after_patches` refinements of r1-introduced mechanisms; patches landed in `841d4358`. focus_hints: verify AC2 Node-`crypto` portable checksum verifier (no `sha256sum`/`certutil`; runs after `setup-node`, before install, all OSes) / AC2b pre-merge `pull_request`+`push` trigger vs post-merge-only `workflow_dispatch` (new-workflow default-branch constraint correctly stated) / AC5 builder-local-static gate (`npm pack` + `actionlint`/YAML `needs:`-wiring) with the full GH-matrix run as founder/manual post-merge carve-out. Confirm no new mechanism was introduced and the spec is builder-executable end-to-end.

**Reframe gate: FIRED (2 prior-patch-introduced findings, both target r1 patch `a87c3524`).** Per the mandatory ≥2 trigger (no bypass — both have AC-semantics effects), ran a fresh-context read-only `codex exec` investigator (session `019e999f`). Verdict: **`text_patch` for both** — AC2b (rehearsal) and the AC1/AC2 checksum are load-bearing, not over-built; the fixes are refinements, not removals. Removal proof matrix NOT required (no removal-language disposition). Strategist validated-and-applied (not rubber-stamped): adopted text_patch, and on the investigator's own flagged risk path ("wrong if the repo cannot run a newly-added workflow pre-merge → AC5 needs a founder/manual post-merge carve-out instead of a builder gate") diverged to make AC5's GH-matrix run a founder/manual post-merge check, since ECHO's builder flow does not guarantee a PR/branch-CI run for a brand-new workflow file.

