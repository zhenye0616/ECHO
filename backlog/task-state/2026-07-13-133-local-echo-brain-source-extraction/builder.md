## current_thesis

Extraction complete and handed to pending_review. Accepted target `/Users/zhenye/Desktop/echo-brain` @ HEAD `54259ef67eb90b5a1412bf15bac716180e822c72` (tree `e13b0cc57365acf9600f06882750982e02412c5a`), branch `migration/2026-07-13-133`, no remote. Feature-branch handoff head (binds the migration record) is `0caef8237c2aefba0d65c5f70000220654ee8f2e`.

## locked_decisions

- 32 closure blobs (23 production `src/`, 8 `tests/product` parity leaves, `tools/product/toolchain-preflight.mjs`) + `product/source-boundary.v1.json` copied byte-identical; package.template/shrinkwrap/runtime-schema relocated byte-identical. 21 target-only authored files. Empty transform/exclusion allowlists.
- 8 `tests/product` files are byte-parity leaves (not executed); their `join(REPO_ROOT,'<literal>')` runtime references are recorded parity-only, not module edges. Executed suite = `tests/migration/**` + `tests/product/end-to-end-synthetic.test.ts`.
- AC3<->AC5 schema-path tension reconciled: schema committed at `schemas/runtime-config.v1.schema.json` (AC5); `verify-artifact.mjs` stages it into the tarball at `schemas/product/runtime-config.v1.schema.json` to satisfy the byte-immutable `src/product/config.ts:55` runtime loader. Needs reviewer confirmation.
- Dev/test toolchain is out-of-band (runtime-only lock); named in `provenance/dependency-toolchain.v1.json`, injected via `ECHO_TSC`/provisioned `node_modules`.
- Verified green: byte-identity (hash-object==source OIDs), check-provenance/boundary/dependencies exit 0, independent operator audit PASS (0 divergences), fsck clean, object-set==reachable-set, vitest 14/14 incl B0==B1 deterministic tarball + offline install.

## open_questions

- AC5/AC7 formal offline `sandbox-exec` 4-clone matrix (B0/B1/B2/R1 under `(deny network*)` with DNS/direct-IP probes + isolated cache fill) not executed this session; determinism + offline install demonstrated with B0/B1.
- AC3<->AC5 schema-path reconciliation awaits reviewer confirmation or a direct to copy same-path.
- AC8 codex-ops reviewer child-commit leg is the reviewer's responsibility.

## dont_touch

- No target remote, publish/deploy/install, maturity advance, product features, live-state/wiki/holdout-131 edits, or sibling targets.

## canonical_anchors

- decision: raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md
- spec: backlog/pending_review/2026-07-13-133-local-echo-brain-source-extraction.md
- migration_record: raw/internal/migrations/2026-07-13-133-echo-brain.md
- handoff_head_sha: 0caef8237c2aefba0d65c5f70000220654ee8f2e
- reviews: backlog/reviews/2026-07-13-133-local-echo-brain-source-extraction/
