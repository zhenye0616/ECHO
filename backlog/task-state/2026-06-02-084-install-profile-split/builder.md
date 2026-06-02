---
task_id: 2026-06-02-084-install-profile-split
role: builder
binding: codex
claim_branch: agent/install-profile-split
last_updated: 2026-06-02T15:06:17Z
handoff_branch: agent/install-profile-split
handoff_head_sha: f144bb4c0a8e15371c61ea8b410da77e32ed8f4a
handoff_run_log: raw/internal/agent-runs/2026-06-02-2026-06-02-084-install-profile-split.md
---

## current_thesis
Claimed 084 as codex builder. Implement the install-profile split for `echoctl init`: default customer installs get retrieval/substrate skills only, explicit dogfood installs keep the full coord surface, and recorded profiles are persisted/respected without adding auto-detection or cleanup machinery.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at f144bb4c0a8e15371c61ea8b410da77e32ed8f4a.
<!-- builder-state-handoff:end -->

## locked_decisions
- AC1: `echoctl init` resolves profile by CLI flag > answer-file `profile` > recorded onboarding profile > unconditional `customer`, persists it, and no-flag reruns respect a recorded profile.
- AC2: skill sync filters hop-1 by `audience: customer|dogfood`; `using-echo-mcp` is customer, `using-echo-coord` is dogfood, and untagged skills default customer.
- AC3: customer profile skips role/workflow sync as a successful no-op; dogfood preserves current role/workflow behavior and overall health stays OK.
- AC4: onboarding schema gains optional `profile`; missing profile always resolves customer and existing profile-less onboarding emits the loud restore warning.
- AC5: doctor reports active profile in JSON/report state and human text output.
- AC6: foreign install smoke proves fresh customer surface, no-flip rerun, and explicit dogfood full surface.
- AC7: focused init, doctor, skill-sync, and adapter-sync tests plus full `npm test` and typecheck must pass.
- AC8: touch only `files_to_modify`; do not widen to pack-time trimming, daemon gating, cleanup, ACLs, or auto-detection.

## open_questions
- None blocking at claim time. Escalate if the implementation needs files outside `files_to_modify`, a new dependency, auto-prune/deletion behavior, daemon coord-tool gating, or profile inference from local state.

## dont_touch
- Do not change what `npm pack` ships or edit `package.json` package-file allowlists.
- Do not add reprofile/stale-artifact auto-prune or any file-deletion path for dogfood-to-customer conversion.
- Do not add a third profile, profile auto-detection, remote/multi-machine profile management, or a per-skill ACL/capability system.
- Do not gate daemon coord MCP tools; only the agent-facing installed surface is profile-gated.
- Do not reorder or re-architect 083's MCP-registration work; touch shared `init.ts` and smoke seams minimally.
- Do not edit `wiki/`, docs/status/backlog founder-owned files, backlog item bodies, or files outside the spec's `files_to_modify`.

## canonical_anchors

- spec: backlog/pending_review/2026-06-02-084-install-profile-split.md
- reviews: backlog/reviews/2026-06-02-084-install-profile-split/
