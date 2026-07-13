## current_thesis

G2 is lifted and this is the first post-lift proposal. The immediate job is not repository extraction; it is to make the meeting-to-brief wedge an additive, independently bootable, testable, and packageable composition inside the current repo so later capabilities can graduate through one trustworthy boundary.

## locked_decisions

- The product is `echo-brain`: the client-local Team meeting-to-brief wedge, still DEV.
- Build the composition additively under `src/product/`; do not move existing modules or perform mass `git mv`.
- The product runtime allowlist is T1 only. Machine capture, MCP, Fleet/review orchestration, Slack/Linear, autonomous action, embeddings, and unrelated daemon workers are forbidden.
- Introduce the explicit `team-product` runtime lane; never reuse the retired `dogfood|customer` profile meaning.
- Every mutable artifact is installation-local. Configuration stores secret references, never credential values.
- Manual approval produces local brief artifacts only. Remote delivery is not part of this foundation.
- Split the reusable Granola signal core from the founder-CLI brain adapter. The generic lab daemon explicitly injects the old adapter; product code has no CLI fallback.
- The existing `echoctl brief` command explicitly injects that same lab adapter when no test extractor is supplied; the refactor must not break the founder workflow.
- Split the Granola API/derived policy and policy-injected pipeline core from `capture/sources.ts`; product closure must contain no founder desktop or developer-capture registry constants.
- Rank 3, not this item, supplies the real client-scoped API-key brain. Missing production adapter fails closed.
- `test:product` becomes only `tests/product/**`; the current broad non-orchestration suite is preserved as `test:repo` and CI runs both honestly.
- The product artifact is a distinct private `echo-brain` tarball, not a renamed generic `echoctl` package.
- Build once. Every downstream job consumes the same checksum-verified bytes; no repack or rebuild is allowed.
- In qualification CI, build the tarball before `test:product` and pass its directory to the packaged test. Local scratch test lineages remain allowed and cannot be uploaded as qualification evidence.
- Qualification evidence is machine-readable and can remain DEV/incomplete. CI cannot pass reviewer/founder authority cells or claim QUALIFIED.
- Upgrade-from-previous remains pending. Do not use the first-release N/A exception without founder and independent-reviewer rationale.
- Phase 1 declares macOS + Node 22 only. Windows failures remain owned debt, not a hidden waiver.
- Generic `echoctl` release-doctor and platform failures remain separate debt; this item cannot delete or relabel their checks.
- No repo extraction, release publication, client data, credential changes, or maturity advance occurs in this item.

## open_questions

- Cross-vendor reviewers must ratify the pinned maximum file-level allowlist; a builder may reduce it but may not expand it without another spec-review amendment.
- The exact first public/prerelease version remains a later release-authority decision; this item uses an explicit DEV prerelease version only.
- No founder decision blocks proposal review. The API adapter, cold-state grade, upgrade N/A, and release authority remain later gates.

## dont_touch

- Do not touch the holdout-131 worktree or branch.
- Do not edit `wiki/`, `.manifest.json`, real meeting artifacts, credentials, or GitHub security/release settings.
- Do not change the generic daemon's enabled services or current lab behavior except to inject the extracted CLI-brain adapter explicitly.
- Do not fix inherited generic-package, Windows, or macOS CI failures inside this spec.
- Do not create the target GitHub repositories or freeze/move existing product paths.

## canonical_anchors

- spec: backlog/proposed/2026-07-13-132-product-graduation-foundation.md
- reviews: backlog/reviews/2026-07-13-132-product-graduation-foundation/
