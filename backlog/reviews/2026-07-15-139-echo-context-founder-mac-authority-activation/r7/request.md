---
item_id: 2026-07-15-139-echo-context-founder-mac-authority-activation
round: 7
spec_commit_sha: c73cb77d5f33fab113a0d081757305d0029a0a8c
artifact_path: backlog/proposed/2026-07-15-139-echo-context-founder-mac-authority-activation.md
class: structural-reform
requested_at: '2026-07-16T04:44:48Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: a4249ba9-84dd-4555-bff5-cf4e3c5059e7
focus_hints: "Verify the r6 propagation pass at the new spec SHA, carrying the founder's\
  \ independent read-only audit: (1) AC1/AC6 \u2014 the one-time deployment consumes\
  \ a NAMED item-138 artifact-only residual/rollback-full deployment entrypoint resolved\
  \ from the landed package manifest, with installed-byte hash readback and no lifecycle/build\
  \ scripts or dependency resolution; 'package artifact install path' language is\
  \ gone and a missing named entrypoint stops before deployment and escalates. (2)\
  \ AC1/AC4/AC6/AC7 \u2014 139 stays consume-only for item-138 machine-wide durable\
  \ execution lock (acquired before first mutation, different-live-owner preflight\
  \ reject, journal-bound stale-owner resume), no-restart fence, and drift-CAS; any\
  \ missing landed capability stops before mutation and escalates to strategist. (3)\
  \ AC7 \u2014 drift-CAS covers bytes plus protected type/owner/mode metadata; metadata-only\
  \ drift aborts identically. (4) AC1/AC8/AC9/AC10/Tests \u2014 evidence schema end-to-end:\
  \ literal six-adapter enum values (fs, git, granola, claude-code, codex, cursor),\
  \ exact (adapter,slot) plan-pair membership never independent checks, lexically\
  \ canonical JSONL (fixed key order, LF, minimal integers, 2^53-1 bound, byte-comparable),\
  \ active-G2 inventory hash binding via the AC9 G2 approval, complete 7-by-inventory\
  \ cardinality with exact set equality, adjudication rows count=0, LA-midnight DST-aware\
  \ boundary cuts with ts=opening cut and finalize-after-closing-cut plus byte-identical\
  \ idempotent retry; Tests reject missing keys, cross-paired slots, metadata-only\
  \ drift, nonzero adjudication counts, boundary timestamp errors, non-canonical encodings,\
  \ missing producer capability, and concurrent execute/resume. Do NOT terminal-promote\
  \ 139 while item 138 lacks the named producer contracts."
---

# What to review

Read `backlog/proposed/2026-07-15-139-echo-context-founder-mac-authority-activation.md` at commit `c73cb77d5f33fab113a0d081757305d0029a0a8c`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
