---
item_id: "2026-05-16-057a-coord-substrate-and-observability"
round: 5
reviewer: "codex"
artifact_sha: "21c164b345a058532cb8809bb89c4bf414592fba"
completed_at: '2026-05-16T06:03:01Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:153,168-171,216-217"
    finding: "AC6 makes the last-miss slot universe depend on registry entries that declare `expects`, but AC2/AC3 put `expects` in `coord-roles.json` and the AC1 registry only defines tier plus subject-role policy. A builder has two incompatible sources of truth: status could derive slots from a nonexistent registry field, while close/open/reconstruction derive from the role config. Patch the spec to choose one source, preferably role.events entries in `coord-roles.json` with `expects`, and update the coord_status test to assert the slot universe is built from that same source."
---

# Codex review

Verdict: `proceed_after_patches`.

## Findings

1. Medium - AC6 makes the last-miss slot universe depend on registry entries that declare `expects`, but AC2/AC3 put `expects` in `coord-roles.json` and the AC1 registry only defines tier plus subject-role policy. A builder has two incompatible sources of truth: status could derive slots from a nonexistent registry field, while close/open/reconstruction derive from the role config. Patch the spec to choose one source, preferably role.events entries in `coord-roles.json` with `expects`, and update the `coord_status` test to assert the slot universe is built from that same source.
