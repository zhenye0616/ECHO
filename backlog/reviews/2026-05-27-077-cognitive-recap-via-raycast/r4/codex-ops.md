---
item_id: "2026-05-27-077-cognitive-recap-via-raycast"
round: 4
reviewer: "codex-ops"
artifact_sha: "fe5112c9252028e0349cfac60040d4ebe8993fe2"
completed_at: '2026-05-28T06:04:32Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:117-123"
    finding: >-
      The recap prompt includes raw reviewer response files in the primary evidence set, but it never tells the agent how to handle a round that has reviewer responses and no combined.md yet. In production this is a normal race: a founder can invoke Recap while codex/codex-ops/claude have written findings but the watcher has not emitted the combined disposition. The spawned agent can then report unresolved reviewer assertions as B-axis decisions, creating exactly the false continuity the feature is supposed to prevent. Patch AC3 so combined.md remains the only final decision source; reviewer-only/request-only rounds must be ignored or explicitly labeled in-flight/unresolved until a combined.md exists, with a prompt-content test for that rule.
  - severity: "medium"
    where: "backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:132-150; backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:160-171"
    finding: >-
      The since resolver's persisted source enum cannot represent explicit window selections, and invalid non-empty user input silently falls through to the default window. At runtime a founder who selects Last 4 hours, Last 24 hours, or mistypes a custom ISO gets a recap with a header/source label that can only say user, last_session, or fallback_24h; the wrong window can look intentional and there is no operator-visible error for the typo. Patch AC4/tests to distinguish explicit window_4h/window_24h (or equivalent) from fallback_24h, and require non-empty invalid custom input to fail visibly instead of silently summarizing a different window.
---

# codex-ops review - r4

Verdict: `proceed_after_patches`.

## Findings

1. **MEDIUM - In-flight reviewer files can be misreported as decisions**  
   `backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:117-123` lists reviewer response files alongside `combined.md` in the first evidence source, but there is no rule for the common runtime window where reviewer responses have landed and `combined.md` has not. Recap can run during that window and present unresolved findings as B-axis decisions. Require the prompt to treat `combined.md` as the only final disposition source and to ignore or clearly label reviewer-only rounds as in-flight.

2. **MEDIUM - Since-window metadata loses operator intent**  
   `backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:132-150` restricts `source` to `user | last_session | fallback_24h`, while `backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:160-171` explicitly tests that invalid user input falls through. That makes a typo or explicit 4h/24h selection operationally ambiguous in the UI and persisted session. Add explicit source labels for manual windows and make non-empty invalid custom ISO input visible as a validation error instead of silently changing the recap window.
