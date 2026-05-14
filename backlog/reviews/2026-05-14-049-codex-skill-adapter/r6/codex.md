---
item_id: 2026-05-14-049-codex-skill-adapter
round: 6
reviewer: codex
artifact_sha: dc38b684a4397b44e422eda091b4673f577092e5
completed_at: '2026-05-14T20:57:16Z'
verdict: proceed_after_patches
findings:
- severity: high
  where: "AC2 codex output format, backlog/ready/2026-05-14-049-codex-skill-adapter.md:87 plus skills/review-pending.md:57-65 and :90-92"
  finding: >-
    AC2 says each codex child emits the markdown sections `Verdict`, `Acceptance status`, `Drift findings`, `Bugs/risks`, `Suggested fixups`, and `Test counts observed`, and that the orchestrator extracts those headings by regex. The current review-pending contract also requires `Design-choice judgments` and `Merge-conflict preview`, and the sidecar/founder summary require expected merge conflicts. If the builder implements the listed Codex headings literally, the Codex path has no required child output to synthesize those fields and can produce incomplete sidecars. Add the missing headings to the Codex child contract, or explicitly make the orchestrator compute them independently and require a sidecar assertion for the merge-conflict/design-judgment fields.
- severity: medium
  where: "AC2 read-only codex children, backlog/ready/2026-05-14-049-codex-skill-adapter.md:84 and :87 plus skills/review-pending.md:64"
  finding: >-
    AC2 mandates `codex exec --sandbox read-only` children and says the children only need to read the spec and emit output, but the existing review-pending prompt requires each reviewer process to run `npm test`, `npm run lint`, and `npm run typecheck` in the worktree and report observed counts. The spec does not say whether those verification commands move to the orchestrator or still run inside the read-only child; if they stay inside the child, normal test/temp/cache writes may fail under the chosen sandbox. Specify the verification owner and data flow: either the orchestrator runs the commands outside the child and passes captured output into the read-only review process, or the Codex child gets a sandbox that can run verification while sidecar writes remain orchestrator-owned.
---

# Codex review

The sync-target shape is implementable, and the local Codex CLI matches the command assumptions I checked (`codex exec -`, `--sandbox read-only`, and `-C/--cd` are present in v0.130.0). The remaining issues are AC2 contract mismatches with the existing `review-pending` skill, so this should proceed after a narrow spec patch rather than going straight to builder implementation.
