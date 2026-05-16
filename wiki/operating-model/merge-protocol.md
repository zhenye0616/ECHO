---
status: shipped
topic: Process
subtopic: Merge Protocol
aliases:
  - Merge Protocol
  - merge-and-cleanup
  - C3.5 Cross-Vendor Consult
  - Mid-Merge Conflict Review
---

# Merge Protocol

The `/merge-and-cleanup` skill is the strategist's checkpoint-driven flow for landing reviewed items from `backlog/pending_review/` onto `main`. This page documents the operating-model shape and the two founder-in-the-loop checkpoints that make it trustworthy; the canonical step-by-step protocol lives in [`skills/merge-and-cleanup.md`](../../skills/merge-and-cleanup.md) (see [[cross-tool-spec-review|cross-tool collaboration rationale]] for why the protocol's authoritative copy lives under `skills/`, not under any single AI client's adapter directory).

## Phase shape

Per item, sequentially:

1. **§C1 Pre-flight** — verify the pending_review item is mergeable; spec_commit_sha exists; reviewers have converged.
2. **§C2 Merge inside the merger worktree** — `git merge --no-ff` runs inside the isolated `$MERGER_WT = $TMPDIR/echo-merger-<uuid>` worktree (shipped by item 050), NOT inside the live checkout. The live checkout stays on a clean tip throughout.
3. **§C3 Pause for human conflict resolution** — if conflicts surface, the protocol pauses and prompts the founder with a three-branch choice:
   - `c3.5` — escalate to a cross-vendor consult (see below).
   - `continue` — resolve in editor, then advance.
   - `abort` — back out of the merge.
4. **§C3.5 OPTIONAL cross-vendor consult** — trigger-driven escape hatch for judgment-loaded conflicts (see below).
5. **§C4 Apply pre-merge fixups** — per-fixup founder approval.
6. **§C5 Verify** — `npm test` + `npm run lint` + `npm run typecheck` + `tools/sync-skills.sh --check` (the sync-skills gate was added by item 052).
7. **§C6 Populate `review_notes`** — including the `C3.5 cross-vendor consult: <reviewer> @ <verdict>` line per AC4a of item 054.
8. **§C7 Move item to `backlog/complete/`**.
9. **§C8 Commit + push** — commit body includes a `Cross-vendor consult: <reviewer> @ <verdict>; modifications: <N>` signpost line when §C3.5 fired (omitted otherwise).

The two irreversible moments — substantive conflict resolution and `git push origin main` — always pause for the founder. Everything else the strategist handles end-to-end.

## §C3.5 — optional cross-vendor mid-merge conflict-resolution review

Shipped by item 054 (2026-05-15), codifying an ad-hoc pattern that worked empirically during the 050 merge.

### What it is

A formal, OPTIONAL escalation step that lets the strategist or founder request a **cross-vendor independent review** of a proposed conflict resolution *before* applying it. The default §C3 path (founder resolves in editor, replies `continue`) handles the vast majority of merges — most conflicts are mechanical (single-line context shifts, pure additions, sidecar-prescribed side-takes). §C3.5 is the escape hatch for the minority of conflicts whose resolution involves judgment beyond what the sidecar playbook prescribes.

### When it fires

Either trigger is sufficient — §C3.5 is never automatic:

- **Founder-explicit:** the founder says "review with codex" (or equivalent) at any §C3 pause.
- **Strategist-recommended:** the strategist proactively suggests §C3.5 when the proposed resolution involves any of (a) deletion of test files, (b) wholesale-side-take on a restructured file (not a single-line side-take), (c) reconciliation across ≥3 files where the sidecar playbook is silent, (d) introduction of new code outside the conflict markers.

Strategist recommendation does NOT mandate §C3.5 — the founder can decline ("just apply it, I trust the sidecars").

### How it runs

One shell line, executed with cwd pinned to the merger worktree, capturing stdout/stderr to named files inside `$MERGER_WT` (so the response survives `/clear` and session restarts):

```bash
codex exec -C "$MERGER_WT" --sandbox read-only \
  > "$MERGER_WT/.c3.5-stdout" 2> "$MERGER_WT/.c3.5-stderr" - \
  < /tmp/codex-c3.5-prompt.md
```

The prompt body includes six load-bearing elements (working-tree state captured inside `$MERGER_WT`, batch context, conflict markers, specs/sidecars, the proposed resolution, and an output format that instructs the reviewer to emit `consult_cwd: $(pwd -P)` as a header field). The `pwd -P` canonical-path discipline is load-bearing: macOS resolves `$TMPDIR` logically as `/var/folders/...` and physically as `/private/var/folders/...`, so the strategist's wrong-tree check must canonicalize both sides before string-comparing.

### Verdict set

The reviewer returns one of:

- `proceed-as-proposed` — strategist returns to §C3, tells the founder "codex endorsed; apply your resolution and reply `continue`."
- `proceed-with-modifications` — strategist surfaces the modifications, tells the founder "apply original resolution + these N modifications, then reply `continue`."
- `pushback` — strategist surfaces the pushback reasoning; founder reconsiders before applying.

Four failure modes are handled in a **Consult-failure recovery** subsection: (i) reviewer binary not found / exit 127, (ii) reviewer exits non-zero with no parseable response, (iii) malformed YAML header / missing `verdict:` field, (iv) `consult_cwd` mismatch (reviewer ran in the wrong tree even though `-C "$MERGER_WT"` was specified). In all four cases the strategist surfaces the captured stderr/stdout, records `C3.5 cross-vendor consult: <reviewer> @ failed — <reason>` in `review_notes`, and returns to the §C3 pause prompt. No auto-retry.

### Audit trail

Two existing artifacts, no new files:

- **`review_notes` (§C6)** — adds one line: `C3.5 cross-vendor consult: <reviewer> @ <verdict> — <summary>` (or `none invoked` when §C3.5 did not fire).
- **Merge commit body (§C8)** — adds `Cross-vendor consult: <reviewer> @ <verdict>; modifications: <N>` only when §C3.5 fired; omitted otherwise to keep simple merges clean.

This keeps §C3.5 lightweight and reversible while ensuring a future reader of the merge commit can tell that a cross-vendor consult fired and what it returned. Without persistence to either artifact, the decision would survive only in terminal scrollback or `/tmp/`.

## Empirical precedent — 050 merge (2026-05-15)

The 050 merge surfaced two conflicted files (`tools/review-queue/_run_reviewer.sh` and `tools/review-queue/push-with-retry.sh`) where the resolution was judgment-loaded: take 050's worktree-isolation hunk wholesale over 051's lock-check hunk, **delete** an entire test file (`tests/review-queue/run-reviewer-honors-merge-lock.test.ts`) because the codepath it tested was removed, and combine 051's `--rebase=merges` flag with 050's `HEAD:main` refspec on a line both branches had independently rewritten. The strategist surfaced the proposed resolution; the founder said *"use a codex reviewer here."*

The strategist improvised the cross-vendor consult via `codex exec`. Codex returned `proceed-with-modifications` and identified two non-conflict refinements the strategist had missed: an orphaned `CODEX_BIN` env-hook block (outside the conflict markers — would have left a dead test seam) and a header behavior-comment that needed updating from `--rebase` to `--rebase=merges`. Both were folded into the merge commit (`5ad67e0`).

The pattern worked but was not in the protocol; future strategists wouldn't know it was an option. Item 054 codified it as §C3.5. (Note: the empirical 050 invocation used `-C ~/Desktop/Project_echo` because 050's worktree-isolation hadn't shipped yet; the post-050 correct form is `-C "$MERGER_WT"`.)

## Why a thin wiki page

The canonical, mechanically-tested protocol lives in `skills/merge-and-cleanup.md` and is shape-asserted by `tests/skills/merge-and-cleanup-shape.test.ts`. This wiki page is documentation-of-shipped-reality — it exists so a reader navigating the operating-model folder can find the merge protocol's shape and the §C3.5 escalation pattern without grepping the skills/ directory. When the canonical skill evolves, the source of truth is the skill file; this page lags it.

## Related

- [[review-queue-protocol]] — upstream protocol that feeds `backlog/pending_review/` and converges to the `/merge-and-cleanup` handoff.
- [[cross-tool-spec-review]] — the broader cross-tool review pattern §C3.5 is one instance of (specs use R1/R2/R3 rounds in `backlog/reviews/`; merges use the §C3.5 ad-hoc consult).
- `skills/merge-and-cleanup.md` — canonical protocol source of truth.
- `backlog/complete/2026-05-15-054-merge-cleanup-cross-vendor-conflict-review.md` — spec that codified §C3.5.
- `backlog/complete/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md` — the empirical precedent merge that motivated §C3.5.
- `backlog/complete/2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md` — added the §C5 sync-skills verification gate the §C3.5 prose tests piggyback on.
