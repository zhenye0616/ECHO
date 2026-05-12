---
item_id: 2026-05-12-040-watcher-state-executable-test
round: 1
reviewer: cursor
artifact_sha: 4c6d98f9b4eab66f3c42a406bb99003a4e24b60e
completed_at: 2026-05-12T09:19:00Z
verdict: proceed_after_patches
findings:
  - severity: medium
    where: "§AC1 branch (a) vs .claude/commands/review-queue-watch.md Step 3 — (a) Zero patches applied → convergence"
    finding: "The spec’s AC1 (a) only names `verdict=proceed` with `patches-applied=false`, but the watcher’s (a) branch also covers `pushback` where all findings are deferred to follow-ups (same ‘no verification round’ outcome). Without an explicit tuple for that case, the helper’s CLI or docs can drift from the slash-command and silently miss a legal (a) invocation."
  - severity: medium
    where: "§Goal (quoted (b)-branch shell) vs §AC1 (b) Behavior"
    finding: "The Goal paragraph quotes the extracted sequence as `request.py … && git add r{N+1}/request.md && set next_round=…`, but AC1 (b) describes only `request.py` then editing `r{N}/combined.md`. Clarify whether staging `r{N+1}/request.md` is inside the helper (and whether any `git commit` semantics move with it) or remains separate lines in the slash-command — AC2 prose and AC3 fixtures depend on that boundary."
  - severity: low
    where: "§AC3 — fixture 1 — assertions bullet on `r1/combined.md`"
    finding: ""Body is unchanged byte-for-byte except for that single frontmatter field" reads as if only one scalar changes; in practice the entire YAML frontmatter block may reformat. Prefer wording like: markdown body below the closing `---` unchanged; `next_round` in frontmatter is the only semantic delta (and schema-validates)."
  - severity: nit
    where: "request.md focus_hints — helper vs watcher factoring"
    finding: "The split is right: the helper should execute idempotent file mutations and race semantics; the strategist still fills the Disposition column and reads the (a)/(b)/(c) narrative. No need to fold disposition prose into code."
---

# Reviewer notes (R1 @ `4c6d98f`)

## Coherence

- **039 / queue contract:** Preserving `combine.py` → `next_round: null` and promoting `next_round` only in the watcher path matches the cited 039 design and §Out of Scope.
- **Race-loser parity:** Pointing implementers at `request.py` §AC2 + optional `--spec-sha` for tests is consistent with existing tooling; AC3 fixture 3 matches the intent.
- **AC6:** Correctly labeled observational; avoid encoding it as a vitest assertion.

## Spec-template answer

Helper executes; watcher slash-command stays human-readable for disposition. Do not move (a)/(b)/(c) judgment into the helper.

## Convergence call

**`proceed_after_patches`** — patch AC1 (a) + Goal/AC1 (b) boundary, and optionally tighten the AC3 wording, then builder can implement without guessing.
