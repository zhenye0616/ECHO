## current_thesis

Micro-cycle (post 3rd codex-ops REJECT; sole residual N2 DESTRUCTURE_RE) complete; re-handed to pending_review. NEW accepted target `/Users/zhenye/Desktop/echo-brain` @ HEAD `4a6dcb33d2e73f718e36832941b4fa2bc34c7285` (tree `e2466238d90691cc4488b9909ec31064a1b3df33`), branch `migration/2026-07-13-133`, single root, no remote, clean, UNCHANGED by the re-run matrix. Feature-branch handoff head (binds the micro-cycle migration record, built on review child 2b4ebbe8) is now `20c8135a37e123f1735dd07023ccc0bfc184b624`. Artifact tuple: tarball `b7708d8f…` (unchanged), manifest digest `f868ad68…` (unchanged), NEW tree `e2466238`, lock `9ffc39fa`.

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
- MICRO-CYCLE (post 3rd REJECT; founder-authorized surgical fix): third judgment confirmed F1/F3-F7 + N1/N3-N6 FIXED + tuple matched; sole residual N2 DESTRUCTURE_RE matched any [ident,] array literal. FIX: regex now requires a const/let/var binding keyword before the destructure (value-position array literals no longer count). Added fixture-array-construction.mjs (exact evasion now fails closed). ONLY check-dependencies.mjs + dependency-set.test.ts changed (+ regenerated source-extraction). NEW accepted OID 4a6dcb33 (tree e2466238). vitest 22/22, checkers exit 0, operator audit PASS, fsck clean, object-set==reachable (78). Re-ran B0/B1/B2 matrix under env -i: one tuple (tarball b7708d8f unchanged, manifest f868ad68 unchanged, NEW tree e2466238, lock 9ffc39fa). Target UNCHANGED by matrix.
- REMAINING: R1 pass #4 + codex-ops judgment #4 — reviewer side. Recordable-only (not changed per scope): typescript-eslint peer-range (--legacy-peer-deps); pre-lifecycle sanitizer-regex abort.

## dont_touch

- No target remote, publish/deploy/install, maturity advance, product features, live-state/wiki/holdout-131 edits, or sibling targets.

## canonical_anchors

- decision: raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md
- spec: backlog/pending_review/2026-07-13-133-local-echo-brain-source-extraction.md
- migration_record: raw/internal/migrations/2026-07-13-133-echo-brain.md
- handoff_head_sha: 20c8135a37e123f1735dd07023ccc0bfc184b624
- reviews: backlog/reviews/2026-07-13-133-local-echo-brain-source-extraction/
