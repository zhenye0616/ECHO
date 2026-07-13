---
item_id: "2026-07-13-132-product-graduation-foundation"
round: 2
reviewer: "codex"
artifact_sha: "41d2f17dee44d26096cdccefed6cd7da5dbd3cdb"
completed_at: '2026-07-13T09:27:17Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 — Closure inventory comes first"
    finding: "The prescribed ordering is impossible: check-boundary.mjs and the src/product entry points do not exist until the builder writes new code, yet the builder must run that fence before writing new product code. Define a concrete two-phase command that inventories named existing seed roots before composition, or move the mandatory fence run to immediately after minimal entry-point creation; retain the fixed allowlist and STOP-and-escalate rule for every required growth edge."
  - severity: "medium"
    where: "AC2 — classifyStateFilesystem production adapter"
    finding: "The adapter is not fully falsifiable despite requiring an explicit normalization table: WebDAV variants are not enumerated, the timeout has no value, and longest-prefix matching does not require a path-component boundary. Specify the exact accepted filesystem tokens, timeout, mount-line parsing and escaping rules, and component-aware matching; add fixtures for spaces or escapes, malformed output, and the /Volumes/foo versus /Volumes/foobar collision."
  - severity: "medium"
    where: "AC4 hermetic guard and tests/product/hermeticity.test.ts"
    finding: "The child-process guarantee has no enforcement mechanism, and the enumerated worker hooks still permit direct outbound paths such as node:http2, node:dgram, undici, or the Node WebSocket client. Require a named sanitized child runner used by tests and tools, plus a static closure test rejecting direct child_process and unguarded outbound-capable imports or explicit guards for every permitted path. The sentinel must exercise that shared runner rather than proving only one manually sanitized spawn."
  - severity: "medium"
    where: "AC4 unconditional ci.yml test:product invocation and AC5 offline scratch lineage"
    finding: "ci.yml is required to invoke test:product without ECHO_PRODUCT_ARTIFACT_DIR, while packaged-product.test.ts then requires an exact-lock cache and bundled Node headers prepared before the command; no producer command or CI step is specified. Add one concrete preparation command and output contract, invoke it before the unconditional suite, and pin the full Node version used for both headers and runtime. The toolchain preflight must cover Python, make, clang or clang++, and the macOS SDK/Xcode tools required by node-gyp, not only an unspecified compiler."
  - severity: "high"
    where: "AC5 — build-artifact source identity"
    finding: "HEAD equality plus git status --porcelain does not bind all staged bytes to the source SHA because ignored files are omitted and may be resolved or copied from an allowed source path. Build the source staging tree from Git objects at the supplied SHA, or require every staged source, schema, migration, and metadata input to be tracked and byte-equal to that commit before compilation. Add a red test with an ignored file under an allowed path so the bytes-versus-SHA invariant is enforced."
  - severity: "medium"
    where: "AC7 — if:always() aggregation and workflow-fails-on-red-cell contract"
    finding: "The report validator may legitimately accept an incomplete DEV report containing red cells, so validation alone does not guarantee a failing workflow. Require an explicit terminal gate after the if:always() evidence and final-report uploads that exits nonzero for any implemented red cell, failed or timed-out dependency, missing evidence, identity mismatch, or unexpected skip. Add a workflow-contract fixture proving uploads still run and the terminal gate remains red."
---
