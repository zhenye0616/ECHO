---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 10
reviewer: "codex"
artifact_sha: "5f052d7d329297815e33d579e476465cacf0bfbb"
completed_at: '2026-07-16T05:40:14Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC6 — write-ahead attempt-marker durability"
    finding: "A GitHub Actions run log provides no synchronous, acknowledged durable-flush primitive: flushing stdout or fsyncing a runner-local file cannot prove that the marker reached persistent service storage before the external mutation begins. Abrupt runner or network loss can therefore leave a committed mutation with no visible marker, and injected process-termination tests cannot prove the required hosted-runner durability. The interrupted-run-always-shows guarantee and marker-without-response recovery contract are not buildable as written. Founder-directed redesign must select an acknowledged durable marker substrate, define marker writes within the mutation and ambiguity rules, and add an end-to-end failure model proving persistence is acknowledged before each release mutation."
  - severity: "medium"
    where: "AC1 prepared main push and AC6 annotated-tag push"
    finding: "Both prescribed create-only push commands require a porcelain new-ref proof but omit the `--porcelain` flag. Patch both command contracts to require `git push --porcelain --force-with-lease=...`, and make the fixtures reject any invocation lacking that flag before accepting the `*` newly-created status."
---
