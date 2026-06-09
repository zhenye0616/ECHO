---
id: 2026-06-08-099-code-owned-sidecar-writer
title: "Code-owned sidecar writer (emit-sidecar.py) so the review-pending producer field is stamped, not LLM-transcribed"
status: proposed
priority: MEDIUM
estimate: 3h
created: 2026-06-08
blocked_by: []
task_state_ref: 2026-06-08-099-code-owned-sidecar-writer
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
  - tools/review-queue/emit-sidecar.py            # NEW — code-owned sidecar writer. Reads a structured (JSON) sidecar descriptor from --input FILE or stdin; derives `producer` PROGRAMMATICALLY (the constant orchestrator value, NOT taken from input); stamps `reviewed_at` in canonical UTC Z; assembles frontmatter+body; validates via the shared helper BEFORE writing; writes atomically (temp + os.replace). Exits non-zero WITHOUT writing on any validation failure.
  - tools/review-queue/_sidecar_validate.py       # NEW — import-safe validation helper extracted from validate-sidecar.py (hyphenated filename is not importable). Exposes a pure `validate(fm, body) -> str | None` (returns an error message or None) + the schema/heading constants. Both validate-sidecar.py and emit-sidecar.py import it; zero duplicated validation logic. (codex consult F4)
  - tools/review-queue/validate-sidecar.py        # MODIFY — re-implement on top of _sidecar_validate.py; CLI behavior (argv, exit codes, stderr messages) unchanged.
  - tools/review-queue/schemas/review-sidecar.schema.json  # MODIFY — collapse `producer` from its current three-value enum (claude-code-subagent, codex-child, review-pending-orchestrator) to the single value `review-pending-orchestrator` (const / one-element enum). Any other producer value fails validation; a future second writer requires an explicit schema/spec change. (codex consult F6 — do NOT "retire the enum" into free-form.)
  - tools/review-queue/check-coupled-invariants.sh # MODIFY — add check_pending_review_sidecars(): run validation over every committed *.review.md under backlog/pending_review/ (the LIVE set only — repo-tracked, no HOME dependency); fail the gate on any invalid sidecar. Absent/empty pending_review/ is a clean pass. (the "validate-sidecar.py CI gate" half of the followup; the independent second guard per codex F3.)
  - skills/review-pending.md                       # MODIFY — replace the hand-authored sidecar frontmatter block (the `producer: review-pending-orchestrator` transcription site at ~line 177) with an invocation of emit-sidecar.py fed a structured descriptor. Remove the literal producer line so transcription can no longer drift.
  - .claude/commands/review-pending.md             # MODIFY (generated) — re-sync from skills/review-pending.md via `tools/sync-skills.sh` so `sync-skills.sh --check` / check_skill_adapters stays green. Do NOT hand-edit; run the sync script.
  - tools/review-queue/test-emit-sidecar.sh        # NEW — shell test mirroring test-validate-sidecar.sh: valid descriptor → sidecar written + validates; input supplying a non-constant producer → reject (no write); missing required field → reject (no write); existing target without --replace → reject; with --replace → overwrite.
spec_refs:
  - backlog/_followups.md                                   # R6.adapter_freshness "Code-owned emit-sidecar.py writer + resolve producer to writer-role" — READ FIRST. Note the same section's "generalize freshness gate to ALL adapters" bullet is DELIBERATELY out of scope here (see Out of Scope).
  - tools/review-queue/test-validate-sidecar.sh             # reference — the existing validate-sidecar test; mirror its harness style for test-emit-sidecar.sh and confirm validate-sidecar's own tests still pass after the _sidecar_validate.py extraction.
  - tools/review-queue/_lib.py                              # reference — provides parse_frontmatter() used by validate-sidecar.py; emit-sidecar.py emits frontmatter that _lib.parse_frontmatter() round-trips.
  - tools/sync-skills.sh                                    # reference — the adapter sync; run `tools/sync-skills.sh` after editing skills/review-pending.md, then `--check` to confirm no drift.
---

## Why

The `/review-pending` sidecar is a machine-consumed artifact: `merge-and-cleanup` reads its frontmatter (`verdict`, `producer`, `test_counts`, …) and body headings. Today that frontmatter is **hand-authored by an LLM** in `skills/review-pending.md` — the schema-`required` `producer` field is a literal prose line (`producer: review-pending-orchestrator`, ~line 177). LLM transcription is exactly the wrong mechanism for a machine-consumed field: it produced the **wrong `producer` value twice on the 087 sidecar**. `tools/review-queue/validate-sidecar.py` already validates a sidecar *after the fact*, but nothing *writes* one — so a non-conformant sidecar is only caught if someone runs the validator, and the field is "emitted only by hand-copied prose, never programmatically" (confirmed by the codex consult).

This is the **R6.adapter_freshness** root: a control-plane artifact whose writer is human discipline + a prose template, not code. The fix is a **code-owned writer**: `emit-sidecar.py` stamps `producer` programmatically, validates-before-write, and refuses to emit an invalid artifact — moving correctness from "the LLM copied the right string" to "the writer cannot produce a wrong one."

**Cross-vendor consult (Codex, read-only, pre-spec).** Codex stress-tested a broader two-deliverable design and surfaced one HIGH layering conflict that reshaped this spec: the *other* R6.adapter_freshness bullet — generalizing the freshness gate to cover the Codex render target `~/.codex/skills/ECHO:*` by wiring `install-echo-codex-skills.sh --check` into `check-coupled-invariants.sh` — would make **merges depend on one operator's HOME** (that path is operator-local install cache, not repo-tracked). That is the wrong layer for a merge invariant. Per Codex's recommendation this spec is **split**: ship the code-owned-writer correctness fix now (A), and rescope the adapter-cache freshness gate (B) as a separate item that lands in `echoctl doctor` / the installer's own selftest rather than the merge gate. Codex's other findings (keep both guards F3; import-safe helper not shell-out F4; `producer` as schema `const` not free-form F6; fail-unless-`--replace` F7; structured stdin not many markdown flags F8) are folded into the acceptance criteria below.

## Locked decisions

1. **`producer` is stamped, never input-derived.** emit-sidecar.py sets it to the constant `review-pending-orchestrator`. If the input descriptor contains a conflicting `producer`, that is an error (reject) — the writer is the single source of truth for the field.
2. **Two guards, not one** (codex F3). emit-sidecar.py validates-before-write (prevents bad artifacts at the source); the `check-coupled-invariants.sh` pending-review sidecar check is the independent gate that catches hand edits, stale prompts, and out-of-band sidecars.
3. **One import-safe validation implementation** (codex F4). Extract `_sidecar_validate.py`; both CLIs import it. No shelling out, no duplicated logic.
4. **`producer` stays schema-`required`, tightened to `const`** (codex F6). Retiring it to free-form would re-open the drift; a second writer must change the schema deliberately.
5. **Fail-closed on an existing target** (codex F7). Writing defaults to refuse-if-exists; `--replace` is the explicit opt-in. This avoids silently pre-deciding the open `/review-pending` rerun-policy follow-up.
6. **Structured input, not a pile of flags** (codex F8). The descriptor is JSON via `--input FILE` or stdin; atomic temp-validate-then-rename so shell quoting never becomes the next transcription bug.
7. **The pending-review sidecar gate scans only `backlog/pending_review/`.** Historical sidecars in `complete/` predate the schema and are not migrated; the live set is what must be conformant before a merge.
8. **One finalize path: same-dir temp → validate → atomic link** (codex r1 #2 / codex-ops r1 #1, hardened by codex-ops r2 #1). The fail-closed guarantee (decision 5) must survive a TOCTOU race AND a crash mid-write. The canonical sidecar path is **never** opened for writing directly — that would expose a truncated `*.review.md` on an interrupted/disk-full/killed run, blocking reruns and later failing validation. Instead the writer always: (1) writes the fully-assembled, already-validated content to a temp file in the target's **own directory**, (2) closes it, then (3) finalizes. Default (`--replace` absent): finalize via atomic **no-clobber** link (`os.link`, or an equivalent no-replace rename) — if the target exists at link time the writer exits non-zero, leaves the existing file untouched, writes nothing, and cleans up its temp. `--replace`: finalize via `os.replace` (atomic last-writer-wins). The direct `open(O_CREAT|O_EXCL)`-on-canonical-path option from r1 is **removed** — temp-then-link is the single safe path, so no partially-written canonical file is ever observable.

## Sidecar descriptor contract (codex r1 #1)

emit-sidecar.py consumes a single JSON object (`--input FILE` or stdin). **Accepted** keys come from the caller; **generated** keys are writer-owned and are an error if supplied with a conflicting value.

```json
{
  "item_id": "<item_id matching the schema item_id pattern>",
  "verdict": "merge as-is | merge with founder fixups | redo before merge | block",
  "test_counts": { "passed": 0, "failed": 0 },
  "body": {
    "verdict": "markdown rendered under `## Verdict`",
    "pre_merge_fixups": "markdown under `## Pre-merge fixups`",
    "expected_merge_conflicts": "markdown under `## Expected merge conflicts`",
    "followups": "markdown under `## Follow-up items (defer, do not block merge)`",
    "open_questions": "markdown under `## Open questions for founder` — REQUIRED iff verdict == block, forbidden otherwise"
  }
}
```

- **Accepted (caller-supplied):** `item_id`, `verdict`, `test_counts`, `body.*`.
- **Generated (writer-owned, reject on conflicting input):** `producer` (always `review-pending-orchestrator`), `reviewed_at` (current time, canonical UTC `…Z`).
- **Derived, NOT caller-supplied (codex-ops r2 #2 — removal over confinement):** the target path is **not** an input field. emit-sidecar.py resolves the repo root (`git rev-parse --show-toplevel`) and writes to `<repo_root>/backlog/pending_review/<item_id>.review.md`, where `<item_id>` is the descriptor's already-pattern-validated `item_id`. Removing a caller-supplied `target_path` eliminates the path-confinement surface at the root — there is no absolute path, `..`, or wrong-directory write to sanitize because the caller never names the path.
- **Forbidden:** any key not listed above (the assembled frontmatter must satisfy the schema's `additionalProperties: false`).
- The four required body headings (and the fifth `## Open questions for founder` when `verdict == block`) are emitted from `body.*` so the produced sidecar passes both the frontmatter schema and `validate-sidecar.py`'s heading checks in one shot.

## Acceptance criteria

- **AC1 — writer exists and is correct.** `tools/review-queue/emit-sidecar.py` reads the JSON descriptor (above) from `--input FILE` or stdin, derives the target path from `item_id` (NOT caller-supplied; `<repo_root>/backlog/pending_review/<item_id>.review.md`), derives `producer = "review-pending-orchestrator"` and `reviewed_at` (canonical UTC `…Z`) programmatically, rejects any input that supplies a conflicting `producer`/`reviewed_at` (or a `target_path`/other non-descriptor key), assembles frontmatter + the required body headings from `body.*`, and validates the assembled content via `_sidecar_validate.py` BEFORE it is finalized to the canonical path. On any validation failure it exits non-zero and writes nothing (staging temp, if any, is cleaned up).
- **AC2 — fail-closed on existing target, crash-safe, atomic.** The canonical path is never written directly (Locked decision 8): write validated content to a same-directory temp, close, then finalize. Default (`--replace` absent): finalize via atomic **no-clobber** link (`os.link` / no-replace rename); if the target exists at finalize time the writer exits non-zero, leaves the existing file untouched, writes nothing, and removes its temp — closing both the existence TOCTOU (two runs both observing a missing target) and the truncated-file-on-crash window. `--replace`: finalize via `os.replace` (atomic last-writer-wins). The temp lives in the target's own directory so link/replace is same-filesystem.
- **AC3 — single validation implementation.** `tools/review-queue/_sidecar_validate.py` is import-safe (underscore-named) and exposes a pure validation entry point; both `validate-sidecar.py` and `emit-sidecar.py` import it. `validate-sidecar.py`'s existing CLI contract (argv shape, exit codes, stderr messages) is unchanged and its existing tests still pass.
- **AC4 — producer is a single-value enum.** `schemas/review-sidecar.schema.json` collapses `producer` from its current three values (`claude-code-subagent`, `codex-child`, `review-pending-orchestrator`) to the single `review-pending-orchestrator` (a `const`, or one-element `enum`); a sidecar with any other producer fails validation through both code paths. The two retired values are not migrated in historical `complete/` sidecars (out of scope; the gate scans only `pending_review/`).
- **AC5 — independent CI gate.** `check-coupled-invariants.sh` validates every committed `*.review.md` under `backlog/pending_review/` and fails on any invalid one; an absent or empty `pending_review/` passes cleanly. The check reads only repo-tracked paths (no HOME / operator-local dependency).
- **AC6 — transcription site retired, cwd-independently.** `skills/review-pending.md` invokes emit-sidecar.py (fed the descriptor) instead of hand-authoring frontmatter; the literal `producer:` line is gone. The invocation resolves the repo root explicitly first (e.g. `ROOT="$(git rev-parse --show-toplevel)"` then `python3 "$ROOT/tools/review-queue/emit-sidecar.py" …`) so it works from an isolated/unattended worktree regardless of cwd; the `.claude/commands/review-pending.md` adapter (re-synced via `tools/sync-skills.sh`, `--check` green) embeds that exact invocation shape.
- **AC7 — tests.** `tools/review-queue/test-emit-sidecar.sh` is a standalone executable shell test run as `bash tools/review-queue/test-emit-sidecar.sh` (exit 0 = pass), mirroring how `test-validate-sidecar.sh` is run — there is no aggregate runner. It covers, for the writer: valid descriptor → written + passes `validate-sidecar.py`; input with a non-constant producer → reject (no write); missing required field → reject (no write); existing target without `--replace` → reject (existing file untouched); a target that appears between staging and finalization → reject with no overwrite (TOCTOU); with `--replace` → overwrite. It additionally covers **the AC5 gate**: `check-coupled-invariants.sh` passes with an empty `pending_review/`, and fails — printing the offending path — when an invalid committed `*.review.md` is present. The gate-test cases that need a committed invalid fixture run inside a **disposable temp git repo/worktree with a cleanup trap** (codex-ops r2 #3) — they must not `git add`, commit, or leave dirty `pending_review/` artifacts in the caller's checkout, index, or working tree, even on failure.

## Out of Scope (Don't Drift)

- **Generalized Codex/all-adapter freshness gate** (`install-echo-codex-skills.sh --check` + wiring into `check-coupled-invariants.sh`). Codex consult HIGH: `~/.codex/skills/ECHO:*` is HOME-relative operator-local cache; gating merges on it makes merges operator-specific. Belongs in `echoctl doctor` / installer selftest, not the merge invariant — **rescoped as a separate item** (see After Completion).
- **`echo_skill()` render-at-use-time** — endgame, deferred per followups.
- **Watcher marker-write enforcement** — separate R4 concern.
- **New sidecar fields / changed body headings** consumed by merge-and-cleanup — none.
- **Migrating or re-validating historical sidecars in `complete/`** — the gate scans only `pending_review/`.
- **The `/review-pending` rerun/overwrite policy** — emit-sidecar.py stays fail-closed (`--replace` opt-in); it does not decide that open follow-up.

## After Completion (Strategist Notes)

- **`backlog/_followups.md` → R6.adapter_freshness:** mark the "Code-owned emit-sidecar.py writer + resolve producer to writer-role" bullet (incl. the validate-sidecar CI gate) **resolved** with this item's commit. **Rescope** the "Generalize skill-adapter freshness gate to ALL client adapters" bullet into a new proposed item, recording the codex-surfaced constraint: a Codex-adapter freshness check must NOT live in the merge-invariant gate (HOME-relative operator-local state); land it in `echoctl doctor` / `install-echo-codex-skills.sh --check` as an operator-side selftest instead. Mark "Stale Codex producer field" and "C2 adapter-drift detection for Codex-installer adapter" as carried into that successor.
- **Wiki:** none — internal review-queue harness tooling, not a product surface. Optionally add a one-line note to the operating-model adapter-freshness discussion if one exists.
