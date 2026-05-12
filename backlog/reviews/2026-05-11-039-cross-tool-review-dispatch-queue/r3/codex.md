---
item_id: 2026-05-11-039-cross-tool-review-dispatch-queue
round: 3
reviewer: codex
artifact_sha: e45a97bc6bea2fd0abde68113fe140a9e82943b9
completed_at: 2026-05-12T07:57:00Z
verdict: proceed_after_patches
findings:
  - severity: medium
    where: §AC3.5 step 3 — convergence branch / `next_round`
    finding: |
      The watcher state machine still conflates "all dispositions accepted" with "convergence declared."
      RC3's own R2 history is the counterexample: all 14 R2 findings were accepted inline, with no
      deferred follow-up items, but the correct combined decision was `next_round: 3` so reviewers could
      verify the RC3 patch. Under AC3.5's current branch, that same state would set `next_round: null`
      immediately after patching and would have skipped this R3 round.

      The watcher needs a third non-escalated outcome: accepted patches that require a verification
      round. Suggested state split: (a) no patch needed / claim-ready -> `next_round: null`; (b) patch
      applied and reviewer verification wanted -> run `request.py <item_id> <N+1>`; (c) accepted items
      intentionally deferred to follow-up -> file/record follow-up and decide whether a verification
      round is still needed. Also commit the final `combined.md` update after setting `next_round`; the
      current wording sets `next_round: null` after the disposition commit and then exits.

  - severity: medium
    where: §AC4 combine logic — `primary_where_section` / `related_where_sections`
    cross_ref:
      round: 2
      reviewer: codex
      finding_index: 3
    finding: |
      The normalized match-key direction is right, but the automatic "primary appears in related" rule
      still needs a fixture-level guard or it can reproduce the over-collapse that R2 explicitly named.
      Using R2's own findings: Cursor H1 has a three-section `where` value (`§Implementation Notes` +
      `§AC3` + `§AC4`), while Codex M2 and M3 are separate `§AC4` findings (`combine.py polling
      semantics` vs `convergent match key`). If the parser stores top-level `§AC4` as a related section,
      Cursor H1 will converge with both Codex AC4 findings even though the R2 combined table says those
      are distinct concerns.

      Make the match rule falsifiable with an R2 fixture. Either require exact sub-anchor matching for
      related sections, or make `related_where_sections` contextual only and require same primary section
      or explicit `cross_ref` for convergence. As written, the builder has to infer which parse
      granularity prevents H1 + Codex M2 + Codex M3 from collapsing into one row.

  - severity: low
    where: §Architecture push-race / §Implementation Notes `raw/internal/queue-errors.log`
    finding: |
      The path is a real non-journal path and there is no existing file collision, but repo mechanics
      add one ambiguity: `.gitignore` ignores `*.log`, so `raw/internal/queue-errors.log` will be local
      and untracked by default. That may be intentional for an emergency local failure log, but the spec
      also describes periodic founder review and multiple writers appending independently, which reads
      like shared repo-visible observability.

      Pick one contract explicitly. If the file is local-only, say so and do not imply cross-agent
      visibility. If it should be repo-visible, add a `.gitignore` exception such as
      `!raw/internal/queue-errors.log`, rename it to `.txt`/`.md`, or commit an empty placeholder.
---

# Reviewer notes

R3 verdict: **proceed_after_patches**. RC3 closes the R2 implementation gaps directionally: AC3.5 is now
a real watcher body, `codex exec` is concrete, `queue-errors.log` keeps emergency failures out of the
journal, and the rejected Cursor automation paths remain explicitly rejected.

The remaining issues are narrow but worth patching before builder claim:

- AC3.5 needs an explicit "patch applied, request next verification round" branch. Accepted findings are
  not the same thing as convergence; RC3's own R2→R3 transition proves that.
- AC4's normalized match key needs an R2-derived fixture so multi-section findings do not over-collapse
  through broad related-section overlap.
- `queue-errors.log` should be declared local-only or made trackable despite `.gitignore`'s `*.log`.

Drift watch: I did not find keyboard automation, detached Cursor auto-paste, `prior_round_atoms`, or
journal-as-normal-queue state reintroduced. The added surface area traces to R2 dispositions.
