---
item_id: 2026-05-14-053-reviewer-completed-at-coercion
round: 5
reviewer: codex
artifact_sha: c8fe2cc743c59c59b06c6e31aa18b47941e97823
completed_at: '2026-05-15T08:51:12Z'
verdict: proceed_after_patches
findings:
- severity: medium
  where: AC3.2 Production-repo untouched assertion, /tmp/echo-rq-artifact.md:121
  finding: The Node alternative still couples execFileSync to status/signal assertions.
    In Node, execFileSync returns stdout on success and throws on non-zero; it does
    not expose status or signal for a successful result. The current harness uses
    execFileSync by mapping success to code 0 in tests/review-queue/_helpers.ts:36-41,
    while status checks come from spawnSync at tests/review-queue/_helpers.ts:8-10.
    As written, one allowed AC3.2 implementation cannot satisfy the required status/signal
    checks. Patch by making spawnSync the required API for status/signal, or by saying
    the execFileSync path relies on no throw plus the non-empty 40-hex stdout assertion.
---

# Codex review

Verdict: proceed_after_patches.

The AC3.2 quarantine assertion is now anchored on the helper's real behavior: `commit-reviewer-response.sh` renames the canonical reviewer file to `<reviewer>.md.invalid.<ISO-ts>` and appends a `VALIDATION-FAIL` row to `raw/internal/queue-errors.md`. The push-stub requirement also matches the current absolute `PUSH_HELPER` resolution, and the single-reviewer `requested_reviewers` fixture is enough for `combine.py` eligibility with the current roster.

One implementability issue remains: the Node alternative in AC3.2 still treats `execFileSync` like a `spawnSync` result object. The command/argv split and `os.homedir()` correction are good, but `execFileSync` cannot provide `status` or `signal` on the success path. Tighten that branch before handing this to a builder.
