---
id: 2026-05-16-058-strategist-disposition-discipline-prefer-removal
title: Strategist disposition discipline — prefer removal over deeper patching when findings target a recent-round patch
status: claimed
priority: MED
estimate: 0.25d
created: 2026-05-16
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-16T08:44:12Z"
branch: "agent/strategist-disposition-discipline-prefer-removal"
head_sha: "3eb6cbebf4a9a5b945c45ef314c0075c27221d70"
pr_url: ""
task_state_ref: 2026-05-16-058-strategist-disposition-discipline-prefer-removal
agent_notes: |
  Pre-applied on main before claim. The strategist self-applied AC1 + AC2 + AC3 directly to main
  in commit be6dcce ("058: apply strategist disposition discipline addition + CLAUDE.md
  cross-reference", 2026-05-15 23:44 PDT, by Zhen) before the spec left backlog/ready/. The item
  body anticipated this explicitly: "(This item is small enough that a builder agent may not run;
  if the strategist self-applies post-review, the builder pointer may be skipped.)"

  This run made NO new commits on agent/strategist-disposition-discipline-prefer-removal. The
  branch was created from main at 3eb6cbe (the claim commit, immediately after be6dcce), so it
  already contains all spec'd edits and is a no-op fast-forward of main.

  All 7 merge-blocking verification checks pass on the branch as-is:
    T1 sync-skills.sh --check → OK (canonical + adapter byte-identical)
    T2a/b skill subsection heading present in skills/ and .claude/commands/ (1 match each)
    T3 skill subsection positioned correctly (line 101, between Step 3 @ 89 and (a) @ 118)
    T4a/b worked examples r4 and r6 present inside the new subsection
    T5 CLAUDE.md H3 present (1 match)
    T6 CLAUDE.md H3 positioned inside "Drift Prevention Applies to Agents Too" (line 201, after
       section heading @ 191; no later H2 boundary)
    T7 CLAUDE.md cross-reference targets canonical skills/review-queue-watch.md (1 match)

  Reviewer note: since the work lives on main already, this row may be a candidate to skip a
  normal review round and move directly to backlog/complete/. Merging agent/<slug> into main is a
  no-op fast-forward — the branch tip and main are at the same SHA (3eb6cbe).

  Run log: raw/internal/agent-runs/2026-05-16-2026-05-16-058-strategist-disposition-discipline-prefer-removal.md
requested_reviewers: ["codex"]
files_to_modify:
  - skills/review-queue-watch.md      # new Step-3 subsection (the prose is embedded below in AC1)
  - CLAUDE.md                         # new H3 cross-reference (prose embedded in AC2)
  - .claude/commands/review-queue-watch.md  # auto-derived by tools/sync-skills.sh after the canonical edit
spec_refs:
  - skills/review-queue-watch.md                                                    # current strategist watcher protocol
  - CLAUDE.md                                                                       # operating-model document; Drift Prevention section
  - backlog/reviews/2026-05-16-057a-coord-substrate-and-observability/r3/combined.md  # r3 escalation that founder overrode (entry into auto-loop)
  - backlog/reviews/2026-05-16-057a-coord-substrate-and-observability/r4/combined.md  # r4 disposition: removed time-horizon optimization (worked example 1)
  - backlog/reviews/2026-05-16-057a-coord-substrate-and-observability/r5/combined.md  # r5 verifies r4 removal — zero storage-seam findings
  - backlog/reviews/2026-05-16-057a-coord-substrate-and-observability/r6/combined.md  # r6 found 3 bugs in r5's runtime warning patch (the over-engineering signal)
  - backlog/reviews/2026-05-16-057a-coord-substrate-and-observability/r7/combined.md  # r7 verifies r6 removal — zero warning-path findings
  - backlog/reviews/2026-05-16-057a-coord-substrate-and-observability/r8/combined.md  # r8 terminal: verdict=proceed, zero findings
review_notes: |
  Merged 2026-05-16 — pre-applied-on-main special path.

  AC1+AC2+AC3 landed directly on main (commit be6dcce, 2026-05-15 23:44 PDT)
  before the spec left backlog/ready/; claim commit 3eb6cbe branched off main
  immediately after, leaving `git diff main...agent/<slug> --stat` empty. The
  spec body sanctions this path explicitly ("if the strategist self-applies
  post-review, the builder pointer may be skipped"). C2 merge --no-ff
  reported "Already up to date"; no merge commit created. Recorded here for
  future auditability — useful precedent if more small strategist-self-apply
  items follow.

  Conflicts resolved:
  - None (no-op fast-forward; branch tip already ancestor of main).

  C3.5 cross-vendor consult: none invoked

  Fixups applied:
  - None. Sidecar verdict was `merge as-is` with empty pre-merge fixups list.

  Fixups deferred to follow-up items:
  - None.

  Verify: 1080/1080 tests pass (21 pre-existing skips); lint, lint:task-state,
  typecheck, and tools/sync-skills.sh --check all exit 0 post-merge.

  Follow-up items (non-blocking, queued in backlog/_followups.md):
  - Strategist task: add a one-sentence mention of "prefer removal over deeper
    patching" to wiki/operating-model/review-queue-protocol.md (with a link to
    the skill subsection) when the After-Completion wiki-promotion pass runs.
---

## Why this spec exists

The 057a convergence (r1→r8: 7→6→5→3→2→3→2→0 findings) repeatedly demonstrated a strategist failure mode that the current protocol does not name: **patching deeper in response to a finding that targets a mechanism a prior round's patch added, instead of removing the prior-round mechanism.**

The failure mode is the strategist-side twin of [drift](`CLAUDE.md` §"Drift Prevention Applies to Agents Too"). Both are unnecessary-mechanism failures; they differ in which actor introduces the mechanism:

| Actor | Mechanism source | Failure mode |
|---|---|---|
| Builder | Code added during implementation | Scope expansion (out-of-AC code paths) |
| **Strategist** | **Spec text added during a review round** | **Spec accumulates premature optimization / observability scaffolding** |

The fix is dispositioning discipline at the moment the strategist chooses between path (a) zero-patches-terminal / (b) patches-applied-verify / (c) patches-applied-no-verify in `skills/review-queue-watch.md` Step 3. Before committing to a patch, the strategist asks: **is this finding targeting mechanism MY prior-round patch introduced, or mechanism the original spec had?** If the former, removal converges; deeper patching does not.

## Acceptance Criteria

**AC1 — `skills/review-queue-watch.md` addition.**

Insert a new subsection inside Step 3 (Disposition), positioned BEFORE the `#### (a) / (b) / (c)` branches (currently around line 101). The subsection's verbatim text:

```markdown
#### Disposition discipline — prefer removal over deeper patching when findings target a recent-round patch

Before committing to a patch, check whether the finding is targeting **mechanism a prior round's patch added** vs. mechanism the original spec had. If it's the former — i.e. r<N>'s findings are bugs in r<N-1>'s patch — strongly prefer **removing the r<N-1> mechanism** over patching deeper.

The signal: a finding is most likely "recent-patch-introduced" when (a) its `where:` lines all fall inside the diff range of a recent `spec-r<N-1>-patches` commit, OR (b) multiple reviewers converge on bugs in one mechanism that didn't exist before that commit. In that case, ask whether the prior round's reviewer actually required the mechanism, or whether it was your interpretation of a softer ask (e.g. "perf fixture OR runtime warning" → you added both → the warning has bugs).

Concrete win condition: a removal-only `spec-r<N>-patches` commit typically converges in r<N+1>. A patch-deeper commit typically introduces r<N+1>'s findings.

Worked examples (from 057a):

- **r4**: r3 added a time-bound horizon optimization (`getCoordSequenceAtOrAfter(timestamp)`) to bound boot-replay cost. r4 reviewers found the time-bound was unsafe under skewed `emitted_at`. Disposition: drop the time bound entirely; V1 does full-ledger replay (substrate volume is small enough). One method removed from the seam. r5 had zero storage-seam findings.
- **r6**: r5 added a runtime volume-threshold warning that emitted a `coord:scheduler_health` atom. r6 reviewers found 3 bugs in it (wrong metric, wrong atom shape, not visible in status). Disposition: drop the warning mechanism entirely; the AC8 perf fixture alone is the V1 contract (which was the original reviewer's "perf fixture OR warning" alternative). r7 had zero warning-path findings.

The check is a forcing function against [recently-added mechanism becoming the new bug surface]. It does NOT apply when findings target the original AC text or load-bearing mechanism — those need real patches. Distinguish: "this mechanism didn't exist a round ago" (likely-removable) vs. "this mechanism is in the original spec contract" (must-patch).

If you choose removal, the dispatch helper invocation is still `--patches-applied=true` because the spec changed; the change just happens to be a deletion. The disposition column should explicitly say "accepted — mechanism dropped" rather than "accepted — patched" so the convergence trail records the design discipline.
```

The subsection lands inside Step 3 between the existing "Step 3 — Disposition" intro (which describes filling the disposition column + committing) and the `#### (a) Zero patches applied → convergence` heading. It applies BEFORE the strategist picks a path, so the path choice is informed by the removal check.

**AC2 — `CLAUDE.md` cross-reference.**

Insert a new H3 at the end of the "Drift Prevention Applies to Agents Too" section in `CLAUDE.md`. Verbatim text:

```markdown
### Strategist drift — patching deeper instead of removing

The "agents drift via scope expansion" failure mode has a strategist-side twin during review rounds: adding mechanism in response to a finding, then watching the next round find bugs in *the mechanism the patch added*. Each round's diff grows; the spec accumulates premature optimizations and observability scaffolding that the load-bearing core doesn't need.

The fix is dispositioning discipline, not better patches. See `skills/review-queue-watch.md` "Disposition discipline — prefer removal over deeper patching when findings target a recent-round patch" for the check the strategist applies mid-tick. Concrete worked examples from 057a r4 and r6 are in that skill.
```

**AC3 — Sync skills.**

After the `skills/review-queue-watch.md` canonical edit, run `tools/sync-skills.sh` so the `.claude/commands/review-queue-watch.md` adapter mirror is regenerated. Verify identity post-sync via `tools/sync-skills.sh --check`.

**AC4 — `task_state_ref` pointer per 046 AC1 + 047 AC3.**

Standard `backlog/task-state/<id>/builder.md` schema use. No CAS; single-owner invariant. (This item is small enough that a builder agent may not run; if the strategist self-applies post-review, the builder pointer may be skipped.)

## Tests

This is a docs-only operating-model change; verification is a collection of grep / sync-checks rather than a test suite. Each check is merge-blocking (r1 codex F1 LOW).

1. **Sync identity check** — `tools/sync-skills.sh --check` exits 0 (canonical `skills/review-queue-watch.md` and adapter `.claude/commands/review-queue-watch.md` are byte-identical).
2. **Skill subsection heading present** — `grep -F '#### Disposition discipline — prefer removal over deeper patching when findings target a recent-round patch' skills/review-queue-watch.md` returns exactly one match; same grep against `.claude/commands/review-queue-watch.md` returns one match (post-sync).
3. **Skill subsection positioned correctly** — the new subsection's heading line number is greater than the `### Step 3 — Disposition` heading's line number AND less than the `#### (a) Zero patches applied → convergence` heading's line number. Verifiable via `awk '/^### Step 3/{a=NR} /^#### Disposition discipline/{b=NR} /^#### \(a\) Zero patches applied/{c=NR} END{exit !(a<b && b<c)}' skills/review-queue-watch.md`.
4. **Worked examples present** — `grep -c 'r4' skills/review-queue-watch.md` and `grep -c 'r6' skills/review-queue-watch.md` both return ≥1 inside the new subsection (the worked examples reference 057a r4 and r6 by name).
5. **CLAUDE.md H3 present** — `grep -F '### Strategist drift — patching deeper instead of removing' CLAUDE.md` returns exactly one match.
6. **CLAUDE.md H3 positioned correctly** — the new H3 sits inside the "Drift Prevention Applies to Agents Too" section. Verifiable via `awk '/^### Drift Prevention Applies to Agents Too/{a=NR} /^### Strategist drift — patching deeper/{b=NR} /^## /{if(a&&!b)c=NR} END{exit !(a<b && (!c || b<c))}' CLAUDE.md` (the new H3's line number is greater than the section's H3 and less than the next H2 boundary).
7. **CLAUDE.md cross-reference target valid** — `grep -F 'skills/review-queue-watch.md' CLAUDE.md` returns at least one match referencing the canonical path (not the `.claude/commands/` adapter).

## Out of Scope (Don't Drift)

- **NO new dispatch-helper code paths.** `dispatch-next-round.py` already supports `--patches-applied=true` with a deletion diff; the spec text just clarifies that disposition labels use "mechanism dropped" language.
- **NO retroactive edits** to 057a's review trail. The convergence trajectory IS the empirical evidence; it stays as-is.
- **NO new spec-evolution skills** (e.g. a separate `skills/spec-evolution.md`). The pattern belongs inside `review-queue-watch.md` because that's where the strategist fires it. Founder-level guidance lives in CLAUDE.md.
- **NO automation of the removal-vs-patch choice.** This is dispositioning judgment, not a mechanism to encode in `combine.py` or `dispatch-next-round.py`. The skill prose is the contract; the strategist applies it manually each tick.
- **NO changes to the 049 fail-to-converge asymptote rule** (≥4 findings or pushback → re-escalate). That rule fires at the round level; this discipline fires at the per-finding-disposition level. They compose: dispositioning discipline reduces the chance of hitting the asymptote in the first place.

## After Completion (Strategist Notes)

Post-merge wiki promotion (low-priority — the wiki page on review-queue protocol already exists):

- **Update `wiki/operating-model/review-queue-protocol.md`** to mention the "prefer removal over deeper patching" discipline in the disposition section, with one-sentence summary and a link to the skill. Worked examples stay in the skill (lower-half details belong in the skill, not the wiki page).
