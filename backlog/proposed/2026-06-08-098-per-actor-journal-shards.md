---
id: 2026-06-08-098-per-actor-journal-shards
title: "Per-actor dogfooding-journal shards so concurrent reviewer/watcher/monitor writers stop conflicting on one file"
status: proposed
priority: HIGH
estimate: 4h
created: 2026-06-08
blocked_by: []
task_state_ref: 2026-06-08-098-per-actor-journal-shards
requested_reviewers: ["codex", "codex-ops"]
ready_content_sha: ""
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
files_to_modify:
  - tools/review-queue/_run_reviewer.sh        # append_wrapper_journal(): write to the per-actor shard mcp-interactions-journal-<month>-<REVIEWER_NAME>.md instead of the shared monthly file; commit/push message unchanged.
  - tools/dogfooding/journal-cat.sh            # NEW — read/merge helper: concatenate all mcp-interactions-journal-<month>*.md shards for a month in chronological entry order; the canonical "read the journal" + HTML-regen + synthesis entrypoint.
  - tests/dogfooding/journal-cat.test.ts       # NEW — assert the merge helper orders entries across shards by entry timestamp and is deterministic; assert the wrapper shard path is per-actor (shape test).
  - CLAUDE.md                                  # Dogfooding-journal discipline section: switch the canonical path from mcp-interactions-journal-YYYY-MM.md to per-actor shards mcp-interactions-journal-YYYY-MM-<actor>.md; define the actor-slug set + the read-via-merge rule; keep the in-the-moment + 6-field template rules verbatim.
spec_refs:
  - backlog/_followups.md                                          # R6 HEADLINE "shared dogfooding journal has no concurrency story (corroborated 4x)" — READ FIRST; R6.shared_file_concurrency.
  - tools/review-queue/push-with-retry.sh                          # reference ONLY — the shared pull --rebase=merges + push helper; NOT modified (it already works; per-actor shards make its rebase conflict-free).
  - raw/internal/dogfooding/mcp-interactions-journal-2026-06.md    # current shared shard + preamble/template to mirror into per-actor shards; this file is FROZEN at cutover (see AC4), not rewritten.
  - skills/review-queue-claude.md                                  # reference — reviewer skills journal AFTER committing the response; the wrapper owns the write path being changed.
---

## Why

The dogfooding journal is the highest-signal artifact ECHO produces, and it has **no concurrency story** — the single recurring R6 HEADLINE failure (corroborated 4×; hand-resolved 5× in 091; hit twice more in the 095 full-auto run). Every reviewer wrapper (`_run_reviewer.sh` `append_wrapper_journal`), watcher tick, monitor, and interactive AI client appends to the **same** monthly file `raw/internal/dogfooding/mcp-interactions-journal-YYYY-MM.md`, then runs `push-with-retry.sh` (`git pull --rebase=merges origin main && git push`). Concurrent writers append to the **same EOF region**, so the rebase replay hits a content conflict that a human must hand-resolve by chronological union.

The contention **scales exactly with the parallelism the product sells** — more concurrent agents (reviewers + watcher + monitors in one round) = more collisions. `--rebase=merges` and `rebase.autoStash` are already in place; they do not help, because the conflict is two appends to one file, not a merge-commit-replay problem.

**Root fix: per-actor shards.** If each writer appends only to its own file `mcp-interactions-journal-YYYY-MM-<actor>.md`, no two writers ever touch the same file, so `git pull --rebase` always replays cleanly (disjoint paths = no content conflict) and concurrent journal pushes resolve automatically. The journal becomes the **union** of shards, read through a small merge helper. This is the followups' named fix ("per-actor journal shards (`...-<role>.md`)").

## Locked decisions

1. **Per-actor monthly shards.** The journal path becomes `raw/internal/dogfooding/mcp-interactions-journal-<YYYY-MM>-<actor>.md`. Each writer appends ONLY to its own `<actor>` shard. No writer ever reads-modifies-writes another actor's shard.
2. **Actor slug = the writer's binding identity**, lowercase `[a-z][a-z0-9-]*`: `claude`, `codex`, `codex-ops`, `cursor` (the reviewer/AI-client bindings). The reviewer wrapper uses its `$REVIEWER_NAME` (already in scope at the write site). An interactive AI client logging its own MCP calls uses its client slug (Claude Code → `claude`, Codex → `codex`, Cursor → `cursor`); the strategist/watcher (Claude) writes the `claude` shard. A new automated writer picks a stable slug from this namespace; it does not invent per-run slugs (that would explode the shard count).
3. **The journal is the union of shards.** "Reading the journal" = merging all `mcp-interactions-journal-<month>-*.md` shards (plus the legacy pre-cutover `mcp-interactions-journal-<month>.md` for months that have one) into one chronological stream by entry timestamp. A new helper `tools/dogfooding/journal-cat.sh <month>` is the canonical merge entrypoint, used by humans, the pandoc HTML-regen one-liner, and end-of-window synthesis.
4. **Cutover, not migration.** The existing shared `mcp-interactions-journal-2026-06.md` is **frozen in place** at cutover (its preamble gets a one-line "pre-shard shared file; new entries are in per-actor shards" note) and is NOT rewritten or split. New entries from the cutover commit onward go to per-actor shards. `journal-cat.sh` includes the frozen shared file in its merge so no history is lost. No content is moved or deleted (mirrors the monthly-shard and archive conventions already in use).
5. **`push-with-retry.sh` is unchanged.** The shard change makes its existing `pull --rebase=merges` conflict-free for journal commits; no push-mechanism rework. Same-actor *concurrent* writes (e.g. two `codex` ticks racing) remain theoretically possible but are out of scope — the documented, recurring collision is strictly cross-actor, which sharding fully eliminates.
6. **The in-the-moment discipline and 6-field entry template are unchanged.** Only the destination path changes. The skip-rule, journal-by-proxy rule, and template stay verbatim.

## Acceptance criteria

1. **Wrapper writes the per-actor shard.** `tools/review-queue/_run_reviewer.sh` `append_wrapper_journal()` computes `journal="$WT/raw/internal/dogfooding/mcp-interactions-journal-$month-$REVIEWER_NAME.md"` (was `…-$month.md`), creating it (with the standard preamble header if new) and appending the entry there. The `git add`/`commit`/`push-with-retry.sh` flow and the commit-message text are otherwise unchanged. A reviewer tick now only ever stages its own actor shard.
2. **New shard bootstrap.** When an actor's monthly shard does not exist, the writer creates it with the canonical preamble header (title line naming the month + actor, the timezone convention line, and the Quick-Fill Template block) so each shard is self-describing and the merge output reads coherently. Bootstrapping is idempotent (no duplicate preamble on subsequent appends).
3. **`journal-cat.sh <month>` merge helper.** New `tools/dogfooding/journal-cat.sh` takes a `YYYY-MM` argument, globs `raw/internal/dogfooding/mcp-interactions-journal-<month>*.md` (per-actor shards AND the legacy shared file if present), and emits one stream with entries ordered by their `### <timestamp>` headers (chronological). It strips duplicate per-shard preambles from the merged output (one header section, not N). It is read-only (never writes/commits). Deterministic ordering for equal timestamps (stable secondary sort, e.g. by actor slug then source line order).
4. **CLAUDE.md discipline updated.** The "Dogfooding journal discipline" section switches the canonical-path language from the single monthly shard to per-actor shards, states the actor-slug rule (LD2), and documents that reading = `journal-cat.sh`. The in-the-moment rule, skip-rule, journal-by-proxy rule, and the 6-field template are preserved verbatim (only the path/where changes). The current-shard pointer becomes a current-shard-set pointer.
5. **Tests + verification.** `tests/dogfooding/journal-cat.test.ts`: (a) given fixture shards for two actors with interleaved timestamps, the merge output is globally chronological; (b) duplicate preambles are collapsed to one; (c) equal-timestamp entries sort deterministically; (d) a shape assertion that the wrapper's computed journal path includes `-<actor>` (guards against regressing to the shared file). The pandoc HTML-regen one-liner is updated (in CLAUDE.md / preamble) to run against `journal-cat.sh <month>` output instead of the single file. Builder runs before review:
   ```bash
   npm run test -- tests/dogfooding/journal-cat.test.ts
   npm run typecheck
   npm run lint
   bash -n tools/review-queue/_run_reviewer.sh tools/dogfooding/journal-cat.sh
   ```

## Out of Scope (Don't Drift)

- **Rewriting / splitting the existing shared journal files.** Frozen-in-place + included in the merge only (LD4). No history rewrite, no back-fill of old entries into shards.
- **Same-actor concurrent-write safety.** Two simultaneous `codex` writers is not the documented failure and is not solved here (it would need one-file-per-entry or a lock). If real signal appears, file a successor. Do NOT pre-emptively switch to a directory-per-entry/maildir scheme in this item.
- **Changing `push-with-retry.sh`, the coord lifecycle, or the commit-message protocol.** Path-only change.
- **Changing the entry template, the 6 required fields, the skip-rule, or the journal-by-proxy rule.** Discipline content is unchanged; only the destination path moves.
- **A daemon/MCP-side journal writer or a structured (non-markdown) journal format.** Out of scope; markdown shards stay the format.
- **Per-actor shards for any OTHER shared file** (queue-errors.md, etc.). This item is the dogfooding journal only.

## After Completion (Strategist Notes)

- Update `backlog/_followups.md` R6: mark the **shared-journal concurrency HEADLINE** (`R6.shared_file_concurrency`) resolved by per-actor shards; note same-actor concurrency as the accepted residual.
- Update any skill that hardcodes the single-file journal path (`skills/review-queue-*.md`, `skills/review-pending.md`, `skills/process-backlog.md`, `skills/office-hours.md`) to reference the shard convention + `journal-cat.sh`, then re-run `tools/sync-skills.sh`. (Strategist post-merge pass — these are operating-model/skill edits, not builder code.)
- Consider an architecture/operating-model note: "shared-file-as-coordination-medium" is the R6 anti-pattern; per-actor shards are the worked example for any future shared artifact.
