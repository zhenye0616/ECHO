---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 1
combined_at: '2026-07-15T22:27:59Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: null
claude_response: claude.md
patch_commit_sha: ad53c6c75d757229cb6109fe21526464bc187feb
next_round: 2
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

Reframe gate: not applicable — r1, no prior-round `spec-r*-patches` commits exist for this item; every finding targets original spec text.


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC5 and AC6 — source artifact build and founder release approval | accepted — patched | ad53c6c7 — AC6 restructured: unprivileged build-artifact job builds once from the landed SHA and persists an immutable run-ID/artifact-ID/digest-identified artifact; founder approves the complete tuple AFTER the build via the source-release protected environment; publish-release downloads/re-hashes/publishes the exact bytes, no rebuild; AC5's double-build clarified as a determinism test only; workflow-policy test asserts the separation |
| 2 | HIGH | codex | AC4 and AC6 — source-release.yml authorization and atomic publication | accepted — patched | ad53c6c7 — workflow_dispatch with explicit SHA/version/expected-hash inputs; fails unless SHA == canonical main HEAD; concurrency group serializes runs; protected environment source-release with sole reviewer zhenye0616; pre-publication re-read of repo ID/owner/private visibility; rejects pre-existing same-name tag/release/asset, never clobbers; post-upload readback of annotated tag + asset hashes against the approved tuple |
| 3 | HIGH | codex | AC1 and AC4 — full-history secret scan bootstrap | accepted — patched | ad53c6c7 — AC1 bootstrap scan pinned to gitleaks at exact version + binary SHA-256 (recorded in migration record), non-shallow all-refs invocation with redaction, paths/rule-IDs-only output, builder ownership; AC4 requires tools/secret-scan.sh to encode the equivalent scanner/pin/config/invocation and workflow-policy test asserts pre-push/post-push command equivalence |
| 4 | MEDIUM | codex | AC3 and AC4 — executable quality gate and repository rules | accepted — patched | ad53c6c7 — AC3 names exact package.json scripts (typecheck, lint, test:ci, test:operator, verify:inventory, verify:authority, verify:artifact, scan:secrets) + fresh-clone driver tools/fresh-clone-acceptance.sh; AC4 names job IDs (quality-macos, quality-ubuntu, secret-scan, build-artifact, publish-release) and exact protection fields (>=1 approval, strict up-to-date, no bypass actors, no force-push, no deletion, required checks by name) |
| 5 | MEDIUM | codex | AC5 and AC6 — archive, manifest, and release asset format | accepted — patched | ad53c6c7 — manifest defined as a sidecar, never an archive member (no self-reference); exactly three named assets (tgz, .tgz.sha256 in sha256sum format, .manifest.json canonical JSON); tar layout fixed (single root dir, sorted Git-tracked paths, Git modes, uid/gid 0, committer-timestamp mtimes, gzip without name/timestamp); AC6 fresh-clone verifier inputs enumerated |
| 6 | MEDIUM | claude | AC1 (bootstrap push actor), recurring in AC4 (repository rules) and AC6 (tag/prerelease publication) | accepted — patched | ad53c6c7 — AC1: founder creates the repo and operates the initial main push per the locked 2026-07-15 decision, builder prepares/verifies only, explicit no-builder-push-to-either-main language; AC4: founder or founder-approved named operator (recorded) configures protection; AC6: publication executed by the guarded workflow under founder approval, never a builder identity |
| 7 | LOW | claude | spec_refs annotation for raw/internal/decisions/2026-07-12-g2-terminal-dispositions-and-repository-topology.md ('three-repository topology') | accepted — patched | ad53c6c7 — annotation corrected to two-organization-repository topology + controls-preservation rule; 'Why this spec exists' now attributes the third-repo split authority to the 2026-07-15 successor-execution decision and item 135's founder-reconciled merge |
| 8 | LOW | claude | frontmatter target_remote / AC1 remote creation | accepted — patched | ad53c6c7 — AC1 records personal-account hosting under zhenye0616 as the accepted initial owner (explicit deviation from G2's organization shape); later org transfer stays governed by the G2 controls-preservation gate; AC6 migration record must state the deviation |

## Convergence call

needs R2 — focus_hints: Verify the r1 patches at ad53c6c7: (1) AC6 build-once separation — unprivileged build-artifact persists the immutable artifact, founder approves the full tuple post-build via the source-release protected environment, publish-release re-hashes and never rebuilds; (2) release authorization/atomicity — dispatch inputs, SHA==main check, concurrency serialization, pre-publication repo identity re-read, no-clobber, tag/asset readback; (3) AC1 bootstrap gitleaks pin + AC4 secret-scan equivalence contract; (4) named scripts/job IDs/protection fields are internally consistent across AC3/AC4/Tests; (5) sidecar manifest + deterministic tar format is complete and non-self-referential; (6) actor bindings leave no reading that permits a builder push to either main.

