---
item_id: "2026-06-13-102-orchestration-init-per-project"
round: 1
reviewer: "codex-ops"
artifact_sha: "f8b9e7ecf432641a2edc652e8ecd053ecec096c9"
completed_at: '2026-06-13T09:03:28Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3 — Decouple `coord_invoke` path validation"
    finding: "AC3 requires traversal rejection under the configured reviews-root, but the runtime security boundary also depends on canonical path resolution. Require the loader/validator to reject absolute-path escapes and symlink escapes by resolving both the configured reviews-root and request path to real paths inside the target repo, and add adversarial tests for `../`, absolute paths, symlinked `reviews_root`, and symlinked request ancestors."
  - severity: "medium"
    where: "AC5 — Configurable coordination ref"
    finding: "AC5 says review-round commits target `coord_ref`, but the spec does not require patching the queue helpers that operationally hardcode `origin/main` fetches, duplicate-response checks, and push/rebase targets. Add the wrapper/commit/push duplicate-guard surfaces to `files_to_modify` or the AC, and require an unattended side-ref test proving a reviewer response lands on `coord_ref` without touching the default branch."
  - severity: "medium"
    where: "AC2 — `echo orchestration init <repo>`"
    finding: "The `~/.echo/state/projects.json` upsert is specified as idempotent, but not as atomic or concurrency-safe. Require temp-file-plus-rename and an interprocess lock or compare-and-retry behavior so two concurrent init runs cannot clobber registrations or leave a truncated registry; include an operator-visible error when the lock or write fails."
---

## Review

The 102/103 split is workable for this vertical slice after the patches above. The main operational risk is that side-ref onboarding will appear configured while legacy reviewer helpers still fetch, duplicate-check, or push through `origin/main`.
