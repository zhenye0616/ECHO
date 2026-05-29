---
item_id: "2026-05-28-079-loop-reliability-pack"
round: 1
reviewer: "codex"
artifact_sha: "698353a9fa4835544de32b02d7c8ec1e943ae26b"
completed_at: '2026-05-29T05:38:00Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC3 / files_to_modify lines 21-24 and Acceptance Criteria line 91; compare skills/review-pending.md Step C"
    finding: >-
      AC3 conflates the child-review markdown shape with the actual review-pending sidecar shape, so the proposed validator would either reject the artifact Step C writes today or force an unstated format migration. The existing codex/Claude child review headings are `Verdict`, `Acceptance status`, `Drift findings`, `Design-choice judgments`, `Bugs/risks`, `Merge-conflict preview`, `Suggested fixups`, and `Test counts observed`, but the committed sidecar consumed by merge-and-cleanup is synthesized as `Verdict`, `Pre-merge fixups`, `Expected merge conflicts`, `Follow-up items`, and `Open questions for founder`. Merge-and-cleanup also reads the sidecar's `Expected merge conflicts` and fixup checklist. Patch AC3 to validate the real `<id>.review.md` sidecar contract, or explicitly specify a full sidecar format migration plus merge-and-cleanup consumption changes. Also settle the schema path conflict: files_to_modify names `tools/review-queue/review-sidecar.schema.json`, while AC3/spec_refs say it belongs under `tools/review-queue/schemas/`.
  - severity: "medium"
    where: "AC1 / files_to_modify line 15 and Acceptance Criteria line 87; tests/review-queue/044-autostash-dirty-tree.test.ts lines 191-196"
    finding: >-
      The combine.py live-checkout guard is underspecified for existing git-path tests and will break at least the 044 autostash test as written. That test intentionally runs `tools/review-queue/combine.py --repo-root=<temp clone> --all` outside a `$TMPDIR/echo-*` snapshot and without `--no-git`, expecting the inner pull/commit/push path to run. AC1 says `--repo-root` test hooks are unchanged but also says the git-mutating path refuses outside a snapshot unless `--allow-live` is passed. Add an explicit compatibility rule and test update: either old git-path fixture invocations pass `--allow-live`, the fixture creates an echo-style snapshot, or the guard distinguishes production live checkout from isolated test clones.
  - severity: "medium"
    where: "AC2 / files_to_modify lines 17-18 and Acceptance Criteria line 89; tools/review-queue/push-with-retry.sh lines 39-40"
    finding: >-
      Wrapping only `git push origin HEAD:main` leaves `git -c rebase.autoStash=true pull --rebase=merges origin main` live in `push-with-retry.sh` under `ECHO_EFFECT_MODE=dry-run` or `test`. That still performs network I/O and can mutate/rebase the local checkout before the no-op push, which conflicts with AC2's single effect boundary and "dry-run/test returns without executing" contract. Either route the whole pull-plus-push attempt through `echo_effect push -- ...`, introduce a separate `git-sync` effect kind, or narrow the AC/test language to say test mode stubs only the remote push while allowing the pull side effect.
---

# Codex Review

Verdict: proceed_after_patches.

The core direction is implementable and aligned with the reliability goal, but AC3 needs a contract patch before a builder can safely implement it. The current text validates the wrong markdown artifact: child review output and the committed merge sidecar are different shapes with different consumers.

AC1 and AC2 are also close, but both need small spec/test clarifications so "tests green" is mechanically reachable without the builder inventing exceptions.
