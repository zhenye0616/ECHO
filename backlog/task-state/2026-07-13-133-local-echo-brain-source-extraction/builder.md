## current_thesis

Fix cycle 2 (post 2nd codex-ops REJECT; N2-N6) complete; re-handed to pending_review. NEW accepted target `/Users/zhenye/Desktop/echo-brain` @ HEAD `ffc11b45ca42fba19e25582f00e92dbaa63c9a3c` (tree `27250ad06e90d6ed4534dc6e50f880874818e659`), branch `migration/2026-07-13-133`, single root, no remote, clean, UNCHANGED by the re-run matrix. Feature-branch handoff head (binds the fix-cycle-2 migration record, built on review child 4e43c996) is now `3a693a7369c46a15f07f5704dec033b1a7230af5`. New artifact tuple: tarball `b7708d8f…`, canonical manifest digest `f868ad68…`, tree `27250ad0`, lock `9ffc39fa`.

## locked_decisions

- 32 closure blobs (23 production `src/`, 8 `tests/product` parity leaves, `tools/product/toolchain-preflight.mjs`) + `product/source-boundary.v1.json` copied byte-identical; package.template/shrinkwrap/runtime-schema relocated byte-identical. 21 target-only authored files. Empty transform/exclusion allowlists.
- 8 `tests/product` files are byte-parity leaves (not executed); their `join(REPO_ROOT,'<literal>')` runtime references are recorded parity-only, not module edges. Executed suite = `tests/migration/**` + `tests/product/end-to-end-synthetic.test.ts`.
- AC3<->AC5 schema-path tension reconciled: schema committed at `schemas/runtime-config.v1.schema.json` (AC5); `verify-artifact.mjs` stages it into the tarball at `schemas/product/runtime-config.v1.schema.json` to satisfy the byte-immutable `src/product/config.ts:55` runtime loader. Needs reviewer confirmation.
- Dev/test toolchain is out-of-band (runtime-only lock); named in `provenance/dependency-toolchain.v1.json`, injected via `ECHO_TSC`/provisioned `node_modules`.
- Verified green: byte-identity (hash-object==source OIDs), check-provenance/boundary/dependencies exit 0, independent operator audit PASS (0 divergences), fsck clean, object-set==reachable-set, vitest 14/14 incl B0==B1 deterministic tarball + offline install.

## open_questions

- Fix cycle 2 (post 2nd codex-ops REJECT; N2-N6) COMPLETE. N1 = executor lint-binding (reviewer side); F3/F4/F5 confirmed fixed.
  - N2 (real code): check-dependencies recognizes spawnSanitizedChild (/sbin/mount edge in config.ts:165 now enforced; used_commands includes /sbin/mount) and is FAIL-CLOSED per variable (computed spawn allowed only for a declared computed_command_owner or a directly tuple-destructured var; file-level hasTuple whitelist removed). toolchain-preflight.mjs is a documented owner (wrapper+which()-indirected; command set is the independently-classified tuple). 3 new fixtures. vitest 21/21.
  - N3: strict env -i on every sandboxed lifecycle invocation + sanitized runner (durable runner-env.txt, 0 dangerous vars) + argv-echo all 6 commands incl smokes. N4: complete fresh hash table at ffc11b45. N5: README npm-pin exception. N6: comparator named String.localeCompare (no tuple churn).
- Re-verified: 3 checkers exit 0, transform-aware operator audit PASS, vitest 21/21, fsck clean, object-set==reachable-set (78). Re-ran full B0/B1/B2 matrix + lint leg under env -i; all three share ONE tuple (tarball b7708d8f…, canonical manifest digest f868ad68…, tree 27250ad0…, lock 9ffc39fa…). Accepted target ffc11b45 UNCHANGED by matrix.
- REMAINING: R1 rerun + codex-ops re-judgment — reviewer side. Standing rule: a 3rd rejection on any NEW finding class halts to founder.

## dont_touch

- No target remote, publish/deploy/install, maturity advance, product features, live-state/wiki/holdout-131 edits, or sibling targets.

## canonical_anchors

- decision: raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md
- spec: backlog/pending_review/2026-07-13-133-local-echo-brain-source-extraction.md
- migration_record: raw/internal/migrations/2026-07-13-133-echo-brain.md
- handoff_head_sha: 3a693a7369c46a15f07f5704dec033b1a7230af5
- reviews: backlog/reviews/2026-07-13-133-local-echo-brain-source-extraction/
