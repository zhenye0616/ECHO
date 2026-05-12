---
item_id: 2026-05-12-042-reviewer-emission-yaml-validation
round: 2
reviewer: codex
artifact_sha: ac48694d5e2617054c5d30940859f48d9b979beb
completed_at: '2026-05-12T23:51:54Z'
verdict: proceed_after_patches
findings:
- severity: medium
  where: AC4 queue-errors append + combine.py git path
  finding: AC4 adds a tracked-file append on the malformed-response success path,
    but the current combine.py git path only stages `r<N>/combined.md` before committing.
    If the builder appends `raw/internal/queue-errors.md` per AC4 without explicitly
    staging it, the row is left local/dirty while the terminal `combined.md` is pushed,
    and the next automated `git pull --rebase` can trip over the dirty tracked file.
    Patch the spec to require the malformed-response commit to include both `combined.md`
    and `raw/internal/queue-errors.md` (or explicitly justify a local-only log and
    clean-status behavior), and add a git-mode test or assertion that the worktree
    is clean / the row is committed after the escalation path.
- severity: low
  where: Frontmatter spec_refs and Out of Scope vs AC3
  finding: 'The body now correctly says no separate `reason` field and uses `combined_verdict:
    malformed_reviewer_response`, but the spec_refs comment at line 22 still tells
    builders to add `reason: enum[..., malformed_reviewer_response]` and the Out of
    Scope line says no new schema fields beyond "AC3''s four" even though AC3 adds
    only two optional properties. These stale-draft breadcrumbs conflict with the
    patched AC3 contract and should be removed before implementation.'
---
# Codex review

The AC2/AC3 corrections from R1 are mostly in place: the spec uses `combined_verdict`, declares `offending_response` and `parse_error` under the `additionalProperties: false` combined schema, preserves the two-phase collect-then-emit shape, and uses repo-root-relative malformed-response paths in the tests.

The remaining patches are narrow but operationally important. The AC4 append needs to be part of the same durable/clean success path as the malformed-response `combined.md`, and the stale `reason` references should be removed so builders do not reintroduce a field AC3 explicitly cut.
