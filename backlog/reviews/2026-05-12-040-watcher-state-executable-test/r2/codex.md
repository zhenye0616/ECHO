---
item_id: 2026-05-12-040-watcher-state-executable-test
round: 2
reviewer: codex
artifact_sha: 8a6b863d09db0619a6430ea8fd565be0f09150a5
completed_at: "2026-05-12T09:44:43Z"
verdict: proceed_after_patches
findings:
  - severity: medium
    where: AC3 lines 79-82 and tools/review-queue/request.py find_artifact
    finding: >-
      The positive tmpdir fixture is specified as constructing only the review
      item directory plus r1/request.md, codex.md, and cursor.md, then invoking
      dispatch-next-round.py with --spec-sha. At this SHA, request.py still
      resolves artifact_path by finding backlog/{ready,claimed,pending_review,complete}/<item_id>.md
      unless --artifact-path is passed. The helper signature and AC1 request.py
      invocation do not include --artifact-path, so the literal AC3/AC5 tmpdir
      fixture will fail before r2/request.md is written. Patch the spec to
      require the fixtures to create backlog/ready/<item_id>.md, or require the
      helper to read r1/request.md's artifact_path and pass --artifact-path
      through to request.py.
  - severity: medium
    where: AC1 lines 58 and 60, AC3 line 82, Implementation hints line 133
    finding: >-
      The frontmatter preservation target is contradictory. AC1 says the helper
      must preserve formatting and never reformat YAML frontmatter beyond the
      targeted next_round change, while AC3 now says the body is the invariant
      and the frontmatter delta is semantic because YAML serializers may
      reformat. The implementation hint points builders toward _lib.py's
      YAML serializer pattern, which can re-emit the whole frontmatter block.
      Choose one target: either require a text-level next_round edit and test
      non-target frontmatter bytes, or relax AC1 to semantic frontmatter
      preservation plus body byte preservation.
  - severity: low
    where: AC2 lines 68-73
    finding: >-
      The concrete watcher git block still includes backlog/reviews/<item_id>/r<N+1>/request.md
      with only an inline note that the path is absent in cases (a) and (c).
      If copied into the terminal branches, git add exits non-zero on that
      missing path before the terminal commit can be made. Make the command
      branch-specific or use an explicit conditional add for r<N+1>/request.md.
---

# Codex review

The R1 patches landed in the main shape: os.replace is now the combined.md mutation strategy, pushback+false is covered in branch (a), --spec-sha is present, and the helper/watcher git boundary is mostly explicit. The remaining issues are implementability patches before a builder has a fully executable target.
