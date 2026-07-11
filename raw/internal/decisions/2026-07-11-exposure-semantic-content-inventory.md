# Semantic-content inventory — ECHO repo (tracked tree @ HEAD `3f326407`)

**Date:** 2026-07-11 · **Scope:** tracked working tree at HEAD, explicitly including `backlog/reviews/` and `raw/internal/agent-runs/` · **Companion reports:** `2026-07-11-exposure-secret-scan-report.md`, `2026-07-11-exposure-scan-jobs-tracking.md`

**This is the class secret scanners MISS.** No token pattern matches here — the exposure is human-meaningful content (names, meeting titles, quoted live captures, employer/negotiation material, absolute paths) in a public MIT repo. Counts are file-level `git grep -l` unless noted.

**Sanitization note.** This committed report deliberately does NOT reproduce the sensitive literals it inventories — doing so would concentrate the exposure into one file at HEAD, violating `docs/committed-content-policy.md`. Sites are referenced by class + file:line. The full-fidelity working copy stays operator-local and is not committed. Where a site says "redacted at HEAD," the literal remains reachable in pre-redaction history (see the tracking artifact's Job C).

## Class A — Third-party personal names in live-capture-derived content

| Token | Kind | Files | Notes |
|---|---|---|---|
| Advisor first name | Real advisor (live meeting attendee) | 6 | `tests/enrich/post-meeting-brief.test.ts:45,60` (**redacted at HEAD `001d7fe3`**); `2026-07-07-slack-enablement-two-stage-plan.md` (**redacted**); `2026-07-10-brief-path-stress-test.md` (**redacted**); `backlog/complete/2026-07-10-131-…` (residual); `mcp-interactions-journal-2026-0{6,7}-claude.md` (residual — journals are in-the-moment records; inventoried, not rewritten) |
| Third-party first name #2 | Real third party named in a live prod brief action | 6 | `2026-07-10-brief-path-stress-test.md:18` (**redacted**); `raw/internal/ceo-loop-retest-105.md:27`, `backlog/complete/…131…`, two 2026-06 decision docs, one agent-run log (residual) |
| Fixture names (Avery/Dana/Morgan) | **Synthetic/anonymized** | (tests) | Already-anonymized — NOT targets. The leak was real names slipping into one fixture, now fixed. |
| Founder name | Founder self-identification | many | Low marginal risk (repo owner handle already public). |

## Class B — Meeting titles + Granola note IDs

- `2026-07-09-first-advisor-loop-cycle.md:3` — real advisor meeting title + Granola note ID (**redacted at HEAD `001d7fe3`**; internal draft id retained, lower sensitivity).
- `backlog/complete/2026-07-10-131-post-meeting-brief-generator-v0.md:91` (AC8) — two real Granola note IDs pinned as a machine-local test contract (**residual by design**: redacting would falsify a shipped spec's test contract; the IDs are live-workspace pointers only for the founder's own workspace).

## Class C — Quoted live brief / meeting content

- `2026-07-10-brief-path-stress-test.md:18` — verbatim live-prod brief action row (**redacted at HEAD `001d7fe3`**).
- `2026-07-10-brief-path-stress-test.md:43` — sensitive legal/negotiation note titles from the live DB (**redacted at HEAD `849c0b3c`**).

## Class D — Employer / prior-employer identity + workspace content

**The previously reported "22 files" figure is an INFLATED proxy** — it came from `git grep -l "client-facing"`, dominated by generic product usage in source and docs. Those are NOT employer leaks. The actual sensitive set is small:

- `2026-07-07-slack-enablement-two-stage-plan.md:4-6,18` — sharpest site: third-party-name-to-negotiation-content linkage (**name redacted at HEAD `001d7fe3`**; the counterparty-in-workspace and 1:1-negotiation-notes descriptions remain as operational context, no identities).
- `2026-07-07-office-hours-org-recap-pilot.md:8,31,43` — employer described generically; **already self-redacted to initials**; a verbatim offer quote at :43 remains (residual — candidate for a future pass).
- Founder's own startup/Granola workspace name — 11 files (founder's own brand; moderate sensitivity, residual).

## Class E — Founder absolute paths (`/Users/<user>/…`) — count only

**142 files, 925 lines** (backlog/ 61, raw/ 59, tests/ 11, wiki/ 7, tools/ 3, CLAUDE.md 1). Low severity: leaks OS username + home layout, already implied by the repo owner handle.

## Class F — Client / pilot participant identifiers

- lab-pilot / university-lab phrasing: 5 files · advisor references in live-capture context: 21 files · the pilot's self-hosted chat platform: 12 files · the lab's team-space folder name: 3 files.
- **De-anonymizable in aggregate** even without a proper name. The committed-content policy's client-participant naming rule exists to stop this class growing; new documents must not add identifying tokens (the acceptance-outlines doc genericized one on placement).

## `backlog/reviews/` (1,593 tracked files) + `raw/internal/agent-runs/` — coverage note

- `reviews/`: 0 files with Class A names, 0 workspace-name hits, 0 placeholder tokens; 6 files contain founder paths (Class E only). Clean of Class A–D.
- `agent-runs/`: 2 files touch Class A/D content (residual, low exposure).

## Status of the four enumerated HEAD-redaction targets

All four applied on `maint/clarity-phase1`: fixture names (`001d7fe3`, suite 6/6 green — behaviorally equivalent), live brief quote (`001d7fe3`), meeting title + note ID (`001d7fe3`), negotiation-name linkage (`001d7fe3`), plus the scan-recommended note-title pass (`849c0b3c`). Redaction at HEAD does not remove the literals from reachable history and cannot revoke prior public clones — see Job C in the tracking artifact.
