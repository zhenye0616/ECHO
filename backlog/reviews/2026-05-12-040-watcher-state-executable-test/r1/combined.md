---
item_id: 2026-05-12-040-watcher-state-executable-test
round: 1
combined_at: '2026-05-12T09:36:00Z'
codex_response: codex.md
cursor_response: cursor.md
patch_commit_sha: 8a6b863
next_round: 2
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
| 1 | MEDIUM | codex | AC1 lines 53-57, tools/review-queue/_lib.py atomic_link_write | **accept — patch AC1 (b)/(c)** | Helper updates an existing `combined.md`; the create-only `os.link` pattern from `request.py` is wrong here. Patch AC1 to specify `os.replace(tmp, final)` for combined.md mutations (atomic rename, overwrite-allowed) and require the helper to be idempotent (re-read existing frontmatter; no-op if `next_round` already matches the target). |
| 2 | MEDIUM | codex | AC1 signature lines 44-50 and AC3 fixture 3 lines 73-76 | **accept — patch AC1 signature** | Add `[--spec-sha=<sha>]` to the helper's signature with a "test-only override; pass-through to request.py's existing `--spec-sha`" note. Fixture 3 (race-loser at different SHA) becomes implementable without requiring a real git repo in the test tmpdir. |
| 3 | MEDIUM | codex | AC1 behavior lines 53-57 and AC2 watcher parity line 59 | **accept — extend AC1 (a) tuple list** (convergent on direction with row 5) | The watcher's (a) branch covers `verdict=pushback` where all findings deferred to followups (no patches). AC1 (a) currently names only `verdict=proceed, patches-applied=false`. Extend to `verdict ∈ {proceed, pushback} AND patches-applied=false` → no-op, leave `next_round=null`. |
| 4 | LOW | codex | Goal line 38 and AC2 line 59 | **accept — patch Goal + AC2** (convergent on direction with row 6) | Helper is **file-mutations-only**: writes `r{N+1}/request.md` (via request.py invocation) + updates `r{N}/combined.md` (in-place). Helper does NOT stage, commit, or push. Watcher slash-command runs a single `git add backlog/reviews/<item_id>/r{N}/combined.md backlog/reviews/<item_id>/r{N+1}/request.md && git commit && push-with-retry.sh` block after helper returns 0. Update Goal's quoted shell to match. |
| 5 | MEDIUM | cursor | §AC1 branch (a) vs .claude/commands/review-queue-watch.md Step 3 — (a) Zero patches applied → convergence | **accept — convergent on direction with row 3** | Same gap as Codex M3; same patch applies. "Convergent on direction, divergent on prescription `where`" — combine.py's section-anchor match-key didn't collapse because Codex anchored at AC1+AC2 while Cursor anchored at AC1 vs watch.md. Spec-level fix is identical. |
| 6 | MEDIUM | cursor | §Goal (quoted (b)-branch shell) vs §AC1 (b) Behavior | **accept — convergent on direction with row 4** | Same gap as Codex L4; same patch applies. Goal paragraph's quoted sequence includes `git add r{N+1}/request.md` which is wrong if helper is file-mutations-only. |
| 7 | LOW | cursor | §AC3 — fixture 1 — assertions bullet on `r1/combined.md` | **accept — clarify wording** | Replace "Body is unchanged byte-for-byte except for that single frontmatter field" with "Markdown body below the closing `---` is unchanged; `next_round` in frontmatter is the only semantic delta (and the combined.md after-state schema-validates against `combined.schema.json`)". |
| 8 | NIT | cursor | request.md focus_hints — helper vs watcher factoring | **accept — no patch needed** | Cursor confirms the helper-executes / watcher-narrates split is right. Captured here as the explicit answer to the spec-template question in r1/request.md focus_hints. |

## Convergence call

**needs R2 — focus_hints**: Verify (a) AC1 (b)/(c) now uses `os.replace` not `os.link`-create-only; (b) AC1 (a) names `verdict ∈ {proceed, pushback} AND patches-applied=false` as the no-patches tuple; (c) `--spec-sha` is in the helper signature with pass-through to request.py; (d) helper is file-mutations-only (Goal + AC2 + AC1 prose all agree no `git add`/`commit`/`push` inside helper); (e) AC3 fixture 1 wording uses the "markdown body below `---` unchanged + `next_round` is the only frontmatter delta + combined.md schema-validates" form. Five load-bearing patches; one cleanup; one no-patch acknowledgment.

