---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 15
reviewer: "codex"
artifact_sha: "75b5ce407a8b680a7a53ac280d26281ff73e2387"
completed_at: '2026-07-14T03:22:37Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC3 — source dispositions and target partition"
    finding: "The supposedly exact policy is not enumerated at the reviewed spec SHA: rewrite and exclusion permissions are category-based, while target-only lockfiles, provenance schemas, manifests, and checkers are open-ended. Because the builder authors both the target manifest and checker, they can self-authorize an omission or extra; the pinned npm-shrinkwrap also lacks one canonical target-lock mapping. Enumerate the permitted exception paths, transform literals and counts, target-only paths, and shrinkwrap-to-lock equivalence rule, then require comparison against that reviewed policy rather than target-declared policy."
  - severity: "medium"
    where: "AC1 — raw pinned Git-object reads"
    finding: "The stated Git settings do not define a hermetic source-read envelope. Inherited GIT_COMMON_DIR, GIT_OBJECT_DIRECTORY, GIT_ALTERNATE_OBJECT_DIRECTORIES, GIT_CONFIG_COUNT variables, repository includes, commondir, or objects/info/alternates can redirect or supplement reads, and literal ls-tree does not require byte-safe path handling. Specify one sanitized launcher, explicit rejection checks, NUL-delimited full-tree enumeration, exact-length cat-file parsing, and fixtures for hostile paths and object/config redirection."
  - severity: "high"
    where: "AC3 and AC7 — independent operator audit"
    finding: "The sole source-aware audit has no named executable or command sequence, ownership boundary, arguments, output contract, or allowed file path. Re-running an unspecified builder-authored target checker is not an independent recomputation capable of detecting a colluding manifest/checker omission. Name and permit a reviewer/source-side audit implementation, or prescribe an implementation-independent command contract, including source git-dir, source SHA, accepted target OID/tree, reviewed allowlist input, expected outputs, and nonzero failure cases; add the exact invocation to Tests."
  - severity: "medium"
    where: "AC5 and AC7 — clean-clone build and artifact parity"
    finding: "Minimal allowlisted environment is undefined, and package metadata alone does not prove which Node, npm, Git, PATH, npm configuration, lifecycle scripts, locale, timezone, umask, network inputs, or NODE_OPTIONS were used. Two same-host builds can therefore agree while sharing undeclared inputs. Define the exact sanitized environment and command matrix, verify executable paths and versions, state the lifecycle/network policy, and require one explicit hash/member-manifest equality invariant across the builder artifact, both clean-clone rebuilds, the reviewer rebuild, and the migration record."
  - severity: "high"
    where: "AC1, AC7, and AC8 — local target ownership and normal reviewer handoff"
    finding: "AC1 says sibling lanes never touch the local-only repository, while AC7 and AC8 require an independent reviewer to inspect and clone it; with no remote, an off-host reviewer cannot do so. The normal handoff also does not name the immutable artifact that schedules a same-host reviewer and binds target HEAD/tree to the migration-record commit. Define the builder as sole writer, explicitly authorize same-host read-only review, bind the target tuple through a named record at the pinned feature head, and split builder-only absence/mkdir/init checks from an exact reviewer-rerunnable pre/post shared-target audit."
---
