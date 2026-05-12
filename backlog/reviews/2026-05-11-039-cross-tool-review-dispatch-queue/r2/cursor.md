---
item_id: 2026-05-11-039-cross-tool-review-dispatch-queue
round: 2
reviewer: cursor
artifact_sha: 556b978fc9ee308e5ffef610f104d8bee96ef722
completed_at: 2026-05-12T07:14:00Z
verdict: proceed_after_patches
findings:
  - severity: high
    where: §Implementation Notes "Strategist watcher" + §AC3 + §AC4
    cross_ref:
      round: 1
      reviewer: cursor
      finding_index: 1
    finding: |
      The strategist `/loop` body is not specced as an AC. AC3 covers the two reviewer slash commands
      (`.claude/commands/review-queue-{codex,cursor}.md`). RC2 §Implementation Notes "Strategist watcher"
      mandates `/loop 10m /review-queue-watch` in the strategist's own session, but no AC defines what
      `.claude/commands/review-queue-watch.md` does. AC4 specs `combine.py` (mechanical roll-up only), and
      AC4 step 3 explicitly defers the rest: "Strategist then fills the disposition column and the
      convergence call manually." That "manually" is the load-bearing word — if it means "founder types
      into the strategist's window," AC6b's "0 dispatch messages" is unreachable (this is the same
      pathology R1 H1 caught at a different layer). If it means "the strategist agent autonomously
      dispositions findings + patches spec + writes r{N+1} request.md inside the same /loop tick," that
      workflow needs an explicit AC.

      Required strategist /loop tick body (mirrors AC3 for reviewers):
        1. `git pull --rebase origin main` (mirror AC3 step 1).
        2. Run `combine.py` for any rounds needing combine (current AC4).
        3. For each fresh `combined.md`:
           a. If `escalated_to_founder: true`: append a journal entry citing the queue path; exit. Founder
              will see and act on next session.
           b. Else: read the convergent + divergent findings tables, disposition each row (the judgment
              step), commit the disposition update to combined.md, patch the spec file with accepted
              findings, commit the patch, push (with pull-rebase-retry per AC3 step 5), then either
              (i) declare convergence (set `next_round: null`) and exit, OR
              (ii) run `request.py <item> <N+1>` to write `r{N+1}/request.md`, commit, push.
        4. Exit (one round per tick; next tick picks up further work).

      Without this AC, the H1 fix's intent (autonomous strategist /loop) is not buildable. Suggest filing
      as AC3.5 or AC4.5 — mirror AC3's structure so the implementer can build all three slash commands in
      parallel.

  - severity: high
    where: §AC0 step 4 (Cursor fallback)
    finding: |
      AC0's "Cursor-shaped fallback" introduces drift back into §"Out of Scope" #1 ("Push-based GUI
      pinging"). The bullet reads (l.232):

        "Provide a Cursor-shaped fallback in case Cursor has no native polling: a `cron`/`launchd`
        daemon that injects the canonical prompt into the Cursor session every 10 min via OS-level
        keyboard automation, OR (preferred) a paste-once long-running prompt that the founder pastes
        once per session and Cursor self-loops, or a `cron`-launched detached Cursor process."

      "OS-level keyboard automation" is exactly the brittle UI-integration that Codex's RC1
      recommendation rejected and that §Out of Scope #1 enshrined. The "cron-launched detached Cursor
      process" option is borderline — if it requires launching a Cursor window and injecting a prompt,
      that's also GUI-ping-adjacent.

      Resolution: delete the keyboard-automation option. Keep option (b) "paste-once long-running prompt
      that the founder pastes once per session and Cursor self-loops" as the preferred and only safe
      fallback. If Cursor lacks both native polling AND a viable self-loop pattern, document the
      degradation explicitly per AC0's existing line 237 ("founder pastes the prompt manually every 10
      min — degrades cleanly to the pre-queue manual flow for that one reviewer"). Don't reintroduce the
      rejected push-pattern through the back door of a "fallback" the spec elsewhere prohibits.

  - severity: medium
    where: §Architecture push-race semantics + §AC3 step 5 + §AC4 step 3
    finding: |
      Push-race retry pattern is asymmetric between reviewers (AC3 step 5) and the strategist (AC4 step
      3). AC3 step 5 specs `git pull --rebase origin main && git push origin main` with one retry and a
      `PUSH-RACE-FALLBACK` journal line. AC4 step 3 says "Commit and push the `combined.md` (operational
      commit, not founder-gated)" — no retry logic specced. The strategist has at least three operational
      push types per §"Out of Scope" #4:

        - reviewer response push (covered by AC3 step 5 retry)
        - strategist combined.md push (uncovered)
        - strategist patch+next-request push (uncovered — falls under the new strategist /loop AC from
          R2-H1)

      With ~3 reviewer-loop ticks and ~1-2 strategist-loop ticks running concurrently, push races between
      strategist and reviewer pushes are not theoretical. Apply the AC3-step-5 pattern uniformly across
      all three operational push types in §Architecture push-race semantics. One paragraph + one shared
      retry helper script (e.g., `tools/review-queue/push-with-retry.sh`) closes this.

  - severity: medium
    where: §AC6a (synthetic e2e test)
    finding: |
      AC6a is happy-path only. The dispatch prompt asked specifically whether AC6a covers the failure
      modes R1-H2/H3/H4 named. AC5 covers them at unit-level (`concurrency.test.ts`), but AC6a's e2e
      flow runs in clean state — no orphan tmps, no races, no push failures, no SHA drift, no missing
      reviewer. The "no founder messages were synthesized in the harness" assertion (step 7) tests
      dispatch-freeness only under best-case conditions.

      Two acceptable resolutions; spec should pick one and say so:

        (a) Add at least one integration-level failure-mode test inside AC6a. Minimum addition:
            before step 4 (run combine.py), drop a stale `codex.md.<uuid>.tmp` (mtime set 31 min in
            the past) and a fresh `cursor.md.<uuid>.tmp` (mtime 1 min). Run combine.py. Assert the
            stale one is cleaned up, the fresh one is left alone, the combined.md is produced
            correctly. This validates the AC4 cleanup step inside the e2e flow without requiring
            multi-process orchestration.

        (b) Explicitly note in AC6a that it is happy-path-only and document the boundary: "Failure-mode
            tests (orphan cleanup, push race, SHA drift, missing reviewer) are covered at unit level by
            AC5. AC6a validates only the dispatch-freeness of the full flow under clean conditions."

      (a) is preferred because the orphan-cleanup-during-combine path is an integration concern, not
      purely unit-testable; combine.py's cleanup interacts with its scan logic, and that interaction
      deserves an integration test. But either resolution is defensible — don't leave the boundary
      implicit.

  - severity: medium
    where: §Architecture push-race "PUSH-RACE-FALLBACK" journal line vs §Implementation Notes
           "JOURNAL-AS-QUEUE PROHIBITION" invariant
    finding: |
      The push-race fallback (l.212-213) writes `PUSH-RACE-FALLBACK: review-r<N>: <reviewer> on
      <item_id> sha=<commit>` to the dogfooding journal when both push attempts fail. The §Implementation
      Notes invariant (R1 patch, promoted from §Out of Scope #2) says "Reviewer prompts MUST NOT write
      to the dogfooding journal as part of the queue handshake." These two rules are in tension. Two
      resolutions:

        (a) Carve out explicitly: "Journal-as-queue prohibition applies to NORMAL queue handshake
            (request → response → combined). Emergency error logs on the queue's failure path
            (PUSH-RACE-FALLBACK, sha-drift retry, orphan-tmp-cleanup-warning) ARE allowed in the
            journal and treated as observation, not coordination." Document the carve-out in the
            same Implementation Notes section that holds the invariant.

        (b) Move queue error logs to a separate file: `raw/internal/queue-errors.log` (or similar) —
            keeps the journal invariant absolute, gives operators a single place to look for queue
            failures, and avoids the cross-reviewer journal-edit race that fired live in 039 R1.

      (b) is structurally cleaner (one purpose per file) and matches the "no shared write surface"
      principle that the invariant exists to protect; (a) is simpler to implement. Either works, but
      the current spec has both rules present without resolution, which will confuse the implementer.

  - severity: medium
    where: §AC1 verdict-enum context-awareness
    finding: |
      AC1 (l.246) reads: "`verdict` enum is `{proceed, proceed_after_patches, pushback, divergent,
      single_reviewer_timeout}` (R1 patch — Cursor M1 split). `divergent` and `single_reviewer_timeout`
      are valid ONLY in `combined.md`, not in `<reviewer>.md`."

      The schema architecture is not specced. Two readable architectures:
        (a) Three separate JSON Schemas (one per file shape — request.md, <reviewer>.md, combined.md),
            each with its own `verdict`/`combined_verdict` enum scoped to that file's valid values.
        (b) One shared schema with context-conditional enums (e.g., `oneOf` clauses keyed off the file's
            implicit type).

      (a) is simpler and matches the three-file-shape mental model the spec uses everywhere else. (b)
      saves DRY at the cost of validator complexity. One sentence in AC1 picking the architecture
      prevents implementer drift and makes the validator test cases unambiguous.

  - severity: low
    where: §request.md frontmatter `prior_round_atoms` field shape vs stated purpose
    finding: |
      The `prior_round_atoms` field (l.84-87) holds pointers: `source: fs:...`, `atom_id: <uuid>`,
      `note: "..."`. But the body description (l.98-99) says: "If prior-round context matters,
      `prior_round_atoms` lets the strategist embed the relevant atoms inline — reviewers read them via
      the request.md body itself, no ECHO call required."

      Pointers are not inline embeds. To read the atom from a pointer alone, a reviewer must call ECHO
      `get_atom({id: <uuid>})`. That contradicts the "no ECHO call required" claim. Three reasonable
      resolutions:

        (a) Add a `content: |` field to each entry carrying verbatim atom text. Field name +
            description then match. Body becomes a true inline embed.
        (b) Keep the field pointer-only; remove the "embed inline" wording. The body section is where
            actual embeds go (the strategist pastes atom content into the markdown body, not the
            frontmatter).
        (c) Drop the field entirely. Strategists who want to embed atoms paste them in the body section.

      (b) is simplest; (c) is even simpler. (a) is the only resolution that lets the frontmatter
      ACTUALLY carry the embed; current field shape can't fulfill its stated purpose.

  - severity: low
    where: §AC4 verdict roll-up table (l.301-309)
    finding: |
      Table is asymmetric on codex/cursor column order. Only canonical orderings are shown (Codex's
      verdict in column 1, Cursor's in column 2). Inverse pairings — `proceed_after_patches | proceed`,
      `pushback | proceed`, `pushback | proceed_after_patches` — are implied symmetric but not listed.
      Either:
        (a) List all 9 reviewer×reviewer pairings explicitly (plus the 2 missing-reviewer rows), OR
        (b) Add a one-line note: "Verdict roll-up is commutative on the codex/cursor column order; the
            table lists canonical orderings."
      (b) is preferred for brevity.

  - severity: low
    where: §AC4 verdict roll-up table — both-reviewers-missing case
    finding: |
      Roll-up table covers `(missing) | *` and `* | (missing)`, both producing
      `single_reviewer_timeout`. It does NOT cover `(missing) | (missing)` — both reviewers silent past
      timeout. That state can fire if both reviewer loops are stopped or both clients are down. Suggest:
      either add a row `(missing) | (missing) → no_responses` with `escalated_to_founder: true`, or
      have `combine.py` exit-with-error and surface "no responses at all — verify reviewer loops are
      running" via the journal. The current spec lets this case fall through implicitly.

  - severity: low
    where: §request.md frontmatter `requested_reviewers` vs reviewer enum extensibility
    finding: |
      `requested_reviewers: [codex, cursor]` is a list; the `reviewer` enum (AC1) is `{codex, cursor}`
      for V1 with a schema note marking it extensible per After Completion §5.3. Consistent so far. But
      `request.md` does not specify what happens when `requested_reviewers` contains a value the
      `reviewer` enum doesn't yet support (e.g., strategist tests a third reviewer before the enum
      extension lands). Suggest: `requested_reviewers` values MUST be a subset of the current `reviewer`
      enum; validator errors on mismatch. One-line schema rule, prevents the "strategist requests gemini
      / no schema supports it" silent failure mode.
---

# Reviewer notes

## R2 cycle health

R1→RC2 patch quality is high: all 15 R1 findings dispositioned with concrete spec changes, and the §Review History block makes the patch self-documenting. Future R3 reviewers can verify each R1 finding against §Section patched without recovering the R1 atoms. This is a strong baseline for the queue's "documented review history" property when 039 ships — the §Review History section itself is a forward-test of what `combined.md` history will look like across rounds.

## Load-bearing structural status

After R1's H1 fix (mandate strategist `/loop`), the remaining structural-load-bearing gap is what that `/loop` *does* per tick (R2 H1, this round). Once `.claude/commands/review-queue-watch.md` has an AC mirroring AC3's structure, the spec is buildable end-to-end. Everything else in this R2 review is robustness sharpening, not direction shifts.

## Drift watch

The only out-of-scope drift in RC2 is AC0 step 4's keyboard-automation fallback (R2 H2). The RC1→RC2 patch otherwise tightened scope (AC6 split into AC6a builder-completable + AC6b post-merge follow-up; tools/review-queue/ subdir convention shift acknowledged; `class` field locks budget at r1 time). The AC0 drift is a single-bullet deletion to close.

## Bootstrap observations from R2 itself

This R2 cycle is the first to write a response file under the spec's canonical path (`backlog/reviews/<item>/r2/cursor.md`) before the queue formally exists — "eating one more bite of the dogfood" per §Implementation Notes "Bootstrap moment" phrasing. Observations:

- **The file shape is ergonomic for actual review.** Frontmatter findings list with `severity`/`where`/`finding` cleanly contained the 10 findings without forcing me to over-structure the cross-reference logic. The optional `cross_ref` field (R1 patch, M5) let me explicitly point R2-H1 back at R1-H1 (this finding) — strong signal that R3 reviewers will find it useful.
- **`artifact_sha` write is unambiguous.** I wrote `556b978fc9ee308e5ffef610f104d8bee96ef722` (full SHA from `git rev-parse HEAD`). The reviewer-aborts-on-drift rule (R1 M3 fix) becomes mechanical: if the validator detects mismatch between this and `request.spec_commit_sha` (which doesn't exist for R2 since this is bootstrap, but in normal flow it would), the reviewer re-fetches via `git show <sha>:<path>` and retries.
- **Combine.py's `where`-match-key (R1 M5 fix) is testable on this review's findings:** R2 H1 cites "§Implementation Notes 'Strategist watcher' + §AC3 + §AC4" — three sections. If Codex's R2 finding lands a HIGH at any of those, the section-granularity match key correctly collapses on the first overlapping section. If Codex flags only §AC4, the match key catches the intersection. This is the live integration test for the M5 fix. Worth noting in §Review History for R3.
- **No ECHO calls needed for R2.** Same zero-ECHO-call pattern as R1, but with the additional confidence that §Context already embeds the R1 atom IDs and §Review History dispositions them. The `prior_round_atoms` field shape mismatch I flagged at LOW is a real concern, but didn't actually block my review — I read §Review History instead. That section IS the inline embed the field SHOULD carry.

## Convergence call (reviewer's read)

**Needs R3** — focus_hints for R3:

1. **Confirm R2 H1 fix lands as an AC.** `.claude/commands/review-queue-watch.md` body specced mirroring AC3 for reviewers. Without this AC, AC6b is unmeasurable.
2. **Confirm AC0 keyboard-automation deletion (R2 H2).** Cursor fallback options should be paste-once-self-loop only; if Cursor can't self-loop, document the manual-paste degradation explicitly.
3. **Confirm push-race uniformity (R2 M3).** Same retry pattern across all three operational push types; shared helper script preferred.
4. **Confirm journal-vs-queue-errors resolution (R2 M5).** Carve-out or move-to-separate-file — pick one.

If R3 closes those four, R4 should be a final-polish round only.
