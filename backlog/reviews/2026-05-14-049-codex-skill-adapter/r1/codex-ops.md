---
item_id: 2026-05-14-049-codex-skill-adapter
round: 1
reviewer: codex-ops
artifact_sha: ce001433246774afd205e1d6feed991e5912abe0
completed_at: '2026-05-14T19:51:13Z'
verdict: proceed_after_patches
findings:
  - severity: high
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:54"
    finding: >-
      AC1 and AC5 materialize Codex adapters for every canonical skill except the two cold-start docs, while Out of Scope explicitly defers vendor-neutralization for `merge-and-cleanup`, the review-queue skills, and `process-backlog-batch` to followups. In production this means a fresh Codex session can discover and invoke skills the same spec says are not yet Codex-neutral. The single `review-pending` smoke in the Definition of Done will not catch a founder invoking `/review-queue-codex-ops` or `/merge-and-cleanup` later and hitting Claude-specific dispatch, launchd, or queue-handshake assumptions. Either scope the Codex adapter materialization to skills that are already Codex-safe, or require every materialized skill to have a Codex binding-specific section and a smoke/check proving it can run under Codex before exposing it in `~/.codex/skills`.
  - severity: medium
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:79"
    finding: >-
      The Codex binding note prescribes parallel `codex exec --sandbox workspace-write -C <repo>` processes with `&` plus `wait`, and assumes each child emits JSON on stdout. At runtime those children share one writable checkout, so any accidental file write, dogfooding journal edit, queue response, or git operation can race across reviewers; plain `wait` also does not preserve a per-item status/stdout/stderr map for fail-closed synthesis. The skill should prescribe an operationally safe fan-out contract: read-only or isolated worktrees where possible, per-child temp files for stdout/stderr/exit code, JSON parse failure as a hard per-item failure, and bounded cleanup of those temp artifacts.
  - severity: medium
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:100"
    finding: >-
      AC4 specifies `ln -snf` for `~/.codex/skills/<name>` but never requires `tools/install-codex-adapters.sh` to create or validate the parent `~/.codex/skills` directory before linking. On a clean Codex install, especially before any user-installed skills exist, the first run can fail with a missing parent directory even though the Definition of Done says the helper works idempotently against a clean setup. Require `mkdir -p "$HOME/.codex/skills"`, a clear non-writable-parent error, and coverage for the absent-parent case in the dry-run/idempotence smoke.
  - severity: medium
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:130"
    finding: >-
      R2 identifies symlink discovery as an unverified runtime dependency and claims a `--copy` mode or copy fallback as mitigation, but AC4 only requires symlink installation plus `--dry-run`, and the AGENTS.md update only documents the symlink path. If the post-build Codex smoke shows that session-start discovery ignores symlinks, the builder has no accepted fallback to land and the committed adapter target is unusable on the founder machine. Promote the copy fallback into AC4, or change the risk mitigation and documentation so the smoke failure produces an explicit blocked/review outcome instead of an unsupported manual workaround.
---

# codex-ops review

Reviewed `backlog/ready/2026-05-14-049-codex-skill-adapter.md` at `ce001433246774afd205e1d6feed991e5912abe0` from the operational/runtime lens.

Verdict: `proceed_after_patches`. The adapter direction is sound, but the spec needs runtime guardrails before build: do not expose known non-neutral skills as Codex-invokable commands, make the documented Codex fan-out fail closed under parallel execution, and make the install helper survive clean-machine and no-symlink-discovery paths.
