---
item_id: 2026-07-15-137a-echo-context-candidate-runtime
round: 8
spec_commit_sha: c91f69dca1d5ecef2cf6ee03a9ec2bce8b1916f1
artifact_path: backlog/proposed/2026-07-15-137a-echo-context-candidate-runtime.md
class: structural-reform
requested_at: '2026-07-18T04:33:42Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 752c68b3-79f8-4821-8473-5f5a2fc5bf70
focus_hints: "Targeted R8: falsify only the four R7 repairs and their cross-contract\
  \ consistency\u2014target F/K acquisition, safe path/SBPL/ps encoding, STOP/ABORT\
  \ versus owner-loss EOF, and acknowledged durable custody."
review_protocol: 2
review_mode: family
review_counter:
  lifetime: 8
  epoch: 3
  epoch_round: 2
review_targets:
- family_id: fam-e1e2aa89ad31ffc0
  claim: Canonical target feature F publishes scanned H and the target-main actor
    acquires H only from F.
  check: Trace K, the prepublication scan, one create-only F push, builder/reviewer
    fresh scans, V and A_t bindings, the third scan-free acquisition, and exact CAS/readbacks;
    reject reliance on builder objects or unmodeled scanner refs.
  anchors:
  - AC5 target feature F and closure manifest K
  - AC5 post-A_t fresh acquisition and target-main CAS
- family_id: fam-f26c7c780ca4a891
  claim: The attempt-derived ASCII path contract makes SBPL emission and ps/process
    evidence unambiguous.
  check: Trace validation before mutation, public attempt-ID-only grammar, fixed SBPL
    literal emission, opaque ps tails, exact delimiters, and adversarial tests.
  anchors:
  - AC1 SAFE_COMPONENT and SAFE_ABSPATH
  - AC4 candidate.sb and ps evidence
- family_id: fam-6760319bb44add40
  claim: STOP and ABORT own intentional terminal transitions while proof-control EOF
    means owner loss only.
  check: Trace every RUN, ARM, driver-loss, self-kill, and runner-loss path through
    terminal bytes, orphan roster rules, deadlines, and tests.
  anchors:
  - AC4 five-byte proof-control state machine
  - AC4 post-baseline writable roster
- family_id: fam-09bc94d7d11e3d10
  claim: Record 1 is durably acknowledged before destructive cleanup and record 2
    plus the final receipt remain recoverable outside that boundary.
  check: Trace the private parent/driver FD map, ACK1 and ACK2, bundle commit, post-ACK2
    settlement timeout, exact custody roster, R/P durability gates, and reader-loss
    tests.
  anchors:
  - AC4 custody parent and private driver
  - AC4 cleanup bundle and custody receipt
  - AC5 V/E custody durability
family_context:
- family_id: fam-e1e2aa89ad31ffc0
  mechanism: Canonical acquisition and publication of the reviewed target head
  origin: unknown
  first_seen_round: 7
  latest_round: 7
  state: patched
  reviewers:
  - codex
  introduced_by_sha: null
- family_id: fam-f26c7c780ca4a891
  mechanism: Run-root encoding into the generated sandbox policy and textual evidence
  origin: unknown
  first_seen_round: 7
  latest_round: 7
  state: patched
  reviewers:
  - codex
  introduced_by_sha: null
- family_id: fam-6760319bb44add40
  mechanism: proof-control EOF overload conflates intentional shutdown with control-owner
    loss
  origin: unknown
  first_seen_round: 7
  latest_round: 7
  state: patched
  reviewers:
  - codex-ops
  introduced_by_sha: null
- family_id: fam-09bc94d7d11e3d10
  mechanism: one-way stdout drain is treated as durable evidence custody before destructive
    cleanup
  origin: unknown
  first_seen_round: 7
  latest_round: 7
  state: patched
  reviewers:
  - codex-ops
  introduced_by_sha: null
baseline_spec_sha: 3852a4ede6501871b738739b0bbba7d522bd730a
---

# What to review

Read `backlog/proposed/2026-07-15-137a-echo-context-candidate-runtime.md` at commit `c91f69dca1d5ecef2cf6ee03a9ec2bce8b1916f1`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

Protocol v2 mode: `family`; lifetime round `8`; epoch `3` round `2`. Treat the embedded family and proof context as the complete cross-round review lens.
