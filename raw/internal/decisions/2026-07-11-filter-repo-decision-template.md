# filter-repo execute-or-defer — founder decision template

**Date:** 2026-07-11 · **Status:** template awaiting founder decision · **Decision type:** history rewrite (irreversible sequencing)

This is a founder's-call template. It presents the two options and their exact safe-order preconditions. **It makes no recommendation** — the founder chooses execute or defer and records the choice here.

## What is at stake

Reachable git history contains live-capture content flagged for removal — the lead list, coworker notes (`ab95c519`), a ~560K dump (`1ba3580a`), and pitch drafts (`7bc368b5`). A HEAD redaction removes these from the tracked tree but **not** from history; they remain reachable via pre-redaction SHAs. `filter-repo` rewrites history to remove them from the canonical repo.

**Both options share one hard truth:** the repo has been public since 2026-06-06. Neither executing nor deferring can revoke content already cloned, forked, or cached. `filter-repo` cleans the canonical repo going forward; it cannot retract past disclosure.

## Decision

> **Founder chooses ONE. Record the choice, date, and SHA below.**
>
> `[ ] EXECUTE`  `[ ] DEFER`
>
> Decided by: ______  Date: ______

---

## Option 1 — EXECUTE (rewrite history now)

`filter-repo` rewrites **every** SHA. It breaks local clones and worktrees, invalidates all SHA-pinned references, and requires the exclusive G4 window. Run only in this exact order:

1. **Holdout preserved first.** The holdout-131 tier-2/3 retest is preserved and closed, and its worktree + local/remote branch are deleted — *after* evidence preservation. A rewrite before this destroys the blind-holdout evidence chain and invalidates any SHA-based move log.
2. **Stop all writers.** No builder agents, no strategist commits, no review-queue ticks, no reorg move-log in progress. The rewrite must be the only thing touching the repo.
3. **Snapshot.** Full backup of the current repo (all refs) before rewriting, in case the rewrite must be undone.
4. **Rewrite.** Run `filter-repo` against the enumerated targets (lead list, `ab95c519`, `1ba3580a`, `7bc368b5`, plus anything the WS2 scans added).
5. **Fresh clone.** Re-clone from the rewritten remote; do not reuse an old working copy (old copies still carry the pre-rewrite objects).
6. **Rescan.** Re-run the secret + semantic-content scanners on the fresh clone to confirm the targets are gone from reachable history.
7. **Map, don't rewrite, the evidence records.** Produce an **old-SHA → rewritten-SHA mapping artifact** (filter-repo's commit-map output, committed as `raw/internal/decisions/<date>-filter-repo-sha-map.md` or a sidecar file) covering every SHA cited by immutable evidence. **The G3 freeze record and other sealed evidence documents are NOT edited** — their old SHAs stay exactly as written (they are part of what was sealed), and the mapping artifact is how a reader resolves them against rewritten history. Only *live operational pointers* (task-state pointers, in-flight move logs, tooling configs that must dereference commits) get re-pinned to post-rewrite SHAs, each noting the mapping artifact it used.

Do not begin step 4 until steps 1–3 are all true. Sequencing, not urgency, is what makes this safe. If G3 has already sealed a freeze record by rewrite time, the rewrite invalidates none of it: the record + the SHA map together remain verifiable; a freeze record that gets edited after sealing is no longer evidence.

---

## Option 2 — DEFER (do not rewrite now)

Legitimate — deferring with an honest residual statement is a valid choice, not a failure. If deferring, record all three:

1. **Named owner.** Who owns executing the rewrite when the trigger fires: ______
2. **Named trigger.** The condition that moves this from deferred to executed — e.g. "before the first paid client agreement is signed", "if any flagged content is externally reported", "at the next G4 exclusive window": ______
3. **Honest residual-exposure paragraph** (goes into `docs/lab-data-handling.md`):

> The flagged live-capture content (lead list, coworker notes, ~560K dump, pitch drafts) remains reachable in git history at its original SHAs, and — because the repo has been public since 2026-06-06 — may persist in clones, forks, and caches regardless of any future rewrite. HEAD redactions remove it from the tracked tree only. A history rewrite is deferred as of [date], owned by [owner], triggered by [trigger]. Until then this residual exposure is accepted and stated openly.

---

## Notes

- Whichever option is chosen, log it in the WS2 exposure register (the artifact distinguishing the June db token scan / git-history secret scan / filter-repo content rewrite) so "we scanned" never gets confused with "we rewrote."
- HEAD redactions proceed independently and immediately regardless of this decision; they are the floor, not a substitute for the rewrite.
