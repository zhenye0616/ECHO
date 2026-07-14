## current_thesis

Fix cycle after codex-ops REJECT complete (F1-F7, founder adjudication #3); re-handed to pending_review. NEW accepted target `/Users/zhenye/Desktop/echo-brain` @ HEAD `493b558f30d0e7b24dd2ebef883c10285f835f48` (tree `98d8549b55cdfd4f10d9452c840c006fa2c7a693`), branch `migration/2026-07-13-133`, single root, no remote, clean, UNCHANGED by the re-run matrix. Feature-branch handoff head (binds the fix-cycle migration record) is now `e64bfb8071097af9156e79e7a6ffc7d437a7be60` (supersedes d3f71b16). New artifact tuple: tarball `72a32d2d…`, canonical manifest digest `1f9dbd66…`, tree `98d8549b`, lock `9ffc39fa`.

## locked_decisions

- 32 closure blobs (23 production `src/`, 8 `tests/product` parity leaves, `tools/product/toolchain-preflight.mjs`) + `product/source-boundary.v1.json` copied byte-identical; package.template/shrinkwrap/runtime-schema relocated byte-identical. 21 target-only authored files. Empty transform/exclusion allowlists.
- 8 `tests/product` files are byte-parity leaves (not executed); their `join(REPO_ROOT,'<literal>')` runtime references are recorded parity-only, not module edges. Executed suite = `tests/migration/**` + `tests/product/end-to-end-synthetic.test.ts`.
- AC3<->AC5 schema-path tension reconciled: schema committed at `schemas/runtime-config.v1.schema.json` (AC5); `verify-artifact.mjs` stages it into the tarball at `schemas/product/runtime-config.v1.schema.json` to satisfy the byte-immutable `src/product/config.ts:55` runtime loader. Needs reviewer confirmation.
- Dev/test toolchain is out-of-band (runtime-only lock); named in `provenance/dependency-toolchain.v1.json`, injected via `ECHO_TSC`/provisioned `node_modules`.
- Verified green: byte-identity (hash-object==source OIDs), check-provenance/boundary/dependencies exit 0, independent operator audit PASS (0 divergences), fsck clean, object-set==reachable-set, vitest 14/14 incl B0==B1 deterministic tarball + offline install.

## open_questions

- Fix cycle F1-F7 (post codex-ops REJECT, founder adj #3) COMPLETE: F4 .DS_Store removed; F3 package.json npm-pin transform (sole transform_allowlist entry, operator-audit-verified); F2 check-dependencies enforces helper/CLI partition + omission/evasion fixtures + completed dependency-toolchain (clang++/xcode-select/xcrun, @types build_inputs, real digests); F1 scratch-config eslint lint gate (out-of-band, bytes+digest recorded, not committed). Re-verified: 3 checkers exit 0, transform-aware operator audit PASS, vitest 18/18, fsck clean, object-set==reachable-set.
- Re-ran full B0/B1/B2 matrix WITH lint leg under sandbox-exec deny-network; all three share one tuple (tarball 72a32d2d…, canonical manifest digest 1f9dbd66…, tree 98d8549b…, lock 9ffc39fa…). F6 argv/env echoes + F7 canonical serialization recorded in migration record. Accepted target 493b558f UNCHANGED by matrix.
- REMAINING: R1 rerun + AC8 codex-ops re-judgment — reviewer's responsibility, explicitly not run by builder.

## dont_touch

- No target remote, publish/deploy/install, maturity advance, product features, live-state/wiki/holdout-131 edits, or sibling targets.

## canonical_anchors

- decision: raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md
- spec: backlog/pending_review/2026-07-13-133-local-echo-brain-source-extraction.md
- migration_record: raw/internal/migrations/2026-07-13-133-echo-brain.md
- handoff_head_sha: e64bfb8071097af9156e79e7a6ffc7d437a7be60
- reviews: backlog/reviews/2026-07-13-133-local-echo-brain-source-extraction/
