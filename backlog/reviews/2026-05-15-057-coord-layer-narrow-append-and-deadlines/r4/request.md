---
item_id: 2026-05-15-057-coord-layer-narrow-append-and-deadlines
round: 4
spec_commit_sha: d9aa9ca3a95bac9044b09c9488ed32261d37c0fa
artifact_path: backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md
class: structural-reform
requested_at: '2026-05-16T04:02:35Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "Verify r3 4-fix set on the new spec sha: (1) AC0 best-effort contract\
  \ no longer mentions request.py coord-invoke; request.py makes ZERO MCP calls; only\
  \ generates local correlation_id uuid4; (2) request.schema.json includes correlation_id\
  \ required field; request.py generates + writes it; pre-057 requests without it\
  \ degrade gracefully; (3) correlation_id is shared between active-spawn coord_invoke\
  \ and launchd-fallback wrapper Phase 2; tests/coord/correlation-id-shared-active-and-fallback.test.ts\
  \ asserts deadline closes regardless of which path succeeds; (4) AC5 distinguishes\
  \ round-tier (correlation_id required) vs scheduler-tier (tick_run_id required);\
  \ AC3 has two separate open-records maps; no collision when both tiers active for\
  \ same wrapper. Decay: r1=9 \u2192 r2=5 \u2192 r3=4; r4 target \u2264 3. Also check\
  \ NEW failure surfaces I might have missed."
---

# What to review

Read `backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md` at commit `d9aa9ca3a95bac9044b09c9488ed32261d37c0fa`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
