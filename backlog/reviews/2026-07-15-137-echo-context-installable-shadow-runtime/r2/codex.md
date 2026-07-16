---
item_id: "2026-07-15-137-echo-context-installable-shadow-runtime"
round: 2
reviewer: "codex"
artifact_sha: "15c8e2c7004ea9b6f1c6f1d23a0cdf12e05712f5"
completed_at: '2026-07-15T23:45:48Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3 / AC7 clean-home lifecycle"
    finding: "AC3 hard-codes the bearer-token path under /Users/zhenye/Library/Application Support/echo-context/secrets, while AC7 requires a repo-free temporary HOME/support/log/state lifecycle. Patch the spec so the secret/support root is configuration-derived for clean-home runs and only resolves to the absolute founder Application Support path for the real per-user shadow install; otherwise the clean-home smoke either writes real user state or tests a different secret path than production."
  - severity: "medium"
    where: "AC4 / AC7 release sequencing"
    finding: "AC4 says the runtime artifact is built exactly once after implementation and independent review, while AC7 also requires clean-home tests, real shadow install, doctor evidence, private prerelease publication, and cache readback as item completion evidence. That makes the builder/reviewer handoff non-atomic: the builder cannot both deliver reviewable code and prove an artifact that must not exist until after independent review. Patch the spec with an explicit two-phase ownership contract that names which commands/evidence are produced pre-review by the builder and which exact post-review/founder-execute commands seal, publish, install, and record the artifact without reopening source changes."
  - severity: "medium"
    where: "AC4 Darwin x64 runtime / AC7 founder shadow install"
    finding: "The artifact is fixed to darwin/x64, but the real founder-Mac install criteria do not state an architecture/Rosetta preflight or failure mode. Patch AC4/AC7 to require the installer and doctor to verify process architecture compatibility on the founder Mac, explicitly detect whether Rosetta is required/available for x64 on Apple Silicon, and fail before extraction/start if the bundled Node cannot execute; otherwise an implementation can pass artifact verification but fail the live LaunchAgent proof."
---
