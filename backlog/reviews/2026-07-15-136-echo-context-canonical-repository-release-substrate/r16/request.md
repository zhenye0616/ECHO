---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 16
spec_commit_sha: 60a8191af0eebf106e27009d11db508a4bcbc0ef
artifact_path: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
class: structural-reform
requested_at: '2026-07-16T10:51:28Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 6d8a63a2-5833-44ea-b6ae-0573c6cccf0a
focus_hints: 'Verify the exact R15 propagation and structural cut on the same SHA:
  PR jobs execute event pull-request head H and bind run/job/check/carrier identities;
  B is an ancestor of H; builder and reviewer actor/run identities differ; canonical
  Project_echo review, landing-plan, landing-authorization, publication-plan, and
  release-authorization bytes are committed/read back and bind every immutable input;
  API version 2026-03-10 workflow dispatch accepts one exact HTTP 200 run-ID response
  with bounded correlation readback and no redispatch/adoption; public Project_echo
  reads are credentialless; private target auth is isolated through the reviewed keyring/anonymous-pipe
  adapter; Actions and release binary redirects are one-hop, host-pinned, and credential-stripped;
  canonical tag bytes/tagger/hash/OID are authorized before push; server IDs use typed
  single-assignment derivation; release assets bind captured upload URL, exact-ID
  enumeration, metadata, and bytes; production adapters and fault matrices are executable;
  remote publish workflow, authorization ref, and off-main approval file remain absent;
  destination readback is durable truth, with empty-namespace cold replay honestly
  scoped as trusted-coordinator policy rather than false server enforcement.'
---

# What to review

Read `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at commit `60a8191af0eebf106e27009d11db508a4bcbc0ef`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
