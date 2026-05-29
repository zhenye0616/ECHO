---
item_id: "2026-05-28-079-loop-reliability-pack"
round: 3
reviewer: "codex"
artifact_sha: "4b47e33732e8cdf5c14d534abadc43ac47e97c58"
completed_at: '2026-05-29T06:09:34Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-28-079-loop-reliability-pack.md:91 and backlog/ready/2026-05-28-079-loop-reliability-pack.md:33"
    finding: "AC2 still leaves the dry-run push contract internally inconsistent. The detailed effect-runner/test text says dry-run returns 0 for every kind, including push, while the false-completed-tick contract requires non-live push to return ECHO_EFFECT_NONLIVE_RC=97. A builder could therefore assert only test-mode push returns 97 and leave dry-run push as a false-success path. Patch AC2/AC7 so echo_effect push, push-with-retry.sh, and commit-reviewer-response.sh are all tested for exact exit 97 under both dry-run and test; every non-push kind should remain exact exit 0."
  - severity: "medium"
    where: "backlog/ready/2026-05-28-079-loop-reliability-pack.md:95 and skills/review-pending.md:169"
    finding: "AC3 asks validate-sidecar.py to accept the existing committed sidecar shape, but the current Step-C template emits reviewed_at as an unquoted ISO-8601 timestamp. PyYAML will parse that value as a datetime before jsonschema sees it; if the new schema requires a string and the validator does not normalize timestamps, the validator will reject the live artifact it is meant to pin. Patch AC3/AC7 to require either quoting reviewed_at in the producer template or datetime-to-string coercion in validate-sidecar.py, and include a fixture using the current unquoted template."
---

## Verdict

Proceed after patches. The r3 spec fixes the prior broad issues around push sentinel ownership, sidecar heading text, and observable-invariant tests, but two implementability details still need to be tightened before a builder can execute it without guessing.

## Findings

1. **MEDIUM - dry-run push sentinel still ambiguous.** The spec clearly says non-live `push` must not return success, but the test bullet still describes `dry-run` as returning 0 for every kind, including `push`. Since `dry-run` is one of the modes that can leak into an operational wrapper, this needs exact-code coverage alongside `test` mode.

2. **MEDIUM - sidecar timestamp parsing can reject the current producer format.** The committed sidecar template currently uses an unquoted `reviewed_at` timestamp. A new jsonschema validator that loads YAML normally and expects a string will fail unless the producer quotes it or the validator coerces the parsed datetime back to ISO text. The AC should make that behavior explicit and test it with the live template shape.

## Notes

The requested r3 focus items are otherwise aligned: the parenthetical `## Follow-up items (defer, do not block merge)` heading is used verbatim, and the byte-identity language has been replaced with per-caller observable-invariant language in AC1/AC7.
