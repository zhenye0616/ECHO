---
item_id: "2026-05-15-056-claude-as-reviewer-headless"
round: 1
reviewer: "codex"
artifact_sha: "a37c9b9cbb3670641e9d9b9f181842b19f0eac42"
completed_at: '2026-05-15T23:34:49Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "frontmatter files_to_modify lines 16-29; AC5 lines 123-139; tools/review-queue/_reviewers.py lines 26-35"
    finding: >-
      AC5 adds an `invoke_command` field to every `reviewers.json` entry, but the spec does not include `tools/review-queue/_reviewers.py` in `files_to_modify` or define the `Reviewer` tuple/schema-loader changes. The installed loader constructs `Reviewer(**r)` against `_REQUIRED_FIELDS = (name, mode, required, timeout_hours, slash_command)` and treats extra keys as a `ValueError`, so the first roster load after adding `invoke_command` will fail for every caller (`_reviewer_gate.py`, `request.py`, `combine.py`, installer paths). Patch the spec to add `_reviewers.py` to the touch list and AC5 contract, including the new field on `Reviewer`, `_REQUIRED_FIELDS`, validation, cache fixtures, and a helper/gate interface that returns both `slash_command` and `invoke_command` without breaking the existing prompt-path lookup.
  - severity: "high"
    where: "AC2 lines 80-85; AC9 lines 168-175; tools/review-queue/schemas/combined.schema.json lines 7-38; tools/review-queue/schemas/reviewer.schema.json cross_ref reviewer enum"
    finding: >-
      The schema-sync surface is larger than the two enum edits AC2 names. `combined.schema.json` has `additionalProperties: false` and only schema-declared `<slug>_response` properties are emitted by `combine.py`, so a 3-reviewer round containing `claude.md` cannot produce a validated `claude_response` field unless the combined schema is extended. Separately, `reviewer.schema.json` has a second reviewer enum under `findings[].cross_ref.reviewer`; leaving that at the old slug set means no reviewer can legally cross-reference a Claude finding. Patch AC2/files_to_modify/tests to include `tools/review-queue/schemas/combined.schema.json` with `claude_response`, and update both reviewer-schema enum sites, not just the top-level `reviewer` field.
  - severity: "medium"
    where: "AC5 lines 123-138; AC9 lines 168-173"
    finding: >-
      The `invoke_command` template examples use unquoted `{{WT}}` and `{{PROMPT}}` inside a string later run by `bash -c`, but the spec does not define how substituted paths are shell-escaped. That loses the current wrapper's `-C "$WT"` / `< "$PROMPT"` robustness and makes the command contract dependent on temp paths never containing spaces or shell metacharacters. Patch AC5 to require a concrete escaping strategy (for example Python `shlex.quote` for both token values, or a JSON argv-plus-stdin model instead of a shell string) and add an AC9 fixture whose temp worktree path contains a space so the mock Claude invocation proves the contract.
---

# Codex Review

Verdict: `proceed_after_patches`.

The direction is implementable, and the installed Claude CLI supports `-p` plus `--dangerously-skip-permissions`. The spec needs a narrow patch before claim: include the strict roster loader in the AC5 edit surface, complete the schema sync for combined output and cross references, and pin command-template escaping so the generic wrapper does not regress the existing worktree/prompt path guarantees.
