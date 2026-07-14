---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 12
reviewer: "codex-ops"
artifact_sha: "83ba8a0ec42306b58948b7a942a16521962a89ad"
completed_at: '2026-07-14T01:44:29Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC5 — immutable evidence publication"
    finding: "Publishing an O_EXCL temporary file with an ordinary rename is not create-only: POSIX/macOS rename may replace an existing intent, result, or handoff file, and the subsequent hash verification would bless that replacement. Raw stdout/stderr creation also lacks explicit exclusive/no-follow semantics. Require atomic no-replace finalization, create-exclusive stream files, fsync, and collision handling that preserves prior bytes."
  - severity: "medium"
    where: "AC5 no-cleanup contract and AC7 phase-1 installation"
    finding: "AC5 says the item deletes nothing beneath the attempt root, while AC7 explicitly deletes phase-1 node_modules. Preserve the phase-1 tree and use a separate create-new private clone for offline verification, or explicitly change the retention contract; the current requirements cannot both be satisfied."
  - severity: "medium"
    where: "AC5 build:artifact output and AC7 exact runner"
    finding: "The runner executes baseline and hostile-fixture verification plus an independent artifact rebuild, but the spec names only one writable cache-offline and one <attempt-root>/artifact output that refuses EEXIST. A second artifact execution must therefore fail or reuse mutable state. Enumerate distinct create-new clone, HOME/XDG/TMP, writable cache, and artifact-output roots for baseline, hostile, and rebuild runs, and identify the canonical retained artifact and exact comparison inputs."
  - severity: "medium"
    where: "AC5 command ledger timeouts and AC7 retained runner"
    finding: "Command intents record a timeout, but the execution contract does not isolate or quiesce descendant processes. A timed-out npm or test command can leave children mutating caches, clones, or artifacts after its result is recorded. Require a fresh process group or session, bounded whole-group termination and reaping, recorded signal outcomes, and refusal to continue or hand off until quiescence is proven."
  - severity: "medium"
    where: "AC1 parent-chain preflight"
    finding: "The current-UID ownership rule for target-parent components is ambiguous for the absolute path: standard macOS ancestors such as / and /Users are root-owned. Define the walk anchor and per-component ownership policy explicitly—trusted root-owned system ancestors versus current-UID home, Desktop, and evidence components—so a conforming implementation neither fails every normal host nor weakens checks ad hoc."
---
