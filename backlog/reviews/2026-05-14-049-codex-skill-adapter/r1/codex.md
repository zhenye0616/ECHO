---
item_id: "2026-05-14-049-codex-skill-adapter"
round: 1
reviewer: "codex"
artifact_sha: "ce001433246774afd205e1d6feed991e5912abe0"
completed_at: "2026-05-14T19:52:38Z"
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1/AC3 lines 55-60 and 88-96; current skills/process-backlog.md + skills/merge-and-cleanup.md frontmatter"
    finding: >-
      AC1 says to pass through the canonical skill description into codex YAML frontmatter, and AC3 only requires a fixture canonical skill. Current real canonical skill frontmatter is not uniformly parseable YAML: `skills/process-backlog.md` and `skills/merge-and-cleanup.md` both contain unquoted colon-space descriptions that PyYAML rejects. A builder who parses canonical frontmatter as YAML will fail sync for real skills; a builder who line-scrapes and writes the raw scalar can generate invalid codex `SKILL.md` frontmatter. Patch the spec to require safe YAML serialization/quoting for generated descriptions and add a regression that uses either the real canonical skills or a colon-containing description fixture.
  - severity: "medium"
    where: "AC4/Tests lines 100-106 and 135-139"
    finding: >-
      The install helper has safety-critical behavior but no automated test contract. It writes under `~/.codex/skills` and must refuse non-symlink paths, be idempotent, and honor `--dry-run`, while AC3 tests only `tools/sync-skills.sh`. A broken helper could overwrite or mutate user skill directories while all required tests still pass. Patch AC3/Tests to add fixture tests with `HOME` set to a temp directory for clean symlink creation, idempotent rerun, dry-run no-op, and non-symlink conflict refusal.
  - severity: "medium"
    where: "Risk R2/Smoke/DoD lines 130, 139, 149, and 158"
    finding: >-
      R2 acknowledges codex may not auto-discover symlinked skill directories and says the mitigation is a copy mode or separate copy script, but AC4 only specifies symlinks while the Definition of Done requires a smoke where codex sees and triggers `review-pending`. If the smoke fails, the builder has no in-scope way to satisfy DoD except adding an unspecified fallback. Patch AC4 to include the copy fallback and its docs/tests, or demote the symlink-discovery smoke to an observation that files a followup instead of blocking 049.
---

# Codex Review

Verdict: `proceed_after_patches`.

The adapter direction is sound and the local `codex exec -C <repo> --sandbox workspace-write -` shape exists in the installed CLI. The spec needs a few mechanical patches before builder execution so the generated codex frontmatter is valid for the current real skill corpus and the installer cannot silently damage `~/.codex/skills`.
