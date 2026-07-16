---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 12
combined_at: '2026-07-16T07:26:49Z'
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

Reframe gate: FIRED. Both R12 finding groups (generic `npm run <script>` allowlist admitting `test:operator` with unconstrained argv shapes; HEAD-equality blind to staged/unstaged/nonignored-untracked and install/check-time mutations) target the fresh-clone-verifier mechanism introduced by the r11 patch commits 70012832/5d4637fa — >=2 prior-patch-introduced findings, so the mandatory fresh-context investigator ran (`codex exec --sandbox read-only`, task-state pointers withheld). Investigator verdict: `kind: propagation_completion` — the clean-clone run, two modes, command surface, HEAD binding, and test:operator exclusion all predate r11; r11 only consolidated ownership under one Node verifier, so removing the verifier would recreate the shell contradiction and a second mechanism would create a bypass. R12 exposes incomplete propagation inside the chosen seam, not a flawed seam. Diagnostic check applied before patching: every direct spawn maps 1:1 to an exact `shell:false` executable+argv template; source mode has build=1 and derived-path verify=1; release mode has build=0 and caller-bound verify=1; `test:operator` and every unlisted vector fail before spawn; three `git status --porcelain=v1 --untracked-files=all` empty-stdout checkpoints with mutation fixtures. Recommendation accepted without override; recorded risk: snapshot probes cannot detect a mutate-exercise-restore transient between probes, and ignored paths stay outside porcelain output — accepted for this non-adversarial acceptance gate, whose threat model is accidental mutation, not adversarial children. Patch keeps exactly one Node verifier as exclusive owner; no second verifier, no shell path, no new mechanism.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | both (convergent on `AC3 — Make a sibling-free clean clone fully self-testing; Tests — scripted fresh-clone acceptance`) | AC3 — Make a sibling-free clean clone fully self-testing; Tests — scripted fresh-clone acceptance | accepted — propagation completion per reframe investigator. Sub-finding (a) codex: the generic `npm run <script>` allowlist form is deleted and replaced with exact per-mode shell-free (`shell:false`, executable + argv array) argv templates in exact order and count — explicit no-extra-argument `npm run` calls for typecheck/lint/test:ci/verify:inventory/verify:authority/scan:secrets, exact parameterized build:artifact/verify:artifact templates (source mode: one build then one derived-path verify; release mode: no build, one caller-bound verify), exact `git status --porcelain=v1 --untracked-files=all`, `git rev-parse HEAD`, `npm ci`, `git fsck --full`; `test:operator` stays independently runnable but is explicitly outside and rejected by both mode allowlists; any other executable, script, reordered/extra/missing/duplicate argument or invocation, or shell string fails before spawn. Sub-finding (b) codex-ops: HEAD equality no longer stands alone — three fail-closed empty-stdout clean-tree probes (before install, immediately after `npm ci`, after all checks plus verifier-owned temp cleanup) bind the exercised bytes; staged/unstaged/nonignored-untracked entries, install-time or check-time mutation, and leftover nonignored temp output fail; the verifier removes only its own recorded temp dir, never other mutations (evidence, not cleanup). | _stamped at dispatch: see patch commit below_ |

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex-ops | AC3 — fresh-clone verifier child-process allowlist; Tests — scripted fresh-clone acceptance | accepted — same propagation-completion patch as convergent #1 sub-finding (a): exact per-mode executable+argv template enumeration with mandatory shell-free spawning replaces the underspecified `npm run <script>` language, and the Tests bullet adds disallowed-script, disallowed-executable, extra/reordered/missing-argv, duplicate/missing-invocation, shell:true/shell-string, wrong-mode, test:operator, and source-build-in-release negative fixtures for both modes as applicable. | _stamped at dispatch: see patch commit below_ |

## Convergence call

needs R13 — focus_hints: Verify at the patched exact SHA that the fresh-clone verifier contract is now fully explicit: exact per-mode `shell:false` executable+argv templates with order and once-only counts (no generic `npm run <script>` form anywhere), `test:operator` independently runnable but rejected by both modes, source mode's single build:artifact→verify:artifact pair with verifier-owned derived temp paths, release mode's single caller-bound verify:artifact with no build, and the three fail-closed `git status --porcelain=v1 --untracked-files=all` empty-stdout checkpoints (pre-install, post-npm-ci, post-checks-after-verifier-temp-cleanup) with no auto-cleanup of non-verifier mutations; confirm the negative-fixture list covers dirty-index, dirty-worktree, nonignored-untracked, npm-lifecycle mutation, check-time mutation, leftover-temp, test:operator, disallowed script/executable, extra/reordered/missing argv, shell:true/string command, duplicate/missing invocation, wrong mode, and source-build-in-release.

