---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 1
reviewer: "claude"
artifact_sha: "f62b6f503176b8c8367153a6647786d342b6948c"
completed_at: '2026-07-15T22:25:09Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 (bootstrap push actor), recurring in AC4 (repository rules) and AC6 (tag/prerelease publication)"
    finding: "The locked decision raw/internal/decisions/2026-07-15-echo-context-successor-repository-execution.md names the sole direct-main exception as a FOUNDER-OPERATED bootstrap ('the founder may push the already-reviewed extraction commit') and explicitly does not authorize 'builder pushes to either main branch'. AC1's imperative chain ('the builder proves ... Rename the local migration branch to main ..., add the canonical remote, and push the exact baseline commit first') reads as builder actions merely gated by a founder checkpoint — approval-gated builder execution of the main push, which is exactly what the decision excludes. The same actor ambiguity recurs at AC4's branch-protection configuration and AC6's annotated tag / private prerelease publication: each is 'founder-gated' but the executing operator is unnamed. Patch: for every irreversible external mutation, name the executing actor explicitly — the initial main push must be founder-operated per the locked decision; settings/tag/release steps need a named operator plus founder approval — so no reading of the spec permits a builder push to target main."
  - severity: "low"
    where: "spec_refs annotation for raw/internal/decisions/2026-07-12-g2-terminal-dispositions-and-repository-topology.md ('three-repository topology')"
    finding: "The cited G2 record actually defines TWO private organization repositories (echo-brain, echo-dev-platform) and states the context layer 'remains separate packages inside echo-dev-platform initially', splitting into its own repository 'only after they have independent consumers, release cadences, and versioned contracts'. The third-repository split this item executes is authorized by the 2026-07-15 successor-execution decision and item 135's founder-reconciled merge, not by the G2 topology record. Correct the annotation and add one sentence in 'Why this spec exists' attributing the split authority to the 2026-07-15 decision, so future readers do not misattribute which decision superseded the stay-inside-until-triggers rule."
  - severity: "low"
    where: "frontmatter target_remote / AC1 remote creation"
    finding: "G2 topology specifies private ORGANIZATION repositories with controls-preservation as a transfer/visibility gate; the spec pins a personal-account remote (zhenye0616/echo-context). The founder checkpoint makes the choice visible, and AC4's stop-for-founder-disposition path already covers weaker personal-tier rule enforcement, but the deviation from the recorded topology is currently silent. Add one line (in the spec or required in the AC6 migration record) stating that personal-account hosting is the accepted initial owner and that a later organization transfer remains governed by the G2 controls-preservation gate."
---

# claude review — 2026-07-15-136 r1 (conceptual / architectural-drift lens)

Reviewed `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at `f62b6f503176b8c8367153a6647786d342b6948c`.

## Verdict rationale

The spec is conceptually sound and unusually well-anchored. One medium finding (actor binding for external mutations vs the locked execution decision) and two low provenance-accuracy findings. No pushback-level drift.

## What was checked and cleared

- **Scope authority.** The item sits squarely inside the founder-authorized 136–139 lane (`2026-07-15-echo-context-successor-repository-execution.md`, locked) and the CLAUDE.md narrow successor-repository exception. The "Why this spec exists" internal-asset justification correctly cites the commercial-focus carve: this is substrate required by the current workflow, not a second product. No Team-product maturity advancement is claimed; DEV is preserved end-to-end (authority record, artifact manifest, version `0.1.0-dev.136.1`).
- **Evidence anchoring.** Baseline commit `0cf7b006eba665c0bf55e82ff04da70f19f01ebb`, tree `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`, and the 190-tracked-file count all match the item-135 migration record and independent-review record byte-for-byte. The frozen-baseline-plus-ancestry contract (AC2) is the right resolution of the tension between 135's extraction-finality tests and an evolvable successor repo — evidence bytes are referenced, never rewritten.
- **Sole-branch invariant handled.** Renaming `migration/2026-07-13-135` → `main` would break 135's sole-branch/exact-HEAD checks; AC2 explicitly refactors those tests to inspect the frozen baseline through Git objects. Consistent, not silent override.
- **Authority split discipline.** `source_authority` moves to echo-context/main while `runtime_authority:false`, `state_authority:false`, `installed:false` are bound into the authority record, manifest, README, and release record. Project_echo remains runtime/state authority; no machine client repoints. This honors the graduation separation (main-push approval ≠ release approval; release approval bound to SHA + version + artifact hash) from CLAUDE.md and the G2 record.
- **Cross-item boundaries.** The 137 handoff is an immutable tuple (source SHA + tree + version + artifact SHA-256 + lock hash + manifest hash); installation, runtime closure, credentials, and cutover stay with 137/138/139. No duplication with sibling proposals.
- **Out of Scope honesty.** The list covers the high-temptation adjacencies: install/LaunchAgent, live state, public visibility/npm, auto-update, signing programs, context-behavior changes, echo-brain/echo-loop, maturity advancement. Strategist notes correctly write no wiki page.
- **Non-installable artifact framing.** `installable:false` is enforced at filename, manifest, tests, README, and release-record layers — the "source archive mistaken for runtime" risk has defense in depth.

## Findings

See frontmatter. Summary:

1. **(medium)** AC1/AC4/AC6 leave the executing actor of irreversible external mutations ambiguous; the locked execution decision makes the initial main push founder-operated and forbids builder pushes to target main. Bind the actor per mutation.
2. **(low)** The spec_refs annotation mis-describes the G2 record as "three-repository topology"; attribute the third-repo split to the 2026-07-15 decision explicitly.
3. **(low)** Personal-account remote vs G2's "organization repositories" — make the accepted deviation explicit rather than silent.
