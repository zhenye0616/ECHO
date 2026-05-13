# 043 brainstorm — Codex pushback findings (2026-05-13)

**Context.** Strategist (Claude Code) was brainstorming `2026-05-13-043-per-round-reviewer-roster` (generalize the cross-tool review queue's 2-reviewer assumption to N reviewers; default deploy unchanged). Three approaches proposed; strategist's recommendation was Approach 1 ("config-driven roster + headless plumbing").

**Pushback fired via `codex exec` (read-only sandbox, ~2 min).** Codex was given verbatim:
- All three approaches as proposed
- The 5 hardcoding points strategist had enumerated
- The founder's constraint (default deploy = unchanged; YAGNI on features beyond N-reviewer enablement)

Codex returned 11 findings (6 HIGH, 5 MED) and a substantively different recommendation: **Option D — smaller, sharper scope.**

## Codex's findings (verbatim, with strategist's disposition)

### 1. HIGH — requested roster is ignored
**Where:** `.claude/commands/review-queue-codex.md:22`, `.claude/commands/review-queue-cursor.md:22`, `tools/review-queue/schemas/request.schema.json:42`
**Finding:** `requested_reviewers` already allows subsets, but reviewer prompts only check "is my `<name>.md` missing?" — they never parse `request.md` to confirm they were requested. Any N-reviewer design that does not fix this will cause unrequested reviewers to write responses.
**Strategist disposition:** ✅ Accepted. This is the load-bearing fix. Promoted to AC1 of the 043 spec.

### 2. HIGH — combine must be per-round, not global-roster driven
**Where:** `tools/review-queue/combine.py:135`, `tools/review-queue/combine.py:158`, `tools/review-queue/request.py:93`
**Finding:** Approach 1 says config roster is source of truth, but the active set for a round should be `request.requested_reviewers`. Otherwise adding a third configured reviewer can make old/default rounds wait for a reviewer that was never requested.
**Strategist disposition:** ✅ Accepted. Folded into AC1. The strategist's original Approach 1 had this exact architectural error.

### 3. HIGH — "1 config row + 1 slash-command file" is false for headless reviewers as specced
**Where:** `tools/review-queue/run-codex-reviewer.sh:47`, `tools/review-queue/run-codex-reviewer.sh:54`, `tools/review-queue/install-codex-reviewer-launchd.sh:21`
**Finding:** `{name, mode, required, timeout_hours}` is not enough to run anything. The wrapper needs prompt path, executable/argv, sandbox flags, label, plist path, log path, status/uninstall/smoke behavior. A second Codex can use convention; a non-Codex headless reviewer cannot.
**Strategist disposition:** ✅ Accepted. Spec narrowed: AC3 generalizes ONLY `_run_reviewer.sh` and `_install_reviewer_launchd.sh` (enough for second-Codex via convention). Non-Codex headless runner abstraction explicitly out of scope per Out of Scope §1.

### 4. HIGH — the hardcoding list is incomplete
**Where:** `tools/review-queue/schemas/request.schema.json:48`, `tools/review-queue/schemas/reviewer.schema.json:67`, `tools/review-queue/commit-reviewer-response.sh:37`, `tools/review-queue/combine.py:117`
**Finding:** The proposal names 5 places, but misses `request.schema.json`, `cross_ref.reviewer`, `commit-reviewer-response.sh`, orphan tmp cleanup, malformed-response path regex, status/uninstall/smoke scripts, docs, and tests.
**Strategist disposition:** ✅ Accepted. The full 16+-path enumeration is in the spec's Files Touched section. Caught hyphen-incompatible regex at `combined.schema.json:offending_response` (separate AC5).

### 5. HIGH — `patternProperties` weakens the schema contract
**Where:** `tools/review-queue/schemas/combined.schema.json:7`, `:16`, `:61`
**Finding:** `^[a-z][a-z0-9-]+_response$` cannot require exactly the active reviewers. Existing `offending_response` only allows `[a-z]+.md`, so hyphenated reviewer names break malformed-response validation.
**Strategist disposition:** ✅ Accepted. Per-reviewer fields stay explicit in `combined.schema.json`; adding a new reviewer adds one explicit optional field declaration. AC5 widens `offending_response` regex to support hyphenated slugs.

### 6. HIGH — late-response race is unaddressed
**Where:** `.claude/commands/review-queue-codex.md:24`, `:62`, `tools/review-queue/combine.py:170`
**Finding:** A reviewer can select a candidate before `combined.md` exists, spend minutes reviewing, then write after `combine.py` timed out and created `combined.md`. Shorter/optional timeouts make this much more likely. Recheck `combined.md` immediately before `os.link`.
**Strategist disposition:** ✅ Accepted. Folded into AC4: `commit-reviewer-response.sh` re-checks `combined.md` existence between validation and `os.link`, aborts cleanly if found.

### 7. MED — N-way verdict roll-up is underspecified
**Where:** `tools/review-queue/combine.py:85`, `.claude/commands/review-queue-watch.md:36`
**Finding:** `partial_responses` hides the present reviewers' actual verdicts. Missing + `pushback` is not the same as missing + `proceed`. Optional vs required missing reviewers also needs explicit semantics.
**Strategist disposition:** ✅ Accepted. AC6 gives full N-way semantics: optional missing doesn't block; required missing produces `partial_responses` with present-verdict enumeration in the body; mixed proceed*-vs-pushback is `divergent`; mixed proceed-vs-proceed_after_patches yields proceed_after_patches (stricter wins). 7 test cases (AC6a–AC6g) cover the full matrix.

### 8. MED — current finding grouping is already shaky; N reviewers multiplies the problem
**Where:** `tools/review-queue/combine.py:75`, `backlog/_followups.md:577`
**Finding:** `cross_ref` ignores `finding_index`, and live followups record dropped/double-listed findings. N-way convergence should not be layered on top without at least an audit pass that every input finding appears exactly once.
**Strategist disposition:** ⚠️ Partial accept — out of scope for 043. Finding-enumeration audit is a separate concern (existing followup at `_followups.md:577`); 043 changes verdict-roll-up only, not finding-aggregation. Explicit Out of Scope §2 in spec.

### 9. MED — Approach 2 fails the founder constraint
**Where:** `docs/review-queue-setup.md:23`, `tools/review-queue/status-codex-reviewer-launchd.sh:10`
**Finding:** Deferring launchd generalization means adding a second headless Codex still requires new wrapper/install/status/uninstall/smoke plumbing.
**Strategist disposition:** ✅ Accepted. Approach 2 was rejected. AC3 generalizes `_run_reviewer.sh` + `_install_reviewer_launchd.sh` (the load-bearing two); status/uninstall/smoke factoring deferred to 044-follow-up.

### 10. MED — Approach 3 uses the wrong source of truth
**Where:** `.claude/commands/review-queue-codex.md:1`, `tools/review-queue/_lib.py:1`
**Finding:** Slash-command files are prompt/UI artifacts, not runtime config. Scanning `.claude/commands` couples core queue logic to prose files and makes malformed prompt frontmatter a runtime failure mode.
**Strategist disposition:** ✅ Accepted. Approach 3 was rejected. AC2 uses `reviewers.json` as the single source of truth.

### 11. MED — "default deploy unchanged" is not proven
**Where:** `tools/review-queue/combine.py:36`, `:93`, `docs/review-queue-setup.md:70`
**Finding:** Current default is codex+cursor, 2h timeout, missing reviewer escalates. If config marks Cursor optional, changes timeout, or changes combined frontmatter shape, current behavior changes.
**Strategist disposition:** ✅ Accepted. AC7 implements a byte-identical regression test against a reference fixture pinned to spec-parent main HEAD. Falsifies any accidental drift.

## Codex's "What I'd actually do" recommendation (verbatim)

> Ship a smaller Option D: add `reviewers.json` only for reviewer metadata, but keep combined frontmatter backward-compatible with `codex_response` / `cursor_response` for the default pair. First fix active-round semantics: reviewer prompts and `combine.py` must honor `request.requested_reviewers`; validation must check requested/runtime membership; helper scripts must accept slug names. Then add one generalized Codex-headless convention for `review-queue-<name>.md` with label/log/plist derived from the slug. Defer non-Codex headless command abstraction until there is a real third non-Codex runner.

## Resulting design (Option D, adopted)

See `backlog/ready/2026-05-13-043-per-round-reviewer-roster.md`. 7 ACs total. AC1 is the load-bearing fix (per-round roster honored end-to-end). AC2-AC6 in service of AC1. AC7 is the falsification of "default deploy unchanged."

## Strategist's brainstorm-phase friction log

For "next task" per founder direction. NOT in scope for 043 itself. To be filed as a separate follow-up after 043 ships.

1. Hardcoding list was 5/11; missed the schema-side + helper-script-side + regex-site instances. Process improvement: `grep -rn 'codex\|cursor' tools/review-queue/ .claude/commands/ tools/review-queue/schemas/` first.
2. `request.requested_reviewers` already existing was missed. Process improvement: re-read parent specs (039 here) before proposing per-round behavior changes.
3. Late-response race wasn't enumerated. Process improvement: explicitly enumerate concurrency boundaries before designing.
4. Schema regex (`[a-z]+\.md`) assumption was missed. Process improvement: check existing schema constraints before specifying new slug shapes.
5. "Second Codex" vs "non-Codex headless runner" conflation. Process improvement: separate two distinct abstraction levels when designing extensibility.
6. "Default deploy unchanged" was unverified. Process improvement: any "X is unchanged" claim requires a regression test as the falsification mechanism.

Logged in the spec's "Brainstorm-Phase Friction Log" section for forward visibility.
