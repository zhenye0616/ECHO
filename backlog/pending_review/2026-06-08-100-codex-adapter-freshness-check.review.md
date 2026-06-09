---
item_id: 2026-06-08-100-codex-adapter-freshness-check
verdict: merge as-is
reviewed_at: '2026-06-09T19:19:19Z'
test_counts:
  passed: 28
  failed: 0
producer: review-pending-orchestrator
---
## Verdict
merge as-is. Independent review (Claude subagent; codex was the builder — reviewer-independence preserved). Ground-truth HEAD matches the recorded head_sha a2af4048 exactly. All five ACs are Met against their hard-won contract points: exit-code contract (0=ok/1=drift/2=check-error); the total exit-code->status mapping in doctor (0->ok, 1->drifted, everything else incl. 126/127/signal/spawn-fail -> check-error, non-empty synthesized detail); the missing-source stale-sentinel-vs-true-orphan split (repo-move -> re-run installer, true orphan -> rm -rf); readable-zero vs uninspectable (untraversable/unreadable -> exit 2); namespace-agnostic re-render via the sentinel skill_name; cwd-safe absolute remediation; execFile-style invocation with a normalized safe PATH; degraded-not-broken, never throws. typecheck + lint clean; both item-specific suites pass 28/28 including the unstubbed real echoctl-doctor sparse-PATH non-repo-cwd case. AC4 merge gate untouched (grep .codex empty, coupled invariants OK). No drift outside the 4 authorized files; the 4 files are unchanged on main since the branch point, so the --no-ff merge is conflict-free.

## Pre-merge fixups
- [ ] none — no blocking fixups; reviewer verdict is merge as-is.

## Expected merge conflicts
- none — `git diff merge-base..origin/main` is empty for all 4 changed files (`src/cli/commands/doctor.ts`, `tools/install-echo-codex-skills.sh`, `tests/cli/doctor.test.ts`, `tests/sync-skills/install-echo-codex-skills.test.ts`); `--no-ff` applies cleanly.

## Follow-up items (defer, do not block merge)
- (optional, out of scope here) short-circuit `checkCodexAdapter` when no `~/.codex` exists to avoid the ~2s installer subprocess spawn on every `echoctl doctor`.
- (optional) a `--check --quiet` mode for scripted callers.
- Strategist post-shipment: promote per After-Completion notes — mark `_followups.md` R6.adapter_freshness bullets resolved (generalize freshness gate to all client adapters; C2 Codex-installer adapter-drift detection; stale Codex producer field, detection half) and record the split (repo-tracked adapters -> merge gate; operator-local Codex adapter -> doctor).
