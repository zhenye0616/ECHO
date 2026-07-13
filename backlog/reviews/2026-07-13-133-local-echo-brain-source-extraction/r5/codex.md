---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 5
reviewer: "codex"
artifact_sha: "22b706d9a16591ff3b4ecaa1cc9fbac89baa9da4"
completed_at: '2026-07-13T22:32:25Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 — migration-record reconciliation paragraph"
    finding: "The specified temp-write/fsync/rename sequence can overwrite a foreign record after a prior existence check because ordinary rename is replacing. Require same-directory no-replace publication with RENAME_EXCL or an equivalent atomic primitive; on EEXIST, reopen and accept only byte-identical content. Add a concurrent foreign-record creation test."
  - severity: "high"
    where: "AC1 takeover protocol and AC5 artifact-lock recovery"
    finding: "Extraction takeover rotates the nonce, but a surviving artifact lock is bound to the previous nonce while build-artifact receives only the new nonce. Define an authenticated, fsynced old-to-new nonce lineage and one-use guarded transition that permits exact-hash recovery without making an arbitrary new token sufficient. Test crashes before and after artifact emission, valid rotated-nonce recovery, random-token rejection, and replay rejection."
  - severity: "high"
    where: "AC1 — supervised PGID liveness and stale-group termination"
    finding: "Leader start identity is recorded, but the signaling algorithm does not state how it avoids TERM/KILL against a reused PGID. Require identity revalidation immediately before every group signal, specify the leader-gone/orphan-member and leader-PID-reused branches, and refuse rather than signal when ownership cannot be proven. Add deterministic PID/PGID-reuse and identity-change tests through an injectable process probe."
  - severity: "medium"
    where: "AC7 — dependency-cache-ready acquisition"
    finding: "The requirement that npm registry access be limited to lockfile resolved URLs has no enforceable mechanism; sandbox network rules do not by themselves constrain HTTP paths or redirects. Specify a concrete acquisition proxy or fetcher that rejects undeclared URLs and redirects, verifies integrity before cache admission, and then runs npm with all network denied. Test an undeclared redirect and an install script that attempts network access."
  - severity: "medium"
    where: "AC1 — control-plane identity checks"
    finding: "Repeated path hashing does not close the check-to-use race for the sandbox profile or other later-consumed control bytes. Require each control input to be opened and hashed once, consumed from that pinned byte snapshot or descriptor, and revalidated by inode/stat where applicable; concurrent path replacement must fail without executing replacement bytes. Add a profile-swap-at-spawn failpoint test."
  - severity: "medium"
    where: "AC8 — verify-handoff artifact and manifest rehash"
    finding: "Reopening artifact and manifest paths does not define a stable snapshot or reject symlink/path-swap races. Require regular-file, no-follow descriptor opens; hash those descriptors; compare pre/post fstat identity and size; and verify the manifest's artifact digest against the same opened artifact bytes and all bound state/record digests. Add symlink substitution and concurrent mutation tests."
---
