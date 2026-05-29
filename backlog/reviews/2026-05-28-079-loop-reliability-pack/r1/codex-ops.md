---
item_id: "2026-05-28-079-loop-reliability-pack"
round: 1
reviewer: "codex-ops"
artifact_sha: "698353a9fa4835544de32b02d7c8ec1e943ae26b"
completed_at: '2026-05-29T05:37:40Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-28-079-loop-reliability-pack.md:17-19,89; tools/review-queue/commit-reviewer-response.sh:90-92; tools/review-queue/push-with-retry.sh:39-41 at 698353a"
    finding: >-
      AC2 makes `ECHO_EFFECT_MODE=test` / `dry-run` return canned success for push and agent execution, but the spec only wraps the final `git push` and child CLI dispatch. In the real reviewer path, `commit-reviewer-response.sh` commits before calling `push-with-retry.sh`; if a launchd/manual environment leaks `ECHO_EFFECT_MODE=test`, the response commit is created locally, the wrapped push no-ops with success, the reviewer emits a completed tick, and the ephemeral worktree cleanup deletes the only copy of the response while origin/main still has no `<reviewer>.md`. `push-with-retry.sh` also still runs `git pull --rebase` in dry-run/test, so the advertised no-side-effect mode can mutate the worktree before the no-op push. Patch AC2 so non-live mode is either impossible in production wrappers or produces a non-completed/test-only outcome, and route the whole mutating push/rebase helper through the effect boundary with tests proving no false completed queue tick and no local git mutation under test/dry-run.
  - severity: "high"
    where: "backlog/ready/2026-05-28-079-loop-reliability-pack.md:21-24,91; skills/review-pending.md:140-151,169-196; skills/merge-and-cleanup.md:32-47 at 698353a"
    finding: >-
      AC3 says the canonical sidecar schema validates the eight headings emitted by code-reviewer/codex child reviews, but `/review-pending`'s tracked sidecar artifact currently has a different merge-facing shape: `Verdict`, `Pre-merge fixups`, `Expected merge conflicts`, `Follow-up items`, and `Open questions for founder`. `/merge-and-cleanup` consumes that sidecar by reading verdict/reviewed_at and then later using the pre-merge fixups and expected-conflicts sections. If the new validator enforces the child-review intermediate headings against `backlog/pending_review/<id>.review.md`, the morning merge can fail on every existing/next sidecar or accept an artifact whose sections the merge protocol no longer knows how to use. Patch AC3 to pin the actual tracked sidecar contract (plus additive `producer`) or explicitly migrate both producer and consumer to a new versioned shape, with tests that run `/review-pending` output through `validate-sidecar.py` and then through merge-and-cleanup's Step-A/C section reads.
  - severity: "medium"
    where: "backlog/ready/2026-05-28-079-loop-reliability-pack.md:15,87,103"
    finding: >-
      The `combine.py` live-checkout guard can be bypassed by stale environment state. The spec says the mutating path is allowed when `ECHO_REVIEW_QUEUE_REPO_ROOT` points at a `$TMPDIR/echo-*` path, but it does not require that the resolved `repo_root`/CWD is the same physical worktree, that the path still exists, or that git reports it as a registered detached worktree. A shell that previously ran inside an ephemeral snapshot can later invoke `combine.py --repo-root ~/Desktop/Project_echo` from the live checkout with a leftover `ECHO_REVIEW_QUEUE_REPO_ROOT=/tmp/.../echo-watch-...`, satisfying the proposed predicate while still committing into the founder's live index. Patch AC1 to validate the actual git toplevel being mutated: physical path equality with the env root, path exists under current `$TMPDIR`, registered worktree membership, and detached/head-at-origin-main shape, with a regression test for stale-env + live `--repo-root` refusal.
---

# codex-ops review

Verdict: `pushback`.

The reliability pack is directionally right, but the spec still has production failure modes in the exact unattended paths it is trying to harden. The biggest risk is a false-success effect mode that can drop reviewer output after an ephemeral cleanup, and the sidecar schema currently targets the wrong artifact shape for the merge path.
