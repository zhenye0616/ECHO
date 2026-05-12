---
item_id: 2026-05-11-039-cross-tool-review-dispatch-queue
round: 2
reviewer: codex
artifact_sha: 556b978fc9ee308e5ffef610f104d8bee96ef722
completed_at: 2026-05-12T07:28:10Z
verdict: proceed_after_patches
findings:
  - severity: medium
    where: §AC0 step 2 / docs/review-queue-setup.md
    cross_ref:
      round: 1
      reviewer: codex
      finding_index: 1
    finding: |
      AC0 improved the polling-primitive story by making Codex/Cursor parity an explicit verification
      step, but it still is not concrete enough for the Codex CLI path. The spec lists `codex --watch`
      as a candidate; the local Codex CLI at `/usr/local/bin/codex` has no `--watch` option. The buildable
      primitive is non-interactive `codex exec`.

      The setup doc should name an actual command shape and the scheduler contract instead of leaving
      the builder to discover it. For example:

      `codex exec -C /Users/zhenye/Desktop/Project_echo --sandbox workspace-write --ask-for-approval never -`

      with the canonical reviewer prompt piped on stdin from `cron`, `launchd`, or a checked-in wrapper
      script every 10 minutes. If `cron`/`launchd` is the accepted Codex fallback, specify that the
      scheduler sleeps between invocations and that the Codex command exits after one queue tick. Drop
      the nonexistent `codex --watch` candidate unless a newer CLI is verified during implementation.

  - severity: medium
    where: §AC4 combine.py polling semantics
    finding: |
      The spec does not explicitly cover the "no rounds to combine" state that matters when `combine.py`
      is used as the body of `/loop 10m` or an equivalent scheduler tick. AC4 covers eligible request
      directories and a one-response-missing waiter state; AC5 tests "one response missing within
      timeout: combine.py exits 0 without writing combined.md." That is adjacent but not the same as an
      empty queue, no request dirs, or only already-combined rounds.

      Add a concrete acceptance/test line: with no eligible round directories, `combine.py` exits 0,
      writes no `combined.md`, performs no commits, and emits a short "no rounds to combine" status.
      The sleeping behavior belongs to `/loop`, `cron`, or `launchd`; `combine.py` should return
      successfully so the next scheduler tick can poll again.

  - severity: medium
    where: §AC4 combine logic — convergent match key
    finding: |
      Section-granularity `where` matching is directionally right, but the field shape is ambiguous
      enough to either under-collapse or over-collapse real findings. Cursor R2 already produced a
      multi-section `where` value: `§Implementation Notes "Strategist watcher" + §AC3 + §AC4`. If
      combine.py uses raw string equality, that will not match a Codex finding that names only `§AC4`.
      If combine.py tokenizes sections and matches on any overlap, broad findings can collapse together
      merely because both mention a common section.

      Against the R1 distribution, section granularity is the right level for the known convergences
      (reviewer polling body, atomicity, push-race handling), but it needs a normalized shape. Suggested
      schema: require `primary_where_section`, allow `related_where_sections`, and let `cross_ref` be the
      explicit override for known same-finding links across different wording. Do not key on free-form
      `where` strings alone.

  - severity: low
    where: §Architecture "Atomic writes everywhere" / §AC2 / §AC5
    cross_ref:
      round: 1
      reviewer: codex
      finding_index: 3
    finding: |
      The no-overwrite atomicity story is mechanically sound. On the local macOS/Python path, `os.link`
      raises `FileExistsError` when the destination exists and preserves the existing destination bytes;
      a unique temp file prevents temp-name stomps. That closes the load-bearing R1 concern for both
      `<reviewer>.md` race losers and request-file creation.

      The only sharpening I would keep is for `request.py`: after `os.link` loses the race, it must read
      the existing `request.md` and compare the artifact SHA before deciding whether the result is
      same-SHA idempotent or a different-SHA error. AC2 says that at the behavioral level, but AC5's
      race-loser test should assert the same-SHA path specifically so implementers do not treat every
      `FileExistsError` as success.
---

# Reviewer notes

R2 verdict: **proceed_after_patches**. RC2 closed the R1 atomic-write gap in the important way: unique
temp plus `os.link(tmp, final)` is a real no-overwrite primitive, and the reviewer-response race-loser
path is implementable.

The remaining issues are narrow buildability gaps:

- Codex polling should name the actual `codex exec` command shape; the local CLI has no `codex --watch`.
- `combine.py` needs an explicit empty-queue success case for scheduler polling.
- `where` matching needs a normalized key shape before implementation, because live R2 findings already
  contain multi-section locations.
- `request.py` should assert same-SHA idempotency after an `os.link` race loss by reading the existing
  file, not by treating `FileExistsError` alone as success.

I did not patch the spec, per cross-tool review convention. Response file is the canonical output for
the strategist to combine.
