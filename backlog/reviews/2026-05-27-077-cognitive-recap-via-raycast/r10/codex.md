---
item_id: "2026-05-27-077-cognitive-recap-via-raycast"
round: 10
reviewer: "codex"
artifact_sha: "f5991a22b11c66dfdf669f4dd0a2ac627545cbd7"
completed_at: '2026-05-28T07:01:21Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:31,128-145"
    finding: "The spec gives since-resolver two incompatible ownership contracts: spec_refs says since-resolver reads LocalStorage.allItems() directly, while AC4 defines resolveSinceWindow as a pure function over a supplied sessions array. Patch the spec to put LocalStorage/listSessions loading in recap.tsx or a separately named loader and keep resolveSinceWindow pure; otherwise a builder can satisfy one clause while violating the other."
  - severity: "medium"
    where: "backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:112-124,163-176"
    finding: "The prompt export and placeholder contract is inconsistent. AC3 still says the module exports a single RECAP_SYSTEM_PROMPT constant and refers to ${SINCE_ISO}, while AC4a/tests require RECAP_SYSTEM_PROMPT_TEMPLATE with <SINCE_ISO>/<REPO_PATH> plus buildRecapPrompt substitution. Patch AC3 to use the template/export names and placeholder syntax from AC4a so the implementation target is unambiguous."
---

# Codex review

Verdict: `proceed_after_patches`.

## Findings

1. **Medium - since resolver ownership is contradictory** (`backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:31`, `:128-145`)

   The spec refs say `since-resolver.ts` reads existing Ask ECHO sessions via `LocalStorage.allItems()` and key-prefix iteration, but AC4 defines `resolveSinceWindow(userInput, windowPref, sessions, nowMs)` as a pure function over a supplied `Session[]`. Those are incompatible implementation contracts. Patch the spec to state that `recap.tsx` (or a separately named loader helper) obtains sessions, then passes them into the pure resolver. Otherwise a builder can satisfy the spec-ref clause while breaking the AC4 purity/test contract, or vice versa.

2. **Medium - prompt export and placeholder names conflict** (`backlog/ready/2026-05-27-077-cognitive-recap-via-raycast.md:112-124`, `:163-176`)

   AC3 still says `recap-system-prompt.ts` exports a single `RECAP_SYSTEM_PROMPT` constant and describes the prompt as using `${SINCE_ISO}`, while AC4a and AC5 require `RECAP_SYSTEM_PROMPT_TEMPLATE` with `<SINCE_ISO>` / `<REPO_PATH>` placeholders plus `buildRecapPrompt()` substitution. Patch AC3 to use the AC4a export names and placeholder syntax. As written, the builder has two plausible targets and only one can pass the required tests.
