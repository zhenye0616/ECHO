## current_thesis

137b is the second pass and remains blocked. It will turn completed 137a
runtime evidence into one exact-artifact, capture-off, non-authoritative
per-user shadow at 127.0.0.1:39478. The proposal is intentionally not ready for
review until 137a's actual canonical tuple and limitations replace predictions.

## locked_decisions

- 137a must be complete before this spec is refined, reviewed, promoted, or
  claimed.
- Real-shadow version is `0.1.0-dev.137.1`.
- The final local bundle has exactly runtime tgz, canonical manifest, SBOM, and
  POSIX bootstrap; nothing is tagged, uploaded, or published.
- Final assets build once from a fresh detached clone of the independently
  reviewed, landed, and read-back target SHA under a closed dependency and
  native-toolchain contract.
- Installation owns only the listed Application Support, LaunchAgent, Logs,
  and isolated synthetic-state paths.
- Launchd owns the runtime directly; one lifecycle lock serializes mutation,
  and shared status/doctor observations must be incarnation-coherent.
- Authorization-to-install consumes descriptor snapshots of exact bound bytes;
  mutable path rereads cannot affect execution.
- Target-main landing and real installation require different immutable,
  single-use, committed and read-back authorizations.
- Project_echo remains healthy and authoritative at 38478; the final shadow is
  capture-off and authority false.

## open_questions

- Replace provisional predecessor identities with completed 137a SHA/tree,
  stage inventory, Node/ABI, tests, and observed limitations.
- Freeze the closed Node/native dependency acquisition and pre-listener
  launchd failure map from empirical 137a results before review.
- Reviewers must treat the cancelled parent R8 families as the minimum risk
  matrix, not as already resolved proof.

## dont_touch

- Do not dispatch review, promote, claim, build, land, package, authorize, or
  touch real paths before 137a completes and this pointer/spec are reconciled.
- No live state, capture, client rewiring, authority activation, old-daemon
  mutation, hosted release, wiki change, or maturity claim.

## canonical_anchors

- spec: backlog/proposed/2026-07-15-137b-echo-context-real-shadow-install.md
