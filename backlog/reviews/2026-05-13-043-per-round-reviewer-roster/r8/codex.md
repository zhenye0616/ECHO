---
item_id: "2026-05-13-043-per-round-reviewer-roster"
round: 8
reviewer: "codex"
artifact_sha: "4e1886d5ded99fd533f8eaa8127439fb70f94257"
completed_at: "2026-05-13T07:41:53Z"
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-13-043-per-round-reviewer-roster.md:305-307 and tools/review-queue/commit-reviewer-response.sh:50-52"
    finding: >-
      R8 adds ECHO_REVIEW_QUEUE_REPO_ROOT routing to _lib.py for Python callers, but the AC6h real pipeline still runs through shell helpers that compute their own repo root from the current git checkout. In the current helper, commit-reviewer-response.sh derives REPO_ROOT via git rev-parse and then locates validate.py/push-with-retry.sh under that same root; push-with-retry.sh runs git pull/push in its current cwd. If AC6h invokes the checked-in helper from the production repo with ECHO_REVIEW_QUEUE_REPO_ROOT=$FIXTURE/repo, the helper still validates/commits/pushes production. If it invokes the checked-in helper from $FIXTURE/repo, it looks for $FIXTURE/repo/tools/review-queue/validate.py unless the test copied the whole tool tree, which the spec is explicitly trying to avoid. Patch the spec to define concrete shell behavior: separate TOOL_DIR=$(dirname "$0") from TARGET_REPO=${ECHO_REVIEW_QUEUE_REPO_ROOT:-$(git rev-parse --show-toplevel)}, run git add/commit/pull/push with -C "$TARGET_REPO", write queue-errors under "$TARGET_REPO/raw/internal", and call validator/push helper from TOOL_DIR. Add an AC6h assertion that commit-reviewer-response.sh plus push-with-retry.sh honor ECHO_REVIEW_QUEUE_REPO_ROOT without copying tools into the fixture repo.
---
# Codex review

Proceed after patching the shell helper routing. The R7 malformed-response regression is now covered by AC6p/AC6q; the remaining blocker is making the fixture-local repo guarantee true through the actual commit/push path, not just through Python scripts that import `_lib`.
