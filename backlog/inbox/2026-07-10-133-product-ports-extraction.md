---
id: 2026-07-10-133-product-ports-extraction
title: "Product ports extraction: MeetingSource / ChatChannel / Tracker seams inside src/product/, shaped strictly by existing Granola/Slack/Linear call sites"
status: inbox            # PARKED with 132 — promote to backlog/ready/ only AFTER 132 lands in complete/ (blocked_by enforces this once both are in kanban stages) and the lab-pilot adapter work (Zoom + Mattermost) is actually next. Spec review via the review queue runs WHILE parked.
priority: MED
estimate: 1d
created: 2026-07-10
blocked_by:
  - 2026-07-10-132-product-module-carve-out
task_state_ref: ""
requested_reviewers: ["codex", "codex-ops"]
spec_refs:
  - backlog/inbox/2026-07-10-132-product-module-carve-out.md   # parent carve; this item assumes its post-move layout (paths below are post-132 paths)
  - src/capture/surfaces/granola-poller.ts                     # pre-132 path — MeetingSource shape source: poll loop, note fetch, resolveCurrentGranolaNote* resolvers
  - src/surfaces/ceo-slack-responder/responder.ts              # pre-132 path — ChatChannel shape source: post/confirm/Socket-Mode usage
  - src/surfaces/ceo-slack-responder/linear-client.ts          # pre-132 path — Tracker shape source: issue creation, provenance fields
  - src/enrich/granola-intake-candidates.ts                    # pre-132 path — ChatChannel consumer (card posting)
  - raw/internal/decisions/2026-07-09-decision-loop-canonical-model.md  # the tool-agnostic loop model these ports serve
  - raw/internal/decisions/2026-07-10-product-carve-unknowns-register.md # A4 donor-bias limitation folded into Context; ports are provisional pending first real Zoom/Mattermost adapter
files_to_modify:
  # PROVISIONAL BY DESIGN — exact paths cannot exist until 132's move lands. This item REMAINS
  # INBOX-PARKED until 132 is in complete/; at promotion the strategist replaces this list with
  # exact post-132 file paths (no wildcards, no "if any" conditionals) and re-pins
  # ready_content_sha. A builder must never claim this item while wildcards remain.
  # All paths below are the POST-132 layout as specced in 132 AC1.
  - src/product/ports.ts                             # NEW: the three interfaces + doc comments citing each method's existing caller
  - src/product/capture/granola-poller.ts            # implements MeetingSource
  - src/product/surfaces/decision-responder/**       # Slack usage behind ChatChannel; Linear usage behind Tracker
  - src/product/intake/candidates.ts                 # consumes ChatChannel
  - src/product/daemon.ts                            # composition root injects the concrete adapters
  - src/product/cli/brief.ts                         # injection-path updates if any
  - tests/product/ports-conformance.test.ts          # NEW: per-adapter conformance
  - tests/product/product-daemon-wiring.test.ts      # NEW: AC3 unattended-startup wiring smoke
---

## Context

Item 132 carves the customer-facing meeting→decision loop into `src/product/` as a pure move. This item cuts the three vendor seams inside that module so the lab pilot's tool swap (Granola→Zoom, Slack→Mattermost; Linear stays) is an adapter drop-in, not a rewrite. The recap-pilot decision (2026-07-09) already established the loop is tool-agnostic with two adapters owed — this item builds the sockets, NOT the second adapters.

This is **extract-interface refactoring, not new architecture**: every port method must be traceable to an existing call site in the Granola/Slack/Linear code. The friction-first rule applies — no speculative surface.

**Known limitation — donor bias (unknowns register A4, folded by founder instruction 2026-07-10):** these ports are shaped by their donors and inherit their assumptions — `MeetingSource` from Granola (pull polling, no webhooks, transcript present at poll time; Zoom differs: OAuth app review, cloud-recording perms, transcript lands minutes–hours post-meeting), `ChatChannel` from Slack Socket Mode (Slack-proprietary; the lab's self-hosted Mattermost has a different websocket/confirm model). The "cite an existing caller" rule guarantees this bias by construction — that is the accepted trade against speculative design. **The ports are therefore provisional:** the first real Zoom/Mattermost adapter item is EXPECTED to force a port-shape revision, and that revision is in-scope for the adapter item, not a failure of this one. Do not defend these interfaces against the pilot's reality.

## Acceptance Criteria

- **AC1 (ports shaped by reality):** `src/product/ports.ts` defines `MeetingSource`, `ChatChannel`, `Tracker`. Every method on every interface carries a doc comment naming ≥1 pre-existing call site it was extracted from; a method with no existing caller is spec violation, not judgment. No config/options parameter that no current caller passes.
- **AC2 (adapters implement, consumers depend on ports):** the Granola poller implements `MeetingSource`; the decision responder's Slack usage is accessed through `ChatChannel`; Linear issue creation through `Tracker`. **Sweep contract (pinned):** `grep -riE 'granola|slack|linear' src/product --include='*.ts' -l` must return ONLY (i) adapter files, (ii) files whose only hits are persisted source-string constants (`api:granola`, `derived:granola-signals`, …), (iii) the composition roots — `src/product/daemon.ts` and the product CLI entry — which necessarily import and construct the concrete adapters, and (iv) `src/product/ports.ts` where the only hits are the AC1-required doc-comment call-site citations (AC1 mandates naming donor call sites, which contain vendor names; comment-only hits in ports.ts are compliant, code-identifier hits are not). This allowlist is deliberate, not a loophole: injection *sites* are vendor-aware by definition (AC3 requires it); extraction/brief/intake *logic* is not. Builder records the sweep output + per-file classification in `agent_notes`.
- **AC3 (injection at composition roots only):** concrete adapters are constructed and injected in `src/product/daemon.ts` and the product CLI entry — nowhere else. No service locator, no registry, no env-var-driven adapter selection in this item. **Unattended-startup wiring test (file pinned):** `tests/product/product-daemon-wiring.test.ts` (in files_to_modify; distinct from the AC4 conformance file) boots the rewired product daemon entrypoint non-interactively against a scratch ECHO_HOME (sanitized env per 132 AC2's pinned clause) and asserts constructor/injection/module-resolution succeed and shutdown is bounded — wiring regressions must fail in CI, not at launchd runtime.
- **AC4 (behavior-neutral, reproducible):** verification commands pinned — `npm run typecheck && npm run lint && npm run test:product` green with zero assertion changes in existing tests; `npx vitest run tests/product/ports-conformance.test.ts tests/product/product-daemon-wiring.test.ts` green. `ports-conformance.test.ts` exercises **each concrete adapter through its port interface** — the adapter itself is the unit under test and must NOT be mocked; mocks sit strictly BELOW the adapter, at the vendor SDK/HTTP/Socket client boundary — using existing fixtures under `tests/fixtures/**` and the moved `tests/product/**` fixtures. **Hermetic (pinned):** no live credentials, no network access, no wall-clock polling waits, no real Granola/Slack/Linear API calls. Brief parity: byte-identical brief output via item 131's normalized comparator (`tests/product/` post-move home of the AC8 comparator; machine-local skip semantics preserved) — any decided/actions text delta fails.
- **AC5 (no persisted drift):** source strings, dedupe keys, checkpoint paths, prompts unchanged (same pin as 132 AC7).

## Out of Scope (Don't Drift)

- Zoom adapter, Mattermost adapter, any second implementation of any port — separate pilot items, specced when the pilot's tool access is confirmed.
- Multi-source fan-in (two MeetingSources at once), adapter config UI/env plumbing beyond constructor injection.
- Changing what the loop does — extraction prompts, brief schema, intake classification, decision gate semantics all untouched.
- Kernel changes; anything outside `src/product/**` + its tests.

## After Completion (Strategist Notes)

Wiki (post-merge): extend `architecture/product-module-boundary.md` (from 132's notes) with the ports section — the three interfaces, the "shaped by existing callers" rule, adapter/injection map. Then spec the Zoom + Mattermost adapter items against the pilot's confirmed tooling (burned-buyer + WTP screens gate per the recap-pilot decision).
