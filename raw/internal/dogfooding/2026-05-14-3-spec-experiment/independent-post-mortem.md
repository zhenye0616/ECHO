# Independent post-mortem — 3-spec parallel autonomous-review experiment

**Author:** Independent Claude Code session (session_id `94d460df-c3d8-4369-9300-59a4f5afd498`), running from the standalone post-mortem prompt drafted by the orchestrator session `b1679207-1103-4bb7-bff4-65086d127b11`.
**Reviewed at:** local HEAD `0080bbb4572e90abb04efa8ed33a5f8a9fa43892` (post-reset state — only the 3 initial spec drafts on `main`); forensic record on `origin/main` between SHAs `894f2df` (exclusive) and `54ed4f8` (inclusive).
**Completed:** 2026-05-15T07:03:46Z (= 2026-05-15 00:03:46 PDT) — ~5 minutes of investigation, 37 tool calls (32 Bash + 5 Read), 5 fetches from origin.
**Source-of-truth:** This file is a verbatim copy of the final assistant turn from the reviewer session, recovered via ECHO MCP's `get_atom` → `atom_too_large_for_wire` → source-JSONL extraction (atom size 33321 bytes exceeded the 25KB wire ceiling; ECHO returned the source path and the orchestrator pulled the content with `jq` per the canonical recovery contract in `wiki/surfaces/mcp-get-atom.md`).

---

---

# Post-mortem: 3-spec parallel autonomous-review experiment (2026-05-14, 22:30–23:43 PDT)

## 1. TL;DR

- **The experiment witnessed its own target bug.** Two of the 14 forensic commits (`5433411`, `555eb65`) are textbook autostash-entanglement — exactly the bug class spec 051 was written to prevent. `commit-reviewer-response.sh` calls `git commit` without a pathspec, so anything pre-staged by the strategist gets swept into the reviewer tick's commit. Until that line changes, parallel strategist + launchd-reviewer activity will keep entangling.
- **Reviewer Axis 2 mostly held, with one major fabrication.** 10 of 12 distinct findings across 6 reviewer responses are well-grounded in the pinned artifacts. **Both of codex's HIGH findings on 052 are fabricated/misattributed** — they describe content that exists in 053's spec, not the 052 artifact codex was actually pointed at. The cross-vendor protocol's load-bearing claim ("independent verification") survived but was wounded.
- **The previous Claude's disposition work on 051 was correct and the convergence call was sound.** All four R1 patches were applied to the right places; the `patch_commit_sha` field honestly documents the entanglement caveat instead of hiding it.
- **052 escalated to founder for the right structural reason (divergent verdicts crossing the {proceed*, pushback} boundary) but the wrong substantive reason (the pushback was built on hallucinated findings).** The watcher protocol behaved correctly; the upstream signal was bad.
- **053 never reached combine.** Both R1 reviewer responses landed (`555eb65`, `0f7ca61`) but no combined.md was ever produced — the watcher tick either never fired for 053 or the founder pulled the plug first.

## 2. Per-axis findings

### Axis 1 — Spec quality

| Spec | Friction-fix shape | Frontmatter / "Don't Drift" | Latent bugs caught by R1 |
|---|---|---|---|
| **051** | Yes — 0.5d, ~10 lines of shell across two files | Complete | Three real bugs in the AC text: `--rebase-merges` flag syntax, `--git-path` vs `--git-common-dir`, lock-check placement before `LOG_FILE` definition under `set -u` |
| **052** | Yes — 0.25–0.5d, additive prose + tiny installer | Complete | Three real operational gaps: installed-hook executable bit unset, literal `.git/hooks/pre-commit` breaks in linked worktrees, AC4 file-wide grep can pass on prose |
| **053** | Yes — 0.5–1d for a 2-prong fix | Complete | Two valid gaps: AC2 timezone branch not falsifiable through AC3's exit-code-only surface, AC3 fixture isolation contract unspecified; plus a real bug not caught by either reviewer — `spec_refs:` (053, line 28) points to `2026-05-14-052-merge-cleanup-sync-skills-check.md`, which doesn't exist (correct path is `2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md`) |

All three drafts are reasonable friction-first specs. None expand architecture; all cite `_followups.md` provenance and bound scope. Compared to the 045 exemplar, 051 is **noticeably more verbose** (170 lines, vs. 045's tighter shape) and the verbosity correlated with three real per-line correctness bugs the spec wrote into its own AC text. Friction-fix specs are supposed to be short specifically so the spec body has fewer places to be wrong.

### Axis 2 — Reviewer-response correctness

**051 — 5/5 findings grounded.** Both reviewers correctly identified:
- (codex HIGH) `git pull --rebase --rebase-merges` exits 129; the supported form is `--rebase=merges`. Verified: `git pull -h` on this machine shows `-r, --rebase[=(false|true|merges|interactive)]` only.
- (codex MEDIUM) The pre-rebase feature tip SHA is rewritten when `--rebase=merges` replays the merged side; `^2` SHA equality can't be asserted, only tree equality.
- (both, MEDIUM) `git rev-parse --git-path echo-merge-in-progress` resolves inside `.git/worktrees/<wt>/` for custom names; `--git-common-dir` is the correct primitive.
- (codex-ops HIGH) Spec's stated insertion point (between `_reviewer_gate.py` at line 45 and the codex child at line 69) puts the lock-present branch *before* `LOG_FILE` is defined at line 48 — crashes under `set -u`.

Reproduce: `git show 543341151c1:tools/review-queue/_run_reviewer.sh` shows `set -euo pipefail` (line 13), gate (45), `LOG_FILE=` (48).

**052 — 4/6 grounded, 2/6 fabricated.**

Fabricated findings (both HIGH, both from codex):
> **codex finding 1:** *"the pinned artifact declares id 2026-05-14-053-reviewer-completed-at-coercion and a 053 title."*

Reproduction:
```
$ git show 2a052e02:backlog/ready/2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md | head -5
---
id: 2026-05-14-052-sync-skills-check-in-merge-and-cleanup
title: /merge-and-cleanup C5 verify includes tools/sync-skills.sh --check + pre-commit hook
```

The pinned artifact's frontmatter at the cited SHA contains `id: 052`, not `053`. The claim is false.

> **codex finding 2:** *"The artifact's spec_refs include backlog/ready/2026-05-14-052-merge-cleanup-sync-skills-check.md."*

Reproduction (above, Axis 1 row 3): 052's `spec_refs:` at the pinned SHA contains four entries, none of which is the cited path. The cited path actually appears in *053's* `spec_refs:` (line 28). Codex displaced a real bug from 053 onto 052.

Codex's third finding on 052 (MEDIUM, AC3 dry-run/test-mode unspecified) **is** grounded — the spec says "dry-run or test-mode equivalent" without specifying which.

Codex-ops's three 052 findings (installed-hook chmod, linked-worktree `.git` path, AC4 grep scope) are all grounded.

**053 — 4/4 grounded.** Both reviewers correctly identified the AC2 timezone-fixture observability gap, the AC3 fixture-isolation gap, the AC5 `grep -L` exit-code semantics issue, and the silent-coercion observability gap. None of them caught the actual broken `spec_refs:` filename on 053 line 28 — the bug codex's 052 review fabricated onto the wrong spec is **a real bug in 053 that 053's own reviewers missed**.

**Net Axis 2 assessment:** 10/12 grounded. The two false claims are concentrated in one reviewer (codex) on one spec (052), and they crossed the verdict-divergence boundary, forcing a (false) escalation. The cross-vendor independence property still surfaced more real bugs than it manufactured fake ones — but the failure mode is on the table now.

### Axis 3 — Disposition fidelity (051)

The previous Claude applied four R1 patches; each is present and correct:

| Finding | Patch | Verified in `git show 555eb65 -- backlog/ready/2026-05-14-051-…md` |
|---|---|---|
| codex HIGH AC1:66 | `--rebase --rebase-merges` → `--rebase=merges` | ✓ line 67 of new file |
| codex MEDIUM AC1:69 | Test assertion: tree equality, not SHA equality | ✓ line 74 of new file |
| codex-ops HIGH AC2:79 | Insert lock check **after** lines 47–57 (LOG_DIR/LOG_FILE/mkdir) | ✓ line 79 of new file |
| both MEDIUM AC2:80 | `--git-path` → `--git-common-dir` | ✓ line 80 of new file |

Risk R2 prose was also updated (line 147) to match the AC2 correction. The r2 `focus_hints` enumerate all four patches by spec line — alignment is precise.

The `patch_commit_sha` field reads `555eb65 — see issue log 2026-05-14 23:40 PDT for attribution caveat`. The caveat is real: the patches were applied in the strategist's working tree, but the four edits landed in the queue helper's commit (`555eb65`, labeled "codex on 053") rather than a clean strategist-authored commit. The previous Claude documented the entanglement honestly in the SHA field and in `combined.md` ("autostash-swept attribution") instead of rewriting history — that's a good audit move.

### Axis 4 — Failure-mode analysis (what went wrong operationally)

Three operational failures, in order of severity:

**F1 — `commit-reviewer-response.sh` produces autostash-entangled commits.** The script does (`tools/review-queue/commit-reviewer-response.sh:90–91`):
```
git add "$REVIEWER_PATH"
git commit -m "$CONTEXT"
```
Without a `--only`/pathspec on `git commit`, anything already in the index gets swept in. Both `5433411` (a dispatch commit that swept in 168 lines of the brand-new 051 spec) and `555eb65` (a codex-053 commit that swept in 10 lines of 051 spec changes + 15 lines of 051 combined.md edits) are this mechanism firing. Codex itself observed and logged it in the 23:41 PDT journal entry: *"this is an index hygiene issue for the queue helper, not part of the 053 review content."*

This is the same root-cause class as the 048-morning and 049-evening collisions — but here it fired *during the cycle that was specifying its own fix*.

**F2 — Reviewer launchd ticks all use `git pull --rebase --autostash` instead of honoring a lock.** Every R1 reviewer journal entry in the window mentions "Initial mandatory `git pull --rebase origin main` hit pre-existing dirty tracked journal/followup files, so the tick used `git pull --rebase --autostash`". The reviewers cooperated with the working-tree state instead of stepping back from it. Combined with F1, autostash becomes a delivery mechanism for entanglement.

**F3 — 053's combined.md never produced.** Both R1 reviewer responses landed by 23:40 (`555eb65`, `0f7ca61`), but no `combined.md` was ever created. Either the watcher tick didn't fire for 053 before the founder pulled the plug, or it ran and failed silently. No corresponding error log line surfaced in this review. Recommend investigating watcher selection logic — does it always pick the lowest-numbered eligible item? If so, the watcher served 051 (23:38) then 052 (23:43) and didn't get to 053 before halt.

I did **not** find evidence of sub-agent crashes in `/private/tmp/claude-501/.../tasks/` — directories exist but I avoided reading transcripts because the founder asked for "obvious-after-the-fact patterns" only and the directory listing alone doesn't reveal silent failures without deeper transcript inspection (out of scope for this review).

### Axis 5 — Synthesis

**Real new bugs surfaced that warrant their own backlog items:**

- **`commit-reviewer-response.sh` index hygiene.** Change `git commit -m "$CONTEXT"` to `git commit -m "$CONTEXT" -- "$REVIEWER_PATH"` (or use `git commit -o`). One-line fix. This is **051's underlying root cause** at the helper layer rather than the wrapper-lock layer. Worth filing as a separate friction-fix spec — narrower than 051, complementary to it.
- **053 line 28 stale `spec_refs:`** — points to a renamed file. A trivial spec-body fix the founder can apply directly before claiming.
- **Reviewer-side reading discipline.** Codex's two false 052 findings suggest the codex prompt may not be reading the artifact at the pinned SHA before forming claims. Worth tightening `skills/review-queue-codex.md` to require an explicit verbatim quote of the pinned line being criticized (the codex-ops responses on 052 did this naturally; codex did not).
- **Watcher liveness on 053-shape gaps.** If 053 had both reviewer responses and combine.py simply didn't fire, that's a watcher tick gap. Worth a small followup to confirm the watcher's selection-and-fire path works when multiple eligible items sit in the queue simultaneously.

## 3. Severity-ranked issues found

| Sev | Issue | Repro |
|---|---|---|
| HIGH | `commit-reviewer-response.sh` produces entangled commits | `grep -n 'git commit' tools/review-queue/commit-reviewer-response.sh` — line 91 has no `--`/`-o` |
| HIGH | Codex 052 R1 contains 2 fabricated HIGH findings | `git show 2a052e02:backlog/ready/2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md | head -5` vs. `git show origin/main:backlog/reviews/2026-05-14-052-…/r1/codex.md` |
| MED | 053 `spec_refs:` line 28 points at a nonexistent path | `git show 258a094:backlog/ready/2026-05-14-053-reviewer-completed-at-coercion.md \| sed -n '28p'` |
| MED | 053 never combined | `git ls-tree -r origin/main \| grep '053-.*r1/combined'` returns nothing |
| LOW | 052 escalated to founder on a verdict divergence whose substance was fabricated | `git show origin/main:backlog/reviews/2026-05-14-052-…/r1/combined.md` shows `escalated_to_founder: true` |

## 4. Recommended actions

1. **New backlog item (small, narrow):** patch `commit-reviewer-response.sh:91` to commit only the staged reviewer response (`git commit -m "$CONTEXT" -- "$REVIEWER_PATH"`). This is 051's bug at the proper layer. Likely supersedes 051's AC2/AC3 entirely without needing the sentinel-file convention.
2. **Edit 053 line 28 directly** (no review cycle needed): correct the `spec_refs:` path to `2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md`. Trivial.
3. **Tighten codex reviewer prompt** (`skills/review-queue-codex.md`): require each finding to quote the pinned spec line verbatim. The two fabricated 052 findings would have been impossible to write if the prompt enforced "paste the line you're criticizing." Codex-ops already does this organically.
4. **No protocol change to the divergent-verdict escalation gate.** It fired correctly — the bug was upstream of it. The escalation is still the right backstop when codex hallucinates.
5. **No action on 050.** Its 4-round convergence is intact; nothing in this experiment invalidates it.

## 5. What the previous Claude probably got right

- **Honest attribution in `patch_commit_sha`.** Documenting the autostash sweep openly ("autostash-swept attribution") instead of rewriting history is the right audit posture.
- **All four 051 R1 patches applied correctly.** No dropped findings; every reviewer claim was tracked to a concrete spec edit.
- **R2 focus_hints precisely enumerate the patches.** Reviewers re-firing on R2 would know exactly what to verify.
- **Friction-first framing.** All three specs respect the gate ("no new architecture, ≤1 day estimates").

## 6. What the previous Claude probably got wrong or overinterpreted

- **Spec verbosity correlated with spec bugs.** 051's 170-line body invited three latent correctness bugs that reviewers caught. Friction-fix specs work better tight; the previous Claude wrote them long.
- **Likely overstated the autostash entanglement as "novel."** It's the bug class already documented in `_followups.md:754–755` — same root cause as 048-morning and 049-evening collisions. The right framing is "this experiment was a third witness," not "this experiment uncovered something new."
- **Probably underweighted the codex fabrication.** This is the first time I've seen a cross-vendor reviewer produce *two* HIGH findings whose claims demonstrably contradict the pinned artifact. That deserves more weight than an entanglement bug we already knew about — the cross-tool protocol's whole claim rests on reviewer factuality.
- **052 should not have escalated to founder if the codex pushback was fabricated.** The watcher applied the rule correctly, but a future watcher refinement could include a "do reviewer findings cite the pinned content" sanity check before honoring a divergent verdict.

---

Word count ≈ 2100. Forensic record (the 14 commits on `origin/main`) left untouched; no queue scripts run; no spec drafts modified.
