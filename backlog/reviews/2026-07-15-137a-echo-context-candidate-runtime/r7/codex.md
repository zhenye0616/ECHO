---
item_id: "2026-07-15-137a-echo-context-candidate-runtime"
round: 7
reviewer: "codex"
artifact_sha: "3852a4ede6501871b738739b0bbba7d522bd730a"
completed_at: '2026-07-18T03:51:07Z'
verdict: "proceed_after_patches"
review_protocol: 2
review_mode: "full"
consumed_task_state: false
findings:
  - severity: "high"
    mechanism: "Canonical acquisition and publication of the reviewed target head"
    origin: "unknown"
    where: "AC5 — builder handoff and the sole target-main mutation"
    finding: "The choreography defines an exact publication and readback protocol for Project feature head J, but defines none for target head H. A fresh config-isolated target clone rooted at canonical B cannot execute `<H>:refs/heads/main` unless H is first made reachable through a named target ref or the reviewed builder clone is retained as an explicitly authorized input. Publishing H before review is also currently missing an exact ref, pre-publication closure/secret scan, one-write readback, and retention contract. Patch AC5 to define and bind a target feature-ref publication/readback carrying exact H/tree and its full scanned closure into V and A_t, followed by a fresh fetch and cat-file verification before the target CAS; alternatively, explicitly authorize and reauthenticate one named retained clone and reconcile that exception with the fresh-clone requirement."
  - severity: "medium"
    mechanism: "Run-root encoding into the generated sandbox policy and textual evidence"
    origin: "unknown"
    where: "AC1 run-root validation; AC4 candidate.sb generation and ps/argv evidence"
    finding: "The accepted run root is constrained only as an absolute owned non-link path, yet its bytes are embedded into SBPL policy text and later compared through line-oriented ps/argv evidence. No component grammar or canonical SBPL string encoder is specified. Quotes, backslashes, control characters, or newlines can therefore invalidate or inject policy expressions and make exact argv evidence ambiguous. Patch the contract to reject unsafe or overlong path components before any mutation using a closed ASCII grammar, or specify one canonical SBPL encoder plus adversarial round-trip tests for quotes, escapes, parentheses, and control bytes; the same rule must make ps/argv record parsing unambiguous."
---
