---
item_id: "2026-05-20-065-raycast-cluster-resume"
round: 1
reviewer: "codex-ops"
artifact_sha: "d1f8adae0d38caddf337a30e8d025cf90a2049cd"
completed_at: '2026-05-21T05:24:41Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-20-065-raycast-cluster-resume.md:75-79,114-118; tools/raycast-echo/src/lib/sessions.ts:280-296,436-453"
    finding: >-
      AC1/AC6 only require proving clusterId exists after recordSessionStart and that old rows without it still load. In the production path, every live answer flush and terminal end enters mergeRowAndWrite, which rehydrates through normalizeSession before writing the row again. If the patch adds clusterId to the start payload but does not explicitly round-trip it through normalizeSession and update/end, the first recordSessionUpdate or recordSessionEnd will erase the cluster edge. The user then finishes an answer, backs out, and the same cluster no longer has an answered session, so the old fresh-agent bug returns. Patch the AC/tests to start a cluster-tagged session, run recordSessionUpdate and recordSessionEnd, then assert listSessions/findLatestSessionForCluster still exposes clusterId.
  - severity: "high"
    where: "backlog/ready/2026-05-20-065-raycast-cluster-resume.md:81-106"
    finding: >-
      The running-session contract is inconsistent: the routing summary says default lookup includes running+done, but AC2 makes Open Prior Answer depend on findLatestSessionForCluster(cluster.cluster_id, ["done"]) and AC4 only states the short-circuit condition for ["done"] before later describing a running replay banner. A builder can satisfy the literal ACs while a running cluster still presents the Ask primary or enters AnswerView without a running short-circuit, so a repeat click during an in-flight answer starts a second agent. Patch AC2/AC4/AC5 to name the running+done lookup at both ClusterRow and AnswerView, with an explicit test that the running-state primary does not call startAgent and that Ask Again is the only fresh-agent path.
  - severity: "medium"
    where: "backlog/ready/2026-05-20-065-raycast-cluster-resume.md:13,81-91,108-112; tools/raycast-echo/src/lib/sessions.ts:156-190; tools/raycast-echo/src/components/AnswerView.tsx:123-152"
    finding: >-
      The spec asks the same row to flip to Open Prior without a Raycast re-summon, but current session state is local to useSessions and AnswerView writes through module-level recordSession* functions, not the hook refresh methods. The proposed component tests only mock three static lookup returns, so they will not catch the real production failure: after a fresh cluster ask completes and the user backs out to the still-mounted root, the row can keep its stale Ask ECHO decision until a full command reload. Patch the spec to require a concrete refresh/signal contract and an integration-style test that drives AnswerView completion then observes the already-mounted ClusterRow change primary/chip state.
  - severity: "medium"
    where: "backlog/ready/2026-05-20-065-raycast-cluster-resume.md:75-79,93-106; tools/raycast-echo/src/components/AnswerView.tsx:123-126"
    finding: >-
      Even after the running lookup is clarified, the spec does not require the cluster-tagged running row to exist before the child process is spawned. The current startup order starts the agent before recordSessionStart resolves; if that ordering is preserved, a quick double-click/reopen or slow LocalStorage write can observe no running session and launch a duplicate agent before the first row becomes discoverable. Patch AC1/AC4 to require reserving the running session before startAgent, or another explicit per-cluster launch serialization, and add a concurrency test proving two near-simultaneous opens for the same cluster create one agent run unless the user invokes Ask Again.
---

# codex-ops review

Verdict: `proceed_after_patches`.

This spec is directionally right, but the storage and running-session paths need tighter runtime contracts before a builder starts. The main risks are losing the new cluster edge during normal session writes, letting in-flight sessions spawn duplicates, and missing the same-command refresh behavior the founder will exercise immediately.
