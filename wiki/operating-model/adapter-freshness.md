---
status: shipped
topic: Process
subtopic: Adapter Freshness
aliases:
  - Adapter Freshness
  - Two-Tier Adapter Freshness
  - adapter-freshness
---

# Adapter Freshness

ECHO renders the cross-tool collaboration protocol (`skills/*.md`) into per-client adapters: `.claude/commands/*` for Claude Code, `~/.codex/skills/ECHO:*` for Codex, and more to come. A rendered adapter can drift from its canonical source and the drift goes undetected. That is exactly what happened: a stale Codex `producer` template went undetected for ~11 days, because `tools/sync-skills.sh --check` only covered the in-repo `.claude/commands/` adapters and never saw the operator-local Codex install. The fix is a **two-tier freshness model**, split on where the rendered artifact lives.

## Tier 1 — repo-tracked adapters → merge invariant

`.claude/commands/*` are committed into the repo. Because they are in-repo, their freshness can be verified deterministically on any checkout, so `tools/sync-skills.sh --check` (wired into `tools/review-queue/check-coupled-invariants.sh`) **gates merges** on them — no machine dependence. This tier predates the incident; it is the model the second tier generalizes.

## Tier 2 — operator-local adapters → `echoctl doctor`

`~/.codex/skills/ECHO:*` are a HOME-relative operator-local install cache, **not repo-tracked**. Gating merges on them would make every merge depend on one operator's machine — and fail on CI or a fresh checkout with no Codex install. So item **100** placed the check operator-side instead: `tools/install-echo-codex-skills.sh --check` re-renders each managed adapter from its recorded source and compares the installed `SKILL.md` hash against the fresh render (exit 0=ok / 1=drift / 2=check-error). `echoctl doctor` invokes it as a **non-fatal sub-check**: drift → `codexAdapter.status: 'drifted'` (`degraded`, never `broken`); an absent Codex install is a clean pass.

## The writer half — item 099

Detection alone does not close the root. The original failure was a `producer` value transcribed by an LLM from a prose template — and the transcription produced the wrong value twice on the item 087 sidecar. Item **099** shipped `tools/review-queue/emit-sidecar.py`, a **code-owned writer** that stamps and validates the `producer` field before write, plus a `validate-sidecar.py` CI gate (also wired into `check-coupled-invariants.sh`). The general lesson: **code-owned writers + produce-time validation over prose-template transcription.**

## The decision rule

> **Repo-tracked artifact → merge gate. Operator-local / HOME-relative artifact → `echoctl doctor` selftest.**

Same root cause (an undetected stale rendered adapter), two correct placements determined by where the artifact lives. See [[merge-protocol]] for the merge-invariant checkpoint, [[review-queue-protocol]] for the strategist↔reviewer handoff the sidecar writer serves, and [[cross-tool-spec-review]] for why the canonical protocol lives under `skills/` rather than any single client's adapter directory.
