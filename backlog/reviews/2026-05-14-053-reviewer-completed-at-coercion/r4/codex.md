---
item_id: "2026-05-14-053-reviewer-completed-at-coercion"
round: 4
reviewer: "codex"
artifact_sha: "e248f4def9da192957787f071b2ad83edcac759e"
completed_at: '2026-05-15T08:45:11Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3.2 Pipeline assertions, artifact line 125; commit-reviewer-response.sh lines 74-84"
    finding: >-
      The required no-quarantine assertion still points at raw/internal/quarantine/, but the current helper never writes that directory. On validation failure commit-reviewer-response.sh renames the canonical response to <path>.invalid.<ISO-ts> beside the response file and appends a VALIDATION-FAIL row to raw/internal/queue-errors.md. A test that only asserts raw/internal/quarantine/ is absent is therefore vacuous for the actual quarantine mechanism. AC3.2 should require checking the round directory for no <reviewer>.md.invalid.* siblings and/or asserting queue-errors.md has no new VALIDATION-FAIL row, in addition to every pipeline stage exiting 0.
  - severity: "low"
    where: "AC3.2 Production-repo untouched assertion, artifact line 121"
    finding: >-
      The acceptable Node alternative is not directly implementable as written: child_process.execFileSync does not take a single argv array, and a literal '~/Desktop/Project_echo' argument is not shell-expanded. If the builder uses the no-shell path, spell it as execFileSync('git', ['-C', join(homedir(), 'Desktop/Project_echo'), 'ls-remote', 'origin', 'refs/heads/main'], ...) or use spawnSync with the same argv shape, then assert the returned SHA is non-empty 40-hex before entering the pipeline.
---

# Codex review

The r4 AC3.2 changes address the main silent-pass risks from the requested focus: the PATH-stub option is gone, reviewers.json is explicitly copied, combine eligibility is explicit, and the production remote snapshot now rejects empty ls-remote output. The remaining patch is to align the quarantine assertion with the helper's real .invalid.<ISO-ts> sibling behavior; the Node API hint should also be corrected so the alternative path is copyable.
