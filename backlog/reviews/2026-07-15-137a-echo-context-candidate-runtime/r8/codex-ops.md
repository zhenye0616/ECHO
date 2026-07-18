---
item_id: "2026-07-15-137a-echo-context-candidate-runtime"
round: 8
reviewer: "codex-ops"
artifact_sha: "c91f69dca1d5ecef2cf6ee03a9ec2bce8b1916f1"
completed_at: '2026-07-18T04:38:29Z'
verdict: "proceed_after_patches"
review_protocol: 2
review_mode: "family"
findings:
  - severity: "medium"
    mechanism: "Final custody-receipt publication lacks a file-data durability and content-readback gate"
    origin: "unknown"
    family_id: "fam-09bc94d7d11e3d10"
    where: "backlog/proposed/2026-07-15-137a-echo-context-candidate-runtime.md:459"
    finding: "AC4 only requires atomically publishing and directory-fsyncing custody-ack.v1.json; it never requires fsync of the receipt file or temp descriptor, nor an O_NOFOLLOW identity/length/hash/content readback before the parent exits 0. A directory fsync alone does not guarantee the receipt data is durable, and the caller acceptance contract checks the receipt's roster shape without validating its bound acknowledgment fields. The proof payload has already been destroyed at this point, so a crash can leave an empty, truncated, or unvalidated final receipt while later V/E gates assume recoverable custody. Require exclusive 0600 temp creation, complete write plus file fsync, atomic rename, custody-directory fsync, and descriptor-bound canonical-field/length/hash readback before parent success; add injected failure tests for each publication step."
---
