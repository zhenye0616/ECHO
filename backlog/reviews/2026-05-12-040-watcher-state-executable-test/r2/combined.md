---
item_id: 2026-05-12-040-watcher-state-executable-test
round: 2
combined_at: '2026-05-12T09:47:41Z'
codex_response: codex.md
cursor_response: cursor.md
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
| 1 | MEDIUM | codex | AC3 lines 79-82 and tools/review-queue/request.py find_artifact | **accept — patch AC3 fixture preamble** | Test tmpdir must also contain `backlog/ready/<item_id>.md` because `request.py find_artifact()` walks `backlog/{ready,claimed,pending_review,complete}/`. Cheaper than threading `--artifact-path` through the helper (which would require widening both helper + request.py CLI). Patch the fixture preamble in AC3 to specify the file is written to tmpdir alongside r1/. |
| 2 | MEDIUM | codex | AC1 lines 58 and 60, AC3 line 82, Implementation hints line 133 | **accept — weaken AC1 idempotency** (folded with row 6) | The R1 patch added "never reformats the YAML frontmatter or markdown body beyond the one targeted change" to AC1, which contradicts AC3 fixture 1's accepted-cosmetic-reformat clause. Resolve by weakening AC1: "no unintended **semantic** edits on any other field; YAML cosmetic reformatting of unrelated keys is permitted but should be minimized". Use a YAML round-trip serializer (e.g., ruamel.yaml) if byte-stability of unrelated keys is needed; otherwise PyYAML's stdlib emitter is fine because the assertions in AC3 check semantic invariants only. |
| 3 | LOW | codex | AC2 lines 68-73 | **accept — branch-specific git variants** (convergent on direction with row 4) | `git add backlog/.../r{N+1}/request.md` errors with non-zero exit if the file doesn't exist on (a)/(c). Patch AC2 to show two explicit variants: (b) adds both files; (a)/(c) adds only `r{N}/combined.md`. Avoid `--ignore-missing` (no such flag; `--pathspec-from-file` is overkill). |
| 4 | MEDIUM | cursor | §AC2 — Helper / watcher boundary — single git block (shell excerpt) | **accept — convergent on direction with row 3** | Same gap; same patch. Cursor's preferred prescription (two explicit variants OR `[ -f path ] && git add path` shell-conditional) — going with two explicit variants for readability. |
| 5 | LOW | cursor | §AC2 — same block — tools/review-queue/push-with-retry.sh line | **accept — align commit + push messages with branch** | (b) → commit message `review-r{N+1}: dispatch on <item_id>`, push message `dispatch: r{N+1} on <item_id>`. (a)/(c) → commit message `review-r{N}: terminal on <item_id>`, push message `terminal: r{N} on <item_id>`. Folded into the row 3/4 AC2 patch. |
| 6 | NIT | cursor | §AC1 — Idempotency bullet vs §AC3 fixture 1 | **accept — folded into row 2** | Cursor's reading ("never reformats" = "no unintended semantic edits") is the right one; row 2 patch makes that explicit. No standalone patch. |

## Convergence call

**needs R3 — focus_hints**: Verify (a) AC3 fixture preamble now creates `backlog/ready/<item_id>.md` in tmpdir alongside r1/; (b) AC1 idempotency clause weakened to "no unintended semantic edits on any other field; YAML cosmetic reformatting permitted but minimized"; (c) AC2 git block now shows two explicit variants (one for (b) with both files, one for (a)/(c) with combined.md only) plus branch-aligned commit + push messages. Three patches; one converged-on pair (rows 3+4); one fold (rows 2+6). R2→R3 decay: 6 findings → 3 spec patches.

