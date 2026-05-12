---
item_id: 2026-05-12-040-watcher-state-executable-test
round: 2
reviewer: cursor
artifact_sha: 8a6b863d09db0619a6430ea8fd565be0f09150a5
completed_at: 2026-05-12T09:44:00Z
verdict: proceed_after_patches
findings:
  - severity: medium
    where: "§AC2 — Helper / watcher boundary — single git block (shell excerpt)"
    finding: "The canonical two-line `git add` lists `r<N+1>/request.md` with a comment ‘absent in case (a)/(c)’, but a literal copy-paste still runs `git add` on a path that does not exist on (a)/(c). Plain `git add <missing-path>` fails; the spec should show a shell-safe pattern (conditional `[ -f … ] && git add`, two explicit variants, or documented `git add --ignore-missing` if you intend that dependency), so builder and strategist slash-command stay isomorphic."
  - severity: low
    where: "§AC2 — same block — tools/review-queue/push-with-retry.sh line"
    finding: "The example push string is always `dispatch: r<N+1> on <item_id>` while the alternate commit message for (a)/(c) is `review-r<N>: terminal …`. Operational messages should use `N` vs `N+1` consistently with what changed, or the line should say ‘message varies by branch’ so log greps match commits."
  - severity: nit
    where: "§AC1 — Idempotency bullet vs §AC3 fixture 1"
    finding: "‘Never reformats’ plus ‘only targeted change’ is coherent with fixture 1’s semantic framing (body stable; `next_round` delta). No change required; builder should treat ‘no reformats’ as ‘no unintended semantic edits’ rather than byte-stable YAML cosmetics on unrelated keys."
---

# Reviewer notes (R2 @ `8a6b863`)

## R1 disposition check (focus_hints)

- **(a)** `os.replace` overwrite pattern for existing `combined.md` + explicit ban on create-only `os.link` — addresses Codex M1; matches the load-bearing existence precondition.
- **(b)** `verdict ∈ {proceed, pushback}` with `patches-applied=false` for the no-transition tuple — addresses convergent Cursor R1 M1 + Codex M3.
- **(c)** `[--spec-sha=…]` on the helper with pass-through to `request.py` — addresses Codex M2 / AC3 fixture 3.
- **(d)** Goal + AC2 boundary: helper file-mutations-only; single post-helper `git add`/`commit`/`push-with-retry` — addresses convergent Cursor R1 M2 + Codex L4.
- **(e)** AC3 fixture 1 wording now matches the weaker, correct invariant (markdown body below `---`; semantic `next_round` delta; schema-validates) — Cursor R1 L7 landed.

## Second-order

- **Race helper→commit:** Single-threaded `/loop` tick plus local-fs tests keep this low-risk; no spec change needed. Concurrent double-ticks would be operator error / separate item.

## Convergence call

**`proceed_after_patches`** — tighten the AC2 shell excerpt for missing `r{N+1}/request.md` and optionally align the push-with-retry argument with the (a)/(b)/(c) branch, then claim-ready for implementation.
