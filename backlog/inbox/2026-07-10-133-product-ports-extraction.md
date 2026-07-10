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
files_to_modify:
  # PROVISIONAL — builder refines, no scope expansion. All paths are POST-132 locations.
  - src/product/ports.ts                             # NEW: the three interfaces + doc comments citing each method's existing caller
  - src/product/capture/granola-poller.ts            # implements MeetingSource
  - src/product/surfaces/decision-responder/**       # Slack usage behind ChatChannel; Linear usage behind Tracker
  - src/product/intake/candidates.ts                 # consumes ChatChannel
  - src/product/daemon.ts                            # composition root injects the concrete adapters
  - src/product/cli/brief.ts                         # injection-path updates if any
  - tests/product/ports-conformance.test.ts          # NEW: per-adapter conformance
---

## Context

Item 132 carves the customer-facing meeting→decision loop into `src/product/` as a pure move. This item cuts the three vendor seams inside that module so the lab pilot's tool swap (Granola→Zoom, Slack→Mattermost; Linear stays) is an adapter drop-in, not a rewrite. The recap-pilot decision (2026-07-09) already established the loop is tool-agnostic with two adapters owed — this item builds the sockets, NOT the second adapters.

This is **extract-interface refactoring, not new architecture**: every port method must be traceable to an existing call site in the Granola/Slack/Linear code. The friction-first rule applies — no speculative surface.

## Acceptance Criteria

- **AC1 (ports shaped by reality):** `src/product/ports.ts` defines `MeetingSource`, `ChatChannel`, `Tracker`. Every method on every interface carries a doc comment naming ≥1 pre-existing call site it was extracted from; a method with no existing caller is spec violation, not judgment. No config/options parameter that no current caller passes.
- **AC2 (adapters implement, consumers depend on ports):** the Granola poller implements `MeetingSource`; the decision responder's Slack usage is accessed through `ChatChannel`; Linear issue creation through `Tracker`. After extraction, an import/identifier sweep of `src/product/**` shows `granola`/`slack`/`linear`-specific identifiers confined to the adapter files and persisted source-string constants — extraction/brief/intake logic references only the ports.
- **AC3 (injection at composition roots only):** concrete adapters are constructed and injected in `src/product/daemon.ts` and the product CLI entry — nowhere else. No service locator, no registry, no env-var-driven adapter selection in this item.
- **AC4 (behavior-neutral):** full suite green with zero assertion changes in existing tests; NEW `ports-conformance.test.ts` exercises each adapter against its port contract using existing fixtures. Byte-identical brief output for the AC8-style parity fixtures (reuse item 131's normalized comparator where applicable).
- **AC5 (no persisted drift):** source strings, dedupe keys, checkpoint paths, prompts unchanged (same pin as 132 AC7).

## Out of Scope (Don't Drift)

- Zoom adapter, Mattermost adapter, any second implementation of any port — separate pilot items, specced when the pilot's tool access is confirmed.
- Multi-source fan-in (two MeetingSources at once), adapter config UI/env plumbing beyond constructor injection.
- Changing what the loop does — extraction prompts, brief schema, intake classification, decision gate semantics all untouched.
- Kernel changes; anything outside `src/product/**` + its tests.

## After Completion (Strategist Notes)

Wiki (post-merge): extend `architecture/product-module-boundary.md` (from 132's notes) with the ports section — the three interfaces, the "shaped by existing callers" rule, adapter/injection map. Then spec the Zoom + Mattermost adapter items against the pilot's confirmed tooling (burned-buyer + WTP screens gate per the recap-pilot decision).
