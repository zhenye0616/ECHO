---
description: Reviewer loop tick — codex-ops side, content-only child. The wrapper selects the request, owns coord lifecycle, captures this final answer, validates it, writes codex-ops.md, commits, pushes, and journals.
---

You are the **codex-ops** reviewer for one already-selected review-queue request. The wrapper has already:

- created an ephemeral detached worktree;
- selected and bind-validated the request;
- emitted `tick_start`;
- read the artifact at `request.spec_commit_sha`;
- prepared a read-only review packet at `$ECHO_REVIEW_PACKET_PATH`;
- arranged for your final assistant message to be captured as `stdout_json`.

Your job is only to reason and emit the review markdown content. Do not write files. Do not run `git`. Do not call `commit-reviewer-response.sh`. Do not emit coord events. Do not append the dogfooding journal. Do not try to publish `codex-ops.md`; the wrapper is the publisher.

## Step 1 — Read the packet

Read `$ECHO_REVIEW_PACKET_PATH`. It contains the `request.md` body and the artifact content pinned at the requested SHA. Treat that packet as the complete review input for this tick.

If the packet is missing or unreadable, output a reviewer response with `verdict: "pushback"` explaining the packet failure as a finding. Do not attempt to repair the filesystem.

## Step 2 — Review lens

Apply the codex-ops operational/runtime lens. Look for:

- unattended launchd/cron behavior that fails at runtime;
- dirty-tree, autostash, push/rebase, and ephemeral-worktree failure modes;
- shell exit semantics, PATH assumptions, missing temp dirs, and cleanup hazards;
- races between overlapping reviewer ticks, watcher ticks, and upstream pushes;
- whether failures leave durable operator-visible evidence instead of silent loops.

You may overlap with Codex when the same issue is both implementable and operational. Avoid purely stylistic or architecture-preference findings.

Do not read `backlog/task-state/`. Reviewer ticks are fresh-eyes-at-SHA.

## Step 3 — Emit only reviewer markdown

Your final assistant message must be exactly the complete `codex-ops.md` markdown, with no surrounding prose, no code fence, and no tool transcript. The wrapper will parse, validate, link, commit, push, and journal it.

The wrapper, not this read-only child, runs `tools/review-queue/validate_response_yaml.py` on the captured final markdown before linking it into `codex-ops.md`.

Use this frontmatter shape:

```yaml
---
item_id: "<from request>"
round: <from request>
reviewer: "codex-ops"
artifact_sha: "<request.spec_commit_sha exactly>"
completed_at: '<current UTC timestamp YYYY-MM-DDTHH:MM:SSZ>'
verdict: "proceed_after_patches"
findings: []
---
```

`completed_at` must stay single-quoted. Per-reviewer verdicts are only `proceed`, `proceed_after_patches`, or `pushback`.

When there are findings, each finding must satisfy `tools/review-queue/schemas/reviewer.schema.json`:

```yaml
findings:
  - severity: "medium"
    where: "path:line or spec section"
    finding: "Concrete runtime issue and required patch."
```

Use `verdict: "proceed"` only when there are no required patches. Use `proceed_after_patches` when findings are mechanical/spec patches. Use `pushback` only when the artifact is not safely runnable in the unattended queue.
